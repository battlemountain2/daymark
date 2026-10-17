import { db } from "./db";
import { connectionChecks, recordConnectionCheck, type ConnectionCheck } from "./connection-health";
import { youtubeStatus, youtubeToken, youtubeRequest } from "./youtube";
import { youtubeRedirectUri } from "./youtube-settings";
import { mailSchema } from "./gmail";
import { ensureAI, providerConfig } from "./ai";

export type Connection = { id: string; name: string; configured: boolean; connected: boolean | null; detail: string; checkable: boolean; check: ConnectionCheck | null; link?: string };
export type ConnectionsData = { connections: Connection[]; youtubeCallback: string; checkedAt: string; youtube: import("./youtube-contract").YouTubeStatus };
export async function getConnections(request: Request): Promise<ConnectionsData> {
  const [checks, youtube] = await Promise.all([connectionChecks(), youtubeStatus(), mailSchema(), ensureAI()]);
  const gmail = (await db().execute("SELECT email FROM gmail_accounts")).rows;
  const connections: Connection[] = [
    { id: "youtube", name: "YouTube", configured: youtube.configured, connected: !!youtube.account, detail: youtube.account ? `${youtube.account.title} · ${youtube.selected.length} selected channel${youtube.selected.length === 1 ? "" : "s"}` : "Read-only subscriptions and uploads. Connect separately from Gmail.", checkable: !!youtube.account, link: "/?space=media#youtube", check: checks.youtube ?? null },
    { id: "gmail", name: "Gmail", configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), connected: gmail.length > 0, detail: gmail.length ? `${gmail.length} connected account${gmail.length === 1 ? "" : "s"}. Dismissals only affect Daymark.` : "Connect an account from Worth opening on Main.", checkable: gmail.length > 0, link: "/?space=main#gmail", check: checks.gmail ?? null },
    { id: "music", name: "Listening", configured: !!((process.env.LASTFM_USER && process.env.LASTFM_API_KEY) || process.env.LISTENBRAINZ_USER), connected: null, detail: "Last.fm or ListenBrainz listening history.", checkable: true, link: "/?space=media#music", check: checks.music ?? null },
    { id: "canvas", name: "Canvas", configured: !!process.env.CANVAS_ICS_URL, connected: null, detail: "Assignment calendar. Completion ticks are managed in Daymark.", checkable: true, link: "/?space=school", check: checks.canvas ?? null },
    { id: "weather", name: "Weather", configured: true, connected: null, detail: "National Weather Service forecast; no API key required.", checkable: true, link: "/sky", check: checks.weather ?? null },
    { id: "media", name: "Steam & Trakt", configured: !!(process.env.STEAM_API_KEY || process.env.TRAKT_CLIENT_ID), connected: null, detail: `Steam ${process.env.STEAM_API_KEY ? "configured" : "not configured"} · Trakt ${process.env.TRAKT_CLIENT_ID ? "configured" : "not configured"}.`, checkable: true, link: "/?space=media#entertainment", check: checks.media ?? null },
    { id: "storage", name: "Cloud storage", configured: !!process.env.TURSO_DATABASE_URL, connected: true, detail: "Database responded. Device sync state is shown below; this does not test another device.", checkable: true, check: { checkedAt: new Date().toISOString(), succeededAt: new Date().toISOString(), error: null } },
  ];
  for (const provider of ["gemini", "openai"] as const) {
    const config = providerConfig(provider);
    const event = (await db().execute({ sql: "SELECT ok,error,created_at,action FROM agent_events WHERE provider=? ORDER BY created_at DESC LIMIT 1", args: [provider] })).rows[0];
    const success = (await db().execute({ sql: "SELECT created_at FROM agent_events WHERE provider=? AND ok=1 ORDER BY created_at DESC LIMIT 1", args: [provider] })).rows[0];
    connections.push({ id: provider, name: provider === "openai" ? "OpenAI (optional)" : "Gemini", configured: !!config.key, connected: null, checkable: false, detail: `${config.model}. ${event ? `Last action: ${event.action}.` : "No recorded requests."} Opening Connections does not generate AI requests.`, check: event ? { checkedAt: String(event.created_at), succeededAt: success ? String(success.created_at) : null, error: event.ok ? null : String(event.error || "Last request failed.") } : null });
  }
  return { connections, youtubeCallback: youtubeRedirectUri(request), checkedAt: new Date().toISOString(), youtube };
}
export async function checkConnection(id: string) {
  let error: string | null = null;
  try {
    switch (id) {
      case "youtube": {
        const token = await youtubeToken();
        const result = await youtubeRequest("https://www.googleapis.com/youtube/v3/channels?part=id&mine=true", { headers: { Authorization: `Bearer ${token}` } });
        if (!result.items?.length) throw Error("YouTube did not return a channel. Reconnect your account.");
        break;
      }
      case "gmail": {
        const result = await (await import("./gmail")).getMail();
        if (!result.accounts.length || result.accounts.some(a => a.error)) throw Error("Reconnect Gmail from Worth opening. One or more accounts could not refresh.");
        break;
      }
      case "music": {
        const result = await (await import("./music")).getMusic();
        if (result.error) throw Error("Listening could not refresh. Check the Last.fm or ListenBrainz configuration.");
        break;
      }
      case "canvas": {
        if (!process.env.CANVAS_ICS_URL) throw Error("Canvas calendar is not configured.");
        await (await import("./canvas")).fetchAssignments(process.env.CANVAS_ICS_URL);
        break;
      }
      case "weather":
        await (await import("./weather")).getForecast(process.env.LAT || "35.1064", process.env.LON || "-106.632"); break;
      case "media": {
        const result = await (await import("./entertainment")).getEntertainment();
        const messages = result.notes.filter(note => !note.includes("not connected in this environment"));
        if (messages.length) throw Error(messages.join(" "));
        if (!process.env.STEAM_API_KEY && !process.env.TRAKT_CLIENT_ID) throw Error("Steam and Trakt are not configured.");
        break;
      }
      case "storage": await db().execute("SELECT 1"); break;
      default: throw Error("Unknown connection.");
    }
  } catch (cause) {
    // Only our bounded, purpose-written messages can reach the page.
    const message = cause instanceof Error ? cause.message : "";
    error = /^(YouTube|Reconnect|Listening|Canvas calendar is not configured|Steam|Trakt)/.test(message) ? message.slice(0, 350) : "The connection check failed. Try again later or check its configuration.";
  }
  await recordConnectionCheck(id, error);
}
