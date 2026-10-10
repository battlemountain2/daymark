# Daymark polish pass

Original review date: October 4, 2026. The verified October 7 status is below; the remaining sections retain the original proposal and findings. The live dashboard and current source were reviewed. Keep the original palettes, independent space customization, private storage, and existing assignment identifiers.

## Implemented and verified — October 7, 2026

The polish pass is deployed to https://hey-brayan.vercel.app. Original palettes and independent space customization remain available.

- One shared deadline-based timer powers Desk and School shortcuts. Starting brings the Pomodoro forward inside Desk, with dimmed/inert background controls; pause, minimize, reload, manual breaks, custom durations, opt-in sound, and completion history are retained.
- Curated soundtrack covers use verified catalog identities, with a designed fallback. Media leads with an immediately visible, manually controlled carousel and shows Continue playing/watching and personal shelves underneath. Trakt still means last watched episodes, not playback positions.
- School tasks have readable body text, date groups, one status row, and secondary filters. Readings lead with a library/resume item; timetable links retain the course. Eight selected HIST 300 originals were imported privately and byte-verified, including the 9 MB slides. Chunk uploads support PDFs through 25 MB without compression.
- Main includes the actual flexible workout split, with configurable workout/travel buffers on busy class days, and five news stories linked to the full Media feed. Shared panel menus expose collapse/pin/hide, with Undo for hiding. Conflicting home-departure guidance was removed; Commute Radar remains authoritative for the home trip.
- Radar suggests artists/shows from listening/viewing, requires choosing a provider identity before following, groups music editions by release-group ID, retains edition dates, reconciles missing dates only after complete provider responses, and stores check/partial-failure status. Checks happen on view/Refresh, not a background schedule.

Production build then typecheck passed; all 49 regression tests passed. Desktop and 320px browser checks covered timer persistence/manual phases, keyboard focus/Escape, carousel arrows, hidden-panel Undo, course context, reading resume, saved Sutter passages/cited notes/card-draft controls, original palettes, and real provider data. Live checks found one working Gmail account, Last.fm, Steam, Trakt, 115 private Favorites photos and eight private PDFs. The imported PDFs were independently downloaded with authentication and compared by SHA-256; anonymous access returned 401.

Remaining acceptance: actual Mac/PC/phone text selection and cross-device sync, physical touch/swipe, and opt-in audio on physical devices. The second Gmail account requires its own Google consent if wanted. Personal events need a selected source before inclusion; semester archive stays deferred. Favorites remain imported copies, without a Finder watcher. Active countdown is device-local; completion history and reading preferences participate in existing cloud sync. This pass did not create an automatic release-check job.

## What already exists

Main, School, and Media; separate customization; connected notes and Quick Capture; live Last.fm, Steam, and Trakt; Letterboxd imports and media previews; shared Favorites photos; a PDF/highlight/comment/cited-note/card-draft workflow; news controls; semi-automatic release follows; and Desk Mode.

The October 4 snapshot had Gmail consent and course PDF import open; both advanced as recorded above. Physical-device sync and touch-selection acceptance remain open. Trakt supplies viewing history, not a Stremio playback position. Favorites are imported copies, without a Finder watcher.

### Downloads readings selected for the library

The user authorized using history PDFs in Downloads. Opening pages were checked; unrelated resumes, transcript, degree information, and writing-reference files are excluded. These eight files are candidates for HIST 300, without inferred due dates:

- Tvedt — Water and Society, chapter 9: water and climate change (15 pages)
- Farmer — On Zion's Mount, chapter 1 (35 pages)
- Tvedt — Why England and Not China (22 pages)
- What is Environmental History? — UNM HIST 300 slides (27 pages)
- Malm — Fleeing the Flowing Commons (24 pages)
- Cronon — A Place for Stories (31 pages)
- Environmental History: Historiographic Points of Departure — UNM HIST 300 slides (22 pages)
- Sutter — The World with Us (26 pages)

Seven fit the current 3.5 MB upload limit. “What is Environmental History?” is about 9.1 MB and needs a larger-file upload path or a verified optimized copy before import. Preserve the originals, PDF page labels, and text selection. This inventory is not an import record. Earlier supplied course PDFs remain eligible as well; deduplicate by content hash.

Gmail was checked again after the user's confirmation: production credentials are configured, the HTTPS callback matches, and the connection redirects to Google with the read-only scope. At that October 4 review there were zero connected accounts. The first account subsequently connected successfully; a second account still needs separate consent.

## Findings from this review

