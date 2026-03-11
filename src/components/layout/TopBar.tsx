import {
  Search,
  Sun,
  Moon,
  Bell,
  LogOut,
  ChevronDown,
  CheckCheck,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  updateDoc,
  doc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

export interface AppNotification {
  id: string;
  type:
    | "member_joined"
    | "account_connected"
    | "post_imported"
    | "weekly_digest";
  message: string;
  actorName: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function typeLabel(type: AppNotification["type"]) {
  switch (type) {
    case "member_joined":
      return "Team";
    case "account_connected":
      return "LinkedIn";
    case "post_imported":
      return "Content";
    case "weekly_digest":
      return "Digest";
  }
}

function typeDot(type: AppNotification["type"]) {
  switch (type) {
    case "member_joined":
      return "bg-violet-400";
    case "account_connected":
      return "bg-sky-400";
    case "post_imported":
      return "bg-indigo-400";
    case "weekly_digest":
      return "bg-fuchsia-400";
  }
}

interface TopBarProps {
  onOpenCommand: () => void;
}

export function TopBar({ onOpenCommand }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, workspace, myRole, logout } = useAuth();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      )
        setUserMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time listener — admin only
  useEffect(() => {
    if (!workspace?.id || myRole !== "admin") return;
    const q = query(
      collection(db, "workspaces", workspace.id, "notifications"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification),
      );
    });
  }, [workspace?.id, myRole]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!workspace?.id) return;
    const list = notifications.filter((n) => !n.read);
    if (!list.length) return;
    const batch = writeBatch(db);
    list.forEach((n) =>
      batch.update(doc(db, "workspaces", workspace.id, "notifications", n.id), {
        read: true,
      }),
    );
    await batch.commit();
  };

  const handleBellClick = () => {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && unread > 0) setTimeout(markAllRead, 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/logged-out");
  };

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-accent transition-colors w-80"
      >
        <Search className="w-4 h-4" />
        <span>Search or press</span>
        <kbd className="ml-auto px-2 py-0.5 rounded bg-background border border-border text-xs font-mono">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        {/* Bell — admin only */}
        {myRole === "admin" && (
          <div className="relative" ref={bellRef}>
            <button
              onClick={handleBellClick}
              className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors relative"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500"
                />
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      Notifications
                    </p>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Bell className="w-6 h-6 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/40 last:border-0 ${!n.read ? "bg-muted/20" : ""}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${typeDot(n.type)} ${n.read ? "opacity-25" : ""}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs leading-snug ${n.read ? "text-muted-foreground" : "text-foreground font-medium"}`}
                            >
                              {n.message}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wide font-semibold">
                                {typeLabel(n.type)}
                              </span>
                              <span className="text-[9px] text-muted-foreground/50">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                          </div>
                          {!n.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="border-t border-border px-4 py-2.5">
                      <button
                        onClick={() => {
                          setBellOpen(false);
                          navigate("/settings");
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View all in Settings
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </button>

        {/* User menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? ""}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">
                {user?.displayName ?? user?.email ?? "User"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[100px]">
                {workspace?.name ?? "No workspace"}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 glass rounded-xl border border-border shadow-soft py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.displayName ?? "User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/settings");
                }}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted transition-colors flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
