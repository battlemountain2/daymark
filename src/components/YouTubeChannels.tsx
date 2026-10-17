"use client";

import { useState } from "react";
import type { YouTubeChannel, YouTubeStatus } from "@/lib/youtube-contract";

export default function YouTubeChannels({ status, onChange }: { status: YouTubeStatus; onChange: () => void }) {
  const [channels, setChannels] = useState<YouTubeChannel[] | null>(null);
  const [selected, setSelected] = useState(status.selected);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  async function load() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/youtube?view=channels", { cache: "no-store" }), data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not load channels.");
      setChannels(data.data); setSelected(data.selected);
      if (data.stale) setMessage(`Showing saved subscriptions. ${data.warning || "YouTube could not refresh."}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load channels."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/youtube", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selected }) });
      if (!response.ok) throw Error("Could not save your channels. Please retry.");
      setMessage("Channels saved. Your videos are ready in Media."); onChange();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save channels."); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/youtube", { method: "DELETE" });
      if (!response.ok) throw Error();
      onChange();
    } catch { setMessage("Could not disconnect. Please retry."); }
    finally { setBusy(false); }
  }
  if (!status.account) return <div className="youtube-connect"><a className="btn" href="/api/youtube/connect">Connect YouTube</a><p className="sub">Choose your Google account and approve read-only YouTube access. Your Gmail connection stays separate.</p></div>;
  return <div className="youtube-channel-manager">
    <p>Connected as <strong>{status.account.title}</strong>. Choose up to 20 channels for your Media shelf.</p>
    <div className="connections-actions"><button className="btn" onClick={() => void load()} disabled={busy}>{busy ? "Working…" : channels ? "Refresh channel list" : "Choose channels"}</button><a href="/api/youtube/connect">Reconnect</a><button className="btn quiet" onClick={() => setConfirmDisconnect(v => !v)} disabled={busy}>Disconnect…</button></div>
    {confirmDisconnect && <div className="connection-notice"><p>Remove the YouTube connection and its cached feed from Daymark? Saved video choices remain in your Daymark queue. To revoke Google access too, use your Google account permissions.</p><button className="btn" onClick={() => void disconnect()} disabled={busy}>Disconnect from Daymark</button><button className="btn quiet" onClick={() => setConfirmDisconnect(false)}>Cancel</button></div>}
    {message && <p role="status">{message}</p>}
    {channels && <>
      <label className="connection-field">Find a channel<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your subscriptions" /></label>
      <p className="sub">{selected.length} selected · imports up to 500 subscriptions. Select a channel again to remove it.</p>
      {selected.filter(id => !channels.some(c => c.id === id)).map(id => <label className="youtube-channel" key={id}><input type="checkbox" checked onChange={() => setSelected(old => old.filter(c => c !== id))} /> Previously selected channel · {id}</label>)}
      <div className="youtube-channel-list">{channels.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).map(c => <label className="youtube-channel" key={c.id}><input type="checkbox" checked={selected.includes(c.id)} disabled={busy || (!selected.includes(c.id) && selected.length >= 20)} onChange={e => setSelected(old => e.target.checked ? [...old, c.id] : old.filter(id => id !== c.id))} />{c.title}</label>)}</div>
      {!channels.length && <p className="sub">No subscriptions were returned for this YouTube account. Try another account if needed.</p>}
      <button className="btn" disabled={busy} onClick={() => void save()}>Save channel selection</button>
    </>}
  </div>;
}
