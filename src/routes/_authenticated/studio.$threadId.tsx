import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";

import { ChatWindow } from "@/components/ChatWindow";
import { RobotHead } from "@/components/RobotHead";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/studio/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async (): Promise<UIMessage[]> => {
      const { data: rows, error } = await supabase
        .from("bot_messages")
        .select("id, role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (rows ?? []).map((row) => ({
        id: row.id,
        role: row.role === "user" ? "user" : "assistant",
        parts: [{ type: "text", text: row.content }],
      })) as UIMessage[];
    },
    staleTime: Infinity,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <RobotHead state="thinking" size="md" showStatus={false} />
      </div>
    );
  }

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={data}
      onFirstUserMessage={async (text) => {
        const title = text.length > 48 ? `${text.slice(0, 48)}…` : text;
        await supabase.from("bot_threads").update({ title }).eq("id", threadId);
        void queryClient.invalidateQueries({ queryKey: ["threads"] });
      }}
    />
  );
}
