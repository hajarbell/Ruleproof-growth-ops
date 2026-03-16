// src/pages/ContentStudioPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Calendar,
  Plus,
  Smartphone,
  Monitor,
  Tablet,
  Smile,
  X,
  MessageSquare,
  Clock,
  Check,
  LayoutGrid,
  Columns,
  BarChart2,
  Layers,
  Image,
  List,
  MoreHorizontal,
  Archive,
  Bold,
  Bell,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Loader2,
  Trash2,
  Tag,
  FileText,
  ImageIcon,
  AtSign,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedInAccounts } from "@/hooks/useLinkedInAccounts";
import type { LinkedInAccount } from "@/pages/LinkedInPage";
import type { WorkspaceMember } from "@/contexts/AuthContext";

// ─── 3-Chime Bell sound ───────────────────────────────────────────────────────
function playTripleChime() {
  try {
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const chime = (delay: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.5,
      );
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.5);
    };
    chime(0, 880);
    chime(0.18, 1047);
    chime(0.36, 1319);
  } catch {}
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FunnelTag = "TOFU" | "MOFU" | "BOFU";
type ContentTag =
  | "Educational"
  | "Storytelling"
  | "Personal"
  | "Building in Public"
  | "Promotion";
type PostStatus = "Draft" | "Scheduled" | "Published" | "Archived";
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

// FIX: base64 added so we can send media to LinkedIn API
interface UploadedFile {
  name: string;
  type: string;
  previewUrl: string;
  size: number;
  base64?: string;
}

interface Post {
  id: string;
  linkedinAccountId: string;
  linkedinId?: string;
  account: string;
  accountAvatar: string;
  accountColor: string;
  accountBio?: string;
  accountFollowers?: number;
  assignedToUid: string;
  assignedTo: string;
  assignedAvatar: string;
  assignmentComment?: string;
  theme: string;
  content: string;
  tags: ContentTag[];
  funnel: FunnelTag;
  status: PostStatus;
  scheduledDate: string;
  scheduledTime: string;
  comments: Comment[];
  visualType: VisualType;
  carouselSlides: CarouselSlide[];
  infographicTitle: string;
  infographicPoints: string[];
  cardColor?: string;
  gcalEventId?: string;
  publishedUrl?: string;
  archived?: boolean;
  accountAvatarUrl?: string;
  uploadedFileUrl?: string;
  mediaUrls?: string[];
  mediaBase64?: string[]; // base64-encoded media stored directly in Firestore
  mediaTypes?: string[]; // MIME types matching mediaBase64
  archivedAt?: string;
  createdAt?: any;
  [key: string]: any;
}

type EventColor = "violet" | "emerald" | "amber" | "sky" | "rose" | "indigo";
type BellSound = "chime" | "ding" | "bell";

interface CalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  assignedToUid: string;
  assignedTo: string;
  assignedAvatar: string;
  color: EventColor;
  reminders: number[];
  bellSound: BellSound;
  gcalSynced?: boolean;
  createdAt?: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EVENT_COLORS: Record<
  EventColor,
  { bg: string; border: string; text: string; hex: string }
> = {
  violet: {
    bg: "bg-violet-500/15",
    border: "border-violet-500/40",
    text: "text-violet-400",
    hex: "#8b5cf6",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    hex: "#10b981",
  },
  amber: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-400",
    hex: "#f59e0b",
  },
  sky: {
    bg: "bg-sky-500/15",
    border: "border-sky-500/40",
    text: "text-sky-400",
    hex: "#0ea5e9",
  },
  rose: {
    bg: "bg-rose-500/15",
    border: "border-rose-500/40",
    text: "text-rose-400",
    hex: "#f43f5e",
  },
  indigo: {
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/40",
    text: "text-indigo-400",
    hex: "#6366f1",
  },
};

const BELL_SOUNDS: Record<BellSound, () => void> = {
  chime: () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      (
        [
          [0, 880],
          [0.18, 1047],
          [0.36, 1319],
        ] as [number, number][]
      ).forEach(([delay, freq]) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "sine";
        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + 0.55,
        );
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.6);
      });
    } catch {}
  },
  ding: () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 1174;
      o.type = "sine";
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.start();
      o.stop(ctx.currentTime + 0.8);
    } catch {}
  },
  bell: () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      (
        [
          [0, 660],
          [0.1, 880],
          [0.2, 660],
          [0.3, 880],
        ] as [number, number][]
      ).forEach(([delay, freq]) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "triangle";
        g.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + 0.3,
        );
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.3);
      });
    } catch {}
  },
};

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
  Archived: "bg-zinc-400/15 text-zinc-400",
};
const STATUS_HEX: Record<PostStatus, string> = {
  Draft: "#71717a",
  Scheduled: "#6366f1",
  Published: "#10b981",
  Archived: "#a1a1aa",
};

const CARD_COLORS = [
  // Whites / neutrals
  "#ffffff",
  "#f1f5f9",
  // Baby pink / rose
  "#ffd6e0",
  "#ffb3c6",
  "#ff85a1",
  // Baby blue / sky
  "#bde0fe",
  "#90caf9",
  "#64b5f6",
  // Mint / green
  "#b7e4c7",
  "#95d5b2",
  "#74c69d",
  // Lavender / purple
  "#e0aaff",
  "#c77dff",
  "#9d4edd",
  // Soft yellow
  "#fff3b0",
  "#fee440",
  "#ffd60a",
  // Peach / coral
  "#ffd7ba",
  "#ffb347",
  "#ff9f1c",
  // Sky teal
  "#a0e7e5",
  "#7ee8e6",
  "#48cae4",
];

// ── THIS was floating loose — now correctly declared at module level ───────────
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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_DAYS = [9, 10, 11, 12, 13, 14, 15];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getReadingLevel(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const syllables = words.reduce(
    (a, w) => a + Math.max(1, w.replace(/[^aeiou]/gi, "").length),
    0,
  );
  const readTimeMins = Math.max(1, Math.ceil(words.length / 238));
  if (!words.length || !sentences.length)
    return {
      label: "–",
      color: "text-muted-foreground",
      grade: 0,
      readTime: "< 1 min",
    };
  const fk =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59;
  const readTime =
    readTimeMins === 1 ? "~1 min read" : `~${readTimeMins} min read`;
  if (fk < 4)
    return {
      label: "Grade 1 🟢",
      color: "text-emerald-500",
      grade: 1,
      readTime,
    };
  if (fk < 6)
    return {
      label: "Grade 2 🟢",
      color: "text-emerald-400",
      grade: 2,
      readTime,
    };
  if (fk < 8)
    return { label: "Grade 3 🟢", color: "text-green-500", grade: 3, readTime };
  if (fk < 10)
    return {
      label: "Grade 4 🟡",
      color: "text-yellow-400",
      grade: 4,
      readTime,
    };
  if (fk < 12)
    return {
      label: "Grade 5 🟡",
      color: "text-yellow-500",
      grade: 5,
      readTime,
    };
  if (fk < 14)
    return {
      label: "Grade 6 🟠",
      color: "text-orange-400",
      grade: 6,
      readTime,
    };
  if (fk < 16)
    return {
      label: "Grade 7 🟠",
      color: "text-orange-500",
      grade: 7,
      readTime,
    };
  if (fk < 18)
    return { label: "Grade 8 🔴", color: "text-red-400", grade: 8, readTime };
  return { label: "Hard 🔴", color: "text-red-500", grade: 9, readTime };
}

