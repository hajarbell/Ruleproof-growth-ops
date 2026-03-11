import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit2,
  Eye,
  Repeat2,
  TrendingUp,
  Users,
  ExternalLink,
  Check,
  Loader2,
  BarChart2,
  ChevronUp,
  ChevronDown,
  Upload,
  Link2,
  Calendar,
  ArrowUpDown,
  Flame,
  Pencil,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
  url?: string;
  reactions: number;
  comments: number;
  reposts: number;
  impressions: number;
  saves?: number;
  date: string;
  reactionTypes?: ReactionTypes;
}

interface ReactionTypes {
  like?: number;
  celebrate?: number;
  support?: number;
  love?: number;
  insightful?: number;
  funny?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
];

const REACTION_EMOJIS: Record<string, string> = {
  like: "👍",
  celebrate: "🎉",
  support: "🤝",
  love: "❤️",
  insightful: "💡",
  funny: "😄",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmtNum(n: number): string {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Color Picker with pastels ────────────────────────────────────────────────
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => onChange("")}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${value === "" ? "border-foreground scale-110" : "border-border"}`}
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
      {BASE_COLORS.map((c) => {
        const p1 = c + "88";
        const p2 = c + "44";
        return (
          <div key={c} className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => onChange(c)}
              style={{ background: c }}
              className={`w-8 h-8 rounded-full transition-all ${value === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "opacity-80 hover:opacity-100"}`}
            />
            <button
              onClick={() => onChange(p1)}
              style={{ background: p1, border: `2px solid ${c}55` }}
              className={`w-5 h-5 rounded-full transition-all ${value === p1 ? "ring-2 ring-offset-1 ring-offset-card scale-110" : "opacity-80 hover:opacity-100"}`}
            />
            <button
              onClick={() => onChange(p2)}
              style={{ background: p2, border: `2px solid ${c}33` }}
              className={`w-4 h-4 rounded-full transition-all ${value === p2 ? "ring-2 ring-offset-1 ring-offset-card scale-110" : "opacity-70 hover:opacity-100"}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Connect / Edit Account Modal ─────────────────────────────────────────────
function ConnectModal({
  onClose,
  onSave,
  existing,
}: {
  onClose: () => void;
  onSave: (acc: Omit<LinkedInAccount, "id" | "createdAt">) => Promise<void>;
  existing?: LinkedInAccount;
}) {
  const [saving, setSaving] = useState(false);
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
    existing?.avatarColor ?? BASE_COLORS[0],
  );
  const [avatarUrl, setAvatarUrl] = useState(existing?.avatarUrl ?? "");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        headline: headline.trim(),
        profileUrl: profileUrl.trim(),
        type,
        followers: parseInt(followers) || 0,
        followersGrowth: parseInt(followersGrowth) || 0,
        avatarUrl,
        avatarInitials: initials(name),
        avatarColor,
        posts: existing?.posts ?? [],
      });
      onClose();
    } catch {
      setError("Failed to save.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full gradient-primary" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">
            {existing ? "Edit Account" : "Connect Account"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <Field label="Profile Picture">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center border border-border">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    className="w-full h-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <span
                    className="text-lg font-bold"
                    style={{ color: avatarColor || "#888" }}
                  >
                    {initials(name || "?")}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Photo
                </button>
                {avatarUrl && (
                  <button
                    onClick={() => setAvatarUrl("")}
                    className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </Field>

          <Field label="Account Type">
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              {(["personal", "company"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${type === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  {t === "personal" ? "👤 Personal" : "🏢 Company"}
                </button>
              ))}
            </div>
          </Field>

          <Field label={type === "personal" ? "Full Name" : "Company Name"}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "personal" ? "Hajar Bellarbia" : "RuProof AI"
              }
              className={inputCls}
            />
          </Field>

          <Field label="Headline / Bio">
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Building RuProof AI | LinkedIn Growth for B2B"
              className={inputCls}
            />
          </Field>

          <Field label="LinkedIn Profile URL">
            <input
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Followers">
              <input
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="4820"
                className={inputCls}
              />
            </Field>
            <Field label="Growth this month">
              <input
                type="number"
                value={followersGrowth}
                onChange={(e) => setFollowersGrowth(e.target.value)}
                placeholder="120"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Avatar Color">
            <ColorPicker value={avatarColor} onChange={setAvatarColor} />
          </Field>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
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

// ─── Post Modal (Add or Edit) ─────────────────────────────────────────────────
function PostModal({
  onClose,
  onSave,
  existing,
}: {
  onClose: () => void;
  onSave: (post: LinkedInPost) => Promise<void>;
  existing?: LinkedInPost;
}) {
  const [tab, setTab] = useState<"manual" | "paste">(
    existing ? "manual" : "manual",
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [impressions, setImpressions] = useState(
    String(existing?.impressions ?? ""),
  );
  const [reactions, setReactions] = useState(String(existing?.reactions ?? ""));
  const [comments, setComments] = useState(String(existing?.comments ?? ""));
  const [reposts, setReposts] = useState(String(existing?.reposts ?? ""));
  const [saves, setSaves] = useState(String(existing?.saves ?? ""));
  const [date, setDate] = useState(existing?.date ?? "");
  const [reactionTypes, setReactionTypes] = useState<ReactionTypes>(
    existing?.reactionTypes ?? {},
  );
  const [pasteText, setPasteText] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [parsedPreview, setParsedPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const parsePaste = () => {
    const text = pasteText;
    const getNum = (key: string) => {
      const m = text.match(new RegExp(key + "[\\s\\n:]+([\\d,]+)"));
      return m ? parseInt(m[1].replace(/,/g, "")) : 0;
    };
    const dateM = text.match(/Post Date\s*([A-Za-z]+ \d+, \d{4})/);
    const urlM = text.match(/(https:\/\/www\.linkedin\.com\/feed\/[^\s\n]+)/);

    const imp = getNum("Impressions");
    const rea = getNum("Reactions");
    const com = getNum("Comments");
    const rep = getNum("Reposts");
    const sav = getNum("Saves");

    setImpressions(String(imp));
    setReactions(String(rea));
    setComments(String(com));
    setReposts(String(rep));
    setSaves(String(sav));
    if (dateM) setDate(dateM[1]);
    if (urlM) setUrl(urlM[1]);
    if (pasteTitle) setTitle(pasteTitle);

    setParsedPreview(
      `✅ ${fmtNum(imp)} impressions · ${fmtNum(rea)} reactions · ${fmtNum(com)} comments · ${fmtNum(rep)} reposts`,
    );
  };

  const handleSave = async () => {
    const finalTitle = title.trim() || pasteTitle.trim();
    if (!finalTitle) return;
    setSaving(true);
    await onSave({
      id: existing?.id ?? `post_${Date.now()}`,
      title: finalTitle,
      url: url || undefined,
      impressions: parseInt(impressions) || 0,
      reactions: parseInt(reactions) || 0,
      comments: parseInt(comments) || 0,
      reposts: parseInt(reposts) || 0,
      saves: parseInt(saves) || 0,
      date: date || new Date().toLocaleDateString(),
      reactionTypes:
        Object.keys(reactionTypes).length > 0 ? reactionTypes : undefined,
    });
    onClose();
  };

  const hasTitle = title.trim() || pasteTitle.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full gradient-primary" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">
            {existing ? "Edit Post" : "Log Post Analytics"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!existing && (
          <div className="flex gap-1 p-1.5 bg-muted mx-6 mt-4 rounded-xl">
            {(["manual", "paste"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t === "manual" ? "✏️ Manual Entry" : "📋 Paste from LinkedIn"}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {tab === "paste" && !existing ? (
            <>
              <Field label="Post Title (give it a name)">
                <input
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="e.g. AI Trends March 2026"
                  className={inputCls}
                />
              </Field>
              <Field label="Paste LinkedIn Analytics Text">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  placeholder={
                    "Post URL\nhttps://www.linkedin.com/feed/update/urn:li:share:...\nPost Date Mar 7, 2026\nImpressions 3,661\nReactions 265\nComments 217\nReposts 5\nSaves 14"
                  }
                  className={
                    inputCls + " resize-none font-mono text-xs leading-relaxed"
                  }
                />
              </Field>
              <button
                onClick={parsePaste}
                disabled={!pasteText.trim()}
                className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Parse & Fill
              </button>
              {parsedPreview && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                  {parsedPreview}
                  {url && (
                    <p className="mt-1.5 truncate">
                      <Link2 className="w-3 h-3 inline mr-1" />
                      {url}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <Field label="Post Title / Topic">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="5 AI Trends for Insurance Brokers"
                  className={inputCls}
                />
              </Field>
              <Field label="Post URL (optional)">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://linkedin.com/posts/..."
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="👁 Impressions">
                  <input
                    type="number"
                    value={impressions}
                    onChange={(e) => setImpressions(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
                <Field label="💬 Comments">
                  <input
                    type="number"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
                <Field label="🔁 Reposts">
                  <input
                    type="number"
                    value={reposts}
                    onChange={(e) => setReposts(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
                <Field label="🔖 Saves">
                  <input
                    type="number"
                    value={saves}
                    onChange={(e) => setSaves(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Reactions (optional — only filled ones show)">
                <div className="flex flex-wrap gap-2 mt-1">
                  {(
                    Object.keys(REACTION_EMOJIS) as (keyof ReactionTypes)[]
                  ).map((k) => (
                    <div
                      key={k}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/50 border border-border"
                    >
                      <span className="text-base">{REACTION_EMOJIS[k]}</span>
                      <input
                        type="number"
                        value={(reactionTypes[k] as number) || ""}
                        onChange={(e) =>
                          setReactionTypes((prev) => ({
                            ...prev,
                            [k]: parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                        className="w-12 text-xs bg-transparent border-none outline-none text-foreground"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Leave blank — only filled reactions appear on the post card
                </p>
              </Field>

              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasTitle}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {existing ? "Save Changes" : "Add Post"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Post Detail Card ─────────────────────────────────────────────────────────
function PostDetailCard({
  post,
  onClose,
  onEdit,
}: {
  post: LinkedInPost;
  onClose: () => void;
  onEdit: () => void;
}) {
  const filledReactions = post.reactionTypes
    ? Object.entries(post.reactionTypes).filter(
        ([, v]) => v && (v as number) > 0,
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full gradient-primary" />
        <div className="flex items-start justify-between px-5 py-4 border-b border-border gap-3">
          <h3 className="font-bold text-sm text-foreground line-clamp-2 flex-1">
            {post.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                label: "Impressions",
                value: fmtNum(post.impressions),
                icon: "👁",
                primary: true,
              },
              { label: "Comments", value: fmtNum(post.comments), icon: "💬" },
              { label: "Reposts", value: fmtNum(post.reposts), icon: "🔁" },
              { label: "Saves", value: fmtNum(post.saves ?? 0), icon: "🔖" },
            ].map(({ label, value, icon, primary }) => (
              <div
                key={label}
                className={`p-3 rounded-xl border ${primary ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
              >
                <p className="text-xs text-muted-foreground mb-0.5">
                  {icon} {label}
                </p>
                <p
                  className={`text-2xl font-bold tracking-tight ${primary ? "text-primary" : "text-foreground"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          {filledReactions.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Reactions</p>
              <div className="flex flex-wrap gap-2">
                {filledReactions.map(([k, v]) => (
                  <span
                    key={k}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-sm"
                  >
                    {REACTION_EMOJIS[k]}{" "}
                    <span className="font-semibold text-foreground">
                      {fmtNum(v as number)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {post.date}
            </span>
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Link2 className="w-3 h-3" /> View post
              </a>
            )}
          </div>
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
  isSelected,
  onSelect,
}: {
  account: LinkedInAccount;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const topPost =
    account.posts.length > 0
      ? account.posts.reduce((b, p) => (p.impressions > b.impressions ? p : b))
      : null;
  const avgImpressions =
    account.posts.length > 0
      ? Math.round(
          account.posts.reduce((s, p) => s + p.impressions, 0) /
            account.posts.length,
        )
      : 0;

  // Best posting times from post dates
  const postingTimeData = (() => {
    if (account.posts.length < 2) return [];
    const byHour: Record<string, number[]> = {};
    account.posts.forEach((p) => {
      const d = new Date(p.date);
      const hour = !isNaN(d.getTime()) ? `${d.getHours()}:00` : null;
      if (!hour) return;
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(p.impressions);
    });
    return Object.entries(byHour)
      .map(([h, vals]) => ({
        hour: h,
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl shadow-soft overflow-hidden transition-all border-2 ${isSelected ? "border-primary" : "border-transparent hover:border-border"}`}
    >
      <div className="p-5 cursor-pointer" onClick={onSelect}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.name}
                className="w-12 h-12 rounded-2xl object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: account.avatarColor || "#6366f1" }}
              >
                {account.avatarInitials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground">{account.name}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                    account.type === "personal"
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "bg-sky-500/10 text-sky-400"
                  }`}
                >
                  {account.type}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {account.headline}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-0.5 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {account.profileUrl && (
              <a
                href={account.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {[
            {
              val: fmtNum(account.followers),
              label: "Followers",
              icon: <Users className="w-3 h-3" />,
            },
            {
              val:
                account.followersGrowth >= 0
                  ? `+${fmtNum(account.followersGrowth)}`
                  : fmtNum(account.followersGrowth),
              label: "This month",
              icon: <TrendingUp className="w-3 h-3" />,
              green: account.followersGrowth > 0,
            },
            {
              val: avgImpressions > 0 ? fmtNum(avgImpressions) : "–",
              label: "Avg impressions",
              icon: <Eye className="w-3 h-3" />,
            },
          ].map(({ val, label, icon, green }) => (
            <div key={label} className="p-3 rounded-xl bg-muted/50 text-center">
              <p
                className={`text-xl font-bold ${green ? "text-emerald-500" : "text-foreground"}`}
              >
                {val}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                {icon}
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Top post */}
        {topPost ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
            <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <span className="text-foreground font-medium truncate flex-1">
              {topPost.title}
            </span>
            <span className="font-bold text-primary flex-shrink-0">
              {fmtNum(topPost.impressions)}
            </span>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-muted/30 border border-dashed border-border/50 text-xs text-muted-foreground">
            No posts yet — add analytics below
          </div>
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border/50 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        {expanded ? "Hide insights" : "Show insights"}
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="p-5 space-y-5">
              {/* Best posting times */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Best Posting Times (by avg impressions)
                </p>
                {postingTimeData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add more posts with dates to see patterns
                  </p>
                ) : (
                  <div className="space-y-2">
                    {postingTimeData.map(({ hour, avg }, i) => {
                      const max = postingTimeData[0].avg;
                      return (
                        <div key={hour} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-14">
                            {hour}
                          </span>
                          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(avg / max) * 100}%` }}
                              transition={{ delay: i * 0.08, duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{
                                background:
                                  i === 0
                                    ? "linear-gradient(90deg,#1a6fff,#00b4ff)"
                                    : "hsl(var(--muted-foreground)/0.3)",
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-12 text-right">
                            {fmtNum(avg)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Geo */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Top Locations
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { city: "Lagos", pct: 34 },
                    { city: "London", pct: 22 },
                    { city: "New York", pct: 18 },
                  ].map(({ city, pct }) => (
                    <div
                      key={city}
                      className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center"
                    >
                      <div className="text-lg font-bold text-foreground">
                        {pct}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {city}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  Update via LinkedIn export data
                </p>
              </div>

              {/* Top titles */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Top Audience Titles
                </p>
                {[
                  { title: "Founder", pct: 42 },
                  { title: "CEO", pct: 28 },
                  { title: "Marketing Director", pct: 18 },
                ].map(({ title, pct }) => (
                  <div key={title} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-muted-foreground w-36 truncate">
                      {title}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-full rounded-full bg-foreground/25"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  Update via LinkedIn export data
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Impressions Chart ────────────────────────────────────────────────────────
function ImpressionsChart({ posts }: { posts: LinkedInPost[] }) {
  const [period, setPeriod] = useState<"all" | "30d" | "90d">("all");
  const [showEngagement, setShowEngagement] = useState(false);

  const data = posts
    .filter((p) => {
      if (period === "all") return true;
      const d = new Date(p.date);
      const ms = period === "30d" ? 30 : 90;
      return !isNaN(d.getTime()) && Date.now() - d.getTime() < ms * 86400000;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => ({
      name: p.title.length > 18 ? p.title.slice(0, 18) + "…" : p.title,
      impressions: p.impressions,
      engagement: p.reactions + p.comments + p.reposts,
    }));

  return (
    <div className="glass rounded-2xl p-5 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-foreground text-sm">
            Impressions Over Time
          </h3>
          <p className="text-xs text-muted-foreground">
            Track how your posts perform
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEngagement(!showEngagement)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showEngagement ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {showEngagement ? "✓" : "+"} Engagement
          </button>
          {(["30d", "90d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {p === "all" ? "All time" : p}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtNum}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [
              fmtNum(v),
              name === "impressions" ? "Impressions" : "Engagement",
            ]}
          />
          <Line
            type="monotone"
            dataKey="impressions"
            stroke="#1a6fff"
            strokeWidth={2.5}
            dot={{ fill: "#1a6fff", r: 3 }}
            activeDot={{ r: 5 }}
            name="impressions"
          />
          {showEngagement && (
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 3 }}
              activeDot={{ r: 4 }}
              name="engagement"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Posts Table ──────────────────────────────────────────────────────────────
type SortKey = "impressions" | "reactions" | "comments" | "reposts" | "date";

function PostsTable({
  account,
  onAddPost,
  onUpdatePost,
}: {
  account: LinkedInAccount;
  onAddPost: () => void;
  onUpdatePost: (post: LinkedInPost) => Promise<void>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("impressions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewPost, setViewPost] = useState<LinkedInPost | null>(null);
  const [editPost, setEditPost] = useState<LinkedInPost | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...account.posts].sort((a, b) => {
    const av =
      sortKey === "date"
        ? new Date(a.date).getTime()
        : ((a as any)[sortKey] ?? 0);
    const bv =
      sortKey === "date"
        ? new Date(b.date).getTime()
        : ((b as any)[sortKey] ?? 0);
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const SortBtn = ({ k, label }: { k: SortKey; label: React.ReactNode }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 hover:text-foreground transition-colors group whitespace-nowrap"
    >
      {label}
      {sortKey === k ? (
        sortDir === "desc" ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      )}
    </button>
  );

  return (
    <>
      <div className="glass rounded-2xl shadow-soft overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                className="w-8 h-8 rounded-xl object-cover"
                alt=""
              />
            ) : (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ background: account.avatarColor || "#6366f1" }}
              >
                {account.avatarInitials}
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-foreground">
                {account.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Post Analytics · {account.posts.length} posts
              </p>
            </div>
          </div>
          <button
            onClick={onAddPost}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Post
          </button>
        </div>

        {account.posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No posts yet — add your first post analytics above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Post
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <SortBtn
                      k="impressions"
                      label={
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Impr.
                        </span>
                      }
                    />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    <SortBtn k="reactions" label="👍" />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    <SortBtn k="comments" label="💬" />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    <SortBtn k="reposts" label="🔁" />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    <SortBtn
                      k="date"
                      label={<Calendar className="w-3 h-3" />}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((post, i) => {
                  const isTop =
                    i === 0 && sortKey === "impressions" && sortDir === "desc";
                  return (
                    <tr
                      key={post.id}
                      onClick={() => setViewPost(post)}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          )}
                          <span className="font-medium text-foreground line-clamp-1 max-w-[180px]">
                            {post.title}
                          </span>
                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0 text-muted-foreground hover:text-primary"
                            >
                              <Link2 className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-primary">
                        {fmtNum(post.impressions)}
                      </td>
                      <td className="px-3 py-3.5 text-center text-muted-foreground">
                        {fmtNum(post.reactions)}
                      </td>
                      <td className="px-3 py-3.5 text-center text-muted-foreground">
                        {fmtNum(post.comments)}
                      </td>
                      <td className="px-3 py-3.5 text-center text-muted-foreground">
                        {fmtNum(post.reposts)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-xs text-muted-foreground">
                        {post.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewPost && (
          <PostDetailCard
            post={viewPost}
            onClose={() => setViewPost(null)}
            onEdit={() => {
              setEditPost(viewPost);
              setViewPost(null);
            }}
          />
        )}
        {editPost && (
          <PostModal
            existing={editPost}
            onClose={() => setEditPost(null)}
            onSave={async (updated) => {
              await onUpdatePost(updated);
              setEditPost(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
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
      // migrate old "views"/"likes" fields to new schema
      const migrated = data.map((acc) => ({
        ...acc,
        posts: (acc.posts || []).map((p: any) => ({
          ...p,
          impressions: p.impressions ?? p.views ?? 0,
          reactions: p.reactions ?? p.likes ?? 0,
        })),
      }));
      setAccounts(migrated);
      if (migrated.length > 0) setSelectedAccountId(migrated[0].id);
      setLoading(false);
    });
  }, [workspace?.id]);

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? null;

  const handleSaveAccount = async (
    acc: Omit<LinkedInAccount, "id" | "createdAt">,
  ) => {
    if (!colRef || !workspace) return;
    if (editingAccount) {
      await updateDoc(
        doc(
          db,
          "workspaces",
          workspace.id,
          "linkedinAccounts",
          editingAccount.id,
        ),
        { ...acc },
      );
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingAccount.id ? { ...a, ...acc } : a)),
      );
    } else {
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

  const handleDelete = async (id: string) => {
    if (!workspace) return;
    await deleteDoc(
      doc(db, "workspaces", workspace.id, "linkedinAccounts", id),
    );
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (selectedAccountId === id)
      setSelectedAccountId(accounts.find((a) => a.id !== id)?.id ?? null);
  };

  const handleAddPost = async (post: LinkedInPost) => {
    if (!selectedAccount || !workspace) return;
    const updated = [...(selectedAccount.posts ?? []), post];
    await updateDoc(
      doc(
        db,
        "workspaces",
        workspace.id,
        "linkedinAccounts",
        selectedAccount.id,
      ),
      { posts: updated },
    );
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === selectedAccount.id ? { ...a, posts: updated } : a,
      ),
    );
  };

  const handleUpdatePost = async (post: LinkedInPost) => {
    if (!selectedAccount || !workspace) return;
    const updated = selectedAccount.posts.map((p) =>
      p.id === post.id ? post : p,
    );
    await updateDoc(
      doc(
        db,
        "workspaces",
        workspace.id,
        "linkedinAccounts",
        selectedAccount.id,
      ),
      { posts: updated },
    );
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === selectedAccount.id ? { ...a, posts: updated } : a,
      ),
    );
  };

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalGrowth = accounts.reduce((s, a) => s + a.followersGrowth, 0);
  const allPosts = accounts.flatMap((a) => a.posts);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            LinkedIn
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage accounts, track growth, and publish content.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            setShowConnect(true);
          }}
          className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-soft hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Connect Account
        </button>
      </div>

      {/* Aggregate stats */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Followers",
              value: fmtNum(totalFollowers),
              icon: Users,
              sub: `${accounts.length} account${accounts.length > 1 ? "s" : ""}`,
            },
            {
              label: "Growth This Month",
              value: `+${fmtNum(totalGrowth)}`,
              icon: TrendingUp,
              green: true,
              sub: "new followers",
            },
            {
              label: "Posts Tracked",
              value: String(allPosts.length),
              icon: BarChart2,
              sub: "with analytics",
            },
          ].map(({ label, value, icon: Icon, sub, green }) => (
            <div
              key={label}
              className="glass rounded-2xl p-5 shadow-soft border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {label}
                </p>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p
                className={`text-3xl font-bold tracking-tight ${green ? "text-emerald-500" : "text-foreground"}`}
              >
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-16 text-center shadow-soft border border-dashed border-border"
        >
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No accounts yet
          </h3>
          <p className="text-muted-foreground mb-5 max-w-sm mx-auto text-sm">
            Add your LinkedIn accounts to track growth and analytics.
          </p>
          <button
            onClick={() => setShowConnect(true)}
            className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
          >
            + Connect Your First Account
          </button>
        </motion.div>
      )}

      {/* Account cards grid */}
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
            />
          ))}
        </div>
      )}

      {/* Chart */}
      {selectedAccount && selectedAccount.posts.length > 1 && (
        <ImpressionsChart posts={selectedAccount.posts} />
      )}

      {/* Posts table */}
      {selectedAccount && (
        <PostsTable
          account={selectedAccount}
          onAddPost={() => setShowAddPost(true)}
          onUpdatePost={handleUpdatePost}
        />
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
          <PostModal
            onClose={() => setShowAddPost(false)}
            onSave={handleAddPost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
