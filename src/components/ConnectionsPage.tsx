"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Connection, ConnectionsData } from "@/lib/connections";
import YouTubeChannels from "./YouTubeChannels";
import AgentStatus from "./AgentStatus";
import { youtubeConnectionMessage } from "@/lib/youtube-contract";

function label(connection: Connection) {
  if (!connection.configured) return "Not configured";
  if (connection.connected === false) return "Not connected";
  if (connection.check?.error) return "Last check failed";
  if (connection.check?.succeededAt) return "Last check passed";
  return connection.connected ? "Connected · not checked" : "Configured · not checked";
}
function date(value: string) { return new Date(value).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
export default function ConnectionsPage({ result }: { result?: string }) {
  const [data, setData] = useState<ConnectionsData | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/connections", { cache: "no-store" }), next = await response.json();
      if (!response.ok) throw Error(next.error || "Could not load connections.");
      setData(next); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load connections."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function check(id: string) {
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }), next = await response.json();
      if (!response.ok) throw Error(next.error || "Could not check connection.");
      setData(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not check connection."); }
    finally { setBusy(null); }
  }
  return <main className="personal-dashboard connections-page">
    <div className="connections-shell">
      <Link href="/?space=main" className="connections-back">← Daymark</Link>
      <header className="connections-heading"><div><h1>Connections</h1><p>Your services, saved connections, and last successful checks.</p></div><button className="btn" onClick={() => void load()} disabled={!!busy}>Reload status</button></header>
      {result && <p className="connection-notice" role="status">{youtubeConnectionMessage(result)}</p>}
      {error && <p role="alert" className="connection-notice">{error}</p>}
      {!data && !error && <p role="status">Loading connections…</p>}
      {data && <>
        <p className="sub">Configured means settings are present. Use Check connection to verify a service. Times are Mountain Time.</p>
        <div className="connections-grid">{data.connections.map(connection => <section className="connection-card" key={connection.id} aria-labelledby={`connection-${connection.id}`}>
          <div className="connection-card-heading"><h2 id={`connection-${connection.id}`}>{connection.name}</h2><span className={`connection-state${connection.check?.error ? " has-error" : ""}`}>{label(connection)}</span></div>
          <p>{connection.detail}</p>
          {connection.check && <div className="connection-history"><p>Last check: {date(connection.check.checkedAt)}</p><p>Last success: {connection.check.succeededAt ? date(connection.check.succeededAt) : "None recorded"}</p>{connection.check.error && <p role="status">{connection.check.error}</p>}</div>}
          <div className="connections-actions">{connection.checkable && <button className="btn" disabled={!!busy || !connection.configured} onClick={() => void check(connection.id)}>{busy === connection.id ? "Checking…" : "Check connection"}</button>}{connection.link && <Link href={connection.link}>Open in Daymark ↗</Link>}</div>
          {connection.id === "youtube" && <><YouTubeChannels key={data.youtube.account?.id || "disconnected"} status={data.youtube} onChange={() => void load()} /><details className="connection-setup"><summary>YouTube setup</summary><ol><li>In the Google Cloud project used for Gmail, enable YouTube Data API v3.</li><li>Add the YouTube read-only permission to the OAuth consent configuration and include your Google account as a test user when applicable.</li><li>Add this exact authorized redirect URI to the Web OAuth client:<code>{data.youtubeCallback}</code></li><li>Click Connect YouTube and approve access.</li></ol><p className="sub">YouTube watch history and native Watch Later are unavailable through this integration. Saved videos use your Daymark queue.</p></details></>}
        </section>)}</div>
        <section className="connections-sync"><h2>Device sync &amp; agent activity</h2><p className="sub">Agent tests below send a small provider request when clicked. Reloading connection status does not.</p><AgentStatus /></section>
      </>}
    </div>
  </main>;
}
