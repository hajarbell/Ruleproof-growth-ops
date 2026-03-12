import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, Home, ShieldCheck } from "lucide-react";

export default function LoggedOutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
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

        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden text-center">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />

          <div className="p-8">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5"
            >
              <ShieldCheck className="w-8 h-8 text-muted-foreground" />
            </motion.div>

            <h1 className="text-xl font-bold text-foreground mb-2">
              You've been signed out
            </h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Your session has ended safely. What would you like to do?
            </p>

            {/* Options */}
            <div className="space-y-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full gradient-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <LogIn className="w-4 h-4" />
                Sign back in
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to homepage
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data is safe and waiting for you.
        </p>
      </motion.div>
    </div>
  );
}
