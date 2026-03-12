import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldOff } from "lucide-react";

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

// ─── Shown when an owner has removed/banned this user ────────────────────────
function RemovedScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Access Removed
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your access to this workspace has been revoked by the owner. Contact
            them if you think this is a mistake.
          </p>
        </div>
        <button
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

// ─── RequireWorkspace ─────────────────────────────────────────────────────────
export function RequireWorkspace() {
  const { user, workspace, loading, wsLoading, banned } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user && wsLoading) return <LoadingScreen />;

  // Banned users see the removed screen — they can't access anything
  if (user && banned) return <RemovedScreen />;

  if (!user) return <Navigate to="/login" replace />;
  if (!workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}

// ─── RedirectIfAuth ───────────────────────────────────────────────────────────
export function RedirectIfAuth() {
  const { user, workspace, loading, wsLoading, banned } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user && wsLoading) return <LoadingScreen />;

  // Banned users trying to access login/signup — show removed screen
  if (user && banned) return <RemovedScreen />;

  if (user && workspace) return <Navigate to="/" replace />;
  if (user && !workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}
