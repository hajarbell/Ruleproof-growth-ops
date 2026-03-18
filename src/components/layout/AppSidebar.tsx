// src/components/layout/AppSidebar.tsx
// Changes: added Engagement Matrix nav item (Target icon)

import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Linkedin,
  Facebook,
  PenTool,
  Lightbulb,
  Bot,
  UserSearch,
  Megaphone,
  FolderOpen,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserPlus,
  Shield,
  Star,
  User as UserIcon,
  Check,
  Pencil,
  X,
  Users,
  Target,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppNotification } from "@/components/layout/TopBar";
import type { LinkedInAccount } from "@/pages/LinkedInPage";

const ALL_NAV = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "LinkedIn", path: "/linkedin", icon: Linkedin },
  { title: "Facebook", path: "/facebook", icon: Facebook },
  { title: "Content Studio", path: "/content", icon: PenTool },
  { title: "Ideas Lab", path: "/ideas", icon: Lightbulb },
  { title: "Engagement Matrix", path: "/engagement", icon: Target },
  { title: "Scrapers", path: "/scrapers", icon: Bot },
  { title: "Leads CRM", path: "/leads", icon: UserSearch },
  { title: "Campaigns", path: "/campaigns", icon: Megaphone },
  { title: "Files", path: "/files", icon: FolderOpen },
  { title: "Activity", path: "/activity", icon: Activity },
  { title: "Settings", path: "/settings", icon: Settings },
];
const GUEST_PATHS = ["/content"];
const VIP_HIDDEN = ["/scrapers", "/leads", "/campaigns"];

