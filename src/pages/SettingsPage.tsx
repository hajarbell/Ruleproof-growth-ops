import { useState, useEffect } from "react";
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
  deleteDoc,
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

// ─── Helpers (mirrored from TopBar) ──────────────────────────────────────────
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

// ─── Notifications Panel ──────────────────────────────────────────────────────
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
      {/* Header */}
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

      {/* List */}
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
          {notifications.map((n, idx) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-5 py-3.5 border-b border-border/40 last:border-0 transition-colors ${!n.read ? "bg-muted/15" : ""}`}
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

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<MemberRole>("guest");
  const [generatedLink, setGeneratedLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Member management
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
    navigate("/login");
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
                {/* Role picker */}
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
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selectedRole === r.value
                            ? `${r.bg} ring-2 ring-offset-1 ring-offset-card ${r.color.replace("text-", "ring-")}`
                            : "border-border hover:bg-muted"
                        }`}
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

                {/* Generate button */}
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

                {/* Generated link */}
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

          {/* Role legend */}
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

          {/* Members list */}
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

      {/* Non-admin role info */}
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

      {/* Notifications panel — admin only */}
      {myRole === "admin" && (
        <NotificationsPanel workspaceId={workspace?.id ?? ""} />
      )}

      {/* Data & Integrations placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="glass rounded-xl p-5 shadow-soft hover:border-primary/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-muted">
            <Database className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Data &amp; Integrations
            </h3>
            <p className="text-xs text-muted-foreground">
              Connected accounts, API keys, exports
            </p>
          </div>
        </div>
      </motion.div>

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
