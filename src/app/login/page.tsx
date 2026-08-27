"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase: pass }),
    });
    setBusy(false);
    if (res.ok) router.replace("/");
    else setErr(true);
  }

  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: 90 }}>
      <h1 className="greet"><em>Daymark</em></h1>
      <div className="rule" />
      <form className="addform" onSubmit={submit} style={{ borderTop: 0 }}>
        <label htmlFor="p" className="mono pill">Passphrase</label>
        <input
          id="p" type="password" autoFocus autoComplete="current-password"
          value={pass} onChange={(e) => setPass(e.target.value)}
        />
        <div className="addrow">
          <button className="btn mono" type="submit" disabled={busy || !pass}>
            {busy ? "checking…" : "Open"}
          </button>
          {err && <span className="mono pill" style={{ color: "var(--heat)" }}>not that one</span>}
        </div>
      </form>
    </div>
  );
}
