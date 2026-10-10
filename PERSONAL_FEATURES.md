# Personal dashboard setup

The local redesign adds Main, School, and Media spaces, the six original light/dark palettes, independent panel settings for each space, a course reader, private file storage, personal shelves, and a quiet Desk Mode. Xweather and media handoff are excluded.

## Production credentials

- `STEAM_API_KEY`: server-only Steam Web API key. Default Steam ID is 76561198390517322; optionally override with `STEAM_ID`.
- `TRAKT_CLIENT_ID`: Trakt application client ID. Public recent episode history for 2701bry is used; no playback resume timestamp is inferred.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google web OAuth client credentials, server-only.
- `DAYMARK_URL`: explicit canonical origin. Without it, deployed requests use https://hey-brayan.vercel.app and loopback previews retain their actual host and port. Register the exact callback shown in Worth opening → Connection setup.
- `SESSION_SECRET`: existing login signing secret also derives the integration encryption key. Rotating it requires reconnecting Gmail accounts.

Register this Google authorized redirect URI exactly:

`https://hey-brayan.vercel.app/api/gmail/callback`

Then use **Connect Gmail** on the dashboard. Each account grants `gmail.readonly`; account consent still happens separately even with the app in production. OAuth uses state and PKCE. Encrypted refresh tokens are stored in a separate `gmail_accounts` table, never in browser storage or personal-record sync. Messages are fetched on demand and not stored in the database or sent to AI. Disconnect removes Daymark's saved token; Google account permissions can also be revoked from Google's connected-app settings.

## Current boundaries

- Letterboxd import includes title, year, rating, likes, and public film links from the supplied export. Its watchlist was empty. Movie picks from that export are therefore labeled rewatches. Add unwatched films or games to the manual backlog; those sync across devices and can be marked finished.
- Steam backlog means zero Steam-recorded playtime, which cannot prove whether a game was played elsewhere.
- Continue watching displays recent Trakt episode activity and links to full show progress.
- Release Radar supports confirmed MusicBrainz artist and TVmaze show follows. It refreshes when the expanded panel opens or on Refresh, using cached provider responses. Exact dated records update by provider ID, with dismiss/snooze stored separately. MusicBrainz edition dates can include reissues and are labeled accordingly. Games and films retain manual source-backed dates. This is not exhaustive release coverage or a background scheduler.
- Album rediscovery uses the existing personal album collection, excluding recently scrobbled albums when Last.fm is available.
- Soundtracks are curated rediscovery cards with matched album artwork or a typographic fallback. No playback or device handoff is added.
- User-selected photos are resized in the browser and stored privately in the existing authenticated database. PDFs are stored as private immutable copies with content hashes, chunked binary storage, and a 3.5 MB upload limit. They are never placed in public assets or Git. Originals remain unchanged. There is no automatic Finder or Apple/Google Photos watcher.
- Walking windows require mild temperatures, daytime, low wind and low rain chance in the next six hours. They do not evaluate route conditions or weather alerts.

## Validation

Build and typecheck must run sequentially. OAuth account consent and production provider data require live credentials and user connection; local passing checks do not establish those flows work in production.

## Personal desk workflows

- Main keeps schedule, Gmail, weather, and Listening Corner prominent. Assignments stay in School. School opens to the weekly timetable; classes expose reading and assignment shortcuts.
- Customize stores independent visibility, collapse, order, density, and palette settings for each space. Shared appearance follows the device by default. Existing preference keys are preserved.
- The course reader uses PDF.js canvas and selectable text. Highlights save exact quotes, immutable file IDs, page numbers, normalized rectangles, and comments. Notes and draft cards retain source links. Reader comfort includes fit/zoom, paper/warm/dim backgrounds, notes width, and printed-page offsets. Scans without text require future OCR. Verify printed numbering before citing.
- Notebook uses the existing note storage, adds a selector for reading/project notes, and places study/export/agent actions behind optional disclosures. Connected notes are explicit links rather than inferred semantic relationships.
- Quick Capture reviews the destination before saving; Gmail captures include a source link and do not send email.
- Personal shelves share backlog records with Tonight’s Pick. A strict time filter excludes unknown runtimes/session lengths. Game session lengths are user-entered, not estimated completion times. Marking finished is reversible.
- Week in Media saves dated listening and Trakt activity going forward and includes user-marked completions. Provider windows can miss older activity. Rolling Steam two-week playtime is not represented as a weekly total.
- Desk Mode keeps a clock and small deadline-based focus timer, optional private art, and a task label. Timer state survives leaving the view.

