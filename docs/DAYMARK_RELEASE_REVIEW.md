# Daymark production release

Published October 4, 2026, with the user's explicit authorization. Production: https://hey-brayan.vercel.app. Final deployment `dpl_GnN1WJBLbcHetLShvRzFgFZ7vg3A` is READY; its remote Next.js build took 34 seconds. Source changes remain uncommitted in the local working tree; no GitHub push was performed.

## What this update contains

- Main, School, and Media with independent panel order, visibility, collapse, sidebar pins, density, and palette choices; all six original light/dark palettes remain available. The desktop sidebar stays visible while scrolling; the mobile header scrolls normally to leave room for content.
- Updated login, Study Hub content, timetable, notebook, media workspace, quiet navigation, and Desk Mode.
- Listening Corner with live Last.fm history/artwork, manual refresh, artist counts, and recommendations. Live Steam recent games and backlog choices work locally.
- Film/show posters, synopsis, runtimes, and click-to-open trailers; Release Radar uses real album covers/show posters when available.
- Private PDF reader with persistent highlights, comments, cited notes, and linked card drafts. Notebook source links return directly to the saved page and passage, including on narrow screens. The approved Sutter test flow works locally.
- Quick Capture into course notebooks and existing projects, source-preserving task previews, clickable task sources, safe appends, and durable offline task saves.
- Project next steps and Undo removal. Bulk private photo selection with resizing and individual failure feedback. All 115 Finder Favorites photos are imported into local and shared production storage; 56 HEICs were converted, with original files unchanged and personal image metadata omitted. The folder's 22 videos were skipped. Three timed-out production requests succeeded on a targeted retry.
- Daily Shuffle gives images a larger contained frame and keeps photo management in a collapsed menu. Repeated decorative taglines are removed across the dashboard; setup, task suggestions, and completion help remain available in expandable sections.
- URL-based space restoration and a small persistent focus/break timer.

## Checked

Production build → typecheck, sequentially: passed. All 32 Node tests passed. Diff whitespace checks passed; existing font/hook lint warnings remain. The runtime dependency audit reports no advisories. Duplicate generated filenames containing spaces in `.next` are excluded from local typechecking; normal generated route checks remain included.

Browser checks include real Last.fm/Steam data, Sutter reading/highlight/comment/note/card navigation, independent customization, film artwork/trailer controls, project capture/Undo, two-image bulk upload with generated fixtures, navigation/reload, break continuity, and 320 px capture layout.

The final October 4 rebuild and subsequent typecheck passed. At 320 px, the page has no horizontal overflow, the mobile rail is static, and a real Favorites photo loads. At 1280 px, the sidebar stays at the top while scrolling and shows the Media-specific pins. The local preview remains running on `http://127.0.0.1:3001/`.

Stopping the local server during a task capture verified offline queueing. After reconnecting, exactly one task reached the isolated database. Two separate authenticated API clients verified note propagation and recovery of a conflicting edit.

Generated project/task/photo fixtures were removed. Sutter reader verification records remain available in isolated test storage and were not copied into production. Only the authorized Favorites photos were imported into production.

Live checks: Gmail API returns 200, configured true, zero connected accounts, and the expected HTTPS callback. Last.fm returns listening history without an error; Steam returns 107 owned games and two recent games. Shared private storage returns 115 photos; authenticated photo access returns JPEG/200 and anonymous access returns 401. The final production browser renders the new Shuffle and a real Favorites image.

The final deployment's runtime error scan returned zero entries after these checks. School renders task suggestions and completion help collapsed by default. This is a short post-deployment check, not ongoing monitoring; drains and external monitoring were not audited.

The production callback was saved on the existing Daymark Google OAuth client. Google's actual sign-in now reaches its account picker and unverified-app access warning rather than `redirect_uri_mismatch`. The user requested both Gmail accounts, starting with the primary Gmail account. Read-only consent is awaiting explicit approval; no Gmail access has been granted.

## Still required

- Complete Google's read-only consent for the first Gmail account, then sign in and separately connect the second. Verify real inbox → capture → saved note/task behavior. The callback is saved; existing Google Vercel settings do not establish a connected account.
- Add remaining readings to the live private collection. Favorites import is complete; `scripts/import-favorites.mjs` supports authenticated, deduplicated imports and targeted retries with `--only`. No Finder watcher is included.
- Check actual Mac/PC/phone sync and touch text selection. Browser dimensions and API-client tests do not establish physical-device acceptance.

The production release must use the existing production environment configuration. Never ship the local test database or preview-only disabled credentials. Keep `.env.local` and its editor swap files out of Git.

## Deferred

Semester archive and game trailer/screenshot previews remain future work. Xweather, media handoff, mood check-ins, small-wins prompts, and Double Feature are excluded.

## Dashboard-wide copy cleanup — October 4

