import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Calendar,
  Plus,
  Smartphone,
  Monitor,
  Tablet,
  Smile,
  Hash,
  X,
  MessageSquare,
  Clock,
  Check,
  LayoutGrid,
  Columns,
  BarChart2,
  Layers,
  Image,
  ChevronLeft,
  ChevronRight,
  List,
  Palette,
  TrendingUp,
  FileText,
  Bold,
  Italic,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FunnelTag = "TOFU" | "MOFU" | "BOFU";
type ContentTag =
  | "Educational"
  | "Storytelling"
  | "Personal"
  | "Building in Public"
  | "Promotion";
type PostStatus = "Draft" | "Scheduled" | "Published";
type ViewMode = "cards" | "sheets" | "calendar";
type VisualType = "text" | "carousel" | "infographic" | "video";
type PreviewDevice = "desktop" | "mobile" | "tablet";
type CalendarMode = "weekly" | "monthly";

interface Comment {
  id: string;
  text: string;
}
interface CarouselSlide {
  id: string;
  headline: string;
  body: string;
}
interface SheetColumn {
  id: string;
  label: string;
}
interface Post {
  id: string;
  account: string;
  accountAvatar: string;
  accountColor: string;
  theme: string;
  content: string;
  tags: ContentTag[];
  funnel: FunnelTag;
  status: PostStatus;
  scheduledDate: string;
  scheduledTime: string;
  assignedTo: string;
  assignedAvatar: string;
  comments: Comment[];
  visualType: VisualType;
  carouselSlides: CarouselSlide[];
  infographicTitle: string;
  infographicPoints: string[];
  cardColor?: string;
  [key: string]: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    name: "Hajar Bellarbia",
    avatar: "HB",
    color: "#6366f1",
    role: "Content Creator",
    bio: "Building RuProof AI | LinkedIn Growth for B2B Founders",
    followers: 4820,
  },
  {
    name: "Founder",
    avatar: "FO",
    color: "#0ea5e9",
    role: "Co-Founder & CPO",
    bio: "Co-Founder @ RuProof AI | Insurance broker automation",
    followers: 3210,
  },
  {
    name: "CEO",
    avatar: "CE",
    color: "#8b5cf6",
    role: "CEO & Co-Founder",
    bio: "CEO @ RuProof AI | B2B SaaS | Ex-InsurTech",
    followers: 2340,
  },
];
const MEMBERS = [
  { name: "Hajar", avatar: "HB", color: "#6366f1" },
  { name: "Founder", avatar: "FO", color: "#0ea5e9" },
  { name: "CEO", avatar: "CE", color: "#8b5cf6" },
];
const CONTENT_TAGS: ContentTag[] = [
  "Educational",
  "Storytelling",
  "Personal",
  "Building in Public",
  "Promotion",
];
const FUNNEL_TAGS: FunnelTag[] = ["TOFU", "MOFU", "BOFU"];
const TAG_COLORS: Record<ContentTag, string> = {
  Educational: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Storytelling: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Personal: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "Building in Public":
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Promotion: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};
const FUNNEL_COLORS: Record<FunnelTag, string> = {
  TOFU: "bg-sky-500/15 text-sky-400",
  MOFU: "bg-orange-500/15 text-orange-400",
  BOFU: "bg-green-500/15 text-green-400",
};
const STATUS_COLORS: Record<PostStatus, string> = {
  Draft: "bg-zinc-500/20 text-zinc-400",
  Scheduled: "bg-indigo-500/20 text-indigo-400",
  Published: "bg-emerald-500/20 text-emerald-400",
};
const STATUS_HEX: Record<PostStatus, string> = {
  Draft: "#71717a",
  Scheduled: "#6366f1",
  Published: "#10b981",
};

const CARD_COLORS = [
  "#ffffff",
  "#f8fafc",
  "#fef3c7",
  "#fce7f3",
  "#ede9fe",
  "#dbeafe",
  "#d1fae5",
  "#fee2e2",
  "#fef9c3",
  "#e0f2fe",
  "#f0fdf4",
  "#fdf4ff",
  "#fff7ed",
  "#f1f5f9",
  "#e2e8f0",
  "#cbd5e1",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fb7185",
  "#818cf8",
  "#38bdf8",
];

// 250 emojis
const ALL_EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "😗",
  "😚",
  "😙",
  "🥲",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤭",
  "🤫",
  "🤔",
  "🤐",
  "🤨",
  "😐",
  "😑",
  "😶",
  "😏",
  "😒",
  "🙄",
  "😬",
  "🤥",
  "😌",
  "😔",
  "😪",
  "🤤",
  "😴",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤧",
  "🥵",
  "🥶",
  "🥴",
  "😵",
  "🤯",
  "🤠",
  "🥳",
  "🥸",
  "😎",
  "🤓",
  "🧐",
  "😭",
  "😢",
  "😤",
  "😠",
  "😡",
  "🤬",
  "💀",
  "👻",
  "👽",
  "🤖",
  "💩",
  "😺",
  "😸",
  "😹",
  "😻",
  "😼",
  "😽",
  "🙀",
  "😿",
  "😾",
  "🙈",
  "🙉",
  "🙊",
  "💥",
  "💫",
  "⭐",
  "🌟",
  "✨",
  "🔥",
  "🎯",
  "🚀",
  "💡",
  "💎",
  "🏆",
  "🎉",
  "🎊",
  "🥇",
  "🎁",
  "🎀",
  "🎈",
  "🎭",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "✌️",
  "🤞",
  "🤟",
  "🤘",
  "🤙",
  "👋",
  "🤚",
  "🖐",
  "✋",
  "🖖",
  "👇",
  "👆",
  "👉",
  "👈",
  "☝",
  "💪",
  "🦾",
  "🧠",
  "👀",
  "👁",
  "👄",
  "👃",
  "👂",
  "🦷",
  "🦴",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
  "☮",
  "✝",
  "☪",
  "🕉",
  "✡",
  "🔯",
  "🕎",
  "☯",
  "🛐",
  "♈",
  "♉",
  "♊",
  "📈",
  "📊",
  "📉",
  "💰",
  "💳",
  "🔑",
  "🗝",
  "🔐",
  "🛡",
  "⚡",
  "🌍",
  "🌎",
  "🌏",
  "🌱",
  "🌿",
  "🍀",
  "🌺",
  "🌸",
  "🌼",
  "🌻",
  "☀️",
  "🌙",
  "⭐",
  "🌈",
  "⛅",
  "🌤",
  "🌦",
  "🌧",
  "⛈",
  "🌩",
  "🌨",
  "❄",
  "🔥",
  "💧",
  "🌊",
  "🎵",
  "🎶",
  "🎸",
  "🎹",
  "🥁",
  "📱",
  "💻",
  "🖥",
  "🖨",
  "⌨",
  "🖱",
  "🖲",
  "💾",
  "💿",
  "📀",
  "📷",
  "📸",
  "📹",
  "🎬",
  "📽",
  "🎥",
  "📞",
  "☎",
  "📟",
  "📠",
  "📝",
  "📋",
  "📌",
  "📍",
  "🗓",
  "⏰",
  "⏱",
  "⏲",
  "🕐",
  "🔔",
  "📣",
  "📢",
  "🎤",
  "🎧",
  "📡",
  "🔭",
  "🔬",
  "💊",
  "🩺",
  "🧬",
];

