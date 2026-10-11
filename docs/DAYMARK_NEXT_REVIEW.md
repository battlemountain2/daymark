# Daymark: improvements to the current dashboard

Reviewed October 10, 2026, Mountain Time. This is an audit and proposed roadmap; the application has not been changed or deployed in this pass.

## Direction

Daymark already has a substantial set of features. Its next improvement should make everyday actions easier to reach and existing records more useful over time. Prioritize dependable saving, calmer layouts, and connections between the tools the user already uses. Add a feature when it completes a useful workflow rather than simply increasing the number of dashboard panels.

Preserve the forest palette, warm Source Serif typography, concise JetBrains labels, independent desktop columns, and borderless Main cards. The earlier feedback against outlines on every card still applies. Media's accepted overall layout should receive targeted improvements rather than another wholesale redesign.

Main already has a compact Today/Week area: **Day at a glance** includes classes, commute advice, open study blocks, and the flexible workout plan. The greeting also has a daily brief. A second Today panel would duplicate these.

## What is already available

| Area | Existing foundation | Best direction |
| --- | --- | --- |
| Main | Daily brief, Today/Week, commute, weather, inbox capture/dismissal, listening, projects, workout glance | Less repetition; clearer next action; compact quiet-day states |
| Training | Gym/home plans, checked sets, weekly keys, activity records, rest timer, nutrition and form guidance | Actual session logs, weight/reps, useful history, faster phone interaction |
| School | Timetable, tasks, course library, assignment/week-to-reading mappings, review queue | Surface the right linked material and separate source verification from learning progress |
| PDFs | Continuous scrolling, saved page, highlights/comments, source-linked notes and card drafts | Better navigation and a smoother reading-to-writing workflow |
| Notebook | Full-page editing, quick drawer, titles, search, Markdown preview, wiki links/backlinks, export, recoverable deletion | Reliable writing, clearer navigation, richer editor and attachment support in small steps |
| Media | Time/company/shelf filters, carousel, backlog roulette, shelves, listening, watch/play history, weekly activity, news, release follows | Better personal inputs, less empty space, more useful compact previews |
| Focus/projects | Persistent focus timer, history, project notes and next steps, capture | Attach sessions and captured work to actual tasks/projects |
| Personalization | Global palettes/accent/appearance; per-space order, pins, visibility and density | Clear previews, named layouts, readable sizing, personal defaults |

The combined Resume feature and semester archive were previously deferred. Keep them deferred for the next release. Daily Release Radar checks and source-linked course readings are already implemented; they are not new proposals.

## Main: improve Today without adding another panel

The current Saturday view repeats “No class today,” “No classes on Saturdays,” and “No classes on Saturdays this term.” A large commute box then says Standby and no campus commute. This is accurate but consumes space without providing much more information.

On a 390-pixel phone viewport, navigation, the greeting and daily actions occupy almost the first screen. The second day summary starts near the bottom. Both are useful on class days, but their quiet-day presentation should shrink.

Suggested changes:

- One concise daily summary under the greeting. Keep service-unavailable information visible, but separate it from the main sentence.
- In Day at a glance, use a one-line commute state on days without a trip. Expand the travel detail when there is a real departure decision.
- Make the next class and the remaining usable study window prominent. Finished classes can become quieter entries without losing access to their material.
- Allow one to three manually chosen priorities from existing tasks/projects. Show these inside the current brief or Today area, not another card.
- Reflect an active workout session in the existing workout glance: completed sets, session label, and Continue training.
- Keep Main weather informative at a glance; leave extended forecast exploration on the weather page. Retain timestamps and the distinction between observation and forecast.
- Make the phone navigation shorter. Avoid repeated Customize entry points competing with the main actions at the top.

Do not automatically reorder panels while the user is reading. Their chosen layout should remain predictable. A quieter default does not require removing useful information from class days.

## Training: the strongest next feature

The current page records whether sets were completed. It cannot yet answer “What did I lift last time?” or “How did this session compare?” Its activity records are useful groundwork, but they are not complete workout sessions.

### Design

Use a compact heading with three primary views: **Plan, Session, History**. Keep Nutrition and Gym guide accessible as secondary resources. The current combination of title, tabs, seven day pills, progress banner, timer and Gym/Home switch pushes the first exercise to roughly 590 pixels down the phone screen.

Before a session, show the selected routine and Start session. During a session, prioritize the current exercise, set rows and rest timer. The full routine remains available. On desktop, use the extra width for the exercise list and current session instead of enlarging every exercise card.

Keep the existing accent for selected states and completion. Weight/reps should be easy to read; form cues should be a small expandable section. Avoid a new color for every muscle group or a heavy outline around every surface. A compact sticky rest control should not obscure the last exercise or phone keyboard.

