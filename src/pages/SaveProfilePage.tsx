// src/pages/SaveProfilePage.tsx
// Opened as a small popup by the bookmarklet.
// Reads URL params → saves to Firestore → auto-closes in 2 seconds.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function calcPattern(ts: { dayOfWeek: number; hour: number }[]): string {
  if (!ts || ts.length === 0) return "Unknown";
  const dc: Record<number, number> = {};
  const hrs: number[] = [];
  ts.forEach(({ dayOfWeek, hour }) => {
    dc[dayOfWeek] = (dc[dayOfWeek] || 0) + 1;
    hrs.push(hour);
  });
  const top = Object.entries(dc)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([d]) => DAYS[Number(d)]);
  const avg = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  return `${top.join(" · ")} · ~${avg % 12 || 12}${avg < 12 ? "AM" : "PM"}`;
}

export default function SaveProfilePage() {
  const { user, workspace } = useAuth() as any;
  const [status, setStatus] = useState<"loading" | "saving" | "done" | "error">(
    "loading",
  );
  const [msg, setMsg] = useState("");
  const [wasUpdated, setWasUpdated] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    if (user === undefined) return; // auth still initialising
    if (!user) {
      setStatus("error");
      setMsg("Not logged in. Please log in to RuProof first, then try again.");
      return;
    }
    if (!workspace?.id) return; // workspace still loading
    doSave();
  }, [user, workspace, status]);

  async function doSave() {
    setStatus("saving");
    try {
      const p = new URLSearchParams(window.location.search);
      const name = decodeURIComponent(p.get("name") || "");
      const headline = decodeURIComponent(p.get("headline") || "");
      const profileUrl = decodeURIComponent(p.get("profileUrl") || "");
      const followers = decodeURIComponent(p.get("followers") || "—");
      const pts: { date: string; dayOfWeek: number; hour: number }[] =
        JSON.parse(decodeURIComponent(p.get("pts") || "[]"));

      if (!name && !profileUrl) {
        setStatus("error");
        setMsg(
          "No profile data received. Make sure you are on a LinkedIn profile page.",
        );
        return;
      }

      const wsId = workspace.id;
      const now = new Date().toISOString();
      const col = collection(db, "workspaces", wsId, "engagementProfiles");

      // Check if profile already exists by URL
      const existing = await getDocs(
        query(col, where("profileUrl", "==", profileUrl)),
      );

      if (!existing.empty) {
        // Update — merge post timestamps
        const ref = existing.docs[0].ref;
        const old = existing.docs[0].data();
        const merged = [...(old.postTimestamps || []), ...pts].slice(-10);
        await updateDoc(ref, {
          postTimestamps: merged,
          postingPattern: calcPattern(merged),
          headline: headline || old.headline,
          followers: followers !== "—" ? followers : old.followers,
          updatedAt: now,
        });
        setWasUpdated(true);
      } else {
        // Create new profile
        const initials =
          name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "??";
        await addDoc(col, {
          name,
          headline,
          avatarInitials: initials,
          avatarColor: AVATAR_COLORS[name.length % AVATAR_COLORS.length],
          followers,
          profileUrl,
          segment: "Creators",
          stage: "Saved",
          lastInteracted: now,
          postTimestamps: pts,
          postingPattern: calcPattern(pts),
          interactions: [
            {
              id: "i0",
              type: "added",
              note: "Saved via bookmarklet",
              date: now,
              createdAt: now,
            },
          ],
          notes: "",
          createdAt: now,
          updatedAt: now,
        });
        setWasUpdated(false);
      }

      setMsg(name || profileUrl);
      setStatus("done");
      // Auto-close popup after 2 seconds
      setTimeout(() => window.close(), 2000);
    } catch (err) {
      setStatus("error");
      setMsg(String(err));
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">R</span>
          </div>
          <span className="font-bold text-base font-display gradient-text">
            RuProof
          </span>
        </div>

        {(status === "loading" || status === "saving") && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-semibold text-foreground">
              {status === "loading" ? "Connecting..." : "Saving profile..."}
            </p>
            <p className="text-xs text-muted-foreground">
              This window will close automatically
            </p>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <p className="text-sm font-semibold text-foreground">
              {wasUpdated ? "Profile updated!" : "Profile saved! ✨"}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-full px-2">
              {msg}
            </p>
            <p className="text-xs text-muted-foreground">
              Closing in 2 seconds...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm font-semibold text-foreground">
              Could not save
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {msg}
            </p>
            <button
              onClick={() => window.close()}
              className="mt-2 px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