## Local verification — October 3, 2026

The isolated preview uses `/private/tmp/daymark-redesign-preview.db`, with Gmail/Trakt and Canvas disabled. Last.fm and Steam now load the user-supplied credentials from the gitignored `.env.local`. It does not modify production data. Browser checks cover per-space settings, light/dark layouts, real TVmaze identity search, actual album artwork, shelf capture, strict time filtering, Quick Capture to Notebook, focus continuity, and 390/320 px layouts. Unit tests cover binary storage, sync isolation/conflicts, provider mapping, date filtering, and the installed PDF.js parser with a synthetic PDF.

The original Sutter upload was declined, and no alternate personal-file import was attempted after that denial. The user subsequently explicitly approved a Sutter upload into isolated local test storage. That browser upload and the real-file rendering/highlight/comment/cited-note/card/reload flow are now verified, including card-to-passage navigation and remembering page 2. PDF page 1 visibly identifies printed page 94; the tested offset is 93. Desktop split layout and 125% zoom were checked, with no page overflow at 320 px. This is browser responsive verification, not physical phone touch or Mac/PC/phone sync verification. The other supplied PDFs and Favorites folder have not been imported, and no personal files were imported into production. Live Gmail consent and Trakt checks remain outstanding.

Semester archive remains a future idea. Media handoff, mood check-ins, small-wins prompts, Double Feature, and Xweather are not part of this update.

Final checks, including the completion pass below: production build passed, followed by a passing typecheck; all 32 Node tests passed and `git diff --check` was clean. Existing hook/font lint warnings remain in older components. The final production preview is running at http://127.0.0.1:3001/ with isolated test storage. A browser reload of that production build confirmed the film poster, synopsis, runtime, and trailer control. No Git commit, push, deployment, or production data import was performed for this redesign.


## Completion pass — October 3, 2026

- Restored all six original palettes with their exact existing light/dark colors. Each dashboard space can follow the shared palette or choose its own; saved legacy palette keys remain supported. The Study Hub inherits School settings, and the login inherits Main settings. Typography and layout retain the editorial redesign.
- Redesigned the login, Study Hub overview, practice workspace, course/readings cards, class briefs, weekly takeaways, evidence cards, and Python/GIS lab. Secondary deck tools are collapsed by default. Source verification is labeled as evidence quality rather than learner mastery.
- Replaced the inset Today/Week and Recent/Lo-fi controls with flat controls. Optional Last.fm artist-stat failures no longer suppress working recent tracks; provider requests have timeouts.
- Release Radar resolves exact-release covers through Cover Art Archive, with release-group fallback, and show posters through TVmaze. Missing images keep a typographic fallback.
- Film/show previews use Stremio's public Cinemeta metadata with exact title matching and release-year disambiguation. Posters, synopsis, runtime, and verified trailer IDs are displayed where available. Trailers mount a privacy-enhanced YouTube iframe only after clicking, with no autoplay, and include a YouTube fallback link. This adds no playback handoff or watch-position synchronization. Steam trailer/screenshots remain a future extension.
- Browser verification confirms the existing login password, independent palette selection, card flip/course filters, quiz presentation, course briefs, evidence navigation, and Python/GIS layouts at 390 and 320 px without page overflow. Actual film posters and a Quadeca cover loaded; the embedded film trailer loaded on a 320 px viewport with playback waiting for the user.
- The Vercel CLI is signed in. Sensitive Vercel values could not be downloaded, so the user supplied LASTFM_API_KEY, LASTFM_USER, and STEAM_API_KEY directly in the gitignored `.env.local`. Local live Last.fm and Steam checks now pass. TRAKT_CLIENT_ID and local Google OAuth credentials remain absent. No unrelated production secrets were downloaded.

## Connected-workflow follow-up — October 3, 2026

