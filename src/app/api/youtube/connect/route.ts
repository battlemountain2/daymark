import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { isSignedIn } from "@/lib/auth";
import { seal } from "@/lib/integration-crypto";
import { YOUTUBE_SCOPE } from "@/lib/youtube-contract";
import { youtubeCookieSecure, youtubeRedirectUri, youtubeReturnUrl } from "@/lib/youtube-settings";

export async function GET(request: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return Response.redirect(youtubeReturnUrl(request, "setup"));
  const state = randomBytes(32).toString("base64url"), verifier = randomBytes(32).toString("base64url"), redirectUri = youtubeRedirectUri(request);
  (await cookies()).set("daymark_youtube_state", seal(JSON.stringify({ state, verifier, redirectUri, expires: Date.now() + 600000 })), { httpOnly: true, secure: youtubeCookieSecure(request), sameSite: "lax", path: "/api/youtube", maxAge: 600 });
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", scope: YOUTUBE_SCOPE, access_type: "offline", prompt: "consent select_account", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
