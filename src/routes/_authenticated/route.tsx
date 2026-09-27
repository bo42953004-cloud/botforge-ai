import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { RobotHead } from "@/components/RobotHead";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/auth", search: { next: pathname }, replace: true });
    }
  }, [loading, session, navigate, pathname]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RobotHead state="thinking" size="md" showStatus={false} />
      </div>
    );
  }

  return <Outlet />;
}