Removed repeated slogans, redundant explanatory paragraphs, grandiose study labels, and implementation blurbs across login, customization, Desk Mode, notebook, reader, study/practice/review, Python/GIS, fitness, weather, and timers. Course content, citations, connection errors, keyboard help, and necessary behavior explanations remain. Source verification help is expandable; weekly summary no longer asserts mastery or an active streak. The unverified fixed gym crowd recommendation was removed. Original palette colors remain unchanged.

Final cleanup deployment: https://daymark-47e3p3i0e-bry8.vercel.app (`dpl_Brz2ze6rCuh8n1cazuEcLx7gdyiT`), production target, READY, Next.js 15.5.26, 37-second remote build, uncommitted working-tree source. Final local build and subsequent typecheck passed; all 32 tests passed before the final copy-only refinements. Desktop Study Hub and 320px weekly-review controls were checked. The phone controls use two columns without page overflow. Live browser verification shows the simplified weekly summary; screenshot `/private/tmp/daymark-copy-live.png`. Live provider checks still return Last.fm 12 tracks, Steam 107 games/two recent, and 115 private photos. Gmail is configured but has zero connected accounts; Trakt has no viewing data until the client ID is supplied. The new deployment error scan returned zero entries; monitoring/drains were not audited.

## Trakt connection completed — October 4

The user saved their own client ID in the gitignored `.env.local`. Trakt returned 403 with Daymark’s previous generic request, while the same public profile/history returned 200 when identified with an application User-Agent. Daymark now sends `User-Agent: Daymark/0.1.0` and JSON content type alongside the API version and client ID. Account 2701bry is public. The 403 message now names app/client access as well as privacy instead of implying privacy is always the cause. The existing provider regression test checks those headers.

