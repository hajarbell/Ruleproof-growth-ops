import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── LinkedIn media upload + post ─────────────────────────────────────────────
// Supports: text-only, single image, multiple images, video
//
// Request body:
// {
//   accessToken: string
//   authorUrn: string         e.g. "urn:li:person:ABC123"
//   text: string
//   media?: Array<{
//     base64: string          raw base64 (no data: prefix)
//     mimeType: string        e.g. "image/jpeg", "image/png", "video/mp4"
//     filename: string
//   }>
// }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { accessToken, authorUrn, text, media } = req.body;

  if (!accessToken || !authorUrn || !text) {
    return res
      .status(400)
      .json({ error: "Missing required fields: accessToken, authorUrn, text" });
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
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
      if (!liRes.ok) return res.status(liRes.status).json({ error: data });
      return res.status(200).json({ success: true, id: data.id });
    }

    // ── Media post (images or video) ────────────────────────────────────────
    const isVideo = media[0].mimeType.startsWith("video/");

    // Step 1: Register each upload with LinkedIn
    const assetUrns: string[] = [];

    for (const file of media) {
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
        console.error("[Publish] Register upload failed:", registerData);
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
        return res
          .status(500)
          .json({ error: "Missing uploadUrl or assetUrn from LinkedIn" });
      }

      // Step 2: Upload the binary
      const binary = Buffer.from(file.base64, "base64");
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
        return res.status(500).json({ error: "Failed to upload media binary" });
      }

      assetUrns.push(assetUrn);
    }

    // Step 3: Create the post with uploaded media
    const mediaCategory = isVideo ? "VIDEO" : "IMAGE";
    const mediaObjects = assetUrns.map((urn) => ({
      status: "READY",
      media: urn,
      ...(isVideo ? {} : { title: { text: "" }, description: { text: "" } }),
    }));

    const postBody = {
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
    };

    const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers,
      body: JSON.stringify(postBody),
    });

    const data = await liRes.json();

    if (!liRes.ok) {
      console.error("[Publish] Post with media failed:", data);
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
