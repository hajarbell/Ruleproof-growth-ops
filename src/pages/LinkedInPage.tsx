import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit2,
  Eye,
  MessageSquare,
  TrendingUp,
  Users,
  ExternalLink,
  Check,
  Loader2,
  Linkedin,
  BarChart2,
  Building2,
  User,
  ChevronUp,
  ChevronDown,
  Trash2,
  Upload,
  FileSpreadsheet,
  Link2,
  FileText,
  ChevronRight,
  Pencil,
  ArrowUpDown,
  Calendar,
  Flame,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

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
  linkedinId?: string;
  posts: LinkedInPost[];
  createdAt: unknown;
}

export interface LinkedInPost {
  id: string;
  title: string;
  content?: string;
  postUrl?: string;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  saves?: number;
  membersReached?: number;
  followersGained?: number;
  date: string;
  reactionIcon?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

const REACTION_ICONS = [
  { id: "none", label: "None", svg: "—" },
  { id: "fire", label: "Fire", svg: "🔥" },
  { id: "rocket", label: "Rocket", svg: "🚀" },
  { id: "chart", label: "Chart", svg: "📈" },
  { id: "bulb", label: "Idea", svg: "💡" },
  { id: "gem", label: "Gem", svg: "💎" },
  { id: "star", label: "Star", svg: "⭐" },
  { id: "zap", label: "Zap", svg: "⚡" },
  { id: "crown", label: "Crown", svg: "👑" },
  { id: "clap", label: "Clap", svg: "👏" },
  { id: "heart", label: "Heart", svg: "❤️" },
  { id: "muscle", label: "Strong", svg: "💪" },
  { id: "eyes", label: "Eyes", svg: "👀" },
  { id: "target", label: "Target", svg: "🎯" },
  { id: "trophy", label: "Trophy", svg: "🏆" },
  { id: "brain", label: "Brain", svg: "🧠" },
];

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
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring";

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;

function getLinkedInAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email w_member_social",
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
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
        title="None"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
      {AVATAR_COLORS.map((c) => {
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

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ posts, color }: { posts: LinkedInPost[]; color: string }) {
  if (posts.length < 2) return null;
  const sorted = [...posts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const vals = sorted.map((p) => p.views);
  const max = Math.max(...vals),
    min = Math.min(...vals),
    range = max - min || 1;
  const W = 120,
    H = 36,
    pad = 4;
  const points = vals
    .map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `${pad},${H - pad} ` + points + ` ${W - pad},${H - pad}`;
  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient
          id={`grad-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points.split(" ").at(-1)?.split(",")[0]}
        cy={points.split(" ").at(-1)?.split(",")[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}

// ─── Impressions chart ────────────────────────────────────────────────────────
function ImpressionsLineChart({
  posts,
  color,
}: {
  posts: LinkedInPost[];
  color: string;
}) {
  const [period, setPeriod] = useState<"all" | "30d" | "90d">("all");
  const [showEngagement, setShowEngagement] = useState(false);

  const filtered = posts
    .filter((p) => {
      if (period === "all") return true;
      const d = new Date(p.date);
      const days = period === "30d" ? 30 : 90;
      return (
        !isNaN(d.getTime()) && Date.now() - d.getTime() < days * 86_400_000
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => ({
      date: p.date.slice(5),
      views: p.views,
      engagement: p.likes + p.comments + p.reposts,
      title: p.title,
    }));

  if (!posts.length)
    return (
      <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
        No posts logged yet — click Log Post to start tracking
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          Track impressions over time
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEngagement(!showEngagement)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${showEngagement ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {showEngagement ? "✓" : "+"} Engagement
          </button>
          {(["30d", "90d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${period === p ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={filtered}
          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtNum}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-soft text-xs">
                  <p className="font-semibold text-foreground truncate max-w-[160px]">
                    {d.title}
                  </p>
                  <p className="text-muted-foreground">{d.date}</p>
                  <p style={{ color: "#1a6fff" }} className="font-bold">
                    {fmtNum(d.views)} impressions
                  </p>
                  {showEngagement && (
                    <p className="text-emerald-500 font-bold">
                      {fmtNum(d.engagement)} engagement
                    </p>
                  )}
                </div>
              );
            }}
          />
          {showEngagement && <Legend wrapperStyle={{ fontSize: 10 }} />}
          <Line
            type="monotone"
            dataKey="views"
            stroke="#1a6fff"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#1a6fff" }}
            activeDot={{ r: 5 }}
            name="Impressions"
          />
          {showEngagement && (
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
              activeDot={{ r: 4 }}
              name="Engagement"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Account Modal ────────────────────────────────────────────────────────────
function AccountModal({
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
    existing?.avatarColor ?? AVATAR_COLORS[0],
  );
  const [avatarUrl, setAvatarUrl] = useState(existing?.avatarUrl ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
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
      linkedinId: existing?.linkedinId ?? "",
      posts: existing?.posts ?? [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#0077b5] via-primary to-primary/40" />
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0077b5]/10 flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-[#0077b5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {existing ? "Edit Account" : "Add Account"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Profile details & stats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Profile picture */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Profile Picture
            </label>
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
          </div>

          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            {(["personal", "company"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "personal" ? (
                  <>
                    <User className="w-3.5 h-3.5" />
                    Personal
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5" />
                    Company Page
                  </>
                )}
              </button>
            ))}
          </div>

          {type === "company" && (
            <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
              💡 Company pages can't be connected via OAuth — fill in manually.
            </div>
          )}

          {[
            {
              label: "Name",
              val: name,
              set: setName,
              placeholder:
                type === "personal" ? "Hajar Bellarbia" : "RuProof AI",
            },
            {
              label: "Headline",
              val: headline,
              set: setHeadline,
              placeholder: "Building RuProof AI | LinkedIn Growth",
            },
            {
              label: "Profile URL",
              val: profileUrl,
              set: setProfileUrl,
              placeholder: "https://linkedin.com/in/yourname",
            },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {label}
              </label>
              <input
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className={inputCls}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Followers", val: followers, set: setFollowers },
              {
                label: "Growth this month",
                val: followersGrowth,
                set: setFollowersGrowth,
              },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {label}
                </label>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Avatar Color
            </label>
            <ColorPicker value={avatarColor} onChange={setAvatarColor} />
          </div>
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
            disabled={saving || !name.trim()}
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

// ─── Add Post Modal ───────────────────────────────────────────────────────────
function AddPostModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (posts: LinkedInPost[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState<LinkedInPost[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // manual fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [reposts, setReposts] = useState("");
  const [views, setViews] = useState("");
  const [saves, setSaves] = useState("");
  const [membersReached, setMembersReached] = useState("");
  const [followersGained, setFollowersGained] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reactionIcon, setReactionIcon] = useState("none");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const selectedReaction =
    REACTION_ICONS.find((r) => r.id === reactionIcon) ?? REACTION_ICONS[0];

  // import: per-post title editing
  const [importTitles, setImportTitles] = useState<Record<string, string>>({});

  const handleManualSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave([
      {
        id: `post_${Date.now()}`,
        title: title.trim(),
        content,
        postUrl,
        likes: parseInt(likes) || 0,
        comments: parseInt(comments) || 0,
        reposts: parseInt(reposts) || 0,
        views: parseInt(views) || 0,
        saves: parseInt(saves) || 0,
        membersReached: parseInt(membersReached) || 0,
        followersGained: parseInt(followersGained) || 0,
        date,
        reactionIcon,
      },
    ]);
    onClose();
  };

  const parseLinkedInExcel = (file: File) => {
    setImportError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const posts: LinkedInPost[] = [];
        let i = 0;
        while (i < rows.length) {
          const row = rows[i];
          if (!row || !row[0]) {
            i++;
            continue;
          }
          const key = String(row[0]).trim();
          if (key === "Post URL") {
            const postUrl = String(row[1] || "").trim();
            let impressions = 0,
              membersReached = 0,
              reactions = 0,
              comments = 0,
              reposts = 0,
              saves = 0,
              followersGained = 0;
            let postDate = "";
            let j = i + 1;
            while (j < rows.length && j < i + 20) {
              const k = String(rows[j]?.[0] || "").trim();
              const v =
                parseInt(String(rows[j]?.[1] || "0").replace(/,/g, "")) || 0;
              if (k === "Post Date")
                postDate = String(rows[j]?.[1] || "").trim();
              else if (k === "Impressions") impressions = v;
              else if (k === "Members reached") membersReached = v;
              else if (k === "Reactions") reactions = v;
              else if (k === "Comments") comments = v;
              else if (k === "Reposts") reposts = v;
              else if (k === "Saves") saves = v;
              else if (k === "Followers gained from this post")
                followersGained = v;
              else if (k === "Post URL" && j !== i) break;
              j++;
            }
            let formattedDate = new Date().toISOString().split("T")[0];
            try {
              const d = new Date(postDate);
              if (!isNaN(d.getTime()))
                formattedDate = d.toISOString().split("T")[0];
            } catch {}
            const pid = `post_${Date.now()}_${posts.length}`;
            posts.push({
              id: pid,
              title: `LinkedIn Post — ${formattedDate}`,
              content: "",
              postUrl,
              likes: reactions,
              comments,
              reposts,
              views: impressions,
              saves,
              membersReached,
              followersGained,
              date: formattedDate,
              reactionIcon: "none",
            });
            i = j;
          } else {
            i++;
          }
        }
        if (posts.length === 0)
          setImportError(
            "No posts found. Make sure this is a LinkedIn analytics export.",
          );
        else {
          setImportPreview(posts);
          const titles: Record<string, string> = {};
          posts.forEach((p) => {
            titles[p.id] = "";
          });
          setImportTitles(titles);
        }
      } catch {
        setImportError(
          "Failed to read file. Make sure it's a valid LinkedIn Excel export (.xlsx).",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSave = async () => {
    if (!importPreview.length) return;
    setSaving(true);
    // apply custom titles where provided
    const finalPosts = importPreview.map((p) => ({
      ...p,
      title: importTitles[p.id]?.trim() || p.title,
    }));
    await onSave(finalPosts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Log Post Analytics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manual entry or import from LinkedIn
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {[
            { id: "manual", label: "Manual Entry", icon: FileText },
            {
              id: "import",
              label: "Import from LinkedIn",
              icon: FileSpreadsheet,
            },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab === id ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "manual" && (
          <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Post Title / Topic *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="5 AI Trends for Insurance"
                className={inputCls}
              />
            </div>

            <details className="group">
              <summary className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer select-none list-none">
                <Plus className="w-3.5 h-3.5 group-open:rotate-45 transition-transform" />
                Add post content, URL & notes
                <ChevronRight className="w-3 h-3 ml-auto group-open:rotate-90 transition-transform text-muted-foreground" />
              </summary>
              <div className="mt-3 space-y-3 pl-1">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Post Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What was this post about..."
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1 block">
                    <Link2 className="w-3 h-3" /> Post URL
                  </label>
                  <input
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://linkedin.com/feed/update/..."
                    className={inputCls}
                  />
                </div>
              </div>
            </details>

            {/* Reaction icon picker */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Reaction Icon
              </label>
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm hover:bg-muted transition-colors"
              >
                <span className="text-lg">{selectedReaction.svg}</span>
                <span className="text-foreground font-medium">
                  {selectedReaction.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </button>
              <AnimatePresence>
                {showReactionPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 p-3 bg-muted/80 border border-border rounded-xl grid grid-cols-5 gap-2"
                  >
                    {REACTION_ICONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setReactionIcon(r.id);
                          setShowReactionPicker(false);
                        }}
                        title={r.label}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-lg transition-all hover:bg-card ${reactionIcon === r.id ? "bg-card ring-2 ring-primary" : ""}`}
                      >
                        <span>{r.svg}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {r.label}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Impressions 👁", views, setViews],
                ["Reactions", likes, setLikes],
                ["Comments 💬", comments, setComments],
                ["Reposts 🔁", reposts, setReposts],
              ].map(([label, val, set]: any) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            <details className="group">
              <summary className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none list-none">
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                More metrics (saves, reach, followers gained)
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  ["Saves", saves, setSaves],
                  ["Members Reached", membersReached, setMembersReached],
                  ["Followers Gained", followersGained, setFollowersGained],
                ].map(([label, val, set]: any) => (
                  <div key={label}>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      {label}
                    </label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </details>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {tab === "import" && (
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="p-4 rounded-xl bg-[#0077b5]/5 border border-[#0077b5]/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                How to export from LinkedIn:
              </p>
              <p>
                1. Go to your post → click <strong>Analytics</strong>
              </p>
              <p>
                2. Click <strong>Export</strong> → download the .xlsx file
              </p>
              <p>3. Upload it here — we'll auto-read all the metrics</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parseLinkedInExcel(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Click to upload LinkedIn export
              </p>
              <p className="text-xs text-muted-foreground">
                .xlsx or .xls files only
              </p>
            </button>
            {importError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {importError}
              </p>
            )}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Found {importPreview.length} post
                  {importPreview.length > 1 ? "s" : ""} — add a name for each:
                </p>
                <div className="max-h-52 overflow-y-auto space-y-2">
                  {importPreview.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl bg-muted/50 border border-border overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-muted-foreground font-medium">
                          {p.date}
                        </span>
                        <span className="text-primary font-bold">
                          {fmtNum(p.views)} impressions · {p.likes} reactions
                        </span>
                      </div>
                      {p.postUrl && (
                        <div className="px-3 pb-1.5">
                          <a
                            href={p.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 truncate"
                          >
                            <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
                            {p.postUrl}
                          </a>
                        </div>
                      )}
                      <div className="px-3 pb-2.5">
                        <input
                          value={importTitles[p.id] ?? ""}
                          onChange={(e) =>
                            setImportTitles((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="Post name / topic (optional)"
                          className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          {tab === "manual" ? (
            <button
              onClick={handleManualSave}
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Log Post
            </button>
          ) : (
            <button
              onClick={handleImportSave}
              disabled={saving || !importPreview.length}
              className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Import{" "}
              {importPreview.length > 0 ? `${importPreview.length} Posts` : ""}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Post Modal ──────────────────────────────────────────────────────────
function EditPostModal({
  post,
  onClose,
  onSave,
}: {
  post: LinkedInPost;
  onClose: () => void;
  onSave: (p: LinkedInPost) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [postUrl, setPostUrl] = useState(post.postUrl ?? "");
  const [views, setViews] = useState(String(post.views));
  const [likes, setLikes] = useState(String(post.likes));
  const [comments, setComments] = useState(String(post.comments));
  const [reposts, setReposts] = useState(String(post.reposts));
  const [saves, setSaves] = useState(String(post.saves ?? ""));
  const [date, setDate] = useState(post.date);
  const [reactionIcon, setReactionIcon] = useState(post.reactionIcon ?? "none");
  const [showPicker, setShowPicker] = useState(false);
  const selectedReaction =
    REACTION_ICONS.find((r) => r.id === reactionIcon) ?? REACTION_ICONS[0];

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...post,
      title: title.trim(),
      postUrl,
      views: parseInt(views) || 0,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      reposts: parseInt(reposts) || 0,
      saves: parseInt(saves) || 0,
      date,
      reactionIcon,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full gradient-primary" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-sm">Edit Post</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Post URL
            </label>
            <input
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://linkedin.com/..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Reaction Icon
            </label>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm hover:bg-muted"
            >
              <span className="text-lg">{selectedReaction.svg}</span>
              <span className="font-medium text-foreground">
                {selectedReaction.label}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            </button>
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 p-3 bg-muted/80 border border-border rounded-xl grid grid-cols-5 gap-2"
                >
                  {REACTION_ICONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setReactionIcon(r.id);
                        setShowPicker(false);
                      }}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-lg hover:bg-card ${reactionIcon === r.id ? "bg-card ring-2 ring-primary" : ""}`}
                    >
                      <span>{r.svg}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {r.label}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Impressions 👁", views, setViews],
              ["Reactions", likes, setLikes],
              ["Comments 💬", comments, setComments],
              ["Reposts 🔁", reposts, setReposts],
              ["Saves", saves, setSaves],
            ].map(([label, val, set]: any) => (
              <div key={label}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {label}
                </label>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border bg-muted/20">
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
            Save Changes
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
  const reaction = REACTION_ICONS.find(
    (r) => r.id === (post.reactionIcon ?? "none"),
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full gradient-primary" />
        <div className="flex items-start justify-between px-5 py-4 border-b border-border gap-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {reaction && reaction.id !== "none" && (
              <span className="text-xl flex-shrink-0 mt-0.5">
                {reaction.svg}
              </span>
            )}
            <h3 className="font-bold text-sm text-foreground line-clamp-2">
              {post.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="Edit"
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
                value: fmtNum(post.views),
                icon: "👁",
                primary: true,
              },
              { label: "Reactions", value: fmtNum(post.likes), icon: "👍" },
              { label: "Comments", value: fmtNum(post.comments), icon: "💬" },
              { label: "Reposts", value: fmtNum(post.reposts), icon: "🔁" },
              { label: "Saves", value: fmtNum(post.saves ?? 0), icon: "🔖" },
              {
                label: "Members Reached",
                value: fmtNum(post.membersReached ?? 0),
                icon: "👥",
              },
            ].map(({ label, value, icon, primary }) => (
              <div
                key={label}
                className={`p-3 rounded-xl border ${primary ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
              >
                <p className="text-xs text-muted-foreground mb-0.5">
                  {icon} {label}
                </p>
                <p
                  className={`text-xl font-bold tracking-tight ${primary ? "text-primary" : "text-foreground"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {post.date}
            </span>
            {post.postUrl && (
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Link2 className="w-3 h-3" /> View post
              </a>
            )}
          </div>
          {post.followersGained ? (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500">
              +{post.followersGained} followers gained from this post
            </div>
          ) : null}
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
  index,
}: {
  account: LinkedInAccount;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const avgViews =
    account.posts?.length > 0
      ? Math.round(
          account.posts.reduce((s, p) => s + p.views, 0) / account.posts.length,
        )
      : 0;
  const totalEngagement =
    account.posts?.reduce((s, p) => s + p.likes + p.comments + p.reposts, 0) ??
    0;
  const trend =
    account.posts?.length >= 2
      ? account.posts.at(-1)!.views - account.posts.at(-2)!.views
      : 0;
  const bestPost =
    account.posts?.length > 0
      ? account.posts.reduce((b, p) => (p.views > b.views ? p : b))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onSelect}
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 group ${isSelected ? "ring-2 ring-primary shadow-lg shadow-primary/10" : "hover:shadow-md hover:-translate-y-0.5"}`}
    >
      <div className="glass p-5">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0077b5]/60 via-[#0077b5]/20 to-transparent" />
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.name}
                className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 shadow-sm"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm"
                style={{
                  background: `linear-gradient(135deg,${account.avatarColor || "#6366f1"},${(account.avatarColor || "#6366f1") + "99"})`,
                }}
              >
                {account.avatarInitials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-foreground leading-tight">
                  {account.name}
                </h3>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide flex items-center gap-0.5 ${account.type === "personal" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}
                >
                  {account.type === "personal" ? (
                    <User className="w-2.5 h-2.5" />
                  ) : (
                    <Building2 className="w-2.5 h-2.5" />
                  )}
                  {account.type}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {account.headline || "No headline"}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {account.profileUrl && (
              <a
                href={account.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            {
              label: "Followers",
              value: fmtNum(account.followers),
              icon: Users,
            },
            {
              label: "Growth",
              value: `${account.followersGrowth > 0 ? "+" : ""}${fmtNum(account.followersGrowth)}`,
              icon: TrendingUp,
              positive: account.followersGrowth > 0,
            },
            {
              label: "Avg Views",
              value: avgViews > 0 ? fmtNum(avgViews) : "–",
              icon: Eye,
            },
            {
              label: "Engagement",
              value: totalEngagement > 0 ? fmtNum(totalEngagement) : "–",
              icon: MessageSquare,
            },
          ].map(({ label, value, icon: Icon, positive }) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-background/60 border border-border/60"
            >
              <Icon className="w-3 h-3 text-muted-foreground mb-0.5" />
              <span
                className={`text-sm font-bold ${positive ? "text-emerald-500" : "text-foreground"}`}
              >
                {value}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between min-h-[40px]">
          <div>
            {account.posts?.length >= 2 ? (
              <>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Impressions trend
                </p>
                <Sparkline
                  posts={account.posts}
                  color={account.avatarColor || "#6366f1"}
                />
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">
                {account.posts?.length === 1
                  ? "Log 1 more post to see trend"
                  : "No posts yet"}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
            {trend !== 0 && (
              <div
                className={`flex items-center gap-1 text-xs font-semibold ${trend > 0 ? "text-emerald-500" : "text-red-400"}`}
              >
                {trend > 0 ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {fmtNum(Math.abs(trend))}
              </div>
            )}
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>

        {bestPost && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-orange-400" /> Best Post
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-foreground font-medium truncate flex-1">
                {bestPost.title}
              </p>
              <span className="text-xs font-bold text-primary flex-shrink-0">
                {fmtNum(bestPost.views)}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Posts Table ──────────────────────────────────────────────────────────────
type SortKey = "views" | "likes" | "comments" | "reposts" | "date";

function PostsTable({
  account,
  onAddPost,
  onUpdatePost,
  onDeletePost,
}: {
  account: LinkedInAccount;
  onAddPost: () => void;
  onUpdatePost: (p: LinkedInPost) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
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

  const sorted = [...(account.posts ?? [])].sort((a, b) => {
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
      <div className="glass rounded-2xl overflow-hidden border border-border/50 shadow-soft">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
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
                All Posts ({account.posts?.length ?? 0})
              </p>
            </div>
          </div>
          <button
            onClick={onAddPost}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Log Post
          </button>
        </div>

        {!sorted.length ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No posts logged yet — click "Log Post" above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-10"></th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    Post
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <SortBtn
                      k="views"
                      label={
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Impr.
                        </span>
                      }
                    />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    <SortBtn k="likes" label="👍" />
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
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((post, i) => {
                  const reaction = REACTION_ICONS.find(
                    (r) => r.id === (post.reactionIcon ?? "none"),
                  );
                  const isTop =
                    i === 0 && sortKey === "views" && sortDir === "desc";
                  return (
                    <tr
                      key={post.id}
                      onClick={() => setViewPost(post)}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-3.5 text-center text-base">
                        {reaction && reaction.id !== "none"
                          ? reaction.svg
                          : isTop
                            ? "🔥"
                            : ""}
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isTop && reaction?.id === "none" && (
                              <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium text-foreground truncate">
                              {post.title}
                            </p>
                          </div>
                          {post.postUrl && (
                            <a
                              href={post.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" /> View post
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm font-bold text-primary">
                        {fmtNum(post.views)}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-center text-muted-foreground">
                        {fmtNum(post.likes)}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-center text-muted-foreground">
                        {fmtNum(post.comments)}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-center text-muted-foreground">
                        {fmtNum(post.reposts)}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-muted-foreground text-right">
                        {post.date}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePost(post.id);
                          }}
                          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          <EditPostModal
            post={editPost}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<LinkedInAccount | null>(
    null,
  );
  const [showAddManual, setShowAddManual] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [showAddPost, setShowAddPost] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const oauthProcessed = useRef(false);

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
      setAccounts(data);
      if (data.length > 0) setSelectedAccountId(data[0].id);
      setLoading(false);
    });
  }, [workspace?.id]);

  useEffect(() => {
    if (oauthProcessed.current) return;
    const linkedinName = searchParams.get("linkedin_name");
    const error = searchParams.get("error");
    const linkedinId = searchParams.get("linkedin_id");
    if (error) {
      setToast({ msg: "LinkedIn connection failed.", type: "error" });
      setSearchParams({});
      return;
    }
    if (linkedinName && workspace && colRef && !oauthProcessed.current) {
      oauthProcessed.current = true;
      getDocs(query(colRef, where("linkedinId", "==", linkedinId || ""))).then(
        (snap) => {
          if (!snap.empty && linkedinId) {
            const existing = {
              id: snap.docs[0].id,
              ...snap.docs[0].data(),
            } as LinkedInAccount;
            setSelectedAccountId(existing.id);
            setEditingAccount(existing);
            setToast({
              msg: `✅ ${linkedinName} already connected.`,
              type: "success",
            });
            setSearchParams({});
            return;
          }
          const newAcc = {
            name: linkedinName,
            headline: searchParams.get("linkedin_headline") || "",
            avatarUrl: searchParams.get("linkedin_avatar") || "",
            avatarInitials: initials(linkedinName),
            avatarColor:
              AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
            type: "personal" as const,
            followers: 0,
            followersGrowth: 0,
            profileUrl: "",
            linkedinId: linkedinId || "",
            posts: [],
          };
          addDoc(colRef, { ...newAcc, createdAt: serverTimestamp() }).then(
            (docRef) => {
              const saved: LinkedInAccount = {
                id: docRef.id,
                ...newAcc,
                createdAt: null,
              };
              setAccounts((prev) => [...prev, saved]);
              setSelectedAccountId(docRef.id);
              setEditingAccount(saved);
              setToast({
                msg: `✅ ${linkedinName} connected!`,
                type: "success",
              });
            },
          );
          setSearchParams({});
        },
      );
    }
  }, [searchParams, workspace?.id]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? null;
  const displayFollowers = selectedAccount
    ? selectedAccount.followers
    : accounts.reduce((s, a) => s + a.followers, 0);
  const displayGrowth = selectedAccount
    ? selectedAccount.followersGrowth
    : accounts.reduce((s, a) => s + a.followersGrowth, 0);
  const displayPosts = selectedAccount
    ? (selectedAccount.posts?.length ?? 0)
    : accounts.reduce((s, a) => s + (a.posts?.length ?? 0), 0);

  const handleConnectLinkedIn = () => {
    oauthProcessed.current = false;
    setOauthLoading(true);
    window.location.href = getLinkedInAuthUrl(workspace?.id ?? "default");
  };

  const handleSaveEdit = async (
    acc: Omit<LinkedInAccount, "id" | "createdAt">,
  ) => {
    if (!editingAccount || !workspace) return;
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
    setEditingAccount(null);
  };

  const handleSaveNew = async (
    acc: Omit<LinkedInAccount, "id" | "createdAt">,
  ) => {
    if (!workspace || !colRef) return;
    const docRef = await addDoc(colRef, {
      ...acc,
      createdAt: serverTimestamp(),
    });
    const saved: LinkedInAccount = { id: docRef.id, ...acc, createdAt: null };
    setAccounts((prev) => [...prev, saved]);
    setSelectedAccountId(docRef.id);
    setToast({ msg: `✅ ${acc.name} added!`, type: "success" });
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

  const handleAddPosts = async (posts: LinkedInPost[]) => {
    if (!selectedAccount || !workspace) return;
    const updated = [...(selectedAccount.posts ?? []), ...posts];
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
    setToast({
      msg: `✅ ${posts.length} post${posts.length > 1 ? "s" : ""} logged!`,
      type: "success",
    });
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

  const handleDeletePost = async (postId: string) => {
    if (!selectedAccount || !workspace) return;
    const updated = selectedAccount.posts.filter((p) => p.id !== postId);
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

  return (
    <div className="space-y-8 max-w-6xl">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-50 rounded-2xl px-5 py-3.5 shadow-2xl text-sm font-medium flex items-center gap-3 border ${toast.type === "success" ? "bg-card border-emerald-500/30" : "bg-card border-red-500/30"}`}
          >
            <span>{toast.msg}</span>
            <button
              onClick={() => setToast(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
        {editingAccount && (
          <AccountModal
            existing={editingAccount}
            onClose={() => setEditingAccount(null)}
            onSave={handleSaveEdit}
          />
        )}
        {showAddManual && (
          <AccountModal
            onClose={() => setShowAddManual(false)}
            onSave={handleSaveNew}
          />
        )}
        {showAddPost && (
          <AddPostModal
            onClose={() => setShowAddPost(false)}
            onSave={handleAddPosts}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#0077b5]/10 flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-[#0077b5]" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              LinkedIn
            </h1>
          </div>
          <p className="text-base text-muted-foreground ml-10">
            Manage accounts, track growth, and log post analytics.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-soft hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-soft overflow-hidden z-20 w-56"
              >
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    handleConnectLinkedIn();
                  }}
                  disabled={oauthLoading}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                  {oauthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0077b5]" />
                  ) : (
                    <Linkedin className="w-4 h-4 text-[#0077b5]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Connect via OAuth
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Personal profile
                    </p>
                  </div>
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    setShowAddManual(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Add manually
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Company page or manual
                    </p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Aggregate stats */}
      {!loading && accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedAccount
                ? `Showing: ${selectedAccount.name}`
                : "All Accounts Combined"}
            </p>
            {selectedAccount && (
              <button
                onClick={() => setSelectedAccountId(null)}
                className="text-[10px] text-primary hover:underline"
              >
                show totals
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Followers",
                value: fmtNum(displayFollowers),
                icon: Users,
                sub: selectedAccount
                  ? selectedAccount.name
                  : `${accounts.length} accounts`,
              },
              {
                label: "Growth This Month",
                value: `+${fmtNum(displayGrowth)}`,
                icon: TrendingUp,
                sub: "new followers",
                positive: true,
              },
              {
                label: "Posts Tracked",
                value: String(displayPosts),
                icon: BarChart2,
                sub: "with analytics logged",
              },
            ].map(({ label, value, icon: Icon, sub, positive }) => (
              <div
                key={label}
                className="glass rounded-2xl p-5 shadow-soft border border-border/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </p>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p
                  className={`text-3xl font-bold tracking-tight ${positive ? "text-emerald-500" : "text-foreground"}`}
                >
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-16 text-center border border-dashed border-border"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#0077b5]/10 flex items-center justify-center mx-auto mb-4">
            <Linkedin className="w-8 h-8 text-[#0077b5]" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No accounts connected yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Connect your personal LinkedIn via OAuth, or add a company page
            manually.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleConnectLinkedIn}
              disabled={oauthLoading}
              className="gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 hover:opacity-90"
            >
              {oauthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Linkedin className="w-4 h-4" />
              )}
              Connect LinkedIn
            </button>
            <button
              onClick={() => setShowAddManual(true)}
              className="px-6 py-3 rounded-xl border border-border font-semibold inline-flex items-center gap-2 hover:bg-muted text-foreground text-sm"
            >
              <Building2 className="w-4 h-4" /> Add Company Page
            </button>
          </div>
        </motion.div>
      )}

      {/* Account cards */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account, i) => (
            <AccountCard
              key={account.id}
              account={account}
              index={i}
              isSelected={selectedAccountId === account.id}
              onSelect={() =>
                setSelectedAccountId(
                  selectedAccountId === account.id ? null : account.id,
                )
              }
              onEdit={() => setEditingAccount(account)}
              onDelete={() => handleDelete(account.id)}
            />
          ))}
        </div>
      )}

      {/* Chart + table for selected account */}
      {!loading && selectedAccount && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="glass rounded-2xl p-6 border border-border/50 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {selectedAccount.avatarUrl ? (
                  <img
                    src={selectedAccount.avatarUrl}
                    className="w-8 h-8 rounded-xl object-cover"
                    alt=""
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: selectedAccount.avatarColor || "#6366f1",
                    }}
                  >
                    {selectedAccount.avatarInitials}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {selectedAccount.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Impressions over time
                  </p>
                </div>
              </div>
            </div>
            <ImpressionsLineChart
              posts={selectedAccount.posts ?? []}
              color={selectedAccount.avatarColor || "#1a6fff"}
            />
          </div>

          <PostsTable
            account={selectedAccount}
            onAddPost={() => setShowAddPost(true)}
            onUpdatePost={handleUpdatePost}
            onDeletePost={handleDeletePost}
          />
        </motion.div>
      )}
    </div>
  );
}