// 150 symbols
const ALL_SYMBOLS = [
  "→",
  "←",
  "↑",
  "↓",
  "↔",
  "↗",
  "↘",
  "↙",
  "↖",
  "↕",
  "⇒",
  "⇐",
  "⇑",
  "⇓",
  "⇔",
  "⟶",
  "⟷",
  "⟹",
  "⟺",
  "➜",
  "➡",
  "⬅",
  "⬆",
  "⬇",
  "➤",
  "➥",
  "➦",
  "➧",
  "➨",
  "➩",
  "➪",
  "➫",
  "➬",
  "➭",
  "➮",
  "➯",
  "➱",
  "➲",
  "➳",
  "➵",
  "•",
  "·",
  "◆",
  "◇",
  "▸",
  "▹",
  "▪",
  "▫",
  "▲",
  "▼",
  "◀",
  "▶",
  "●",
  "○",
  "■",
  "□",
  "★",
  "☆",
  "✦",
  "✧",
  "✓",
  "✔",
  "✗",
  "✘",
  "✅",
  "❌",
  "❎",
  "☑",
  "☒",
  "⊕",
  "⊖",
  "⊗",
  "⊘",
  "⊙",
  "⊚",
  "⊛",
  "⊜",
  "⊝",
  "✏",
  "✐",
  "✑",
  "✒",
  "🖊",
  "🖋",
  "✍",
  "✂",
  "✄",
  "📌",
  "📍",
  "🔖",
  "🏷",
  "🔗",
  "📎",
  "🖇",
  "📐",
  "📏",
  "🔍",
  "🔎",
  "🔑",
  "🗝",
  "©",
  "®",
  "™",
  "℠",
  "℃",
  "℉",
  "°",
  "±",
  "×",
  "÷",
  "∞",
  "≈",
  "≠",
  "≤",
  "≥",
  "∑",
  "√",
  "∆",
  "∇",
  "∂",
  "∫",
  "∮",
  "∏",
  "∐",
  "∀",
  "∃",
  "∄",
  "∈",
  "∉",
  "∋",
  "∌",
  "⊂",
  "⊃",
  "⊄",
  "⊅",
  "⊆",
  "⊇",
  "∪",
  "∩",
  "∅",
  "【",
  "】",
  "《",
  "》",
  "「",
  "」",
  "『",
  "』",
  "〔",
  "〕",
  "〈",
  "〉",
  "…",
  "—",
  "–",
  "·",
  "※",
  "¶",
  "§",
  "†",
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
  "⑪",
  "⑫",
  "➊",
  "➋",
  "➌",
  "➍",
  "➎",
  "➏",
  "➐",
  "➑",
];

const LI_REACTIONS = [
  {
    label: "Like",
    color: "#378fe9",
    svg: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="12" fill="#378fe9" />
        <path
          d="M8 13V17M8 13C8 13 8 10 11 10C12 10 13 11 13 13V17M8 13H6V17H8M13 17H17C17.5523 17 18 16.5523 18 16V14C18 13.4477 17.5523 13 17 13H13"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    label: "Celebrate",
    color: "#44712e",
    svg: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="12" fill="#44712e" />
        <text x="12" y="16" textAnchor="middle" fontSize="11">
          🎉
        </text>
      </svg>
    ),
  },
  {
    label: "Support",
    color: "#915907",
    svg: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="12" fill="#915907" />
        <path
          d="M9 12C9 12 9.5 10 12 10C14.5 10 15 12 15 12V16C15 16 14 17 12 17C10 17 9 16 9 16V12Z"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    ),
  },
  {
    label: "Love",
    color: "#c0284c",
    svg: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="12" fill="#c0284c" />
        <path
          d="M12 17C12 17 6 13.5 6 9.5C6 7.5 7.5 6 9.5 6C10.5 6 11.5 6.5 12 7.5C12.5 6.5 13.5 6 14.5 6C16.5 6 18 7.5 18 9.5C18 13.5 12 17 12 17Z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    label: "Insightful",
    color: "#d4a017",
    svg: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="12" fill="#d4a017" />
        <circle cx="12" cy="9" r="3" fill="white" />
        <rect x="10" y="13" width="4" height="5" rx="1" fill="white" />
      </svg>
    ),
  },
  {
    label: "Funny",
    color: "#d4a017",
    svg: (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="12" fill="#d4a017" />
        <circle cx="9" cy="10" r="1.5" fill="white" />
        <circle cx="15" cy="10" r="1.5" fill="white" />
        <path
          d="M8 14.5C8 14.5 9.5 17 12 17C14.5 17 16 14.5 16 14.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
  },
];

function getGradeLevel(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const syllables = words.reduce(
    (a, w) => a + Math.max(1, w.replace(/[^aeiou]/gi, "").length),
    0,
  );
  if (!words.length || !sentences.length)
    return { label: "–", color: "text-muted-foreground" };
  const fk =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59;
  if (fk < 6) return { label: "Very Easy 🟢", color: "text-emerald-500" };
  if (fk < 10) return { label: "Easy 🟢", color: "text-green-500" };
  if (fk < 14) return { label: "Medium 🟡", color: "text-yellow-500" };
  if (fk < 18) return { label: "Hard 🟠", color: "text-orange-500" };
  return { label: "Very Hard 🔴", color: "text-red-500" };
}

