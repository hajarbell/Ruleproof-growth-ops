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

export function RequireWorkspace() {
  const { user, workspace, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!workspace) return <Navigate to="/setup-workspace" replace />;
  return <Outlet />;
}

export function RedirectIfAuth() {
  const { user, workspace, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && workspace) return <Navigate to="/" replace />;
  if (user && !workspace) return <Navigate to="/setup-workspace" replace />;
  return <Outlet />;
}
