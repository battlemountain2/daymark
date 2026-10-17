import { gmailOrigin, gmailCookieSecure, gmailCallbackState, GmailConnectionError } from "./gmail-settings";
export { gmailOrigin as youtubeOrigin, gmailCookieSecure as youtubeCookieSecure, gmailCallbackState as youtubeCallbackState, GmailConnectionError as YouTubeConnectionError };
export const youtubeRedirectUri = (request?: Request) => `${gmailOrigin(request)}/api/youtube/callback`;
export function youtubeReturnUrl(request: Request, result: string) {
  const url = new URL("/connections", gmailOrigin(request));
  url.searchParams.set("youtube", result);
  return url.href;
}
