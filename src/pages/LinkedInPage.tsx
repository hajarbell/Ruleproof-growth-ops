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
  Tag,
  MapPin,
  Briefcase,
  Clock,
  Heart,
  Repeat2,
  Bookmark,
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
  PieChart,
  Pie,
  Cell,
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
  pageVisits?: number;
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
  saves: number;
  membersReached: number;
  followersGained: number;
  profileViewers?: number;
  sends?: number;
  date: string;
  publishTime?: string;
  reactionIcon?: string;
  tags?: string[];
  isWeeklyAggregate?: boolean;
  topLocations?: Array<{ name: string; pct: number }>;
  topJobFunctions?: Array<{ name: string; pct: number }>;
  topIndustries?: Array<{ name: string; pct: number }>;
  topSeniority?: Array<{ name: string; pct: number }>;
  topCompanySizes?: Array<{ name: string; pct: number }>;
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

// 1 gradient preset — Aurora only (Ocean removed)
const GRADIENT_PRESETS = [
  {
    id: "grad-aurora",
    label: "Aurora",
    css: "linear-gradient(135deg, #ec4899 0%, #a78bfa 50%, #38bdf8 100%)",
    sparkColor: "#a78bfa",
  },
];

const CONTENT_TAGS = [
  {
    id: "tofu",
    label: "ToFu",
    color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  {
    id: "mofu",
    label: "MoFu",
    color: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  {
    id: "bofu",
    label: "BoFu",
    color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  {
    id: "personal",
    label: "Personal",
    color: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  },
  {
    id: "educational",
    label: "Educational",
    color: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  {
    id: "storytelling",
    label: "Storytelling",
    color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  },
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

// Unified electric-blue palette — cohesive but distinct
const CHART_COLORS = [
  "#818cf8",
  "#c084fc",
  "#60a5fa",
  "#e879f9",
  "#38bdf8",
  "#a78bfa",
  "#7dd3fc",
  "#f0abfc",
];
const GEO_COLORS = CHART_COLORS;
const JOB_COLORS = CHART_COLORS;

// Map LinkedIn's native reaction names to our icon IDs
function mapLinkedInReaction(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("like")) return "none"; // default thumb
  if (r.includes("love") || r.includes("heart")) return "heart";
  if (r.includes("celebrate") || r.includes("clap")) return "clap";
  if (r.includes("insightful") || r.includes("bulb")) return "bulb";
  if (r.includes("support") || r.includes("empathy")) return "heart";
  if (r.includes("curious") || r.includes("eyes")) return "eyes";
  if (r.includes("funny") || r.includes("haha")) return "clap";
  return "none";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function getAvatarBg(avatarColor: string): string {
  if (!avatarColor) return "linear-gradient(135deg, #6366f1, #6366f188)";
  const grad = GRADIENT_PRESETS.find((g) => g.id === avatarColor);
  if (grad) return grad.css;
  if (avatarColor.startsWith("linear-gradient")) return avatarColor;
  return `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`;
}

function getSparkColor(avatarColor: string): string {
  const grad = GRADIENT_PRESETS.find((g) => g.id === avatarColor);
  if (grad) return grad.sparkColor;
  if (avatarColor?.startsWith("linear-gradient")) {
    const match = avatarColor.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : "#6366f1";
  }
  return avatarColor || "#6366f1";
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

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  const customInputRef = useRef<HTMLInputElement>(null);
  const [showGradientBuilder, setShowGradientBuilder] = useState(false);
  const [gradColor1, setGradColor1] = useState("#6366f1");
  const [gradColor2, setGradColor2] = useState("#ec4899");
  const [gradAngle, setGradAngle] = useState(135);
  const gradRef1 = useRef<HTMLInputElement>(null);
  const gradRef2 = useRef<HTMLInputElement>(null);

  const isCustomSolid = value.startsWith("#") && !AVATAR_COLORS.includes(value);
  const isCustomGrad =
    value.startsWith("linear-gradient") &&
    !GRADIENT_PRESETS.find((g) => g.css === value);

  const buildGradient = (c1 = gradColor1, c2 = gradColor2, angle = gradAngle) =>
    `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;

  const applyGradient = () => onChange(buildGradient());

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-2xl border border-border bg-muted/20">
        {/* Clear */}
        <button
          onClick={() => onChange("")}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${value === "" ? "border-foreground scale-110" : "border-border"}`}
          title="None"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
        {/* Solid colors */}
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{ background: c }}
            className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${value === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "opacity-80 hover:opacity-100"}`}
          />
        ))}
        {/* Aurora preset */}
        {GRADIENT_PRESETS.map((g) => (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            style={{ background: g.css }}
            title={g.label}
            className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${value === g.id ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "opacity-80 hover:opacity-100"}`}
          />
        ))}
        {/* Custom solid */}
        <button
          onClick={() => customInputRef.current?.click()}
          title="Custom solid color"
          className={`w-8 h-8 rounded-full flex-shrink-0 border-2 border-dashed flex items-center justify-center transition-all ${isCustomSolid ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110 border-transparent" : "border-border hover:border-primary/60"}`}
          style={isCustomSolid ? { background: value } : {}}
        >
          {!isCustomSolid && (
            <span className="text-[11px] text-muted-foreground font-bold">
              +
            </span>
          )}
          <input
            ref={customInputRef}
            type="color"
            defaultValue={isCustomSolid ? value : "#6366f1"}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </button>
        {/* Gradient builder toggle */}
        <button
          onClick={() => setShowGradientBuilder(!showGradientBuilder)}
          title="Build a gradient"
          className={`h-8 px-2.5 rounded-full flex-shrink-0 border-2 border-dashed flex items-center gap-1.5 transition-all text-[10px] font-semibold ${showGradientBuilder || isCustomGrad ? "border-primary/60 bg-primary/10 text-primary scale-105" : "border-border text-muted-foreground hover:border-primary/40"}`}
          style={isCustomGrad ? { background: value, border: "none" } : {}}
        >
          {isCustomGrad ? (
            <span className="text-white drop-shadow text-[9px] px-0.5">
              Custom ✓
            </span>
          ) : (
            <>
              <span
                style={{ background: "linear-gradient(90deg,#6366f1,#ec4899)" }}
                className="w-3 h-3 rounded-full"
              />
              Gradient
            </>
          )}
        </button>
      </div>

      {/* Gradient builder panel */}
      {showGradientBuilder && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3 mt-1"
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Gradient Builder
          </p>
          {/* Preview */}
          <div
            className="h-8 rounded-lg w-full"
            style={{ background: buildGradient() }}
          />
          <div className="flex items-center gap-3">
            {/* Color 1 */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => gradRef1.current?.click()}
                className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm"
                style={{ background: gradColor1 }}
                title="Color 1"
              />
              <span className="text-[9px] text-muted-foreground">From</span>
              <input
                ref={gradRef1}
                type="color"
                value={gradColor1}
                onChange={(e) => {
                  setGradColor1(e.target.value);
                }}
                className="sr-only"
              />
            </div>
            {/* Angle */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">Angle</span>
                <span className="text-[9px] font-bold text-foreground">
                  {gradAngle}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={gradAngle}
                onChange={(e) => setGradAngle(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-primary"
              />
            </div>
            {/* Color 2 */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => gradRef2.current?.click()}
                className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm"
                style={{ background: gradColor2 }}
                title="Color 2"
              />
              <span className="text-[9px] text-muted-foreground">To</span>
              <input
                ref={gradRef2}
                type="color"
                value={gradColor2}
                onChange={(e) => {
                  setGradColor2(e.target.value);
                }}
                className="sr-only"
              />
            </div>
          </div>
          <button
            onClick={applyGradient}
            className="w-full py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
          >
            Apply Gradient
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ posts, color }: { posts: LinkedInPost[]; color: string }) {
  if (posts.length < 2) return null;
  const sparkColor = getSparkColor(color);
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
          id={`sg-${sparkColor.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={sparkColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sg-${sparkColor.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={sparkColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points.split(" ").at(-1)?.split(",")[0]}
        cy={points.split(" ").at(-1)?.split(",")[1]}
        r="3"
        fill={sparkColor}
      />
    </svg>
  );
}

// ─── Geography Bubbles ────────────────────────────────────────────────────────
// ─── Job Function Bars ────────────────────────────────────────────────────────
function JobFunctionBars({ posts }: { posts: LinkedInPost[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const postsWithJobs = posts.filter((p) => p.topJobFunctions?.length);
  if (!postsWithJobs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-20 gap-2 text-center">
        <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center">
          <Briefcase className="w-3.5 h-3.5 opacity-30 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground italic">
          No job title data yet
          <br />
          <span className="text-[10px] opacity-60">
            Import from LinkedIn to unlock
          </span>
        </p>
      </div>
    );
  }
  const agg: Record<string, number> = {};
  postsWithJobs.forEach((p) =>
    p.topJobFunctions!.forEach((f) => {
      agg[f.name] = Math.max(agg[f.name] || 0, f.pct);
    }),
  );
  const fns = Object.entries(agg)
    .map(([name, pct]) => ({ name, pct }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
  const maxPct = fns[0].pct;
  return (
    <div className="space-y-3">
      {fns.map((fn, i) => {
        const color = JOB_COLORS[i % JOB_COLORS.length];
        const isHov = hoveredIdx === i;
        const barW = (fn.pct / maxPct) * 100;
        return (
          <div
            key={fn.name}
            className="space-y-1.5 cursor-default"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-semibold truncate max-w-[180px] transition-all"
                style={{ color: isHov ? color : color + "cc" }}
              >
                {fn.name}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 transition-all"
                style={{
                  background: isHov ? color + "28" : color + "14",
                  color,
                }}
              >
                {fn.pct}%
              </span>
            </div>
            <div
              className="h-3.5 rounded-full overflow-hidden"
              style={{ background: color + "12" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barW}%` }}
                transition={{
                  delay: i * 0.07,
                  duration: 0.65,
                  ease: "easeOut",
                }}
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${color}f0, ${color}70)`,
                  boxShadow: isHov ? `0 0 6px ${color}60` : "none",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Post Timing: Best Hour + Best Day by engagement ─────────────────────────
function PostTimingDisplay({ posts }: { posts: LinkedInPost[] }) {
  const [tab, setTab] = useState<"hour" | "day">("hour");
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const TEAL = "#818cf8"; // violet — no green
  const VIOLET = "#c084fc"; // lilac

  // ── Best Hour (from publishTime field e.g. "2:41 PM") ────────────────────
  const hourEngagement: Record<number, { total: number; count: number }> = {};
  posts.forEach((p) => {
    if (!p.publishTime) return;
    try {
      const match = p.publishTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return;
      let h = parseInt(match[1]);
      if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
      if (!hourEngagement[h]) hourEngagement[h] = { total: 0, count: 0 };
      hourEngagement[h].total += p.likes + p.comments + p.reposts;
      hourEngagement[h].count++;
    } catch {}
  });

  const hourData = Object.entries(hourEngagement)
    .map(([h, v]) => ({
      hour: parseInt(h),
      avg: Math.round(v.total / v.count),
      count: v.count,
    }))
    .sort((a, b) => a.hour - b.hour);

  const fmt12 = (h: number) => {
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  };

  // ── Best Day by avg engagement ─────────────────────────────────────────────
  const dayEngagement: Record<number, { total: number; count: number }> = {};
  posts.forEach((p) => {
    try {
      const d = new Date(p.date);
      if (isNaN(d.getTime())) return;
      const di = (d.getDay() + 6) % 7;
      if (!dayEngagement[di]) dayEngagement[di] = { total: 0, count: 0 };
      dayEngagement[di].total += p.likes + p.comments + p.reposts;
      dayEngagement[di].count++;
    } catch {}
  });
  const dayData = days.map((name, i) => ({
    name,
    avg: dayEngagement[i]
      ? Math.round(dayEngagement[i].total / dayEngagement[i].count)
      : 0,
    count: dayEngagement[i]?.count ?? 0,
  }));

  const hasTiming = hourData.length > 0;
  const hasDays = dayData.some((d) => d.count > 0);

  if (!hasTiming && !hasDays)
    return (
      <div className="flex flex-col items-center justify-center h-20 gap-2 text-center px-2">
        <Clock className="w-4 h-4 opacity-30 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
          No timing data yet
          <br />
          <span className="text-[9px] opacity-70">
            Weekly exports don't include post times. Import a{" "}
            <strong className="font-semibold">per-post export</strong> to unlock
            Best Hour.
          </span>
        </p>
      </div>
    );

  const maxHour = Math.max(...hourData.map((h) => h.avg), 1);
  const maxDay = Math.max(...dayData.map((d) => d.avg), 1);
  const bestHourIdx = hourData.reduce(
    (bi, h, i) => (h.avg > hourData[bi].avg ? i : bi),
    0,
  );
  const bestDayIdx = dayData.reduce(
    (bi, d, i) => (d.avg > dayData[bi].avg ? i : bi),
    0,
  );

  return (
    <div className="space-y-3">
      {/* Tab switcher — inline SVG icons, no font dependency */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit">
        {(["hour", "day"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "hour" ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ) : (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            )}
            {t === "hour" ? "Best Hour" : "Best Day"}
          </button>
        ))}
      </div>

      {tab === "hour" && hasTiming && (
        <div className="space-y-2.5">
          {/* Best hour as a highlighted card */}
          {hourData[bestHourIdx] && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: TEAL + "0f", borderColor: TEAL + "30" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: TEAL + "20" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={TEAL}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  Best posting hour
                </p>
                <p
                  className="text-lg font-bold leading-tight"
                  style={{ color: TEAL }}
                >
                  {fmt12(hourData[bestHourIdx].hour)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-muted-foreground">
                  avg engagement
                </p>
                <p className="text-base font-bold" style={{ color: TEAL }}>
                  {fmtNum(hourData[bestHourIdx].avg)}
                </p>
              </div>
            </motion.div>
          )}
          {/* All hours bar chart */}
          <div
            className="flex items-end gap-1 h-20"
            style={{ scrollbarWidth: "none" }}
          >
            {hourData.map((h, i) => {
              const heightPct = Math.max((h.avg / maxHour) * 100, 4);
              const isBest = i === bestHourIdx;
              return (
                <div
                  key={h.hour}
                  className="flex flex-col items-center gap-0.5 flex-1 min-w-[22px] group relative"
                >
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <p className="font-bold" style={{ color: TEAL }}>
                      {fmt12(h.hour)}
                    </p>
                    <p className="text-muted-foreground">
                      ~{fmtNum(h.avg)} eng
                    </p>
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${heightPct}%`, opacity: 1 }}
                      transition={{
                        delay: i * 0.04,
                        duration: 0.5,
                        ease: "easeOut",
                      }}
                      className="w-full rounded-t-sm min-h-[3px]"
                      style={{
                        background: isBest
                          ? `linear-gradient(to top, ${TEAL}, ${TEAL}88)`
                          : TEAL + "28",
                        boxShadow: isBest ? `0 0 6px ${TEAL}50` : "none",
                      }}
                    />
                  </div>
                  <span
                    className="text-[7px]"
                    style={{
                      color: isBest ? TEAL : "hsl(var(--muted-foreground)/0.4)",
                    }}
                  >
                    {fmt12(h.hour)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "day" && hasDays && (
        <div className="space-y-2.5">
          {/* Best day card */}
          {dayData[bestDayIdx]?.count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: VIOLET + "0f", borderColor: VIOLET + "30" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: VIOLET + "20" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={VIOLET}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  Best posting day
                </p>
                <p
                  className="text-lg font-bold leading-tight"
                  style={{ color: VIOLET }}
                >
                  {dayData[bestDayIdx].name}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-muted-foreground">
                  avg engagement
                </p>
                <p className="text-base font-bold" style={{ color: VIOLET }}>
                  {fmtNum(dayData[bestDayIdx].avg)}
                </p>
              </div>
            </motion.div>
          )}
          <div className="flex items-end gap-1.5 h-20">
            {dayData.map((d, i) => {
              const heightPct = Math.max((d.avg / maxDay) * 100, 4);
              const isBest = i === bestDayIdx && d.count > 0;
              return (
                <div
                  key={d.name}
                  className="flex flex-col items-center gap-0.5 flex-1 group relative"
                >
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <p className="font-bold" style={{ color: VIOLET }}>
                      {d.name}
                    </p>
                    <p className="text-muted-foreground">
                      ~{fmtNum(d.avg)} avg eng
                    </p>
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: d.count > 0 ? `${heightPct}%` : "3px",
                        opacity: 1,
                      }}
                      transition={{
                        delay: i * 0.05,
                        duration: 0.5,
                        ease: "easeOut",
                      }}
                      className="w-full rounded-t-sm min-h-[3px]"
                      style={{
                        background:
                          d.count > 0
                            ? isBest
                              ? `linear-gradient(to top,${VIOLET},${VIOLET}80)`
                              : VIOLET + "30"
                            : "hsl(var(--muted)/0.2)",
                        boxShadow: isBest ? `0 0 6px ${VIOLET}50` : "none",
                      }}
                    />
                  </div>
                  <span
                    className="text-[8px]"
                    style={{
                      color: isBest
                        ? VIOLET
                        : "hsl(var(--muted-foreground)/0.5)",
                    }}
                  >
                    {d.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Impressions Chart ────────────────────────────────────────────────────────
function ImpressionsLineChart({
  posts,
  color,
}: {
  posts: LinkedInPost[];
  color: string;
}) {
  const [period, setPeriod] = useState<"all" | "30d" | "90d">("all");
  const [showEngagement, setShowEngagement] = useState(false);
  const [impressionColor, setImpressionColor] = useState("#3b82f6");
  const [engagementColor, setEngagementColor] = useState("#10b981");
  const impColorRef = useRef<HTMLInputElement>(null);
  const engColorRef = useRef<HTMLInputElement>(null);

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
        <div className="flex items-center gap-2.5">
          {/* Impressions color dot */}
          <button
            onClick={() => impColorRef.current?.click()}
            title="Change impressions color"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <div
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ background: impressionColor }}
            />
            <span className="text-[10px] text-muted-foreground">
              Impressions
            </span>
          </button>
          <input
            ref={impColorRef}
            type="color"
            value={impressionColor}
            onChange={(e) => setImpressionColor(e.target.value)}
            className="sr-only"
          />

          {/* Engagement toggle — dot is clickable for color when active */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEngagement(!showEngagement)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${showEngagement ? "border-current/40 bg-current/8" : "border-border text-muted-foreground hover:bg-muted"}`}
              style={
                showEngagement
                  ? {
                      color: engagementColor,
                      borderColor: engagementColor + "40",
                      background: engagementColor + "12",
                    }
                  : {}
              }
            >
              {showEngagement ? "✓" : "+"} Engagement
            </button>
            {showEngagement && (
              <button
                onClick={() => engColorRef.current?.click()}
                title="Change engagement color"
                className="w-3 h-3 rounded-full border border-white/20 hover:scale-125 transition-transform flex-shrink-0"
                style={{ background: engagementColor }}
              />
            )}
          </div>
          <input
            ref={engColorRef}
            type="color"
            value={engagementColor}
            onChange={(e) => setEngagementColor(e.target.value)}
            className="sr-only"
          />
        </div>
        <div className="flex items-center gap-1.5">
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
      <ResponsiveContainer width="100%" height={190}>
        <LineChart
          data={filtered}
          margin={{ top: 6, right: 4, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground)/0.5)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            width={0}
            tickFormatter={fmtNum}
            tick={{ fontSize: 10, fill: "transparent" }}
            tickLine={false}
            axisLine={false}
          />
          {showEngagement && (
            <YAxis
              yAxisId="right"
              width={0}
              orientation="right"
              tickFormatter={fmtNum}
              tick={{ fontSize: 10, fill: "transparent" }}
              tickLine={false}
              axisLine={false}
            />
          )}
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
                  <p className="font-bold" style={{ color: impressionColor }}>
                    {fmtNum(d.views)} impressions
                  </p>
                  {showEngagement && (
                    <p className="font-bold" style={{ color: engagementColor }}>
                      {fmtNum(d.engagement)} engagement
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="views"
            stroke={impressionColor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: impressionColor }}
            activeDot={{ r: 5 }}
            name="Impressions"
          />
          {showEngagement && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagement"
              stroke={engagementColor}
              strokeWidth={2}
              dot={{ r: 3, fill: engagementColor }}
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
  const [pageVisits, setPageVisits] = useState(
    String(existing?.pageVisits ?? ""),
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
      pageVisits: type === "company" ? parseInt(pageVisits) || 0 : undefined,
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
          {/* Avatar upload */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Profile Picture / Logo
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
                    style={{ color: getSparkColor(avatarColor) || "#888" }}
                  >
                    {initials(name || "?")}
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
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
          {type === "company" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Page Visits (last 30 days)
              </label>
              <input
                type="number"
                value={pageVisits}
                onChange={(e) => setPageVisits(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          )}
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

// ─── Tags Picker ──────────────────────────────────────────────────────────────
function TagsPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (t: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((t) => t !== id) : [...value, id],
    );
  return (
    <div className="flex flex-wrap gap-2">
      {CONTENT_TAGS.map((tag) => {
        const active = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => toggle(tag.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${active ? tag.color + " scale-105" : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"}`}
          >
            {tag.label}
          </button>
        );
      })}
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
  const [weeklyImportMeta, setWeeklyImportMeta] = useState<{
    totalFollowers: number;
    totalFollGained: number;
    dateRange: string;
  } | null>(null);
  const [importTitles, setImportTitles] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [tags, setTags] = useState<string[]>([]);
  const selectedReaction =
    REACTION_ICONS.find((r) => r.id === reactionIcon) ?? REACTION_ICONS[0];

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
        tags,
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
        const sheetNames = wb.SheetNames.map((s) => s.toUpperCase());

        // ─── Helper: parse demographics sheet into arrays ───────────────────
        const parseDemographics = (sheet: any) => {
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const topLocations: Array<{ name: string; pct: number }> = [];
          const topJobFunctions: Array<{ name: string; pct: number }> = [];
          const topIndustries: Array<{ name: string; pct: number }> = [];
          const topSeniority: Array<{ name: string; pct: number }> = [];
          const topCompanySizes: Array<{ name: string; pct: number }> = [];
          for (const row of rows) {
            const cat = String(row?.[0] || "").trim();
            const val = String(row?.[1] || "").trim();
            const pctRaw = row?.[2];
            if (
              !cat ||
              !val ||
              cat === "Category" ||
              cat === "Top Demographics"
            )
              continue;
            let pct = 0;
            if (typeof pctRaw === "number") pct = Math.round(pctRaw * 100);
            else if (typeof pctRaw === "string") {
              const s = String(pctRaw).trim();
              if (s.startsWith("<"))
                pct = 1; // "< 1%" → treat as 1%
              else if (s.includes("%")) pct = Math.round(parseFloat(s) || 0);
              else pct = Math.round((parseFloat(s) || 0) * 100);
            }
            const catL = cat.toLowerCase();
            if (catL === "location" || catL === "locations")
              topLocations.push({ name: val, pct });
            else if (catL === "job title" || catL === "job titles")
              topJobFunctions.push({ name: val, pct });
            else if (catL === "industry" || catL === "industries")
              topIndustries.push({ name: val, pct });
            else if (catL === "seniority")
              topSeniority.push({ name: val, pct });
            else if (catL === "company size" || catL === "company sizes")
              topCompanySizes.push({ name: val, pct });
            // "Company" category exists in some exports — skip silently (not displayed)
          }
          return {
            topLocations,
            topJobFunctions,
            topIndustries,
            topSeniority,
            topCompanySizes,
          };
        };

        // ─── Helper: parse a number safely ─────────────────────────────────
        const parseNum = (v: any) => {
          if (v == null) return 0;
          const s = String(v).replace(/,/g, "").trim();
          // Handle "< 1%" or any non-numeric string
          if (
            s.startsWith("<") ||
            s === "" ||
            isNaN(Number(s.replace(/[^0-9.-]/g, "")))
          )
            return 0;
          return parseInt(s.replace(/[^0-9]/g, "")) || 0;
        };

        // ─── Helper: format a date to YYYY-MM-DD ───────────────────────────
        const fmtDate = (raw: any): string => {
          if (!raw) return new Date().toISOString().split("T")[0];
          try {
            // Excel serial date number
            if (typeof raw === "number") {
              const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
              if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
            }
            const d = new Date(String(raw));
            return isNaN(d.getTime())
              ? new Date().toISOString().split("T")[0]
              : d.toISOString().split("T")[0];
          } catch {
            return new Date().toISOString().split("T")[0];
          }
        };

        // ═══════════════════════════════════════════════════════════════════
        // FORMAT A: PER-POST EXPORT — sheets: PERFORMANCE + TOP DEMOGRAPHICS
        // ═══════════════════════════════════════════════════════════════════
        const isPerPost =
          sheetNames.includes("PERFORMANCE") ||
          sheetNames[0] === "SHEET1" ||
          sheetNames[0] === "SHEET 1" ||
          // detect by checking if first sheet has "Post URL" key
          (() => {
            const rows: any[][] = XLSX.utils.sheet_to_json(
              wb.Sheets[wb.SheetNames[0]],
              { header: 1 },
            );
            return rows.some((r) => String(r?.[0] || "").trim() === "Post URL");
          })();

        if (isPerPost) {
          // ── Sheet 1: key-value pairs ──────────────────────────────────────
          const perfRows: any[][] = XLSX.utils.sheet_to_json(
            wb.Sheets[wb.SheetNames[0]],
            { header: 1 },
          );
          const kv: Record<string, string> = {};
          for (const row of perfRows) {
            const k = String(row?.[0] || "").trim();
            const v = String(row?.[1] || "").trim();
            if (k) kv[k] = v;
          }
          const postUrl = kv["Post URL"] || "";
          const postDate = kv["Post Date"] || "";
          const publishTime =
            kv["Post Publish Time"] || kv["Publish time"] || "";
          const impressions = parseNum(kv["Impressions"]);
          const membersReached = parseNum(kv["Members reached"]);
          const profileViewers = parseNum(kv["Profile viewers from this post"]);
          const followersGained = parseNum(
            kv["Followers gained from this post"],
          );
          const reactions = parseNum(kv["Reactions"]);
          const comments = parseNum(kv["Comments"]);
          const reposts = parseNum(kv["Reposts"]);
          const saves = parseNum(kv["Saves"]);
          const sends = parseNum(kv["Sends on LinkedIn"]);
          const highlightLocation = kv["Top location"] || "";
          const highlightJobTitle = kv["Top job title"] || "";
          const highlightIndustry = kv["Top industry"] || "";

          // ── Sheet 2: demographics ─────────────────────────────────────────
          let demo = {
            topLocations: [] as any[],
            topJobFunctions: [] as any[],
            topIndustries: [] as any[],
            topSeniority: [] as any[],
            topCompanySizes: [] as any[],
          };
          if (wb.SheetNames.length > 1) {
            // LinkedIn uses "TOP DEMOGRAPHICS" in per-post exports
            const demoSheetName = wb.SheetNames.find((s) =>
              s.toUpperCase().includes("DEMOGRAPHICS"),
            );
            if (demoSheetName) {
              demo = parseDemographics(wb.Sheets[demoSheetName]);
            }
          }
          if (!demo.topLocations.length && highlightLocation)
            demo.topLocations.push({ name: highlightLocation, pct: 50 });
          if (!demo.topJobFunctions.length && highlightJobTitle)
            demo.topJobFunctions.push({ name: highlightJobTitle, pct: 50 });
          if (!demo.topIndustries.length && highlightIndustry)
            demo.topIndustries.push({ name: highlightIndustry, pct: 50 });

          const formattedDate = fmtDate(postDate);
          if (!postUrl && impressions === 0) {
            setImportError(
              "No post data found. Make sure this is a LinkedIn analytics export.",
            );
            return;
          }
          const pid = `post_${Date.now()}_0`;
          const newPost: LinkedInPost = {
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
            profileViewers,
            sends,
            date: formattedDate,
            publishTime: publishTime || "",
            reactionIcon: kv["Top reaction type"]
              ? mapLinkedInReaction(kv["Top reaction type"])
              : "none",
            tags: [],
            ...(demo.topLocations.length
              ? { topLocations: demo.topLocations }
              : {}),
            ...(demo.topJobFunctions.length
              ? { topJobFunctions: demo.topJobFunctions }
              : {}),
            ...(demo.topIndustries.length
              ? { topIndustries: demo.topIndustries }
              : {}),
            ...(demo.topSeniority.length
              ? { topSeniority: demo.topSeniority }
              : {}),
            ...(demo.topCompanySizes.length
              ? { topCompanySizes: demo.topCompanySizes }
              : {}),
          };
          setImportPreview([newPost]);
          setImportTitles({ [pid]: "" });
          return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // FORMAT B: WEEKLY/DATE-RANGE EXPORT
        // Sheets: DISCOVERY, ENGAGEMENT, TOP POSTS, FOLLOWERS, DEMOGRAPHICS
        // Strategy: Use ENGAGEMENT tab for accurate daily data, cross-reference
        // with TOP POSTS by date to get post URLs. Followers from FOLLOWERS tab.
        // ═══════════════════════════════════════════════════════════════════
        const hasWeeklySheets =
          sheetNames.includes("DISCOVERY") || sheetNames.includes("TOP POSTS");
        if (!hasWeeklySheets) {
          setImportError(
            "Unrecognized export format. Expected a LinkedIn post analytics or weekly analytics export.",
          );
          return;
        }

        // ── DISCOVERY: overall impressions + members reached ──────────────
        let weekImpressions = 0,
          weekMembersReached = 0,
          dateRange = "";
        const discoveryIdx = sheetNames.indexOf("DISCOVERY");
        if (discoveryIdx >= 0) {
          const discRows: any[][] = XLSX.utils.sheet_to_json(
            wb.Sheets[wb.SheetNames[discoveryIdx]],
            { header: 1 },
          );
          for (const row of discRows) {
            const k = String(row?.[0] || "").trim();
            const v = row?.[1];
            if (k === "Overall Performance") dateRange = String(v || "");
            else if (k === "Impressions") weekImpressions = parseNum(v);
            else if (k === "Members reached") weekMembersReached = parseNum(v);
          }
        }

        // ── ENGAGEMENT: accurate daily impressions + engagements ──────────
        // This is the source of truth for per-day data
        const dailyData: Array<{
          date: string;
          impressions: number;
          engagements: number;
        }> = [];
        const engIdx = sheetNames.indexOf("ENGAGEMENT");
        if (engIdx >= 0) {
          const engRows: any[][] = XLSX.utils.sheet_to_json(
            wb.Sheets[wb.SheetNames[engIdx]],
            { header: 1 },
          );
          for (const row of engRows) {
            const dateCell = row?.[0];
            const imp = row?.[1];
            const eng = row?.[2];
            if (
              !dateCell ||
              String(dateCell).trim() === "Date" ||
              String(dateCell).trim() === "Overall Performance"
            )
              continue;
            const d = fmtDate(dateCell);
            if (d)
              dailyData.push({
                date: d,
                impressions: parseNum(imp),
                engagements: parseNum(eng),
              });
          }
        }

        // ── FOLLOWERS: total + day-by-day new followers ───────────────────
        let totalFollowers = 0;
        const dailyFollowers: Record<string, number> = {};
        const followIdx = sheetNames.indexOf("FOLLOWERS");
        if (followIdx >= 0) {
          const folRows: any[][] = XLSX.utils.sheet_to_json(
            wb.Sheets[wb.SheetNames[followIdx]],
            { header: 1 },
          );
          for (const row of folRows) {
            const k = String(row?.[0] || "").trim();
            if (k.startsWith("Total followers"))
              totalFollowers = parseNum(row?.[1]);
            else if (k === "Date" || !k) continue;
            else {
              dailyFollowers[fmtDate(k)] = parseNum(row?.[1]);
            }
          }
        }

        // ── TOP POSTS: single source of truth for all post data ──────────
        // LEFT cols (0-2):  URL | publish date | Engagements  (ranked by engagement)
        // RIGHT cols (4-6): URL | publish date | Impressions  (ranked by impressions)
        // Strategy: merge BOTH sides by URL to get full picture per post.
        // Engagements & impressions in TOP POSTS are per-post, accurate.
        // ENGAGEMENT tab only has daily totals — NOT used for per-post data.
        const postMap: Record<
          string,
          {
            url: string;
            date: string;
            engagements: number;
            impressions: number;
          }
        > = {};
        const topPostsIdx = sheetNames.indexOf("TOP POSTS");
        if (topPostsIdx >= 0) {
          const tpRows: any[][] = XLSX.utils.sheet_to_json(
            wb.Sheets[wb.SheetNames[topPostsIdx]],
            { header: 1 },
          );
          for (const row of tpRows) {
            // Left side: URL + date + engagements
            const urlL = String(row?.[0] || "").trim();
            const dateL = row?.[1];
            const engL = row?.[2];
            if (urlL.startsWith("http") && dateL) {
              if (!postMap[urlL])
                postMap[urlL] = {
                  url: urlL,
                  date: fmtDate(dateL),
                  engagements: 0,
                  impressions: 0,
                };
              postMap[urlL].engagements = Math.max(
                postMap[urlL].engagements,
                parseNum(engL),
              );
            }
            // Right side: URL + date + impressions
            const urlR = String(row?.[4] || "").trim();
            const dateR = row?.[5];
            const impR = row?.[6];
            if (urlR.startsWith("http") && dateR) {
              if (!postMap[urlR])
                postMap[urlR] = {
                  url: urlR,
                  date: fmtDate(dateR),
                  engagements: 0,
                  impressions: 0,
                };
              postMap[urlR].impressions = Math.max(
                postMap[urlR].impressions,
                parseNum(impR),
              );
            }
          }
        }

        if (Object.keys(postMap).length === 0) {
          setImportError(
            "No post data found in TOP POSTS sheet. Make sure you're uploading a LinkedIn Analytics export with a 'TOP POSTS' sheet.",
          );
          return;
        }

        // ── Data integrity check: warn if impressions look wrong ──────────
        const hasImpressions = Object.values(postMap).some(
          (p) => p.impressions > 0,
        );
        const hasEngagements = Object.values(postMap).some(
          (p) => p.engagements > 0,
        );
        if (!hasImpressions && !hasEngagements) {
          setImportError(
            "Could not parse any impression or engagement data. The file format may be unsupported.",
          );
          return;
        }

        // ── DEMOGRAPHICS ──────────────────────────────────────────────────
        const demoSheetName = wb.SheetNames.find((s) =>
          s.toUpperCase().includes("DEMOGRAPHICS"),
        );
        const weekDemo = demoSheetName
          ? parseDemographics(wb.Sheets[demoSheetName])
          : {
              topLocations: [],
              topJobFunctions: [],
              topIndustries: [],
              topSeniority: [],
              topCompanySizes: [],
            };

        // ── Build one post per unique URL ─────────────────────────────────
        // followersByDate: followers gained on post's publish day
        const posts: LinkedInPost[] = Object.values(postMap)
          .sort(
            (a, b) =>
              b.impressions - a.impressions || b.engagements - a.engagements,
          )
          .map((p, i) => {
            const follOnDay = dailyFollowers[p.date] || 0;
            return {
              id: `post_${Date.now()}_${i}`,
              title: `LinkedIn Post — ${p.date}`,
              content: "",
              postUrl: p.url,
              likes: p.engagements, // from TOP POSTS left col = total engagements per post
              comments: 0,
              reposts: 0,
              views: p.impressions, // from TOP POSTS right col = impressions per post
              saves: 0,
              membersReached: 0,
              followersGained: follOnDay,
              profileViewers: 0,
              sends: 0,
              date: p.date,
              publishTime: "",
              reactionIcon: "none",
              tags: [],
              isWeeklyAggregate: true, // engagements = sum (reactions+comments+reposts)
              ...(weekDemo.topLocations.length
                ? { topLocations: weekDemo.topLocations }
                : {}),
              ...(weekDemo.topJobFunctions.length
                ? { topJobFunctions: weekDemo.topJobFunctions }
                : {}),
              ...(weekDemo.topIndustries.length
                ? { topIndustries: weekDemo.topIndustries }
                : {}),
              ...(weekDemo.topSeniority.length
                ? { topSeniority: weekDemo.topSeniority }
                : {}),
              ...(weekDemo.topCompanySizes.length
                ? { topCompanySizes: weekDemo.topCompanySizes }
                : {}),
            };
          });

        if (posts.length === 0) {
          setImportError("No post data found in this export.");
          return;
        }

        // ── Store totalFollowers + weeklyGrowth for account update ────────
        const totalFollGained = Object.values(dailyFollowers).reduce(
          (s, v) => s + v,
          0,
        );
        if (totalFollowers > 0) {
          setWeeklyImportMeta({ totalFollowers, totalFollGained, dateRange });
        } else {
          setWeeklyImportMeta(null);
        }

        const titles: Record<string, string> = {};
        posts.forEach((p) => {
          titles[p.id] = "";
        });
        setImportPreview(posts);
        setImportTitles(titles);
      } catch (err) {
        console.error("Excel parse error:", err);
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
    const finalPosts = importPreview.map((p) => ({
      ...p,
      title: importTitles[p.id]?.trim() || p.title,
    }));
    // Attach meta so handleAddPosts can update followers
    if (weeklyImportMeta) {
      (finalPosts as any).__weeklyMeta = weeklyImportMeta;
    }
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
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
                <Tag className="w-3 h-3" /> Tags
              </label>
              <TagsPicker value={tags} onChange={setTags} />
            </div>
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
                <strong>Per-post:</strong> Go to your post → Analytics → Export
              </p>
              <p>
                <strong>Weekly:</strong> Creator Analytics → Export (date range)
                → .xlsx
              </p>
              <p className="text-muted-foreground/70">
                Both formats auto-detected — imports posts + full demographics
              </p>
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
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Found {importPreview.length} post
                  {importPreview.length > 1 ? "s" : ""} — add a name for each:
                </p>
                {weeklyImportMeta && (
                  <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                    <span>📊</span>
                    <span>
                      Followers will update to{" "}
                      <strong>
                        {weeklyImportMeta.totalFollowers.toLocaleString()}
                      </strong>{" "}
                      · <strong>+{weeklyImportMeta.totalFollGained}</strong> new
                      followers in period
                    </span>
                  </div>
                )}
                <div className="max-h-52 overflow-y-auto space-y-3">
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
                          {fmtNum(p.views)} impr · {p.likes} react
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
                      {/* Title input */}
                      <div className="px-3 pb-3 pt-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Post Name / Topic
                        </label>
                        <input
                          value={importTitles[p.id] ?? ""}
                          onChange={(e) =>
                            setImportTitles((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="e.g. 5 AI Trends for Insurance Brokers"
                          className="w-full px-3 py-2.5 rounded-xl bg-card border border-primary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
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
  const [content, setContent] = useState(post.content ?? "");
  const [postUrl, setPostUrl] = useState(post.postUrl ?? "");
  const [views, setViews] = useState(String(post.views));
  const [likes, setLikes] = useState(String(post.likes));
  const [comments, setComments] = useState(String(post.comments));
  const [reposts, setReposts] = useState(String(post.reposts));
  const [saves, setSaves] = useState(String(post.saves ?? ""));
  const [membersReached, setMembersReached] = useState(
    String(post.membersReached ?? ""),
  );
  const [followersGained, setFollowersGained] = useState(
    String(post.followersGained ?? ""),
  );
  const [date, setDate] = useState(post.date);
  const [reactionIcon, setReactionIcon] = useState(post.reactionIcon ?? "none");
  const [showPicker, setShowPicker] = useState(false);
  const [tags, setTags] = useState<string[]>(post.tags ?? []);
  const selectedReaction =
    REACTION_ICONS.find((r) => r.id === reactionIcon) ?? REACTION_ICONS[0];

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...post,
      title: title.trim(),
      content,
      postUrl,
      views: parseInt(views) || 0,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      reposts: parseInt(reposts) || 0,
      saves: parseInt(saves) || 0,
      membersReached: parseInt(membersReached) || 0,
      followersGained: parseInt(followersGained) || 0,
      date,
      reactionIcon,
      tags,
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
              Post Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Post content..."
              className={inputCls + " resize-none"}
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
              <Tag className="w-3 h-3" /> Tags
            </label>
            <TagsPicker value={tags} onChange={setTags} />
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
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground line-clamp-2">
                {post.title}
              </h3>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {post.tags.map((tid) => {
                    const tag = CONTENT_TAGS.find((t) => t.id === tid);
                    return tag ? (
                      <span
                        key={tid}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${tag.color}`}
                      >
                        {tag.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
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
        <div
          className="p-5 space-y-4 max-h-[75vh] overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "transparent transparent",
          }}
        >
          {/* Post content — formatted with whitespace-pre-wrap */}
          {post.content && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Post Content
              </p>
              <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-normal">
                {post.content}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                label: "Impressions",
                value: fmtNum(post.views),
                icon: "👁",
                primary: true,
              },
              {
                label: post.isWeeklyAggregate
                  ? "Engagements (sum)"
                  : "Reactions",
                value: fmtNum(post.likes),
                icon: post.isWeeklyAggregate ? "📊" : "👍",
              },
              {
                label: "Comments",
                value: post.isWeeklyAggregate ? "—" : fmtNum(post.comments),
                icon: "💬",
              },
              {
                label: "Reposts",
                value: post.isWeeklyAggregate ? "—" : fmtNum(post.reposts),
                icon: "🔁",
              },
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
          {post.isWeeklyAggregate && (
            <div className="px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-500/20 text-xs text-violet-400/80 flex items-center gap-2">
              <span className="font-bold text-violet-400">sum</span>
              <span>
                Engagement = sum of all interactions (weekly export — reactions,
                comments, reposts combined)
              </span>
            </div>
          )}
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
            <div className="px-3 py-2 rounded-xl bg-sky-500/8 border border-sky-500/20 text-xs text-sky-400/90">
              +{post.followersGained} followers from this post
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Account Insights Overlay ─────────────────────────────────────────────────
function AccountInsightsOverlay({
  account,
  onClose,
}: {
  account: LinkedInAccount;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden"
        >
          {/* Top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  className="w-10 h-10 rounded-xl object-cover"
                  alt=""
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: getAvatarBg(account.avatarColor) }}
                >
                  {account.avatarInitials}
                </div>
              )}
              <div>
                <p className="font-bold text-sm text-foreground">
                  {account.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Audience Insights
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div
            className="p-5 space-y-4 max-h-[75vh] overflow-y-auto"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "transparent transparent",
            }}
          >
            {/* Geography */}
            <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Geography</p>
                  <p className="text-[10px] text-muted-foreground">
                    Where your audience is from
                  </p>
                </div>
              </div>
              <GeoBubbles posts={account.posts ?? []} />
            </div>

            {/* Job Titles */}
            <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Job Titles
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Who's engaging with your content
                  </p>
                </div>
              </div>
              <JobFunctionBars posts={account.posts ?? []} />
            </div>

            {/* Industries — donut pie chart */}
            {(() => {
              const allInd: Array<{ name: string; pct: number }> = [];
              (account.posts ?? []).forEach((p) =>
                p.topIndustries?.forEach((ind) => {
                  const ex = allInd.find((x) => x.name === ind.name);
                  if (ex) ex.pct = Math.max(ex.pct, ind.pct);
                  else allInd.push({ ...ind });
                }),
              );
              if (!allInd.length) return null;
              const slices = allInd.slice(0, 6);
              const total = slices.reduce((s, i) => s + i.pct, 0) || 1;
              // Electric-blue adjacent shades — same hue family, distinct brightness
              const PIE_COLORS = [
                "#818cf8",
                "#c084fc",
                "#60a5fa",
                "#e879f9",
                "#38bdf8",
                "#a78bfa",
              ];
              return (
                <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/15 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Industries
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Sectors your audience works in
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Donut */}
                    <div className="flex-shrink-0">
                      <PieChart width={140} height={140}>
                        <Pie
                          data={slices}
                          cx={65}
                          cy={65}
                          innerRadius={38}
                          outerRadius={62}
                          dataKey="pct"
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {slices.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              fillOpacity={0.9}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            const color =
                              PIE_COLORS[slices.indexOf(d) % PIE_COLORS.length];
                            return (
                              <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-[10px] shadow-lg">
                                <p className="font-bold" style={{ color }}>
                                  {d.name}
                                </p>
                                <p className="text-muted-foreground">
                                  {d.pct}% of audience
                                </p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </div>
                    {/* Legend */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {slices.map((ind, i) => {
                        const color = PIE_COLORS[i % PIE_COLORS.length];
                        return (
                          <div
                            key={ind.name}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: color }}
                            />
                            <span className="text-[10px] text-muted-foreground truncate flex-1">
                              {ind.name}
                            </span>
                            <span
                              className="text-[10px] font-bold flex-shrink-0"
                              style={{ color }}
                            >
                              {ind.pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Seniority — waterfall bar chart, sorted descending */}
            {(() => {
              const allSen: Array<{ name: string; pct: number }> = [];
              (account.posts ?? []).forEach((p) =>
                p.topSeniority?.forEach((s) => {
                  const ex = allSen.find((x) => x.name === s.name);
                  if (ex) ex.pct = Math.max(ex.pct, s.pct);
                  else allSen.push({ ...s });
                }),
              );
              if (!allSen.length) return null;
              // Sort descending — waterfall drops level by level
              const sorted = [...allSen]
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 6);
              const maxP = sorted[0].pct;
              const SEN_COLORS = [
                "#818cf8",
                "#c084fc",
                "#60a5fa",
                "#e879f9",
                "#38bdf8",
                "#a78bfa",
              ];
              return (
                <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Seniority
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Career level of your audience
                      </p>
                    </div>
                  </div>
                  {/* Waterfall: each bar starts from the right edge of the previous — stepped down */}
                  <div className="space-y-2">
                    {sorted.map((s, i) => {
                      const color = SEN_COLORS[i % SEN_COLORS.length];
                      // Waterfall width: bar fills from left, shrinks each row
                      const barW = (s.pct / maxP) * 100;
                      // Left offset increases by a step per level = waterfall cascade
                      const leftOffset = i * 4;
                      const availableW = 100 - leftOffset;
                      const finalW = (barW / 100) * availableW;
                      return (
                        <div
                          key={s.name}
                          className="group cursor-default"
                          style={{ paddingLeft: `${leftOffset}%` }}
                        >
                          <div className="flex items-center justify-between mb-0.5 pr-1">
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color }}
                            >
                              {s.name}
                            </span>
                            <span
                              className="text-[10px] font-bold"
                              style={{ color }}
                            >
                              {s.pct}%
                            </span>
                          </div>
                          <div
                            className="h-5 rounded-full overflow-hidden"
                            style={{ background: color + "15" }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${finalW}%` }}
                              transition={{
                                delay: i * 0.08,
                                duration: 0.6,
                                ease: "easeOut",
                              }}
                              className="h-full rounded-full relative overflow-hidden group-hover:brightness-110 transition-all"
                              style={{
                                background: `linear-gradient(90deg, ${color}f0, ${color}70)`,
                                boxShadow: `0 0 8px ${color}40`,
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Post timing */}
            <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Best Posting Time
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Hour & day by avg engagement
                  </p>
                </div>
              </div>
              <PostTimingDisplay posts={account.posts ?? []} />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border text-center">
            <p className="text-[10px] text-muted-foreground/50">
              double-tap the card again to close
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({
  account,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  onExpand,
  index,
}: {
  account: LinkedInAccount;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onExpand: () => void;
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
  // Calculate last-7-days followers gained from posts
  const last7DaysFollowers = (() => {
    const cutoff = Date.now() - 7 * 86400000;
    return (account.posts ?? [])
      .filter((p) => new Date(p.date).getTime() >= cutoff)
      .reduce((s, p) => s + (p.followersGained || 0), 0);
  })();
  const bestPost =
    account.posts?.length > 0
      ? account.posts.reduce((b, p) => (p.views > b.views ? p : b))
      : null;
  const avatarBg = getAvatarBg(account.avatarColor);
  const sparkColor = getSparkColor(account.avatarColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onExpand();
      }}
      className={`relative rounded-2xl overflow-visible cursor-pointer transition-all duration-200 group ${isSelected ? "ring-2 ring-primary shadow-lg shadow-primary/10" : "hover:shadow-md hover:-translate-y-0.5"}`}
    >
      <div className="glass p-5">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0077b5]/60 via-[#0077b5]/20 to-transparent" />

        {/* Header */}
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
                style={{ background: avatarBg }}
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            {
              label: "Followers",
              value: fmtNum(account.followers),
              icon: Users,
            },
            {
              label: "Growth",
              value:
                account.followersGrowth === 0
                  ? "—"
                  : `${account.followersGrowth > 0 ? "+" : ""}${account.followersGrowth}%`,
              icon: TrendingUp,
              positive: account.followersGrowth > 0,
              negative: account.followersGrowth < 0,
            },
            account.type === "company" && account.pageVisits
              ? {
                  label: "Page Visits",
                  value: fmtNum(account.pageVisits),
                  icon: Eye,
                }
              : {
                  label: "Avg Views",
                  value: avgViews > 0 ? fmtNum(avgViews) : "–",
                  icon: Eye,
                },
            {
              label: "Engagement",
              value: totalEngagement > 0 ? fmtNum(totalEngagement) : "–",
              icon: MessageSquare,
            },
          ]
            .filter(Boolean)
            .map(({ label, value, icon: Icon, positive, negative }: any) => (
              <div
                key={label}
                className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-background/60 border border-border/60"
              >
                <Icon
                  className={`w-3 h-3 mb-0.5 ${positive ? "text-emerald-500" : negative ? "text-red-400" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-bold ${positive ? "text-emerald-500" : negative ? "text-red-400" : "text-foreground"}`}
                >
                  {value}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                  {label}
                </span>
              </div>
            ))}
        </div>

        {/* Sparkline row */}
        <div className="flex items-end justify-between min-h-[40px]">
          <div>
            {account.posts?.length >= 2 ? (
              <>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Impressions trend
                </p>
                <Sparkline posts={account.posts} color={sparkColor} />
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

        {/* Best post — 🏆 trophy */}
        {bestPost && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              🏆 Best Post
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

        {/* Double-tap hint */}
        <p className="text-[9px] text-muted-foreground/35 text-center mt-3">
          double-tap for insights
        </p>
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
                style={{ background: getAvatarBg(account.avatarColor) }}
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
                    <SortBtn
                      k="likes"
                      label={
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          React
                        </span>
                      }
                    />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    <SortBtn
                      k="comments"
                      label={
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Cmts
                        </span>
                      }
                    />
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    <SortBtn
                      k="reposts"
                      label={
                        <span className="flex items-center gap-1">
                          <Repeat2 className="w-3 h-3" />
                          Rpts
                        </span>
                      }
                    />
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
                  // Icon logic: custom reaction takes priority. Best post (no custom reaction) gets ⭐. Others get nothing.
                  const hasCustomReaction = reaction && reaction.id !== "none";
                  const isBest =
                    i === 0 && sortKey === "views" && sortDir === "desc";
                  const displayIcon = hasCustomReaction
                    ? reaction.svg
                    : isBest
                      ? "⭐"
                      : "";
                  return (
                    <tr
                      key={post.id}
                      onClick={() => setViewPost(post)}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-3.5 text-center text-base">
                        {displayIcon}
                      </td>
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {post.title}
                          </p>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {post.tags.map((tid) => {
                                const tag = CONTENT_TAGS.find(
                                  (t) => t.id === tid,
                                );
                                return tag ? (
                                  <span
                                    key={tid}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${tag.color}`}
                                  >
                                    {tag.label}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
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
                        <span className="inline-flex flex-col items-center gap-0.5">
                          {fmtNum(post.likes)}
                          {post.isWeeklyAggregate && (
                            <span className="text-[8px] font-bold px-1 py-px rounded bg-violet-500/15 text-violet-400 border border-violet-500/20 leading-none">
                              sum
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-center text-muted-foreground">
                        {post.isWeeklyAggregate ? (
                          <span className="text-muted-foreground/40 text-xs">
                            —
                          </span>
                        ) : (
                          fmtNum(post.comments)
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-center text-muted-foreground">
                        {post.isWeeklyAggregate ? (
                          <span className="text-muted-foreground/40 text-xs">
                            —
                          </span>
                        ) : (
                          fmtNum(post.reposts)
                        )}
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
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(
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
  // Keep colRef in a ref so the OAuth effect can read it without it being a dependency
  const colRefValue = workspace
    ? collection(db, "workspaces", workspace.id, "linkedinAccounts")
    : null;
  const colRef = colRefValue;
  const colRefRef = useRef(colRefValue);
  colRefRef.current = colRefValue;

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    const ref = collection(db, "workspaces", workspace.id, "linkedinAccounts");
    getDocs(ref).then((snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LinkedInAccount[];
      setAccounts(data);
      if (data.length > 0) setSelectedAccountId(data[0].id);
      setLoading(false);
    });
  }, [workspace?.id]);

  // OAuth callback handler — runs ONLY when URL params change, never on workspace load
  useEffect(() => {
    const linkedinName = searchParams.get("linkedin_name");
    const error = searchParams.get("error");

    // No OAuth params in URL at all — do nothing
    if (!linkedinName && !error) return;

    // Already handled this OAuth flow — just clear the URL
    if (oauthProcessed.current) {
      setSearchParams({});
      return;
    }

    if (error) {
      oauthProcessed.current = true;
      setToast({ msg: "LinkedIn connection failed.", type: "error" });
      setSearchParams({});
      return;
    }

    if (linkedinName) {
      oauthProcessed.current = true;
      // Snapshot all params NOW before clearing the URL
      const linkedinId = searchParams.get("linkedin_id") || "";
      const headline = searchParams.get("linkedin_headline") || "";
      const avatarUrl = searchParams.get("linkedin_avatar") || "";
      setSearchParams({});

      // Wait for workspace to be ready (it may still be loading)
      const tryConnect = () => {
        const ref = colRefRef.current;
        if (!ref) {
          // Workspace not loaded yet — retry in 300ms
          setTimeout(tryConnect, 300);
          return;
        }
        getDocs(query(ref, where("linkedinId", "==", linkedinId))).then(
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
              return;
            }
            const newAcc = {
              name: linkedinName,
              headline,
              avatarUrl,
              avatarInitials: initials(linkedinName),
              avatarColor:
                AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
              type: "personal" as const,
              followers: 0,
              followersGrowth: 0,
              profileUrl: "",
              linkedinId,
              posts: [],
            };
            addDoc(ref, { ...newAcc, createdAt: serverTimestamp() }).then(
              (docRef) => {
                const saved: LinkedInAccount = Object.freeze({
                  id: docRef.id,
                  ...newAcc,
                  createdAt: null,
                });
                // Batch: update accounts list first, THEN open modal with a stable frozen ref.
                // The key={saved.id} on AccountModal prevents any remount when accounts changes.
                setSelectedAccountId(docRef.id);
                setAccounts((prev) => [...prev, saved]);
                setEditingAccount(saved);
                setToast({
                  msg: `✅ ${linkedinName} connected! Fill in your details below.`,
                  type: "success",
                });
              },
            );
          },
        );
      };
      tryConnect();
    }
    // Only re-run when URL params actually change — NOT when workspace loads
  }, [searchParams]);

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
    // Check for weekly meta (totalFollowers from FOLLOWERS sheet)
    const meta = (posts as any).__weeklyMeta as
      | { totalFollowers: number; totalFollGained: number; dateRange: string }
      | undefined;
    const accountUpdate: Record<string, any> = { posts: updated };
    if (meta?.totalFollowers) {
      accountUpdate.followers = meta.totalFollowers;
      // Use last 7 days of followers gained as growth
      accountUpdate.followersGrowth = meta.totalFollGained;
    }
    await updateDoc(
      doc(
        db,
        "workspaces",
        workspace.id,
        "linkedinAccounts",
        selectedAccount.id,
      ),
      accountUpdate,
    );
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === selectedAccount.id
          ? {
              ...a,
              posts: updated,
              ...(meta?.totalFollowers
                ? {
                    followers: meta.totalFollowers,
                    followersGrowth: meta.totalFollGained,
                  }
                : {}),
            }
          : a,
      ),
    );
    setToast({
      msg: `✅ ${posts.length} post${posts.length > 1 ? "s" : ""} imported!${meta?.totalFollowers ? ` Followers updated to ${meta.totalFollowers.toLocaleString()}.` : ""}`,
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
            key={editingAccount.id}
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
                value:
                  displayGrowth === 0
                    ? "—"
                    : `${displayGrowth > 0 ? "+" : ""}${displayGrowth}%`,
                icon: TrendingUp,
                sub: "new followers",
                positive: displayGrowth > 0,
                negative: displayGrowth < 0,
              },
              {
                label: "Posts Tracked",
                value: String(displayPosts),
                icon: BarChart2,
                sub: "with analytics logged",
              },
            ].map(
              ({ label, value, icon: Icon, sub, positive, negative }: any) => (
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
                    className={`text-3xl font-bold tracking-tight tabular-nums ${positive ? "text-emerald-500" : negative ? "text-red-400" : "text-foreground"}`}
                  >
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {sub}
                  </p>
                </div>
              ),
            )}
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
              onExpand={() =>
                setExpandedAccountId(
                  expandedAccountId === account.id ? null : account.id,
                )
              }
              onEdit={() => setEditingAccount(account)}
              onDelete={() => handleDelete(account.id)}
            />
          ))}
        </div>
      )}

      {/* Insights overlay (double-tap) */}
      {expandedAccountId &&
        (() => {
          const acc = accounts.find((a) => a.id === expandedAccountId);
          return acc ? (
            <AccountInsightsOverlay
              account={acc}
              onClose={() => setExpandedAccountId(null)}
            />
          ) : null;
        })()}

      {/* Chart + table */}
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
                      background: getAvatarBg(selectedAccount.avatarColor),
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
} // ─── Geography Bubbles ────────────────────────────────────────────────────────
function GeoBubbles({ posts }: { posts: LinkedInPost[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const postsWithGeo = posts.filter((p) => p.topLocations?.length);
  if (!postsWithGeo.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
        <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
          <MapPin className="w-4 h-4 opacity-30 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground italic">
          No geography data yet
          <br />
          <span className="text-[10px] opacity-60">
            Import LinkedIn analytics to unlock
          </span>
        </p>
      </div>
    );
  }

  const agg: Record<string, number> = {};
  postsWithGeo.forEach((p) =>
    p.topLocations!.forEach((l) => {
      agg[l.name] = Math.max(agg[l.name] || 0, l.pct);
    }),
  );
  const locations = Object.entries(agg)
    .map(([name, pct]) => ({ name, pct }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  const maxPct = locations[0].pct;

  // Use a centered flex-wrap layout so bubbles always sit in the middle
  return (
    <div className="relative w-full rounded-xl overflow-hidden py-4">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="geo-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geo-grid)" />
      </svg>

      <div className="relative flex flex-wrap items-center justify-center gap-3 p-4">
        {locations.map((loc, i) => {
          const size = Math.min(52 + (loc.pct / maxPct) * 68, 120);
          const color = GEO_COLORS[i % GEO_COLORS.length];
          const isHov = hoveredIdx === i;

          return (
            <motion.div
              key={loc.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: isHov ? 1.07 : 1, opacity: 1 }}
              transition={{
                delay: i * 0.07,
                type: "spring",
                stiffness: 200,
                damping: 16,
              }}
              onHoverStart={() => setHoveredIdx(i)}
              onHoverEnd={() => setHoveredIdx(null)}
              style={{
                width: size,
                height: size,
                background: isHov ? color + "28" : color + "14",
                border: `1.5px solid ${color}${isHov ? "44" : "28"}`,
                borderRadius: "50%",
                cursor: "default",
                flexShrink: 0,
                transition: "background 0.2s, border-color 0.2s",
                position: "relative",
              }}
              className="flex flex-col items-center justify-center"
            >
              <span
                className="text-[12px] font-bold leading-none"
                style={{ color }}
              >
                {loc.pct}%
              </span>
              <span
                className="text-[8px] text-center px-1 leading-tight mt-0.5 font-medium"
                style={{ color: color + "bb" }}
              >
                {loc.name}
              </span>
              {isHov && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-9 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-[9px] whitespace-nowrap shadow-lg z-20 pointer-events-none"
                >
                  <span className="font-semibold" style={{ color }}>
                    {loc.name}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {loc.pct}% of audience
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