Illustrative set entry, with example values rather than a training prescription:

| Bench press | Weight | Reps | State |
| --- | --- | --- | --- |
| Last session | 95 lb | 10 / 9 / 8 | Reference |
| Set 1 | 95 lb | 10 | Done |
| Set 2 | 95 lb | 9 | Done |
| Set 3 | 95 lb | — | Ready to enter |

### First logging release

1. Start a dated session from a planned routine. Keep the planned weekday separate from the date actually performed.
2. Enter weight and actual reps, then mark a set complete. Prefill the last recorded values for convenience, with easy editing.
3. Support lb/kg explicitly, plus bodyweight, assisted exercises and bands without forcing a meaningless numeric weight.
4. Offer optional automatic rest after a completed set; let the user set rest per exercise. Persist the deadline so a reload does not discard it.
5. Finish or resume a session; show duration, exercises and completed sets. Allow correction of a past log and undo of an accidental change.
6. Show the last few sessions and a simple per-exercise trend. Add more charts only after the recorded data makes them useful.

Use stable session and exercise identities. Store the routine's labels/targets as a historical snapshot so editing the plan does not rewrite past sessions. Make session writes recoverable and avoid independently saving a completion flag and its history as two unrelated operations.

Later extensions: favorite substitutions, optional effort/difficulty notes, warm-up set marking, routine editing, and export. These should follow dependable logging. No automated progression advice or calorie system is necessary for this release.

## School, readings and notes: make the existing links easier to use

Course readings already link to weeks and assignments, and notes already support real source passages, explicit connections and backlinks. The next step is to make these connections visible at the right moment.

- Give an assignment a compact material area: linked reading, relevant note and any deliberately linked cards. Missing links should remain missing; do not guess this week's reading from a filename.
- In the reader, keep a useful route back to the assignment/course. Add page bookmarks or thumbnails for long documents, document search where extractable text supports it, and a clear page navigation control.
- Let a selected passage become a note excerpt or card draft with its citation carried through. Existing source linking should be reused rather than creating a second citation format.
- Offer writing beside a reading when space allows, with a comfortable single-pane switch on phones. Preserve selection and unsaved edits when changing panes.
- Distinguish **source-verified cards** from **review performance**. A verified answer is not evidence that the user has learned it.
- Replace the static weak-area suggestion with a carefully labeled view based on actual recent grades, review counts and recency. Do not claim mastery from sparse data.
- Keep the current term/week separate from the date saved study material was updated. Old saved material should not look freshly generated simply because the calendar advanced.

For the notebook itself, prioritize comfortable editing over a graph: tags, a dependable Markdown editing experience, and attachments would be useful. A graph can come later if it helps navigation. Full notebook links should consistently open the full page; Quick note should consistently mean the drawer. Search should preserve the current draft and support finding content as well as titles.

Recoverable note deletion, Undo, Trash and backup restore are already present in the current local release. Do not rebuild those as new features. A future dashboard-wide export would need a separately defined format covering tasks, projects, sessions, reading annotations, review records and preferences; notebook backup alone does not establish that coverage.

## Projects, focus and capture

The project shelf currently has notes and a next step. Make that next step selectable as a real task, with linked notes and readings where the user chooses them. Let a focus session attach to an existing task/project rather than relying only on a text label.

Useful additions include actual focus minutes per task, a short optional end-of-session note, and a simple weekly view of completed work. Keep planning estimates separate from measured time. When capturing an email or thought, make the destination clear and retain its source link. A command palette that searches tasks, notes, projects and readings would be more valuable than another navigation panel.

## Media: improve the inputs and compact states

The existing filters and shelves already support a good discovery flow. Improve personal relevance:

- Make Rediscover draw more directly from confirmed saved/listened albums. The current seed catalog is useful but should not be mistaken for the user's complete collection.
- Offer a reversible “less often” preference, favorites, and a remembered filter combination. Explain whether a film is an unwatched backlog item or a rewatch.
- The supplied Letterboxd watchlist was empty; genuine unwatched recommendations need manually added items or a watchlist import. Do not invent a backlog.
- Retain exact metadata matching and honest missing-artwork states. Give connection failures a compact explanation and retry action.
- Keep Tonight's pick near the top of Media, and shrink disconnected listening/history areas. Preserve access to connection settings.
- Improve Week in Media with actual recorded activity and cover art when available. Make completion/status changes easy to undo.
- Keep news bounded, with a useful caught-up state and source controls. Continue distinguishing release dates, source update time and the last successful radar check.

“Continue watching” is based on returned viewing history; it should not imply an exact playback resume position unless a provider actually supplies one.

