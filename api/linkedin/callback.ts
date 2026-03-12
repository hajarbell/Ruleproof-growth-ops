// api/linkedin/callback.ts
// Uses require() for firebase-admin — ESM + firebase-admin breaks on Vercel serverless.
// This file is compiled to CJS via api/tsconfig.json.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(
          /\\n/g,
          "\n",
        ),
      }),
    });
  }
  return admin.firestore() as FirebaseFirestore.Firestore;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error, state } = req.query;
  const APP_URL = process.env.APP_URL || "http://localhost:8080";
  const workspaceId = typeof state === "string" ? state : "";

  if (error || !code) {
    return res.redirect(`${APP_URL}/linkedin?error=oauth_denied`);
  }

  try {
    const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
    const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
    const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI!;

    // ── Exchange code for access token ──────────────────────────────────────
    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      },
    );

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return res.redirect(`${APP_URL}/linkedin?error=token_failed`);
    }

    const accessToken: string = tokenData.access_token;
    const expiresIn: number = tokenData.expires_in ?? 5183944;
    const expiresAt = Date.now() + expiresIn * 1000;

    // ── Get LinkedIn profile ─────────────────────────────────────────────────
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    const linkedinId: string = profile.sub || "";
    const name: string = profile.name || "";
    const headline: string = profile.headline || "";
    const avatar: string = profile.picture || "";
    const email: string = profile.email || "";

    // ── Store token in Firestore (server-side only) ──────────────────────────
    if (workspaceId && linkedinId) {
      const db = initAdmin();

      await db
        .collection("workspaces")
        .doc(workspaceId)
        .collection("linkedinTokens")
        .doc(linkedinId)
        .set({
          linkedinId,
          accessToken, // stored server-side only, never sent to client
          expiresAt,
          name,
          email,
          updatedAt: Date.now(),
        });

      // Write notification so the bell rings for owner + personal message for member
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("notifications")
          .add({
            type: "account_connected",
            message: `${name} connected their LinkedIn account.`,
            personalMessage: `✅ Your LinkedIn account (${name}) is now connected to this workspace!`,
            actorName: name,
            actorLinkedinId: linkedinId,
            read: false,
            createdAt: new Date().toISOString(),
          });
      } catch (notifErr) {
        console.warn("Notification write failed (non-fatal):", notifErr);
      }
    }

    // ── Redirect to app with profile info only (NOT the token) ──────────────
    const params = new URLSearchParams({
      linkedin_name: name,
      linkedin_headline: headline,
      linkedin_avatar: avatar,
      linkedin_email: email,
      linkedin_id: linkedinId,
    });

    return res.redirect(`${APP_URL}/linkedin?${params.toString()}`);
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    return res.redirect(`${APP_URL}/linkedin?error=server_error`);
  }
}
