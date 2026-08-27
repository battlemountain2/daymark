"use client";

import { useEffect, useState } from "react";

/**
 * Turning notifications on, and being honest when it can't work.
 *
 * iOS only allows web push for a site installed to the home screen, and only
 * from a real user gesture. Both are silent failures if unhandled: the button
 * appears to work and nothing ever arrives. So the state is checked up front
 * and the reason is shown instead of the switch.
 */

type Status = "loading" | "unsupported" | "needs-install" | "off" | "on" | "denied" | "unconfigured";

/**
 * URL-safe base64 to bytes, backed by a plain ArrayBuffer.
 *
 * `Uint8Array.from(...)` yields `Uint8Array<ArrayBufferLike>`, which recent
 * TypeScript will not accept as an `applicationServerKey` because that could in
 * principle be a SharedArrayBuffer. Allocating the buffer explicitly pins the
 * type.
 */
const b64ToU8 = (base64: string): Uint8Array<ArrayBuffer> => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // On iOS this is what a normal Safari tab looks like; installed to the
        // home screen the APIs appear.
        const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        const standalone = (window.navigator as any).standalone === true;
        setStatus(iOS && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") { setStatus("denied"); return; }
      const res = await fetch("/api/push/vapid").then((r) => r.json()).catch(() => null);
      if (!res?.configured) { setStatus("unconfigured"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus(perm === "denied" ? "denied" : "off"); return; }
      const { key } = await fetch("/api/push/vapid").then((r) => r.json());
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(key),
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus(r.ok ? "on" : "off");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  const message: Record<Status, string> = {
    loading: "",
    on: "Notifications on — morning, before your first class, and at night.",
    off: "Get a morning brief, an hour's warning before your first class, and tomorrow's shape at night.",
    denied: "Notifications are blocked in your browser settings for this site.",
    unsupported: "This browser doesn't support push notifications.",
    "needs-install": "Add this to your home screen first — iOS only allows notifications for installed apps.",
    unconfigured: "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable notifications.",
  };

  return (
    <div className="pushrow">
      <div className="sub">{message[status]}</div>
      {status === "off" && (
        <button className="btn mono" onClick={enable} disabled={busy}>
          {busy ? "…" : "Turn on"}
        </button>
      )}
      {status === "on" && (
        <button className="btn quiet mono" onClick={disable} disabled={busy}>
          {busy ? "…" : "Turn off"}
        </button>
      )}
    </div>
  );
}
