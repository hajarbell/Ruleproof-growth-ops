// api/linkedin/publish.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || "{}",
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.firestore();
}

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

    const postId = res.headers.get("x-restli-id") || "";
    const postUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : undefined;

    return { success: true, postUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = initAdmin();
  const now = new Date();
  const nowISO = now.toISOString();
  let published = 0;
  let errors = 0;

  try {
    const workspaces = await db.collection("workspaces").get();

    for (const wsDoc of workspaces.docs) {
      const wsId = wsDoc.id;

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

        const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
        const diffMs = now.getTime() - scheduledAt.getTime();
        if (diffMs < 0 || diffMs > 5 * 60 * 1000) continue;

        const linkedinAccountId: string = post.linkedinAccountId || "";
        if (!linkedinAccountId) continue;

        let tokenDoc = await db
          .collection("workspaces")
          .doc(wsId)
          .collection("linkedinTokens")
          .doc(linkedinAccountId)
          .get();

        if (!tokenDoc.exists) {
          const tokenQuery = await db
            .collection("workspaces")
            .doc(wsId)
            .collection("linkedinTokens")
            .where("linkedinId", "==", linkedinAccountId)
            .limit(1)
            .get();
          if (!tokenQuery.empty) tokenDoc = tokenQuery.docs[0];
        }

        if (!tokenDoc.exists) {
          console.warn(`No token for ${linkedinAccountId} in ${wsId}`);
          continue;
        }

        const tokenData = tokenDoc.data();

        if (tokenData.expiresAt < Date.now()) {
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

        const result = await publishToLinkedIn(
          tokenData.accessToken,
          tokenData.linkedinId,
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
          await db
            .collection("workspaces")
            .doc(wsId)
            .collection("notifications")
            .add({
              type: "post_published",
              message: `✅ "${post.theme}" published to LinkedIn for ${tokenData.name}.`,
              personalMessage: `Your post "${post.theme}" just went live on LinkedIn! 🚀`,
              actorName: tokenData.name,
              postUrl: result.postUrl || "",
              assignedToUid: post.assignedToUid || "",
              read: false,
              createdAt: nowISO,
            });
        } else {
          errors++;
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