| Area | Current evidence | Change |
| --- | --- | --- |
| Soundtracks | Cowboy Bebop renders a text-only fallback. Album lookup demands an exact normalized artist and album title. | Give curated soundtracks verified album identities/credits; use actual artwork when available and a designed visual fallback when unavailable. |
| Focus | Live paused Desk timer shows 25:01. Starting against a stale clock tick can add a second; pausing stores it. Three timer implementations have different timing and completion behavior. | One deadline-based timer controller, bounded remaining time, predictable phases, and one shared Focus view. |
| Media | Six mode buttons hide the collection behind a form. Tonight's pick needs a button before showing any choice. | Lead with visible artwork and a featured carousel; show Continue and shelves underneath. |
| Reading | Live collection is empty. The reading desk leads with upload/course-selection controls. Timetable links open a generic reading panel. | Populate and organize the library; lead with a reading to resume and a course-specific reading queue. |
| Tasks | Task titles correctly use Source Sans 3. Dense 11px mono metadata, badges, energy labels, and two filter rows crowd the view. | Readable task rows, simpler filters, larger metadata, and energy classification optional. |
| Main | Day at a glance is class-only and can be nearly empty on weekends. Workout lives on School. | Combine actual classes with a clearly labeled flexible workout plan and optional personal events. |
| Radar | Live Main has no followed sources; manual setup is the only starting point. Music dates refer to editions, deduplicated by title/date. | Suggest confirmed follows from existing history; clarify dates; reconcile provider changes and deduplicate editions. |
| News | Main shows eight stories, nine category buttons, per-story action rows, and filtering controls. | A small curated overview on Main and deeper browsing in Media, with controls available through one menu. |

## Main: a useful day overview

Keep schedule, inbox, weather, and listening first. Keep school tasks on School.

Day at a glance should have timed items for classes/personal events and a separate flexible-plan section for today's workout. The user chose a flexible plan with possible windows on busy school days. Suggest gaps around classes using the preferred workout length and travel/change buffers; explain assumptions when these are unset, and do not treat a suggestion as a booked appointment. Do not invent a workout appointment from the existing split. A short next action opens its actual destination: class brief, workout plan, or selected event. Commute belongs to the next campus class, with a compact quiet state when no trip is needed.

Place a small Resume item where useful: active focus session, recent reading, note, or project. It opens the same saved state rather than starting another session. An empty project shelf can stay compact until populated.

Show at most three to five stories and a small number of upcoming releases. The full views remain accessible. Respect each space's visibility and ordering settings.

## Media: browse instead of switching forms

Use a featured Tonight's pick carousel with one large artwork card and a visible portion of the next card. Support arrows, swipe, keyboard navigation, stable focus, and an item count. No automatic rotation.

Cards show artwork, title, a few useful facts, and a primary action. Filters sit in a compact control/drawer. Show a first eligible pick immediately. Explain why it fits only when supported by actual runtime, session-length tags, shelf membership, or rewatch status. Never imply that inferred taste is a measured fact.

Below it, show Continue watching/playing and personal shelves as artwork rows. Film/show/game/album type controls filter cards instead of replacing the whole workspace. Backlog roulette is an action on the collection. Week in Media is a small history recap, with deeper detail on demand.

Keep Daily Shuffle for rediscover, soundtracks, and photos. Use a consistent artwork frame and restrained title/artist typography. Curated soundtrack identities can include approved title/artist aliases or verified provider IDs, but must not relax matching into unrelated covers. Missing covers get a deliberate graphic, without pretending it is official artwork.

## Radar and news: related design, distinct purposes

Release Radar answers “What is coming from things I follow?” What's new answers “What is worth reading?” Share card spacing, artwork treatment, and save/dismiss menus; keep dates and stories distinct.

Radar:

- Suggest artists/shows from Last.fm and Trakt history, then require choosing the correct provider identity before following. History alone does not silently enroll every artist/show.
- Default to Upcoming, then a short Out now window. Hide/snooze remains reversible. Main summarizes; Media gives full artwork browsing.
- Store last successful check and show stale or partial results honestly. Current refresh occurs on opening/refreshing the view; background checks are a separate implementation task.
- Deduplicate music editions by release group where appropriate, while preserving source/date meaning. Do not call an edition date an announcement or a globally confirmed first release.
- Reconcile changed/canceled dates rather than continually appending old records. Keep manual dates clearly identified.
- Keep follow management out of the primary browsing area. Games and other manually entered releases remain supported; additional automatic providers need separate validation.

News:

- Main gets a small source-diverse selection with compact source/date metadata. Media gets the deeper feed, topic selection, Saved, and queued audio.
- Keep read/save/dismiss behavior, expose secondary actions in one accessible menu, and add Undo for bulk actions.
- Keep source preferences separate from daily browsing. Reduce repetitive stories before adding more feeds.
- The AI digest remains an explicit action. Do not label it as an automatic daily briefing or imply it has read the user's Gmail.

