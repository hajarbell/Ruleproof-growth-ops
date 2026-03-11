import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
          <span className="text-xl font-bold text-primary-foreground">R</span>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Safety hook: if wsLoading stays true for more than 4 seconds, stop waiting.
// Prevents permanent stuck screen if Firestore is slow, a browser extension
// blocks a network response, or the snapshot listener never fires.
function useWsLoadingWithTimeout(wsLoading: boolean) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!wsLoading) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, [wsLoading]);

  return wsLoading && !timedOut;
}

// ─── RequireWorkspace ─────────────────────────────────────────────────────────
// Protects all main app routes.
export function RequireWorkspace() {
  const { user, workspace, loading, wsLoading } = useAuth();
  const stillLoading = useWsLoadingWithTimeout(wsLoading);

  if (loading) return <LoadingScreen />;
  if (user && stillLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;
  if (!workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}

// ─── RedirectIfAuth ───────────────────────────────────────────────────────────
// Wraps public pages (login, signup, forgot-password).
export function RedirectIfAuth() {
  const { user, workspace, loading, wsLoading } = useAuth();
  const stillLoading = useWsLoadingWithTimeout(wsLoading);

  if (loading) return <LoadingScreen />;
  if (user && stillLoading) return <LoadingScreen />;

  if (user && workspace) return <Navigate to="/" replace />;
  if (user && !workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}
