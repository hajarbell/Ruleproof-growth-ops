import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

function calcPostingPattern(
  timestamps: { dayOfWeek: number; hour: number }[],
): string {
  if (!timestamps || timestamps.length === 0) return "Unknown";
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    name,
    headline,
    avatarUrl,
    profileUrl,
    followers,
    postTimestamps,
    workspaceId,
  } = req.body;

  if (!workspaceId || !name) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing name or workspaceId" });
  }

  try {
    const colRef = db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("engagementProfiles");

    // Check if profile already exists by profileUrl
    const existing = await colRef
      .where("profileUrl", "==", profileUrl)
      .limit(1)
      .get();

    const AVATAR_COLORS = [
      "#6366f1",
      "#ec4899",
      "#0ea5e9",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#14b8a6",
    ];
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
    const pattern = calcPostingPattern(postTimestamps || []);
    const now = new Date().toISOString();

    if (!existing.empty) {
      // Update existing — merge new post timestamps
      const docRef = existing.docs[0].ref;
      const existingData = existing.docs[0].data();
      const merged = [
        ...(existingData.postTimestamps || []),
        ...(postTimestamps || []),
      ].slice(-10); // keep last 10

      await docRef.update({
        postTimestamps: merged,
        postingPattern: calcPostingPattern(merged),
        headline: headline || existingData.headline,
        followers: followers || existingData.followers,
        updatedAt: now,
      });

      return res
        .status(200)
        .json({ ok: true, action: "updated", id: docRef.id });
    }

    // Create new profile
    const docRef = await colRef.add({
      name,
      headline: headline || "",
      avatarInitials: initials || "??",
      avatarColor: color,
      avatarUrl: avatarUrl || "",
      followers: followers || "—",
      profileUrl: profileUrl || "",
      segment: "Creators",
      stage: "Saved",
      lastInteracted: now,
      postTimestamps: postTimestamps || [],
      postingPattern: pattern,
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

    return res.status(200).json({ ok: true, action: "created", id: docRef.id });
  } catch (err) {
    console.error("[save-engagement-profile] Error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