## School: week → reading or task → notes → review

Open on the weekly timetable and near-term work. Upcoming assignments should be grouped by useful date ranges; distant semester tasks belong behind an expansion. Preserve the ability to see all and undo completion.

Replace the upload-first reading panel with “Readings”: Resume reading, course-specific rows, and a useful empty state. Show document title, course, saved page, and available notes. Mark a reading “This week” only through a user-set or syllabus-verified schedule; a course label alone is insufficient.

Open the PDF alongside notes in a dedicated reading workspace. Keep highlights, comments, citations, card drafts, reader comfort, and exact passage links. Upload/library management is secondary. Timetable reading links should retain course context.

Tasks use the body font for titles and controls, restrained mono for short course/time labels, and readable supporting text. Course labels should not crowd the title on phones. Consolidate status filters; move heuristic energy filters into optional settings and remove per-row energy noise from the default view. Group dates instead of repeating a large countdown on every distant assignment. Fix the “all” empty state so it does not incorrectly describe a Low Energy filter.

## Desk: foreground the timer when it starts

Desk remains the existing calm clock/photo view with a compact timer. The user clarified that starting the timer should bring a stylized Pomodoro timer into the foreground of this same Desk, dimming the clock, photo, navigation, and secondary controls behind it. This is an in-place focus presentation, not a separate destination replacing Desk. The timer, chosen task/reading, phase progress, and pause/reset stay legible above the dimmed background. A quiet “Back to desk” action reduces it to the compact timer without canceling the session. Pausing keeps the foreground presentation available. Honor reduced motion; do not darken the timer itself or trap the user behind a running timer. Keyboard focus should enter the foreground controls and return to the compact timer when it closes.

The same session powers Desk, School shortcuts, and the compact running indicator. Starting a focus session from elsewhere opens Desk with that timer foregrounded. Phase completion waits for the user to start the next phase; it does not force a page change or begin another timer.

Default proposal: 25-minute focus, 5-minute break, longer break after four completed focus sessions, with custom durations. The user chose to manually start every next phase. A completed phase offers the next one and leaves it paused until started. Sound is opt-in and reduced motion is respected. A break never counts as study time.

One controller owns deadline calculation, validated persistence, pause/resume, phase transitions, and idempotent completion history. Remaining time is bounded to the configured duration. Refreshing, switching spaces, or backgrounding must not restart a session or count completion twice. Browser wall-clock changes need an explicit reconciliation policy. A write failure should leave controls usable and explain persistence limits.

When focus finishes, offer the next break and an optional note about where to resume; no forced journal or mood prompt. Opening Focus with an assignment or reading supplies context without duplicating the task.

## Cohesive controls and typography

- Preserve all original palette variants and follow-device appearance.
- Use shared heading/body/metadata tokens and shared card/menu/carousel controls. Reserve mono for concise data; supporting text should remain comfortably readable.
- Keep customization per space. Move repeated Hide/Collapse chrome into a consistent panel menu where discoverability remains clear.
- Settings/upload/provider setup should not dominate normal browsing. Empty panels have one useful action and minimal height.
- Use calm artwork framing, consistent spacing, and stable loading/error states. No decorative descriptors or duplicate section titles.
- Maintain visible keyboard focus, labeled controls, adequate touch targets, no page overflow, and reduced-motion behavior.

## Build order and acceptance

1. Fix timer calculation/persistence and task typography/filter problems; verify curated soundtrack artwork and fallback.
2. Unify the timer and build the in-place foreground Pomodoro presentation in Desk. Validate pause/resume, leaving/reopening, reload, completion exactly once, break history, dimmed-background interaction, focus restoration, and storage failures with meaningful logic tests and browser checks.
3. Rebuild Media around visible cards/carousels, preserving collection data, shelves, and provider states. Verify keyboard/swipe browsing and unavailable artwork.
4. Organize/import readings and link School timetable/task context to reader/notes/review. Verify a real passage → note → card → passage flow. Do not publish test fixtures.
5. Upgrade Day at a glance and reduce Main feed clutter; improve radar identities/date reconciliation and news controls.
6. Finish Gmail consent/capture and physical-device acceptance. Verify each palette, independent customization, desktop and narrow layouts, offline saves, and provider failure states.

Run production build then typecheck sequentially, plus relevant existing/regression tests. Check deployed behavior separately from isolated preview behavior. Keep the current working-tree changes and secrets intact.

Semester archive remains deferred. Xweather, media handoff, mood check-ins, small-wins prompts, and Double Feature remain excluded. This pass should connect existing features before introducing additional panels.
