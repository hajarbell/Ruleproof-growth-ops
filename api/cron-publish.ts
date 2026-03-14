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

// ── Upload one base64 media file to LinkedIn, returns assetUrn or null ────────
async function uploadMediaToLinkedIn(
  accessToken: string,
  authorUrn: string,
  base64: string,
  mimeType: string,
): Promise<string | null> {
  const isVideo = mimeType.startsWith("video/");
  const liHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };

  // Step 1: Register upload
  const registerRes = await fetch(
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    {
      method: "POST",
      headers: liHeaders,
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: [
            isVideo
              ? "urn:li:digitalmediaRecipe:feedshare-video"
              : "urn:li:digitalmediaRecipe:feedshare-image",
          ],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    },
  );

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    console.error("[Cron] Register upload failed:", registerData);
    return null;
  }

  const uploadUrl =
    registerData.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
  const assetUrn = registerData.value?.asset;

  if (!uploadUrl || !assetUrn) {
    console.error("[Cron] Missing uploadUrl or assetUrn from LinkedIn");
    return null;
  }

  // Step 2: Decode base64 directly — no Storage needed
  const binary = Buffer.from(base64, "base64");

  // Step 3: Upload binary to LinkedIn
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
    },
    body: binary,
  });

  if (!uploadRes.ok) {
    console.error("[Cron] Binary upload failed:", await uploadRes.text());
    return null;
  }

  return assetUrn;
}

// ── Publish to LinkedIn — text-only or with media ─────────────────────────────
async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  text: string,
  mediaBase64?: string[],
  mediaTypes?: string[],
): Promise<{ ok: boolean; id?: string; error?: any }> {
  const liHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };

  // Text-only
  if (!mediaBase64 || mediaBase64.length === 0) {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: liHeaders,
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });
    const data = await res.json();
    return res.ok ? { ok: true, id: data.id } : { ok: false, error: data };
  }

  // Upload each media file to LinkedIn
  const isVideo = (mediaTypes?.[0] ?? "").startsWith("video/");
  const assetUrns: string[] = [];

  for (let i = 0; i < mediaBase64.length; i++) {
    const mimeType = mediaTypes?.[i] ?? "image/jpeg";
    const urn = await uploadMediaToLinkedIn(
      accessToken,
      authorUrn,
      mediaBase64[i],
      mimeType,
    );
    if (!urn) {
      console.warn(
        `[Cron] Media upload ${i} failed, falling back to text-only`,
      );
      return publishToLinkedIn(accessToken, authorUrn, text);
    }
    assetUrns.push(urn);
  }

  const mediaCategory = isVideo ? "VIDEO" : "IMAGE";
  const mediaObjects = assetUrns.map((urn) => ({
    status: "READY",
    media: urn,
    ...(isVideo ? {} : { title: { text: "" }, description: { text: "" } }),
  }));

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: liHeaders,
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: mediaCategory,
          media: mediaObjects,
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  const data = await res.json();
  return res.ok ? { ok: true, id: data.id } : { ok: false, error: data };
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
          const authorUrn = `urn:li:person:${linkedinId}`;
          const mediaBase64 = post.mediaBase64 as string[] | undefined;
          const mediaTypes = post.mediaTypes as string[] | undefined;

          const liResult = await publishToLinkedIn(
            accessToken,
            authorUrn,
            post.content,
            mediaBase64,
            mediaTypes,
          );

          if (liResult.ok) {
            await db
              .collection("workspaces")
              .doc(wsId)
              .collection("contentPosts")
              .doc(postDoc.id)
              .update({
                status: "Published",
                publishedAt: now.toISOString(),
                linkedinPostId: liResult.id ?? "",
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
            console.log(
              `[Cron] ✅ Published ${postDoc.id}`,
              mediaBase64?.length
                ? `with ${mediaBase64.length} media file(s)`
                : "text-only",
            );
          } else {
            console.error(
              `[Cron] LinkedIn error ${postDoc.id}:`,
              liResult.error,
            );
            results.push({
              postId: postDoc.id,
              wsId,
              status: "linkedin_error",
              error: JSON.stringify(liResult.error),
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
