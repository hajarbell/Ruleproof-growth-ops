import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── LinkedIn media upload + post ─────────────────────────────────────────────
// Supports: text-only, single image, multiple images, video
//
// IMPORTANT: this file lives in /api/linkedin/publish.ts
// The api/ folder must have its OWN package.json with:
//   { "type": "commonjs" }         ← NOT "module"
// And its own tsconfig.json with:
//   "module": "CommonJS"
// This is separate from your frontend package.json which can be ESM.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS preflight — required for browser → Vercel function calls ────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accessToken, authorUrn, text, media } = req.body;

  if (!accessToken || !authorUrn || !text) {
    return res
      .status(400)
      .json({ error: "Missing required fields: accessToken, authorUrn, text" });
  }

  // Validate token looks real before hitting LinkedIn
  if (accessToken.length < 20) {
    return res
      .status(400)
      .json({ error: "Access token appears invalid (too short)" });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202304", // ← pin to a stable API version
  };

  try {
    // ── Text-only post ──────────────────────────────────────────────────────
    if (!media || media.length === 0) {
      const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers,
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

      const data = await liRes.json();
      if (!liRes.ok) {
        console.error(
          "[Publish] LinkedIn text post error:",
          JSON.stringify(data),
        );
        return res.status(liRes.status).json({ error: data });
      }
      return res.status(200).json({ success: true, id: data.id });
    }

    // ── Media post ──────────────────────────────────────────────────────────
    const isVideo = media[0].mimeType.startsWith("video/");
    const assetUrns: string[] = [];

    for (const file of media) {
      // ── Step 1: Register upload ───────────────────────────────────────────
      const registerRes = await fetch(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          method: "POST",
          headers,
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
        console.error(
          "[Publish] Register upload failed:",
          JSON.stringify(registerData),
        );
        return res
          .status(500)
          .json({ error: "Failed to register upload", detail: registerData });
      }

      const uploadUrl =
        registerData.value?.uploadMechanism?.[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]?.uploadUrl;
      const assetUrn = registerData.value?.asset;

      if (!uploadUrl || !assetUrn) {
        console.error(
          "[Publish] Missing uploadUrl or assetUrn:",
          JSON.stringify(registerData),
        );
        return res
          .status(500)
          .json({ error: "Missing uploadUrl or assetUrn from LinkedIn" });
      }

      // ── Step 2: Upload binary ─────────────────────────────────────────────
      // file.base64 is raw base64 (no data: prefix) — strip it defensively
      const cleanBase64 = file.base64.includes(",")
        ? file.base64.split(",")[1]
        : file.base64;

      const binary = Buffer.from(cleanBase64, "base64");

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.mimeType,
        },
        body: binary,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.text();
        console.error("[Publish] Binary upload failed:", uploadErr);
        return res
          .status(500)
          .json({ error: "Failed to upload media binary", detail: uploadErr });
      }

      assetUrns.push(assetUrn);
    }

    // ── Step 3: Create post with media ────────────────────────────────────────
    const mediaObjects = assetUrns.map((urn) => ({
      status: "READY",
      media: urn,
      ...(isVideo ? {} : { title: { text: "" }, description: { text: "" } }),
    }));

    const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: isVideo ? "VIDEO" : "IMAGE",
            media: mediaObjects,
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    const data = await liRes.json();

    if (!liRes.ok) {
      console.error("[Publish] Post with media failed:", JSON.stringify(data));
      return res.status(liRes.status).json({ error: data });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("[Publish] Server error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: String(err) });
  }
}
