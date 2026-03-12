// api/linkedin/callback.ts
// Replace your existing api/linkedin/callback.ts with this file.
// Changes: stores access_token + expiry in Firestore so you can post on behalf of members.
// Also writes "account_connected" notification to the workspace.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (only once)
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error, state } = req.query;
  const APP_URL = process.env.APP_URL || "http://localhost:8080";
  // state = workspaceId (passed via getLinkedInAuthUrl)
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
    const expiresIn: number = tokenData.expires_in ?? 5183944; // ~60 days default
    const expiresAt = Date.now() + expiresIn * 1000;

    // ── Get user profile ─────────────────────────────────────────────────────
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    const linkedinId: string = profile.sub || "";
    const name: string = profile.name || "";
    const headline: string = profile.headline || "";
    const avatar: string = profile.picture || "";
    const email: string = profile.email || "";

    // ── Store token in Firestore (workspaces/{wsId}/linkedinTokens/{linkedinId}) ──
    // This collection is NEVER exposed to the client — admin SDK only.
    // The token is used server-side when scheduling posts.
    if (workspaceId && linkedinId) {
      await db
        .collection("workspaces")
        .doc(workspaceId)
        .collection("linkedinTokens")
        .doc(linkedinId)
        .set({
          linkedinId,
          accessToken, // ← the token for posting
          expiresAt,
          name,
          email,
          updatedAt: Date.now(),
        });

      // ── Write notification to workspace ──────────────────────────────────
      // This fires "account_connected" so the bell rings for the owner
      // AND a personal message for the member themselves
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
        console.warn("Failed to write notification:", notifErr);
        // Non-fatal — continue redirect
      }
    }

    // ── Redirect back to app with profile info (NOT the token) ──────────────
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