## Personalization and visual polish

The existing theme controls are sufficient groundwork. More useful choices would be a readable text-size setting, compact/comfortable previews, named user-selected layouts, and editable greeting/name defaults. Travel buffers and workout units are practical personal settings.

Use one spacing scale and consistent heading/control hierarchy across Main, School, Media, training and notebook. Keep important text readable; reserve very dim text and tiny mono labels for secondary metadata. Primary phone controls should have comfortable tap areas and clear keyboard focus. Completion feedback should include text or a symbol rather than color alone.

Replace raw setup messages such as an environment-variable name with plain connection guidance in the normal UI. Keep diagnostic detail available separately when needed.

Consolidate the layered global CSS in small feature-sized changes with visual checks. Avoid a sweeping stylesheet rewrite while fixing a small layout issue. Split large components at their state/data boundaries when that supports a concrete change, rather than making refactoring a separate open-ended project.

## Debugging findings

These are pending fixes, not claims that they were repaired during the audit.

| Finding | Evidence and impact | Recommended fix |
| --- | --- | --- |
| CSV status recognizes `Unverified` and `Not verified` as `Verified` | Reproduced by calling `parseAnkiCsv`. The substring regex at `src/lib/study-hub-types.ts:174` matches all three strings. This can inflate verification metadata; the current 91% was not shown to be incorrect. | Normalize exact supported statuses; leave unknown/unverified values safely unverified. Test capitalization, whitespace and negative labels. |
| Review dates use UTC while the queue uses Mountain dates | `src/lib/spaced-repetition.ts:31,42` creates UTC dates; review callers do not pass a local date. At Oct 10, 7:30 PM MDT, UTC is Oct 11. Reproduced scheduling gives Oct 12 using UTC versus Oct 11 using Mountain for a one-day interval. | One shared calendar-day helper at scheduling boundaries. Test evenings, midnight and daylight-saving boundaries. |
| Failed review writes still return apparent success | `saveSRSCard`, `src/lib/spaced-repetition.ts:103`, catches save errors and returns the changed store. Both review UIs advance after this call. This is a confirmed code failure path; storage failure was not injected into the browser during this audit. | Return an explicit save result. Retain the current card/grade on failure, offer retry, and verify recovery. |
| Main Today focus action uses the original gap duration | `src/components/Dashboard.tsx:640` passes `g.minutes`, even when part of the gap has elapsed. A 10–11 AM block opened at 10:45 would offer 60 minutes instead of the remaining 15. The Week timetable already computes remaining time. | Share remaining-window calculation, account for travel buffers, and make resuming a longer paused timer an explicit choice. |

Workout risks needing targeted tests before claiming observed data loss: set toggles write a React snapshot of the whole set map; set state and history are saved separately; resets have no matching history event or Undo; exercise names form part of record identity; the rest deadline does not survive reload. These justify building the session model carefully. Cross-tab edits, cloud reconciliation, reset recovery and routine changes should be tested as real sequences.

## Verification and limits

- All **94 existing tests passed**. They do not cover the four findings above sufficiently; passing them does not establish those cases are correct.
- Inspected Main, School, Media and training in the local production-build preview. Checked Main/School/Media at 390-pixel phone width and training at phone/desktop widths. No page-level horizontal overflow in those phone checks. This is not physical-device acceptance.
- The isolated preview has no production Gmail, Canvas, listening or watch/play credentials. Disconnected local states do not prove a production integration is broken. No production data was changed.
- Read source and prior release/planning documents to separate implemented features from missing capabilities and previously deferred work.
- Screenshots are saved locally under `docs/screenshots/audit-*.png`. They show the current implementation, not proposed mockups.

## Recommended release order

1. **Reliability:** the four study/focus fixes with targeted regression checks, plus truthful user-facing save/connection feedback.
2. **Training:** compact session layout and dated weight/reps logging, resume, history and safe edits. Validate refresh, background timers, offline save, cross-tab changes and cloud reload before release.
3. **Main:** compact quiet-day brief/commute presentation, shorter phone header, and existing workout progress. Preserve saved panel preferences and class-day detail.
4. **Study/work connections:** improve linked-material navigation and task/project focus attribution; derive study suggestions from actual records.
5. **Personal polish:** collection-driven Media inputs, readable text sizing and layout previews. Consider a simple weekly review only after the underlying records are trustworthy.

Keep each release small enough to verify populated, empty, loading, failure and recovery states. Check keyboard access, reduced motion, phone keyboard behavior, saved preferences and actual device sync. The highest-value next feature is a training log; the highest-value immediate maintenance is correcting the study/focus edge cases.