function getNavItems(role: string | null) {
  if (role === "admin") return ALL_NAV;
  if (role === "vip")
    return ALL_NAV.filter((i) => !VIP_HIDDEN.includes(i.path));
  return ALL_NAV.filter(
    (i) => GUEST_PATHS.includes(i.path) || i.path === "/settings",
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin")
    return (
      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
        <Shield className="w-2.5 h-2.5" />
        Admin
      </span>
    );
  if (role === "vip")
    return (
      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold uppercase">
        <Star className="w-2.5 h-2.5" />
        VIP
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold uppercase">
      <UserIcon className="w-2.5 h-2.5" />
      Guest
    </span>
  );
}

function Avatar({
  name,
  photo,
  size = 8,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const ini = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`;
  if (photo)
    return <img src={photo} alt={name} className={`${cls} object-cover`} />;
  return (
    <div
      className={`${cls} gradient-primary flex items-center justify-center text-primary-foreground font-bold`}
      style={{ fontSize: size <= 6 ? "9px" : "11px" }}
    >
      {ini}
    </div>
  );
}

function NotificationToast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="fixed top-4 right-4 z-[100] max-w-xs bg-card border border-border rounded-xl shadow-xl px-4 py-3 flex items-start gap-3"
    >
      <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1" />
      <p className="text-sm text-foreground leading-snug flex-1">{message}</p>
      <button
        onClick={onDone}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Members Popup ────────────────────────────────────────────────────────────
function MembersPopup({ onClose }: { onClose: () => void }) {
  const { workspace, members } = useAuth();
  const [linkedinAccounts, setLinkedinAccounts] = useState<LinkedInAccount[]>(
    [],
  );

  useEffect(() => {
    if (!workspace?.id) return;
    getDocs(
      collection(db, "workspaces", workspace.id, "linkedinAccounts"),
    ).then((snap) => {
      setLinkedinAccounts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LinkedInAccount),
      );
    });
  }, [workspace?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, scale: 0.97 }}
      className="absolute left-full top-0 ml-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
      style={{ minWidth: 260 }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />

      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">
            {workspace?.name} · {members.length} member
            {members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
        {members.map((m) => {
          return (
            <div key={m.uid} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {m.photoURL ? (
                  <img
                    src={m.photoURL}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground flex-shrink-0">
                    {(m.displayName || m.email || "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-foreground truncate">
                      {m.displayName || m.email}
                    </p>
                    {m.uid === workspace?.ownerId && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {m.email}
                  </p>
                  <div className="mt-0.5">
                    <RoleBadge role={m.role} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LinkedIn accounts section */}
      {linkedinAccounts.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Linkedin className="w-3 h-3 text-[#0077b5]" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              LinkedIn Accounts ({linkedinAccounts.length})
            </p>
          </div>
          <div className="space-y-1.5">
            {linkedinAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0077b5]/8 border border-[#0077b5]/15"
              >
                {acc.avatarUrl ? (
                  <img
                    src={acc.avatarUrl}
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#0077b5]/20 flex items-center justify-center flex-shrink-0">
                    <Linkedin className="w-3 h-3 text-[#0077b5]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground font-medium truncate">
                    {acc.name}
                  </p>
                  {acc.headline && (
                    <p className="text-[9px] text-muted-foreground truncate">
                      {acc.headline}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[8px] px-1 py-0.5 rounded font-semibold uppercase ${
                    acc.type === "personal"
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "bg-sky-500/10 text-sky-400"
                  }`}
                >
                  {acc.type === "personal" ? "Personal" : "Company"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, workspace, members, myRole, logout, renameWorkspace } =
    useAuth();

  const navItems = getNavItems(myRole);
  const displayName = user?.displayName || user?.email?.split("@")[0] || "You";
  const photoURL = user?.photoURL || "";

  // ─── Notification listener ─────────────────────────────────────────────────
  const prevCountRef = useRef(0);
  const initialRef = useRef(true);
  const prevMessagesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!workspace?.id || myRole !== "admin") return;
    const q = query(
      collection(db, "workspaces", workspace.id, "notifications"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AppNotification,
      );
      const unread = items.filter((n) => !n.read);
      if (initialRef.current) {
        initialRef.current = false;
        prevCountRef.current = unread.length;
        prevMessagesRef.current = unread.map((n) => n.id);
        return;
      }
      const newOnes = unread.filter(
        (n) => !prevMessagesRef.current.includes(n.id),
      );
      if (newOnes.length > 0) setToast(newOnes[0].message);
      prevCountRef.current = unread.length;
      prevMessagesRef.current = unread.map((n) => n.id);
    });
  }, [workspace?.id, myRole]);

  // Close members popup on outside click
  useEffect(() => {
    if (!showMembers) return;
    const handler = (e: MouseEvent) => {
      if (
        membersRef.current &&
        !membersRef.current.contains(e.target as Node)
      ) {
        setShowMembers(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMembers]);

  const handleLogout = async () => {
    await logout();
    navigate("/logged-out");
  };

  const startRename = () => {
    setNameValue(workspace?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveRename = async () => {
    if (!nameValue.trim() || nameValue.trim() === workspace?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    await renameWorkspace(nameValue.trim());
    setSavingName(false);
    setEditingName(false);
  };

  const handleNameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveRename();
    if (e.key === "Escape") setEditingName(false);
  };

  return (
    <>
      <AnimatePresence>
        {toast && (
          <NotificationToast message={toast} onDone={() => setToast(null)} />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 68 : 252 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar z-[60] overflow-visible"
      >
        {/* ── WORKSPACE HEADER ── */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2">
          <div
            className={`flex items-center gap-2 mb-2.5 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm text-primary-foreground font-bold text-sm">
              {workspace?.name?.[0]?.toUpperCase() ?? "R"}
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={nameInputRef}
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={handleNameKey}
                        onBlur={saveRename}
                        className="flex-1 min-w-0 text-sm font-bold bg-muted border border-primary/40 rounded-md px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        maxLength={40}
                      />
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveRename();
                        }}
                        className="text-primary hover:text-primary/80 flex-shrink-0"
                        disabled={savingName}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setEditingName(false);
                        }}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-1 cursor-default">
                      <p className="font-bold text-sm text-sidebar-foreground truncate leading-tight">
                        {workspace?.name ?? "RuProof"}
                      </p>
                      {myRole === "admin" && (
                        <button
                          onClick={startRename}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {!editingName && (
                    <p className="text-[10px] text-muted-foreground">
                      Growth OS
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Members strip — clickable → popup ── */}
          <AnimatePresence>
            {!collapsed && members.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                ref={membersRef}
                className="relative"
              >
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="flex items-center gap-2 w-full hover:bg-sidebar-accent rounded-lg px-1 py-1 transition-colors"
                >
                  <div className="flex -space-x-1.5 flex-shrink-0">
                    {members.slice(0, 5).map((m) => (
                      <div
                        key={m.uid}
                        title={`${m.displayName || m.email} · ${m.role}`}
                        className="ring-2 ring-sidebar rounded-full"
                      >
                        <Avatar
                          name={m.displayName || m.email}
                          photo={m.photoURL}
                          size={5}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate text-left">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </span>
                  {myRole === "admin" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/settings");
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors flex-shrink-0 px-1.5 py-1 rounded-md hover:bg-primary/10"
                    >
                      <UserPlus className="w-3 h-3" />
                      Invite
                    </button>
                  )}
                </button>

                {/* Members popup */}
                <AnimatePresence>
                  {showMembers && (
                    <MembersPopup onClose={() => setShowMembers(false)} />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-b border-sidebar-border mx-2 mb-1" />

        {/* ── NAV ── */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map(({ title, path, icon: Icon }) => {
            const isActive =
              path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate"
                    >
                      {title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* ── BOTTOM: user + sign out ── */}
        <div className="flex-shrink-0 border-t border-sidebar-border">
          <div
            className={`flex items-center gap-2 px-3 py-2.5 ${collapsed ? "justify-center" : ""}`}
          >
            <Avatar name={displayName} photo={photoURL} size={7} />
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">
                    {displayName}
                  </p>
                  {myRole && <RoleBadge role={myRole} />}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 flex items-center justify-center h-7 border-t border-sidebar-border text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </motion.aside>
    </>
  );
}
