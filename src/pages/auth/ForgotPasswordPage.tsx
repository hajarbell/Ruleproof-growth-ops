import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPassword, authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try { await resetPassword(email); setSent(true); }
    catch { setError("Could not send reset email. Check the address and try again."); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <div>
            <span className="font-bold text-xl font-display gradient-text">RuProof</span>
            <span className="text-sm text-muted-foreground ml-1.5">Growth OS</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-8 shadow-soft border border-border/50">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <h2 className="text-lg font-bold font-display text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-5">Reset link sent to <strong>{email}</strong></p>
              <Link to="/login" className="text-primary text-sm font-medium hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold font-display text-foreground mb-1">Reset password</h1>
              <p className="text-muted-foreground text-sm mb-6">Enter your email and we'll send a reset link.</p>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <button type="submit" disabled={authLoading}
                  className="w-full gradient-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {authLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5">
                <Link to="/login" className="text-primary font-medium hover:underline">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
