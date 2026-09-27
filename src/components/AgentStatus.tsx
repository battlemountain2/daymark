"use client";
import { useEffect, useState } from "react";
import { cloudStorage, getCloudStatus, syncCloud, type CloudStatus } from "@/lib/cloud-storage";
import { splitRecords, joinRecords } from "@/lib/sync-contract";
type Health = { providers: { provider: string; model: string; configured: boolean; last: { ok: number; latency: number; error: string | null; created_at: string } | null }[]; usage: { requests: number; tokens: number }; recent: { provider: string; action: string; ok: number; error: string; created_at: string }[] };
export default function AgentStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [recovery, setRecovery] = useState<{namespace:string;key:string;value:string|null;saved_at:string;conflict:number}[] | null>(null);
  async function loadRecovery() {
    try { const res = await fetch("/api/sync"); if (!res.ok) throw new Error("Recovery history unavailable."); const data = await res.json(); setRecovery(data.history.filter((r: {conflict:number}) => Number(r.conflict))); } catch(e) { setError(e instanceof Error ? e.message : "Recovery unavailable."); }
  }
  async function restore(row: {namespace:string;key:string;value:string|null}) {
    const values = splitRecords(row.namespace, cloudStorage.getItem(row.namespace));
    if (row.value === null) delete values[row.key]; else values[row.key] = row.value;
    cloudStorage.setItem(row.namespace, joinRecords(row.namespace, values));
    await syncCloud();
  }
  const [sync, setSync] = useState<CloudStatus>({ state: "checking", pending: 0, message: "Checking cloud storage…" });
  async function load(test = false) {
    if (test) setTesting(true);
    try { const res = await fetch("/api/agents", { method: test ? "POST" : "GET" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setHealth(data); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Status unavailable"); } finally { setTesting(false); }
  }
  useEffect(() => {
    void load();
    const update = () => setSync(getCloudStatus()); update();
    window.addEventListener("daymark:sync-status", update);
    return () => window.removeEventListener("daymark:sync-status", update);
  }, []);
  return <section className="agent-status card" aria-label="Agents and cloud storage">
    <div className="card-head"><h2>Agents & storage</h2><span className="pill mono">{sync.state}</span></div>
    <div className="card-body">
      <p role="status">{sync.message}{sync.pending > 0 ? ` (${sync.pending} queued)` : ""}</p>
      <div className="agent-providers">{health?.providers.map(p => <div key={p.provider}><strong>{p.provider === "gemini" ? "Gemini" : "OpenAI"}</strong><span>{!p.configured ? "Not configured" : !p.last ? "Configured · not tested" : Number(p.last.ok) ? "Last request succeeded" : "Last request failed"}</span><small className="mono">{p.model}{p.last ? ` · ${p.last.latency}ms · ${new Date(p.last.created_at).toLocaleString()}` : ""}</small></div>)}</div>
      {health && <p className="sub mono">Today (UTC): {health.usage.requests} provider requests · {health.usage.tokens} tokens. Up to 30 AI actions per hour.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="agent-actions"><button className="btn mono" disabled={testing} onClick={() => void load(true)}>{testing ? "Testing…" : "Test agents"}</button><button className="btn quiet mono" onClick={() => void syncCloud()}>Sync now</button><a className="btn quiet mono" href="/api/sync" download="daymark-recovery.json">Download recovery history</a></div>
      <p className="sub">AI actions send the selected notes or study context to Gemini, then OpenAI if needed. Tests send only “Reply with OK” and use a small amount of API credit. Generated answers should be checked against your readings.</p>
      <details><summary>Recent agent activity</summary>{health?.recent.length ? health.recent.map((r, i) => <p className="mono sub" key={i}>{r.action} · {r.provider} · {Number(r.ok) ? "success" : r.error}</p>) : <p>No requests recorded yet.</p>}</details>
      <details onToggle={e => { if (e.currentTarget.open && recovery === null) void loadRecovery(); }}><summary>Review conflicting versions</summary>
        <p className="sub">The cloud version stays active when two devices edit the same item. You can restore your other version here; earlier edits remain in recovery history.</p>
        {recovery?.length === 0 && <p>No conflicting versions.</p>}
        {recovery?.map((r,i) => <div className="recovery-item" key={i}><strong>{r.key}</strong><small> · {r.saved_at}</small><pre>{r.value === null ? "Deleted item" : r.value}</pre><button className="btn mono" onClick={() => void restore(r)}>Restore this version</button></div>)}
        <button className="btn quiet mono" onClick={() => { localStorage.removeItem("daymark:sync:conflicts"); void syncCloud(); }}>Mark conflicts reviewed</button>
      </details>
    </div>
  </section>;
}
