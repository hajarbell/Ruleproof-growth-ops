// src/pages/EngagementPage.tsx
import { useState } from "react";
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
  Github,
  Download,
  Linkedin,
  StickyNote,
  ChevronRight,
  Flame,
  Search,
  Filter,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

interface Interaction {
  id: string;
  type:
    | "commented"
    | "replied"
    | "dm_sent"
    | "connected"
    | "added"
    | "followed_up";
  note: string;
  date: string;
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
  postingPattern: string;
  interactions: Interaction[];
  notes: string;
  followUpAlert?: string;
  memberLinkedInName?: string;
  memberLinkedInBio?: string;
  memberLinkedInUrl?: string;
  memberLinkedInFollowers?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PROFILES: EngagementProfile[] = [
  {
    id: "1",
    name: "Sarah Chen",
    headline: "AI Founder · Building tools for operators",
    avatarInitials: "SC",
    avatarColor: "#6366f1",
    followers: "12.4K",
    profileUrl: "https://linkedin.com/in/sarah-chen",
    segment: "Creators",
    stage: "Replied",
    lastInteracted: "2h ago",
    postingPattern: "Tue · Thu · Sat mornings",
    followUpAlert: "She replied 2h ago — good moment to DM",
    interactions: [
      {
        id: "i1",
        type: "replied",
        note: "Replied to your comment on her AI post",
        date: "Today, 2h ago",
      },
      {
        id: "i2",
        type: "commented",
        note: "Commented on her post about founder burnout",
        date: "Yesterday",
      },
      {
        id: "i3",
        type: "added",
        note: "Added to engagement list",
        date: "3 days ago",
      },
    ],
    notes: "Very engaged with comments. Potential collab on content.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
  {
    id: "2",
    name: "Marcus Reid",
    headline: "Personal Brand Coach · 7-fig business",
    avatarInitials: "MR",
    avatarColor: "#ec4899",
    followers: "8.1K",
    profileUrl: "https://linkedin.com/in/marcus-reid",
    segment: "Creators",
    stage: "Commented",
    lastInteracted: "Yesterday",
    postingPattern: "Mon · Wed · Fri",
    interactions: [
      {
        id: "i1",
        type: "commented",
        note: "Commented on his post about pricing strategy",
        date: "Yesterday",
      },
      {
        id: "i2",
        type: "added",
        note: "Added to engagement list",
        date: "4 days ago",
      },
    ],
    notes: "High engagement rate. Posts daily. Good ICP overlap.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
  {
    id: "3",
    name: "Aisha Lawal",
    headline: "Founder @ GrowthOS · SaaS & Ops",
    avatarInitials: "AL",
    avatarColor: "#0ea5e9",
    followers: "22K",
    profileUrl: "https://linkedin.com/in/aisha-lawal",
    segment: "Creators",
    stage: "Saved",
    lastInteracted: "3 days ago",
    postingPattern: "Daily — usually 8–10am",
    followUpAlert: "3 days since added — time to engage!",
    interactions: [
      { id: "i1", type: "added", note: "Added from feed", date: "3 days ago" },
    ],
    notes: "22K followers. Very consistent poster. Engage ASAP.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
  {
    id: "4",
    name: "James Kim",
    headline: "B2B SaaS Writer · Ghostwriter for founders",
    avatarInitials: "JK",
    avatarColor: "#10b981",
    followers: "5.6K",
    profileUrl: "https://linkedin.com/in/james-kim",
    segment: "ICPs",
    stage: "DM Sent",
    lastInteracted: "4 days ago",
    postingPattern: "Tue · Thu",
    followUpAlert: "No reply after 4 days — send follow-up",
    interactions: [
      {
        id: "i1",
        type: "dm_sent",
        note: "Sent DM about content collab",
        date: "4 days ago",
      },
      {
        id: "i2",
        type: "replied",
        note: "Replied to your comment",
        date: "5 days ago",
      },
      {
        id: "i3",
        type: "commented",
        note: "Commented on his writing post",
        date: "6 days ago",
      },
    ],
    notes: "Interested in ghostwriting services. Follow up needed.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
  {
    id: "5",
    name: "Priya Nair",
    headline: "CMO · B2B demand gen · LinkedIn evangelist",
    avatarInitials: "PN",
    avatarColor: "#f59e0b",
    followers: "18.7K",
    profileUrl: "https://linkedin.com/in/priya-nair",
    segment: "ICPs",
    stage: "Connected",
    lastInteracted: "1 week ago",
    postingPattern: "Mon · Wed · Fri mornings",
    interactions: [
      {
        id: "i1",
        type: "connected",
        note: "Accepted connection request",
        date: "1 week ago",
      },
      {
        id: "i2",
        type: "commented",
        note: "Commented on her demand gen post",
        date: "10 days ago",
      },
    ],
    notes: "CMO at a Series B company. Perfect ICP. Start DM conversation.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
  {
    id: "6",
    name: "Tom Vance",
    headline: "LinkedIn Coach · 100K+ followers",
    avatarInitials: "TV",
    avatarColor: "#8b5cf6",
    followers: "104K",
    profileUrl: "https://linkedin.com/in/tom-vance",
    segment: "Competitors",
    stage: "Saved",
    lastInteracted: "2 days ago",
    postingPattern: "Daily — 7am sharp",
    interactions: [
      {
        id: "i1",
        type: "added",
        note: "Added from competitor research",
        date: "2 days ago",
      },
    ],
    notes: "Direct competitor. Monitor post topics and engagement style.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
  {
    id: "7",
    name: "Fatima Ouali",
    headline: "Startup founder · North Africa tech ecosystem",
    avatarInitials: "FO",
    avatarColor: "#14b8a6",
    followers: "3.1K",
    profileUrl: "https://linkedin.com/in/fatima-ouali",
    segment: "Supporters",
    stage: "Replied",
    lastInteracted: "5h ago",
    postingPattern: "Wed · Fri",
    interactions: [
      {
        id: "i1",
        type: "replied",
        note: "Replied to your comment — very positive",
        date: "5h ago",
      },
      {
        id: "i2",
        type: "commented",
        note: "Commented on her startup story post",
        date: "2 days ago",
      },
    ],
    notes: "Always engages back. Great relationship. Support her content.",
    memberLinkedInName: "You (Your LinkedIn)",
    memberLinkedInBio: "Growth OS · Personal Brand · LinkedIn Strategy",
    memberLinkedInUrl: "https://linkedin.com",
    memberLinkedInFollowers: "3.2K",
  },
];

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
  added: <Plus className="w-3 h-3" />,
  followed_up: <Clock className="w-3 h-3" />,
};

const INTERACTION_COLORS: Record<Interaction["type"], string> = {
  commented: "bg-primary/10 text-primary",
  replied: "bg-success/10 text-success",
  dm_sent: "bg-warning/10 text-warning",
  connected: "bg-success/15 text-success",
  added: "bg-muted text-muted-foreground",
  followed_up: "bg-warning/10 text-warning",
};

// ─── Add Profile Modal ─────────────────────────────────────────────────────────
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
  const COLORS = [
    "#6366f1",
    "#ec4899",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#14b8a6",
  ];
  const color = COLORS[name.length % COLORS.length] || "#6366f1";

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      headline: headline.trim(),
      avatarInitials: ini || "??",
      avatarColor: color,
      followers: followers.trim() || "—",
      profileUrl: profileUrl.trim() || "#",
      segment,
      stage: "Saved",
      lastInteracted: "Just now",
      postingPattern: "Unknown",
      notes: notes.trim(),
      memberLinkedInName: "You (Your LinkedIn)",
      memberLinkedInBio: "Growth OS · Personal Brand",
      memberLinkedInUrl: "https://linkedin.com",
      memberLinkedInFollowers: "—",
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

// ─── Profile Detail Panel ──────────────────────────────────────────────────────
function ProfilePanel({
  profile,
  onClose,
  onLogInteraction,
  onUpdateNotes,
  onUpdateStage,
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
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [noteText, setNoteText] = useState(profile.notes);
  const [interactionNote, setInteractionNote] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<Interaction["type"]>("commented");

  const handleLog = () => {
    if (!interactionNote.trim()) return;
    onLogInteraction(profile.id, logType, interactionNote.trim());
    setInteractionNote("");
    setShowLogForm(false);
  };

  const currentStageIdx = STAGE_ORDER.indexOf(profile.stage);

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
        <div className="flex items-center gap-2">
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
        {profile.followUpAlert && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning leading-relaxed">
              {profile.followUpAlert}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Followers</p>
            <p className="text-sm font-bold text-foreground">
              {profile.followers}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Posts</p>
            <p className="text-sm font-bold text-foreground truncate">
              {profile.postingPattern}
            </p>
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
              setShowLogForm(true);
            }}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-warning/10 hover:bg-warning/20 transition-colors"
          >
            <Send className="w-4 h-4 text-warning" />
            <span className="text-[10px] text-warning font-medium">DM</span>
          </button>
          <button
            onClick={() => {
              setLogType("connected");
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
                  Log {logType.replace("_", " ")}
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${INTERACTION_COLORS[interaction.type]}`}
                >
                  {INTERACTION_ICONS[interaction.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">
                    {interaction.note}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {interaction.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="px-4 pt-4 pb-4">
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
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EngagementPage() {
  const { user, members } = useAuth();
  const [profiles, setProfiles] = useState<EngagementProfile[]>(MOCK_PROFILES);
  const [activeSegment, setActiveSegment] = useState<Segment>("Creators");
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [fullscreen, setFullscreen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");

  // Daily goals state
  const [goals] = useState({ comments: 50, dms: 20, connections: 15 });
  const [progress] = useState({ comments: 18, dms: 6, connections: 9 });

  const segmentProfiles = profiles.filter((p) => p.segment === activeSegment);
  const filteredProfiles = segmentProfiles.filter((p) => {
    const matchSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.headline.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "All" || p.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null;

  const segmentCount = (s: Segment) =>
    profiles.filter((p) => p.segment === s).length;

  const handleAdd = (data: Omit<EngagementProfile, "id" | "interactions">) => {
    const newP: EngagementProfile = {
      ...data,
      id: Date.now().toString(),
      interactions: [
        {
          id: "i0",
          type: "added",
          note: "Added to engagement list",
          date: "Just now",
        },
      ],
    };
    setProfiles((prev) => [newP, ...prev]);
    setSelectedId(newP.id);
    setActiveSegment(newP.segment);
  };

  const handleLogInteraction = (
    profileId: string,
    type: Interaction["type"],
    note: string,
  ) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? {
              ...p,
              lastInteracted: "Just now",
              interactions: [
                {
                  id: Date.now().toString(),
                  type,
                  note,
                  date: "Just now",
                },
                ...p.interactions,
              ],
            }
          : p,
      ),
    );
  };

  const handleUpdateNotes = (profileId: string, notes: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, notes } : p)),
    );
  };

  const handleUpdateStage = (profileId: string, stage: Stage) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, stage } : p)),
    );
  };

  const progressPct = (val: number, max: number) =>
    Math.min(100, Math.round((val / max) * 100));

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
          {/* Download app button */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Download className="w-3.5 h-3.5" />
            App
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
              / {goals.comments}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${progressPct(progress.comments, goals.comments)}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {progressPct(progress.comments, goals.comments)}% of daily goal
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
            <span className="text-sm text-muted-foreground">/ {goals.dms}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct(progress.dms, goals.dms)}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full bg-warning"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {progressPct(progress.dms, goals.dms)}% of daily goal
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
              / {goals.connections}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${progressPct(progress.connections, goals.connections)}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              className="h-full rounded-full bg-success"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {progressPct(progress.connections, goals.connections)}% of daily
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
            {SEGMENTS.map((seg) => (
              <button
                key={seg}
                onClick={() => setActiveSegment(seg)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
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
              </button>
            ))}
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
            {filteredProfiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Target className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No profiles found</p>
              </div>
            )}
            {filteredProfiles.map((profile, idx) => {
              const isSelected = selectedId === profile.id;
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
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: profile.avatarColor }}
                  >
                    {profile.avatarInitials}
                  </div>

                  {/* Name + headline */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile.name}
                      </p>
                      {profile.followUpAlert && (
                        <Flame className="w-3 h-3 text-warning flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.headline}
                    </p>
                  </div>

                  {/* Stage badge */}
                  <div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${STAGE_COLORS[profile.stage]}`}
                    >
                      {profile.stage}
                    </span>
                  </div>

                  {/* Last interacted */}
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.lastInteracted}
                  </p>

                  {/* Quick action */}
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
                      className={`w-3.5 h-3.5 transition-transform ${isSelected ? "text-primary rotate-90" : "text-muted-foreground"}`}
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
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Profile Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddProfileModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
