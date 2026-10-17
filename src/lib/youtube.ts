import { db } from "./db";
import { seal, unseal } from "./integration-crypto";
import { channelId, durationMinutes, selectedChannels, youtubeFailure, youtubeImage, type YouTubeChannel, type YouTubeStatus, type YouTubeVideo } from "./youtube-contract";

const API = "https://www.googleapis.com/youtube/v3/";
export async function youtubeSchema() {
  await db().batch([
    "CREATE TABLE IF NOT EXISTS youtube_account (id INTEGER PRIMARY KEY CHECK(id=1), channel TEXT NOT NULL, token TEXT NOT NULL, selected TEXT NOT NULL DEFAULT '[]')",
    "CREATE TABLE IF NOT EXISTS youtube_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, checked TEXT NOT NULL, expires INTEGER NOT NULL)",
  ], "write");
}
export async function youtubeStatus(): Promise<YouTubeStatus> {
  await youtubeSchema();
  const row = (await db().execute("SELECT channel,selected FROM youtube_account WHERE id=1")).rows[0];
  return { configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), account: row ? JSON.parse(String(row.channel)) : null, selected: row ? selectedChannels(JSON.parse(String(row.selected))) : [] };
}
export async function youtubeRequest(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    let code = "";
    try { const data = await response.json(); code = typeof data.error === "string" ? data.error : data.error?.errors?.[0]?.reason || data.error?.status || ""; } catch {}
    throw Error(youtubeFailure(response.status, code));
  }
  return response.json();
}
export async function youtubeToken() {
  await youtubeSchema();
  const row = (await db().execute("SELECT token FROM youtube_account WHERE id=1")).rows[0];
  if (!row) throw Error("Connect YouTube first.");
  let refresh: string;
  try { refresh = unseal(String(row.token)); } catch { throw Error("The saved YouTube connection could not be read. Reconnect your account."); }
  const data = await youtubeRequest("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", refresh_token: refresh, grant_type: "refresh_token" }) });
  if (typeof data.access_token !== "string") throw Error("YouTube did not return access. Reconnect your account.");
  return data.access_token as string;
}
export async function saveYouTubeAccount(account: YouTubeChannel, token: string) {
  await youtubeSchema();
  // Keep selections for a reconnection of the same account; clear them for a different account.
  const prior = await youtubeStatus();
  await db().execute({ sql: "INSERT INTO youtube_account(id,channel,token,selected) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET channel=excluded.channel,token=excluded.token,selected=excluded.selected", args: [JSON.stringify(account), seal(token), JSON.stringify(prior.account?.id === account.id ? prior.selected : [])] });
  await db().execute("DELETE FROM youtube_cache");
}
export async function disconnectYouTube() {
  await youtubeSchema();
  await db().batch(["DELETE FROM youtube_account", "DELETE FROM youtube_cache"], "write");
}
export async function setYouTubeChannels(value: unknown) {
  const selected = selectedChannels(value);
  await youtubeSchema();
  const result = await db().execute({ sql: "UPDATE youtube_account SET selected=? WHERE id=1", args: [JSON.stringify(selected)] });
  if (!result.rowsAffected) throw Error("Connect YouTube first.");
}
async function cached<T>(key: string, seconds: number, read: () => Promise<T>): Promise<{ data: T; checkedAt: string; stale: boolean; warning?: string }> {
  const row = (await db().execute({ sql: "SELECT value,checked,expires FROM youtube_cache WHERE key=?", args: [key] })).rows[0];
  if (row && Number(row.expires) > Date.now()) return { data: JSON.parse(String(row.value)), checkedAt: String(row.checked), stale: false };
  try {
    const data = await read(), checkedAt = new Date().toISOString();
    await db().execute({ sql: "INSERT INTO youtube_cache(key,value,checked,expires) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,checked=excluded.checked,expires=excluded.expires", args: [key, JSON.stringify(data), checkedAt, Date.now() + seconds * 1000] });
    return { data, checkedAt, stale: false };
  } catch (error) {
    if (row) return { data: JSON.parse(String(row.value)), checkedAt: String(row.checked), stale: true, warning: error instanceof Error ? error.message : "YouTube unavailable." };
    throw error;
  }
}
export async function youtubeSubscriptions() {
  const status = await youtubeStatus();
  if (!status.account) throw Error("Connect YouTube first.");
  return cached<YouTubeChannel[]>(`subscriptions:${status.account.id}`, 6 * 3600, async () => {
    const token = await youtubeToken(), channels: YouTubeChannel[] = [];
    let page = "";
    // Bounded to 500 subscriptions. Selected channels cap feed work at 20.
    for (let i = 0; i < 10; i++) {
      const query = new URLSearchParams({ part: "snippet", mine: "true", maxResults: "50", order: "alphabetical", ...(page ? { pageToken: page } : {}) });
      const data = await youtubeRequest(`${API}subscriptions?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      for (const item of data.items || []) {
        const s = item.snippet;
        if (channelId(s?.resourceId?.channelId)) channels.push({ id: s.resourceId.channelId, title: String(s.title).slice(0, 200), image: youtubeImage(s.thumbnails?.medium?.url || s.thumbnails?.default?.url) });
      }
      page = data.nextPageToken || "";
      if (!page) break;
    }
    return [...new Map(channels.map(c => [c.id, c])).values()];
  });
}
export async function youtubeFeed() {
  const status = await youtubeStatus();
  if (!status.account) throw Error("Connect YouTube first.");
  if (!status.selected.length) return { data: [] as YouTubeVideo[], checkedAt: null, stale: false };
  return cached<YouTubeVideo[]>(`feed:${status.account.id}:${status.selected.join(",")}`, 1800, async () => {
    const token = await youtubeToken(), headers = { Authorization: `Bearer ${token}` };
    const channels = await youtubeRequest(`${API}channels?${new URLSearchParams({ part: "contentDetails", id: status.selected.join(",") })}`, { headers });
    const playlists = (channels.items || []).map((c: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }) => c.contentDetails?.relatedPlaylists?.uploads).filter((id: unknown): id is string => typeof id === "string");
    const lists = await Promise.all(playlists.map((id: string) => youtubeRequest(`${API}playlistItems?${new URLSearchParams({ part: "contentDetails", playlistId: id, maxResults: "5" })}`, { headers })));
    const ids = [...new Set<string>(lists.flatMap(list => (list.items || []).map((i: { contentDetails?: { videoId?: string } }) => i.contentDetails?.videoId).filter((id: unknown) => typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id))))];
    const videos: YouTubeVideo[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const data = await youtubeRequest(`${API}videos?${new URLSearchParams({ part: "snippet,contentDetails,status", id: ids.slice(i, i + 50).join(",") })}`, { headers });
      for (const item of data.items || []) {
        const s = item.snippet;
        if (!/^[A-Za-z0-9_-]{11}$/.test(item.id) || !status.selected.includes(s?.channelId) || !Number.isFinite(Date.parse(s?.publishedAt)) || item.status?.privacyStatus !== "public") continue;
        videos.push({ id: item.id, title: String(s.title).slice(0, 240), channelId: s.channelId, channel: String(s.channelTitle).slice(0, 200), published: s.publishedAt, image: youtubeImage(s.thumbnails?.medium?.url), minutes: durationMinutes(item.contentDetails?.duration), url: `https://www.youtube.com/watch?v=${item.id}` });
      }
    }
    return videos.sort((a, b) => b.published.localeCompare(a.published)).slice(0, 80);
  });
}
