const PRODUCTION_ORIGIN = 'https://hey-brayan.vercel.app';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
export const GMAIL_STATE_TTL_SECONDS = 600;
export class GmailConnectionError extends Error {
  constructor(public reason: string) { super('Gmail connection did not complete'); }
}
/** Validate the one-use handshake before exchanging a Google authorization code. */
export function gmailCallbackState(saved: unknown, params: URLSearchParams, redirectUri: string, now = Date.now()) {
  const s = saved as Record<string, unknown> | null;
  if (!s || typeof s.state !== 'string' || typeof s.verifier !== 'string' ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(s.verifier) || typeof s.expires !== 'number' || !Number.isFinite(s.expires))
    throw new GmailConnectionError('state_invalid');
  if (s.expires <= now) throw new GmailConnectionError('expired');
  if (s.state !== params.get('state') || s.redirectUri !== redirectUri)
    throw new GmailConnectionError('state_invalid');
  if (params.get('error')) throw new GmailConnectionError('denied');
  const code = params.get('code');
  if (!code) throw new GmailConnectionError('code_missing');
  return {code, verifier:s.verifier, redirectUri};
}
export function gmailReturnUrl(origin: string, result: string, reason?: string) {
  const url = new URL('/', origin);
  url.searchParams.set('space', 'main');
  url.searchParams.set('gmail', result);
  if (reason) url.searchParams.set('gmail_reason', reason);
  url.hash = 'gmail';
  return url.href;
}
export function gmailConnectionMessage(status: string, reason: string | null) {
  if (status === 'connected') return 'Gmail connected.';
  if (status === 'setup') return 'Add Google OAuth credentials for this environment.';
  if (reason === 'expired' || reason === 'state_missing')
    return 'The connection expired or its browser verification was lost. Click Connect Gmail to start again, and finish within 10 minutes.';
  if (reason === 'signin') return 'Sign in to Daymark, then connect Gmail again.';
  if (reason === 'denied') return 'Gmail access was not approved. You can connect again when ready.';
  if (reason === 'token_exchange') return 'Google approved access, but Daymark could not complete the connection. Start a fresh connection; if it fails again, the Google client configuration needs checking.';
  if (reason === 'permissions') return 'Google did not return the required read-only access. Connect Gmail again and review the permission.';
  if (reason === 'save') return 'Daymark could not save the connection. Please try again.';
  return 'Google connection did not complete. Click Connect Gmail to start a fresh connection.';
}

/** Only explicit configuration or a loopback request may select another origin. */
export function gmailOrigin(request?: Request) {
  if (process.env.DAYMARK_URL) {
    const configured = new URL(process.env.DAYMARK_URL);
    if (configured.username || configured.password ||
        (configured.protocol !== 'https:' &&
         !(configured.protocol === 'http:' && LOOPBACK_HOSTS.has(configured.hostname)))) {
      throw new Error('DAYMARK_URL must use HTTPS or local loopback HTTP');
    }
    return configured.origin;
  }
  if (request) {
    const incoming = new URL(request.url);
    // Next may reconstruct request.url with localhost even when the browser uses
    // 127.0.0.1. Preserve the actual Host only when it is explicitly loopback.
    try {
      const host = request.headers.get('host');
      const local = host ? new URL(`${incoming.protocol}//${host}`) : incoming;
      if (!local.username && !local.password && LOOPBACK_HOSTS.has(local.hostname) &&
          (local.protocol === 'http:' || local.protocol === 'https:')) {
        return local.origin;
      }
    } catch {
      // Malformed/untrusted hosts cannot choose an OAuth destination.
    }
  }
  return PRODUCTION_ORIGIN;
}

export function gmailRedirectUri(request?: Request) {
  return `${gmailOrigin(request)}/api/gmail/callback`;
}

export function gmailCookieSecure(request: Request) {
  return gmailOrigin(request).startsWith('https:');
}
