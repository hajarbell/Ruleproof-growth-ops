import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

export default function LoggedOutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-center"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />
        <div className="p-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">R</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            You've been signed out
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your session has ended. Sign back in to access your workspace.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Sign back in
          </button>
        </div>
      </motion.div>
    </div>
  );
}
