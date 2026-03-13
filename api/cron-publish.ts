import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function resolveToken(
  wsId: string,
  linkedinId: string | undefined,
  linkedinAccountId: string | undefined,
): Promise<string | null> {
  if (linkedinId) {
    const snap = await db
      .collection("workspaces")
      .doc(wsId)
      .collection("linkedinTokens")
      .doc(linkedinId)
      .get();
    const t = snap.data()?.accessToken;
    if (t && t.length > 10) return t;
  }

  if (linkedinAccountId) {
    const snap = await db
      .collection("workspaces")
      .doc(wsId)
      .collection("linkedinAccounts")
      .doc(linkedinAccountId)
      .get();
    const t = snap.data()?.accessToken;
    if (t && t.length > 10) return t;
  }

  const all = await db
    .collection("workspaces")
    .doc(wsId)
    .collection("linkedinTokens")
    .get();
  for (const doc of all.docs) {
    const t = doc.data()?.accessToken;
    if (t && t.length > 10) {
      if (all.size === 1 || doc.id === linkedinId) return t;
    }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret =
    (req.headers["x-cron-secret"] as string) || (req.query.secret as string);

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const results: {
    postId: string;
    wsId: string;
    status: string;
    error?: string;
  }[] = [];

  try {
    const workspaces = await db.collection("workspaces").listDocuments();

    for (const wsRef of workspaces) {
      const wsId = wsRef.id;

      const postsSnap = await db
        .collection("workspaces")
        .doc(wsId)
        .collection("contentPosts")
        .where("status", "==", "Scheduled")
        .get();

      for (const postDoc of postsSnap.docs) {
        const post = postDoc.data();
        const scheduledDate = post.scheduledDate as string;
        const scheduledTime = (post.scheduledTime as string) || "09:00";

        if (!scheduledDate) continue;

        const scheduledDT = new Date(
          `${scheduledDate}T${scheduledTime}:00.000Z`,
        );
        if (scheduledDT > now) continue;

        const linkedinId = post.linkedinId as string | undefined;
        const accessToken = await resolveToken(
          wsId,
          linkedinId,
          post.linkedinAccountId,
        );

        if (!accessToken) {
          console.warn(`[Cron] No token — post ${postDoc.id} ws ${wsId}`);
          results.push({
            postId: postDoc.id,
            wsId,
            status: "skipped_no_token",
          });
          continue;
        }

        try {
          const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
              author: `urn:li:person:${linkedinId}`,
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

          const liData = await liRes.json();

          if (liRes.ok) {
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
            console.log(`[Cron] ✅ Published ${postDoc.id}`);
          } else {
            console.error(`[Cron] LinkedIn error ${postDoc.id}:`, liData);
            results.push({
              postId: postDoc.id,
              wsId,
              status: "linkedin_error",
              error: JSON.stringify(liData),
            });
          }
        } catch (e) {
          console.error(`[Cron] Exception ${postDoc.id}:`, e);
          results.push({
            postId: postDoc.id,
            wsId,
            status: "exception",
            error: String(e),
          });
        }
      }
    }

    return res.status(200).json({ checked: now.toISOString(), results });
  } catch (err) {
    console.error("[Cron] Fatal:", err);
    return res.status(500).json({ error: String(err) });
  }
}
