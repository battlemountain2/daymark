export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
export function youtubeConnectionMessage(result: string) {
  const messages: Record<string, string> = {
    connected: "YouTube connected. Choose the channels you want in Media.",
    setup: "Add Google OAuth credentials, enable YouTube Data API v3, and register the callback shown below.",
    expired: "The connection expired. Start again and finish within 10 minutes.",
    state_missing: "Browser verification was lost. Start a new YouTube connection.",
    denied: "YouTube access was not approved. Your Gmail connection is unchanged.",
    permissions: "Google did not return YouTube read-only access. Reconnect and approve that permission.",
    signin: "Sign in to Daymark before connecting YouTube.",
    profile: "No YouTube channel was returned. Check which Google/YouTube account you selected.",
    failed: "YouTube connection did not complete. Check the Google API and callback setup, then try again.",
  };
  return messages[result] || messages.failed;
}
export type YouTubeChannel = { id: string; title: string; image: string | null };
export type YouTubeVideo = { id: string; title: string; channelId: string; channel: string; published: string; image: string | null; minutes: number | null; url: string };
export type YouTubeStatus = { configured: boolean; account: YouTubeChannel | null; selected: string[] };
export const channelId = (value: unknown): value is string => typeof value === "string" && /^UC[A-Za-z0-9_-]{22}$/.test(value);
export function selectedChannels(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 20 || !value.every(channelId)) throw Error("Choose up to 20 channels.");
  return [...new Set(value)].sort();
}
export function youtubeImage(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && ["i.ytimg.com", "yt3.ggpht.com", "yt3.googleusercontent.com"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
export function durationMinutes(value: unknown) {
  const match = typeof value === "string" && value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match || !match.slice(1).some(Boolean)) return null;
  return Math.max(1, Math.ceil(Number(match[1] || 0) * 60 + Number(match[2] || 0) + Number(match[3] || 0) / 60));
}
export function youtubeFailure(status: number, code: string) {
  if (code === "invalid_grant" || status === 401) return "YouTube access expired. Reconnect your account.";
  if (["quotaExceeded", "dailyLimitExceeded"].includes(code) || status === 429) return "YouTube's request allowance was reached. Your saved videos are kept; try again later.";
  if (code === "accessNotConfigured" || code === "SERVICE_DISABLED") return "Enable YouTube Data API v3 in the Google Cloud project used by Daymark.";
  if (status === 403) return "YouTube denied access. Check API setup and reconnect with read-only permission.";
  return "YouTube is temporarily unavailable. Your saved videos are kept.";
}
