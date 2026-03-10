import { useNavigate } from "react-router-dom";
import { Linkedin, UserSearch, PenTool, Megaphone, Plus, Upload, FolderOpen, Bot, Lightbulb } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const go = (path: string) => { navigate(path); onOpenChange(false); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg glass rounded-xl shadow-soft border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-muted-foreground">🔍</span>
          <input autoFocus placeholder="Search leads, content, campaigns..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-xs font-mono text-muted-foreground">Esc</kbd>
        </div>
        <div className="py-2">
          <p className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
          {[
            { label: "New Lead", icon: Plus, path: "/leads" },
            { label: "Create Post", icon: PenTool, path: "/content-studio" },
            { label: "New Campaign", icon: Megaphone, path: "/campaigns" },
            { label: "Upload Asset", icon: Upload, path: "/files" },
          ].map(({ label, icon: Icon, path }) => (
            <button key={label} onClick={() => go(path)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground" />{label}
            </button>
          ))}
          <div className="h-px bg-border my-2" />
          <p className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Navigate</p>
          {[
            { label: "LinkedIn", icon: Linkedin, path: "/linkedin" },
            { label: "Scrapers", icon: Bot, path: "/scrapers" },
            { label: "Leads CRM", icon: UserSearch, path: "/leads" },
            { label: "Ideas Lab", icon: Lightbulb, path: "/ideas-lab" },
            { label: "Files", icon: FolderOpen, path: "/files" },
          ].map(({ label, icon: Icon, path }) => (
            <button key={label} onClick={() => go(path)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground" />{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