function memberInitials(m: { displayName?: string; email?: string }) {
  const name = m.displayName || m.email || "?";
  return name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function accountInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Av({
  i,
  c,
  s = "sm",
  photo,
}: {
  i: string;
  c: string;
  s?: "sm" | "md" | "lg";
  photo?: string;
}) {
  const sz =
    s === "sm"
      ? "w-6 h-6 text-[10px]"
      : s === "md"
        ? "w-8 h-8 text-xs"
        : "w-10 h-10 text-sm";
  if (photo)
    return (
      <img
        src={photo}
        className={`${sz} rounded-full object-cover flex-shrink-0`}
        alt=""
      />
    );
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

// ─── Post Card ────────────────────────────────────────────────────────────────
// Status → card background colors matching reference screenshot
const CARD_STATUS_BG_HEX: Record<PostStatus, { light: string; dark: string }> =
  {
    Scheduled: { light: "#ede9fe", dark: "#2e1f4f" },
    Draft: { light: "#f8fafc", dark: "#1e2535" },
    Published: { light: "#f0fdf4", dark: "#0f2a1e" },
    Archived: { light: "#f4f4f5", dark: "#1c1c20" },
  };

// 3 lifecycle stages: Draft → Scheduled → Published
const STAGE_DOTS: Record<PostStatus, number> = {
  Draft: 1,
  Scheduled: 2,
  Published: 3,
  Archived: 3,
};

function PostCard({
  post,
  onClick,
  onArchive,
  onStatusChange,
  onDragStartCard,
  onDragEndCard,
}: {
  post: Post;
  onClick: () => void;
  onArchive?: (id: string) => void;
  onStatusChange?: (id: string, status: PostStatus) => void;
  onDragStartCard?: (id: string) => void;
  onDragEndCard?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [cardExpanded, setCardExpanded] = useState<"media" | "comments" | "text" | null>(null);

  useEffect(() => {
    if (post.status !== "Scheduled" || !post.scheduledDate) return;
    const update = () => {
      const target = new Date(
        `${post.scheduledDate}T${post.scheduledTime || "09:00"}:00`,
      );
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Due now");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [post.status, post.scheduledDate, post.scheduledTime]);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const bgColors = CARD_STATUS_BG_HEX[post.status];
  const cardBg = post.cardColor || (isDark ? bgColors.dark : bgColors.light);
  // FIX: detect if card background is light so we can force dark text
  const isLightCard = (() => {
    const bg = cardBg.replace("#", "");
    if (bg.length !== 6) return !isDark;
    const r = parseInt(bg.slice(0, 2), 16);
    const g = parseInt(bg.slice(2, 4), 16);
    const b = parseInt(bg.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  })();
  const textColor = isLightCard ? "#0f172a" : "#f8fafc";
  const subTextColor = isLightCard ? "#475569" : "#94a3b8";
  const preview =
    post.content.slice(0, 120) + (post.content.length > 120 ? "…" : "");
  const dots = STAGE_DOTS[post.status];

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: isDragging ? -2 : 0,
        scale: isDragging ? 1.03 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ rotate: { duration: 0.15 }, scale: { duration: 0.15 } }}
      className="rounded-2xl overflow-visible shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative select-none"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? "0 24px 48px rgba(0,0,0,0.25)" : undefined,
        transform: isDragging ? "rotate(-1.5deg) scale(1.04)" : undefined,
        transition: "opacity 0.15s, box-shadow 0.15s",
      }}
      draggable
      onDragStart={(e) => {
        (e as unknown as DragEvent).dataTransfer?.setData("postId", post.id);
        setIsDragging(true);
        onDragStartCard?.(post.id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEndCard?.();
      }}
    >
      {/* Left accent stripe by status */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: STATUS_HEX[post.status] }}
      />

      <div className="p-4 pl-5">
        {/* Top: title + menu */}
        <div className="flex items-start justify-between gap-2 mb-2" onClick={onClick}>
          <h4
            className="text-[14px] font-bold leading-snug flex-1 line-clamp-2"
            style={{ color: textColor }}
          >
            {post.theme || post.content.slice(0, 50) || "Untitled"}
          </h4>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: isDark ? "#94a3b8" : "#64748b" }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-8 z-50 rounded-2xl border shadow-2xl overflow-hidden w-48"
                style={{
                  backgroundColor: isDark ? "#1a2235" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: isDark ? "#475569" : "#94a3b8" }}>Move to</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(["Draft", "Scheduled", "Published", "Archived"] as PostStatus[]).filter((s) => s !== post.status).map((s) => (
                      <button key={s} onClick={() => { onStatusChange?.(post.id, s); setShowMenu(false); }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                        style={{ backgroundColor: STATUS_HEX[s] + "18", color: STATUS_HEX[s] }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_HEX[s] }} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mx-3 my-1.5 h-px" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                <div className="px-2 pb-2 space-y-0.5">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onClick(); }}
                    className="w-full text-left px-3 py-2 text-[12px] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-colors font-medium"
                    style={{ color: isDark ? "#e2e8f0" : "#334155" }}
                  >
                    <span className="text-base">✏️</span> Edit post
                  </button>
                  {onArchive && (
                    <button onClick={(e) => { e.stopPropagation(); onArchive(post.id); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2 transition-colors font-medium text-amber-600 dark:text-amber-400"
                    >
                      <span className="text-base">🗄️</span> Archive
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Permanently delete this post? This cannot be undone.")) { if ((window as any).__deletePost) (window as any).__deletePost(post.id); } setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-[12px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors font-medium text-red-500"
                  >
                    <span className="text-base">🗑️</span> Delete forever
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tags row: content tags + funnel */}
        {((post.tags?.length ?? 0) > 0 || post.funnel) && (
          <div className="flex flex-wrap gap-1 mb-2" onClick={onClick}>
            {(post.tags || []).slice(0, 2).map((t) => (
              <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TAG_COLORS[t as ContentTag] || "bg-muted text-muted-foreground border-border"}`}>
                {t}
              </span>
            ))}
            {post.funnel && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${FUNNEL_COLORS[post.funnel]}`}>
                {post.funnel}
              </span>
            )}
          </div>
        )}

        {/* Content preview — 2 lines */}
        {post.content && (
          <p className="text-[12px] leading-relaxed mb-3 line-clamp-2" style={{ color: subTextColor }} onClick={onClick}>
            {post.content}
          </p>
        )}

        {/* Progress lines */}
        <div className="flex gap-1 mb-3" onClick={onClick}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[3px] rounded-full flex-1 transition-all"
              style={{ backgroundColor: i < dots ? STATUS_HEX[post.status] : isLightCard ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)" }}
            />
          ))}
        </div>

        {/* Countdown */}
        {post.status === "Scheduled" && countdown && (
          <div className="flex items-center gap-1 mb-2" onClick={onClick}>
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: STATUS_HEX["Scheduled"] }} />
            <span className="text-[10px] font-semibold" style={{ color: STATUS_HEX["Scheduled"] }}>{countdown}</span>
          </div>
        )}

        {/* Bottom row: account + member avatars + icon actions */}
        <div className="flex items-center gap-2">
          {/* Account avatar */}
          <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden shadow-sm" style={{ border: `2px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}` }} onClick={onClick}>
            {post.accountAvatarUrl ? (
              <img src={post.accountAvatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: post.accountColor || "#6366f1" }}>
                {post.accountAvatar}
              </div>
            )}
          </div>
          {/* Assigned member avatar */}
          {post.assignedAvatar && (
            <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden -ml-2 ring-1 ring-white/30" style={{ backgroundColor: post.assignedColor || "#6366f1" }} onClick={onClick}>
              {post.assignedAvatarUrl ? (
                <img src={post.assignedAvatarUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white">{post.assignedAvatar}</div>
              )}
            </div>
          )}

          <div className="flex-1" onClick={onClick} />

          {/* Icon actions */}
          <div className="flex items-center gap-1">
            {/* Media icon */}
            {(post.mediaBase64?.length ?? 0) > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCardExpanded(cardExpanded === "media" ? null : "media"); }}
                className={`p-1 rounded-lg transition-colors ${cardExpanded === "media" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="View media"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Comments icon */}
            {(post.comments?.filter((c: any) => c.text).length ?? 0) > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCardExpanded(cardExpanded === "comments" ? null : "comments"); }}
                className={`p-1 rounded-lg transition-colors flex items-center gap-0.5 ${cardExpanded === "comments" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="View comments"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[9px]">{post.comments.filter((c: any) => c.text).length}</span>
              </button>
            )}
            {/* Full text icon */}
            <button
              onClick={(e) => { e.stopPropagation(); setCardExpanded(cardExpanded === "text" ? null : "text"); }}
              className={`p-1 rounded-lg transition-colors ${cardExpanded === "text" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              title="Full text"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded panels */}
        {cardExpanded === "media" && (post.mediaBase64?.length ?? 0) > 0 && (
          <div className="mt-2 rounded-xl overflow-hidden border border-border/30">
            <img
              src={`data:${post.mediaTypes?.[0] ?? "image/jpeg"};base64,${post.mediaBase64![0]}`}
              className="w-full object-cover"
              style={{ maxHeight: 120 }}
              alt=""
            />
            {post.mediaBase64!.length > 1 && (
              <div className="px-2 py-1 text-[10px] text-muted-foreground" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                +{post.mediaBase64!.length - 1} more
              </div>
            )}
          </div>
        )}
        {cardExpanded === "comments" && (
          <div className="mt-2 space-y-1">
            {post.comments.filter((c: any) => c.text).map((c: any, i: number) => (
              <div key={c.id} className="text-[10px] px-2 py-1 rounded-lg" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: subTextColor }}>
                {i + 1}. {c.text}
              </div>
            ))}
          </div>
        )}
        {cardExpanded === "text" && (
          <div className="mt-2">
            <p className="text-[11px] leading-relaxed whitespace-pre-line" style={{ color: subTextColor }}>
              {post.content}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Archive Column ────────────────────────────────────────────────────────────
function ArchiveColumn({
  posts,
  onRestore,
  onDeleteAll,
  draggingPostId,
  onDrop,
}: {
  posts: Post[];
  onRestore: (id: string) => void;
  onDeleteAll?: () => void;
  draggingPostId?: string | null;
  onDrop?: (postId: string) => void;
}) {
  const [isDark, setIsDark] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Group by month of archivedAt
  const grouped: Record<string, Post[]> = {};
  posts.forEach((p) => {
    const raw = p.archivedAt || p.scheduledDate || "";
    const d = new Date(raw);
    const key =
      !raw || isNaN(d.getTime())
        ? "Unknown"
        : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (
    <div
      className="flex-1 min-w-[280px] flex flex-col gap-3"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (draggingPostId && onDrop) onDrop(draggingPostId);
      }}
      style={{
        outline: isDragOver ? `2px dashed ${STATUS_HEX.Archived}` : undefined,
        borderRadius: 16,
        padding: isDragOver ? 4 : 0,
        transition: "all 0.15s",
      }}
    >
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_HEX.Archived }} />
        <span className="text-sm font-semibold text-foreground">Archived</span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{posts.length}</span>
        {posts.length > 0 && onDeleteAll && (
          <button
            onClick={() => { if (window.confirm(`Permanently delete all ${posts.length} archived posts? This cannot be undone.`)) onDeleteAll(); }}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete all
          </button>
        )}
      </div>
      <div className="space-y-5 flex-1 overflow-y-auto">
        {/* Ghost drop target */}
        {isDragOver && draggingPostId && (
          <div
            className="rounded-2xl border-2 border-dashed h-20 animate-pulse"
            style={{
              borderColor: STATUS_HEX.Archived,
              backgroundColor: STATUS_HEX.Archived + "10",
            }}
          >
            <div className="h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground/60">
                Drop to archive
              </span>
            </div>
          </div>
        )}
        {posts.length === 0 && (
          <div className="h-24 rounded-xl border-2 border-dashed border-zinc-300/40 dark:border-zinc-600/30 flex items-center justify-center">
            <div className="text-center">
              <Archive className="w-4 h-4 text-muted-foreground/40 mx-auto mb-1" />
              <span className="text-xs text-muted-foreground/60">
                No archived posts
              </span>
            </div>
          </div>
        )}
        {Object.entries(grouped).map(([month, monthPosts]) => (
          <div key={month}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {month}
            </p>
            <div
              className="relative"
              style={{ minHeight: Math.min(monthPosts.length, 5) * 12 + 72 }}
            >
              {monthPosts.map((post, i) => (
                <div
                  key={post.id}
                  className="absolute w-full rounded-2xl border p-3 cursor-pointer hover:z-10 hover:shadow-md transition-all group/arch"
                  style={{
                    top: i * 12,
                    zIndex: i,
                    backgroundColor: isDark ? "#1c2030" : "#f1f5f9",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.10)",
                  }}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Restore "${post.theme || post.content.slice(0, 40)}" to Draft?`,
                      )
                    )
                      onRestore(post.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-muted-foreground line-clamp-1 flex-1">
                      {post.theme || post.content.slice(0, 40) || "Untitled"}
                    </p>
                    <span className="text-[9px] text-muted-foreground/50 opacity-0 group-hover/arch:opacity-100 transition-opacity whitespace-nowrap">
                      ↩ restore
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-1">
                    {post.account}
                  </p>
                </div>
              ))}
              <div
                style={{ height: Math.min(monthPosts.length, 5) * 12 + 72 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Google Calendar helpers ──────────────────────────────────────────────────
function buildGCalUrl(post: Post, memberEmail?: string): string {
  const assigneeName =
    post.assignedTo && post.assignedTo !== "—" ? ` (${post.assignedTo})` : "";
  const title = encodeURIComponent(
    `👤${assigneeName} — ${post.theme || post.content.slice(0, 40)}`,
  );
  const date = post.scheduledDate.replace(/-/g, "");
  const time = (post.scheduledTime || "09:00").replace(":", "") + "00";
  const dtStart = `${date}T${time}`;
  const startMin = parseInt(time.slice(2, 4));
  const endMin = (startMin + 30) % 60;
  const endHour = parseInt(time.slice(0, 2)) + (startMin + 30 >= 60 ? 1 : 0);
  const dtEnd = `${date}T${String(endHour).padStart(2, "0")}${String(endMin).padStart(2, "0")}00`;
  // FIX: include comments in GCal event description
  const commentLines = (post.comments || [])
    .filter((c) => c.text.trim())
    .map((c, i) => `${i + 1}. ${c.text}`)
    .join("\n");
  const details = encodeURIComponent(
    `📝 POST CONTENT:\n${post.content}` +
      (commentLines ? `\n\n💬 COMMENTS TO POST AFTER:\n${commentLines}` : "") +
      `\n\n👤 Assigned to: ${post.assignedTo}`,
  );
  const guests = memberEmail ? `&add=${encodeURIComponent(memberEmail)}` : "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dtStart}/${dtEnd}${guests}`;
}

function buildGCalEventUrl(ev: CalEvent, memberEmail?: string): string {
  const title = encodeURIComponent(ev.title);
  const date = ev.date.replace(/-/g, "");
  const startT = (ev.time || "09:00").replace(":", "") + "00";
  const endT = (ev.endTime || "10:00").replace(":", "") + "00";
  const dtStart = `${date}T${startT}`;
  const dtEnd = `${date}T${endT}`;
  const guests = memberEmail ? `&add=${encodeURIComponent(memberEmail)}` : "";
  const reminderText = ev.reminders.length
    ? `\n\n⏰ Reminders: ${ev.reminders.map((m) => (m < 60 ? `${m} min before` : `${m / 60}h before`)).join(", ")}`
    : "";
  const fullDetails = encodeURIComponent((ev.description || "") + reminderText);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${fullDetails}&dates=${dtStart}/${dtEnd}${guests}`;
}

// ─── Add Event Panel ──────────────────────────────────────────────────────────
function AddEventPanel({
  date,
  onClose,
  onSave,
  members,
  existingEvent,
}: {
  date: string;
  onClose: () => void;
  onSave: (ev: CalEvent) => void;
  members: WorkspaceMember[];
  existingEvent?: CalEvent;
}) {
  const [title, setTitle] = useState(existingEvent?.title ?? "");
  const [description, setDescription] = useState(
    existingEvent?.description ?? "",
  );
  const [time, setTime] = useState(existingEvent?.time ?? "09:00");
  const [endTime, setEndTime] = useState(existingEvent?.endTime ?? "10:00");
  const [assignedUid, setAssignedUid] = useState(
    existingEvent?.assignedToUid ?? members[0]?.uid ?? "",
  );
  const [color, setColor] = useState<EventColor>(
    existingEvent?.color ?? "violet",
  );
  const [reminders, setReminders] = useState<number[]>(
    existingEvent?.reminders ?? [15],
  );
  const [bellSound, setBellSound] = useState<BellSound>(
    existingEvent?.bellSound ?? "chime",
  );
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        onClose();
    };
    const tid = setTimeout(
      () => document.addEventListener("mousedown", handler),
      100,
    );
    return () => {
      clearTimeout(tid);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const toggleReminder = (mins: number) => {
    setReminders((p) =>
      p.includes(mins)
        ? p.filter((m) => m !== mins)
        : [...p, mins].sort((a, b) => a - b),
    );
  };

  const selMember = members.find((m) => m.uid === assignedUid) ?? members[0];

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    BELL_SOUNDS[bellSound]();
    const ev: CalEvent = {
      id: existingEvent?.id ?? Date.now().toString(),
      title: title.trim(),
      description,
      date,
      time,
      endTime,
      assignedToUid: selMember?.uid ?? "",
      assignedTo: selMember?.displayName || selMember?.email || "—",
      assignedAvatar: memberInitials(selMember ?? {}),
      color,
      reminders,
      bellSound,
      gcalSynced: true,
    };
    onSave(ev);
    window.open(buildGCalEventUrl(ev, selMember?.email), "_blank");
    setSaving(false);
    onClose();
  };

  const colorList: EventColor[] = [
    "violet",
    "emerald",
    "amber",
    "sky",
    "rose",
    "indigo",
  ];

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      style={{
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginTop: 4,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="h-1 w-full"
        style={{ backgroundColor: EVENT_COLORS[color].hex }}
      />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Add to {date}</p>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event or task title..."
          className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring font-medium"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description or notes... (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">
              Start
            </p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="text-muted-foreground text-xs mt-4">→</div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">
              End
            </p>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            Assign to
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {members.map((m) => {
              const ini = memberInitials(m);
              return (
                <button
                  key={m.uid}
                  onClick={() => setAssignedUid(m.uid)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-all ${assignedUid === m.uid ? "bg-primary/10 border border-primary/30 text-primary" : "bg-muted/50 border border-transparent text-muted-foreground"}`}
                >
                  {m.photoURL ? (
                    <img
                      src={m.photoURL}
                      className="w-5 h-5 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                      {ini}
                    </div>
                  )}
                  <span>
                    {m.displayName?.split(" ")[0] || m.email?.split("@")[0]}
                  </span>
                  {assignedUid === m.uid && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            Color
          </p>
          <div className="flex gap-2">
            {colorList.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-offset-card" : ""}`}
                style={{ backgroundColor: EVENT_COLORS[c].hex }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            <span className="material-symbols-outlined text-[13px] align-middle mr-1">
              notifications
            </span>
            Reminders
          </p>
          <div className="flex gap-1.5">
            {[
              { mins: 15, label: "15 min" },
              { mins: 60, label: "1 hour" },
              { mins: 120, label: "2 hours" },
            ].map(({ mins, label }) => (
              <button
                key={mins}
                onClick={() => toggleReminder(mins)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${reminders.includes(mins) ? "gradient-primary text-white" : "bg-muted/50 text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            Bell sound
          </p>
          <div className="flex gap-1.5">
            {(["chime", "ding", "bell"] as BellSound[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setBellSound(s);
                  BELL_SOUNDS[s]();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all capitalize ${bellSound === s ? "gradient-primary text-white" : "bg-muted/50 text-muted-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CalendarPlus className="w-3.5 h-3.5" />
              Create & sync to Google Calendar
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-muted-foreground/60">
          Opens Google Calendar to confirm · also saves in-app
        </p>
      </div>
    </motion.div>
  );
}

// ─── PDF Carousel Preview (pdf.js) ───────────────────────────────────────────
function PdfCarouselPreview({
  file,
}: {
  file: { name: string; previewUrl: string; size: number };
}) {
  const [pages, setPages] = React.useState<string[]>([]);
  const [slide, setSlide] = React.useState(0);
  const [title, setTitle] = React.useState(() =>
    file.name.replace(/\.pdf$/i, ""),
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPages([]);
    setSlide(0);

    (async () => {
      try {
        // Load pdf.js from CDN
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement("script");
            s.src =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = () => res();
            s.onerror = () => rej();
            document.head.appendChild(s);
          });
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument(file.previewUrl).promise;
        const rendered: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({
            canvasContext: canvas.getContext("2d")!,
            viewport,
          }).promise;
          rendered.push(canvas.toDataURL("image/jpeg", 0.85));
        }
        if (!cancelled) {
          setPages(rendered);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.previewUrl]);

  return (
    <div className="border-t border-[#e0ddd8] dark:border-[#38434f]">
      {/* Slide area — 1080x1350 LinkedIn ratio = 0.8 */}
      <div
        className="relative w-full bg-[#f3f2ef] dark:bg-[#1d2226] overflow-hidden"
        style={{ aspectRatio: "0.8" }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
            <div className="w-8 h-8 border-2 border-[#0077b5] border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] text-[#00000066] dark:text-[#ffffff66]">
              Extracting slides…
            </p>
          </div>
        ) : pages.length > 0 ? (
          <img
            src={pages[slide]}
            alt={`Slide ${slide + 1}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[12px] text-[#00000066]">Could not render PDF</p>
          </div>
        )}
        {/* Prev / Next */}
        {pages.length > 1 && slide > 0 && (
          <button
            onClick={() => setSlide((s) => s - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1d2226]/90 shadow-md flex items-center justify-center text-[#00000099] text-xl hover:scale-105 transition-transform"
          >
            ‹
          </button>
        )}
        {pages.length > 1 && slide < pages.length - 1 && (
          <button
            onClick={() => setSlide((s) => s + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1d2226]/90 shadow-md flex items-center justify-center text-[#00000099] text-xl hover:scale-105 transition-transform"
          >
            ›
          </button>
        )}
        {/* Slide counter */}
        {pages.length > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
            {slide + 1} / {pages.length}
          </div>
        )}
        {/* Dot indicators */}
        {pages.length > 1 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`rounded-full transition-all ${i === slide ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
      {/* Footer — title editable + file info */}
      <div className="px-3 py-2.5 bg-white dark:bg-[#1d2226] border-t border-[#e0ddd8] dark:border-[#38434f]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a title to your document..."
          className="w-full text-[13px] font-semibold text-[#000000e6] dark:text-[#ffffffd9] bg-transparent border-none outline-none placeholder:text-[#00000044] dark:placeholder:text-[#ffffff44] mb-1"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#00000066] dark:text-[#ffffff66]">
            {pages.length > 0 ? `${pages.length} slides` : "PDF"} ·{" "}
            {Math.round(file.size / 1024)} KB
          </p>
          <button className="text-[12px] font-semibold text-[#0077b5] hover:underline">
            View
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────

// ── Image carousel for LinkedIn preview ──────────────────────────────────────
function ImageCarousel({ files }: { files: Array<{ previewUrl: string }> }) {
  const [slide, setSlide] = React.useState(0);
  return (
    <div className="relative border-t border-[#e0ddd8] dark:border-[#38434f]">
      <img
        src={files[slide].previewUrl}
        alt=""
        className="w-full object-cover block"
        style={{ maxHeight: "480px", minHeight: "200px" }}
      />
      {slide > 0 && (
        <button
          onClick={() => setSlide((s) => s - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-lg"
        >
          ‹
        </button>
      )}
      {slide < files.length - 1 && (
        <button
          onClick={() => setSlide((s) => s + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-lg"
        >
          ›
        </button>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {files.map((_, i) => (
          <div
            key={i}
            onClick={() => setSlide(i)}
            className={`rounded-full cursor-pointer transition-all ${i === slide ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
          />
        ))}
      </div>
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
        {slide + 1} / {files.length}
      </div>
    </div>
  );
}

function EditorModal({
  post,
  onClose,
  onSave,
  linkedinAccounts,
  members,
}: {
  post: Post | null;
  onClose: () => void;
  onSave: (p: Post, notifyMember: boolean, assignComment: string) => void;
  linkedinAccounts: LinkedInAccount[];
  members: WorkspaceMember[];
}) {
  const isNew = !post;
  const defaultAccount = linkedinAccounts[0];
  const { workspace } = useAuth();
  const [showFullPreview, setShowFullPreview] = React.useState(false);

  const [content, setContent] = useState(post?.content ?? "");
  // Reset preview expand when content changes
  React.useEffect(() => {
    setShowFullPreview(false);
  }, [content]);
  const [theme, setTheme] = useState(post?.theme ?? "");
  const [selAccId, setSelAccId] = useState(
    post?.linkedinAccountId ?? defaultAccount?.id ?? "",
  );
  const [selTags, setSelTags] = useState<ContentTag[]>(post?.tags ?? []);
  const [selFunnel, setSelFunnel] = useState<FunnelTag>(post?.funnel ?? "TOFU");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "Draft");
  const [date, setDate] = useState(post?.scheduledDate ?? "");
  // FIX: default time to current time, not 09:00
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [time, setTime] = useState(post?.scheduledTime ?? nowTime);
  const [assignedUid, setAssignedUid] = useState(
    post?.assignedToUid ?? members[0]?.uid ?? "",
  );
  const [comments, setComments] = useState<Comment[]>(
    post?.comments?.length ? post.comments : [{ id: "1", text: "" }],
  );
  const [cardColor, setCardColor] = useState(post?.cardColor ?? "");
  const [visualType, setVisualType] = useState<VisualType>(
    post?.visualType ?? "text",
  );
  const [slides, setSlides] = useState<CarouselSlide[]>(
    post?.carouselSlides ?? [],
  );
  const [infoTitle, setInfoTitle] = useState(post?.infographicTitle ?? "");
  const [infoPoints, setInfoPoints] = useState<string[]>(
    post?.infographicPoints ?? [""],
  );
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notifyMember, setNotifyMember] = useState(false);
  const [assignComment, setAssignComment] = useState(
    post?.assignmentComment ?? "",
  );
  const [emojiTab, setEmojiTab] = useState<"emoji" | "chars">("emoji");
  // FIX: UploadedFile now includes base64 for LinkedIn media upload
  // FIX: restore existing media when editing a saved post
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => {
    if (!post?.mediaBase64?.length) return [];
    return post.mediaBase64.map((b64: string, i: number) => ({
      name: `media_${i}`,
      type: post.mediaTypes?.[i] ?? "image/jpeg",
      previewUrl: `data:${post.mediaTypes?.[i] ?? "image/jpeg"};base64,${b64}`,
      size: 0,
      base64: b64,
    }));
  });
  // Keep uploadedFile as alias to first file for backward compat
  const uploadedFile = uploadedFiles[0] ?? null;
  const setUploadedFile = (f: UploadedFile | null) =>
    setUploadedFiles(f ? [f] : []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // FIX: GCal opt-in checkbox — user must tick to open Calendar on save
  const [openGCal, setOpenGCal] = useState(false);

  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(e.target as Node)
      )
        setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  const selAcc =
    linkedinAccounts.find((a) => a.id === selAccId) ?? defaultAccount;
  const selMember = members.find((m) => m.uid === assignedUid) ?? members[0];
  const grade = getReadingLevel(content);
  const cc = content.length;

  const ins = (t: string) => {
    const el = taRef.current;
    if (el) {
      const s = el.selectionStart ?? content.length;
      const e = el.selectionEnd ?? content.length;
      const newVal = content.slice(0, s) + t + content.slice(e);
      setContent(newVal);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + t.length, s + t.length);
      });
    } else setContent((p) => p + t);
    setShowEmoji(false);
  };

  const insertBullet = () => {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", s - 1) + 1;
    const newVal =
      content.slice(0, lineStart) + "• " + content.slice(lineStart);
    setContent(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart + 2, lineStart + 2);
    });
  };

  const insertNumberedList = () => {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", s - 1) + 1;
    const before = content.slice(0, lineStart);
    const num = (before.match(/^\d+\. /gm) || []).length + 1;
    const newVal =
      content.slice(0, lineStart) + `${num}. ` + content.slice(lineStart);
    setContent(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        lineStart + `${num}. `.length,
        lineStart + `${num}. `.length,
      );
    });
  };

  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<
    "success" | "error" | null
  >(null);

  const handlePublishToLinkedIn = async () => {
    if (!selAcc) {
      alert("No account selected.");
      return;
    }

    let token: string | undefined;
    const wsId = workspace?.id;

    console.log(
      "[Publish] wsId:",
      wsId,
      "selAcc.id:",
      selAcc.id,
      "linkedinId:",
      selAcc.linkedinId,
    );

    // 1. linkedinTokens/{linkedinId} — this is where tokens actually live
    if (wsId && selAcc.linkedinId) {
      try {
        const snap = await getDoc(
          doc(db, "workspaces", wsId, "linkedinTokens", selAcc.linkedinId),
        );
        const t = snap.data()?.accessToken;
        if (t && t.length > 10) {
          token = t;
          console.log("[Publish] ✅ linkedinTokens/", selAcc.linkedinId);
        } else
          console.log(
            "[Publish] linkedinTokens doc exists:",
            snap.exists(),
            "token length:",
            t?.length ?? 0,
          );
      } catch (e) {
        console.warn("[Publish] linkedinTokens read error:", e);
      }
    }

    // 2. Scan ALL linkedinTokens docs — in case doc key differs from linkedinId
    if (!token && wsId) {
      try {
        const allToks = await getDocs(
          collection(db, "workspaces", wsId, "linkedinTokens"),
        );
        console.log(
          "[Publish] Scanning",
          allToks.size,
          "linkedinTokens docs:",
          allToks.docs.map((d) => d.id),
        );
        // Use any token if only 1 account, or match by linkedinId / email
        allToks.forEach((d) => {
          if (token) return;
          const data = d.data();
          const t = data.accessToken;
          if (!t || t.length < 10) return;
          const isMatch =
            allToks.size === 1 ||
            d.id === selAcc.linkedinId ||
            data.linkedinId === selAcc.linkedinId ||
            data.email === (selAcc as any).email;
          if (isMatch) {
            token = t;
            console.log("[Publish] ✅ Scan match doc:", d.id);
          }
        });
      } catch (e) {
        console.warn("[Publish] scan error:", e);
      }
    }

    // 3. linkedinAccounts doc accessToken field
    if (!token && wsId) {
      try {
        const snap = await getDoc(
          doc(db, "workspaces", wsId, "linkedinAccounts", selAcc.id),
        );
        const t = snap.data()?.accessToken;
        if (t && t.length > 10) {
          token = t;
          console.log("[Publish] ✅ linkedinAccounts doc");
        }
      } catch (e) {
        console.warn("[Publish] accounts doc read error:", e);
      }
    }

    // 4. In-memory from hook snapshot
    if (!token) {
      const t = (selAcc as any).accessToken;
      if (t && t.length > 10) {
        token = t;
        console.log("[Publish] ✅ in-memory");
      }
    }

    console.log(
      "[Publish] Final token found:",
      !!token,
      "length:",
      token?.length ?? 0,
    );

    if (!token) {
      alert(
        "No LinkedIn access token found.\n\nPlease go to the LinkedIn page and reconnect this account.",
      );
      return;
    }

    // Cache onto linkedinAccounts for faster future reads
    if (wsId)
      updateDoc(doc(db, "workspaces", wsId, "linkedinAccounts", selAcc.id), {
        accessToken: token,
      }).catch(() => {});
    setPublishing(true);
    setPublishResult(null);
    try {
      const authorUrn = `urn:li:person:${selAcc.linkedinId}`;

      // FIX: build media payload from files that have base64 data
      const mediaPayload = uploadedFiles
        .filter(
          (f) =>
            f.base64 &&
            (f.type.startsWith("image/") || f.type.startsWith("video/")),
        )
        .map((f) => ({
          base64: f.base64!,
          mimeType: f.type,
          filename: f.name,
        }));

      // Call our Vercel proxy — browser can't call LinkedIn directly (CORS)
      const res = await fetch("/api/linkedin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          authorUrn,
          text: content,
          ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
        }),
      });

      // FIX: parse response safely — Vercel can return HTML on 500 crashes
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText.slice(0, 200) };
      }

      if (res.ok) {
        setPublishResult("success");
        setStatus("Published");
        console.log("[Publish] ✅ Posted! LinkedIn ID:", data.id);
      } else {
        console.error("[Publish] LinkedIn error:", data);
        console.error(
          "[Publish] Status:",
          res.status,
          "Raw:",
          rawText.slice(0, 300),
        );
        setPublishResult("error");
      }
    } catch (e) {
      console.error("LinkedIn publish failed:", e);
      setPublishResult("error");
    } finally {
      setPublishing(false);
    }
  };

  const handleSave = async () => {
    if (!selAcc) return;

    // Store base64 directly in Firestore — no Storage needed
    const mediaBase64: string[] = [];
    const mediaTypes: string[] = [];

    for (const file of uploadedFiles) {
      if (!file.base64) continue;
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
        continue;
      mediaBase64.push(file.base64);
      mediaTypes.push(file.type);
    }

    const saved: Post = {
      id: post?.id ?? Date.now().toString(),
      linkedinAccountId: selAcc.id,
      account: selAcc.name,
      accountAvatar: selAcc.avatarInitials || accountInitials(selAcc.name),
      accountColor: selAcc.avatarColor || "#6366f1",
      accountBio: selAcc.headline,
      accountFollowers: selAcc.followers,
      accountAvatarUrl: selAcc.avatarUrl || "",
      linkedinId: selAcc.linkedinId || "",
      ...(uploadedFiles.length > 0
        ? {
            uploadedFileUrl: uploadedFiles[0].previewUrl,
            uploadedFileCount: uploadedFiles.length,
          }
        : {}),
      ...(mediaBase64.length > 0 ? { mediaBase64, mediaTypes } : {}),
      // FIX: store UTC timestamp so cron compares correctly regardless of timezone
      scheduledTimestamp:
        date && time ? new Date(`${date}T${time}:00`).toISOString() : "",
      assignedToUid: selMember?.uid ?? "",
      assignedTo: selMember?.displayName || selMember?.email || "—",
      assignedAvatar: memberInitials(selMember ?? {}),
      assignedAvatarUrl: (selMember as any)?.photoURL || "",
      assignedColor: (selMember as any)?.color || "#6366f1",
      assignmentComment: assignComment,
      theme,
      content,
      tags: selTags,
      funnel: selFunnel,
      status,
      scheduledDate: date,
      scheduledTime: time,
      comments: comments.filter((c) => c.text.trim()),
      visualType,
      carouselSlides: slides,
      infographicTitle: infoTitle,
      infographicPoints: infoPoints.filter((p) => p.trim()),
      cardColor,
    };
    onSave(saved, notifyMember, assignComment);
    // FIX: only open GCal if checkbox is checked
    if (openGCal && status === "Scheduled" && date) {
      window.open(buildGCalUrl(saved, selMember?.email), "_blank");
    }
    onClose();
  };

  const EMOJIS = [
    // Smileys & Faces (40)
    "😀",
    "😁",
    "😂",
    "🤣",
    "😃",
    "😄",
    "😅",
    "😆",
    "😉",
    "😊",
    "😋",
    "😎",
    "😍",
    "😘",
    "🥰",
    "😗",
    "😙",
    "😚",
    "🙂",
    "🤗",
    "🤩",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
    "😥",
    "😮",
    "🤐",
    "😯",
    "😪",
    "😫",
    "🥱",
    "😴",
    "😌",
    "😛",
    "😜",
    // Hearts & Emotions (20)
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
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "🥹",
    "😭",
    // Hands & Gestures (25)
    "👍",
    "👎",
    "👊",
    "✊",
    "🤛",
    "🤜",
    "🤞",
    "✌️",
    "🤟",
    "🤘",
    "👌",
    "🤌",
    "🤏",
    "👈",
    "👉",
    "👆",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "✋",
    "🖐️",
    "🙏",
    "👏",
    "🫶",
    // Business & Achievement (30)
    "🔥",
    "⭐",
    "💫",
    "✨",
    "🌟",
    "💥",
    "🎯",
    "🏆",
    "🥇",
    "🎖️",
    "🎁",
    "🎉",
    "🎈",
    "✅",
    "❌",
    "⚡",
    "💡",
    "🔑",
    "💎",
    "💰",
    "📈",
    "📉",
    "📊",
    "🚀",
    "🌍",
    "🧠",
    "👑",
    "🦁",
    "💼",
    "📋",
    // Office & Content (30)
    "📌",
    "📎",
    "🖇️",
    "📏",
    "📐",
    "✂️",
    "🗂️",
    "📁",
    "📂",
    "📝",
    "📃",
    "📄",
    "📑",
    "📧",
    "📨",
    "📩",
    "✏️",
    "🖊️",
    "🖋️",
    "📓",
    "📔",
    "📒",
    "📕",
    "📗",
    "📘",
    "📙",
    "📚",
    "🖥️",
    "💻",
    "📱",
    // Nature & Misc (30)
    "🌸",
    "🌺",
    "🌻",
    "🌹",
    "🍀",
    "🌿",
    "🌱",
    "🌳",
    "🏔️",
    "🌊",
    "🌙",
    "☀️",
    "⛅",
    "🌈",
    "🦋",
    "🐝",
    "🌺",
    "🦊",
    "🐯",
    "🦁",
    "🎨",
    "🎭",
    "🎬",
    "🎵",
    "🎶",
    "🎸",
    "🏋️",
    "🧘",
    "🤸",
    "🏊",
    // LinkedIn-popular extras (25)
    "💭",
    "🗣️",
    "👥",
    "🤝",
    "🌐",
    "📢",
    "📣",
    "🔔",
    "🔕",
    "💬",
    "🗨️",
    "💡",
    "🔍",
    "🔎",
    "📍",
    "🗺️",
    "🏢",
    "🏦",
    "🏗️",
    "⚙️",
    "🔧",
    "🛠️",
    "🔨",
    "⚗️",
    "🧪",
  ];

  const LINKEDIN_CHARS = [
    // Arrows (20)
    "→",
    "←",
    "↑",
    "↓",
    "↗",
    "↘",
    "↙",
    "↖",
    "⟶",
    "⟵",
    "⇒",
    "⇐",
    "⇑",
    "⇓",
    "➜",
    "➔",
    "➝",
    "➞",
    "►",
    "◄",
    // Bullets & Lists (20)
    "•",
    "●",
    "○",
    "◆",
    "◇",
    "▸",
    "▹",
    "▷",
    "◉",
    "⦿",
    "⁃",
    "‣",
    "⊙",
    "◈",
    "⬥",
    "⬦",
    "■",
    "□",
    "▪",
    "▫",
    // Numbered circles (20)
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
    "⑬",
    "⑭",
    "⑮",
    "⑯",
    "⑰",
    "⑱",
    "⑲",
    "⑳",
    // Stars & Decorative (20)
    "★",
    "☆",
    "✦",
    "✧",
    "✩",
    "✪",
    "✫",
    "✬",
    "✭",
    "✮",
    "✯",
    "✰",
    "⭐",
    "🌟",
    "✴️",
    "✳️",
    "❇️",
    "💠",
    "🔷",
    "🔹",
    // Lines & Separators (15)
    "—",
    "–",
    "―",
    "│",
    "┃",
    "╎",
    "╏",
    "║",
    "▌",
    "▍",
    "▎",
    "▏",
    "▐",
    "▕",
    "═",
    // Checks & Status (15)
    "✓",
    "✔",
    "✗",
    "✘",
    "☑",
    "☒",
    "✅",
    "❌",
    "⊕",
    "⊗",
    "⊘",
    "⊛",
    "🔘",
    "🔲",
    "🔳",
    // Brackets & Quotes (10)
    "《",
    "》",
    "「",
    "」",
    "『",
    "』",
    "【",
    "】",
    "〖",
    "〗",
    // Math & Special (15)
    "∞",
    "≈",
    "≠",
    "≤",
    "≥",
    "±",
    "÷",
    "×",
    "∑",
    "∏",
    "√",
    "∩",
    "∪",
    "∈",
    "∉",
    // Lettered circles (25)
    "Ⓐ",
    "Ⓑ",
    "Ⓒ",
    "Ⓓ",
    "Ⓔ",
    "Ⓕ",
    "Ⓖ",
    "Ⓗ",
    "Ⓘ",
    "Ⓙ",
    "Ⓚ",
    "Ⓛ",
    "Ⓜ",
    "Ⓝ",
    "Ⓞ",
    "Ⓟ",
    "Ⓠ",
    "Ⓡ",
    "Ⓢ",
    "Ⓣ",
    "Ⓤ",
    "Ⓥ",
    "Ⓦ",
    "Ⓧ",
    "Ⓨ",
    // Currency & misc (15)
    "€",
    "£",
    "¥",
    "¢",
    "₹",
    "₩",
    "₪",
    "฿",
    "₿",
    "©",
    "®",
    "™",
    "°",
    "¶",
    "§",
    // Bold text starters (LinkedIn viral formatting)
    "𝗔",
    "𝗕",
    "𝗖",
    "𝗗",
    "𝗘",
    "𝗙",
    "𝗚",
    "𝗛",
    "𝗜",
    "𝗝",
    "𝗞",
    "𝗟",
    "𝗠",
    "𝗡",
    "𝗢",
    "𝗣",
    "𝗤",
    "𝗥",
    "𝗦",
    "𝗧",
    // Italic text
    "𝘈",
    "𝘉",
    "𝘊",
    "𝘋",
    "𝘌",
    "𝘍",
    "𝘎",
    "𝘏",
    "𝘐",
    "𝘑",
    "𝘒",
    "𝘓",
    "𝘔",
    "𝘕",
    "𝘖",
    "𝘗",
    "𝘘",
    "𝘙",
    "𝘚",
    "𝘛",
    // Superscript numbers
    "⁰",
    "¹",
    "²",
    "³",
    "⁴",
    "⁵",
    "⁶",
    "⁷",
    "⁸",
    "⁹",
    "⁺",
    "⁻",
    "⁼",
    "⁽",
    "⁾",
    // Hearts & engagement
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💗",
    "💓",
    "💞",
    "💕",
    "💟",
    "❣️",
    // Hands & gestures
    "👉",
    "👈",
    "👆",
    "👇",
    "☝️",
    "👍",
    "👎",
    "🙌",
    "👏",
    "🤝",
    "💪",
    "🙏",
    "✌️",
    "🤞",
    "👌",
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm">
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
            {/* FIX: GCal is opt-in — only shown when status=Scheduled and date is set */}
            {status === "Scheduled" && date && (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none px-2">
                <input
                  type="checkbox"
                  checked={openGCal}
                  onChange={(e) => setOpenGCal(e.target.checked)}
                  className="rounded accent-primary"
                />
                Open Google Calendar
              </label>
            )}
            <button
              onClick={handleSave}
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
          {/* Left Panel */}
          <div className="w-52 flex-shrink-0 border-r border-border overflow-y-auto p-3 space-y-4">
            {/* Post As */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Post As
              </p>
              {linkedinAccounts.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic px-2">
                  No LinkedIn accounts connected yet.
                </p>
              ) : (
                linkedinAccounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelAccId(a.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left mb-1 ${selAccId === a.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                  >
                    {a.avatarUrl ? (
                      <img
                        src={a.avatarUrl}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        alt=""
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: a.avatarColor || "#6366f1" }}
                      >
                        {accountInitials(a.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {a.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {a.type === "personal" ? "Personal" : "Company"}
                      </p>
                    </div>
                    {selAccId === a.id && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Writing for */}
            {selAcc && (
              <div className="px-2 py-2 rounded-lg bg-muted/30 border border-border">
                <p className="text-[9px] text-muted-foreground mb-0.5">
                  Writing for
                </p>
                <p className="text-[10px] font-semibold text-foreground">
                  {selAcc.name}
                </p>
                {selAcc.headline && (
                  <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                    {selAcc.headline}
                  </p>
                )}
                {selAcc.followers > 0 && (
                  <p className="text-[9px] text-primary mt-1">
                    {selAcc.followers.toLocaleString()} followers
                  </p>
                )}
              </div>
            )}

            {/* Card Color */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Card Color
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border hover:bg-muted/50 w-full text-left"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: cardColor || "transparent" }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {cardColor ? "Custom" : "No color"}
                  </span>
                </button>
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card rounded-xl border border-border shadow-soft z-20">
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {CARD_COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            setCardColor(col);
                            setShowColorPicker(false);
                          }}
                          className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${cardColor === col ? "border-primary" : "border-transparent"}`}
                          style={{ backgroundColor: col }}
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
                onChange={(e) => {
                  setDate(e.target.value);
                  // FIX: auto-switch to Scheduled when a date is picked
                  if (e.target.value && status === "Draft")
                    setStatus("Scheduled");
                }}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-1.5"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {/* FIX: hint updated to match new checkbox UX */}
              {status === "Scheduled" && date && (
                <p className="text-[9px] text-emerald-400 mt-1">
                  📅 Check "Open Google Calendar" above to sync
                </p>
              )}
            </div>

            {/* Assign To */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Assign To
              </p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() => {
                      setAssignedUid(m.uid);
                      setNotifyMember(true);
                    }}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${assignedUid === m.uid ? "bg-primary/10 border border-primary/30" : "bg-muted/50 border border-transparent"}`}
                  >
                    {m.photoURL ? (
                      <img
                        src={m.photoURL}
                        className="w-6 h-6 rounded-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-white">
                        {memberInitials(m)}
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {m.displayName?.split(" ")[0] || m.email?.split("@")[0]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => setNotifyMember(!notifyMember)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${notifyMember ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-muted/50 text-muted-foreground border-border"}`}
                >
                  <Bell
                    className={`w-3 h-3 ${notifyMember ? "text-violet-400" : ""}`}
                  />
                  {notifyMember ? "Notify member ✓" : "Notify member"}
                </button>
                {notifyMember && (
                  <div className="relative">
                    <textarea
                      value={assignComment}
                      onChange={(e) => setAssignComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (assignComment.trim()) {
                            // Trigger notification immediately
                            setAssignComment(assignComment + "\n[SEND]");
                            setTimeout(() => setAssignComment(""), 50);
                          }
                        }
                      }}
                      placeholder="Add a note... press Enter to send"
                      rows={2}
                      className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none pr-8"
                    />
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                      ↵ Enter to send · Shift+Enter for newline
                    </p>
                  </div>
                )}
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

          {/* Center Compose */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border min-w-0">
            <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-2 flex-shrink-0 flex-wrap">
              <span className="text-xs font-semibold text-foreground">
                Compose
              </span>
              <div className="flex items-center gap-0.5 ml-2 border-l border-border pl-2">
                <button
                  onClick={() => {
                    const el = taRef.current;
                    if (!el) return;
                    const s = el.selectionStart,
                      e = el.selectionEnd,
                      sel = content.slice(s, e);
                    setContent(
                      content.slice(0, s) +
                        "**" +
                        sel +
                        "**" +
                        content.slice(e),
                    );
                  }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={insertBullet}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Bullet list"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={insertNumberedList}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Numbered list"
                >
                  <span className="text-[11px] font-bold leading-none">1.</span>
                </button>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted ${grade.color}`}
                >
                  {grade.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {grade.readTime}
                </span>
                <span
                  className={`text-[10px] font-medium ${cc > 2800 ? "text-red-500" : cc > 2000 ? "text-orange-500" : "text-muted-foreground"}`}
                >
                  {cc}/3000
                </span>
              </div>
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
                  "Write your LinkedIn post here... ✨\n\n→ Use symbols for structure\n• Bullet points work great"
                }
                className="w-full min-h-[180px] rounded-lg bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
              />

              {/* File upload */}
              <div className="border border-dashed border-border rounded-xl p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    files.forEach((file) => {
                      const url = URL.createObjectURL(file);

                      if (file.type === "application/pdf") {
                        // PDF — read as base64, will be rendered with pdf.js
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result as string;
                          const base64 = result.split(",")[1];
                          setUploadedFiles((prev) => [
                            ...prev,
                            {
                              name: file.name,
                              type: file.type,
                              previewUrl: url,
                              size: file.size,
                              base64,
                            },
                          ]);
                        };
                        reader.readAsDataURL(file);
                      } else if (file.type.startsWith("image/")) {
                        const img = new window.Image();
                        img.onload = () => {
                          // Only compress if > 800KB — otherwise keep original resolution
                          if (file.size <= 800 * 1024) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const result = ev.target?.result as string;
                              const base64 = result.split(",")[1];
                              setUploadedFiles((prev) => [
                                ...prev,
                                {
                                  name: file.name,
                                  type: file.type,
                                  previewUrl: url,
                                  size: file.size,
                                  base64,
                                },
                              ]);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            // Large image — compress to stay under Firestore 1MB
                            const canvas = document.createElement("canvas");
                            const MAX = 1920;
                            const ratio = Math.min(
                              1,
                              MAX / Math.max(img.width, img.height),
                            );
                            canvas.width = img.width * ratio;
                            canvas.height = img.height * ratio;
                            const ctx = canvas.getContext("2d")!;
                            ctx.drawImage(
                              img,
                              0,
                              0,
                              canvas.width,
                              canvas.height,
                            );
                            const dataUrl = canvas.toDataURL(
                              "image/jpeg",
                              0.92,
                            );
                            const base64 = dataUrl.split(",")[1];
                            setUploadedFiles((prev) => [
                              ...prev,
                              {
                                name: file.name,
                                type: "image/jpeg",
                                previewUrl: dataUrl,
                                size: base64.length,
                                base64,
                              },
                            ]);
                          }
                        };
                        img.src = url;
                      } else {
                        // Video — read as-is
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result as string;
                          const base64 = result.split(",")[1];
                          setUploadedFiles((prev) => [
                            ...prev,
                            {
                              name: file.name,
                              type: file.type,
                              previewUrl: url,
                              size: file.size,
                              base64,
                            },
                          ]);
                        };
                        reader.readAsDataURL(file);
                      }
                    });
                    e.target.value = "";
                  }}
                />
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {/* Thumbnail strip */}
                    <div className="flex gap-2 flex-wrap">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="relative group/thumb">
                          {f.type.startsWith("image/") ? (
                            <img
                              src={f.previewUrl}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover border border-border"
                            />
                          ) : f.type.startsWith("video/") ? (
                            <div className="w-14 h-14 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                              <span className="text-2xl">🎬</span>
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                              <span className="text-2xl">📄</span>
                            </div>
                          )}
                          <button
                            onClick={() =>
                              setUploadedFiles((prev) =>
                                prev.filter((_, j) => j !== i),
                              )
                            }
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[10px] items-center justify-center hidden group-hover/thumb:flex"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {/* Add more */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {uploadedFiles.length} file
                      {uploadedFiles.length > 1 ? "s" : ""} selected · will
                      upload to LinkedIn
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full justify-center py-2"
                  >
                    <Image className="w-4 h-4" />
                    <span>Image · PDF carousel · Video — drag or click</span>
                  </button>
                )}
              </div>

              {/* Emoji picker */}
              <div className="relative" ref={emojiPanelRef}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowEmoji(!showEmoji);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${showEmoji ? "bg-primary/10 text-primary" : "bg-muted hover:bg-accent text-muted-foreground"}`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  Quick insert
                </button>
                {showEmoji && (
                  <div className="absolute top-full left-0 mt-1 bg-card rounded-xl border border-border shadow-xl z-20 w-80">
                    <div className="flex border-b border-border">
                      <button
                        onClick={() => setEmojiTab("emoji")}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${emojiTab === "emoji" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                      >
                        😀 Emojis
                      </button>
                      <button
                        onClick={() => setEmojiTab("chars")}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${emojiTab === "chars" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                      >
                        Ⓐ LinkedIn Chars
                      </button>
                    </div>
                    <div className="p-2 flex flex-wrap gap-0.5 max-h-52 overflow-y-auto">
                      {(emojiTab === "emoji" ? EMOJIS : LINKEDIN_CHARS).map(
                        (em, idx) => (
                          <button
                            key={idx}
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              ins(em);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded text-base transition-colors"
                          >
                            {em}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Carousel editor */}
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
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      Add Slide
                    </button>
                  </div>
                  <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                    {slides.map((sl, i) => (
                      <div
                        key={sl.id}
                        className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Slide {i + 1}
                          </span>
                          <button
                            onClick={() =>
                              setSlides((p) => p.filter((s) => s.id !== sl.id))
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
                          className="w-full px-2 py-1 rounded bg-muted/50 border border-border text-xs text-foreground focus:outline-none"
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
                          placeholder="Body..."
                          rows={2}
                          className="w-full rounded bg-muted/50 border border-border px-2 py-1 text-xs text-foreground focus:outline-none resize-none"
                        />
                      </div>
                    ))}
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
                      className="mt-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Preview — responsive by device */}
          <div
            className={`flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 ${device === "desktop" ? "w-[520px]" : device === "tablet" ? "w-[360px]" : "w-[260px]"}`}
          >
            <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-foreground">
                Preview
              </span>
              <div className="flex gap-1">
                {(
                  [
                    ["desktop", Monitor, "Desktop"],
                    ["tablet", Tablet, "Tablet"],
                    ["mobile", Smartphone, "Mobile"],
                  ] as const
                ).map(([d, Icon, label]) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d as PreviewDevice)}
                    title={label}
                    className={`p-1.5 rounded-lg ${device === d ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 bg-[#f3f2ef] dark:bg-[#1b1f23]">
              {/* LinkedIn post card — pixel-accurate */}
              <div className="bg-white dark:bg-[#1d2226] rounded-lg border border-[#e0ddd8] dark:border-[#38434f] overflow-hidden shadow-sm">
                {/* Header */}
                <div className="p-3 flex items-start gap-2.5">
                  {selAcc?.avatarUrl ? (
                    <img
                      src={selAcc.avatarUrl}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      alt=""
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{
                        backgroundColor: selAcc?.avatarColor || "#0077b5",
                      }}
                    >
                      {selAcc
                        ? selAcc.avatarInitials ||
                          selAcc.name.slice(0, 2).toUpperCase()
                        : "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-[#000000e6] dark:text-[#ffffffd9] leading-tight ${device === "mobile" ? "text-[12px]" : "text-[14px]"}`}
                    >
                      {selAcc?.name || "Your Name"}
                    </p>
                    {device !== "mobile" && (
                      <p className="text-[12px] text-[#00000099] dark:text-[#ffffff73] line-clamp-1 leading-tight mt-0.5">
                        {selAcc?.headline || "Your headline"}
                      </p>
                    )}
                    <p className="text-[11px] text-[#00000066] dark:text-[#ffffff66] mt-0.5">
                      Just now • 🌐
                    </p>
                  </div>
                  <div className="text-[#00000066] dark:text-[#ffffff66] text-lg leading-none flex-shrink-0">
                    ···
                  </div>
                </div>

                {/* Content — LinkedIn-accurate: 210 chars OR 3 newlines triggers see more */}
                <div className="px-3 pb-2">
                  {(() => {
                    const CHAR_LIMIT = device === "mobile" ? 140 : 210;
                    const LINE_LIMIT = 3;
                    const lines = content.split("\n");
                    const firstLines = lines.slice(0, LINE_LIMIT).join("\n");
                    const needsMore =
                      content.length > CHAR_LIMIT || lines.length > LINE_LIMIT;
                    const displayText =
                      needsMore && !showFullPreview
                        ? firstLines.length > CHAR_LIMIT
                          ? firstLines.slice(0, CHAR_LIMIT)
                          : firstLines
                        : content;
                    return (
                      <div>
                        <p
                          className={`text-[#000000e6] dark:text-[#ffffffd9] whitespace-pre-line leading-[1.5] ${device === "mobile" ? "text-[12px]" : "text-[14px]"}`}
                        >
                          {displayText ? (
                            displayText.split(/(\s)/).map((word, i) =>
                              /^[#@]/.test(word) ? (
                                <span
                                  key={i}
                                  style={{ color: "#0077b5", fontWeight: 600 }}
                                >
                                  {word}
                                </span>
                              ) : (
                                word
                              ),
                            )
                          ) : (
                            <span className="text-[#00000044]">
                              Your post content will appear here...
                            </span>
                          )}
                        </p>
                        {needsMore && content && !showFullPreview && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullPreview(true);
                            }}
                            className={`text-[#0077b5] font-semibold hover:underline cursor-pointer ${device === "mobile" ? "text-[12px]" : "text-[14px]"}`}
                          >
                            …see more
                          </button>
                        )}
                        {showFullPreview && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullPreview(false);
                            }}
                            className={`text-[#0077b5] font-semibold hover:underline cursor-pointer ${device === "mobile" ? "text-[12px]" : "text-[14px]"}`}
                          >
                            see less
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ── LinkedIn-accurate media preview ── */}
                {uploadedFiles.length > 0 &&
                  uploadedFiles[0].type.startsWith("image/") &&
                  uploadedFiles.length === 1 && (
                    <div className="w-full overflow-hidden border-t border-[#e0ddd8] dark:border-[#38434f]">
                      <img
                        src={uploadedFiles[0].previewUrl}
                        alt="attachment"
                        className="w-full object-cover block"
                        style={{ maxHeight: "580px", minHeight: "200px" }}
                      />
                    </div>
                  )}
                {uploadedFiles.length > 1 &&
                  uploadedFiles.every((f) => f.type.startsWith("image/")) && (
                    <ImageCarousel files={uploadedFiles} />
                  )}
                {uploadedFiles.length > 0 &&
                  uploadedFiles[0].type.startsWith("video/") && (
                    <div className="w-full overflow-hidden border-t border-[#e0ddd8] dark:border-[#38434f] relative bg-black">
                      <video
                        src={uploadedFiles[0].previewUrl}
                        controls
                        className="w-full max-h-[400px]"
                      />
                    </div>
                  )}
                {uploadedFile && uploadedFile.type === "application/pdf" && (
                  <PdfCarouselPreview file={uploadedFile} />
                )}

                {/* Reactions */}
                <div className="px-3 py-1.5 flex items-center gap-1 border-t border-[#e0ddd8] dark:border-[#38434f]">
                  <div className="flex -space-x-0.5">
                    {["👍", "❤️", "💡"].map((r) => (
                      <span
                        key={r}
                        className="w-4 h-4 rounded-full bg-white dark:bg-[#1d2226] flex items-center justify-center text-[10px] ring-1 ring-[#e0ddd8]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-[#00000066] dark:text-[#ffffff66] ml-1 flex-1">
                    42
                  </span>
                  <span className="text-[11px] text-[#00000066] dark:text-[#ffffff66]">
                    8 comments
                  </span>
                </div>

                {/* Action bar */}
                <div className="flex items-center border-t border-[#e0ddd8] dark:border-[#38434f]">
                  {[
                    ["👍", "Like"],
                    ["💬", "Comment"],
                    ["🔁", "Repost"],
                    ["📤", "Send"],
                  ].map(([icon, lbl]) => (
                    <button
                      key={lbl}
                      className="flex-1 flex items-center justify-center gap-1 py-2 hover:bg-[#f3f2ef] dark:hover:bg-[#ffffff12] transition-colors"
                    >
                      <span
                        className={
                          device === "mobile" ? "text-base" : "text-sm"
                        }
                      >
                        {icon}
                      </span>
                      {device !== "mobile" && (
                        <span className="text-[11px] font-semibold text-[#00000099] dark:text-[#ffffff73]">
                          {lbl}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments preview */}
              {comments.filter((c) => c.text).length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {comments
                    .filter((c) => c.text)
                    .slice(0, 2)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="bg-white dark:bg-[#1d2226] rounded-lg border border-[#e0ddd8] dark:border-[#38434f] px-3 py-2 flex gap-2"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                          style={{
                            backgroundColor: selAcc?.avatarColor || "#0077b5",
                          }}
                        >
                          {selAcc?.name.slice(0, 1) || "?"}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-[#000000e6] dark:text-[#ffffffd9]">
                            {selAcc?.name?.split(" ")[0]}
                          </p>
                          <p className="text-[10px] text-[#000000cc] dark:text-[#ffffffcc] leading-snug line-clamp-2">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Publish to LinkedIn */}
              <div className="mt-3 space-y-2">
                <button
                  onClick={handlePublishToLinkedIn}
                  disabled={publishing || !content.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006699] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <span className="font-black text-sm">in</span> Publish to
                      LinkedIn now
                      {uploadedFiles.length > 0
                        ? ` + ${uploadedFiles.length} media`
                        : ""}
                    </>
                  )}
                </button>
                {publishResult === "success" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Post published! Status → Published
                    </span>
                  </div>
                )}
                {publishResult === "error" && (
                  <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-500 font-medium">
                      Publish failed. Check your LinkedIn connection.
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(content).catch(() => {});
                        window.open("https://www.linkedin.com/feed/", "_blank");
                      }}
                      className="text-[10px] text-red-400 hover:underline mt-1"
                    >
                      Fallback: copy & open LinkedIn
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContentStudioPage() {
  const { workspace, members, user } = useAuth();
  const { accounts: linkedinAccounts } = useLinkedInAccounts();

  const [posts, setPosts] = useState<Post[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [view, setView] = useState<ViewMode>("cards");
  const [editing, setEditing] = useState<Post | null | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<PostStatus | "All">("All");
  const [filterAcc, setFilterAcc] = useState("All");
  const [calMode, setCalMode] = useState<CalendarMode>("monthly");
  // FIX: dynamic calendar date — no more hardcoded March 2026
  const [calCurrentDate, setCalCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PostStatus | null>(null);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [sheetCols, setSheetCols] = useState<SheetColumn[]>(INITIAL_SHEET_COLS);
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    postId: string;
    col: string;
  } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [sheetPreview, setSheetPreview] = useState<Post | null>(null);
  const [lastClickTime, setLastClickTime] = useState<Record<string, number>>(
    {},
  );
  const [freeRows, setFreeRows] = useState<Record<string, string>[]>([]);

  // Load freeRows from Firestore
  useEffect(() => {
    if (!workspace?.id) return;
    const unsub = onSnapshot(doc(db, "workspaces", workspace.id, "sheetData", "freeRows"), (snap) => {
      if (snap.exists()) setFreeRows(snap.data().rows ?? []);
    });
    return unsub;
  }, [workspace?.id]);

  const saveFreeRows = async (rows: Record<string, string>[]) => {
    if (!workspace?.id) return;
    const { setDoc: setFireDoc } = await import("firebase/firestore");
    await setFireDoc(doc(db, "workspaces", workspace.id, "sheetData", "freeRows"), { rows });
  };

  const updateFreeRow = async (rowIdx: number, colId: string, value: string, prevValue: string) => {
    const newRows = [...freeRows];
    newRows[rowIdx] = { ...newRows[rowIdx], [colId]: value };
    setFreeRows(newRows);
    await saveFreeRows(newRows);

    // @mention detection — fire notification if new @name typed
    const mentionMatch = value.match(/@(\w+)/g);
    const prevMentions = (prevValue || "").match(/@(\w+)/g) || [];
    if (mentionMatch && workspace) {
      for (const mention of mentionMatch) {
        if (prevMentions.includes(mention)) continue;
        const mentionedName = mention.slice(1).toLowerCase();
        const mentionedMember = members.find((m) =>
          (m.displayName || "").toLowerCase().startsWith(mentionedName) ||
          (m.email || "").toLowerCase().startsWith(mentionedName)
        );
        if (mentionedMember && mentionedMember.uid !== user?.uid) {
          await addDoc(collection(db, "workspaces", workspace.id, "notifications"), {
            type: "mention",
            message: `${user?.displayName || "Someone"} mentioned you in a sheet: "${value.slice(0, 60)}"`,
            personalMessage: `${user?.displayName || "Someone"} mentioned you in a sheet: "${value.slice(0, 60)}"`,
            actorUid: user?.uid ?? "",
            actorName: user?.displayName || "",
            targetUid: mentionedMember.uid,
            navigateTo: "/content-studio",
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  };
  // Tag system for sheets
  const [customTags, setCustomTags] = useState<
    { label: string; color: string }[]
  >([]);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [selectedFreeRowForTag, setSelectedFreeRowForTag] = useState<number | null>(null);
  const TAG_PALETTE = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#f43f5e",
    "#0ea5e9",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
  ];
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [addEventDay, setAddEventDay] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const postsColRef = workspace
    ? collection(db, "workspaces", workspace.id, "contentPosts")
    : null;

  useEffect(() => {
    if (!postsColRef) {
      setLoadingPosts(false);
      return;
    }
    const q = query(postsColRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      // FIX: id LAST so Firestore doc ID always wins over stale id inside doc
      setPosts(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Post));
      setLoadingPosts(false);
    });
  }, [workspace?.id]);

  // FIX: Archived posts live in their own collection
  useEffect(() => {
    if (!workspace?.id) return;
    const q = query(
      collection(db, "workspaces", workspace.id, "archivedPosts"),
      orderBy("archivedAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setArchivedPosts(
        snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Post),
      );
    });
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    const q = query(
      collection(db, "workspaces", workspace.id, "calendarEvents"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setCalEvents(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalEvent),
      );
    });
  }, [workspace?.id]);

  const handleSaveEvent = async (ev: CalEvent) => {
    if (!workspace) return;
    BELL_SOUNDS[ev.bellSound]();
    // If editing existing — update, else create
    if (ev.id && calEvents.find((e) => e.id === ev.id)) {
      await updateDoc(
        doc(db, "workspaces", workspace.id, "calendarEvents", ev.id),
        { ...ev },
      );
    } else {
      await addDoc(
        collection(db, "workspaces", workspace.id, "calendarEvents"),
        { ...ev, createdAt: serverTimestamp() },
      );
    }
    setEditingEvent(null);
  };

  const handleSave = async (
    saved: Post,
    notifyMember: boolean,
    assignComment: string,
  ) => {
    if (!postsColRef || !workspace) return;

    // Strip any undefined values — Firestore rejects them
    const clean = Object.fromEntries(
      Object.entries(saved).filter(([, v]) => v !== undefined),
    ) as Post;

    if (clean.id && posts.find((p) => p.id === clean.id)) {
      await updateDoc(
        doc(db, "workspaces", workspace.id, "contentPosts", clean.id),
        {
          ...clean,
          updatedAt: new Date().toISOString(),
        },
      );
    } else {
      const docRef = await addDoc(postsColRef, {
        ...clean,
        createdAt: serverTimestamp(),
      });
      saved.id = docRef.id;
    }
    if (
      notifyMember &&
      saved.assignedToUid &&
      saved.assignedToUid !== user?.uid
    ) {
      playTripleChime();
      const notifMsg = assignComment
        ? `📌 ${user?.displayName || "Admin"} assigned "${saved.theme}" to you: "${assignComment}"`
        : `📌 ${user?.displayName || "Admin"} assigned "${saved.theme}" to you.`;
      await addDoc(
        collection(db, "workspaces", workspace.id, "notifications"),
        {
          type: "post_assigned",
          message: notifMsg,
          personalMessage: notifMsg,
          actorUid: user?.uid ?? "",
          actorName: user?.displayName || "Admin",
          targetUid: saved.assignedToUid,
          postId: saved.id,
          postTheme: saved.theme,
          read: false,
          createdAt: new Date().toISOString(),
        },
      );
    }
  };

  // FIX: archivePost moves doc to archivedPosts + deletes from contentPosts
  const archivePost = async (id: string) => {
    if (!workspace) return;
    const postRef = doc(db, "workspaces", workspace.id, "contentPosts", id);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    const postData = {
      ...postSnap.data(),
      id,
      status: "Archived",
      archivedAt: new Date().toISOString(),
    };
    await addDoc(
      collection(db, "workspaces", workspace.id, "archivedPosts"),
      postData,
    );
    await deleteDoc(postRef);
  };

  // FIX: status changes to Archived go through archivePost
  const changePostStatus = async (id: string, newStatus: PostStatus) => {
    if (!workspace) return;
    if (newStatus === "Archived") {
      await archivePost(id);
    } else {
      await updateDoc(doc(db, "workspaces", workspace.id, "contentPosts", id), {
        status: newStatus,
      });
    }
  };

  // FIX: restore puts doc back into contentPosts as Draft
  const restorePost = async (id: string) => {
    if (!workspace) return;
    const archRef = doc(db, "workspaces", workspace.id, "archivedPosts", id);
    const archSnap = await getDoc(archRef);
    if (!archSnap.exists()) return;
    const data: any = { ...archSnap.data() };
    delete data.archivedAt;
    await addDoc(collection(db, "workspaces", workspace.id, "contentPosts"), {
      ...data,
      status: "Draft",
      createdAt: serverTimestamp(),
    });
    await deleteDoc(archRef);
  };

  // Delete all archived posts permanently
  const deleteAllArchived = async () => {
    if (!workspace) return;
    const batch = archivedPosts.map((p) =>
      deleteDoc(doc(db, "workspaces", workspace.id, "archivedPosts", p.id))
    );
    await Promise.all(batch);
  };
    if (!workspace) return;
    await deleteDoc(doc(db, "workspaces", workspace.id, "contentPosts", id));
  };

  // Expose deletePost globally so PostCard menu can call it
  React.useEffect(() => {
    (window as any).__deletePost = deletePost;
    return () => {
      delete (window as any).__deletePost;
    };
  }, [workspace?.id]);

  const dropOnDay = (dateStr: string) => {
    if (!dragging || !workspace) return;
    updateDoc(doc(db, "workspaces", workspace.id, "contentPosts", dragging), {
      scheduledDate: dateStr,
    });
    setDragging(null);
    setDragOver(null);
  };

  const filtered = posts.filter(
    (p) =>
      (filterStatus === "All" ? true : p.status === filterStatus) &&
      (filterAcc === "All" ||
        p.account === filterAcc ||
        p.linkedinAccountId === filterAcc),
  );

  const renderCell = (post: Post, col: string): React.ReactNode => {
    const isEditing =
      editingCell?.postId === post.id && editingCell?.col === col;

    // Inline input — shown for ANY column when double-clicked
    if (isEditing) {
      // FIX: smart dropdowns for status/funnel, date picker for scheduledDate
      if (col === "status")
        return (
          <select
            autoFocus
            value={cellValue}
            onChange={(e) => setCellValue(e.target.value)}
            onBlur={() => {
              if (workspace)
                updateDoc(
                  doc(db, "workspaces", workspace.id, "contentPosts", post.id),
                  { [col]: cellValue },
                );
              setEditingCell(null);
            }}
            className="w-full px-1 py-0.5 text-xs bg-primary/5 border border-primary/50 rounded focus:outline-none text-foreground"
          >
            {(["Draft", "Scheduled", "Published"] as PostStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      if (col === "funnel")
        return (
          <select
            autoFocus
            value={cellValue}
            onChange={(e) => setCellValue(e.target.value)}
            onBlur={() => {
              if (workspace)
                updateDoc(
                  doc(db, "workspaces", workspace.id, "contentPosts", post.id),
                  { [col]: cellValue },
                );
              setEditingCell(null);
            }}
            className="w-full px-1 py-0.5 text-xs bg-primary/5 border border-primary/50 rounded focus:outline-none text-foreground"
          >
            {FUNNEL_TAGS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        );
      if (col === "scheduledDate")
        return (
          <input
            autoFocus
            type="date"
            value={cellValue}
            onChange={(e) => setCellValue(e.target.value)}
            onBlur={() => {
              if (workspace)
                updateDoc(
                  doc(db, "workspaces", workspace.id, "contentPosts", post.id),
                  { [col]: cellValue },
                );
              setEditingCell(null);
            }}
            className="w-full px-1 py-0.5 text-xs bg-primary/5 border border-primary/50 rounded focus:outline-none text-foreground"
          />
        );
      return (
        <input
          autoFocus
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          onBlur={() => {
            if (workspace)
              updateDoc(
                doc(db, "workspaces", workspace.id, "contentPosts", post.id),
                { [col]: cellValue },
              );
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (workspace)
                updateDoc(
                  doc(db, "workspaces", workspace.id, "contentPosts", post.id),
                  { [col]: cellValue },
                );
              setEditingCell(null);
            }
            if (e.key === "Escape") setEditingCell(null);
          }}
          className="w-full px-1 py-0.5 text-xs bg-primary/5 border border-primary/50 rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[80px]"
        />
      );
    }

    // Read-only display per column type
    if (col === "account")
      return (
        <div className="flex items-center gap-1.5">
          <Av i={post.accountAvatar} c={post.accountColor} />
          <span className="text-xs truncate">{post.account}</span>
        </div>
      );
    if (col === "tags")
      return (
        <div className="flex gap-1 flex-wrap">
          {(post.tags || []).slice(0, 2).map((t) => (
            <span
              key={t}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TAG_COLORS[t as ContentTag] || ""}`}
            >
              {t}
            </span>
          ))}
        </div>
      );
    if (col === "funnel")
      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FUNNEL_COLORS[post.funnel]}`}
        >
          {post.funnel}
        </span>
      );
    if (col === "status")
      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[post.status]}`}
        >
          {post.status}
        </span>
      );
    if (col === "assignedTo") {
      const member = members.find((m) => m.uid === post.assignedToUid);
      const memberColor =
        (member as any)?.color || (member as any)?.photoColor || "#6366f1";
      return (
        <div className="flex items-center gap-1.5">
          {(member as any)?.photoURL ? (
            <img
              src={(member as any).photoURL}
              className="w-6 h-6 rounded-full object-cover"
              alt=""
            />
          ) : (
            <Av i={post.assignedAvatar} c={memberColor} />
          )}
          <span className="text-xs">{post.assignedTo || "—"}</span>
        </div>
      );
    }
    if (col === "comments")
      return (
        <span className="text-xs text-muted-foreground">
          {(post.comments || []).filter((c) => c.text).length}
        </span>
      );
    return (
      <span className="text-xs text-foreground block truncate max-w-[160px]">
        {String(post[col] ?? "—")}
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
            {(["weekly", "monthly"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCalMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${calMode === m ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1.5">
          {(
            ["All", "Draft", "Scheduled", "Published", "Archived"] as const
          ).map((s) => (
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
          {linkedinAccounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setFilterAcc(a.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterAcc === a.id ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}
            >
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  className="w-4 h-4 rounded-full object-cover"
                  alt=""
                />
              ) : (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: a.avatarColor || "#6366f1" }}
                >
                  {accountInitials(a.name)}
                </div>
              )}
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
          {/* FIX: Archived removed — ArchiveColumn handles it from its own collection */}
          {(["Draft", "Scheduled", "Published"] as PostStatus[]).map((col) => {
            const colPosts = filtered.filter((p) => p.status === col);
            const isDragTarget = dragOverCol === col;
            return (
              <div
                key={col}
                className="flex-1 min-w-[280px] flex flex-col gap-3"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setDragOverCol(null);
                }}
                // FIX: use draggingPostId state — React clears dataTransfer before onDrop fires
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const postId = draggingPostId;
                  if (postId && workspace) {
                    await updateDoc(
                      doc(
                        db,
                        "workspaces",
                        workspace.id,
                        "contentPosts",
                        postId,
                      ),
                      { status: col },
                    );
                  }
                  setDraggingPostId(null);
                }}
                style={{
                  outline: isDragTarget
                    ? `2px dashed ${STATUS_HEX[col]}`
                    : undefined,
                  borderRadius: 16,
                  padding: isDragTarget ? 4 : 0,
                  transition: "all 0.15s",
                }}
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
                  {isDragTarget &&
                    draggingPostId &&
                    posts.find((p) => p.id === draggingPostId)?.status !==
                      col && (
                      <div
                        className="rounded-2xl border-2 border-dashed h-24 animate-pulse"
                        style={{
                          borderColor: STATUS_HEX[col],
                          backgroundColor: STATUS_HEX[col] + "10",
                        }}
                      />
                    )}
                  {colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => setEditing(post)}
                      onDragStartCard={(id) => setDraggingPostId(id)}
                      onDragEndCard={() => {
                        setDraggingPostId(null);
                        setDragOverCol(null);
                      }}
                      onStatusChange={changePostStatus}
                      onArchive={archivePost}
                    />
                  ))}
                  {colPosts.length === 0 && (
                    <div className="h-24 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/60">
                        No {col.toLowerCase()} posts
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Archive column — drag cards here to archive them */}
          <ArchiveColumn
            posts={archivedPosts}
            onRestore={restorePost}
            onDeleteAll={deleteAllArchived}
            draggingPostId={draggingPostId}
            onDrop={async (postId) => {
              if (workspace) await archivePost(postId);
              setDraggingPostId(null);
              setDragOverCol(null);
            }}
          />
        </motion.div>
      )}

      {/* ── SHEETS VIEW ── */}
      {view === "sheets" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl shadow-soft overflow-auto flex-1 relative"
        >
          {/* Tag panel */}
          {showTagPanel && (
            <div className="absolute top-12 right-4 z-30 w-72 bg-card rounded-2xl border border-border shadow-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Tags</p>
                <button
                  onClick={() => setShowTagPanel(false)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Existing tags — click to assign to selected free row */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...CONTENT_TAGS.map((t) => ({ label: t, color: TAG_COLORS[t].match(/#[0-9a-f]+/i)?.[0] || "#6366f1" })),
                  ...customTags,
                ].map((t, i) => (
                  <button
                    key={i}
                    onClick={async () => {
                      if (selectedFreeRowForTag !== null) {
                        const existing = (freeRows[selectedFreeRowForTag]?.tags || "").split(",").filter(Boolean);
                        if (!existing.includes(t.label)) {
                          await updateFreeRow(selectedFreeRowForTag, "tags", [...existing, t.label].join(","), freeRows[selectedFreeRowForTag]?.tags || "");
                        }
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.label}
                    {selectedFreeRowForTag !== null && <span className="text-[9px] opacity-70">+ add</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Create new tag
                </p>
                <input
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder="Tag name..."
                  className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-2"
                />
                <div className="flex gap-1.5 mb-2">
                  {TAG_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${newTagColor === c ? "ring-2 ring-offset-1 ring-offset-card" : ""}`}
                      style={{
                        backgroundColor: c,
                        ["--tw-ring-color" as any]: c,
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (newTagLabel.trim()) {
                      setCustomTags((p) => [
                        ...p,
                        { label: newTagLabel.trim(), color: newTagColor },
                      ]);
                      setNewTagLabel("");
                    }
                  }}
                  disabled={!newTagLabel.trim()}
                  className="w-full py-1.5 rounded-lg gradient-primary text-white text-xs font-semibold disabled:opacity-40"
                >
                  Add tag
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/10">
            <p className="text-xs font-semibold text-foreground">Sheets</p>
            <button
              onClick={() => setShowTagPanel((p) => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${showTagPanel ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <Plus className="w-3 h-3" /> Tags
            </button>
          </div>
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
                        className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 w-40">
                  {showAddCol ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        placeholder="Column name..."
                        autoFocus
                        className="flex-1 px-2 py-1 rounded bg-muted border border-primary/40 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newColName.trim()) {
                            setSheetCols((p) => [
                              ...p,
                              {
                                id: `col_${Date.now()}`,
                                label: newColName.trim(),
                              },
                            ]);
                            setNewColName("");
                            setShowAddCol(false);
                          }
                          if (e.key === "Escape") {
                            setShowAddCol(false);
                            setNewColName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newColName.trim())
                            setSheetCols((p) => [
                              ...p,
                              {
                                id: `col_${Date.now()}`,
                                label: newColName.trim(),
                              },
                            ]);
                          setNewColName("");
                          setShowAddCol(false);
                        }}
                        className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCol(false);
                          setNewColName("");
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddCol(true)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary px-1 py-0.5 rounded hover:bg-muted/50"
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
                  className={`border-b border-border/40 hover:bg-muted/20 cursor-pointer ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                  onClick={() => {
                    const now = Date.now();
                    const last = lastClickTime[post.id] || 0;
                    if (now - last < 400) setSheetPreview(post);
                    setLastClickTime((p) => ({ ...p, [post.id]: now }));
                  }}
                >
                  {sheetCols.map((col) => (
                    <td
                      key={col.id}
                      className="px-3 py-2 border-r border-border/30 last:border-r-0 max-w-[200px]"
                      onDoubleClick={() => {
                        setEditingCell({ postId: post.id, col: col.id });
                        setCellValue(String(post[col.id] ?? ""));
                      }}
                    >
                      {renderCell(post, col.id)}
                    </td>
                  ))}
                  <td className="px-3 py-2" />
                </tr>
              ))}
              {/* Freeform rows — saved to Firestore */}
              {freeRows.map((row, rowIdx) => (
                <tr key={`free-${rowIdx}`} className="border-b border-border/40 hover:bg-muted/20 bg-muted/5">
                  {sheetCols.map((col) => (
                    <td key={col.id} className="px-3 py-2 border-r border-border/30 last:border-r-0 max-w-[200px]">
                      {col.id === "tags" ? (
                        // Tag column: show chips + click to open tag panel
                        <div className="flex flex-wrap gap-1 min-h-[24px] cursor-pointer"
                          onClick={() => { setSelectedFreeRowForTag(rowIdx); setShowTagPanel(true); }}>
                          {(row[col.id] || "").split(",").filter(Boolean).map((t, ti) => {
                            const tagObj = [...CONTENT_TAGS.map(ct => ({ label: ct, color: "" })), ...customTags].find(ct => ct.label === t.trim());
                            return (
                              <span key={ti} className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                                style={{ backgroundColor: tagObj?.color || "#6366f1" }}>
                                {t.trim()}
                              </span>
                            );
                          })}
                          {!(row[col.id]) && <span className="text-[10px] text-muted-foreground/40">+ tag</span>}
                        </div>
                      ) : (
                        <input
                          value={row[col.id] || ""}
                          onChange={(e) => updateFreeRow(rowIdx, col.id, e.target.value, row[col.id] || "")}
                          placeholder={col.id === "theme" ? "Title..." : col.id === "content" ? "Write..." : "—"}
                          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                          style={{ color: (row[col.id] || "").includes("@") ? undefined : undefined }}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button onClick={async () => { const newRows = freeRows.filter((_, i) => i !== rowIdx); setFreeRows(newRows); await saveFreeRows(newRows); }}
                      className="text-[10px] text-muted-foreground hover:text-destructive">✕</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={sheetCols.length + 1} className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => { const newRows = [...freeRows, {}]; setFreeRows(newRows); await saveFreeRows(newRows); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50"
                    >
                      <Plus className="w-3 h-3" />
                      Add blank row
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted/50"
                    >
                      <Plus className="w-3 h-3" />
                      Add post row
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Sheet quick preview modal */}
      <AnimatePresence>
        {sheetPreview && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSheetPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="h-1 w-full flex-shrink-0"
                style={{ backgroundColor: STATUS_HEX[sheetPreview.status] }}
              />
              <div className="p-5 overflow-y-auto flex-1">
                {/* LinkedIn account + status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {sheetPreview.accountAvatarUrl ? (
                      <img
                        src={sheetPreview.accountAvatarUrl}
                        className="w-10 h-10 rounded-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: sheetPreview.accountColor }}
                      >
                        {sheetPreview.accountAvatar}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">
                        {sheetPreview.account}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[sheetPreview.status]}`}
                        >
                          {sheetPreview.status}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {sheetPreview.scheduledDate}
                          {sheetPreview.scheduledTime &&
                            ` · ${sheetPreview.scheduledTime}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSheetPreview(null)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  {sheetPreview.theme}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
                  {sheetPreview.content}
                </p>
                {/* Media preview — full size, no crop */}
                {sheetPreview.mediaBase64?.length > 0 && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-border">
                    {(sheetPreview.mediaTypes?.[0] ?? "").startsWith(
                      "video/",
                    ) ? (
                      <div className="flex items-center justify-center h-32 bg-muted/30">
                        <span className="text-4xl">🎬</span>
                      </div>
                    ) : (
                      <img
                        src={`data:${sheetPreview.mediaTypes?.[0] ?? "image/jpeg"};base64,${sheetPreview.mediaBase64[0]}`}
                        className="w-full object-contain"
                        alt=""
                      />
                    )}
                    {sheetPreview.mediaBase64.length > 1 && (
                      <div className="px-3 py-1.5 bg-muted/20 text-[11px] text-muted-foreground">
                        +{sheetPreview.mediaBase64.length - 1} more file(s)
                      </div>
                    )}
                  </div>
                )}
                {sheetPreview.comments.filter((c) => c.text).length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                      💬 Comments to post
                    </p>
                    {sheetPreview.comments
                      .filter((c) => c.text)
                      .map((c, i) => (
                        <div
                          key={c.id}
                          className="text-xs text-muted-foreground px-2 py-1.5 bg-muted/40 rounded-lg"
                        >
                          {i + 1}. {c.text}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 p-4 pt-0 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditing(sheetPreview);
                    setSheetPreview(null);
                  }}
                  className="flex-1 py-2 rounded-xl gradient-primary text-white text-sm font-semibold"
                >
                  Edit post
                </button>
                <button
                  onClick={() => setSheetPreview(null)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CALENDAR VIEW ── */}
      {view === "calendar" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl shadow-soft flex-1 overflow-hidden flex flex-col"
        >
          {/* Calendar nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setCalCurrentDate((d) => {
                    const n = new Date(d);
                    calMode === "monthly"
                      ? n.setMonth(n.getMonth() - 1)
                      : n.setDate(n.getDate() - 7);
                    return new Date(n);
                  })
                }
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="font-semibold text-foreground text-sm">
                {calMode === "monthly"
                  ? calCurrentDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : (() => {
                      const mon = new Date(calCurrentDate);
                      mon.setDate(mon.getDate() - mon.getDay() + 1);
                      const sun = new Date(mon);
                      sun.setDate(sun.getDate() + 6);
                      return `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
                    })()}
              </h3>
              <button
                onClick={() =>
                  setCalCurrentDate((d) => {
                    const n = new Date(d);
                    calMode === "monthly"
                      ? n.setMonth(n.getMonth() + 1)
                      : n.setDate(n.getDate() + 7);
                    return new Date(n);
                  })
                }
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalCurrentDate(new Date())}
                className="px-2.5 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground"
              >
                Today
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag to reschedule · Click to expand
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {/* ── Monthly ── */}
            {calMode === "monthly" &&
              (() => {
                const year = calCurrentDate.getFullYear();
                const month = calCurrentDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const offset = (firstDay + 6) % 7; // Monday-first
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
                return (
                  <>
                    <div className="grid grid-cols-7 gap-1.5 mb-1">
                      {DAYS.map((d) => (
                        <div
                          key={d}
                          className="text-[11px] font-semibold text-muted-foreground text-center py-2"
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: totalCells }, (_, i) => {
                        const dayNum = i - offset + 1;
                        const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                        const isToday =
                          isValid &&
                          today.getDate() === dayNum &&
                          today.getMonth() === month &&
                          today.getFullYear() === year;
                        const dateStr = isValid
                          ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                          : "";
                        const dayPosts = isValid
                          ? filtered.filter((p) => p.scheduledDate === dateStr)
                          : [];
                        const dayEvents = isValid
                          ? calEvents.filter((e) => e.date === dateStr)
                          : [];
                        const isHovered = hoveredDay === dateStr;
                        return (
                          <div
                            key={i}
                            style={{ position: "relative" }}
                            onMouseEnter={() =>
                              isValid && setHoveredDay(dateStr)
                            }
                            onMouseLeave={() => setHoveredDay(null)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (isValid) setDragOver(dateStr);
                            }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={() => {
                              dropOnDay(dateStr);
                              setDragOver(null);
                            }}
                            className={`min-h-[80px] rounded-xl p-1.5 transition-all ${!isValid ? "bg-transparent" : dragOver === dateStr ? "bg-primary/10 border-2 border-dashed border-primary/40" : isToday ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/20 hover:bg-muted/40"}`}
                          >
                            {isValid && (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <div
                                    className={`inline-flex ${isToday ? "w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold text-white" : "text-xs text-muted-foreground font-medium px-0.5"}`}
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
                                  <AnimatePresence>
                                    {isHovered && addEventDay !== dateStr && (
                                      <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddEventDay(dateStr);
                                        }}
                                        className="w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </motion.button>
                                    )}
                                  </AnimatePresence>
                                </div>
                                {dayPosts.slice(0, 3).map((p) => (
                                  <div
                                    key={p.id}
                                    draggable
                                    onDragStart={() => setDragging(p.id)}
                                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                                    onClick={() => setExpandedCard(expandedCard === p.id ? null : p.id)}
                                    className="mb-1 rounded-lg px-1.5 py-1 cursor-grab active:cursor-grabbing border text-left w-full"
                                    style={{
                                      backgroundColor: p.cardColor || `${p.accountColor}15`,
                                      borderColor: `${p.accountColor}40`,
                                      borderLeftWidth: "3px",
                                      borderLeftColor: p.accountColor,
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[9px] font-semibold text-foreground truncate flex-1">
                                        {p.scheduledTime} · {p.theme || p.content.slice(0, 18)}
                                      </span>
                                      {/* Member avatars */}
                                      <div className="flex -space-x-1 flex-shrink-0">
                                        {p.accountAvatarUrl ? (
                                          <img src={p.accountAvatarUrl} className="w-4 h-4 rounded-full object-cover ring-1 ring-white/30" alt="" />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-white/30" style={{ backgroundColor: p.accountColor || "#6366f1" }}>
                                            {p.accountAvatar}
                                          </div>
                                        )}
                                        {p.assignedAvatar && (
                                          p.assignedAvatarUrl ? (
                                            <img src={p.assignedAvatarUrl} className="w-4 h-4 rounded-full object-cover ring-1 ring-white/30" alt="" />
                                          ) : (
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-white/30" style={{ backgroundColor: p.assignedColor || "#8b5cf6" }}>
                                              {p.assignedAvatar}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                    {expandedCard === p.id && (
                                      <div className="mt-1 space-y-1">
                                        <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">{p.content}</p>
                                        {(p.mediaBase64?.length ?? 0) > 0 && (
                                          <img src={`data:${p.mediaTypes?.[0] ?? "image/jpeg"};base64,${p.mediaBase64![0]}`}
                                            className="w-full rounded object-cover" style={{ maxHeight: 60 }} alt="" />
                                        )}
                                        {p.comments?.filter((c: any) => c.text).length > 0 && (
                                          <div className="space-y-0.5">
                                            {p.comments.filter((c: any) => c.text).slice(0, 2).map((c: any, ci: number) => (
                                              <p key={c.id} className="text-[9px] text-muted-foreground">{ci + 1}. {c.text}</p>
                                            ))}
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <button onClick={(e) => { e.stopPropagation(); setEditing(p); }} className="text-[9px] text-primary hover:underline">Edit</button>
                                          <a href={buildGCalUrl(p)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] text-emerald-400 hover:underline">📅 GCal</a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {dayPosts.length > 3 && (
                                  <p className="text-[9px] text-muted-foreground px-1">
                                    +{dayPosts.length - 3} more
                                  </p>
                                )}
                                {dayEvents.map((ev) => {
                                  const ec = EVENT_COLORS[ev.color];
                                  return (
                                    <motion.div
                                      key={ev.id}
                                      initial={{ opacity: 0, y: 2 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      onClick={(e) => { e.stopPropagation(); setEditingEvent(ev); }}
                                      className="mb-1 rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-all flex items-center gap-1.5 px-2 py-1"
                                      style={{ backgroundColor: ec.hex }}
                                    >
                                      <p className="text-[9px] font-bold text-white truncate flex-1">{ev.title}</p>
                                      {ev.assignedAvatar && (
                                        <div className="w-3.5 h-3.5 rounded-full bg-white/30 flex items-center justify-center text-[6px] font-bold text-white flex-shrink-0">
                                          {ev.assignedAvatar}
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                                <AnimatePresence>
                                  {addEventDay === dateStr && (
                                    <AddEventPanel
                                      date={dateStr}
                                      onClose={() => setAddEventDay(null)}
                                      onSave={handleSaveEvent}
                                      members={members}
                                    />
                                  )}
                                </AnimatePresence>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

            {/* ── Weekly with hourly time slots ── */}
            {calMode === "weekly" &&
              (() => {
                // Get Monday of the current week
                const monday = new Date(calCurrentDate);
                const dow = monday.getDay();
                monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(monday);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                const today = new Date();
                const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm
                const SLOT_H = 64; // px per hour

                return (
                  <div className="flex flex-col min-w-[700px]">
                    {/* Day headers */}
                    <div className="flex border-b border-border/50 mb-0">
                      <div className="w-14 flex-shrink-0" />
                      {weekDays.map((d, di) => {
                        const isToday =
                          d.toDateString() === today.toDateString();
                        return (
                          <div
                            key={di}
                            className={`flex-1 text-center py-2 px-1 ${isToday ? "gradient-primary rounded-t-xl" : ""}`}
                          >
                            <p
                              className={`text-[10px] font-semibold ${isToday ? "text-white" : "text-muted-foreground"}`}
                            >
                              {DAYS[di]}
                            </p>
                            <p
                              className={`text-lg font-bold leading-none ${isToday ? "text-white" : "text-foreground"}`}
                            >
                              {d.getDate()}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Time grid */}
                    <div
                      className="flex relative overflow-y-auto"
                      style={{ maxHeight: "60vh" }}
                    >
                      {/* Hour labels */}
                      <div className="w-14 flex-shrink-0">
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            style={{ height: SLOT_H }}
                            className="flex items-start justify-end pr-2 pt-1"
                          >
                            <span className="text-[10px] text-muted-foreground/60 font-medium">
                              {h === 12
                                ? "12pm"
                                : h < 12
                                  ? `${h}am`
                                  : `${h - 12}pm`}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Day columns */}
                      {weekDays.map((d, di) => {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        const isToday =
                          d.toDateString() === today.toDateString();
                        const dayPosts = filtered.filter(
                          (p) => p.scheduledDate === dateStr,
                        );
                        const dayEvents = calEvents.filter(
                          (e) => e.date === dateStr,
                        );

                        return (
                          <div
                            key={di}
                            className="flex-1 relative border-l border-border/30"
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOver(dateStr);
                            }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={() => {
                              dropOnDay(dateStr);
                              setDragOver(null);
                            }}
                            style={{
                              backgroundColor:
                                dragOver === dateStr
                                  ? "rgba(99,102,241,0.04)"
                                  : undefined,
                            }}
                          >
                            {/* Hour gridlines */}
                            {HOURS.map((h) => (
                              <div
                                key={h}
                                style={{ height: SLOT_H }}
                                className="border-t border-border/20 relative group/slot"
                                onMouseEnter={() =>
                                  setHoveredDay(`${dateStr}-${h}`)
                                }
                                onMouseLeave={() => setHoveredDay(null)}
                              >
                                {hoveredDay === `${dateStr}-${h}` && (
                                  <button
                                    onClick={() => setAddEventDay(dateStr)}
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity"
                                  >
                                    <span className="text-[10px] text-primary/50">
                                      + Add
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))}

                            {/* Today current time line */}
                            {isToday &&
                              (() => {
                                const now = new Date();
                                const mins =
                                  (now.getHours() - 6) * 60 + now.getMinutes();
                                if (mins < 0 || mins > 18 * 60) return null;
                                return (
                                  <div
                                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                    style={{ top: (mins / 60) * SLOT_H }}
                                  >
                                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                                    <div className="flex-1 h-px bg-red-500" />
                                  </div>
                                );
                              })()}

                            {/* Posts positioned by time — image 1 style */}
                            {dayPosts.map((p) => {
                              const [ph, pm] = (p.scheduledTime || "09:00")
                                .split(":")
                                .map(Number);
                              const top = (((ph - 6) * 60 + pm) / 60) * SLOT_H;
                              if (top < 0) return null;
                              const isExpanded = expandedCard === p.id;
                              const firstTag = p.tags?.[0];
                              return (
                                <div
                                  key={p.id}
                                  draggable
                                  onDragStart={() => setDragging(p.id)}
                                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                                  onClick={() => setExpandedCard(isExpanded ? null : p.id)}
                                  className="absolute left-1 right-1 rounded-xl cursor-pointer hover:shadow-lg transition-all z-10 overflow-hidden"
                                  style={{
                                    top,
                                    minHeight: 72,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid rgba(0,0,0,0.07)",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                  }}
                                >
                                  <div className="p-2.5">
                                    {/* Tag pill + menu */}
                                    <div className="flex items-center justify-between mb-1.5">
                                      {firstTag ? (
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${TAG_COLORS[firstTag as ContentTag] || "bg-muted text-muted-foreground border-border"}`}>
                                          {firstTag}
                                        </span>
                                      ) : (
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${FUNNEL_COLORS[p.funnel] || ""}`}>
                                          {p.funnel}
                                        </span>
                                      )}
                                      <MoreHorizontal className="w-3 h-3 text-muted-foreground/40" />
                                    </div>
                                    {/* Title */}
                                    <p className="text-[11px] font-semibold text-gray-800 leading-snug line-clamp-2 mb-2">
                                      {p.theme || p.content.slice(0, 40) || "Untitled"}
                                    </p>
                                    {/* Bottom row: date + icons + avatars */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />{p.scheduledTime}
                                      </span>
                                      {(p.comments?.filter((c: any) => c.text).length ?? 0) > 0 && (
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                          <MessageSquare className="w-2.5 h-2.5" />
                                          {p.comments.filter((c: any) => c.text).length}
                                        </span>
                                      )}
                                      {(p.mediaBase64?.length ?? 0) > 0 && (
                                        <ImageIcon className="w-2.5 h-2.5 text-muted-foreground" />
                                      )}
                                      {/* Avatars right */}
                                      <div className="ml-auto flex items-center">
                                        {p.accountAvatarUrl ? (
                                          <img src={p.accountAvatarUrl} className="w-5 h-5 rounded-full object-cover ring-1 ring-white" alt="" />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-white" style={{ backgroundColor: p.accountColor }}>{p.accountAvatar}</div>
                                        )}
                                        {p.assignedAvatar && (
                                          p.assignedAvatarUrl ? (
                                            <img src={p.assignedAvatarUrl} className="w-5 h-5 rounded-full object-cover ring-1 ring-white -ml-1.5" alt="" />
                                          ) : (
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-white -ml-1.5" style={{ backgroundColor: p.assignedColor || "#6366f1" }}>{p.assignedAvatar}</div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Expanded view */}
                                  {isExpanded && (
                                    <div className="px-2.5 pb-2.5 border-t border-gray-100 pt-2 space-y-1.5">
                                      <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">{p.content}</p>
                                      {(p.mediaBase64?.length ?? 0) > 0 && (
                                        <img src={`data:${p.mediaTypes?.[0] ?? "image/jpeg"};base64,${p.mediaBase64![0]}`}
                                          className="w-full rounded-lg object-cover" style={{ maxHeight: 70 }} alt="" />
                                      )}
                                      {p.comments?.filter((c: any) => c.text).length > 0 && (
                                        <div>
                                          <p className="text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Comments</p>
                                          {p.comments.filter((c: any) => c.text).map((c: any, ci: number) => (
                                            <p key={c.id} className="text-[9px] text-gray-400">{ci + 1}. {c.text}</p>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setEditing(p); }} className="text-[9px] text-primary hover:underline">Edit</button>
                                        <a href={buildGCalUrl(p)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] text-emerald-500 hover:underline">📅 GCal</a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Events positioned by time — image 2 style: filled pill */}
                            {dayEvents.map((ev) => {
                              const ec = EVENT_COLORS[ev.color];
                              const [ph, pm] = (ev.time || "09:00").split(":").map(Number);
                              const [eh, em] = (ev.endTime || "10:00").split(":").map(Number);
                              const top = (((ph - 6) * 60 + pm) / 60) * SLOT_H;
                              const height = Math.max(28, (((eh - ph) * 60 + (em - pm)) / 60) * SLOT_H);
                              if (top < 0) return null;
                              const assignedMember = members.find(m => m.uid === ev.assignedToUid);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => setEditingEvent(ev)}
                                  className="absolute left-1 right-1 rounded-full cursor-pointer hover:opacity-90 transition-all z-10 flex items-center px-2 gap-2 overflow-hidden"
                                  style={{ top, height, backgroundColor: ec.hex }}
                                >
                                  {/* % or time pill */}
                                  <span className="text-[9px] font-bold text-white/80 bg-white/20 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                                    {ev.time}
                                  </span>
                                  {/* Title */}
                                  <p className="text-[11px] font-bold text-white truncate flex-1">
                                    {ev.title}
                                  </p>
                                  {/* Avatars */}
                                  <div className="flex items-center flex-shrink-0">
                                    {assignedMember?.photoURL ? (
                                      <img src={assignedMember.photoURL} className="w-5 h-5 rounded-full object-cover ring-1 ring-white/50" alt="" />
                                    ) : ev.assignedAvatar ? (
                                      <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white/50">
                                        {ev.assignedAvatar}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add event panel */}
                    <AnimatePresence>
                      {addEventDay && (
                        <div
                          className="fixed inset-0 z-[150] flex items-center justify-center bg-background/50 backdrop-blur-sm"
                          onClick={() => setAddEventDay(null)}
                        >
                          <div onClick={(e) => e.stopPropagation()}>
                            <AddEventPanel
                              date={addEventDay}
                              onClose={() => setAddEventDay(null)}
                              onSave={handleSaveEvent}
                              members={members}
                            />
                          </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
          </div>
        </motion.div>
      )}
      {/* Editor Modal */}
      {/* Editor Modal */}
      <AnimatePresence>
        {editing !== undefined && (
          <EditorModal
            post={editing}
            onClose={() => setEditing(undefined)}
            onSave={handleSave}
            linkedinAccounts={linkedinAccounts}
            members={members}
          />
        )}
      </AnimatePresence>

      {/* FIX: Edit calendar event modal */}
      <AnimatePresence>
        {editingEvent && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setEditingEvent(null)}
          >
            <div onClick={(e) => e.stopPropagation()} className="relative">
              <AddEventPanel
                date={editingEvent.date}
                onClose={() => setEditingEvent(null)}
                onSave={handleSaveEvent}
                members={members}
                existingEvent={editingEvent}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}