#!/usr/bin/env node
/**
 * Generates the VAPID key pair that signs your push notifications.
 *
 * Uses only Node's built-in crypto, on purpose. This is a *setup* script — the
 * thing you run before anything is installed — so depending on `web-push` here
 * meant it crashed with ERR_MODULE_NOT_FOUND for anyone who hadn't run
 * `npm install` yet. A setup step that requires setup is a bad setup step.
 *
 * A VAPID key pair is just a P-256 (prime256v1) ECDSA key in a particular
 * encoding: the public half is the uncompressed point `0x04 || X || Y` and the
 * private half is the raw 32-byte scalar, both base64url. Verified against
 * `web-push`'s own signer, which accepts these and produces a valid
 * Authorization header from them.
 *
 * The values are printed, never written to disk: they belong in Vercel's
 * environment, not in a file that can be committed by accident. Do not paste
 * them into a chat — including to me. The private key is what proves a push
 * came from your server; anyone holding it can make your phone buzz.
 */
import { generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = privateKey.export({ format: "jwk" });

const raw = (s) => Buffer.from(s, "base64url");
const publicKey = Buffer.concat([Buffer.from([4]), raw(jwk.x), raw(jwk.y)]).toString("base64url");

const cronSecret = randomBytes(24).toString("base64url");

console.log(`
  Four values for Vercel → Settings → Environment Variables.
  Paste them there and nowhere else, then redeploy.

  VAPID_PUBLIC_KEY
  ${publicKey}

  VAPID_PRIVATE_KEY
  ${jwk.d}

  VAPID_SUBJECT
  mailto:bquinonez223@gmail.com

  CRON_SECRET
  ${cronSecret}

  The last one goes in two places: Vercel, and your scheduler (a GitHub
  repository secret, or the Authorization header on cron-job.org). It is what
  stops anyone who finds the URL from triggering your notifications.
`);
