import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Init Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel cron calls this via GET — protect with a secret
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const nowISO = now.toISOString(); // e.g. "2026-03-13T14:30:00.000Z"
  const results: {
    postId: string;
    wsId: string;
    status: string;
    error?: string;
  }[] = [];

  try {
    // Get all workspaces
    const workspaces = await db.collection("workspaces").listDocuments();

    for (const wsRef of workspaces) {
      const wsId = wsRef.id;

      // Find Scheduled posts whose time has passed
      const postsSnap = await db
        .collection("workspaces")
        .doc(wsId)
        .collection("contentPosts")
        .where("status", "==", "Scheduled")
        .get();

      for (const postDoc of postsSnap.docs) {
        const post = postDoc.data();
        const scheduledDate = post.scheduledDate as string; // "YYYY-MM-DD"
        const scheduledTime = (post.scheduledTime as string) || "09:00"; // "HH:MM"

        if (!scheduledDate) continue;

        // Build scheduled datetime in UTC (assume user inputs local time — treat as UTC for now)
        const scheduledDT = new Date(
          `${scheduledDate}T${scheduledTime}:00.000Z`,
        );
        if (scheduledDT > now) continue; // not due yet

        // Get the LinkedIn token for this post's account
        const linkedinId = post.linkedinId as string | undefined;
        let accessToken: string | undefined;

        if (linkedinId) {
          const tokSnap = await db
            .collection("workspaces")
            .doc(wsId)
            .collection("linkedinTokens")
            .doc(linkedinId)
            .get();
          accessToken = tokSnap.data()?.accessToken;
        }

        // Also try linkedinAccounts doc
        if (!accessToken && post.linkedinAccountId) {
          const accSnap = await db
            .collection("workspaces")
            .doc(wsId)
            .collection("linkedinAccounts")
            .doc(post.linkedinAccountId)
            .get();
          const t = accSnap.data()?.accessToken;
          if (t && t.length > 10) accessToken = t;
        }

        if (!accessToken) {
          console.warn(`[Cron] No token for post ${postDoc.id} in ws ${wsId}`);
          results.push({
            postId: postDoc.id,
            wsId,
            status: "skipped_no_token",
          });
          continue;
        }

        // Publish to LinkedIn
        try {
          const authorUrn = `urn:li:person:${linkedinId}`;
          const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
              author: authorUrn,
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: { text: post.content },
                  shareMediaCategory: "NONE",
                },
              },
              visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
              },
            }),
          });

          if (liRes.ok) {
            const liData = await liRes.json();
            // Mark as Published in Firestore
            await db
              .collection("workspaces")
              .doc(wsId)
              .collection("contentPosts")
              .doc(postDoc.id)
              .update({
                status: "Published",
                publishedAt: now.toISOString(),
                linkedinPostId: liData.id ?? "",
              });

            // Notify the assigned member
            if (post.assignedToUid) {
              await db
                .collection("workspaces")
                .doc(wsId)
                .collection("notifications")
                .add({
                  type: "post_published",
                  message: `✅ "${post.theme}" was auto-published to LinkedIn!`,
                  targetUid: post.assignedToUid,
                  postId: postDoc.id,
                  read: false,
                  createdAt: now.toISOString(),
                });
            }

            results.push({ postId: postDoc.id, wsId, status: "published" });
            console.log(`[Cron] ✅ Published post ${postDoc.id}`);
          } else {
            const err = await liRes.json();
            console.error(`[Cron] LinkedIn error for ${postDoc.id}:`, err);
            results.push({
              postId: postDoc.id,
              wsId,
              status: "linkedin_error",
              error: JSON.stringify(err),
            });
          }
        } catch (publishErr) {
          console.error(
            `[Cron] Publish exception for ${postDoc.id}:`,
            publishErr,
          );
          results.push({
            postId: postDoc.id,
            wsId,
            status: "exception",
            error: String(publishErr),
          });
        }
      }
    }

    return res.status(200).json({ checked: now.toISOString(), results });
  } catch (err) {
    console.error("[Cron] Fatal error:", err);
    return res.status(500).json({ error: String(err) });
  }
}
