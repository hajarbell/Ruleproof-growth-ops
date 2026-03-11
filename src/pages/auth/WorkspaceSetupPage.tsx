import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkspaceSetupPage() {
  const { createWorkspace, loading, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<"personal" | "agency">("personal");
  const [error, setError] = useState("");

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
            Hey {firstName}! 👋
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Workspace Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. RuProof Agency"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Workspace Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["personal", User, "Personal", "Just for me"],
                    ["agency", Building2, "Agency", "Team workspace"],
                  ] as const
                ).map(([t, Icon, label, sub]) => (
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
