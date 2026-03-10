import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit2,
  Save,
  Eye,
  Heart,
  Repeat2,
  MessageSquare,
  TrendingUp,
  Users,
  ExternalLink,
  ChevronDown,
  Check,
  Loader2,
  BarChart2,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LinkedInAccount {
  id: string;
  name: string;
  headline: string;
  avatarUrl: string;
  avatarInitials: string;
  avatarColor: string;
  type: "personal" | "company";
  followers: number;
  followersGrowth: number;
  profileUrl: string;
  posts: LinkedInPost[];
  createdAt: unknown;
}

export interface LinkedInPost {
  id: string;
  title: string;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  date: string;
}

const AVATAR_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Connect Account Modal ────────────────────────────────────────────────────
function ConnectModal({
  onClose,
  onSave,
  existing,
}: {
  onClose: () => void;
  onSave: (acc: Omit<LinkedInAccount, "id" | "createdAt">) => Promise<void>;
  existing?: LinkedInAccount;
}) {
  const [step, setStep] = useState<"form" | "saving">("form");
  const [name, setName] = useState(existing?.name ?? "");
  const [headline, setHeadline] = useState(existing?.headline ?? "");
  const [profileUrl, setProfileUrl] = useState(existing?.profileUrl ?? "");
  const [type, setType] = useState<"personal" | "company">(
    existing?.type ?? "personal",
  );
  const [followers, setFollowers] = useState(String(existing?.followers ?? ""));
  const [followersGrowth, setFollowersGrowth] = useState(
    String(existing?.followersGrowth ?? ""),
  );
  const [avatarColor, setAvatarColor] = useState(
    existing?.avatarColor ?? AVATAR_COLORS[0],
  );
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setStep("saving");
    try {
      await onSave({
        name: name.trim(),
        headline: headline.trim(),
        profileUrl: profileUrl.trim(),
        type,
        followers: parseInt(followers) || 0,
        followersGrowth: parseInt(followersGrowth) || 0,
        avatarUrl: "",
        avatarInitials: initials(name),
        avatarColor,
        posts: existing?.posts ?? [],
      });
      onClose();
    } catch {
      setError("Failed to save. Try again.");
      setStep("form");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              {existing ? "Edit Account" : "Connect LinkedIn Account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fill in your profile details — stats can be updated anytime
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Account type */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Account Type
            </label>
            <div className="flex gap-3">
              {(["personal", "company"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all capitalize ${
                    type === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {t === "personal" ? "👤 Personal" : "🏢 Company"}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {type === "personal" ? "Full Name" : "Company Name"}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "personal" ? "Hajar Bellarbia" : "RuProof AI"
              }
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Headline / Bio
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Building RuProof AI | LinkedIn Growth for B2B Founders"
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Profile URL */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              LinkedIn Profile URL
            </label>
            <input
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Followers
              </label>
              <input
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="4820"
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Growth this month
              </label>
              <input
                type="number"
                value={followersGrowth}
                onChange={(e) => setFollowersGrowth(e.target.value)}
                placeholder="+120"
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Avatar color */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Avatar Color
            </label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-full transition-all ${avatarColor === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={step === "saving"}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {step === "saving" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {existing ? "Save Changes" : "Add Account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Post Modal ───────────────────────────────────────────────────────────
function AddPostModal({
  accountId,
  onClose,
  onSave,
}: {
  accountId: string;
  onClose: () => void;
  onSave: (post: LinkedInPost) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [reposts, setReposts] = useState("");
  const [views, setViews] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      id: `post_${Date.now()}`,
      title: title.trim(),
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      reposts: parseInt(reposts) || 0,
      views: parseInt(views) || 0,
      date: date || new Date().toLocaleDateString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-bold font-display text-foreground">
            Add Post Analytics
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Post Title / Topic
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="5 AI Trends for Insurance"
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "👍 Likes", val: likes, set: setLikes },
              { label: "💬 Comments", val: comments, set: setComments },
              { label: "🔁 Reposts", val: reposts, set: setReposts },
              { label: "👁 Views", val: views, set: setViews },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  {label}
                </label>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Post
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({
  account,
  onEdit,
  onDelete,
  onAddPost,
  isSelected,
  onSelect,
}: {
  account: LinkedInAccount;
  onEdit: () => void;
  onDelete: () => void;
  onAddPost: () => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const topPost = account.posts.reduce(
    (best, p) => (p.views > (best?.views ?? 0) ? p : best),
    account.posts[0] ?? null,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={`glass rounded-2xl p-6 shadow-soft cursor-pointer transition-all border-2 ${
        isSelected ? "border-primary" : "border-transparent hover:border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{ background: account.avatarColor }}
          >
            {account.avatarInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground leading-tight">
                {account.name}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  account.type === "personal"
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "bg-sky-500/10 text-sky-400"
                }`}
              >
                {account.type}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug max-w-xs">
              {account.headline}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {account.profileUrl && (
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-bold text-foreground">
            {account.followers.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> Followers
          </p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-bold text-success">
            {account.followersGrowth > 0 ? "+" : ""}
            {account.followersGrowth}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> This month
          </p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-bold text-foreground">
            {account.posts.length > 0
              ? Math.round(
                  account.posts.reduce((s, p) => s + p.views, 0) /
                    account.posts.length,
                ).toLocaleString()
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" /> Avg views
          </p>
        </div>
      </div>

      {/* Top post */}
      {topPost && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🏆</span>
          <span className="truncate">
            Top post:{" "}
            <span className="text-foreground font-medium">{topPost.title}</span>
          </span>
          <span className="ml-auto text-xs shrink-0">
            {topPost.views.toLocaleString()} views
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LinkedInPage() {
  const { workspace } = useAuth();
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LinkedInAccount | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [showAddPost, setShowAddPost] = useState(false);

  const colRef = workspace
    ? collection(db, "workspaces", workspace.id, "linkedinAccounts")
    : null;

  // Load accounts
  useEffect(() => {
    if (!colRef) {
      setLoading(false);
      return;
    }
    getDocs(colRef).then((snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LinkedInAccount[];
      setAccounts(data);
      if (data.length > 0) setSelectedAccountId(data[0].id);
      setLoading(false);
    });
  }, [workspace?.id]);

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? null;

  // Save new account
  const handleSaveAccount = async (
    acc: Omit<LinkedInAccount, "id" | "createdAt">,
  ) => {
    if (!colRef) return;
    if (editingAccount) {
      // Update
      const ref = doc(
        db,
        "workspaces",
        workspace!.id,
        "linkedinAccounts",
        editingAccount.id,
      );
      await updateDoc(ref, { ...acc });
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingAccount.id ? { ...a, ...acc } : a)),
      );
    } else {
      // Create
      const docRef = await addDoc(colRef, {
        ...acc,
        createdAt: serverTimestamp(),
      });
      const newAcc: LinkedInAccount = {
        id: docRef.id,
        ...acc,
        createdAt: null,
      };
      setAccounts((prev) => [...prev, newAcc]);
      setSelectedAccountId(docRef.id);
    }
    setEditingAccount(null);
  };

  // Delete account
  const handleDelete = async (id: string) => {
    if (!workspace) return;
    await deleteDoc(
      doc(db, "workspaces", workspace.id, "linkedinAccounts", id),
    );
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (selectedAccountId === id)
      setSelectedAccountId(accounts.find((a) => a.id !== id)?.id ?? null);
  };

  // Add post to account
  const handleAddPost = async (post: LinkedInPost) => {
    if (!selectedAccount || !workspace) return;
    const updated = [...(selectedAccount.posts ?? []), post];
    const ref = doc(
      db,
      "workspaces",
      workspace.id,
      "linkedinAccounts",
      selectedAccount.id,
    );
    await updateDoc(ref, { posts: updated });
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === selectedAccount.id ? { ...a, posts: updated } : a,
      ),
    );
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">
            LinkedIn
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Manage accounts, track growth, and publish content.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            setShowConnect(true);
          }}
          className="gradient-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-soft hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Connect Account
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && accounts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-16 text-center shadow-soft"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground mb-2">
            No accounts yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Add your LinkedIn accounts to track growth, manage posts, and
            publish content from Content Studio.
          </p>
          <button
            onClick={() => setShowConnect(true)}
            className="gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Connect Your First Account
          </button>
        </motion.div>
      )}

      {/* Account cards */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              isSelected={selectedAccountId === acc.id}
              onSelect={() => setSelectedAccountId(acc.id)}
              onEdit={() => {
                setEditingAccount(acc);
                setShowConnect(true);
              }}
              onDelete={() => handleDelete(acc.id)}
              onAddPost={() => {
                setSelectedAccountId(acc.id);
                setShowAddPost(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Selected account posts table */}
      {selectedAccount && (
        <motion.div
          key={selectedAccount.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl shadow-soft overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ background: selectedAccount.avatarColor }}
              >
                {selectedAccount.avatarInitials}
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  {selectedAccount.name}
                </h3>
                <p className="text-xs text-muted-foreground">Post Analytics</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddPost(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Post
            </button>
          </div>

          {selectedAccount.posts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">
                No posts yet — add your first post analytics above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-muted/30">
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      <Heart className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      <MessageSquare className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      <Repeat2 className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      <Eye className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...selectedAccount.posts]
                    .sort((a, b) => b.views - a.views)
                    .map((post) => (
                      <tr
                        key={post.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-foreground">
                          {post.title}
                        </td>
                        <td className="px-4 py-4 text-center text-muted-foreground">
                          {post.likes.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center text-muted-foreground">
                          {post.comments.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center text-muted-foreground">
                          {post.reposts.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-foreground">
                          {post.views.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {post.date}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showConnect && (
          <ConnectModal
            onClose={() => {
              setShowConnect(false);
              setEditingAccount(null);
            }}
            onSave={handleSaveAccount}
            existing={editingAccount ?? undefined}
          />
        )}
        {showAddPost && selectedAccount && (
          <AddPostModal
            accountId={selectedAccount.id}
            onClose={() => setShowAddPost(false)}
            onSave={handleAddPost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
