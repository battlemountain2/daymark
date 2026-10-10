"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PersonalPage from "@/components/PersonalPage";
export default function Login() {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase: pass }) });
      if (res.ok) { router.replace("/"); router.refresh(); }
      else setError(res.status === 429 ? "Too many attempts. Give it a moment, then try again." : "That password didn’t match. Try again.");
    } catch { setError("Couldn’t reach Daymark. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <PersonalPage space="main" login><div className="login-card">
    <span className="desk-brand">daymark</span><div className="login-art" aria-hidden="true"><span /><span /><span /></div>
    <h1>Welcome back.</h1>
    <form onSubmit={submit}><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" autoFocus required value={pass} onChange={e => setPass(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} /><button type="submit" disabled={busy || !pass}>{busy ? "Opening…" : "Open Daymark →"}</button>{error && <p id="login-error" role="alert">{error}</p>}</form>
  </div></PersonalPage>;
}
