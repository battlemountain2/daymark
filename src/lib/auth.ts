import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * One user, one passphrase. Not a login system — just enough that the URL
 * isn't world-readable. The cookie is signed so it can't be forged, httpOnly
 * so scripts can't read it, and the comparison is constant-time.
 */
const COOKIE = "hb_session";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
};

const sign = (value: string): string =>
  createHmac("sha256", secret()).update(value).digest("hex");

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkPassphrase(input: string): boolean {
  const expected = process.env.APP_PASSPHRASE;
  if (!expected) throw new Error("APP_PASSPHRASE is not set");
  return safeEqual(input, expected);
}

export async function startSession(): Promise<void> {
  const issued = String(Date.now());
  const jar = await cookies();
  jar.set(COOKIE, `${issued}.${sign(issued)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function isSignedIn(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [issued, mac] = raw.split(".");
  if (!issued || !mac) return false;
  if (!safeEqual(mac, sign(issued))) return false;
  return Date.now() - Number(issued) < MAX_AGE * 1000;
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
