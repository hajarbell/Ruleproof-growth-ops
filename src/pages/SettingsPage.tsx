import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, MemberRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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

function RoleIcon({ role }: { role: string }) {
  if (role === "admin") return <Shield className="w-3.5 h-3.5 text-primary" />;
  if (role === "vip") return <Star className="w-3.5 h-3.5 text-amber-500" />;
  return <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />;
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

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState(
    workspace
      ? `${window.location.origin}/invite/${workspace.inviteToken}`
      : "",
  );
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const t = await generateNewInviteToken();
      setInviteLink(`${window.location.origin}/invite/${t}`);
    } finally {
      setRegenerating(false);
    }
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

  const isOwner = workspace?.ownerId === user?.uid;

  return (
    <div className="space-y-6 max-w-3xl">
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

      {/* Members & Invite — admin only */}
      {myRole === "admin" && workspace && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl overflow-hidden shadow-soft"
        >
          {/* Header */}
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
          </div>

          {/* Invite link */}
          <div className="px-5 py-4 bg-primary/5 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-foreground">
                Invite Link
              </p>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 px-3 py-2 rounded-xl bg-muted/80 border border-border text-xs text-muted-foreground font-mono focus:outline-none cursor-text"
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
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                title="Regenerate (invalidates old link)"
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
              >
                {regenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              New members join as <strong>Guest</strong> by default. You can
              change their role below. Regenerating invalidates the old link.
            </p>
          </div>

          {/* Role legend */}
          <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-4 flex-wrap">
            {[
              {
                role: "admin",
                label: "Admin — full access",
                icon: Shield,
                color: "text-primary",
              },
              {
                role: "vip",
                label: "VIP — no Leads/Scrapers/Campaigns",
                icon: Star,
                color: "text-amber-500",
              },
              {
                role: "guest",
                label: "Guest — Content Studio only",
                icon: UserIcon,
                color: "text-muted-foreground",
              },
            ].map(({ role, label, icon: Icon, color }) => (
              <div
                key={role}
                className={`flex items-center gap-1.5 text-[11px] ${color}`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
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

                  {/* Role — can't change owner */}
                  {!isWsOwner ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <RoleIcon role={member.role} />
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.uid,
                              e.target.value as MemberRole,
                            )
                          }
                          disabled={!!updatingRole || isMe}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        >
                          <option value="admin">Admin</option>
                          <option value="vip">VIP</option>
                          <option value="guest">Guest</option>
                        </select>
                      </div>
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
                          className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-default"
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
                          title="Remove member"
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      Admin
                    </span>
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
                  ? "You have access to everything except Leads CRM, Scrapers, and Campaigns."
                  : "You have access to Content Studio only."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Other settings */}
      {[
        {
          title: "Notifications",
          description: "Email and in-app notification preferences",
          icon: Bell,
        },
        {
          title: "Data & Integrations",
          description: "Connected accounts, API keys, exports",
          icon: Database,
        },
      ].map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.04 }}
          className="glass rounded-xl p-5 shadow-soft hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <s.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{s.title}</h3>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Sign out */}
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
