# YouTube and Connections

`/connections` shows configuration separately from account connection and the last successful check. Checks run only when requested; loading the page reads saved status and verifies that the database responds. The AI rows show recorded request results and do not invoke a model. Agent test requests remain explicitly triggered in the existing activity section.

YouTube uses the existing Google web OAuth client, with an independent state cookie, PKCE verifier, callback, and encrypted refresh token. It requests only `youtube.readonly`. Gmail credentials and saved accounts are unchanged. Tokens never reach browser JSON or localStorage.

## Setup

1. In the Google Cloud project that owns `GOOGLE_CLIENT_ID`, enable YouTube Data API v3.
2. Add `https://www.googleapis.com/auth/youtube.readonly` to the consent configuration. Include the intended Google account as a test user when the app is in Testing.
3. Register the exact authorized redirect URI displayed in `/connections` under YouTube setup. It is `${DAYMARK_URL}/api/youtube/callback`, defaults to `https://hey-brayan.vercel.app/api/youtube/callback` in production, and preserves the loopback port locally when `DAYMARK_URL` is unset.
4. Open Connections, click Connect YouTube, and approve Google's read-only permission. Choose up to 20 subscriptions and save the selection.

Google project configuration and real account consent must be completed by the account owner. A local fixture or successful build does not establish live authorization. Existing Gmail access alone does not grant YouTube access. Google testing-mode restrictions can require reconnection; the UI handles failed refreshes without deleting saved videos.

## Feed and saved choices

The subscription list is capped at 500 entries and cached for six hours. Only selected channels are fetched: their uploads playlists provide up to five uploads each, followed by batched public-video metadata. Feed results are capped at 80 and cached for 30 minutes. No search endpoint or automatic AI summarization is used. Provider errors preserve the last good feed and show its update time.

Media contains a separate, customizable From your channels panel. Saved, watched, and hidden choices sync as independent records under `daymark:youtube`; saved choices retain the video link and metadata after it leaves the latest-uploads feed. Loading video thumbnails is deferred. Playback opens YouTube. Native Watch Later and viewing history are not accessed.

Disconnect removes Daymark's token and feed cache. It does not revoke the entire Google app grant, which could also affect Gmail; the user can manage that grant through Google account permissions. User-created queue choices remain available.

## Scope of cleanup

Agent/sync detail moved from the dashboard bundle to Connections. New YouTube UI is split between the feed, reusable video cards, and channel management; its CSS is scoped to the feature. Connections styling is route-scoped. Two fitness flex-alignment compatibility warnings were corrected without changing workout state or data.

## Verification

Automated checks cover encrypted token storage, OAuth state expiry/mismatch, callback origin, read-only scope, request-origin protection, channel limits, validated provider artwork, duration parsing, cached provider calls, last-good feed recovery, bounded provider error messages, account switching, disconnect cleanup, health-history preservation, and cloud record round-trips. Live Google consent remains a separate acceptance step.

The suite passes 123 tests. Browser checks used an isolated SQLite database with dummy OAuth settings and cached subscription/video fixtures: channel selection reached Media, saving a video survived reload, and an independent database query confirmed its shared record. Connections measured 1100px of content at a 1280px viewport; Connections and the video shelf had no document overflow at 390px. No client errors were captured. Anonymous APIs returned 401, a cross-origin disconnect returned 403, and an invalid callback returned the expected state-missing guidance. No real provider consent, live YouTube feed, or physical second device was tested, and no fixture data was imported into production.
