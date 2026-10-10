# Implementation status — October 3, 2026

The accepted Sidebar desk direction is implemented locally. Current behavior and verification boundaries are documented in [PERSONAL_FEATURES.md](../PERSONAL_FEATURES.md). The planning sections below retain earlier proposals; they are not claims that every proposed provider or future feature has shipped.

Current implementation includes per-space customization, calm Main, weekly School, Media shelves/context picks, private PDF/photo storage, source-linked reading annotations/notes/card drafts, Quick Capture, project shelf, simplified Notebook, Desk Mode, and source-backed release follows. Release coverage currently uses MusicBrainz and TVmaze plus manual dates; IGDB/TMDB coverage and background schedules remain future extensions. The user-approved Sutter PDF workflow has been verified in isolated local storage. Production integrations and physical cross-device checks remain outstanding.

---

# Daymark: next major update — working brief

Working brief, October 2, 2026. Product direction and the confirmations below are agreed; detailed layouts and implementation choices remain for concept review. Existing local implementation work is preserved; no deployment is part of this planning session.

## What this update should achieve

Daymark should feel like one well-designed personal application: useful at a glance, deep when opened, and enjoyable outside school. Improve visual quality and information organization together. Preserve real functionality rather than making a polished but empty shell.

## Confirmed preferences from this conversation

- Gmail / Worth Opening belongs near the top of Main.
- Entertainment deserves more space and richer presentation.
- Daily Shuffle needs real imagery and considered typography.
- Offer ways to hide or collapse stories, release updates, and panels.
- Explore Main, School, and Media spaces.
- Include album rediscovery, soundtrack shuffle, personal photos, Tonight’s Pick, backlog roulette, Steam recent activity, Trakt watching, and release tracking.
- Walking suggestions can use the existing weather source.
- Exclude Xweather, mood check-ins, and small-wins prompts.
- Personal photos can come from deliberately selected local files; a Google Photos favorites album was also discussed.
- Plan and review design concepts before resuming implementation.
- Exclude Double Feature pairings.

## First-round decisions — confirmed

- Editorial + cinematic, with strong typography, artwork, and calm layouts.
- Curated Main overview with deeper School and Media spaces.
- Main priorities: schedule, Gmail, weather, and music, then secondary content.
- Move the school assignment/to-do list into School to avoid anxiety on opening Main.
- Explore Claude-inspired warmth, restrained controls, softer surfaces, and natural typography.
- Maple Mono and JetBrains Mono are favored. Choose display/body fonts by role rather than using Inter throughout.
- Continue brainstorming before implementation.
- School opens as a weekly timetable with readings and assignments.
- Appearance follows the device, with fully designed warm light and charcoal dark themes.
- Store selected PDFs and photos privately so they are available on Mac, Windows PC, and phone.

## Remaining implementation choices

1. Review populated Main, School, Media, and reader concepts before changing the app shell.
2. Choose private document/photo storage and configure access through Daymark's existing authenticated session. Files must be available cross-device; local-only storage is no longer the intended full solution.
3. Verify live Gmail/Steam/Trakt flows and choose/configure the agreed metadata providers. Credentials are not requested in chat.
4. Choose initial personal project names and media shelves; these can be edited later and do not block the design work.
5. Optional later decisions include advanced motion, annotation export/OCR, broader release discovery, and real music playback integration. These must not delay the agreed core.

## Starting design recommendation — direction chosen, details open

Explore Claude-inspired warmth while preserving Daymark’s personality. Consider a natural serif for display/editorial text, a readable humanist sans for body and controls, and Maple Mono or JetBrains Mono for supporting metadata. Avoid all-caps display type on every heading. Use a consistent spacing scale. Give imagery a deliberate role, rather than placing unrelated pictures behind every panel. Main is composed and useful; School is practical and focused; Media is richer and more cinematic. All three share navigation, controls, theme, and interaction patterns.

### Main — what matters today

- Brief, calm greeting/context line about the schedule. The existing lede must stop surfacing overdue school counts or anxiety-producing prompts on Main.
- Worth Opening: 3–5 useful emails, account picker, refresh status, expand to more.
- Weather + next event / day at a glance; commute details open on demand.
- No assignment list, overdue count, or workload heatmap on Main by default. A quiet School link can open that space when Bry chooses.
- Music is a primary Main feature: a cover-led listening card with useful controls. Optional workout or Daily Shuffle preview comes afterward.
- One quick capture for a task, note, or item to watch/play later.

### School — the full workspace

- Full timetable, assignments, course filters, upcoming exams, and semester milestones.
- Course pages that gather readings, notes, flashcards, evidence, and study actions together.
- Due review queue and short sessions based on available time.
- Focus timer and scratchpad integrated with the current course/task.
- Grade what-if tool with explicit user-entered values and sample-data labels.
- Optional reading queue, exam preparation plan, and weekly review.

