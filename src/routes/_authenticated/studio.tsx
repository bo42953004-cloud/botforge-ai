import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Download, Menu, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createLocalThread, deleteLocalThread, deleteSavedBot, listSavedBots, listThreads } from "@/lib/local-store";
import { playKey } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Bot studio | Aureus" },
      {
        name: "description",
        content: "Chat with Aureus and download Deriv Bot XML files built from your description.",
      },
      { property: "og:title", content: "Bot studio | Aureus" },
      { property: "og:description", content: "Build and download Deriv bots by describing them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioLayout,
});

export type Thread = { id: string; title: string; updated_at: string };

export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: async (): Promise<Thread[]> => listThreads(),
  });
}

function downloadXml(fileName: string, xml: string) {
  const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function StudioLayout() {
  const { data: bots = [] } = useQuery({ queryKey: ["saved-bots"], queryFn: async () => listSavedBots() });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: threads = [] } = useThreads();
  const params = useParams({ strict: false }) as { threadId?: string };
  const [open, setOpen] = useState(false);

  const newThread = () => {
    const id = createLocalThread();
    void queryClient.invalidateQueries({ queryKey: ["threads"] });
    setOpen(false);
    void navigate({ to: "/studio/$threadId", params: { threadId: id } });
  };

  const remove = (id: string) => {
    try {
      deleteLocalThread(id);
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      if (params.threadId === id) void navigate({ to: "/studio" });
    } catch {
      toast.error("Could not delete that chat.");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-sm tracking-[0.3em] text-gold-gradient">
            AUREUS
          </Link>
          <Button
            size="sm"
            onClick={() => {
              playKey();
              newThread();
            }}
          >
            <Plus />
            New
          </Button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {threads.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No bots yet. Start a new chat.</p>
          )}
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 transition",
                params.threadId === thread.id
                  ? "border border-gold/40 bg-surface-raised"
                  : "border border-transparent hover:bg-surface-raised",
              )}
            >
              <Link
                to="/studio/$threadId"
                params={{ threadId: thread.id }}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 truncate py-2.5 text-sm text-foreground"
              >
                {thread.title}
              </Link>
              <button
                aria-label="Delete chat"
                onClick={() => remove(thread.id)}
                className="opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </nav>

        <div className="max-h-[40%] overflow-y-auto border-t border-border px-2 py-3">
          <p className="px-2 pb-2 text-xs font-medium tracking-widest text-gold">SAVED BOTS ({bots.length})</p>
          {bots.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">Bots Aureus builds are saved here automatically.</p>
          )}
          {bots.map((bot) => (
            <div key={bot.id} className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-surface-raised">
              <Link
                to="/studio/$threadId"
                params={{ threadId: bot.threadId }}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1"
                title={bot.summary}
              >
                <p className="truncate text-xs text-foreground">{bot.fileName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(bot.created_at).toLocaleString()}
                  {bot.issues > 0 ? " · needs review" : " · checked"}
                </p>
              </Link>
              <button aria-label="Download bot" onClick={() => downloadXml(bot.fileName, bot.xml)}>
                <Download className="size-4 text-muted-foreground hover:text-gold" />
              </button>
              <button
                aria-label="Delete saved bot"
                className="opacity-0 transition group-hover:opacity-100"
                onClick={() => {
                  deleteSavedBot(bot.id);
                  void queryClient.invalidateQueries({ queryKey: ["saved-bots"] });
                }}
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <p className="px-2 text-[11px] text-muted-foreground">
            Chats are saved in this browser only.
          </p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <button
          className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground lg:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-4" />
          Chats
        </button>
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
