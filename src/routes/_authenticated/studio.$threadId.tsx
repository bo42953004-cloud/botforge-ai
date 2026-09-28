import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { ChatWindow } from "@/components/ChatWindow";
import { loadLocalMessages, renameLocalThread } from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated/studio/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const initialMessages = useMemo(() => loadLocalMessages(threadId), [threadId]);

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      onFirstUserMessage={(text) => {
        const title = text.length > 48 ? `${text.slice(0, 48)}…` : text;
        renameLocalThread(threadId, title);
        void queryClient.invalidateQueries({ queryKey: ["threads"] });
      }}
    />
  );
}