- Listening Corner now offers Refresh and checks every five minutes while the page is visible. The authenticated, private/no-store music route preserves existing recent tracks when a refresh fails. Live browser verification loaded recent Quadeca/Jane Remover tracks, the life 1 cover, monthly artist counts, and recommendations from Last.fm account adox23; an explicit Refresh also succeeded.
- Live Steam verification loaded Deadlock and Counter-Strike 2 in Continue Playing with artwork and recorded playtime. Games backlog roulette reported 18 eligible choices and selected Fallout: New Vegas with its real artwork. These local checks do not establish deployed production connectivity or save-game resume positions.
- Fixed a production-only PDF worker failure: bundling converted require.resolve into a numeric module ID. The route now reads the explicitly traced worker file by its deployment-relative path. The approved Sutter PDF opens as a 26-page document after the fix; pages 1 and 2 were exercised in the browser.
- Creating a highlight opens the comment pane on narrow layouts. Card-draft storage errors are caught. Reading cards show a readable citation and a validated local Open source passage link outside the flip control.
- Browser checks verified the approved Sutter upload, a wrapped passage, comment search, persisted note/source link, saved card draft in Study Hub, reload/resume, and navigation from the card back to that exact highlight. Test notes/cards are labeled Reader verification and remain in isolated preview storage. No commit, push, or deployment occurred.
- Production build and subsequent typecheck passed; the 22 regression tests passed. Screenshot: /private/tmp/daymark-sutter-reader.png.

## Gmail release check — October 3, 2026

- The user chose verification against the existing production connection. Signed in with the existing Daymark password and inspected the live dashboard: it still serves the older build without a Gmail panel, and `/api/gmail` returns 404. No live Gmail account or capture flow could be verified there. Production data was not changed.
- Fixed local OAuth setup routing and display. The callback now uses an explicitly configured origin, the actual loopback Host/port for local previews, or the fixed production origin. Arbitrary incoming hosts cannot choose a redirect destination. Authorization and token exchange use the same callback stored in encrypted state; HTTPS cookies remain secure. The panel displays the server's actual callback instead of a hard-coded production URL.
- Browser verification showed `http://127.0.0.1:3001/api/gmail/callback` in setup. Clicking Connect Gmail without local keys stayed on `http://127.0.0.1:3001/?gmail=setup` and explained the missing credentials.
- Two additional tests use a synthetic account/database and mocked Google responses: token encryption/decryption, read-only message fetches, ranking, source links, account failure isolation, and callback host handling. All 24 tests passed; rebuilt production bundle and subsequent typecheck passed. This is not a live Google consent or email-to-note capture check.
- Using the Vercel-only Google credentials requires deploying the Gmail routes, then connecting the account through Google's consent screen. No Git commit, push, deployment, or permission grant was performed.

## Workflow polish — October 3, 2026

- Switching spaces now updates the URL while preserving reader deep links; browser reload restores the selected space. Back/forward changes restore the corresponding tab. Local storage failures no longer prevent initial navigation.
- Quick Capture offers all existing course notebooks and existing personal projects. Appends read the latest saved record so another local edit is not replaced by a stale render. Task previews reserve room for a complete source URL within the existing 200-character task limit. Oversized links are directed to notes/projects instead of truncated.
- Capture waits for a successful save or durable offline queue commit. IndexedDB request success is no longer mistaken for transaction completion. Failed saves retain the capture text and show an error.
- Projects have a separate next-step field and immediate Undo removal. Browser verification created a synthetic project, appended a second capture, edited its next step, and restored all fields after removal.
- Private photo uploads support batches of up to 20 with sequential resizing/upload, progress, and per-file failures. A browser chooser accepted two generated PNG fixtures; both became private JPEGs. These generated files were removed after verification; the user's Favorites folder was not read or imported.
- Desk Mode distinguishes breaks from focus in labels and completion history. A five-minute break retained its deadline across leaving/reopening the view. The test timer was stopped and reset to a paused 25-minute focus session afterward.
- An actual browser save with the local server stopped kept a task visible and queued. Reconnection/reload saved exactly one 200-character task to the isolated database. The synthetic task and project were removed after testing.
- Two independent authenticated API clients verified shared note visibility and conflict recovery; the stale edit was retained in history, not substituted for the current version. The synthetic live note was tombstoned afterward. Anonymous private-file access returned 401. These checks do not establish behavior on physical Mac/PC/phone devices.
- Notebook preview renders safe Markdown/bare source links and reader citation links inside quoted passages. Clicking the Sutter citation opened PDF page 1 (printed page 94) and its saved highlight/comment. Linked readings scroll into view and show the passage pane on narrow screens. Captured tasks render a separate Open source link; a synthetic task's exact URL was verified and the task removed.
- The updated capture dialog and page had no horizontal overflow at 320 px, including an unbroken long task title. The browser viewport was restored afterward. Production build, subsequent typecheck, all 30 tests, and diff whitespace checks passed. No push/deployment occurred.