### Media — the collection and discovery space

- A featured Tonight’s Pick with poster/game art, runtime when verified, platform, and a brief reason.
- Continue Watching and Continue Playing shelves.
- Backlog library for films, games, shows, and anime; saved, in progress, finished, and paused states.
- Daily Shuffle: album cover + type, soundtrack card, or selected personal photo.
- Listening: recent tracks, favorite albums, artist pages, and optional listening history.
- Release Radar: followed items, upcoming/out-now filters, dismiss/snooze, and source links.
- What’s New: a curated reading feed with saved items, audio queue, source/category preferences, and an explicit hide-feed control.

### Shared clutter controls

- Pin a summary to Main without duplicating a full panel.
- Collapse to a useful summary, or hide a panel entirely.
- A visible Customize screen restores hidden panels.
- Save preferences across devices, with a reset-to-defaults action.
- Quiet / Focus / Wind Down presets are optional; they should not override deliberate user changes silently.
- News stays stable while reading: offer a “new stories available” action instead of injecting rows.
- Release Radar shows a few relevant items and an expandable archive, not an endless schedule.
- On mobile, every important action remains available by tap; hover is supplementary.

## Feature feasibility and current status

| Feature | Current local state | Proposed full implementation |
| --- | --- | --- |
| Gmail | Read-only connection/routes and panel written; account consent and live inbox still unverified | Finish callback registration and real account connection; account views and ranked inbox previews; retain links to Gmail |
| Steam | Owned/recent-game code and mocked tests; production credentials not exercised in the isolated preview | Connect live library, add artwork, useful playtime labels, manual play status, backlog filters |
| Letterboxd | 191 rating entries imported; favorites/revisits used; supplied watchlist empty | Reimportable export + diary RSS where useful; resolve metadata carefully, including film/show distinctions; user-maintained watchlist |
| Trakt / Stremio | Recent episode history code; needs application client ID | Verify scrobbling, fetch enough watched history/progress, identify next unwatched aired episode; do not promise exact player timestamps |
| Artwork | Cover lookup endpoint and matching helper started; not connected to Shuffle | Verified artist/album matches, metadata cache, film/TV posters and game art, attractive labeled fallback |
| Album rediscovery | Existing personal catalog, excluding latest scrobbles when available | Compare longer-term favorites with recent listening; explain why selected; avoid immediate repeats |
| Photos | Up to eight resized images stored only on the current device | Choose local-only or private cross-device photo library; optional Google Photos picker later |
| Release Radar | Manual dates/source links with sync | Provider-specific follow rules and verified dates; distinguish announcements from scheduled releases; handle delays and missing dates |
| Panel controls / tabs | Preference types and reusable wrapper started; not wired to the dashboard | Complete shared shell, accessible tabs, saved preferences, restore controls, and mobile navigation |
| Walking suggestions | Simple temperature/rain/wind/daylight forecast rule | Improve freshness and alert handling; optional user-chosen routes and schedule-aware walking windows |

## Additional ideas worth considering

### Strong candidates

- **One capture, several destinations:** save a link as a reading, film, game, note, or task without navigating away.
- **Personal shelves:** favorite albums, comfort films, anime to start, short games, and “with friends” collections.
- **Pick by time:** 20-minute episode, 45-minute game session, or a film; unknown runtimes stay unknown until metadata is resolved.
- **Pinned projects:** a small place for GIS work, coding, a game project, or a home-server task with a next action.
- **A weekly media recap:** actual listening, watching, and playing activity with a small collage; optional, without streak pressure.
- **Study-to-break handoff:** finishing a focus session offers one saved song, short episode, or break idea.
- **Reading room:** a calm saved-article/audio queue rather than more scrolling headlines.
- **Desk mode:** an optional minimal view with clock, current task, music, and one photo.

### Possible later additions

- Calendar connection if the class schedule misses appointments and work shifts.
- A personal places list or walking map with routes chosen by the user.
- A small journal attached to photos, albums, or finished media.
- “On this day” from real diary/listening/photo dates.
- Podcast following and episode queues.
- Limited, explicit notifications for deadlines and followed releases.

These are choices to prioritize, not a commitment to ship every idea in one release.

## Data and integration approach

Use one internal media record with provider IDs, artwork, type, runtime/date where verified, personal status, source URL, and refresh time. Keep personal preferences separate from provider snapshots. Merge identities carefully rather than relying on titles alone. Cache provider metadata; retain last good data with a clear stale state. Failed providers affect their own features.

Private tokens remain server-side and encrypted. Gmail content stays out of AI calls unless explicitly requested. Imported personal collections and photos must have intentional visibility; avoid putting private data into public static assets in a larger release.

