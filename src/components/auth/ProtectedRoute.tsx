import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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

// ─── RequireWorkspace ─────────────────────────────────────────────────────────
// Protects all main app routes.
// MUST wait for both auth AND workspace loading to finish before deciding.
// Without this, a logged-in user briefly has workspace=null during the async
// Firestore fetch, causing a false redirect to /setup-workspace.
export function RequireWorkspace() {
  const { user, workspace, loading, wsLoading } = useAuth();

  // Wait for Firebase auth to resolve
  if (loading) return <LoadingScreen />;

  // If user is logged in, also wait for workspace fetch to complete
  // before deciding whether to send them to /setup-workspace
  if (user && wsLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;
  if (!workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}

// ─── RedirectIfAuth ───────────────────────────────────────────────────────────
// Wraps public pages (login, signup, forgot-password).
// Only redirects AFTER both auth and workspace are confirmed loaded.
// This prevents the Google redirect sign-in from looping back to /login.
export function RedirectIfAuth() {
  const { user, workspace, loading, wsLoading } = useAuth();

  // Wait for auth to resolve
  if (loading) return <LoadingScreen />;

  // If user exists, wait for workspace fetch too — otherwise we'd redirect
  // to /setup-workspace on every page load for a split second
  if (user && wsLoading) return <LoadingScreen />;

  if (user && workspace) return <Navigate to="/" replace />;
  if (user && !workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}
