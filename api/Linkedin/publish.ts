// api/linkedin/publish.ts
// Vercel cron job — runs every minute and publishes scheduled posts whose time has come.
// Add to vercel.json: { "crons": [{ "path": "/api/linkedin/publish", "schedule": "* * * * *" }] }
//
// How it works:
// 1. ContentStudioPage saves posts to Firestore with status: "Scheduled" + scheduledDate + scheduledTime
// 2. This endpoint runs every minute, finds posts where scheduled time <= now
// 3. Looks up the linkedinId for the "Post As" account, fetches their stored token
// 4. Calls LinkedIn ugcPosts API to publish
// 5. Updates post status to "Published"
// 6. Writes a notification + sends notification to assigned member

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

async function publishToLinkedIn(
  accessToken: string,
  linkedinId: string,
  content: string,
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  try {
    const body = {
      author: `urn:li:person:${linkedinId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }

    const data = await res.json();
    // LinkedIn returns the post ID in the header X-RestLi-Id
    const postId = res.headers.get("x-restli-id") || data.id || "";
    const postUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : undefined;

    return { success: true, postUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Secure the endpoint — only callable by Vercel cron or your own backend
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const nowISO = now.toISOString();
  let published = 0;
  let errors = 0;

  try {
    // Get all workspaces
    const workspaces = await db.collection("workspaces").get();

    for (const wsDoc of workspaces.docs) {
      const wsId = wsDoc.id;

      // Get scheduled posts for this workspace
      // Posts are stored in Firestore as a subcollection: workspaces/{wsId}/contentPosts
      const postsSnap = await db
        .collection("workspaces")
        .doc(wsId)
        .collection("contentPosts")
        .where("status", "==", "Scheduled")
        .get();

      for (const postDoc of postsSnap.docs) {
        const post = postDoc.data();
        const scheduledDate: string = post.scheduledDate || "";
        const scheduledTime: string = post.scheduledTime || "09:00";

        if (!scheduledDate) continue;

        // Build scheduled datetime
        const scheduledISO = `${scheduledDate}T${scheduledTime}:00`;
        const scheduledAt = new Date(scheduledISO);

        // Only publish if scheduled time has passed (within last 5 min window)
        const diffMs = now.getTime() - scheduledAt.getTime();
        if (diffMs < 0 || diffMs > 5 * 60 * 1000) continue; // not yet, or too old

        // Find the LinkedIn account for this post
        const linkedinAccountId: string = post.linkedinAccountId || "";
        if (!linkedinAccountId) continue;

        // Get the stored token
        const tokenDoc = await db
          .collection("workspaces")
          .doc(wsId)
          .collection("linkedinTokens")
          .doc(linkedinAccountId)
          .get();

        if (!tokenDoc.exists) {
          console.warn(
            `No token for linkedinId ${linkedinAccountId} in ws ${wsId}`,
          );
          continue;
        }

        const tokenData = tokenDoc.data()!;
        if (tokenData.expiresAt < Date.now()) {
          // Token expired — mark post as failed and notify
          await postDoc.ref.update({
            status: "TokenExpired",
            updatedAt: nowISO,
          });
          await db
            .collection("workspaces")
            .doc(wsId)
            .collection("notifications")
            .add({
              type: "post_publish_failed",
              message: `⚠️ Could not publish "${post.theme}" — LinkedIn token expired. Reconnect your account.`,
              actorName: "System",
              read: false,
              createdAt: nowISO,
            });
          continue;
        }

        const accessToken: string = tokenData.accessToken;
        const linkedinId: string = tokenData.linkedinId;

        // Publish to LinkedIn
        const result = await publishToLinkedIn(
          accessToken,
          linkedinId,
          post.content || "",
        );

        if (result.success) {
          published++;
          await postDoc.ref.update({
            status: "Published",
            publishedAt: nowISO,
            publishedUrl: result.postUrl || "",
            updatedAt: nowISO,
          });

          // Notify workspace
          await db
            .collection("workspaces")
            .doc(wsId)
            .collection("notifications")
            .add({
              type: "post_published",
              message: `✅ "${post.theme}" published to LinkedIn for ${tokenData.name}.`,
              personalMessage: `Your post "${post.theme}" just went live on LinkedIn! 🚀`,
              actorLinkedinId: linkedinAccountId,
              actorName: tokenData.name,
              postUrl: result.postUrl || "",
              assignedToUid: post.assignedToUid || "",
              read: false,
              createdAt: nowISO,
            });
        } else {
          errors++;
          console.error(`Failed to publish post ${postDoc.id}:`, result.error);
          await postDoc.ref.update({
            status: "PublishFailed",
            publishError: result.error,
            updatedAt: nowISO,
          });
        }
      }
    }

    return res.json({ published, errors, checkedAt: nowISO });
  } catch (err: any) {
    console.error("Publish cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
