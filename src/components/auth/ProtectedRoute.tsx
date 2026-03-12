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
// Must wait for BOTH auth AND workspace to finish loading before deciding.
export function RequireWorkspace() {
  const { user, workspace, loading, wsLoading } = useAuth();

  // Wait for auth state to resolve
  if (loading) return <LoadingScreen />;

  // User is logged in — wait for workspace fetch to complete before
  // deciding whether to send them to /setup-workspace.
  // Without this, workspace=null for a split second and causes false redirect.
  if (user && wsLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;
  if (!workspace) return <Navigate to="/setup-workspace" replace />;

  return <Outlet />;
}

// ─── RedirectIfAuth ───────────────────────────────────────────────────────────
// Wraps public pages (login, signup, forgot-password).
// KEY FIX: Never redirect to /setup-workspace while wsLoading is still true.
// This was causing the Google auth redirect loop:
//   1. Google redirects back to /login
//   2. onAuthStateChanged fires → user is set, wsLoading=true (snapshot pending)
//   3. loading=false, user set, workspace=null → old code redirected to /setup-workspace
//   4. User ends up in wrong place, clicks back → stuck loop
// Now we wait for wsLoading to settle before making any routing decision.
export function RedirectIfAuth() {
  const { user, workspace, loading, wsLoading } = useAuth();

  // Always wait for auth
  if (loading) return <LoadingScreen />;

  // If user is known, wait for workspace fetch too before redirecting anywhere.
  // This is the critical guard that prevents the Google redirect loop.
  if (user && wsLoading) return <LoadingScreen />;

  // Both auth + workspace resolved — now safe to redirect
  if (user && workspace) return <Navigate to="/" replace />;
  if (user && !workspace) return <Navigate to="/setup-workspace" replace />;

  // Not logged in — show the page (login/signup/etc)
  return <Outlet />;
}
