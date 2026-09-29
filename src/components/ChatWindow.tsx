import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, FilePlus2, Paperclip, Square, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BotStructureCard } from "@/components/BotStructureCard";
import { IMPORT_TAG, parseBotStructure, type BotStructure } from "@/lib/bot-structure";
import { Markdown } from "@/components/Markdown";
import { RobotHead } from "@/components/RobotHead";
import { XmlArtifact } from "@/components/XmlArtifact";
import { Button } from "@/components/ui/button";
import { CHECK_PREFIX, checkBotXml } from "@/lib/bot-check";
import { saveBot, saveLocalMessage } from "@/lib/local-store";
import { extractBots, hasOpenXmlBlock, stripXmlBlocks } from "@/lib/deriv-xml";
import {
  initSound,
  isMuted,
  playBoot,
  playComplete,
  playError,
  playKey,
  setMuted,
  startTyping,
  stopTyping,
} from "@/lib/sounds";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Digit differs bot on Volatility 100, stake 0.35, martingale after a loss",
  "Rise/Fall bot on R_75, 5 tick duration, stop loss 20 and take profit 10",
  "Even/Odd bot that only trades after three even ticks in a row",
];

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("");
}

export function ChatWindow({
  threadId,
  initialMessages,
  onFirstUserMessage,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onFirstUserMessage: (text: string) => void;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [muted, setMutedState] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(new Set<string>());
  const fileRef = useRef<HTMLInputElement>(null);
  const repairsRef = useRef(0);
  const originalRef = useRef<string | undefined>(
    (() => {
      for (let i = initialMessages.length - 1; i >= 0; i--) {
        const m = initialMessages[i];
        const t = m.role === "user" ? messageText(m) : "";
        const hit = IMPORT_TAG.test(t) ? t.match(/```xml\n([\s\S]*?)```/) : null;
        if (hit) return hit[1];
      }
      return undefined;
    })(),
  );
  const sendRef = useRef<(text: string) => void>(() => {});
  const [imported, setImported] = useState<{ xml: string; structure: BotStructure } | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.error("That file is too large (max 2 MB)."); return; }
    const xml = (await file.text()).trim();
    const structure = parseBotStructure(xml, file.name);
    if (!structure.valid) { toast.error("That isn't a valid Deriv bot XML file."); return; }
    setImported({ xml, structure });
    playKey();
    inputRef.current?.focus();
  };

  useEffect(() => {
    initSound();
    setMutedState(isMuted());
  }, []);

  const persist = useCallback(
    async (role: "user" | "assistant", content: string, sdkId: string) => {
      if (savedRef.current.has(sdkId)) return;
      savedRef.current.add(sdkId);
      saveLocalMessage(threadId, role, content, sdkId);
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    [threadId, queryClient],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      const text = messageText(message);
      void persist("assistant", text, message.id);
      stopTyping();
      const bots = extractBots(text);
      if (bots.length === 0) return;
      const issues = bots.flatMap((bot) => checkBotXml(bot.xml, originalRef.current));
      if (issues.length > 0 && repairsRef.current < 3) {
        repairsRef.current += 1;
        const report = `${CHECK_PREFIX} Your last XML has problems. Fix every one and return the full corrected XML:\n${issues.map((i) => `- ${i}`).join("\n")}`;
        setTimeout(() => sendRef.current(report), 300);
        return;
      }
      repairsRef.current = 0;
      const summary = stripXmlBlocks(text).split("\n").find((l) => l.trim())?.slice(0, 160) ?? "";
      for (const bot of bots) {
        saveBot({ threadId, fileName: bot.fileName, xml: bot.xml, summary, issues: issues.length });
      }
      void queryClient.invalidateQueries({ queryKey: ["saved-bots"] });
      if (issues.length > 0) toast.warning("Saved, but some blocks may still need a check in Deriv.");
      else toast.success("Bot checked and saved to your library.");
      playComplete();
    },
    onError: (err) => {
      stopTyping();
      playError();
      toast.error(err.message || "The AI could not finish. Please try again.");
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];
  const lastText = last && last.role === "assistant" ? messageText(last) : "";
  const writingCode = busy && hasOpenXmlBlock(lastText);
  const robotState = busy ? (writingCode ? "coding" : "thinking") : "idle";

  // Coding sounds while the assistant is producing output.
  useEffect(() => {
    if (busy && status === "streaming") startTyping();
    else stopTyping();
    return () => stopTyping();
  }, [busy, status]);

  useEffect(() => {
    if (status === "submitted") playBoot();
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, threadId]);

  const sendAuto = (text: string) => {
    const id = crypto.randomUUID();
    void persist("user", text, id);
    void sendMessage({ text });
  };
  sendRef.current = sendAuto;

  const send = (text: string) => {
    repairsRef.current = 0;
    let value = text.trim();
    if ((!value && !imported) || busy) return;
    if (messages.length === 0) onFirstUserMessage(value || `Update ${imported!.structure.fileName}`);
    if (imported) {
      originalRef.current = imported.xml;
      value = `Imported bot: ${imported.structure.fileName}\n\n${value || "Review this bot, explain its structure and ask me what to change."}\n\n\`\`\`xml\n${imported.xml}\n\`\`\``;
      setImported(null);
    }
    const id = crypto.randomUUID();
    void persist("user", value, id);
    void sendMessage({ text: value });
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <RobotHead state={robotState} size="sm" showStatus={false} />
        <div className="min-w-0">
          <p className="font-display text-sm tracking-widest text-gold">AUREUS</p>
          <p className="truncate text-xs text-muted-foreground">
            {busy ? (writingCode ? (repairsRef.current > 0 ? "Repairing empty blocks…" : "Writing bot blocks…") : "Thinking about your strategy…") : "Ready"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
            if (!next) playKey();
          }}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-6 py-6 text-center">
              <RobotHead state="listening" size="lg" showStatus={false} />
              <div>
                <h2 className="text-xl text-gold-gradient">What should your bot do?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe it in your own words. I'll ask about anything you leave out.
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="rounded-xl border border-gold/40 bg-surface p-4 text-left transition hover:border-gold"
                >
                  <FilePlus2 className="mb-2 size-5 text-gold" />
                  <p className="text-sm font-medium">Build a new bot</p>
                  <p className="text-xs text-muted-foreground">Describe it from scratch below.</p>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-gold/40 bg-surface p-4 text-left transition hover:border-gold"
                >
                  <Paperclip className="mb-2 size-5 text-gold" />
                  <p className="text-sm font-medium">Import a bot to update</p>
                  <p className="text-xs text-muted-foreground">Upload your .xml — I'll read its structure.</p>
                </button>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const text = messageText(message);
            if (message.role === "user" && text.startsWith(CHECK_PREFIX)) {
              return (
                <p key={message.id} className="text-center text-xs text-muted-foreground">
                  Aureus checked the bot and found empty blocks — repairing them…
                </p>
              );
            }
            const bots = message.role === "assistant" ? extractBots(text) : [];
            const importName = message.role === "user" ? text.match(IMPORT_TAG)?.[1] : undefined;
            const prose =
              message.role === "assistant" || importName
                ? stripXmlBlocks(text).replace(IMPORT_TAG, "").trim()
                : text;
            return (
              <div
                key={message.id}
                className={cn(
                  "animate-rise",
                  message.role === "user" ? "flex justify-end" : "flex justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-full",
                    message.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-gold-gradient px-4 py-2.5 text-primary-foreground"
                      : "w-full",
                  )}
                >
                  {importName && (
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium opacity-80">
                      <Paperclip className="size-3" /> {importName}
                    </p>
                  )}
                  {prose && <Markdown text={prose} />}
                  {message.role === "assistant" && !prose && bots.length === 0 && (
                    <span className="text-sm text-muted-foreground">…</span>
                  )}
                  {bots.map((bot) => (
                    <XmlArtifact key={bot.fileName + bot.xml.length} bot={bot} />
                  ))}
                </div>
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-3 items-end gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-full w-[3px] origin-bottom rounded-sm bg-gold animate-bar"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              Aureus is booting up the workspace…
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error.message}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border px-4 py-4">
        <input
          ref={fileRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {imported && (
          <div className="mx-auto mb-3 max-w-3xl">
            <BotStructureCard structure={imported.structure} onRemove={() => setImported(null)} />
          </div>
        )}
        <form
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition focus-within:border-gold/50"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Import bot XML"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Paperclip />
          </Button>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(input);
              } else if (event.key.length === 1) {
                playKey();
              }
            }}
            placeholder={imported ? "What should I change in this bot?" : "Describe the Deriv bot you want…"}
            className="max-h-48 flex-1 resize-none bg-transparent px-2 py-2 text-foreground outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            <Button type="button" variant="subtle" size="icon" onClick={() => stop()} aria-label="Stop">
              <Square />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim() && !imported} aria-label="Send">
              <ArrowUp />
            </Button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          Generated bots are drafts — always test on a Deriv demo account first.
        </p>
      </div>
    </div>
  );
}
