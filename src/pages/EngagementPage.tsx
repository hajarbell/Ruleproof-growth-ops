// src/pages/EngagementPage.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
  UserPlus,
  Check,
  Clock,
  AlertCircle,
  Linkedin,
  StickyNote,
  ChevronRight,
  Flame,
  Search,
  BookmarkPlus,
  Copy,
  CheckCheck,
  Bell,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────
type Segment = "Creators" | "ICPs" | "Supporters" | "Competitors";
type Stage =
  | "Saved"
  | "Commented"
  | "Replied"
  | "Connection Sent"
  | "Connected"
  | "DM Sent"
  | "Conversation"
  | "Lead";

interface PostTimestamp {
  date: string;
  dayOfWeek: number;
  hour: number;
}

interface Interaction {
  id: string;
  type:
    | "commented"
    | "replied"
    | "dm_sent"
    | "connected"
    | "connection_sent"
    | "added"
    | "followed_up";
  note: string;
  date: string;
  createdAt?: string;
}

interface EngagementProfile {
  id: string;
  name: string;
  headline: string;
  avatarInitials: string;
  avatarColor: string;
  followers: string;
  profileUrl: string;
  segment: Segment;
  stage: Stage;
  lastInteracted: string;
  postTimestamps?: PostTimestamp[];
  postingPattern?: string;
  interactions: Interaction[];
  notes: string;
  followUpAlert?: string;
  followUpDate?: string;
  connectionAccepted?: boolean;
  createdAt?: string;
  memberLinkedInName?: string;
  memberLinkedInBio?: string;
  memberLinkedInUrl?: string;
  memberLinkedInFollowers?: string;
}

