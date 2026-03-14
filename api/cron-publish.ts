import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Firebase init (runs once per cold start) ──────────────────────────────────
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// ── Token resolver — tries multiple storage locations ─────────────────────────
async function resolveToken(
  wsId: string,
  linkedinId: string | undefined,
  linkedinAccountId: string | undefined,
): Promise<string | null> {
  // 1. Try linkedinTokens/{linkedinId}
  if (linkedinId) {
    try {
      const snap = await db
        .collection("workspaces")
        .doc(wsId)
        .collection("linkedinTokens")
        .doc(linkedinId)
        .get();
      const t = snap.data()?.accessToken;
      if (t && t.length > 20) return t;
    } catch {}
  }

  // 2. Try linkedinAccounts/{linkedinAccountId}
  if (linkedinAccountId) {
    try {
      const snap = await db
        .collection("workspaces")
        .doc(wsId)
        .collection("linkedinAccounts")
        .doc(linkedinAccountId)
        .get();
      const t = snap.data()?.accessToken;
      if (t && t.length > 20) return t;
    } catch {}
  }

  // 3. Fallback: scan all tokens in the workspace and return the first valid one
  try {
    const all = await db
      .collection("workspaces")
      .doc(wsId)
      .collection("linkedinTokens")
      .get();
    for (const d of all.docs) {
      const t = d.data()?.accessToken;
      if (t && t.length > 20) return t;
    }
  } catch {}

  return null;
}

// ── Upload one media file to LinkedIn, returns assetUrn or null ───────────────
async function uploadMedia(
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

  try {
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

    const reg = await registerRes.json();
    if (!registerRes.ok) {
      console.error("[Cron] Register failed:", reg);
      return null;
    }

    const uploadUrl =
      reg.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
    const assetUrn = reg.value?.asset;
    if (!uploadUrl || !assetUrn) {
      console.error("[Cron] No uploadUrl/assetUrn");
      return null;
    }

    // Strip data: prefix if present
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const binary = Buffer.from(cleanBase64, "base64");

    const upRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": mimeType,
      },
      body: binary,
    });

    if (!upRes.ok) {
      console.error("[Cron] Binary upload failed:", await upRes.text());
      return null;
    }
    return assetUrn;
  } catch (e) {
    console.error("[Cron] uploadMedia error:", e);
    return null;
  }
}

// ── Publish to LinkedIn (text or media) ───────────────────────────────────────
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

  // ── Text only ──────────────────────────────────────────────────────────────
  if (!mediaBase64 || mediaBase64.length === 0) {
    const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
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
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const d = await r.json();
    return r.ok ? { ok: true, id: d.id } : { ok: false, error: d };
  }

  // ── With media ─────────────────────────────────────────────────────────────
  const isVideo = (mediaTypes?.[0] ?? "").startsWith("video/");
  const assetUrns: string[] = [];

  for (let i = 0; i < mediaBase64.length; i++) {
    const mime = mediaTypes?.[i] ?? "image/jpeg";
    const urn = await uploadMedia(accessToken, authorUrn, mediaBase64[i], mime);
    if (!urn) {
      // Fall back to text-only rather than failing the whole post
      console.warn(
        `[Cron] Media ${i} upload failed — falling back to text-only`,
      );
      return publishToLinkedIn(accessToken, authorUrn, text);
    }
    assetUrns.push(urn);
  }

  const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: liHeaders,
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: isVideo ? "VIDEO" : "IMAGE",
          media: assetUrns.map((urn) => ({
            status: "READY",
            media: urn,
            ...(isVideo
              ? {}
              : { title: { text: "" }, description: { text: "" } }),
          })),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const d = await r.json();
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d };
}

// ── Cron handler ──────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: accept secret from header OR query string (for Vercel cron)
  const secret =
    (req.headers["x-cron-secret"] as string) ||
    (req.headers["authorization"] as string)?.replace("Bearer ", "") ||
    (req.query.secret as string);

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
    const workspaceRefs = await db.collection("workspaces").listDocuments();

    for (const wsRef of workspaceRefs) {
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

        // ── Time check — compare UTC ─────────────────────────────────────────
        // scheduledDate is "YYYY-MM-DD", scheduledTime is "HH:MM"
        // We treat them as UTC. Adjust if your users schedule in local time.
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
                ? `with ${mediaBase64.length} media`
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
