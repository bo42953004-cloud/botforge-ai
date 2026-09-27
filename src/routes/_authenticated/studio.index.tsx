import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { RobotHead } from "@/components/RobotHead";
import { createThread, useThreads } from "@/routes/_authenticated/studio";

export const Route = createFileRoute("/_authenticated/studio/")({
  component: StudioIndex,
});

function StudioIndex() {
  const navigate = useNavigate();
  const { data: threads, isLoading } = useThreads();
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || started.current || !threads) return;
    started.current = true;
    const existing = threads[0];
    if (existing) {
      void navigate({ to: "/studio/$threadId", params: { threadId: existing.id }, replace: true });
      return;
    }
    void createThread().then((id) =>
      navigate({ to: "/studio/$threadId", params: { threadId: id }, replace: true }),
    );
  }, [isLoading, threads, navigate]);

  return (
    <div className="flex h-full items-center justify-center">
      <RobotHead state="thinking" size="md" />
    </div>
  );
}
