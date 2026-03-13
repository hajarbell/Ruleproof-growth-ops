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

interface Post {
  id: string;
  linkedinAccountId: string;
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

function PostCard({
  post,
  onClick,
  onArchive,
  onStatusChange,
}: {
  post: Post;
  onClick: () => void;
  onArchive?: (id: string) => void;
  onStatusChange?: (id: string, status: PostStatus) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);
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

  // content preview: first 120 chars
  const preview =
    post.content.slice(0, 120) + (post.content.length > 120 ? "…" : "");

  // progress dots: 4 steps based on content length
  const dots = Math.min(4, Math.ceil((post.content.length / 600) * 4));

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl overflow-visible shadow-sm hover:shadow-md transition-all cursor-pointer group relative select-none"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
      draggable
      onDragStart={(e) => {
        (e as unknown as DragEvent).dataTransfer?.setData("postId", post.id);
      }}
    >
      {/* Left accent stripe by status */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: STATUS_HEX[post.status] }}
      />

      <div className="p-4 pl-5" onClick={onClick}>
        {/* Top: title + menu */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4
            className="text-[13px] font-semibold leading-snug flex-1 line-clamp-2"
            style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}
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
                className="absolute right-0 top-7 z-50 rounded-xl border shadow-xl overflow-hidden w-44"
                style={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-3 py-1.5 border-b"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "#64748b" : "#94a3b8" }}
                  >
                    Move to
                  </p>
                </div>
                {(
                  [
                    "Draft",
                    "Scheduled",
                    "Published",
                    "Archived",
                  ] as PostStatus[]
                )
                  .filter((s) => s !== post.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onStatusChange?.(post.id, s);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                      style={{ color: isDark ? "#e2e8f0" : "#334155" }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_HEX[s] }}
                      />
                      {s}
                    </button>
                  ))}
                <div
                  className="border-t"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onClick();
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ color: isDark ? "#e2e8f0" : "#334155" }}
                >
                  ✏️ Edit
                </button>
                {onArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(post.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                  >
                    🗄️ Archive
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content preview */}
        {preview && (
          <p
            className="text-[11px] leading-relaxed mb-3 line-clamp-2"
            style={{ color: isDark ? "#94a3b8" : "#64748b" }}
          >
            {preview}
          </p>
        )}

        {/* Progress dots */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[3px] rounded-full flex-1 transition-all"
              style={{
                backgroundColor:
                  i <= dots
                    ? STATUS_HEX[post.status]
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.08)",
                opacity: i <= dots ? 0.8 : 1,
              }}
            />
          ))}
        </div>

        {/* Bottom: account avatar + name + date */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden shadow-sm"
            style={{
              border: `2px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
            }}
          >
            {post.accountAvatarUrl ? (
              <img
                src={post.accountAvatarUrl}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: post.accountColor || "#6366f1" }}
              >
                {post.accountAvatar}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-semibold truncate"
              style={{ color: isDark ? "#cbd5e1" : "#475569" }}
            >
              {post.account}
            </p>
            <p
              className="text-[10px]"
              style={{ color: isDark ? "#64748b" : "#94a3b8" }}
            >
              {post.scheduledDate
                ? post.scheduledDate
                    .replace(/(\d{4})-(\d{2})-(\d{2})/, "$3.$2.$1")
                    .slice(0, 8)
                : "No date"}
              {post.scheduledTime && ` · ${post.scheduledTime}`}
            </p>
          </div>
          {/* Assigned member avatar */}
          {post.assignedAvatar && (
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {post.assignedAvatar}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Google Calendar helpers ──────────────────────────────────────────────────
function buildGCalUrl(post: Post, memberEmail?: string): string {
  const title = encodeURIComponent(`📝 ${post.theme} — ${post.account}`);
  const date = post.scheduledDate.replace(/-/g, "");
  const time = (post.scheduledTime || "09:00").replace(":", "") + "00";
  const dtStart = `${date}T${time}`;
  const startMin = parseInt(time.slice(2, 4));
  const endMin = (startMin + 30) % 60;
  const endHour = parseInt(time.slice(0, 2)) + (startMin + 30 >= 60 ? 1 : 0);
  const dtEnd = `${date}T${String(endHour).padStart(2, "0")}${String(endMin).padStart(2, "0")}00`;
  const details = encodeURIComponent(
    `POST CONTENT:\n${post.content}\n\nAssigned to: ${post.assignedTo}`,
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
}: {
  date: string;
  onClose: () => void;
  onSave: (ev: CalEvent) => void;
  members: WorkspaceMember[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [assignedUid, setAssignedUid] = useState(members[0]?.uid ?? "");
  const [color, setColor] = useState<EventColor>("violet");
  const [reminders, setReminders] = useState<number[]>([15]);
  const [bellSound, setBellSound] = useState<BellSound>("chime");
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
      id: Date.now().toString(),
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
            🔔 Reminders
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

// ─── Editor Modal ─────────────────────────────────────────────────────────────
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

  const [content, setContent] = useState(post?.content ?? "");
  const [theme, setTheme] = useState(post?.theme ?? "");
  const [selAccId, setSelAccId] = useState(
    post?.linkedinAccountId ?? defaultAccount?.id ?? "",
  );
  const [selTags, setSelTags] = useState<ContentTag[]>(post?.tags ?? []);
  const [selFunnel, setSelFunnel] = useState<FunnelTag>(post?.funnel ?? "TOFU");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "Draft");
  const [date, setDate] = useState(post?.scheduledDate ?? "");
  const [time, setTime] = useState(post?.scheduledTime ?? "09:00");
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
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    type: string;
    previewUrl: string;
    size: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Try in-memory token first
    let token = (selAcc as any).accessToken as string | undefined;
    console.log(
      "[Publish] selAcc.id:",
      selAcc.id,
      "| in-memory token:",
      !!token,
    );

    if (!token) {
      // Direct Firestore read fallback — workspace may be null if not loaded yet
      const wsId = workspace?.id;
      if (wsId) {
        const snap = await getDoc(
          doc(db, "workspaces", wsId, "linkedinAccounts", selAcc.id),
        );
        token = snap.data()?.accessToken;
        console.log(
          "[Publish] Firestore fallback token:",
          !!token,
          "| fields:",
          Object.keys(snap.data() || {}),
        );
      } else {
        console.warn(
          "[Publish] workspace is null — cannot do Firestore fallback",
        );
      }
    }

    if (!token) {
      alert(
        "No LinkedIn access token found.\n\nPlease go to the LinkedIn page, disconnect this account, then reconnect it.",
      );
      return;
    }
    setPublishing(true);
    setPublishResult(null);
    try {
      // Get the LinkedIn person URN (stored as linkedinId = profile.sub from userinfo endpoint)
      const authorUrn = `urn:li:person:${selAcc.linkedinId}`;

      // UGC Posts API — requires Share on LinkedIn + Sign In with LinkedIn products
      const body = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: content },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setPublishResult("success");
        // Auto-update status to Published
        setStatus("Published");
        console.log("Published post ID:", data.id);
      } else {
        const err = await res.json();
        console.error("LinkedIn publish error:", err);
        setPublishResult("error");
      }
    } catch (e) {
      console.error("LinkedIn publish failed:", e);
      setPublishResult("error");
    } finally {
      setPublishing(false);
    }
  };

  const handleSave = () => {
    if (!selAcc) return;
    const saved: Post = {
      id: post?.id ?? Date.now().toString(),
      linkedinAccountId: selAcc.id,
      account: selAcc.name,
      accountAvatar: selAcc.avatarInitials || accountInitials(selAcc.name),
      accountColor: selAcc.avatarColor || "#6366f1",
      accountBio: selAcc.headline,
      accountFollowers: selAcc.followers,
      accountAvatarUrl: selAcc.avatarUrl || "",
      ...(uploadedFile?.previewUrl
        ? { uploadedFileUrl: uploadedFile.previewUrl }
        : {}),
      assignedToUid: selMember?.uid ?? "",
      assignedTo: selMember?.displayName || selMember?.email || "—",
      assignedAvatar: memberInitials(selMember ?? {}),
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
    if (status === "Scheduled" && date) {
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
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-1.5"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {status === "Scheduled" && date && (
                <p className="text-[9px] text-emerald-400 mt-1">
                  📅 Will open Google Calendar on save
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
                  <textarea
                    value={assignComment}
                    onChange={(e) => setAssignComment(e.target.value)}
                    placeholder="Add a note to the notification... (optional)"
                    rows={2}
                    className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
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
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setUploadedFile({
                        name: file.name,
                        type: file.type,
                        previewUrl: url,
                        size: file.size,
                      });
                    }}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {uploadedFile.type.startsWith("image/") ? (
                        <img
                          src={uploadedFile.previewUrl}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">📄</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(0)} KB ·{" "}
                          {uploadedFile.type.startsWith("image/")
                            ? "Image"
                            : "PDF"}
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full justify-center py-1"
                    >
                      <Image className="w-4 h-4" />
                      <span>Upload image, PDF or carousel visual</span>
                    </button>
                  )}
                </div>
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

                {/* Content — shows first 3 lines then "...see more" */}
                <div className="px-3 pb-2">
                  {(() => {
                    const lines = content.split("\n");
                    // LinkedIn shows ~3 lines before "...see more"
                    const CHAR_LIMIT =
                      device === "mobile"
                        ? 120
                        : device === "tablet"
                          ? 180
                          : 260;
                    const LINE_LIMIT = 3;
                    const truncateLines = lines.slice(0, LINE_LIMIT).join("\n");
                    const needsMore =
                      lines.length > LINE_LIMIT || content.length > CHAR_LIMIT;
                    const displayText = needsMore
                      ? truncateLines.length > CHAR_LIMIT
                        ? truncateLines.slice(0, CHAR_LIMIT)
                        : truncateLines
                      : content;
                    return (
                      <div>
                        <p
                          className={`text-[#000000e6] dark:text-[#ffffffd9] whitespace-pre-line leading-[1.5] ${device === "mobile" ? "text-[12px]" : "text-[14px]"}`}
                        >
                          {displayText || (
                            <span className="text-[#00000044]">
                              Your post content will appear here...
                            </span>
                          )}
                        </p>
                        {needsMore && content && (
                          <button
                            className={`text-[#00000066] dark:text-[#ffffff66] font-semibold ${device === "mobile" ? "text-[12px]" : "text-[14px]"}`}
                          >
                            …see more
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Uploaded image/PDF preview */}
                {uploadedFile && uploadedFile.type.startsWith("image/") && (
                  <div className="mx-0 mb-0">
                    <img
                      src={uploadedFile.previewUrl}
                      alt="attachment"
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                )}
                {uploadedFile && uploadedFile.type === "application/pdf" && (
                  <div className="mx-0 mb-0 border-t border-[#e0ddd8] dark:border-[#38434f]">
                    {/* LinkedIn-style document carousel card */}
                    <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center py-8 px-4 gap-3">
                      <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center shadow-md">
                        <span className="text-white text-2xl">📄</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-bold text-[#000000e6] dark:text-[#ffffffd9] truncate max-w-[180px]">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[11px] text-[#00000066] dark:text-[#ffffff66] mt-0.5">
                          PDF · Slide 1 of 1
                        </p>
                      </div>
                      {/* Carousel nav dots — LinkedIn style */}
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`rounded-full transition-all ${i === 0 ? "w-4 h-1.5 bg-[#0077b5]" : "w-1.5 h-1.5 bg-[#00000020] dark:bg-[#ffffff20]"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 flex items-center justify-between border-t border-[#e0ddd8] dark:border-[#38434f]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                          <span className="text-white text-[10px]">PDF</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-[#000000e6] dark:text-[#ffffffd9] truncate max-w-[140px]">
                            {uploadedFile.name}
                          </p>
                          <p className="text-[10px] text-[#00000066]">
                            Document
                          </p>
                        </div>
                      </div>
                      <button className="text-[11px] font-semibold text-[#0077b5] hover:underline flex-shrink-0">
                        View
                      </button>
                    </div>
                  </div>
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
  const [loadingPosts, setLoadingPosts] = useState(true);
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
  const [sheetPreview, setSheetPreview] = useState<Post | null>(null);
  const [lastClickTime, setLastClickTime] = useState<Record<string, number>>(
    {},
  );
  const [freeRows, setFreeRows] = useState<Record<string, string>[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [addEventDay, setAddEventDay] = useState<string | null>(null);
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
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));
      setLoadingPosts(false);
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

    // Save to Firestore (shared workspace calendar)
    await addDoc(collection(db, "workspaces", workspace.id, "calendarEvents"), {
      ...ev,
      createdAt: serverTimestamp(),
    });
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

  const dropOnDay = (dayKey: string) => {
    if (!dragging || !workspace) return;
    const post = posts.find((p) => p.id === dragging);
    if (!post) return;
    const newDate = `2026-03-${dayKey.padStart(2, "0")}`;
    updateDoc(doc(db, "workspaces", workspace.id, "contentPosts", dragging), {
      scheduledDate: newDate,
    });
    setDragging(null);
    setDragOver(null);
  };

  const filtered = posts.filter(
    (p) =>
      (filterStatus === "All"
        ? p.status !== "Archived"
        : p.status === filterStatus) &&
      (filterAcc === "All" ||
        p.account === filterAcc ||
        p.linkedinAccountId === filterAcc),
  );

  const renderCell = (post: Post, col: string): React.ReactNode => {
    const isEditing =
      editingCell?.postId === post.id && editingCell?.col === col;

    // Inline input — shown for ANY column when double-clicked
    if (isEditing)
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
    if (col === "assignedTo")
      return (
        <div className="flex items-center gap-1.5">
          <Av i={post.assignedAvatar} c="#6366f1" />
          <span className="text-xs">{post.assignedTo || "—"}</span>
        </div>
      );
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

  // Suppress unused import warnings from the original file
  void getDocs;
  void deleteDoc;

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
          {(
            ["Draft", "Scheduled", "Published", "Archived"] as PostStatus[]
          ).map((col) => {
            const colPosts = filtered.filter((p) => p.status === col);
            return (
              <div
                key={col}
                className="flex-1 min-w-[280px] flex flex-col gap-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  const postId = (
                    e as unknown as DragEvent
                  ).dataTransfer?.getData("postId");
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
                  {colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => setEditing(post)}
                      onStatusChange={async (id, newStatus) => {
                        if (workspace)
                          await updateDoc(
                            doc(
                              db,
                              "workspaces",
                              workspace.id,
                              "contentPosts",
                              id,
                            ),
                            { status: newStatus },
                          );
                      }}
                      onArchive={async (id) => {
                        if (workspace)
                          await updateDoc(
                            doc(
                              db,
                              "workspaces",
                              workspace.id,
                              "contentPosts",
                              id,
                            ),
                            { status: "Archived" },
                          );
                      }}
                    />
                  ))}
                  {colPosts.length === 0 && (
                    <div
                      className={`h-24 rounded-xl border-2 border-dashed flex items-center justify-center ${col === "Archived" ? "border-zinc-300/40 dark:border-zinc-600/30" : "border-border/50"}`}
                    >
                      <div className="text-center">
                        {col === "Archived" ? (
                          <Archive className="w-4 h-4 text-muted-foreground/40 mx-auto mb-1" />
                        ) : null}
                        <span className="text-xs text-muted-foreground/60">
                          No {col.toLowerCase()} posts
                        </span>
                      </div>
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
                        setCellValue(post[col.id] ?? "");
                      }}
                    >
                      {renderCell(post, col.id)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setEditing(post)}
                      className="text-[10px] text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted/50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {/* Freeform rows — not tied to posts */}
              {freeRows.map((row, rowIdx) => (
                <tr
                  key={`free-${rowIdx}`}
                  className="border-b border-border/40 hover:bg-muted/20 bg-muted/5"
                >
                  {sheetCols.map((col) => (
                    <td
                      key={col.id}
                      className="px-3 py-2 border-r border-border/30 last:border-r-0 max-w-[200px]"
                    >
                      <input
                        value={row[col.id] || ""}
                        onChange={(e) => {
                          const newRows = [...freeRows];
                          newRows[rowIdx] = {
                            ...newRows[rowIdx],
                            [col.id]: e.target.value,
                          };
                          setFreeRows(newRows);
                        }}
                        placeholder="—"
                        className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      onClick={() =>
                        setFreeRows((p) => p.filter((_, i) => i !== rowIdx))
                      }
                      className="text-[10px] text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={sheetCols.length + 1} className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFreeRows((p) => [...p, {}])}
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
              className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="h-1 w-full"
                style={{ backgroundColor: STATUS_HEX[sheetPreview.status] }}
              />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: sheetPreview.accountColor }}
                    >
                      {sheetPreview.accountAvatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {sheetPreview.account}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sheetPreview.scheduledDate}
                        {sheetPreview.scheduledTime &&
                          ` · ${sheetPreview.scheduledTime}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSheetPreview(null)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
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
                <div className="flex gap-2 mt-4">
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
                  const isToday = dayNum === 13;
                  const dateStr = isValid
                    ? `2026-03-${String(dayNum).padStart(2, "0")}`
                    : "";
                  const key = String(dayNum).padStart(2, "0");
                  const dayPosts = isValid
                    ? filtered.filter((p) => {
                        const d = new Date(p.scheduledDate);
                        return d.getDate() === dayNum && d.getMonth() === 2;
                      })
                    : [];
                  const dayEvents = isValid
                    ? calEvents.filter((e) => e.date === dateStr)
                    : [];
                  const isHovered = hoveredDay === dateStr;
                  return (
                    <div
                      key={i}
                      style={{ position: "relative" }}
                      onMouseEnter={() => isValid && setHoveredDay(dateStr)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (isValid) setDragOver(key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => dropOnDay(key)}
                      className={`min-h-[80px] rounded-xl p-1.5 transition-all ${!isValid ? "bg-transparent" : dragOver === key ? "bg-primary/10 border-2 border-dashed border-primary/40" : isToday ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/20 hover:bg-muted/40"}`}
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
                              className="mb-1 rounded-lg px-1.5 py-1 cursor-grab active:cursor-grabbing border"
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
                                  <p className="text-[9px] font-semibold text-muted-foreground uppercase">
                                    ⏰ {p.scheduledTime}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {p.content}
                                  </p>
                                  {p.comments.filter((c) => c.text).length >
                                    0 && (
                                    <div className="mt-1 border-t border-border/30 pt-1">
                                      <p className="text-[8px] font-semibold text-muted-foreground uppercase mb-0.5">
                                        💬 Comments
                                      </p>
                                      {p.comments
                                        .filter((c) => c.text)
                                        .map((c, ci) => (
                                          <p
                                            key={c.id}
                                            className="text-[9px] text-muted-foreground"
                                          >
                                            {ci + 1}. {c.text}
                                          </p>
                                        ))}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditing(p);
                                      }}
                                      className="text-[9px] text-primary hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <a
                                      href={buildGCalUrl(p)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[9px] text-emerald-400 hover:underline"
                                    >
                                      📅 GCal
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {dayEvents.map((ev) => {
                            const ec = EVENT_COLORS[ev.color];
                            const isForMe = ev.assignedToUid === user?.uid;
                            return (
                              <motion.div
                                key={ev.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-1 rounded-xl overflow-hidden cursor-pointer group/ev shadow-sm hover:shadow-md transition-all"
                                style={{
                                  backgroundColor: ec.hex + "18",
                                  border: `1px solid ${ec.hex}30`,
                                }}
                              >
                                {/* Top colour bar */}
                                <div
                                  className="h-0.5 w-full"
                                  style={{ backgroundColor: ec.hex }}
                                />
                                <div className="px-2 py-1.5">
                                  <p
                                    className="text-[10px] font-bold leading-tight truncate"
                                    style={{ color: ec.hex }}
                                  >
                                    {ev.title}
                                  </p>
                                  <div className="flex items-center justify-between mt-1 gap-1">
                                    <p className="text-[9px] text-muted-foreground font-medium">
                                      {ev.time}–{ev.endTime}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      {isForMe && (
                                        <span
                                          className="text-[8px] font-bold px-1 py-0.5 rounded"
                                          style={{
                                            backgroundColor: ec.hex + "30",
                                            color: ec.hex,
                                          }}
                                        >
                                          you
                                        </span>
                                      )}
                                      {ev.assignedAvatar && !isForMe && (
                                        <div
                                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                                          style={{ backgroundColor: ec.hex }}
                                        >
                                          {ev.assignedAvatar}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
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
          )}

          {/* Weekly */}
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
                  const isToday = dayNum === 13;
                  const dateStr = `2026-03-${String(dayNum).padStart(2, "0")}`;
                  const key = String(dayNum).padStart(2, "0");
                  const dayPosts = filtered.filter((p) => {
                    const d = new Date(p.scheduledDate);
                    return d.getDate() === dayNum && d.getMonth() === 2;
                  });
                  const dayEvents = calEvents.filter((e) => e.date === dateStr);
                  const isHovered = hoveredDay === dateStr;
                  return (
                    <div
                      key={dayNum}
                      style={{ position: "relative" }}
                      onMouseEnter={() => setHoveredDay(dateStr)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => dropOnDay(key)}
                      className={`min-h-[420px] rounded-xl transition-all ${dragOver === key ? "bg-primary/5 border-2 border-dashed border-primary/40" : "bg-muted/20"}`}
                    >
                      <div
                        className={`px-3 py-2.5 rounded-t-xl border-b border-border/50 flex items-center justify-between ${isToday ? "gradient-primary" : ""}`}
                      >
                        <div>
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
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${isToday ? "bg-white/20 hover:bg-white/30 text-white" : "bg-primary/10 hover:bg-primary/20 text-primary"}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="p-2 space-y-2">
                        {dayEvents.map((ev) => {
                          const ec = EVENT_COLORS[ev.color];
                          const isForMe = ev.assignedToUid === user?.uid;
                          return (
                            <motion.div
                              key={ev.id}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                              style={{
                                backgroundColor: ec.hex + "15",
                                border: `1px solid ${ec.hex}35`,
                              }}
                            >
                              {/* Left accent */}
                              <div className="flex">
                                <div
                                  className="w-1 flex-shrink-0 rounded-l-xl"
                                  style={{ backgroundColor: ec.hex }}
                                />
                                <div className="flex-1 px-2.5 py-2">
                                  <p
                                    className="text-[12px] font-bold leading-snug"
                                    style={{ color: ec.hex }}
                                  >
                                    {ev.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    ⏰ {ev.time} → {ev.endTime}
                                  </p>
                                  {ev.assignedTo && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <div
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                        style={{ backgroundColor: ec.hex }}
                                      >
                                        {ev.assignedAvatar}
                                      </div>
                                      <span
                                        className="text-[10px] font-medium"
                                        style={{ color: ec.hex + "cc" }}
                                      >
                                        {ev.assignedTo.split(" ")[0]}
                                        {isForMe ? " (you)" : ""}
                                      </span>
                                    </div>
                                  )}
                                  {ev.reminders.length > 0 && (
                                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                                      🔔{" "}
                                      {ev.reminders
                                        .map((m) =>
                                          m < 60 ? `${m}min` : `${m / 60}h`,
                                        )
                                        .join(", ")}{" "}
                                      before
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
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
                            className="rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-border/60"
                            style={{ backgroundColor: p.cardColor || "white" }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Av i={p.accountAvatar} c={p.accountColor} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-foreground truncate">
                                  {p.account.split(" ")[0]}
                                </p>
                                <p
                                  className="text-[10px] font-bold"
                                  style={{ color: STATUS_HEX[p.status] }}
                                >
                                  ⏰ {p.scheduledTime}
                                </p>
                              </div>
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-foreground mb-1 line-clamp-1">
                              {p.theme}
                            </p>
                            {expandedCard === p.id ? (
                              <div className="space-y-2">
                                <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">
                                  {p.content}
                                </p>
                                {p.comments.filter((c) => c.text).length >
                                  0 && (
                                  <div className="border-t border-border/40 pt-2">
                                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">
                                      💬 Comments
                                    </p>
                                    {p.comments
                                      .filter((c) => c.text)
                                      .map((c, ci) => (
                                        <p
                                          key={c.id}
                                          className="text-[9px] text-muted-foreground mb-0.5"
                                        >
                                          {ci + 1}. {c.text}
                                        </p>
                                      ))}
                                  </div>
                                )}
                                <div className="flex gap-2 items-center flex-wrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditing(p);
                                    }}
                                    className="text-[9px] text-primary hover:underline"
                                  >
                                    Edit post
                                  </button>
                                  <a
                                    href={buildGCalUrl(
                                      p,
                                      members.find(
                                        (m) => m.uid === p.assignedToUid,
                                      )?.email,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[9px] text-emerald-400 hover:underline"
                                  >
                                    📅 Add to GCal
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                                  {p.content}
                                </p>
                                <div className="flex flex-wrap gap-0.5">
                                  {(p.tags || []).slice(0, 1).map((t) => (
                                    <span
                                      key={t}
                                      className={`text-[8px] px-1.5 py-0.5 rounded-full border ${TAG_COLORS[t as ContentTag] || ""}`}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  <span
                                    className={`text-[8px] px-1.5 py-0.5 rounded-full ${FUNNEL_COLORS[p.funnel]}`}
                                  >
                                    {p.funnel}
                                  </span>
                                  {p.comments.filter((c) => c.text).length >
                                    0 && (
                                    <span className="text-[8px] text-muted-foreground">
                                      💬{" "}
                                      {p.comments.filter((c) => c.text).length}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {dayPosts.length === 0 && dayEvents.length === 0 && (
                          <button
                            onClick={() => setAddEventDay(dateStr)}
                            className="w-full h-16 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/30 hover:bg-primary/5 transition-all"
                          >
                            <Plus className="w-4 h-4 text-muted-foreground/40" />
                          </button>
                        )}
                      </div>
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
            onSave={handleSave}
            linkedinAccounts={linkedinAccounts}
            members={members}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
