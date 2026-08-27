import webpush from "web-push";
import { listSubs, deleteSub, type PushSub } from "@/lib/db";

/**
 * Sending, and pruning what can no longer receive.
 *
 * A push endpoint dies when the browser is uninstalled, the PWA is removed, or
 * the subscription is rotated. The push service answers 404 or 410 for those,
 * and they must be deleted — otherwise every run wastes time on a dead endpoint
 * forever.
 */

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:bquinonez223@gmail.com",
    pub, priv
  );
  configured = true;
  return true;
}

export type SendResult = { sent: number; pruned: number; failed: number };

export async function sendToAll(payload: { title: string; body: string; url?: string }): Promise<SendResult> {
  if (!configure()) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
  const subs = await listSubs();
  let sent = 0, pruned = 0, failed = 0;

  await Promise.all(subs.map(async (s: PushSub) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 3600 }
      );
      sent++;
    } catch (e: any) {
      const code = e?.statusCode;
      if (code === 404 || code === 410) {
        await deleteSub(s.endpoint).catch(() => {});
        pruned++;
      } else {
        failed++;
      }
    }
  }));

  return { sent, pruned, failed };
}
