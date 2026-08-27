"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and says so when you're seeing cached data.
 *
 * `navigator.onLine` is famously optimistic — it reports true for a wifi
 * network that has no route to the internet, which is exactly the campus
 * failure mode. So the banner is driven by an actual request to our own origin,
 * not by that flag alone.
 */

type Props = {
  /** When the server rendered this page, so the banner can say how stale it is. */
  renderedAt: string;
  /** Writes waiting in the outbox, so the user knows nothing was lost. */
  pending?: number;
};

const ago = (iso: string): string => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!isFinite(m) || m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export default function Offline({ renderedAt, pending = 0 }: Props) {
  const [offline, setOffline] = useState(false);
  // Null until mounted: computing it during SSR bakes one answer into the HTML
  // and the browser hydrates with another.
  const [stamp, setStamp] = useState<string | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // No service worker (private window, unsupported browser) just means no
        // offline support. Everything else still works.
      });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      // A HEAD to our own origin, cache-busted. This is the only reliable way
      // to tell "connected to wifi" from "actually reachable".
      try {
        const r = await fetch(`/api/ping?t=${Date.now()}`, { method: "HEAD", cache: "no-store" });
        if (alive) setOffline(!r.ok);
      } catch {
        if (alive) setOffline(true);
      }
      if (alive) setStamp(ago(renderedAt));
    };
    check();
    const t = setInterval(check, 30000);
    const on = () => check();
    window.addEventListener("online", on);
    window.addEventListener("offline", () => setOffline(true));
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("online", on);
    };
  }, [renderedAt]);

  // Queued writes are worth announcing even back online — the flush takes a
  // moment, and silence would look like the edits were lost.
  if (!offline && !pending) return null;

  const saved = pending === 1 ? "1 change saved here" : `${pending} changes saved here`;

  return (
    <div className="offline mono" role="status">
      <span className="dot" aria-hidden="true" />
      {offline
        ? `Offline — showing what loaded ${stamp ?? "earlier"}${pending ? ` · ${saved}, will sync` : ""}`
        : `${saved} · syncing…`}
    </div>
  );
}
