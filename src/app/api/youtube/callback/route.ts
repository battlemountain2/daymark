import { cookies } from "next/headers";
import { isSignedIn } from "@/lib/auth";
import { unseal } from "@/lib/integration-crypto";
import { youtubeRequest, saveYouTubeAccount } from "@/lib/youtube";
import { channelId, YOUTUBE_SCOPE, youtubeImage } from "@/lib/youtube-contract";
import { youtubeCallbackState, youtubeCookieSecure, youtubeRedirectUri, youtubeReturnUrl, YouTubeConnectionError } from "@/lib/youtube-settings";

export async function GET(request: Request) {
  const jar = await cookies(), raw = jar.get("daymark_youtube_state")?.value;
  jar.set("daymark_youtube_state", "", { path: "/api/youtube", maxAge: 0, httpOnly: true, secure: youtubeCookieSecure(request), sameSite: "lax" });
  let result = "failed";
  try {
    if (!(await isSignedIn())) throw new YouTubeConnectionError("signin");
    if (!raw) throw new YouTubeConnectionError("state_missing");
    const saved = youtubeCallbackState(JSON.parse(unseal(raw)), new URL(request.url).searchParams, youtubeRedirectUri(request));
    const token = await youtubeRequest("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", code: saved.code, code_verifier: saved.verifier, redirect_uri: saved.redirectUri, grant_type: "authorization_code" }) });
    if (!token.refresh_token || !token.access_token || !String(token.scope).split(" ").includes(YOUTUBE_SCOPE)) throw new YouTubeConnectionError("permissions");
    const profile = await youtubeRequest("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const item = profile.items?.[0];
    if (!channelId(item?.id)) throw new YouTubeConnectionError("profile");
    await saveYouTubeAccount({ id: item.id, title: String(item.snippet?.title || "YouTube account").slice(0, 200), image: youtubeImage(item.snippet?.thumbnails?.default?.url) }, token.refresh_token);
    result = "connected";
  } catch (error) {
    result = error instanceof YouTubeConnectionError ? error.reason : "failed";
    // Authorization codes, tokens, and request URLs must never enter logs.
    console.warn("[youtube/callback]", result);
  }
  return Response.redirect(youtubeReturnUrl(request, result));
}
