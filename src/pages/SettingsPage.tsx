import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Bell,
  Database,
  Palette,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Shield,
  UserX,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, MemberRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

function MemberAvatar({ name, photo }: { name: string; photo?: string }) {
  const initials = name
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
      {initials}
    </div>
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

  const [inviteLink, setInviteLink] = useState(
    workspace
      ? `${window.location.origin}/invite/${workspace.inviteToken}`
      : "",
  );
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newToken = await generateNewInviteToken();
      setInviteLink(`${window.location.origin}/invite/${newToken}`);
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

  const handleRemove = async (uid: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    setRemovingMember(uid);
    try {
      await removeMember(uid);
    } finally {
      setRemovingMember(null);
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
          Configure your workspace and preferences.
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

      {/* Workspace info */}
      {workspace && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="glass rounded-xl p-5 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-muted">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Workspace</h3>
              <p className="text-xs text-muted-foreground">Your shared space</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              {workspace.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {workspace.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOwner ? "You are the owner" : `You are a ${myRole}`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Members & Invite — admin only */}
      {myRole === "admin" && workspace && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-xl overflow-hidden shadow-soft"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Members & Invites
              </h3>
              <p className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? "s" : ""} in this
                workspace
              </p>
            </div>
          </div>

          {/* Invite link */}
          <div className="px-5 py-4 border-b border-border bg-primary/5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Invite Link
            </p>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-muted/80 border border-border text-xs text-muted-foreground font-mono truncate select-all">
                {inviteLink}
              </div>
              <button
                onClick={copyInviteLink}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${copied ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "gradient-primary text-primary-foreground"}`}
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
                title="Generate new invite link"
                className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
              >
                {regenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Anyone with this link can join as a <strong>Guest</strong>.
              Regenerating the link will invalidate the old one.
            </p>
          </div>

          {/* Members list */}
          <div className="divide-y divide-border">
            {members.map((member) => {
              const isMe = member.uid === user?.uid;
              const isWsOwner = member.uid === workspace.ownerId;
              return (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <MemberAvatar
                    name={member.displayName || member.email}
                    photo={member.photoURL}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.displayName || member.email}
                        {isMe && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            (you)
                          </span>
                        )}
                      </p>
                      {isWsOwner && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold uppercase">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>

                  {/* Role selector — can't change owner or self */}
                  {!isWsOwner && !isMe && (
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
                          disabled={!!updatingRole}
                          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="guest">Guest</option>
                        </select>
                        {updatingRole === member.uid ? (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />
                        ) : (
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(member.uid)}
                        disabled={!!removingMember}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        {removingMember === member.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* My own role badge */}
                  {isMe && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${member.role === "admin" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
                    >
                      {member.role}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Guest — role info only */}
      {myRole === "guest" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-xl p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Your Role: Guest
              </h3>
              <p className="text-xs text-muted-foreground">
                You have access to LinkedIn, Content Studio, Ideas Lab, Files,
                and Dashboard.
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
      ].map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + i * 0.04 }}
          className="glass rounded-xl p-5 shadow-soft hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <section.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <p className="text-xs text-muted-foreground">
                {section.description}
              </p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </motion.div>
    </div>
  );
}
