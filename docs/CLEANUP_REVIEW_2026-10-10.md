# Debugging and cleanup — October 10, 2026

This pass strengthens the existing dashboard and preserves its current visual design. Changes are available in the local preview; this batch has not been deployed.

## Fixed

- Media forms now clear only after a successful save. Invalid source links preserve entered text, and saving clears the old validation error. Shelf/runtime/completion edits merge into the latest stored record rather than copying an older render over newer fields.
- Personal collections reject invalid top-level JSON shapes (including arrays, null and primitives) before reading or writing. A failed read preserves the saved bytes; storage exceptions reach the caller. Read errors and save errors are tracked separately.
- Editing a project removed on another device now fails visibly instead of reporting a successful deletion and discarding the draft. Those unsaved fields remain copyable in the shelf. Adding an existing GitHub link also respects pending project edits.
- GitHub lookup prevents overlapping requests, locks the lookup fields while loading, cancels on unmount, clears results when the username changes, and uses the shelf's current save state when a delayed lookup finishes. Empty/unreadable results have an explicit message.
- Quiz advancement is cancelled when leaving Quiz, changing questions, or unmounting. A synchronous answer guard prevents duplicate submissions before React renders. A cloud refresh of the same question preserves its answer and countdown.
- Workouts prefill only sets marked complete in the previous session. Typed but unfinished values no longer appear as past results. A synced weight-unit preference updates the initial choice without overriding a unit the user has already selected.
- Today priority changes merge against current storage and retain the three-item limit. Focus reassignment checks both the target kind and ID; recorded project minutes only count project targets.
- Evidence Bank filtering refreshes when custom evidence changes. Lo-fi cleanup uses stable callbacks with complete effect dependencies.
- Removed unused dashboard navigation code, imports and an unused review counter. Reformatted the affected workout, project, Media and priority code into readable functions and JSX. Added a shared, testable collection update boundary.

## Verification

- 112 automated tests pass. Five additional regressions cover unreadable collections, concurrent-field preservation, removed-item edits, storage exceptions, and unfinished workout prefills.
- Production build and TypeScript checks pass. Lint has zero errors; two hook warnings were resolved. One pre-existing warning remains for the Google Fonts link in the root layout. The affected files also pass a stricter unused-variable check without disabling that rule.
- Browser → authenticated API → isolated database → reload checks confirmed project writing and GitHub repository lookup. The temporary Hermes note was restored to its original contents; all three requested projects remain.
- An answered quiz recorded one review, then switching immediately to Flashcards kept the position at card 1 after the former advance delay. No browser warnings/errors were captured. The synthetic review was cleared from the isolated preview afterward.
- Media rejected an FTP source while retaining the entered title, accepted a valid HTTPS source, reset the form after saving, and removed the synthetic item afterward. There are no live Media test items remaining.
- Training Plan and History were checked at desktop and 390px phone widths. Screenshots are in the ignored `docs/screenshots` folder.
- Storage failure handling was exercised through the shared storage boundary in automated tests; a full-browser quota failure was not injected. Production integrations were not checked because this preview uses the existing isolated database and disconnected provider configuration.

## Recommended next changes

| Priority | Improvement | Benefit and scope |
| --- | --- | --- |
| 1 | Workout progress charts | Show the last 6–8 sessions for each exercise, keep units consistent, distinguish assisted/bodyweight work, and compare completed sets. Add editable session duration before presenting time as a reliable training metric: current duration is elapsed time between start and finish. |
| 2 | Durable recovery outside Notebook | Keep failed project drafts across dashboard navigation and extend persistent Trash to projects, workouts and Media. Current removal Undo is temporary; failed project drafts remain in the mounted editor. |
| 3 | Projects connected to notes and readings | Pick related notebook notes and reading passages from each project. Add a small recent-activity list and a manual GitHub details refresh before considering live issue/PR synchronization. |
| 4 | Lighter dashboard quiet states | Reduce the tall collapsed rows for optional sections, keep connection prompts small, and emphasize Today plus useful active content. Preserve the existing borderless cards and personal layout controls. |
| 5 | Easier writing and reading | Build on the existing note toolbar with straightforward checklist/list controls and attachments. Add PDF text search and page thumbnails while preserving continuous scrolling, bookmarks and resume. |
| 6 | Incremental maintenance | Split the large workout view into Plan/Session/History components as those features grow. Re-enable unused-variable warnings incrementally across the remaining code and consider self-hosted fonts for predictable loading. Add per-record runtime validation alongside the new collection-shape checks. |

Start with workout charts and recovery reliability, then connect projects to the notebook. Those changes build on current features and give the dashboard more everyday value.
