import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Users,
  Bell,
  Database,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  LogOut,
  UserX,
  ChevronDown,
  Shield,
  Star,
  User as UserIcon,
  Link2,
  X,
  CheckCheck,
  Trash2,
  Hash,
  Calendar,
  Linkedin,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, MemberRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppNotification } from "@/components/layout/TopBar";

function Avatar({ name, photo }: { name: string; photo?: string }) {
  const ini = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  if (photo)
    return (
      <img
        src={photo}
        alt={name}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  return (
    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs flex-shrink-0">
      {ini}
    </div>
  );
}

const ROLES: {
  value: MemberRole;
  label: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
}[] = [
  {
    value: "admin",
    label: "Admin",
    desc: "Full access to everything",
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  },
  {
    value: "vip",
    label: "VIP",
    desc: "No Leads, Scrapers, Campaigns",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  {
    value: "guest",
    label: "Guest",
    desc: "Content Studio only",
    icon: UserIcon,
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
  },
];

function RolePill({ role }: { role: MemberRole }) {
  const r = ROLES.find((x) => x.value === role)!;
  return (
    <span
      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${r.color} ${r.bg}`}
    >
      <r.icon className="w-2.5 h-2.5" />
      {r.label}
    </span>
  );
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

function NotificationsPanel({ workspaceId }: { workspaceId: string }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(db, "workspaces", workspaceId, "notifications"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification),
      );
      setLoading(false);
    });
  }, [workspaceId]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const list = notifications.filter((n) => !n.read);
    if (!list.length) return;
    const batch = writeBatch(db);
    list.forEach((n) =>
      batch.update(doc(db, "workspaces", workspaceId, "notifications", n.id), {
        read: true,
      }),
    );
    await batch.commit();
  };

  const clearAll = async () => {
    const snap = await getDocs(
      collection(db, "workspaces", workspaceId, "notifications"),
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-xl shadow-soft overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-muted">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Bell className="w-7 h-7 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground/60">
            Activity from your team will appear here
          </p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-5 py-3.5 border-b border-border/40 last:border-0 ${!n.read ? "bg-muted/15" : ""}`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${typeDot(n.type)} ${n.read ? "opacity-25" : ""}`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}
                >
                  {n.message}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide font-semibold">
                    {typeLabel(n.type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
              </div>
              {!n.read && (
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Members + LinkedIn Panel ─────────────────────────────────────────────────
function MembersLinkedInPanel({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const { members } = useAuth();
  const [linkedinAccounts, setLinkedinAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocs(collection(db, "workspaces", workspaceId, "linkedinAccounts")).then(
      (snap) => {
        setLinkedinAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
  }, [workspaceId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const personalAccounts = linkedinAccounts.filter(
    (a) => a.type === "personal",
  );
  const companyAccounts = linkedinAccounts.filter((a) => a.type === "company");

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      className="absolute top-full left-0 mt-2 w-[420px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {members.length} Members & LinkedIn Accounts
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto divide-y divide-border/40">
          {members.map((m) => {
            const ini = (m.displayName || m.email || "?")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            // Match LinkedIn accounts to member by name similarity (best effort without uid mapping)
            const memberLinkedIn = personalAccounts.filter(
              (a) =>
                a.name &&
                m.displayName &&
                a.name
                  .toLowerCase()
                  .includes(m.displayName.split(" ")[0].toLowerCase()),
            );
            return (
              <div key={m.uid} className="px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  {m.photoURL ? (
                    <img
                      src={m.photoURL}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                      {ini}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {m.displayName || m.email}
                      </p>
                      <RolePill role={m.role} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.email}
                    </p>
                  </div>
                </div>
                {/* LinkedIn accounts for this member */}
                {memberLinkedIn.length > 0 && (
                  <div className="ml-12 space-y-1.5">
                    {memberLinkedIn.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#0077b5]/8 border border-[#0077b5]/15"
                      >
                        {acc.avatarUrl ? (
                          <img
                            src={acc.avatarUrl}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#0077b5]/20 flex items-center justify-center flex-shrink-0">
                            <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {acc.name}
                          </p>
                          {acc.headline && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {acc.headline}
                            </p>
                          )}
                          {acc.followers > 0 && (
                            <p className="text-[10px] text-primary">
                              {acc.followers.toLocaleString()} followers
                            </p>
                          )}
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold uppercase">
                          Personal
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {memberLinkedIn.length === 0 && (
                  <div className="ml-12">
                    <p className="text-[10px] text-muted-foreground/50 italic">
                      No LinkedIn account linked
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {/* Company accounts section */}
          {companyAccounts.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Linkedin className="w-3 h-3 text-[#0077b5]" /> Company Pages (
                {companyAccounts.length})
              </p>
              {companyAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-sky-500/8 border border-sky-500/15 mb-1.5"
                >
                  {acc.avatarUrl ? (
                    <img
                      src={acc.avatarUrl}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <Linkedin className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {acc.name}
                    </p>
                    {acc.headline && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {acc.headline}
                      </p>
                    )}
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold uppercase">
                    Company
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Workspace Session Card ───────────────────────────────────────────────────
function WorkspaceSessionCard() {
  const { workspace, members, user } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  if (!workspace) return null;

  const copyId = async () => {
    await navigator.clipboard.writeText(workspace.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const createdAt = (workspace.createdAt as any)?.seconds
    ? new Date((workspace.createdAt as any).seconds * 1000).toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "short", year: "numeric" },
      )
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="glass rounded-xl shadow-soft overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-muted">
          <Database className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Workspace Session</h3>
          <p className="text-xs text-muted-foreground">
            Your active workspace details
          </p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Workspace name — clickable to show members panel */}
        <div className="relative">
          <button
            onClick={() => setShowMembersPanel(!showMembersPanel)}
            className="w-full flex items-center justify-between py-2 border-b border-border/40 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-foreground">
                  {workspace.name[0]?.toUpperCase()}
                </span>
              </div>
              <span className="font-medium text-foreground">
                {workspace.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary font-semibold">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showMembersPanel ? "rotate-90" : ""}`}
              />
            </div>
          </button>
          <AnimatePresence>
            {showMembersPanel && (
              <MembersLinkedInPanel
                workspaceId={workspace.id}
                onClose={() => setShowMembersPanel(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Workspace ID */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Workspace ID</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded">
              {workspace.id.slice(0, 12)}...
            </code>
            <button
              onClick={copyId}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Owner */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Owner</span>
          </div>
          <span className="text-xs text-foreground font-medium">
            {workspace.ownerId === user?.uid
              ? "You"
              : (members.find((m) => m.uid === workspace.ownerId)
                  ?.displayName ?? "—")}
          </span>
        </div>

        {/* Created */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Created</span>
          </div>
          <span className="text-xs text-foreground">{createdAt}</span>
        </div>

        {/* Your session */}
        <div className="mt-2 pt-3 border-t border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Your Session
          </p>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                {user?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.displayName ?? user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <RolePill role="admin" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const {
    workspace,
    members,
    myRole,
    user,
    generateNewInviteToken,
    updateMemberRole,
    removeMember,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<MemberRole>("guest");
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const token = await generateNewInviteToken();
      setGeneratedLink(
        `${window.location.origin}/invite/${token}?role=${selectedRole}`,
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRoleChange = async (uid: string, role: MemberRole) => {
    setUpdatingRole(uid);
    try {
      await updateMemberRole(uid, role);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemove = async (uid: string, name: string) => {
    if (!confirm(`Remove ${name} from the workspace?`)) return;
    setRemoving(uid);
    try {
      await removeMember(uid);
    } finally {
      setRemoving(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/logged-out");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))]" />
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="font-bold text-foreground">
                    Invite to workspace
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pick a role then generate the link
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setGeneratedLink("");
                    setCopied(false);
                  }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Select Role
                  </p>
                  <div className="space-y-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => {
                          setSelectedRole(r.value);
                          setGeneratedLink("");
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedRole === r.value ? `${r.bg} ring-2 ring-offset-1 ring-offset-card ${r.color.replace("text-", "ring-")}` : "border-border hover:bg-muted"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.bg}`}
                        >
                          <r.icon className={`w-4 h-4 ${r.color}`} />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${selectedRole === r.value ? r.color : "text-foreground"}`}
                          >
                            {r.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.desc}
                          </p>
                        </div>
                        {selectedRole === r.value && (
                          <Check className={`w-4 h-4 ml-auto ${r.color}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {!generatedLink && (
                  <button
                    onClick={handleGenerateLink}
                    disabled={generating}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Generate Invite Link
                  </button>
                )}
                {generatedLink && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Your invite link
                    </p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={generatedLink}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-mono text-muted-foreground focus:outline-none cursor-text"
                      />
                      <button
                        onClick={copyLink}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${copied ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "gradient-primary text-primary-foreground"}`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Anyone with this link joins as{" "}
                      <RolePill role={selectedRole} />. Link expires when you
                      regenerate it.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your workspace, members, and preferences.
        </p>
      </div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-5 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <Palette className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Appearance</h3>
              <p className="text-xs text-muted-foreground">
                Toggle light and dark mode
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </motion.div>

      {/* Members — admin only */}
      {myRole === "admin" && workspace && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl overflow-hidden shadow-soft"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-muted">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Members</h3>
                <p className="text-xs text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""} in{" "}
                  <strong>{workspace.name}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90"
            >
              <Link2 className="w-3.5 h-3.5" />
              Invite Member
            </button>
          </div>
          <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex items-center gap-4 flex-wrap">
            {ROLES.map((r) => (
              <div
                key={r.value}
                className={`flex items-center gap-1.5 text-[11px] ${r.color}`}
              >
                <r.icon className="w-3 h-3" />
                <span>
                  {r.label} — {r.desc}
                </span>
              </div>
            ))}
          </div>
          <div className="divide-y divide-border">
            {members.map((member) => {
              const isMe = member.uid === user?.uid;
              const isWsOwner = member.uid === workspace.ownerId;
              const name = member.displayName || member.email || "Unknown";
              return (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <Avatar name={name} photo={member.photoURL} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">
                        {name}
                      </p>
                      {isMe && (
                        <span className="text-[10px] text-muted-foreground">
                          (you)
                        </span>
                      )}
                      {isWsOwner && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold uppercase">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                    {member.joinedAt && (
                      <p className="text-[10px] text-muted-foreground/60">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {!isWsOwner ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.uid,
                              e.target.value as MemberRole,
                            )
                          }
                          disabled={!!updatingRole || isMe}
                          className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer disabled:opacity-50"
                        >
                          <option value="admin">Admin</option>
                          <option value="vip">VIP</option>
                          <option value="guest">Guest</option>
                        </select>
                        {updatingRole === member.uid ? (
                          <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground pointer-events-none" />
                        ) : (
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        )}
                      </div>
                      {!isMe && (
                        <button
                          onClick={() => handleRemove(member.uid, name)}
                          disabled={!!removing}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          {removing === member.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <RolePill role="admin" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {myRole !== "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              {myRole === "vip" ? (
                <Star className="w-5 h-5 text-amber-500" />
              ) : (
                <UserIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Your Role: {myRole === "vip" ? "VIP" : "Guest"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {myRole === "vip"
                  ? "Access to everything except Leads CRM, Scrapers, and Campaigns."
                  : "Access to Content Studio only."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {myRole === "admin" && (
        <NotificationsPanel workspaceId={workspace?.id ?? ""} />
      )}

      {/* Workspace Session — replaces old "Data & Integrations" placeholder */}
      <WorkspaceSessionCard />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
