# Daymark codebase review

Reviewed October 10, 2026, starting from GitHub commit `05218ac`. Changes are isolated in the `codex/daymark-review` branch at `/home/bry/Projects/daymark-review`. The original checkout's unfinished study updates remain untouched.

## Overall assessment

Daymark is already a capable personal workspace: Main brings together the day, Gmail, weather, listening, workouts and personal projects; School connects the timetable, assignments, flashcards and course readings; Media holds listening, discovery, releases and news. A notebook and focus mode connect these spaces.

The strongest direction is to make those existing tools work together. The main page should answer “what needs me next?” and provide a comfortable place to start. The forest palette, serif headings and quiet atmosphere are worth keeping.

## Architecture

| Area | Implementation | Assessment |
| --- | --- | --- |
| Interface | Next.js App Router, React, CSS, native SVG/canvas | A suitable stack for this app; no framework rewrite needed. |
| Data loading | Independent weather, Canvas, music and study promises with Suspense | Keeps the schedule available while slower sources load. |
| Shared state | libSQL/Turso: tasks, ticks, settings, integrations, files | Existing database persistence is useful and relatively simple. |
| Offline edits | IndexedDB task outbox; separate record sync for notebook, projects and preferences | Good foundations, but the two paths need consistent save behavior. |
| Weather | National Weather Service forecasts and observations; locally computed sun/moon | Good underlying data and visuals; the compact card needed better presentation. |
| Authentication | Single passphrase and signed, HTTP-only cookie | Appropriate single-user scope. Add actual attempt throttling before broadening access. |
| Study tools | CSV decks, course metadata, practice tools and optional AI providers | Source freshness and traceability matter more than adding more generated material. |
| Verification | Existing tests and GitHub checks | Useful baseline: all 61 original tests passed. |

## Bugs reproduced and repaired

1. **Main ignored actual deadlines.** The greeting summary passed an empty task list into its decision function. It now streams real Canvas assignments and saved tasks, distinguishes a failed feed from an empty workload, and updates after task changes.
2. **New saves bypassed older queued edits.** With one task POST failing and the next succeeding, the first task disappeared from the visible list while still sitting in IndexedDB. All task changes now enter the durable queue first; queued changes are projected over acknowledged server snapshots. A browser reproduction confirmed both tasks subsequently reached the database in order and remained visible.
3. **UTC deadlines could land on the wrong day.** `20261010T055900Z` was displayed as October 10 although it is October 9 at 11:59 pm in Albuquerque. UTC and named-zone dates now convert to Denver dates. Existing assignment IDs retain the original feed-date encoding, preserving ticks, dismissals and reading links.
4. **The login route crashed on JSON `null`.** Browser request: HTTP 500 before, HTTP 401 after. Non-object payloads now follow the ordinary rejection path.
5. **Hidden panels left empty overview columns.** Hidden cards are removed before column allocation. Visible cards redistribute without erasing saved preferences.
6. **Mobile order diverged from customization order.** The two desktop columns flattened column-by-column. Explicit display order now restores the selected visual order on mobile.
7. **Mobile overview created implicit grid columns.** Its twelve-column span remained active inside the one-column mobile grid, squeezing lower panels. The overview now spans the actual grid and direct mobile panels fill the available width.
8. **Email previews exposed HTML entities.** Gmail snippets such as `I&#39;m` now render as ordinary text. Sender display names are cleaner. This decoding never inserts HTML.
9. **Canvas and task replay could wait indefinitely.** Canvas requests now have a ten-second deadline; replay requests have a fifteen-second deadline and remain safely queued after a timeout.

## Main-page changes

The greeting now anchors a distinct daily brief, with direct Focus, Tasks and Notebook actions. Cards have clearer boundaries, the inbox initially shows two messages per account, and unread messages have a small visual marker. The existing palettes, density choices, panel hiding, pins and ordering remain available.

## Weather upgrade

Main now has a larger temperature over a procedural day/night sky, clear conditions and high/low readings, an eight-hour strip with condition icons and precipitation probabilities, a wind compass, a relative-humidity gauge and sun times. The full `/sky` page has larger sans-serif readings, selectable 24/48-hour forecasts, weekly temperature bars, wind, humidity and precipitation cards, and the existing astronomy tools.

Weather data stays explicit: observations older than 90 minutes fall back to a labeled forecast; expired hours do not enter the rain summary; unavailable precipitation is shown as unknown rather than 0%. A clear station observation now prevents forecast rain from falling on the current sky. Precipitation summaries distinguish rain, snow and thunderstorms. Both screens retain reduced-motion behavior.