Only the supplied Trakt client ID was added to Vercel Production as a sensitive variable. No client secret or OAuth token was requested or stored. Local build → typecheck passed; all 32 tests passed. Production deployment `dpl_GnN1WJBLbcHetLShvRzFgFZ7vg3A` (https://daymark-5n7vop6fg-bry8.vercel.app) is READY, Next.js 15.5.26, 34-second remote build, uncommitted working-tree source. Live API returns five deduplicated shows with no provider notes. Continue Watching visibly renders Trakt episode details and real posters where matched; screenshot `/private/tmp/daymark-trakt-live.png`. This shows last watched episodes, not playback resume positions. The short error scan returned zero entries; continuous monitoring/drains were not audited. Gmail remains configured with zero connected accounts, pending separate read-only consent for each account.

## Gmail callback recovery — October 4

The user completed Google consent, but Daymark returned gmail=failed. The observed flow started around 14:21 Mountain and its callback arrived at 14:38:17 Mountain, exceeding the existing ten-minute encrypted OAuth-state lifetime. Expiry is the leading explanation; the old empty catch did not record a reason, so the specific failure of that attempt is not established by logs.

Callback failures now record only fixed stage/reason codes and bounded Google status codes, never authorization URLs, codes, state, tokens, or mail content. The browser receives a useful retry message and returns to Main/Gmail instead of restoring Media and hiding the result. State expiry, redirect matching, PKCE, authentication, and one-use cookie clearing remain enforced; the ten-minute lifetime and read-only scope are unchanged. The initial loading state no longer falsely reports missing Google configuration.

Production build then typecheck passed. All 34 tests passed, including state expiry/mismatch, correct inbox return, and error-text redaction. The isolated local callback returned state_missing and Main/#gmail; the browser showed the retry guidance. Live Gmail connection is still pending a fresh handshake.

Callback recovery deployed to production: https://daymark-63lx1yz44-bry8.vercel.app (`dpl_EUzdBkZWaL5phBCZemda7theiS3r`), READY, Next.js 15.5.26, remote build 46 seconds, uncommitted working-tree source. Live callback return verification passed and the browser showed the new retry message. Short deployment error scan returned 0 entries; this is not continuous monitoring. A new Google consent flow will be opened after verification so the user has the full ten-minute window.

## Daymark-only Gmail dismissals — October 4

The first live Gmail account connected successfully and returned messages without an account error. Each visible email now has Dismiss, with immediate Undo and a collapsed Dismissed emails list for later Restore/Open in Gmail. Preferences use account plus message ID, never subject, and participate in per-record cloud sync/offline queueing. Restore writes a tombstone so other devices can clear the dismissal. Only account/message identity, subject, dates, and dismissal time are retained for recovery; message bodies/snippets are not copied into dismissal records.

The Gmail API now returns the existing bounded pool of twelve ranked messages instead of trimming it to five before local filtering; the panel still displays four eligible emails. Dismissal/Restore use Daymark storage and never invoke Gmail archive/delete/read-state/label mutations. Tests verify independent accounts with identical IDs, same-subject messages, next-candidate selection, persisted state and tombstones, and unchanged Gmail account tokens. All 36 tests passed; production build followed by typecheck passed.

Deployment `dpl_ECcuCqu2kxuzKKMZhvGJJcv17UTZ` (https://daymark-jfzne6144-bry8.vercel.app) is READY and aliased to https://hey-brayan.vercel.app, Next.js 15.5.26, remote build 36 seconds, uncommitted working-tree source. Live Dismiss removed only the selected email and filled the four-message list; Undo restored it. A second dismissal survived reload, and a separate authenticated read-only sync client confirmed one active shared dismissal. The narrow 320px layout had no panel/action overflow. Final Restore and test cleanup completed October 7; the shared client confirmed zero active dismissals and one restored record. Temporary viewport override was cleared. Proof: `/private/tmp/daymark-gmail-dismiss-controls.png`.

The final browser log contains a React #418 text hydration mismatch during initial dashboard load. It did not prevent inbox loading or Dismiss/Restore; its component origin remains unverified and is a follow-up for the larger dashboard polish pass. Physical second-device verification and continuous runtime monitoring were not performed.

## Dashboard polish release — October 7

Production deployment `dpl_956rcYm5zQPXN5d1qBUCjzTJjUC1` (https://daymark-b7quvgfxa-bry8.vercel.app) is READY and aliased to https://hey-brayan.vercel.app. Vercel account battlemountain2, team bry8, linked project hey-brayan; working-tree source based on main/abd4920, without a Git commit or push. Remote build took 1m 3s.

Desk keeps its clock/photo presentation and foregrounds the shared Pomodoro on start. Remaining time is bounded to the duration; legacy state migrates; pause/minimize/reload preserve the deadline; backward clock changes pause safely; completion history is idempotent, and next phases require a click. The dimmed background is inert, keyboard focus includes settings disclosures, Escape restores the compact control, and the dialog fits desktop/320px. Sound remains opt-in. Active countdown is local to the device; history uses existing shared storage.

Soundtrack artwork uses strict verified Apple catalog IDs/credits; live NieR cover loaded from mzstatic.com. Missing artwork uses a deliberate graphic. Media now shows a featured manual carousel immediately, with arrows/keyboard/swipe support, remembered picks, visible Continue rows and artwork shelves. Filters and collection management are secondary. Live Steam and Trakt rows loaded; Trakt describes last watched episodes rather than playback resume.

School tasks use 16px Source Sans 3 titles and larger metadata, date groups and simplified filters; IDs, titles and due keys are unchanged. Library/resume replaces the upload-first reader; course links retain context. Eight selected Downloads PDFs were imported as private HIST 300 originals, verified byte-for-byte by authenticated downloads, with anonymous access denied. The 9,082,562-byte/27-page Environmental History slides rendered successfully both locally and live. The new authenticated 512KB staged upload supports original PDFs through 25 MB; unfinished stages expire, part retries are idempotent, and the library exposes only completed files. Existing Sutter highlight, comment, cited notes, source link and reviewed card-draft controls were verified in isolated storage; verification notes/cards were not imported into production.

Main adds the actual flexible workout plan and configurable class-gap suggestions, not booked appointments. The duplicate ten-minute departure callout conflicted with Commute Radar; only campus-hop guidance remains alongside the home-trip estimate. Main news shows five stories and opens the full Media feed correctly. Shared panel menus offer collapse/pin/hide, hide Undo, and keyboard Escape. Radar suggests confirmed provider searches from listening/viewing, deduplicates editions by group ID, distinguishes edition dates, and avoids reconciling missing records after partial responses. Last successful/partial/failed check state is saved per follow; refresh is on-view/manual, with no scheduled job. Live Quadeca identity/release lookup returned 200/200 with a complete response; no follow was created by verification.

Final production build followed by typecheck passed; 49 tests passed. Existing unrelated lint/font warnings remain. Desktop and 320px checks showed no page overflow. All six palettes rendered, per-space editing stayed independent, and temporary palette/viewport overrides were restored. Live read-only APIs returned one Gmail account without an error, Last.fm history, 149 films, 107 owned Steam games, one recent game, five Trakt shows, 115 private photos and eight private PDFs. A visual check toggled Lab 6 inadvertently; it was restored immediately and the original 16/32 count was confirmed after reload and by an independent API read. The live timer was returned to its original idle 25-minute state with no completed test session.

An initial visit served the prior cached dashboard and its known React #418 warning; after reload the new release rendered and no additional client error was recorded during the final flows. Initial time now uses server renderedAt consistently. This is bounded browser evidence, not continuous monitoring. Physical-device highlighting/sync, physical swipe and opt-in sound remain unverified. The second Gmail account still needs separate consent.

Proof: docs/screenshots/daymark-focus-polish-live.png and docs/screenshots/daymark-soundtrack-polish-live.png. Documentation/screenshots are excluded from deployment uploads.


## Direct timer controls and Zen view — October 7

The user clarified that the strange countdown was an old build, and requested simpler controls and a stronger foreground timer presentation. Desk now shows phase buttons, minutes/seconds fields, 15/25/45/60-minute shortcuts, and Start/Reset directly. Start applies a custom duration and opens the screen-filling dimmed Zen view. Active sessions show the large clock and Pause/Reset; pausing restores the duration fields. Back to Desk and Escape minimize without resetting. Optional task and ambient sound controls remain secondary, with no timer disclosure/dropdown. Desk retains its clock and personal photo controls and opens at the top of the page.

Custom durations are validated from one second through 24 hours and retain the existing persisted session schema. Long timers display hours. School free-window shortcuts use the available minutes rather than silently capping at 25. Timer subscriber notifications now follow displayed-second changes and persistence checkpoints rather than emitting on every 250ms check. The deadline/completion/manual-next-phase behavior remains intact. A CSS scroll lock keeps the background stationary even when the older PreClassBriefModal cleanup clears the inline body overflow during dashboard updates.

Validation: all 50 tests passed, including custom duration persistence/completion and hours formatting. Final production build then typecheck passed; targeted timer component/library lint passed. Existing unrelated font/hook and task-layout CSS warnings remain. Isolated local browser checks covered custom completion, manual next phase, pause/resume, reset, minimizing/reopening, reload recovery via Resume Timer, focus wrapping, Escape, and 320px/hour-length layouts. No phone hardware or PC browser was tested.

Production deployment dpl_FznEiwKro8Atg224QZpx2XYkxDzF (https://daymark-899olgxth-bry8.vercel.app), target production, READY and aliased to https://hey-brayan.vercel.app. Live browser verification started 37:15, observed the countdown, paused at 37:02, showed correct duration fields and Resume, and confirmed 320px width without horizontal overflow and a locked background. The live test was reset to a paused 25-minute Focus session without adding completion history. No browser errors were captured in the verification tab. Screenshot: docs/screenshots/daymark-zen-timer-live.jpg. The isolated local test server was stopped and its tab closed; test database contents were not imported into production. Source remains in the existing uncommitted working tree.


## Cohesion and reading links — October 7

Production deployment `dpl_2ZMji4UfrhZR3hMJd5niX7yNBju7` (https://daymark-25ez2xt85-bry8.vercel.app) is READY and aliased to https://hey-brayan.vercel.app. Existing working-tree source based on main/abd4920; no commit or push was performed.

The six original palettes remain, with global appearance/accent and independently customized panel layouts/density. The sidebar is text-only without a name footer. Source Serif 4 carries everyday content, with JetBrains controls/details. Main has equal-width overview columns, a three-email preview with More emails, and the detailed workout panel. Course library is migrated below tasks and collapsed by default; existing subsequent customization is preserved. Every panel has a direct Expand/Collapse control, and expanded news has Show less. Album artwork adds an exact-identity Last.fm fallback and a versioned client request to avoid previously cached negative results. Trakt year/IMDb identifiers now resolve ambiguous show titles correctly.

Reading links are explicit per-term week and exact assignment mappings. Course library exposes the link editor; weekly readings and assignment rows open the PDF beside existing notes. Connected notes exposes passage sources, backlinks and recorded card provenance. A Sutter PDF, Week 8 mapping and test assignment were verified only in the isolated local database; no test records were imported into production.

Radar checks now run server-side with a lease, bounded provider work, per-follow success/partial/failure state and preservation of concurrent dismissals/snoozes. The production project has the daily `0 13 * * *` cron registered against this deployment; anonymous requests to /api/cron/radar returned 401. The first scheduled invocation has not occurred yet, so registration and integration tests do not establish a completed scheduled run. No follow was created in production by verification.

Validation: all 57 tests passed, final local build followed by typecheck passed, and the remote deployment build passed. Local desktop/320px verification covered independent layouts, shared palette/accent, PDF-to-week/task links, saved highlights/notes, collapse/news controls and manual radar refresh. Live browser verification showed the new sidebar, Source Serif 4 content, the same Forest palette across spaces, collapsed lower School library, workout absent from School, connected Gmail with Dismiss and More emails, current Last.fm history, a loaded Rediscover cover, and loaded Euphoria/The Boys posters. Main and Media had no horizontal overflow at 320px. Final browser error scan returned no entries; physical-device sync/highlighting and continuous runtime monitoring remain unverified.

The first reload initially displayed the previous cached shell; a second reload loaded the current deployment. Temporary viewport overrides were reset and the isolated local preview tab/server were closed. Screenshot: docs/screenshots/cohesion-live-media-2026-10-07.png. Documentation and screenshots are excluded from deployment uploads. The optional second Gmail account still needs its own consent; semester archive and unified Resume remain deferred.