const INITIAL_POSTS: Post[] = [
  {
    id: "1",
    account: "Hajar Bellarbia",
    accountAvatar: "HB",
    accountColor: "#6366f1",
    theme: "AI in Insurance",
    content:
      "Most insurance brokers are still doing manually what AI can do in seconds.\n\nHere's what's changing fast →\n\n• Underwriting automation\n• Risk scoring with ML\n• Claims prediction\n\nThe brokers who adapt now won't just survive. They'll dominate.",
    tags: ["Educational"],
    funnel: "TOFU",
    status: "Published",
    scheduledDate: "2026-03-08",
    scheduledTime: "09:00",
    assignedTo: "Hajar",
    assignedAvatar: "HB",
    comments: [
      {
        id: "c1",
        text: "What's your take on AI in insurance? Drop it below 👇",
      },
      {
        id: "c2",
        text: "Sharing this with my broker network — they need to hear this.",
      },
    ],
    visualType: "text",
    carouselSlides: [],
    infographicTitle: "",
    infographicPoints: [],
    cardColor: "#dbeafe",
  },
  {
    id: "2",
    account: "CEO",
    accountAvatar: "CE",
    accountColor: "#8b5cf6",
    theme: "Case Study: 3x Lead Gen",
    content:
      "We helped a broker 3x their lead gen in 60 days.\n\nNo ads. No cold calling.\n\nJust better systems + AI tools.\n\nThread below 👇",
    tags: ["Storytelling", "Promotion"],
    funnel: "BOFU",
    status: "Draft",
    scheduledDate: "2026-03-10",
    scheduledTime: "17:00",
    assignedTo: "Hajar",
    assignedAvatar: "HB",
    comments: [
      {
        id: "c3",
        text: "Happy to share the exact playbook — just comment 'playbook'",
      },
      { id: "c4", text: "DM me for a free audit 🎯" },
    ],
    visualType: "carousel",
    carouselSlides: [
      {
        id: "s1",
        headline: "The Problem",
        body: "Most brokers rely on referrals alone.",
      },
      {
        id: "s2",
        headline: "The Solution",
        body: "AI-powered lead identification.",
      },
      { id: "s3", headline: "The Result", body: "3x leads in 60 days." },
    ],
    infographicTitle: "",
    infographicPoints: [],
    cardColor: "#ede9fe",
  },
  {
    id: "3",
    account: "Founder",
    accountAvatar: "FO",
    accountColor: "#0ea5e9",
    theme: "Building RuProof",
    content:
      "6 months ago I had a spreadsheet and a dream.\n\nToday: product, clients, and a team.\n\nHere's everything I wish I knew →",
    tags: ["Building in Public", "Personal"],
    funnel: "MOFU",
    status: "Scheduled",
    scheduledDate: "2026-03-12",
    scheduledTime: "11:00",
    assignedTo: "Hajar",
    assignedAvatar: "HB",
    comments: [
      { id: "c5", text: "What was the hardest part for you? ↓" },
      { id: "c6", text: "Follow along — weekly updates 🚀" },
      { id: "c7", text: "DM me 'journey' for the full breakdown" },
    ],
    visualType: "infographic",
    carouselSlides: [],
    infographicTitle: "6 Months Building in Public",
    infographicPoints: [
      "Month 1: Idea validation",
      "Month 2: First prototype",
      "Month 3: Beta users",
      "Month 4: First revenue",
      "Month 5: Team of 3",
      "Month 6: Launch",
    ],
    cardColor: "#d1fae5",
  },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Av({
  i,
  c,
  s = "sm",
}: {
  i: string;
  c: string;
  s?: "sm" | "md" | "lg";
}) {
  const sz =
    s === "sm"
      ? "w-6 h-6 text-[10px]"
      : s === "md"
        ? "w-8 h-8 text-xs"
        : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: c }}
    >
      {i}
    </div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────
