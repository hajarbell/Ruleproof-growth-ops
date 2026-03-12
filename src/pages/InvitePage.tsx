import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  Users,
  Sparkles,
  AlertCircle,
  LogIn,
  Shield,
  Star,
  User as UserIcon,
} from "lucide-react";
import { useAuth, MemberRole } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROLE_INFO = {
  admin: {
    label: "Admin",
    desc: "Full access to everything",
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  vip: {
    label: "VIP",
    desc: "No Leads, Scrapers, Campaigns",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  guest: {
    label: "Guest",
    desc: "Content Studio only",
    icon: UserIcon,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const role = (searchParams.get("role") ?? "guest") as MemberRole;
  const { user, loading, joinWorkspaceByToken, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "idle" | "joining" | "success" | "error"
  >("idle");
  const [workspaceName, setWorkspaceName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const roleInfo = ROLE_INFO[role] ?? ROLE_INFO.guest;

  const doJoin = async (activeUser: NonNullable<typeof user>) => {
    if (!token) return;
    setStatus("joining");
    try {
      const result = await joinWorkspaceByToken(token, role);
      setWorkspaceName(result.workspaceName);
      setStatus("success");

      // Write notification with both owner-facing and personal messages
      try {
        const q = query(
          collection(db, "workspaces"),
          where("inviteToken", "==", token),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const wsId = snap.docs[0].id;
          const wsDisplayName = result.workspaceName;
          const name = activeUser.displayName || activeUser.email || "Someone";
          const roleLabel =
            result.role.charAt(0).toUpperCase() + result.role.slice(1);
          await addDoc(collection(db, "workspaces", wsId, "notifications"), {
            type: "member_joined",
            message: `${name} joined the workspace as ${roleLabel}.`,
            personalMessage: `You joined ${wsDisplayName} as ${roleLabel}.`,
            actorUid: activeUser.uid,
            actorName: name,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (_) {}

      setTimeout(() => navigate("/"), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid invite link.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (loading) return;
    if (user && status === "idle") {
      sessionStorage.removeItem("pendingInviteToken");
      sessionStorage.removeItem("pendingInviteRole");
      doJoin(user);
    }
  }, [user, loading]);

  const handleGoogle = () => {
    if (token) {
      sessionStorage.setItem("pendingInviteToken", token);
      sessionStorage.setItem("pendingInviteRole", role);
    }
    signInWithGoogle(token, role);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">R</span>
          </div>

          {/* Not signed in */}
          {status === "idle" && !user && (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                You've been invited!
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                Sign in to join as{" "}
                <span className={`font-semibold ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                .
              </p>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-primary hover:underline"
                >
                  sign in with email
                </button>
              </p>
            </>
          )}

          {status === "joining" && (
            <div className="py-6">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-foreground font-medium">
                Joining workspace...
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Just a second
              </p>
            </div>
          )}

          {/* Success — Sparkles icon, no emoji */}
          {status === "success" && (
            <div className="py-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles className="w-8 h-8 text-amber-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Welcome to {workspaceName}
              </h2>
              <p className="text-muted-foreground text-sm mb-1">
                You joined as <strong>{roleInfo.label}</strong>.
              </p>
              <p className="text-xs text-muted-foreground opacity-60 mt-3">
                Taking you to your dashboard...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Invalid invite
              </h2>
              <p className="text-muted-foreground text-sm mb-5">{errorMsg}</p>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium mx-auto"
              >
                <LogIn className="w-4 h-4" />
                Go to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
