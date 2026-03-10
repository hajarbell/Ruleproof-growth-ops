import { Search, Sun, Moon, Bell, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface TopBarProps { onOpenCommand: () => void; }

export function TopBar({ onOpenCommand }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, workspace, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
      <button onClick={onOpenCommand} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-accent transition-colors w-80">
        <Search className="w-4 h-4" />
        <span>Search or press</span>
        <kbd className="ml-auto px-2 py-0.5 rounded bg-background border border-border text-xs font-mono">⌘K</kbd>
      </button>

      <div className="flex items-center gap-2">
        <button className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full gradient-primary" />
        </button>
        <button onClick={toggleTheme} className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <div className="relative ml-1" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">{initials}</div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{user?.displayName ?? user?.email ?? "User"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[100px]">{workspace?.name ?? "No workspace"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 glass rounded-xl border border-border shadow-soft py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">{user?.displayName ?? "User"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button onClick={() => { setMenuOpen(false); navigate("/settings"); }} className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors">Settings</button>
              <button onClick={handleLogout} className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted transition-colors flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" />Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
