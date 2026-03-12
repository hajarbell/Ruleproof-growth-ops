import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
  ShieldOff,
  LogOut,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function WorkspaceSetupPage() {
  const { createWorkspace, loading, user, banned, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<"personal" | "agency">("personal");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [existingWsName, setExistingWsName] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    const findExisting = async () => {
      // ── PRIORITY: if there's a pending invite, go there instead ──────────
      // This fixes the case where an invited member logs in via Google,
      // gets redirected here, but should actually join the invited workspace.
      const pendingToken = sessionStorage.getItem("pendingInviteToken");
      const pendingRole =
        sessionStorage.getItem("pendingInviteRole") ?? "guest";
      if (pendingToken) {
        // Don't clear sessionStorage here — InvitePage will handle it
        navigate(`/invite/${pendingToken}?role=${pendingRole}`, {
          replace: true,
        });
        return;
      }

      try {
        // Check by ownerId first (oldest workspace wins)
        const ownerSnap = await getDocs(
          query(collection(db, "workspaces"), where("ownerId", "==", user.uid)),
        );
        if (!ownerSnap.empty) {
          const sorted = ownerSnap.docs.sort(
            (a, b) =>
              (a.data().createdAt?.seconds ?? 0) -
              (b.data().createdAt?.seconds ?? 0),
          );
          setExistingWsName(sorted[0].data().name ?? "Your Workspace");
          setChecking(false);
          return;
        }

        // Member scan
        const allSnap = await getDocs(collection(db, "workspaces"));
        for (const d of allSnap.docs) {
          const mems: any[] = Array.isArray(d.data().members)
            ? d.data().members
            : [];
          if (mems.some((m) => m?.uid === user.uid)) {
            setExistingWsName(d.data().name ?? "Your Workspace");
            setChecking(false);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      setChecking(false);
    };

    findExisting();
  }, [user?.uid]);

  const handleRejoin = async () => {
    setRejoining(true);
    await createWorkspace("__rejoin__");
    navigate("/");
  };

  // ── Banned ─────────────────────────────────────────────────────────────────
  if (banned) {
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
              Your access to this workspace has been revoked by the owner.
              Contact them if you think this is a mistake.
            </p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Back to login
          </button>
        </div>
      </div>
    );
  }

  // ── Checking ───────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
            <span className="text-xl font-bold text-primary-foreground">R</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Finding your workspace...
          </p>
        </div>
      </div>
    );
  }

  // ── Rejoin — user has an existing workspace ────────────────────────────────
  if (existingWsName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                R
              </span>
            </div>
            <div>
              <span className="font-bold text-xl font-display gradient-text">
                RuProof
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">
                Growth OS
              </span>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 shadow-soft border border-border/50 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground">
                {existingWsName[0]?.toUpperCase() ?? "R"}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Welcome back!
            </h1>
            <p className="text-muted-foreground text-sm mb-1">
              Your workspace is ready for you.
            </p>
            <p className="text-primary font-semibold text-lg mb-6">
              {existingWsName}
            </p>

            <button
              onClick={handleRejoin}
              disabled={rejoining}
              className="w-full gradient-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {rejoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Reconnecting...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" /> Continue to{" "}
                  {existingWsName}
                </>
              )}
            </button>

            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="mt-3 w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in with a different account
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Create — genuinely new user ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter a workspace name.");
      return;
    }
    try {
      await createWorkspace(name.trim());
      navigate("/");
    } catch {
      setError("Failed to create workspace. Please try again.");
    }
  };

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const WS_TYPES = [
    { t: "personal" as const, label: "Personal", sub: "Just me", Icon: User },
    {
      t: "agency" as const,
      label: "Agency",
      sub: "Team & clients",
      Icon: Building2,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <div>
            <span className="font-bold text-xl font-display gradient-text">
              RuProof
            </span>
            <span className="text-sm text-muted-foreground ml-1.5">
              Growth OS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center mb-6">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-xs text-muted-foreground">Account created</span>
          <div className="w-8 h-px bg-border" />
          <div className="w-4 h-4 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">2</span>
          </div>
          <span className="text-xs font-medium text-foreground">
            Setup workspace
          </span>
        </div>

        <div className="glass rounded-2xl p-8 shadow-soft border border-border/50">
          <h1 className="text-2xl font-bold font-display text-foreground mb-1">
            Hey {firstName}!
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Set up your workspace to get started.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Workspace Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. RuProof HQ"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WS_TYPES.map(({ t, label, sub, Icon }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${type === t ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"}`}
                  >
                    <div
                      className={`p-2.5 rounded-lg ${type === t ? "gradient-primary" : "bg-muted"}`}
                    >
                      <Icon
                        className={`w-5 h-5 ${type === t ? "text-primary-foreground" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                    {type === t && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating workspace..." : "Launch My Workspace 🚀"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
