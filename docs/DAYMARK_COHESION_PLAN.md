# Daymark cohesion pass — October 7, 2026

Planning and live/source audit only. These changes have not been implemented or deployed. The previous timer release remains live. The user wants a calmer, more uniform dashboard and likes the current greeting/brand serif and JetBrains details. Media's overall layout is accepted.

## Verified findings

- Live Main uses the saved Yharnam palette; School and Media use Forest. This accounts for the observed change between these spaces on the checked browser. The root/shared palette and individual space palette remain separate. First-paint consistency across reloads/subroutes still needs targeted verification.
- The heading/brand family is Source Serif 4; the everyday text is Source Sans 3; metadata uses JetBrains Mono. Legacy component styling and differing sizes/weights still create a mixed appearance. The user dislikes the plain everyday text, so merely standardizing the current sans font would not fully address the request.
- At a 1280px viewport, Main's schedule/inbox widths were 584/413px and heights 674/1230px. Weather/listening reverse those width proportions. A long expanded inbox dictates the grid row's height and leaves empty space beside shorter content.
- Readings is an early, expanded School panel, before Study Hub and assignments. The live School timetable is currently collapsed by a saved preference. Workout remains in School despite Day at a glance already including a flexible workout/rest plan.
- What's new can collapse through the panel's ellipsis menu. The control is outside the content/header and the long opened feed has no obvious nearby collapse control. Browse stories is a separate disclosure for filters, not the feed itself.
- Apple's US album API returned zero results for the current FKA twigs / EUSEXUA Afterglow search, including a separate title search. This proves failure for that item, not the entire Rediscover catalog. The graphic is a fallback rather than official cover art. A read-only request using the existing server-side Last.fm key returned the exact artist/album identity and nonempty cover images; adding that provider fallback is a verified practical path, but is not yet implemented.
- Cinemeta returned three exact-name Euphoria series and two exact-name The Boys series, all with posters. The current matcher correctly refuses ambiguous title-only matches. Trakt's mapped records discard show identifiers and release year, so previews lose the information needed to select the right show.

## Accepted changes from the user's request

- Preserve the greeting/brand serif and JetBrains; replace the generic-feeling everyday typography and establish consistent sizes, weights, and spacing.
- Sidebar contains text-only navigation, consistent typography/spacing/active states, and no profile name. Remove decorative icons, including the circular brand glyph and Desk moon. Dashboard and study subpages should use one shared sidebar component.
- School leads with timetable and useful assignments/review. Move the reading library near the bottom, collapsed by default, with expandable course groups. A course/timetable shortcut opens that course's readings directly. Keep the reader itself accessible and preserve resume, highlights, comments, notes, and cards.
- Move the dedicated workout panel to Main. Keep the brief flexible workout plan inside Day at a glance; offer details through the separate compact workout panel.
- Keep the Media carousel/shelves direction and repair missing metadata/artwork.
- Give every panel an obvious Expand/Collapse action at its title. Use the ellipsis only for less frequent actions such as Hide, pin, and rearrange. Long feeds also need a Show less action near the end.

## Proposed layout and visual system

Main uses equal-width columns on desktop, with compact previews and independent stacking so one long panel does not create a large empty gap next to another. Schedule and inbox remain first; weather and listening follow. Workout/projects are secondary. News and radar begin as compact/collapsed previews. Phone order must still follow the user's priorities. Do not force every card to the same fixed height or hide essential information inside internal scroll boxes.

Limit inbox overview to three concise messages, with sender, subject, a short preview, and existing source/capture/dismiss actions. Full account lists and connection management are secondary. Day at a glance shows compact class entries, the next commute, and a clearly flexible workout plan; weekly detail remains available in School. Listening on Main shows album artwork/current or recent listening and a short list; richer artist/recommendation content belongs in Media.

Use one spacing scale, shared card header/body/footer spacing, one control/button family, restrained metadata, and fewer stacked borders/badges. Keep the current six palette colors. Use serif titles and comfortable reading text; JetBrains handles short times/course labels and potentially consistent navigation. The user confirmed more of the same warm serif for titles and reading text, and one shared palette across Main/School/Media while panel layouts remain independent. Keep Source Serif 4 for content and JetBrains Mono for concise controls/metadata. The shared palette remains selectable from all six existing options.

## Functionality polish