interface DailyProgress {
  comments: number;
  dms: number;
  connections: number;
  date: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SEGMENTS: Segment[] = ["Creators", "ICPs", "Supporters", "Competitors"];

const STAGE_COLORS: Record<Stage, string> = {
  Saved: "bg-muted text-muted-foreground",
  Commented: "bg-primary/10 text-primary",
  Replied: "bg-success/10 text-success",
  "Connection Sent": "bg-warning/10 text-warning",
  Connected: "bg-success/15 text-success",
  "DM Sent": "bg-warning/15 text-warning",
  Conversation: "bg-primary/15 text-primary",
  Lead: "bg-success/20 text-success font-semibold",
};

const STAGE_ORDER: Stage[] = [
  "Saved",
  "Commented",
  "Replied",
  "Connection Sent",
  "Connected",
  "DM Sent",
  "Conversation",
  "Lead",
];

const INTERACTION_ICONS: Record<Interaction["type"], React.ReactNode> = {
  commented: <MessageSquare className="w-3 h-3" />,
  replied: <Check className="w-3 h-3" />,
  dm_sent: <Send className="w-3 h-3" />,
  connected: <UserPlus className="w-3 h-3" />,
  connection_sent: <UserPlus className="w-3 h-3" />,
  added: <Plus className="w-3 h-3" />,
  followed_up: <Clock className="w-3 h-3" />,
};

const INTERACTION_COLORS: Record<Interaction["type"], string> = {
  commented: "bg-primary/10 text-primary",
  replied: "bg-success/10 text-success",
  dm_sent: "bg-warning/10 text-warning",
  connected: "bg-success/15 text-success",
  connection_sent: "bg-warning/10 text-warning",
  added: "bg-muted text-muted-foreground",
  followed_up: "bg-warning/10 text-warning",
};

const AVATAR_COLORS = [
  "#6366f1",
  "#ec4899",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY = new Date().toISOString().split("T")[0];
const GOALS = { comments: 50, dms: 20, connections: 5 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcPostingPattern(timestamps?: PostTimestamp[]): string {
  if (!timestamps || timestamps.length === 0) return "Unknown";
  const dayCounts: Record<number, number> = {};
  const hours: number[] = [];
  timestamps.forEach(({ dayOfWeek, hour }) => {
    dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;
    hours.push(hour);
  });
  const topDays = Object.entries(dayCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([d]) => DAYS[Number(d)]);
  const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
  const ampm = avgHour < 12 ? "AM" : "PM";
  const h = avgHour % 12 || 12;
  return `${topDays.join(" · ")} · ~${h}${ampm}`;
}

function getAutoAlert(profile: EngagementProfile): string | null {
  if (profile.stage === "Connection Sent" && !profile.connectionAccepted) {
    const sent = profile.interactions.find(
      (i) => i.type === "connection_sent" || i.type === "connected",
    );
    if (sent) {
      const days = Math.floor(
        (Date.now() - new Date(sent.createdAt || sent.date).getTime()) /
          86400000,
      );
      if (days >= 5) return `No reply to connection request after ${days} days`;
    }
  }
  if (profile.stage === "DM Sent") {
    const dm = profile.interactions.find((i) => i.type === "dm_sent");
    if (dm) {
      const days = Math.floor(
        (Date.now() - new Date(dm.createdAt || dm.date).getTime()) / 86400000,
      );
      if (days >= 3) return `No reply to DM after ${days} days — follow up?`;
    }
  }
  if (profile.followUpDate && new Date(profile.followUpDate) <= new Date()) {
    return "Follow-up overdue — reach out now";
  }
  if (profile.stage === "Saved" && profile.createdAt) {
    const days = Math.floor(
      (Date.now() - new Date(profile.createdAt).getTime()) / 86400000,
    );
    if (days >= 3) return `Added ${days} days ago — time to engage!`;
  }
  return profile.followUpAlert || null;
}

// ─── Bookmarklet Modal ────────────────────────────────────────────────────────
function BookmarkletModal({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.origin;

  // Uses window.open() instead of fetch() — bypasses LinkedIn's Content Security Policy
  const bm = [
    "javascript:(function(){",
    "var base='" + appUrl + "/save-profile';",
    "var n='';var h='';var fu=window.location.href;var fw='';",
    "try{n=document.querySelector('.text-heading-xlarge')?.innerText?.trim()||document.querySelector('h1')?.innerText?.trim()||'';}catch(e){}",
    "try{h=document.querySelector('.text-body-medium.break-words')?.innerText?.trim()||document.querySelector('.text-body-medium')?.innerText?.trim()||'';}catch(e){}",
    "try{var fwEl=Array.from(document.querySelectorAll('span')).find(function(el){return el.innerText&&el.innerText.match(/^[\\d,\\.]+[KMB]?\\s*followers/i);});fw=fwEl?fwEl.innerText.match(/[\\d,\\.]+[KMB]?/i)[0]:'';}catch(e){}",
    "var pts=[];",
    "try{document.querySelectorAll('time[datetime]').forEach(function(el){",
    "var dt=el.getAttribute('datetime');",
    "if(dt){var d=new Date(dt);if(!isNaN(d.getTime()))pts.push({date:d.toISOString(),dayOfWeek:d.getDay(),hour:d.getHours()});}",
    "});}catch(e){}",
    "var url=base+'?name='+encodeURIComponent(n)+'&headline='+encodeURIComponent(h)+'&profileUrl='+encodeURIComponent(fu)+'&followers='+encodeURIComponent(fw)+'&pts='+encodeURIComponent(JSON.stringify(pts));",
    "window.open(url,'ruproof_save','width=420,height=300,top=100,left=100');",
    "})();",
  ].join("");

  const copy = async () => {
    await navigator.clipboard.writeText(bm);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <BookmarkPlus className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground font-display">
              Install Bookmarklet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Install once
            </p>
            {[
              "Copy the code below",
              'In Chrome: right-click bookmarks bar → "Add page"',
              'Paste the code as the URL — name it "Save to Engagement"',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-success/5 border border-success/20 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Use it every time
            </p>
            {[
              "Go to any LinkedIn profile",
              "Scroll down so their recent posts are visible",
              "Click the bookmark → small popup opens, saves, closes ✨",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-success/20 text-success text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Bookmarklet Code
              </p>
              <button
                onClick={copy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? "bg-success/10 text-success"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3 h-3" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-muted border border-border font-mono text-[10px] text-muted-foreground break-all leading-relaxed max-h-24 overflow-y-auto select-all cursor-text">
              {bm}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            ✅ Zero LinkedIn TOS risk — only runs when you click it, never in
            background.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Profile Modal ────────────────────────────────────────────────────────
function AddProfileModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (p: Omit<EngagementProfile, "id" | "interactions">) => void;
}) {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [segment, setSegment] = useState<Segment>("Creators");
  const [notes, setNotes] = useState("");

  const ini = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length] || "#6366f1";

  const handleSubmit = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onAdd({
      name: name.trim(),
      headline: headline.trim(),
      avatarInitials: ini || "??",
      avatarColor: color,
      followers: followers.trim() || "—",
      profileUrl: profileUrl.trim() || "#",
      segment,
      stage: "Saved",
      lastInteracted: now,
      postTimestamps: [],
      postingPattern: "Unknown",
      notes: notes.trim(),
      createdAt: now,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground font-display">
            Add Profile
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Chen"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Headline / Bio
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="AI Founder · Building tools for operators"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              LinkedIn Profile URL
            </label>
            <input
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://linkedin.com/in/sarah-chen"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Followers
            </label>
            <input
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              placeholder="12.4K"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Segment
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SEGMENTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you add this person? What's interesting about them?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Add Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Profile Detail Panel ─────────────────────────────────────────────────────
function ProfilePanel({
  profile,
  onClose,
  onLogInteraction,
  onUpdateNotes,
  onUpdateStage,
  onUpdateSegment,
  onDelete,
  onSetFollowUp,
  fullscreen,
  onToggleFullscreen,
}: {
  profile: EngagementProfile;
  onClose: () => void;
  onLogInteraction: (
    profileId: string,
    type: Interaction["type"],
    note: string,
  ) => void;
  onUpdateNotes: (profileId: string, notes: string) => void;
  onUpdateStage: (profileId: string, stage: Stage) => void;
  onUpdateSegment: (profileId: string, segment: Segment) => void;
  onDelete: (profileId: string) => void;
  onSetFollowUp: (profileId: string, date: string) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [noteText, setNoteText] = useState(profile.notes);
  const [interactionNote, setInteractionNote] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<Interaction["type"]>("commented");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(
    profile.followUpDate?.split("T")[0] || "",
  );

  const alert = getAutoAlert(profile);
  const currentStageIdx = STAGE_ORDER.indexOf(profile.stage);
  const pattern =
    profile.postingPattern || calcPostingPattern(profile.postTimestamps);

  const handleLog = () => {
    if (!interactionNote.trim()) return;
    onLogInteraction(profile.id, logType, interactionNote.trim());
    setInteractionNote("");
    setShowLogForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className={`flex flex-col bg-card border border-border rounded-2xl shadow-soft overflow-hidden ${
        fullscreen ? "fixed inset-4 z-[150]" : "h-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: profile.avatarColor }}
          >
            {profile.avatarInitials}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{profile.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {profile.headline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Open LinkedIn profile"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setShowFollowUp((f) => !f)}
            className={`p-1.5 rounded-lg transition-colors ${
              profile.followUpDate
                ? "text-warning bg-warning/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Set follow-up reminder"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Follow-up alert */}
        {alert && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning leading-relaxed">{alert}</p>
          </div>
        )}

        {/* Follow-up date picker */}
        <AnimatePresence>
          {showFollowUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-3 overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                  Set Follow-up Reminder
                </p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={() => {
                      onSetFollowUp(profile.id, followUpDate);
                      setShowFollowUp(false);
                    }}
                    className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium"
                  >
                    Set
                  </button>
                  {profile.followUpDate && (
                    <button
                      onClick={() => {
                        onSetFollowUp(profile.id, "");
                        setFollowUpDate("");
                        setShowFollowUp(false);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats row */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Followers</p>
            <p className="text-sm font-bold text-foreground">
              {profile.followers}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Posts when</p>
            <p className="text-sm font-bold text-foreground truncate">
              {pattern}
            </p>
          </div>
        </div>

        {/* Posting pattern day grid */}
        {profile.postTimestamps && profile.postTimestamps.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Posting Activity
            </p>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day, i) => {
                const count = profile.postTimestamps!.filter(
                  (t) => t.dayOfWeek === i,
                ).length;
                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-full h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                        count > 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Segment selector */}
        <div className="px-4 pt-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Segment
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SEGMENTS.map((s) => (
              <button
                key={s}
                onClick={() => onUpdateSegment(profile.id, s)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                  profile.segment === s
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Relationship stage pipeline */}
        <div className="px-4 pt-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Relationship Stage
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STAGE_ORDER.map((s, i) => {
              const isActive = s === profile.stage;
              const isPast = i < currentStageIdx;
              return (
                <button
                  key={s}
                  onClick={() => onUpdateStage(profile.id, s)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    isActive
                      ? `${STAGE_COLORS[s]} border-current font-semibold`
                      : isPast
                        ? "bg-muted/60 text-muted-foreground border-transparent opacity-60"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {isPast && <span className="mr-1 opacity-60">✓</span>}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pt-3 grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              setLogType("commented");
              setInteractionNote("");
              setShowLogForm(true);
            }}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-primary font-medium">
              Comment
            </span>
          </button>
          <button
            onClick={() => {
              setLogType("dm_sent");
              setInteractionNote("");
              setShowLogForm(true);
            }}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-warning/10 hover:bg-warning/20 transition-colors"
          >
            <Send className="w-4 h-4 text-warning" />
            <span className="text-[10px] text-warning font-medium">DM</span>
          </button>
          <button
            onClick={() => {
              setLogType("connection_sent");
              setInteractionNote("Sent connection request");
              setShowLogForm(true);
            }}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-success/10 hover:bg-success/20 transition-colors"
          >
            <UserPlus className="w-4 h-4 text-success" />
            <span className="text-[10px] text-success font-medium">
              Connect
            </span>
          </button>
        </div>

        {/* Log interaction form */}
        <AnimatePresence>
          {showLogForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-2 overflow-hidden"
            >
              <div className="bg-muted/40 rounded-xl p-3 border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase">
                  Log {logType.replace(/_/g, " ")}
                </p>
                <input
                  value={interactionNote}
                  onChange={(e) => setInteractionNote(e.target.value)}
                  placeholder="What happened? e.g. Commented on her AI post..."
                  className="w-full px-2.5 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring mb-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLog();
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLogForm(false)}
                    className="flex-1 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLog}
                    className="flex-1 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                  >
                    Log It
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Member's LinkedIn panel */}
        {profile.memberLinkedInName && (
          <div className="px-4 pt-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Your LinkedIn Account
            </p>
            <div className="bg-muted/40 rounded-xl p-3 border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Linkedin className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {profile.memberLinkedInName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {profile.memberLinkedInBio}
                </p>
                {profile.memberLinkedInFollowers && (
                  <p className="text-[10px] text-primary mt-0.5">
                    {profile.memberLinkedInFollowers} followers
                  </p>
                )}
              </div>
              {profile.memberLinkedInUrl && (
                <a
                  href={profile.memberLinkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Interaction history */}
        <div className="px-4 pt-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Interaction History
          </p>
          <div className="space-y-2">
            {profile.interactions.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No interactions logged yet.
              </p>
            )}
            {profile.interactions.map((interaction) => (
              <div key={interaction.id} className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    INTERACTION_COLORS[interaction.type] ||
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {INTERACTION_ICONS[interaction.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">
                    {interaction.note}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {interaction.createdAt
                      ? new Date(interaction.createdAt).toLocaleDateString()
                      : interaction.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Notes
            </p>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => onUpdateNotes(profile.id, noteText)}
            placeholder="Add a note about this person..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {/* Delete */}
        <div className="px-4 pb-4">
          <button
            onClick={() => {
              if (
                confirm(`Remove ${profile.name} from your Engagement Matrix?`)
              ) {
                onDelete(profile.id);
              }
            }}
            className="w-full py-2 rounded-xl border border-destructive/20 text-xs text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" /> Remove profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EngagementPage() {
  const { user, workspace } = useAuth() as any;
  const workspaceId: string = workspace?.id || user?.uid || "";

  const [profiles, setProfiles] = useState<EngagementProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<Segment>("Creators");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");
  const [progress, setProgress] = useState<DailyProgress>({
    comments: 0,
    dms: 0,
    connections: 0,
    date: TODAY,
  });

  // ── Firebase: live profiles ──────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(db, "workspaces", workspaceId, "engagementProfiles"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProfiles(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as EngagementProfile,
          ),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [workspaceId]);

  // ── Firebase: today's progress ───────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    getDoc(
      doc(db, "workspaces", workspaceId, "engagementProgress", TODAY),
    ).then((snap) => {
      if (snap.exists()) setProgress(snap.data() as DailyProgress);
    });
  }, [workspaceId]);

  const saveProgress = async (p: DailyProgress) => {
    if (!workspaceId) return;
    await setDoc(
      doc(db, "workspaces", workspaceId, "engagementProgress", TODAY),
      p,
    );
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const segmentProfiles = profiles.filter((p) => p.segment === activeSegment);
  const filteredProfiles = segmentProfiles.filter((p) => {
    const matchSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.headline || "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "All" || p.stage === stageFilter;
    return matchSearch && matchStage;
  });
  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null;
  const segmentCount = (s: Segment) =>
    profiles.filter((p) => p.segment === s).length;
  const alertCount = profiles.filter((p) => getAutoAlert(p)).length;
  const progressPct = (val: number, max: number) =>
    Math.min(100, Math.round((val / max) * 100));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = async (
    data: Omit<EngagementProfile, "id" | "interactions">,
  ) => {
    if (!workspaceId) return;
    const now = new Date().toISOString();
    const ref = await addDoc(
      collection(db, "workspaces", workspaceId, "engagementProfiles"),
      {
        ...data,
        interactions: [
          {
            id: "i0",
            type: "added",
            note: "Added to engagement list",
            date: now,
            createdAt: now,
          },
        ],
        updatedAt: now,
      },
    );
    setSelectedId(ref.id);
    setActiveSegment(data.segment);
  };

  const handleLogInteraction = async (
    profileId: string,
    type: Interaction["type"],
    note: string,
  ) => {
    if (!workspaceId) return;
    const now = new Date().toISOString();
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const newInteraction: Interaction = {
      id: Date.now().toString(),
      type,
      note,
      date: now,
      createdAt: now,
    };
    const updatedInteractions = [newInteraction, ...profile.interactions];

    // Auto-advance stage
    let newStage = profile.stage;
    if (type === "commented" && profile.stage === "Saved")
      newStage = "Commented";
    if (type === "replied" && profile.stage === "Commented")
      newStage = "Replied";
    if (type === "connection_sent") newStage = "Connection Sent";
    if (type === "connected") newStage = "Connected";
    if (type === "dm_sent" && profile.stage === "Connected")
      newStage = "DM Sent";

    await updateDoc(
      doc(db, "workspaces", workspaceId, "engagementProfiles", profileId),
      {
        interactions: updatedInteractions,
        stage: newStage,
        lastInteracted: now,
        updatedAt: now,
      },
    );

    // Update daily progress
    const newProgress = { ...progress };
    if (type === "commented") newProgress.comments += 1;
    if (type === "dm_sent") newProgress.dms += 1;
    if (type === "connection_sent") newProgress.connections += 1;
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const handleUpdateNotes = async (profileId: string, notes: string) => {
    if (!workspaceId) return;
    await updateDoc(
      doc(db, "workspaces", workspaceId, "engagementProfiles", profileId),
      {
        notes,
        updatedAt: new Date().toISOString(),
      },
    );
  };

  const handleUpdateStage = async (profileId: string, stage: Stage) => {
    if (!workspaceId) return;
    const updates: Record<string, unknown> = {
      stage,
      updatedAt: new Date().toISOString(),
    };
    if (stage === "Connected") updates.connectionAccepted = true;
    await updateDoc(
      doc(db, "workspaces", workspaceId, "engagementProfiles", profileId),
      updates,
    );
  };

  const handleUpdateSegment = async (profileId: string, segment: Segment) => {
    if (!workspaceId) return;
    await updateDoc(
      doc(db, "workspaces", workspaceId, "engagementProfiles", profileId),
      {
        segment,
        updatedAt: new Date().toISOString(),
      },
    );
  };

  const handleDelete = async (profileId: string) => {
    if (!workspaceId) return;
    await deleteDoc(
      doc(db, "workspaces", workspaceId, "engagementProfiles", profileId),
    );
    if (selectedId === profileId) setSelectedId(null);
  };

  const handleSetFollowUp = async (profileId: string, date: string) => {
    if (!workspaceId) return;
    await updateDoc(
      doc(db, "workspaces", workspaceId, "engagementProfiles", profileId),
      {
        followUpDate: date ? new Date(date).toISOString() : "",
        updatedAt: new Date().toISOString(),
      },
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-[1600px]">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              Engagement Matrix
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your LinkedIn relationship OS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-xs font-medium text-warning">
              <Bell className="w-3.5 h-3.5" />
              {alertCount} alert{alertCount > 1 ? "s" : ""}
            </div>
          )}
          <button
            onClick={() => setShowBookmarklet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Bookmarklet
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-soft"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Profile
          </button>
        </div>
      </div>

      {/* ── Daily goal cards ── */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl p-4 border border-border/50 shadow-soft"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Comments today</p>
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold font-display text-foreground">
              {progress.comments}
            </span>
            <span className="text-sm text-muted-foreground">
              / {GOALS.comments}
            </span>
            {progress.comments >= GOALS.comments && (
              <span className="text-xs text-success font-semibold ml-1">
                🔥
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${progressPct(progress.comments, GOALS.comments)}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {progressPct(progress.comments, GOALS.comments)}% of daily goal
          </p>
        </motion.div>

        {/* DMs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 border border-border/50 shadow-soft"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">DMs sent today</p>
            <Send className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold font-display text-foreground">
              {progress.dms}
            </span>
            <span className="text-sm text-muted-foreground">/ {GOALS.dms}</span>
            {progress.dms >= GOALS.dms && (
              <span className="text-xs text-success font-semibold ml-1">
                🔥
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct(progress.dms, GOALS.dms)}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full bg-warning"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {progressPct(progress.dms, GOALS.dms)}% of daily goal
          </p>
        </motion.div>

        {/* Connections */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-xl p-4 border border-border/50 shadow-soft"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Connections sent</p>
            <UserPlus className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold font-display text-foreground">
              {progress.connections}
            </span>
            <span className="text-sm text-muted-foreground">
              / {GOALS.connections}
            </span>
            {progress.connections >= GOALS.connections && (
              <span className="text-xs text-success font-semibold ml-1">
                🔥
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${progressPct(progress.connections, GOALS.connections)}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              className="h-full rounded-full bg-success"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {progressPct(progress.connections, GOALS.connections)}% of daily
            goal
          </p>
        </motion.div>
      </div>

      {/* ── Main layout: list + right panel ── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── Left: Profile list ── */}
        <div className="flex-1 flex flex-col glass rounded-2xl border border-border/50 shadow-soft overflow-hidden min-w-0">
          {/* Segment tabs */}
          <div className="flex items-center border-b border-border flex-shrink-0 overflow-x-auto">
            {SEGMENTS.map((seg) => {
              const hasAlerts = profiles.some(
                (p) => p.segment === seg && getAutoAlert(p),
              );
              return (
                <button
                  key={seg}
                  onClick={() => setActiveSegment(seg)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors relative ${
                    activeSegment === seg
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {seg}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeSegment === seg
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {segmentCount(seg)}
                  </span>
                  {hasAlerts && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning absolute top-2.5 right-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search profiles..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as Stage | "All")}
              className="px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="All">All stages</option>
              {STAGE_ORDER.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[36px_1fr_100px_90px_80px] gap-3 px-4 py-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex-shrink-0">
            <div />
            <div>Profile</div>
            <div>Stage</div>
            <div>Last seen</div>
            <div>Action</div>
          </div>

          {/* Profile rows */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <p className="text-sm">Loading...</p>
              </div>
            )}
            {!loading && filteredProfiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <Target className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No profiles found</p>
                <button
                  onClick={() => setShowBookmarklet(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Install bookmarklet to save LinkedIn profiles instantly
                </button>
              </div>
            )}
            {filteredProfiles.map((profile, idx) => {
              const isSelected = selectedId === profile.id;
              const hasAlert = !!getAutoAlert(profile);
              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setSelectedId(isSelected ? null : profile.id)}
                  className={`grid grid-cols-[36px_1fr_100px_90px_80px] gap-3 items-center px-4 py-3 border-b border-border/50 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: profile.avatarColor }}
                  >
                    {profile.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile.name}
                      </p>
                      {hasAlert && (
                        <Flame className="w-3 h-3 text-warning flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.headline}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${STAGE_COLORS[profile.stage]}`}
                    >
                      {profile.stage}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.lastInteracted
                      ? new Date(profile.lastInteracted).toLocaleDateString()
                      : "—"}
                  </p>
                  <div className="flex items-center gap-1">
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Open LinkedIn profile"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected
                          ? "text-primary rotate-90"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Profile detail panel ── */}
        <AnimatePresence>
          {selectedProfile && (
            <div
              className={`flex-shrink-0 ${fullscreen ? "w-0" : "w-[320px]"}`}
            >
              <ProfilePanel
                profile={selectedProfile}
                onClose={() => {
                  setSelectedId(null);
                  setFullscreen(false);
                }}
                onLogInteraction={handleLogInteraction}
                onUpdateNotes={handleUpdateNotes}
                onUpdateStage={handleUpdateStage}
                onUpdateSegment={handleUpdateSegment}
                onDelete={handleDelete}
                onSetFollowUp={handleSetFollowUp}
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddProfileModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAdd}
          />
        )}
        {showBookmarklet && (
          <BookmarkletModal
            workspaceId={workspaceId}
            onClose={() => setShowBookmarklet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