function StatsStrip({ posts }: { posts: Post[] }) {
  const sc = posts.filter((p) => p.status === "Scheduled").length;
  const pb = posts.filter((p) => p.status === "Published").length;
  const dr = posts.filter((p) => p.status === "Draft").length;
  const total = posts.length;
  return (
    <div className="grid grid-cols-4 gap-3 flex-shrink-0">
      {[
        {
          label: "Total Posts",
          value: total,
          color: "#6366f1",
          bg: "bg-indigo-50 dark:bg-indigo-500/10",
          text: "text-indigo-600 dark:text-indigo-400",
        },
        {
          label: "Scheduled",
          value: sc,
          color: "#6366f1",
          bg: "bg-indigo-50 dark:bg-indigo-500/10",
          text: "text-indigo-600 dark:text-indigo-400",
        },
        {
          label: "Published",
          value: pb,
          color: "#10b981",
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "Drafts",
          value: dr,
          color: "#71717a",
          bg: "bg-zinc-50 dark:bg-zinc-500/10",
          text: "text-zinc-600 dark:text-zinc-400",
        },
      ].map((s) => (
        <div
          key={s.label}
          className={`rounded-xl px-4 py-3 ${s.bg} border border-border shadow-soft`}
        >
          <p className="text-[11px] text-muted-foreground mb-1 font-medium">
            {s.label}
          </p>
          <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
          {total > 0 && (
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  width: `${Math.round((s.value / total) * 100)}%`,
                  backgroundColor: s.color,
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Carousel Preview ─────────────────────────────────────────────────────────
function CarouselPrev({
  slides,
  account,
}: {
  slides: CarouselSlide[];
  account: (typeof ACCOUNTS)[0];
}) {
  const [idx, setIdx] = useState(0);
  if (!slides.length)
    return (
      <div className="h-24 rounded-xl bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
        Add slides below
      </div>
    );
  const slide = slides[Math.min(idx, slides.length - 1)];
  return (
    <div>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg,${account.color}22,${account.color}44)`,
          border: `1px solid ${account.color}33`,
        }}
      >
        <div className="p-4 min-h-[100px] flex flex-col justify-between">
          <div className="flex justify-between mb-2">
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: account.color }}
            >
              {account.name}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {idx + 1}/{slides.length}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              {slide.headline}
            </h3>
            <p className="text-xs text-muted-foreground">{slide.body}</p>
          </div>
        </div>
        <div className="h-0.5 bg-black/10">
          <div
            className="h-full transition-all"
            style={{
              width: `${((idx + 1) / slides.length) * 100}%`,
              backgroundColor: account.color,
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <button
          onClick={() => setIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="p-1 rounded bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        </button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? "12px" : "5px",
                height: "5px",
                borderRadius: "3px",
                backgroundColor: i === idx ? account.color : "#94a3b8",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx(Math.min(slides.length - 1, idx + 1))}
          disabled={idx === slides.length - 1}
          className="p-1 rounded bg-muted disabled:opacity-30"
        >
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ─── Infographic Preview ──────────────────────────────────────────────────────
function InfoPrev({
  title,
  points,
  account,
}: {
  title: string;
  points: string[];
  account: (typeof ACCOUNTS)[0];
}) {
  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: `${account.color}33` }}
    >
      <div
        className="px-3 py-2 text-center"
        style={{
          background: `linear-gradient(135deg,${account.color},${account.color}bb)`,
        }}
      >
        <p className="text-xs font-bold text-white">
          {title || "Infographic Title"}
        </p>
      </div>
      <div className="p-2 space-y-1.5 bg-muted/20">
        {(points.length ? points : ["Point 1", "Point 2", "Point 3"]).map(
          (p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: account.color }}
              >
                {i + 1}
              </div>
              <span className="text-[11px] text-foreground">{p}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ─── LinkedIn Preview ─────────────────────────────────────────────────────────
const DEVICE_WIDTHS = { desktop: 552, tablet: 420, mobile: 375 };

function LIPreview({
  post,
  account,
  device,
  comments,
  visualType,
  carouselSlides,
  infographicTitle,
  infographicPoints,
}: {
  post: string;
  account: (typeof ACCOUNTS)[0];
  device: PreviewDevice;
  comments: Comment[];
  visualType: VisualType;
  carouselSlides: CarouselSlide[];
  infographicTitle: string;
  infographicPoints: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeR, setActiveR] = useState<string | null>(null);
  const [showR, setShowR] = useState(false);
  const lines = post.split("\n");
  const prev = lines.slice(0, 4).join("\n");
  const hasMore = lines.length > 4;
  const validComments = comments.filter((c) => c.text.trim());

  return (
    <div
      className="mx-auto transition-all duration-300"
      style={{ width: `${DEVICE_WIDTHS[device]}px`, maxWidth: "100%" }}
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-soft">
        {/* Header */}
        <div className="p-3 flex items-start gap-2.5">
          <Av i={account.avatar} c={account.color} s="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {account.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {account.bio}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Just now · 🌐
            </p>
          </div>
          <div className="text-muted-foreground text-base leading-none">
            ···
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-2">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {expanded || !hasMore ? post : prev}
            {!expanded && hasMore && (
              <button
                onClick={() => setExpanded(true)}
                className="text-primary hover:opacity-80 ml-1 font-medium"
              >
                ...see more
              </button>
            )}
          </p>
        </div>

        {/* Visuals */}
        {visualType === "carousel" && carouselSlides.length > 0 && (
          <div className="px-3 pb-2">
            <CarouselPrev slides={carouselSlides} account={account} />
          </div>
        )}
        {visualType === "infographic" && (
          <div className="px-3 pb-2">
            <InfoPrev
              title={infographicTitle}
              points={infographicPoints}
              account={account}
            />
          </div>
        )}
        {visualType === "video" && (
          <div className="mx-3 mb-2 h-36 bg-muted rounded-lg flex items-center justify-center border border-border">
            <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[16px] border-l-foreground border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/30">
          <span className="flex items-center gap-1">
            <div className="flex -space-x-0.5">
              {LI_REACTIONS.slice(0, 3).map((r) => (
                <div
                  key={r.label}
                  className="w-4 h-4 rounded-full overflow-hidden"
                >
                  {r.svg}
                </div>
              ))}
            </div>
            <span className="ml-1">
              {activeR ? "You and 41 others" : "42 reactions"}
            </span>
          </span>
          <span>8 comments · 3 reposts</span>
        </div>

        {/* Action buttons */}
        <div className="px-2 py-1 grid grid-cols-4 border-t border-border/30 relative">
          <div
            className="relative"
            onMouseEnter={() => setShowR(true)}
            onMouseLeave={() => setShowR(false)}
          >
            {showR && (
              <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-card rounded-full px-2 py-1.5 shadow-soft border border-border z-20">
                {LI_REACTIONS.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setActiveR(r.label)}
                    title={r.label}
                    className={`w-8 h-8 p-0.5 rounded-full hover:scale-125 transition-transform ${activeR === r.label ? "scale-125" : ""}`}
                  >
                    {r.svg}
                  </button>
                ))}
              </div>
            )}
            <button
              className={`w-full py-2 text-xs text-center rounded-lg hover:bg-muted/50 flex items-center justify-center gap-1 transition-colors ${activeR ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              {activeR ? (
                <>
                  <div className="w-4 h-4 rounded-full overflow-hidden">
                    {LI_REACTIONS.find((r) => r.label === activeR)?.svg}
                  </div>
                  {activeR}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                    <path
                      d="M8 13V17M8 13C8 13 8 10 11 10C12 10 13 11 13 13V17M8 13H6V17H8M13 17H17C17.5523 17 18 16.5523 18 16V14C18 13.4477 17.5523 13 17 13H13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Like
                </>
              )}
            </button>
          </div>
          {[
            ["💬", "Comment"],
            ["🔁", "Repost"],
            ["📤", "Send"],
          ].map(([e, a]) => (
            <button
              key={a}
              className="py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors text-center"
            >
              {e} {a}
            </button>
          ))}
        </div>

        {/* Comments preview */}
        {validComments.length > 0 && (
          <div className="px-3 py-3 border-t border-border/30 space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Comments Preview
            </p>
            {validComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Av i={account.avatar} c={account.color} />
                <div className="flex-1 bg-muted/40 rounded-xl p-2.5">
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    {account.name}
                  </p>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {comment.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {LI_REACTIONS.slice(0, 3).map((r) => (
                      <button
                        key={r.label}
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden">
                          {r.svg}
                        </div>
                        {r.label}
                      </button>
                    ))}
                    <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const bg = post.cardColor || "transparent";
  const isLight = bg !== "transparent";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="rounded-xl overflow-hidden shadow-soft hover:shadow-md transition-all cursor-pointer border border-border/60 hover:border-primary/30"
      style={{
        backgroundColor: isLight ? bg : undefined,
        backdropFilter: isLight ? undefined : "blur(12px)",
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Av i={post.accountAvatar} c={post.accountColor} />
            <span className="text-xs font-medium text-foreground truncate max-w-[90px]">
              {post.account.split(" ")[0]}
            </span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status]}`}
          >
            {post.status}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-foreground mb-1.5 line-clamp-1">
          {post.theme}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {post.content}
        </p>
        {post.visualType !== "text" && (
          <div className="mb-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 w-fit">
            {post.visualType === "carousel" && (
              <>
                <Layers className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] text-indigo-500 font-medium">
                  Carousel · {post.carouselSlides.length} slides
                </span>
              </>
            )}
            {post.visualType === "infographic" && (
              <>
                <BarChart2 className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-500 font-medium">
                  Infographic
                </span>
              </>
            )}
            {post.visualType === "video" && (
              <>
                <Image className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] text-rose-500 font-medium">
                  Video
                </span>
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TAG_COLORS[tag]}`}
            >
              {tag}
            </span>
          ))}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${FUNNEL_COLORS[post.funnel]}`}
          >
            {post.funnel}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {post.scheduledDate}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {post.comments.filter((c) => c.text).length > 0 && (
              <div className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {post.comments.filter((c) => c.text).length}
                </span>
              </div>
            )}
            <Av i={post.assignedAvatar} c="#6366f1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────
function EditorModal({
  post,
  onClose,
  onSave,
}: {
  post: Post | null;
  onClose: () => void;
  onSave: (p: Post) => void;
}) {
  const isNew = !post;
  const [content, setContent] = useState(post?.content ?? "");
  const [theme, setTheme] = useState(post?.theme ?? "");
  const [selAcc, setSelAcc] = useState(post?.account ?? ACCOUNTS[0].name);
  const [selTags, setSelTags] = useState<ContentTag[]>(post?.tags ?? []);
  const [selFunnel, setSelFunnel] = useState<FunnelTag>(post?.funnel ?? "TOFU");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "Draft");
  const [date, setDate] = useState(post?.scheduledDate ?? "");
  const [time, setTime] = useState(post?.scheduledTime ?? "09:00");
  const [assignedTo, setAssignedTo] = useState(post?.assignedTo ?? "Hajar");
  const [comments, setComments] = useState<Comment[]>(
    post?.comments?.length ? post.comments : [{ id: "1", text: "" }],
  );
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSym, setShowSym] = useState(false);
  const [visualType, setVisualType] = useState<VisualType>(
    post?.visualType ?? "text",
  );
  const [slides, setSlides] = useState(post?.carouselSlides ?? []);
  const [infoTitle, setInfoTitle] = useState(post?.infographicTitle ?? "");
  const [infoPoints, setInfoPoints] = useState<string[]>(
    post?.infographicPoints ?? [""],
  );
  const [cardColor, setCardColor] = useState(post?.cardColor ?? "");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const acc = ACCOUNTS.find((a) => a.name === selAcc) ?? ACCOUNTS[0];
  const grade = getGradeLevel(content);
  const cc = content.length;
  const ccColor =
    cc > 2800
      ? "text-red-500"
      : cc > 2000
        ? "text-orange-500"
        : cc > 1000
          ? "text-yellow-500"
          : "text-muted-foreground";

  // ── Insert at cursor ──
  const ins = (t: string) => {
    const el = taRef.current;
    if (el) {
      el.focus();
      const s = el.selectionStart ?? content.length;
      const e = el.selectionEnd ?? content.length;
      const newVal = content.slice(0, s) + t + content.slice(e);
      setContent(newVal);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + t.length, s + t.length);
      });
    } else {
      setContent((p) => p + t);
    }
    setShowEmoji(false);
    setShowSym(false);
  };

  // ── Rich text helpers ──
  const wrapSelection = (before: string, after: string) => {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart,
      e = el.selectionEnd;
    const selected = content.slice(s, e);
    const newVal =
      content.slice(0, s) + before + selected + after + content.slice(e);
    setContent(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        s + before.length,
        s + before.length + selected.length,
      );
    });
  };

  const insertBullet = () => {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", s - 1) + 1;
    const before = content.slice(0, lineStart);
    const after = content.slice(lineStart);
    setContent(before + "• " + after);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart + 2, lineStart + 2);
    });
  };

  const save = () => {
    const saved: Post = {
      id: post?.id ?? Date.now().toString(),
      account: selAcc,
      accountAvatar: acc.avatar,
      accountColor: acc.color,
      theme,
      content,
      tags: selTags,
      funnel: selFunnel,
      status,
      scheduledDate: date,
      scheduledTime: time,
      assignedTo,
      assignedAvatar:
        MEMBERS.find((m) => m.name === assignedTo)?.avatar ?? "HB",
      comments: comments.filter((c) => c.text.trim()),
      visualType,
      carouselSlides: slides,
      infographicTitle: infoTitle,
      infographicPoints: infoPoints.filter((p) => p.trim()),
      cardColor,
    };
    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-[98vw] h-[94vh] bg-card rounded-2xl border border-border shadow-soft flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg gradient-primary">
              <PenTool className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold font-display text-foreground text-sm">
                {isNew ? "New Post" : "Edit Post"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Compose · Preview · Schedule
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status === "Scheduled" && date && (
              <button
                onClick={() => {
                  const t2 = encodeURIComponent(`📝 ${theme} — ${selAcc}`);
                  const b = encodeURIComponent(
                    `POST:\n${content}\n\nCOMMENTS:\n${comments
                      .filter((c) => c.text)
                      .map((c, i) => `${i + 1}. ${c.text}`)
                      .join("\n")}`,
                  );
                  const d2 = date.replace(/-/g, "");
                  const t3 = time.replace(":", "") + "00";
                  window.open(
                    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t2}&details=${b}&dates=${d2}T${t3}/${d2}T${t3}`,
                    "_blank",
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium hover:bg-emerald-500/20"
              >
                <Calendar className="w-3.5 h-3.5" />
                Google Calendar
              </button>
            )}
            <button
              onClick={save}
              className="gradient-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* ── Left Settings Panel ── */}
          <div className="w-52 flex-shrink-0 border-r border-border overflow-y-auto p-3 space-y-4">
            {/* Post As */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Post As
              </p>
              {ACCOUNTS.map((a) => (
                <button
                  key={a.name}
                  onClick={() => setSelAcc(a.name)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left mb-1 ${selAcc === a.name ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                >
                  <Av i={a.avatar} c={a.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {a.name.split(" ")[0]}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{a.role}</p>
                  </div>
                  {selAcc === a.name && (
                    <Check className="w-3 h-3 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Writing for */}
            <div className="px-2 py-2 rounded-lg bg-muted/30 border border-border">
              <p className="text-[9px] text-muted-foreground mb-0.5">
                Writing for
              </p>
              <p className="text-[10px] font-semibold text-foreground">
                {acc.name}
              </p>
              <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                {acc.bio}
              </p>
              <p className="text-[9px] text-primary mt-1">
                {acc.followers.toLocaleString()} followers
              </p>
            </div>

            {/* Card Color */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Card Color
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors w-full"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{
                      backgroundColor: cardColor || "transparent",
                      backgroundImage: cardColor
                        ? "none"
                        : "linear-gradient(135deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(135deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%)",
                      backgroundSize: "6px 6px",
                      backgroundPosition: "0 0,3px 3px",
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {cardColor ? "Custom color" : "No color"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card rounded-xl border border-border shadow-soft z-20 w-full">
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {CARD_COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            setCardColor(col);
                            setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${cardColor === col ? "border-primary scale-110" : "border-transparent"}`}
                          style={{
                            backgroundColor: col,
                            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setCardColor("");
                        setShowColorPicker(false);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center py-1 hover:bg-muted rounded"
                    >
                      Clear color
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content Tags */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Content Type
              </p>
              <div className="flex flex-wrap gap-1">
                {CONTENT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelTags((p) =>
                        p.includes(tag)
                          ? p.filter((t) => t !== tag)
                          : [...p, tag],
                      )
                    }
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${selTags.includes(tag) ? TAG_COLORS[tag] : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Funnel */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Funnel
              </p>
              <div className="grid grid-cols-3 gap-1">
                {FUNNEL_TAGS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelFunnel(f)}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${selFunnel === f ? FUNNEL_COLORS[f] : "bg-muted/50 text-muted-foreground"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Status
              </p>
              {(["Draft", "Scheduled", "Published"] as PostStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium mb-1 ${status === s ? STATUS_COLORS[s] : "bg-muted/50 text-muted-foreground"}`}
                  >
                    {s}
                    {status === s && <Check className="w-3 h-3" />}
                  </button>
                ),
              )}
            </div>

            {/* Schedule */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Schedule
              </p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-1.5"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Assign */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Assign To
              </p>
              <div className="flex gap-1.5">
                {MEMBERS.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setAssignedTo(m.name)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg ${assignedTo === m.name ? "bg-primary/10 border border-primary/30" : "bg-muted/50 border border-transparent"}`}
                  >
                    <Av i={m.avatar} c={m.color} />
                    <span className="text-[9px] text-muted-foreground">
                      {m.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual type */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Visual
              </p>
              {(
                [
                  ["text", "Text Only", List],
                  ["carousel", "Carousel", Layers],
                  ["infographic", "Infographic", BarChart2],
                  ["video", "Video", Image],
                ] as const
              ).map(([type, label, Icon]) => (
                <button
                  key={type}
                  onClick={() => setVisualType(type as VisualType)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium mb-1 ${visualType === type ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground"}`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Center Compose ── */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border min-w-0">
            {/* Compose toolbar */}
            <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-2 flex-shrink-0 flex-wrap">
              <span className="text-xs font-semibold text-foreground">
                Compose
              </span>
              <div className="flex items-center gap-0.5 ml-2 border-l border-border pl-2">
                <button
                  onClick={() => wrapSelection("**", "**")}
                  title="Bold"
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => wrapSelection("_", "_")}
                  title="Italic"
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={insertBullet}
                  title="Bullet"
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className={`ml-auto text-[10px] font-medium ${ccColor}`}>
                {cc}/3000
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted ${grade.color}`}
              >
                {grade.label}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Post theme / title..."
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-semibold"
              />

              <textarea
                ref={taRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  "Write your LinkedIn post here... ✨\n\n→ Use symbols for structure\n• Bullet points work great\n\nKeep it punchy and engaging!"
                }
                className="w-full min-h-[180px] rounded-lg bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
              />

              {/* Emoji + Symbol toolbars */}
              <div className="flex items-center gap-2 relative">
                <div className="relative">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowEmoji(!showEmoji);
                      setShowSym(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showEmoji ? "bg-primary/10 text-primary" : "bg-muted hover:bg-accent text-muted-foreground"}`}
                  >
                    <Smile className="w-3.5 h-3.5" />
                    Emojis ({ALL_EMOJIS.length})
                  </button>
                  {showEmoji && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-card rounded-xl border border-border shadow-soft z-20 grid grid-cols-10 gap-0.5 w-80 max-h-56 overflow-y-auto">
                      {ALL_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            ins(e);
                          }}
                          className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded text-base transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowSym(!showSym);
                      setShowEmoji(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showSym ? "bg-primary/10 text-primary" : "bg-muted hover:bg-accent text-muted-foreground"}`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    Symbols ({ALL_SYMBOLS.length})
                  </button>
                  {showSym && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-card rounded-xl border border-border shadow-soft z-20 grid grid-cols-8 gap-0.5 w-80 max-h-56 overflow-y-auto">
                      {ALL_SYMBOLS.map((s) => (
                        <button
                          key={s}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            ins(s);
                          }}
                          className="w-8 h-7 flex items-center justify-center hover:bg-muted rounded text-sm font-mono transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Carousel editor + live mini preview ── */}
              {visualType === "carousel" && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 overflow-hidden">
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Carousel Slides
                    </p>
                    <button
                      onClick={() =>
                        setSlides((p) => [
                          ...p,
                          { id: Date.now().toString(), headline: "", body: "" },
                        ])
                      }
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium hover:bg-indigo-500/30"
                    >
                      <Plus className="w-3 h-3" />
                      Add Slide
                    </button>
                  </div>
                  <div className="flex gap-0 min-h-[180px]">
                    {/* Editor left */}
                    <div className="flex-1 p-3 space-y-2 border-r border-border overflow-y-auto max-h-64">
                      {slides.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Add your first slide →
                        </p>
                      )}
                      {slides.map((sl, i) => (
                        <div
                          key={sl.id}
                          className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Slide {i + 1}
                            </span>
                            <button
                              onClick={() =>
                                setSlides((p) =>
                                  p.filter((s) => s.id !== sl.id),
                                )
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <input
                            value={sl.headline}
                            onChange={(e) =>
                              setSlides((p) =>
                                p.map((s) =>
                                  s.id === sl.id
                                    ? { ...s, headline: e.target.value }
                                    : s,
                                ),
                              )
                            }
                            placeholder="Headline..."
                            className="w-full px-2 py-1 rounded bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                          />
                          <textarea
                            value={sl.body}
                            onChange={(e) =>
                              setSlides((p) =>
                                p.map((s) =>
                                  s.id === sl.id
                                    ? { ...s, body: e.target.value }
                                    : s,
                                ),
                              )
                            }
                            placeholder="Body text..."
                            rows={2}
                            className="w-full rounded bg-muted/50 border border-border px-2 py-1 text-xs text-foreground focus:outline-none resize-none"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Live mini preview right */}
                    <div className="w-44 flex-shrink-0 p-3 bg-muted/10 flex flex-col gap-2">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Live Preview
                      </p>
                      <CarouselPrev slides={slides} account={acc} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Infographic editor + live mini preview ── */}
              {visualType === "infographic" && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 overflow-hidden">
                  <div className="bg-amber-50 dark:bg-amber-500/10 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Infographic Builder
                    </p>
                    <button
                      onClick={() => setInfoPoints((p) => [...p, ""])}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium hover:bg-amber-500/30"
                    >
                      <Plus className="w-3 h-3" />
                      Add Point
                    </button>
                  </div>
                  <div className="flex gap-0 min-h-[160px]">
                    {/* Editor left */}
                    <div className="flex-1 p-3 space-y-2 border-r border-border overflow-y-auto max-h-64">
                      <input
                        value={infoTitle}
                        onChange={(e) => setInfoTitle(e.target.value)}
                        placeholder="Infographic title..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                      />
                      {infoPoints.map((pt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: acc.color }}
                          >
                            {i + 1}
                          </div>
                          <input
                            value={pt}
                            onChange={(e) =>
                              setInfoPoints((p) =>
                                p.map((x, j) => (j === i ? e.target.value : x)),
                              )
                            }
                            placeholder={`Point ${i + 1}...`}
                            className="flex-1 px-2 py-1 rounded bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <button
                            onClick={() =>
                              setInfoPoints((p) => p.filter((_, j) => j !== i))
                            }
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Live mini preview right */}
                    <div className="w-44 flex-shrink-0 p-3 bg-muted/10 flex flex-col gap-2">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Live Preview
                      </p>
                      <InfoPrev
                        title={infoTitle}
                        points={infoPoints.filter((p) => p)}
                        account={acc}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Image upload ── */}
              {visualType === "video" && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 overflow-hidden">
                  <div className="bg-rose-50 dark:bg-rose-500/10 px-3 py-2">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5" />
                      Image / Video
                    </p>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] bg-muted/10">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Image/video will be added when posting to LinkedIn
                      <br />
                      <span className="text-[10px]">
                        Upload directly in LinkedIn after copying post
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    Comments
                    <span className="text-[9px] text-muted-foreground font-normal">
                      (post on your own post to boost reach)
                    </span>
                  </p>
                  <button
                    onClick={() =>
                      setComments((p) => [
                        ...p,
                        { id: Date.now().toString(), text: "" },
                      ])
                    }
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                {comments.map((c, i) => (
                  <div key={c.id} className="flex items-start gap-2 mb-2">
                    <span className="text-[10px] text-muted-foreground mt-2.5 w-4 flex-shrink-0">
                      #{i + 1}
                    </span>
                    <textarea
                      value={c.text}
                      onChange={(e) =>
                        setComments((p) =>
                          p.map((x) =>
                            x.id === c.id ? { ...x, text: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder={`Comment ${i + 1}...`}
                      rows={2}
                      className="flex-1 rounded-lg bg-muted/50 border border-border px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                    <button
                      onClick={() =>
                        setComments((p) => p.filter((x) => x.id !== c.id))
                      }
                      className="mt-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Preview ── */}
          <div className="w-[580px] flex-shrink-0 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-semibold text-foreground mr-auto">
                Preview
              </span>
              {(
                [
                  ["desktop", Monitor, 552],
                  ["tablet", Tablet, 420],
                  ["mobile", Smartphone, 375],
                ] as const
              ).map(([d, Icon, px]) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  title={`${px}px`}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] transition-colors ${device === d ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {px}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
              <LIPreview
                post={content || "Your post will appear here..."}
                account={acc}
                device={device}
                comments={comments}
                visualType={visualType}
                carouselSlides={slides}
                infographicTitle={infoTitle}
                infographicPoints={infoPoints.filter((p) => p)}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const INITIAL_SHEET_COLS: SheetColumn[] = [
  { id: "account", label: "Account" },
  { id: "theme", label: "Theme" },
  { id: "tags", label: "Tags" },
  { id: "funnel", label: "Funnel" },
  { id: "status", label: "Status" },
  { id: "scheduledDate", label: "Date" },
  { id: "assignedTo", label: "Assigned" },
  { id: "comments", label: "Comments" },
];

export default function ContentStudioPage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [view, setView] = useState<ViewMode>("cards");
  const [editing, setEditing] = useState<Post | null | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<PostStatus | "All">("All");
  const [filterAcc, setFilterAcc] = useState("All");
  const [calMode, setCalMode] = useState<CalendarMode>("monthly");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [sheetCols, setSheetCols] = useState<SheetColumn[]>(INITIAL_SHEET_COLS);
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    postId: string;
    col: string;
  } | null>(null);
  const [cellValue, setCellValue] = useState("");

  const filtered = posts.filter(
    (p) =>
      (filterStatus === "All" || p.status === filterStatus) &&
      (filterAcc === "All" || p.account === filterAcc),
  );
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Week starting March 9 (today)
  const WEEK_DAYS = [9, 10, 11, 12, 13, 14, 15];

  const dropOnDay = (dayKey: string) => {
    if (!dragging) return;
    setPosts((p) =>
      p.map((x) =>
        x.id === dragging
          ? { ...x, scheduledDate: `2026-03-${dayKey.padStart(2, "0")}` }
          : x,
      ),
    );
    setDragging(null);
    setDragOver(null);
  };

  const renderCell = (post: Post, col: string) => {
    const isEditing =
      editingCell?.postId === post.id && editingCell?.col === col;
    if (col === "account")
      return (
        <div className="flex items-center gap-1.5">
          <Av i={post.accountAvatar} c={post.accountColor} />
          <span className="text-xs">{post.account.split(" ")[0]}</span>
        </div>
      );
    if (col === "tags")
      return (
        <div className="flex gap-1 flex-wrap">
          {post.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TAG_COLORS[t]}`}
            >
              {t}
            </span>
          ))}
        </div>
      );
    if (col === "funnel")
      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FUNNEL_COLORS[post.funnel as FunnelTag]}`}
        >
          {post.funnel}
        </span>
      );
    if (col === "status")
      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status as PostStatus]}`}
        >
          {post.status}
        </span>
      );
    if (col === "assignedTo")
      return (
        <Av i={(post[col] ?? "HB").slice(0, 2).toUpperCase()} c="#6366f1" />
      );
    if (col === "comments")
      return (
        <span className="text-xs text-muted-foreground">
          {post.comments.filter((c) => c.text).length}
        </span>
      );
    if (isEditing)
      return (
        <input
          autoFocus
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          onBlur={() => {
            setPosts((p) =>
              p.map((x) => (x.id === post.id ? { ...x, [col]: cellValue } : x)),
            );
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              setPosts((p) =>
                p.map((x) =>
                  x.id === post.id ? { ...x, [col]: cellValue } : x,
                ),
              );
              setEditingCell(null);
            }
          }}
          className="w-full px-1 py-0.5 text-xs bg-primary/5 border border-primary rounded focus:outline-none text-foreground"
        />
      );
    return (
      <span
        className="text-xs text-foreground cursor-text hover:bg-muted/50 rounded px-1 py-0.5 block truncate max-w-[140px]"
        onClick={() => {
          setEditingCell({ postId: post.id, col });
          setCellValue(post[col] ?? "");
        }}
      >
        {post[col] ?? "—"}
      </span>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Content Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Write, preview, schedule and manage content for your team.
          </p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="gradient-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-soft hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Stats */}
      <StatsStrip posts={posts} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="flex bg-muted rounded-lg p-1">
          {(
            [
              ["cards", "Cards", LayoutGrid],
              ["sheets", "Sheets", Columns],
              ["calendar", "Calendar", Calendar],
            ] as const
          ).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${view === mode ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {view === "calendar" && (
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setCalMode("weekly")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${calMode === "weekly" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setCalMode("monthly")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${calMode === "monthly" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
          </div>
        )}

        <div className="flex gap-1.5">
          {(["All", "Draft", "Scheduled", "Published"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "gradient-primary text-white" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={() => setFilterAcc("All")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterAcc === "All" ? "gradient-primary text-white" : "bg-muted text-muted-foreground"}`}
          >
            All
          </button>
          {ACCOUNTS.map((a) => (
            <button
              key={a.name}
              onClick={() => setFilterAcc(a.name)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterAcc === a.name ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}
            >
              <Av i={a.avatar} c={a.color} />
              {a.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── CARDS VIEW ── */}
      {view === "cards" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-4 flex-1 overflow-x-auto pb-2"
        >
          {(["Draft", "Scheduled", "Published"] as PostStatus[]).map((col) => {
            const colPosts = filtered.filter((p) => p.status === col);
            return (
              <div
                key={col}
                className="flex-1 min-w-[280px] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_HEX[col] }}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {col}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {colPosts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditing(null)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-3 flex-1">
                  {colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => setEditing(post)}
                    />
                  ))}
                  {colPosts.length === 0 && (
                    <div className="h-24 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        No {col.toLowerCase()} posts
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── SHEETS VIEW ── */}
      {view === "sheets" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl shadow-soft overflow-auto flex-1"
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {sheetCols.map((col) => (
                  <th
                    key={col.id}
                    className="px-3 py-2.5 text-left border-r border-border/50 last:border-r-0 group"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                      {col.label}
                      <button
                        onClick={() =>
                          setSheetCols((p) => p.filter((c) => c.id !== col.id))
                        }
                        className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 w-32">
                  {showAddCol ? (
                    <input
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="Column name"
                      autoFocus
                      className="w-full px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] text-foreground focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newColName.trim()) {
                          setSheetCols((p) => [
                            ...p,
                            {
                              id: newColName.toLowerCase().replace(/\s+/g, "_"),
                              label: newColName.trim(),
                            },
                          ]);
                          setNewColName("");
                          setShowAddCol(false);
                        }
                        if (e.key === "Escape") setShowAddCol(false);
                      }}
                      onBlur={() => setShowAddCol(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddCol(true)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add column
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post, idx) => (
                <tr
                  key={post.id}
                  className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  {sheetCols.map((col) => (
                    <td
                      key={col.id}
                      className="px-3 py-2 border-r border-border/30 last:border-r-0 max-w-[160px]"
                    >
                      {renderCell(post, col.id)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setEditing(post)}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={sheetCols.length + 1} className="px-3 py-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === "calendar" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl p-4 shadow-soft flex-1 overflow-auto"
        >
          {/* Monthly */}
          {calMode === "monthly" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">March 2026</h3>
                <p className="text-xs text-muted-foreground">
                  Drag to reschedule · Click to expand
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-[11px] font-semibold text-muted-foreground text-center py-2"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const dayNum = i - 5;
                  const isValid = dayNum >= 1 && dayNum <= 31;
                  const isToday = dayNum === 10;
                  const key = String(dayNum).padStart(2, "0");
                  const dayPosts = isValid
                    ? filtered.filter((p) => {
                        const d = new Date(p.scheduledDate);
                        return d.getDate() === dayNum && d.getMonth() === 2;
                      })
                    : [];
                  return (
                    <div
                      key={i}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (isValid) setDragOver(key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => dropOnDay(key)}
                      className={`min-h-[80px] rounded-xl p-1.5 transition-all ${!isValid ? "bg-transparent" : dragOver === key ? "bg-primary/10 border-2 border-dashed border-primary/40" : "bg-muted/20 hover:bg-muted/40"}`}
                    >
                      {isValid && (
                        <>
                          <div
                            className={`inline-flex mb-1 ${isToday ? "w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold text-white" : "text-xs text-muted-foreground font-medium px-0.5"}`}
                            style={
                              isToday
                                ? {
                                    background:
                                      "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                  }
                                : {}
                            }
                          >
                            {dayNum}
                          </div>
                          {dayPosts.map((p) => (
                            <div
                              key={p.id}
                              draggable
                              onDragStart={() => setDragging(p.id)}
                              onDragEnd={() => {
                                setDragging(null);
                                setDragOver(null);
                              }}
                              onClick={() =>
                                setExpandedCard(
                                  expandedCard === p.id ? null : p.id,
                                )
                              }
                              className="mb-1 rounded-lg px-1.5 py-1 cursor-grab active:cursor-grabbing transition-all hover:opacity-90 border"
                              style={{
                                backgroundColor:
                                  p.cardColor || `${p.accountColor}15`,
                                borderColor: `${p.accountColor}40`,
                                borderLeftWidth: "3px",
                                borderLeftColor: p.accountColor,
                              }}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <Av i={p.accountAvatar} c={p.accountColor} />
                                <span className="text-[10px] font-semibold text-foreground truncate">
                                  {p.theme}
                                </span>
                              </div>
                              {expandedCard === p.id && (
                                <div className="mt-1 space-y-1">
                                  <p className="text-[9px] text-muted-foreground line-clamp-3 leading-relaxed">
                                    {p.content}
                                  </p>
                                  <div className="flex flex-wrap gap-0.5">
                                    {p.tags.slice(0, 1).map((t) => (
                                      <span
                                        key={t}
                                        className={`text-[8px] px-1 py-0.5 rounded-full border ${TAG_COLORS[t]}`}
                                      >
                                        {t}
                                      </span>
                                    ))}
                                    <span
                                      className={`text-[8px] px-1 py-0.5 rounded-full ${FUNNEL_COLORS[p.funnel]}`}
                                    >
                                      {p.funnel}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[9px] text-muted-foreground">
                                      ⏰ {p.scheduledTime}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditing(p);
                                      }}
                                      className="text-[9px] text-primary hover:underline"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Weekly — Daily Operations style */}
          {calMode === "weekly" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">
                    Week of March 9, 2026
                  </h3>
                  {(["Draft", "Scheduled", "Published"] as PostStatus[]).map(
                    (s) => (
                      <div
                        key={s}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${STATUS_HEX[s]}20` }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_HEX[s] }}
                        />
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: STATUS_HEX[s] }}
                        >
                          {s} {posts.filter((p) => p.status === s).length}
                        </span>
                      </div>
                    ),
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Drag to reschedule
                </p>
              </div>
              <div className="grid grid-cols-7 gap-3">
                {WEEK_DAYS.map((dayNum, di) => {
                  const isToday = dayNum === 10;
                  const key = String(dayNum).padStart(2, "0");
                  const dayPosts = filtered.filter((p) => {
                    const d = new Date(p.scheduledDate);
                    return d.getDate() === dayNum && d.getMonth() === 2;
                  });
                  return (
                    <div
                      key={dayNum}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => dropOnDay(key)}
                      className={`min-h-[420px] rounded-xl transition-all ${dragOver === key ? "bg-primary/5 border-2 border-dashed border-primary/40" : "bg-muted/20"}`}
                    >
                      {/* Day header */}
                      <div
                        className={`px-3 py-2.5 rounded-t-xl border-b border-border/50 ${isToday ? "gradient-primary" : ""}`}
                      >
                        <p
                          className={`text-[11px] font-semibold ${isToday ? "text-white" : "text-muted-foreground"}`}
                        >
                          {DAYS[di]}
                        </p>
                        <p
                          className={`text-lg font-bold leading-none ${isToday ? "text-white" : "text-foreground"}`}
                        >
                          {dayNum}
                        </p>
                      </div>
                      {/* Posts */}
                      <div className="p-2 space-y-2">
                        {dayPosts.map((p) => (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={() => setDragging(p.id)}
                            onDragEnd={() => {
                              setDragging(null);
                              setDragOver(null);
                            }}
                            onClick={() => setEditing(p)}
                            className="rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-border/60"
                            style={{ backgroundColor: p.cardColor || "white" }}
                          >
                            {/* Person face + name */}
                            <div className="flex items-center gap-2 mb-2">
                              <Av i={p.accountAvatar} c={p.accountColor} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-foreground truncate">
                                  {p.account.split(" ")[0]}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  {p.scheduledTime}
                                </p>
                              </div>
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}
                              >
                                {p.status}
                              </span>
                            </div>
                            {/* Theme + snippet */}
                            <p className="text-[11px] font-semibold text-foreground mb-1 line-clamp-1">
                              {p.theme}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                              {p.content}
                            </p>
                            {/* Tags */}
                            <div className="flex flex-wrap gap-0.5">
                              {p.tags.slice(0, 1).map((t) => (
                                <span
                                  key={t}
                                  className={`text-[8px] px-1.5 py-0.5 rounded-full border ${TAG_COLORS[t]}`}
                                >
                                  {t}
                                </span>
                              ))}
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded-full ${FUNNEL_COLORS[p.funnel]}`}
                              >
                                {p.funnel}
                              </span>
                            </div>
                            {/* Progress bar accent */}
                            <div
                              className="mt-2 h-0.5 rounded-full bg-black/10"
                              style={{ backgroundColor: `${p.accountColor}30` }}
                            >
                              <div
                                className="h-full rounded-full w-2/3"
                                style={{ backgroundColor: p.accountColor }}
                              />
                            </div>
                          </div>
                        ))}
                        {dayPosts.length === 0 && (
                          <button
                            onClick={() => setEditing(null)}
                            className="w-full h-16 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/30 hover:bg-primary/5 transition-all"
                          >
                            <Plus className="w-4 h-4 text-muted-foreground/40" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editing !== undefined && (
          <EditorModal
            post={editing}
            onClose={() => setEditing(undefined)}
            onSave={(saved) =>
              setPosts((p) =>
                p.some((x) => x.id === saved.id)
                  ? p.map((x) => (x.id === saved.id ? saved : x))
                  : [...p, saved],
              )
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
