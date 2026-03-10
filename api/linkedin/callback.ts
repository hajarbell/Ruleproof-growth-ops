import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;
  const APP_URL = process.env.APP_URL || "http://localhost:8080";

  if (error || !code) {
    console.log(
      "Error during LinkedIn OAuth callback:",
      error || "No code provided",
    );
  }

  try {
    const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
    const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
    const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI!;

    // Exchange code for access token
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
      return res.redirect(`${APP_URL}/linkedin?error=token_failed`);
    }

    // Get user profile
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();

    const params = new URLSearchParams({
      linkedin_name: profile.name || "",
      linkedin_headline: profile.headline || "",
      linkedin_avatar: profile.picture || "",
      linkedin_email: profile.email || "",
      linkedin_id: profile.sub || "",
    });

    return res.redirect(`${APP_URL}/linkedin?${params.toString()}`);
  } catch (err) {
    return res.redirect(`${APP_URL}/linkedin?error=server_error`);
  }
}