Artwork: Last.fm album.getInfo documentation (https://www.last.fm/api/show/album.getInfo) confirms album lookup by artist/title or MusicBrainz ID and cover images in the response. Retain canonical album identities and verified aliases; resolve covers through the existing Apple catalog and authenticated server-side Last.fm album metadata before falling back. Cache successful identities/artwork; distinguish temporary provider failures from an unmatched album. Provide retry or manual correction when useful. Do not attach a vaguely similar album's cover.

Trakt: retain IMDb/TMDB/Trakt IDs and year in the show model; resolve metadata by canonical ID when available, with year-disambiguated title lookup as a fallback. Keep history useful when preview metadata fails. These remain last-watched episodes, not resume timestamps. Show meaningful unavailable states rather than an unexplained blank poster.

News: visible collapse plus Show less, a small source-diverse Main selection, duplicate-story reduction, Saved/read/dismiss controls in Media, and predictable empty/loading states. AI digest remains optional.

Radar: clear upcoming/out-now presentation, artwork, explicit artist/show follows, stale/partial status, reversible hide/snooze, and edition/source/date meaning. Regular background refresh of confirmed follows remains unfinished and should be implemented separately from layout changes, with existing provider limits and credentials respected. Automatic film/game release providers are optional extensions, not promised current coverage.

Theme: use one shared palette and appearance across tabs/subpages, retain independent panel layouts, and apply saved preferences before painting a route. Safely retire the application of per-space palette overrides while preserving saved preference data. Never reset palette merely because a panel fetch finishes or a subpage opens. Keep panel customization per space regardless of the color-palette choice. Do not silently erase the user's saved customization.

## Earlier work and remaining gaps

Already implemented: first Gmail connection and Daymark-only dismiss/restore; email Quick Capture; Steam/Trakt history; private Favorites copies; Media carousel and shelves; project shelf with next steps; Notebook; PDF highlights/comments/source-linked notes/card drafts; reading resume; reader comfort; and the shared custom Zen timer.

Still useful to finish:

1. Confirmed for this update: scheduled radar checks rather than open/Refresh-only updates. Check confirmed follows regularly server-side, retain manual Refresh and visible last-successful-check/partial status; cadence remains an implementation choice.
2. Confirmed for this update: exact reading-to-week/assignment links using confirmed syllabus dates or manual assignment. Timetable/week/assignment entries open the associated PDF and course notes. Imported course labels alone cannot establish this week's reading.
3. Deferred by the user: a unified Resume shortcut. Preserve existing reading/timer resume behavior; do not add a combined dashboard entry in this update.
4. Under discussion: connected-note navigation. Existing PDF citation/source links remain. Proposed small, collapsible Linked material area in a note shows referenced PDF passages, explicitly linked notes, and cards created from the note, with reverse links where recorded. Clicking a passage opens its saved page/highlight. Connections come from actual saved references or deliberate links; do not invent associations from similar titles.
5. Under discussion: accent control in Customize. Keep the selected global palette as the base and optionally choose one shared accent for active navigation, controls, links, and focus indicators. Default remains the original palette accent; offer a few light/dark-readable presets. Main/School/Media share the accent. No automatic album-driven changes. Backgrounds, text, and card surfaces retain the palette. This is optional and must not delay core polish.
6. Optional second Gmail account, requiring the user's own Google consent. The first account works and this does not block polish.
7. An unwatched Letterboxd watchlist: the supplied export's watchlist was empty, so current imported movie picks are rewatches. A new watchlist export or manually added backlog supplies the missing data.
8. Physical Mac/PC/phone checks of annotations, offline saves, theme persistence, and resuming. Desktop/narrow-browser checks do not establish actual cross-device completion.

Private photos/PDFs are stored copies, not an automatic Finder/Photos watcher. That is an optional future capability, not required for this pass. Semester archive remains deferred. Xweather, media handoff, mood/small-wins prompts, and Double Feature remain excluded.

## Suggested build order

1. Shared typography/sidebar/theme and visible collapse controls.
2. Main preview/grid cleanup, workout move, and School/course-library organization, with safe preference migration.
3. Rediscover/Trakt identity and artwork reliability.
4. News/radar refinement, regular release checks, reading-to-week/assignment links, and any subsequently accepted connected-note work. Unified Resume is deferred.
5. Verify real populated states, reloads/navigation, all palettes, keyboard/touch-sized controls, provider failures, and desktop/narrow layouts; build then typecheck sequentially and run meaningful regression checks before release.

No production data, saved theme choices, panel preferences, or provider credentials were changed during this planning audit. Navigation was returned to Media; temporary viewport sizing was reset.

## Accepted implementation — October 7

The user authorized the full pass. Shared palette and optional global accent replace per-tab color overrides; per-tab panel density/order/pins/visibility remain. The old course library position migrates to a collapsed lower panel once, while subsequent explicit expansions remain saved. Workout detail belongs to Main. Unified Resume and semester archive remain deferred.

Main uses equal-width independent columns for the schedule/inbox/weather/listening previews. Inbox starts at three emails per account, with More emails/Show less; account management is tucked into a disclosure. Listening on Main keeps a short recent list; artist statistics remain in Media. Panel headings have visible Expand/Collapse alongside the existing menu. The sidebar is shared across dashboard and study pages, text only, without a profile footer. Source Serif 4 carries content and titles; JetBrains Mono carries concise controls and metadata.

Readings can be manually linked to one or more term weeks and exact assignment IDs. These synced mappings produce PDF shortcuts in the weekly timetable and assignment rows. No week or due date is inferred from a filename/course label. The library is grouped by course. Connected notebook material exposes real passage excerpts, source links, explicit note connections, and cards with recorded note/highlight provenance.

Daily radar runs through `/api/cron/radar` at 13:00 UTC, with a protected endpoint and an existing Production CRON_SECRET. Vercel scheduling precision is approximate ([official cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)). The job reads confirmed follows from shared storage, leases a refresh, updates at most twenty sources per run within a bounded execution budget, and preserves snoozes/dismissals/concurrent edits. Duplicate daily invocations skip safely. A failed provider retains saved dates; partial responses never imply removal. Manual refresh and last-successful-check remain available. The scheduler does not send notifications.

Album art falls back from Apple to an exact Last.fm album match. Trakt IDs/year are retained and passed to Cinemeta, avoiding ambiguous same-title search results. Real Euphoria and The Boys returned posters and descriptions during local API verification. FKA twigs artwork resolved from the actual Last.fm image CDN after correcting the host allowlist.
