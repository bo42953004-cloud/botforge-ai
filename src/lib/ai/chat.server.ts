import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";
import { DERIV_BOT_SYSTEM_PROMPT } from "./system-prompt.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function requireUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_")) headers.delete("Authorization");
        headers.set("apikey", key);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

export async function handleChat(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ error: "Please sign in to generate bots." }, 401);

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return json({ error: "AI is not configured for this app yet." }, 500);

  const body = (await request.json()) as { messages?: UIMessage[] };
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "No messages were sent." }, 400);
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    system: DERIV_BOT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onError: (error) => {
        console.error("AI chat error", error);
        return error instanceof Error ? error.message : "The AI stream failed.";
      },
    }),
    runIdFetch,
  );
}