## Sidebar and real Favorites completion — October 3, 2026

- Replaced the hardcoded global reading/project shortcuts with per-space panel pins. Customize provides Pin/Unpin alongside visibility and ordering. Hidden panels never appear as shortcuts. Study subpages use the same saved pins. The desktop sidebar remains available while scrolling; the mobile rail keeps its compact layout.
- Browser checks confirmed independent Main/Media pins, adding/removing a Daily Shuffle shortcut, and a 320 px Customize dialog without horizontal overflow. The temporary pin change was reverted.
- Imported all 115 photos from the user-specified Finder Favorites folder into isolated local private storage: 56 HEICs converted; 22 MOV/MP4 videos skipped. All 115 JPEG copies were checked for maximum 1600 px dimensions and absence of EXIF/XMP/IPTC metadata. Originals were only read. Storage is about 25.9 MB. Daily Shuffle renders actual Favorites and identifies this collection as local preview storage, not shared production storage.
- Added scripts/import-favorites.mjs for authenticated, repeatable imports into the known Daymark origin or loopback previews. The live collection must be populated after publishing; no private files or database are included in Git.
- Live Vercel environment metadata confirms Google keys are Production-only, and no TRAKT_CLIENT_ID exists there. Both are also absent locally. Gmail's unavailable Connect link now opens explicit environment setup instead; its callback was verified in the browser. Local OAuth is supported, but requires local keys and the registered loopback callback.
- Trakt reads the configured TRAKT_USER (default 2701bry) and explains rejected keys, private/inaccessible history, missing users, and rate limits. Its app-management page required user sign-in; no account/app consent was granted. A live Trakt history remains unverified until the user supplies their app client ID.
- Build, subsequent typecheck, all 32 tests, and runtime dependency audit passed. Generated duplicate `.next` filenames with spaces caused local type errors; only these generated copies are excluded, while normal route types are still checked. Existing lint warnings remain. No publishing occurred.
# Production follow-through — October 4, 2026

The user authorized deployment and the private Favorites import. The final release is READY at https://hey-brayan.vercel.app (`dpl_AYaGhjKWdqtBbM4KKuTbMnYjZGYU`). All 115 resized Favorites copies are now in shared storage; three timed-out uploads succeeded on targeted retry. Anonymous photo access is rejected with 401. Originals were not modified, and 22 videos were skipped.

Daily Shuffle now emphasizes larger artwork/photos with management help collapsed below. Decorative taglines and redundant instructions were trimmed across Main, School, Media, news, tasks, commute, and the reader. Task filters and completion help remain available.

Build and subsequent typecheck passed; 32 tests passed before the final text-only School cleanup. Desktop/320 px checks passed, and the final live Shuffle loads a real private photo. Gmail credentials are configured in production, but Google's actual sign-in rejects the missing callback registration. A draft of the correct callback is prepared in Google Cloud, pending approval to save. Gmail consent and Trakt client ID remain outstanding. Source remains uncommitted; no GitHub push occurred.

## Dashboard-wide copy follow-through — October 4

The copy cleanup includes deeper study screens and dialogs, login, customization, notebook, reader, Desk Mode, fitness, weather, and timers. Decorative slogans and technical implementation blurbs are removed; actual readings, quotes, citations, state/error feedback, keyboard help, and necessary setup guidance remain. The production Google OAuth callback is now saved and actual Google sign-in reaches the read-only consent flow. Both requested Gmail accounts are supported separately; consent is still pending. Trakt developer sign-in and the user's own client ID remain required.

Copy-cleanup release is READY at https://hey-brayan.vercel.app (`dpl_Brz2ze6rCuh8n1cazuEcLx7gdyiT`). The final build → typecheck passed, with all 32 regression tests passing before the final text refinements. Live checks retain Last.fm/Steam and 115 private Favorites; Gmail consent and Trakt client ID are still pending. Trakt sign-in succeeded and the user is creating their app.

## Trakt live verification — October 4

The user-supplied client ID is saved locally and securely in Vercel Production. Trakt requests now identify Daymark and send JSON content type; this resolved the observed 403 from the previous generic request. Local and live API checks return five shows for public account 2701bry with no provider error. Continue Watching displays last watched episode labels and matched posters/trailers, without claiming playback resume progress. Build, subsequent typecheck, and all 32 tests pass. Live deployment `dpl_GnN1WJBLbcHetLShvRzFgFZ7vg3A` is READY. Gmail consent remains outstanding for both requested accounts.