Source boundaries checked October 2:

- [Steam player services](https://partner.steamgames.com/doc/webapi/IPlayerService) support owned and recent-game data when visible. They do not establish story completion.
- [Last.fm top albums](https://www.last.fm/api/show/user.getTopAlbums) supports overall and shorter-period charts for rediscovery.
- [Letterboxd API access](https://letterboxd.com/api-beta/) is request-only and currently excludes private/personal/recommendation projects. Export and diary RSS are the practical approach; it recommends TMDB for general movie/TV metadata.
- [Google Photos authorization](https://developers.google.com/photos/overview/authorization) directs user-library selection to the Picker API; broad existing-library access is no longer the old Library API model. Do not promise automatic favorites-album sync.
- [Gmail message retrieval](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get) supports authenticated read-only retrieval and selected metadata headers.
- [TMDB image documentation](https://developer.themoviedb.org/docs/image-basics) describes poster/backdrop paths and image configuration. Account/key setup and attribution need to be included if chosen.
- [Trakt API](https://trakt.docs.apiary.io/) needs an application key; exact progress endpoint requirements and account access must be verified during the integration spike.

## Build sequence after design choices

1. **Design and inventory:** answer the first questions, review existing desktop/mobile UI, choose priorities, sketch navigation, and identify placeholder data.
2. **Concept review:** compare 2–3 visual directions with representative populated Main, School, and Media screens, plus meaningful empty/collapsed/mobile states. Concept content is clearly labeled.
3. **Foundation:** shared shell, typography/tokens, navigation, panel controls, density, loading/error states, and preservation of existing data and features.
4. **Connected core:** verify Gmail/Steam/Trakt/Last.fm against live accounts; complete imports, metadata/artwork, and status model.
5. **Personal experience:** build the agreed Shuffle, Tonight’s Pick, continue shelves, reading room, and release behavior.
6. **Acceptance and rollout:** desktop/mobile visuals, keyboard and touch use, private-data/cache checks, offline/sync behavior, provider failures, and real end-to-end flows; review a concrete release before publishing.

## Quality bar

- No invented grades, completion percentages, release dates, play progress, or personal activity.
- Real artwork where matched; deliberate typography fallback otherwise.
- Main remains glanceable; depth opens into the appropriate space.
- Feature behavior is complete, not a row of buttons leading to empty placeholders.
- New layout preferences do not erase tasks, ticks, study history, imports, or provider connections.
- Check dark/light appearance, long titles, smaller screens, larger text, keyboard navigation, and reduced motion.
- Show the difference between a design concept, an isolated test preview, and a connected production preview clearly.

## Semi-automatic Release Radar — proposal under discussion

Bry asked how a semi-automatic radar could work. Recommended model: choose follows once, automatically refresh matched release records, and review ambiguous discoveries separately. This is a planning proposal, not implemented behavior.

- **Follow:** artists, individual games, shows/anime, and films. Suggest artists from Last.fm listening and shows from connected Trakt activity, but require deliberate follow selection. Existing Steam ownership alone should not silently create a large release-follow list. Search/paste links for upcoming games; wishlist import remains a separate feasibility question.
- **Automatic tracking:** refresh provider records daily and on an explicit refresh, using stable provider IDs. Record source, platform/region, date precision, and last successful check. Date changes update an existing item rather than creating duplicate cards. Do not turn a year/quarter into a fabricated exact date.
- **Review queue:** ambiguous title/artist matches, conflicting dates, and dates extracted from announcements need a brief Accept / Ignore / Correct step. A news article can point to a release but must not itself establish availability. An optional AI extractor may suggest fields with a source link; it must not invent a date or silently promote an uncertain item.
- **Sources:** IGDB for game release dates by platform/region; TMDB for movie release types; TVmaze or TMDB for known episode/season information; MusicBrainz for recorded music releases, complemented by supported artist/label feeds or manually pasted official announcements for upcoming music. Music coverage requires a prototype before committing to completeness.
- **Personal controls:** album/EP-only music by default, optional singles/reissues, selected gaming platforms, region, optional show episode updates, mute/unfollow, dismiss/snooze, and manual correction retained separately from provider updates.
- **Presentation:** artwork-led carousel in Media with This week / Upcoming / Recently released filters; optional compact Main summary. Uncertain discoveries stay behind a review action. Hide/collapse controls remain available. Dates and source links are visible; cinema, digital purchase, broadcast, and streaming-subscription availability are distinct.
- **Refresh architecture:** server-side cached fetches into the existing database; separate followed identities, provider release snapshots, and personal dismissed/saved state. Keep last good data if a provider fails. A scheduled job is implementation infrastructure for the app, not a Codex reminder automation.
- **First version:** follow search + daily date refresh + cover art + manual fallback + small review queue. Broader franchise/developer following, announcement extraction, and extra anime-specific coverage can follow after validating the core.

Primary sources checked October 2, 2026: [IGDB API](https://api-docs.igdb.com/#release-date), [TMDB release types](https://developer.themoviedb.org/reference/movie-release-dates), [TVmaze schedules and episodes](https://www.tvmaze.com/api), [Last.fm top artists](https://www.last.fm/api/show/user.getTopArtists), and [MusicBrainz release metadata examples](https://musicbrainz.org/doc/MusicBrainz_API/Examples).

## Next conversation round

First-round feel/navigation/priorities are confirmed above. Next questions cover the School entry experience, additional-feature priorities, laptop/phone use, and default appearance. Then compare typography/artwork concepts and narrow news behavior, media services, motion, and phase-one scope.

## Additional design and feature proposals after round one

### Main composition

Keep schedule and Worth Opening together near the top. Put weather and music in the next band, so all four priorities are visible early. Main's header uses a calm schedule-based message; overdue assignments stay in School. A discreet School shortcut remains available without turning it into a warning banner. Secondary panels can be pinned deliberately.

### Typography directions to compare

- Warm editorial: a readable serif display face such as Source Serif 4 or Literata, a humanist body face, and Maple Mono for metadata.
- Quiet contemporary: a soft humanist sans for navigation/body with limited serif moments; JetBrains Mono for dates and counters.
- Personal desk: more Maple Mono in compact controls and headings, with a comfortable proportional font for longer notes and email snippets.

These are visual candidates; test actual fonts and readability on laptop and phone rather than choosing only by font names. Preserve enough contrast in secondary text.

### Feature candidates with a distinct purpose

| Idea | Purpose | Implementation direction |
| --- | --- | --- |
| Listening corner | Keep music enjoyable and prominent on Main | Actual now-playing/recent album art, track/artist, listening link; optional soundtrack switch; no fake transport controls |
| Personal shelves | Give Media a collection feel | User-named collections such as comfort films, anime to start, short games, favorite albums; shared media IDs and saved membership |
| Pick by time and company | Make Tonight's Pick useful | Verified runtime for films/episodes; user-set game-session length; solo/with-friends tags; explain selection and allow reroll |
| Finish later | Support paused books/articles/media without nagging | Manual paused/in-progress status, last activity where verified, optional next-step note |
| Read later / listening queue | Keep headlines from becoming another feed | Save stories/audio into a calm queue, optional topic/source filters, open original source |
| Quick capture | Reduce friction across spaces | One shortcut accepts a task, note, link, film/game, or reading; choose destination before saving |
| Personal project shelf | Make room for non-school projects | A few pinned projects, each with one current next action and links; optionally GIS, coding, game work, or a home server |
| Desk mode | Provide a minimal background view | Current listening, clock, optional photo, one chosen task; explicit exit and no surprise auto-switching |
| On this day | Make personalization richer | Only use real dated diary/scrobble/photo metadata; optional, never fabricate anniversaries |
| Week in media | Create a personal recap without gamifying life | Real watching/listening/playing activity, poster/cover collage, optional favorites and short notes |
| Course reading desk | Tie documents to studying | Course-linked reading queue, notes, cited highlights, related flashcards, and resume reading state |
| Schedule-aware study session | Fit useful work into time already available | Combine actual open blocks and due review cards; suggest a small session, with user control |
| Weather-sized break | Offer a relevant off-screen option | Forecast-based short walk or indoor break, with reliable data and user-chosen routes if enabled |

No mood check-in, small-wins prompts, or Xweather are reintroduced by these proposals.

## Round two questions sent

- School entry: calm next-action plan, weekly workspace, or course-first spaces?
- Additional features: media shelves/recap, reading/capture/projects, or desk/photos/music personalization? User can combine.
- Device and appearance: laptop-first warm light, laptop-first dark, or laptop+phone following device theme?

## Feature feedback — confirmed direction and proposed behavior

Bry likes the design direction and wants Listening Corner, personal shelves, Quick Capture, a cleaner scratchpad, a personal project shelf, Desk Mode, Week in Media, and Course Reading Desk. Reading Room is of interest, with a question about PDF complexity. Double Feature is explicitly excluded. These choices establish feature direction; detailed behavior and release ordering remain proposals.

### Tonight's Pick with context

Start with explicit, optional time and media-kind filters, plus a Surprise me default. Company and new/rewatch preferences can be added without asking for a mood check-in. Select from saved items and in-progress media; keep Letterboxd favorites in an explicitly labeled Rewatch pool because the supplied watchlist was empty.

Resolve metadata once and store provider IDs, runtime when known, media type, source links, personal shelves/status, optional solo/friends tags, and prior picks/dismissals. For films/episodes, filter by verified runtime when a strict time budget is chosen. For games, use user-defined session tags such as short session or with friends; total completion time must not be used as session duration. Unknown runtimes can appear in unrestricted picks but cannot be claimed to fit a strict budget.

Rank matching saved items, gently prefer items not recently suggested, and shuffle among the best matches. Build the reason from the same rules used to choose the item: saved in a selected shelf, episode fits selected time, game tagged for friends, or a rewatch favorite. No AI is needed for this first version. Reroll, save for later, dismiss, and correct metadata remain available. Platform availability comes only from a verified provider or user-set link, never from a release date alone.

### Reading Room and Course Reading Desk

Reading Room is the personal queue for articles/links and optional PDFs; Course Reading Desk is the School view of assigned documents. They share a document record and reader rather than growing two separate viewers.

Use an established renderer such as [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) instead of writing a PDF engine. A first reading workspace should provide page navigation, zoom, text search/selection, remembered page, and a notes pane. Bry explicitly prioritized highlighting passages and turning them into cited notes or flashcards, so persistent source-linked highlights are part of the first reading experience, not a later optional extra. Store document ID/version, title, exact selected text, PDF page, printed page label when available, text anchor, and normalized page coordinates. A selection toolbar offers Save quote / Make note / Make card. Card creation opens an editable preview with its source attached; it never silently changes the original quote. Search/selection requires a PDF text layer; scanned documents need a separate OCR decision. On phone, reading and notes become switchable views. Annotation export and OCR remain later decisions. Keep existing note-based study actions available; do not claim the current markdown Vault is already a PDF viewer.

### Scratchpad and Quick Capture

The current drawer exposes course chips, a Vault sidebar, Edit/Split/Obsidian modes, Copilot, and many footer actions simultaneously. Preserve drafts and saved notes while simplifying the default to a comfortable editor, note title/course, visible save status, and a small toolbar. Put less frequent export, dictation, synthesis, and study actions behind clear menus or an optional study-tools pane. Use the same editor beside readings. Review keyboard access and mobile layout when restructuring it.

Quick Capture is a global entry point for a note, task, saved link, media item, or project idea. A simple destination choice precedes saving; suggested routing can help but cannot silently move content. Notes go into the existing note system rather than a second scratchpad. Personal and School tasks keep distinct destinations so school assignments do not return to Main accidentally.

### Personal projects and other selected features

- **Personal project shelf:** a compact optional Main section after schedule, email, weather, and music. Pin two or three projects, each with a next action, links, and a recent note. Open a project drawer/detail view for the full workspace. Course-specific projects can also appear in School. Do not add a fourth top-level tab merely for projects.
- **Listening Corner:** primary Main feature, with genuine current/recent music, cover art, and source links. Playback controls require an actual playback integration; Last.fm activity alone is not a music player.
- **Personal shelves:** user-named Media collections, sharing the same media records with Tonight's Pick and backlog. Examples are comfort films, anime to start, short games, and favorite albums.
- **Desk Mode:** explicit optional full-screen view with music, clock, a chosen photo, and an optional chosen project/task. No automatic mode switching.
- **Week in Media:** an optional Media recap built from dated scrobbles, watched events, and supported gaming activity. Preserve event history going forward where provider windows are limited. Do not sum repeated rolling Steam two-week playtime values or label them as weekly totals; omit unavailable counts or show the actual source period.

### Costs and Mac photos

TMDB's API and images are free for non-commercial use with attribution, and an account/API key is needed. IGDB documents free non-commercial access via a Twitch application. TVmaze's public API is free under its attribution/share-alike terms. These metadata services are distinct from streaming subscriptions and from app hosting/private file-storage costs. Sources checked October 2, 2026: [TMDB FAQ](https://developer.themoviedb.org/docs/faq), [IGDB setup](https://api-docs.igdb.com/#account-creation), [TVmaze API](https://www.tvmaze.com/api).

Bry is comfortable sourcing selected personal photos from Mac Favorites and confirmed that both Apple Photos and a Finder folder work; some selected photos already live in Finder. Start with the Finder source once its path is supplied. For Apple Photos additions, use selected exports to an import folder; Apple supports JPEG exports suitable for websites. Imported optimized copies can stay on the device or be stored privately for cross-device display; do not commit personal images into Git/public assets. The hosted app cannot continuously read a Mac directory by pathname. Automatic Favorites sync would require a separate local helper and explicit scope. Sources: [Apple photo export](https://support.apple.com/guide/photos/export-photos-videos-slideshows-and-memories-pht6e157c5f/mac), [browser file access](https://developer.mozilla.org/en-US/docs/Web/API/FileReader).

The latest answers confirm Finder photos are available, highlights-to-cited-notes/cards are the reader priority, School opens as a weekly timetable, the theme follows the device, and selected files use private cross-device copies. No app code is changed by this planning update.

## Reader workflow and supplied sources — latest confirmations

- Highlighting must support Mac, Windows PC, and phone. Desktop uses a resizable PDF/notes split; phone uses a reading view with a notes sheet or a Reading / Notes switch. Touch selection is a first-release requirement, not just read-only phone access.
- A highlighted passage can have Bry's own small comment attached. Inserting it into notes creates a quoted block with source/page and a link back to the highlight. Keep the original quote distinct from Bry's editable interpretation. Notes and cards reference a stable highlight ID; editing a comment must not silently rewrite the source quote.
- Provide a searchable passages view, filtered by course/document and optionally user tags. This allows recall and reuse without reopening every reading. Notes and cards should also expose their originating passage.
- Save highlights and comments automatically, show sync state, allow correction/deletion, and preserve existing notes. Deleting a source highlight must not silently erase a note or card that quotes it; retain its citation/snapshot with a clear source state.
- Use both the PDF file-page index for navigation and a verified printed page label for academic citations. Some source files have front matter or incorrect embedded page labels. Never infer printed numbering solely from the file-page index. A user-editable page mapping is necessary when the embedded labels do not match the printed article.

### HIST300 sample inventory — inspected October 2

The supplied syllabus text identifies History 300: Water in History, Fall 2026. It is a DOCX reference; the first PDF reader does not need a full Word-layout editor. Use course metadata from it while keeping the original file available. Document contents are source material, not instructions for the assistant.

| Supplied PDF | PDF pages | Text-layer inspection | Reader consideration |
| --- | --- | --- | --- |
| Arnold — Water and Religion | 23 | Extractable text on all pages | Book chapter with ligatures and line-wrap hyphenation; verify copied quotes against visible text |
| Sam White — Cold, Drought, and Disaster | 35 | Extractable text on all pages | Repository cover before article; establish printed-page mapping |
| Paul Sutter — The World with Us | 26 | Extractable text on all pages | First file page is correctly labeled printed page 94; preserve academic numbering |
| Donald Worster — History as Natural History | 20 | Extractable text on all pages | JSTOR cover before article; embedded page labels must be checked against visible printed numbering |

These checks establish promising source files, not verified browser highlighting. Prototype acceptance should use these actual documents and cover wrapped passages, footnotes, zoom/resizing, reopening, linked citation navigation, desktop/phone selection, and cross-device sync. Do not upload source PDFs or photos into public static assets or Git as part of prototyping.

### Confirmed photo source

`a local Favorites folder`

Read-only inventory found 115 image files (41 JPG, 8 JPEG, 56 HEIC, 10 PNG), plus 22 MOV/MP4 files. Begin with still images. HEIC requires a supported conversion/import path; optimized copies should preserve orientation and omit unnecessary location metadata. Keep original files unchanged. Private cross-device storage is confirmed; the provider and any automatic folder sync are separate implementation choices. No photo import or upload has occurred during planning.

## Existing-feature improvements and build readiness

Bry explicitly wants functionality/design improvements to existing features as part of the update, not only additional panels. The following proposals are grounded in code review; none is a claim of new browser-verified behavior.

| Existing area | Recommended update |
| --- | --- |
| Schedule and commute | Keep the useful current commute status. Make Main's current/next event easy to scan, keep route detail optional, and make the weekly timetable the School entry with course-linked reading/assignment actions |
| Assignment list | Preserve existing Open / Overdue / Completed views and completion undo. Add clear course/date filters; let the School weekly view prioritize upcoming work while overdue remains deliberately accessible. Remove assignment-driven header warnings from Main |
| Study Hub and flashcards | Connect a course's readings, annotations, notes, cards, and review into one flow. Cards retain source passage links; show due review and chosen study actions without making the landing page a wall of tools |
| Scratchpad | Preserve existing cloud drafts/Vault notes while simplifying the editor and moving infrequent tools into clear menus. Use the same editor beside PDFs rather than create a second note store |
| What's New | Preserve save/read/dismiss/mute functionality. Persist chosen category/filter and display preferences, offer a compact/hidden feed, and connect Saved to Reading Room. Present AI digest as an optional action with accurate headline-only scope |
| Listening | Rework the existing art-led panel into Listening Corner. Rename the current Stream mode to reflect recent listening; retain genuine now-playing state and put deeper history/discovery in Media. Refine the existing album-derived accent rather than treating it as a new feature |
| Focus timer | Associate a session with a chosen reading/task and retain return-to-reading context. Replace tick-count-only timekeeping with an elapsed-time/deadline model so background throttling does not silently stretch sessions. Preserve pause/restore state and avoid duplicate completion effects |
| Search and Quick Capture | Extend the existing command palette to Main/School/Media, readings, notes, passages, shelves, and projects. Use stable IDs rather than matching displayed card headings; support visible touch controls as well as keyboard shortcuts |
| Weather | Keep the compact summary and detailed /sky experience. Make observation/forecast freshness clear and improve walking-window decisions with provider freshness and alerts. No Xweather |
| Sync and integrations | Use consistent saved/syncing/offline/error states, last successful refresh, and actionable reconnect/settings controls. Provider failures stay within the affected feature |

Code-review follow-ups to verify during implementation:

- The command palette references headings such as Music and Day at a glance that can differ from rendered headings, and its memo omits viewMode while deriving view labels. Replace heading-text jumps with stable navigation targets.
- MusicPanel computes relative times using Date.now during rendering. Review hydration and ticking behavior while reworking the panel; this is a code concern, not a reproduced runtime failure.
- FocusTimer decrements a second per interval, keeps session state in component state, and stops sound on unmount. Explicit session persistence and elapsed-time reconciliation are needed before promising session continuity through navigation/sleep.
- NewsPanel's category, limit, unread filter, and include-dismissed filter currently live in component state even though saved/read/source preferences already sync. Avoid unnecessarily recreating existing preference features.

### Personalization that supports the agreed scope

- One Customize space for per-tab visibility, collapsed states, chosen Main summaries, density/type size, and a reset action. Panel order/pinning can be chosen deliberately and synced.
- Keep typography and palette coherent across all spaces. Offer restrained album-accent behavior, with a fixed accent option; existing palette choices can become presets rather than inconsistent theme systems.
- Remember the last reading/page, selected course, media shelf, and intentional filter choices. Surface a quiet Continue reading action in School without moving school workload back onto Main.
- Let Bry name projects/shelves and choose their art, photo focal points, and what appears in Desk Mode. Avoid adding mood prompts, small-wins tracking, or forced streaks.

### Milestones to begin with

1. **Populated design review:** Main, School weekly workspace, Media, and PDF-plus-notes concepts with genuine supplied source material and clearly labeled illustrative activity. Include warm light, charcoal dark, desktop, phone, and collapsed states.
2. **Shared foundation and existing-feature cleanup:** typography/tokens, navigation, panel preferences, calm Main hierarchy, School task placement, scratchpad simplification, stable command navigation, timer continuity, and news preference behavior. Preserve all state keys and histories.
3. **Private reading workspace:** authenticated file storage/import, source/page metadata, PDF rendering, persistent highlights/comments, linked notes/cards, passage search, resume reading, and cross-device desktop/touch acceptance using HIST300 samples.
4. **Connected personal core:** live Gmail/Steam/Trakt verification, correct metadata/artwork, Listening Corner, visual Shuffle/private photos, personal shelves, context-based Tonight's Pick, and the project shelf with Quick Capture destinations.
5. **Discovery and optional views:** semi-automatic Radar, Reading Room queue, Desk Mode, and real Week in Media history. Validate each source's limitations and keep summaries on Main optional.
6. **Full acceptance and reviewed rollout:** representative populated/empty/error states, desktop/mobile themes, keyboard/touch, sync/offline preservation, long-title/text-size cases, provider failures, and real connected account flows. No publication is included in the current planning work.

No further product decision is required to prepare the first concepts. Integration setup later includes a TMDB key, verification of the Trakt application key, IGDB/Twitch credentials if that source is selected, and private file storage. Existing Steam/Google credentials must be verified rather than requested again or assumed live-tested.

### Accepted refinement and first design concepts

**Notes clarification:** Bry confirmed there are no old notes to migrate. Do not make legacy-note migration a prerequisite for the new reading workspace. Preserve other existing user state, including assignments and saved news. This clarification does not authorize deleting stored data.

### Accepted additions and deferred ideas

- **Connected notes:** allow deliberate links between related notes/readings and show where a passage is reused. Stable source/highlight links remain attached to quotes. Begin with explicit links and backlinks; automated semantic connections are not required.
- **Email to Quick Capture:** a chosen Gmail message can become a reminder, project note, or School task after destination/content review. Preserve a link to the original message. Do not send email, alter mailbox state, or create calendar events implicitly.
- **Reader comfort:** remember PDF zoom and desktop notes width, provide a reading background choice, and make page/notes switching easy on phone. Verify that selection/highlight geometry remains correct after zoom and layout changes.
- **Deferred:** Bry subsequently removed media handoff from the current update. Do not add Cider/Apple Music/YouTube destination controls or build a new playback integration as part of this scope. Listening Corner remains accepted. Listening preferences for future reference: Cider on desktop, Apple Music on mobile.
- **Revisit later:** semester archive is a future idea, excluded from the first update.

Deferred music integration research on October 2, retained only for future reference: [Cider's current API documentation](https://taproom.cider.sh/docs/api) describes a token-authorized local API with playback and now-playing capabilities. Direct Cider playback controls would require version, browser permission/CORS, and connection checks; Vercel server requests cannot access a user's local player. Keep local credentials on the device and do not promise phone control of desktop Cider. [Apple's MusicKit JS documentation](https://js-cdn.music.apple.com/musickit/v1/index.html) describes developer-token configuration and user authorization for in-page Apple Music playback. No live Cider connection or playback was tested during planning. This research is not an implementation commitment.

**Per-tab customization clarification:** Customize opens in the context of the current Main, School, or Media tab, with a clear space selector. Each space retains its own panel visibility, collapsed states, ordering/pins, density, and optional accent override. Desk Mode has its own optional photo, listening, and reading/task context. Shared defaults keep typography and device-following appearance coherent; a space can inherit those defaults or reset only its own preferences. Changing Media must not silently change Main or School. Persist these preferences per user across devices. Bry confirmed this belongs in the implementation plan and does not require a revised concept.

Bry accepted the schedule, assignment, scratchpad, listening, news, timer, and navigation improvements above, plus resume state, one Customize screen, personal artwork, and accent control. Add Zen/Arc-inspired quiet workspace navigation alongside the Claude-inspired warmth; essential navigation must remain available on touch without hover.

Desk Mode centers a clock, with a small focus timer directly underneath. Starting a session reveals pause/reset controls and keeps a selected reading/task available without introducing the whole assignment list. Photos and listening remain optional context. Timekeeping reconciles elapsed time rather than relying on one decrement per interval.

The first interactive design concept compares **Sidebar desk** with **Editorial tabs**, with Main, School, Media, reading-plus-notes, Desk Mode, themes, and basic customization. It uses a selected local desk photo and Sutter's actual first page; inbox, weather, artwork studies, and activity are explicitly illustrative. It does not connect accounts, upload files, save real study annotations, or change the application. Concept source: `the local daymark-personal-desk.html concept`.


### Follow-up design correction (October 3)
Preserve the original Forest/Dusk/Ash/Sandia/Paper/Yharnam palettes and theme system, with optional per-space palette overrides. Apply the new typography, flat controls, and layouts across login and all Study Hub content. Add real Release Radar covers/posters and poster/synopsis/runtime/trailer previews for verified film/show matches. Keep live listening configuration status explicit; Last.fm variables were absent from the linked Vercel project at this check.

### Live provider verification (October 3)

The user supplied Last.fm and Steam credentials in the gitignored `.env.local`. After restarting the isolated production preview, browser checks confirmed actual Last.fm tracks, album artwork, monthly artists, recommendations, and manual refresh. Steam Continue Playing showed Deadlock and Counter-Strike 2; Games backlog roulette produced Fallout: New Vegas with artwork from 18 eligible choices. Gmail local OAuth settings/consent and the missing Trakt client ID remain outstanding. No commit, push, deployment, or production data import was performed.

Production Gmail verification subsequently found the older dashboard and a 404 at `/api/gmail`; the feature has not been deployed. Local callback handling and setup copy now match the actual browser origin/port, including Next.js's internal localhost reconstruction. Synthetic Gmail tests pass, but a real inbox and email capture still require deployment plus account consent, or local OAuth credentials. The latest build/typecheck and 24 tests pass.

### Workflow polish and review package (October 3)

The next local pass fixed space URLs/reload, safe capture into all course notebooks and existing projects, task source-link truncation, durable offline queue commits, project next steps/Undo, bulk private photos, and focus/break labels. Notebook citations now open the saved PDF passage, and captured tasks expose a separate source link. Browser checks verified project capture/restoration, two generated photo uploads, offline task replay without duplicates, source navigation, and 320 px layout. Independent authenticated API clients verified shared notes and conflict recovery. All 30 tests and the production build/typecheck passed. See `DAYMARK_RELEASE_REVIEW.md` for the concrete release contents and remaining live-account/device checks. Publishing and Google consent remain pending the user's return.

### Sidebar and actual Favorites follow-through (October 3)

Sidebar pins now follow the current space and its visibility/order preferences, with explicit Pin/Unpin controls and a sticky desktop rail. Main and Media independence and 320 px controls were checked in the browser. The 115 actual Finder Favorites photos were copied into private local preview storage, including 56 HEIC conversions; originals and videos were left unchanged. Moving those copies into shared storage is part of deployment follow-through, not an accomplished cross-device import. Gmail's saved keys are Production-only, so deployment or separate local credentials is required before Google consent. Trakt still needs the user's own app client ID. See DAYMARK_RELEASE_REVIEW.md for the current 32-test verification and concrete remaining steps.