Local visual examples are saved under `docs/screenshots/` (ignored by Git). Weather design previews use invented sample readings; the main-page checks use real NWS data with fixture Gmail and Canvas data.

## Recommended next changes

| Priority | Change | Why it helps |
| --- | --- | --- |
| 1 | Pin one “next thing” and pass it into the focus timer | Connects the daily brief, tasks and focus mode into a single useful action. |
| 1 | Show academic content freshness beside course summaries | The current course file still identifies Week 5 and September 25 while the calendar has advanced. Distinguish imported material from current-week material. |
| 1 | Consolidate save status and recovery | Tasks, notebook and preferences currently use different persistence paths. A shared “saved here / syncing / saved across devices” vocabulary would make failures easier to understand. |
| 2 | Add named layout presets | “Campus,” “At home,” and “Evening” can reuse existing customization instead of requiring manual rearrangement. |
| 2 | Track applications and follow-ups | Gmail capture and project next steps are already present. Add a due date and status for transfer questions, internships and personal admin. |
| 2 | Resume the latest reading or notebook entry | Useful continuity across devices; show one recent entry rather than another large list. |
| 2 | Add a compact weekly workload view | Combine assignments, readings and classes into a realistic weekly picture. Keep grade assumptions editable and clearly labeled. |
| 3 | Improve integration health | Show last successful refresh, stale status and reconnect actions separately for Canvas, Gmail and music. Avoid surfacing raw technical errors in the everyday page. |

## Personalization direction

Keep Forest as the familiar default. Paper is a good reading-oriented preset; Dusk offers a different evening atmosphere. Let Brayan explicitly choose a layout for a campus day or a quiet evening. Useful preferences include greeting name, default space, visible modules, workout window, preferred focus length and whether weather animation is enabled.

Make the dashboard feel personal through his next project step, current reading and recent music. Generic motivational copy would add less value.

## Code maintenance

- Split Dashboard into navigation/customization, task persistence, daily briefing and space composition. It was over 1,000 lines before this review.
- Move component styles into narrower files as those components change. `globals.css` is over 7,500 lines, with another 1,500+ in the desk stylesheet; late overrides make mobile regressions easy to introduce.
- Resolve the six existing lint warnings, particularly stale hook dependencies in the flashcard controls, evidence bank, audio deck and quick-study modal.
- Refresh README and historical design notes: some still describe seven courses, the old dashboard layout and a `/weather` route that is now `/sky`.
- Keep assignment identity stable. Calendar corrections in this branch deliberately retain legacy IDs; future changes need the same care.

## Dependency review

Next.js was patched to 15.5.27, Sharp to 0.35.5, and the resolved source-map-js to 1.2.2. The production-only dependency audit reports zero known vulnerabilities. The complete audit still has five findings in the development linting dependency chain, rooted in braces 3.0.3. No patched braces release was available from the registry during this review; forcing the suggested framework-config downgrade is not an appropriate fix.

The [Next.js advisory](https://github.com/advisories/GHSA-4jqv-mc3x-m676) explicitly excludes Vercel deployments from that cache-poisoning issue. The [Sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) identifies 0.35.5 as the patched release. These updates are maintenance, not evidence that the deployed app was compromised.

## Validation and limits

The original 61 tests passed. Sixteen additional regression tests cover truthful daily briefs, safe Gmail display, request deadlines, queued-state projection, calendar-day conversion, weather freshness, missing readings, compass bearings and sky conditions. All 77 tests, type checking and the final production build pass. Linting reports six existing warnings and no errors. The production dependency audit reports zero known vulnerabilities.

Browser checks used temporary local credentials and SQLite databases. Gmail previews used invented fixture messages; Canvas used a local calendar fixture. Actual UI-to-task-API-to-database behavior was tested, including a failed write followed by a successful replay; both tasks remained visible. Gmail display/more/dismiss/undo and panel hiding/reset passed. Mobile checks confirmed full-width cards, saved visual order and no page overflow. Weather browser scenarios covered day, night, storms, stale observations, missing measurements and unavailable data, with reduced motion, hourly selection, 24/48-hour controls and light/dark layouts. Production checks also exercised Notebook opening, Focus start/pause/return, live NWS hourly selection, the 48-hour forecast and individual weather-card widths at 320 pixels. Temporary preview routes were removed before the final build. Live OAuth account access, AI provider calls, push delivery and deployed cloud state were not tested or changed.
