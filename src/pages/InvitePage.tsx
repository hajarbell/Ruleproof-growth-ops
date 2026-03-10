import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users, CheckCircle, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, workspace, joinWorkspaceByToken, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "idle" | "joining" | "success" | "error"
  >("idle");
  const [workspaceName, setWorkspaceName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // If already in a workspace, go home
  useEffect(() => {
    if (workspace) navigate("/");
  }, [workspace]);

  const handleJoin = async () => {
    if (!token) return;
    setStatus("joining");
    try {
      const result = await joinWorkspaceByToken(token);
      setWorkspaceName(result.workspaceName);
      setStatus("success");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid invite link.");
      setStatus("error");
    }
  };

  const handleGoogleThenJoin = async () => {
    try {
      await signInWithGoogle();
      // After sign in, handleJoin will be triggered via user state
    } catch {
      setErrorMsg("Google sign-in failed.");
      setStatus("error");
    }
  };

  // Once user is logged in and status is idle, auto-trigger join
  useEffect(() => {
    if (user && status === "idle" && !workspace) {
      handleJoin();
    }
  }, [user, status]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />

        <div className="p-8 text-center">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">R</span>
          </div>

          {status === "idle" && !user && (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                You've been invited!
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Sign in to join the <strong>RuProof Growth OS</strong>{" "}
                workspace.
              </p>
              <button
                onClick={handleGoogleThenJoin}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground mb-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
              <p className="text-xs text-muted-foreground">
                Or{" "}
                <button
                  onClick={() => navigate(`/login?invite=${token}`)}
                  className="text-primary hover:underline"
                >
                  sign in with email
                </button>
              </p>
            </>
          )}

          {(status === "idle" && user) || status === "joining" ? (
            <div className="py-6">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-foreground font-medium">
                Joining workspace...
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Just a second
              </p>
            </div>
          ) : null}

          {status === "success" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                You're in! 🎉
              </h2>
              <p className="text-muted-foreground text-sm mb-1">
                Welcome to <strong>{workspaceName}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting you now...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Invalid invite
              </h2>
              <p className="text-muted-foreground text-sm mb-5">{errorMsg}</p>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium mx-auto"
              >
                <LogIn className="w-4 h-4" /> Go to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
