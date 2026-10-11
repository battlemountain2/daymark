# Progress, recovery, GitHub activity, and a lighter Main

Implemented in the isolated review checkout. This batch has not been deployed.

## What changed

- **Training → Progress:** exercise trends for the last eight completed sessions, best recorded sets across all history, and seven-day session/set/minute totals. Loads convert between pounds and kilograms. Weight, assistance, bodyweight, bands, and timed exercises stay in separate tracks. The expandable values table gives the exact results behind each chart. Empty histories stay empty.
- **Correct workout time:** completed sessions have a duration field. Corrections change progress totals without rewriting the original timestamps. Sessions accidentally left open for more than 24 hours need a correction before their minutes count in the recap.
- **Persistent Trash:** projects, Media collection items, and workout sessions retain their full saved record when removed. Trash and restore use the existing cloud sync records. Restore keeps the original identity and latest saved fields. Adding a removed GitHub repository restores the project rather than creating a duplicate; saving a removed Media pick also restores its collection entry.
- **Project edit recovery:** unsuccessful edits to the project name, next step, or optional notes keep a recovery copy on this device across navigation/reload. An unreadable copy is preserved; storage failures show a warning and retain the current text in memory. Primary project records still use cloud sync.
- **Useful repos without notes:** Show activity reads recent public commits and open issues/pull requests. An open item can become a linked Daymark task. Notes are optional and collapsed when empty. No generated notes or changes to GitHub are required.
- **Lighter Main:** collapsed sections become compact rows. Disconnected inbox/listening cards use less padding. Project tiles show repo context with simpler typography. Desktop and phone layouts retain the existing palette and borderless cards.

## Verification

- All **121 tests** passed. Coverage includes persistence and restore identity, failed storage writes, malformed draft backups, unit conversion, completed-only results, distinct exercise tracks, corrected durations, seven-day date boundaries, and safe GitHub normalization.
- Production build and TypeScript checks passed. Lint has no errors; the existing Google Fonts stylesheet warning in the root layout remains.
- Browser checks in the isolated preview covered actual Hermes activity, issue-to-task creation, project remove → reload → restore, adding the removed Mathfoundry link, workout remove → reload → restore, duration correction, and Media remove → reload → restore. Restoring a removed pick from Tonight's pick retained its corrected 99-minute runtime and original collection identity.
- Three temporary workout sessions verified mixed-unit charts and duration totals on desktop and phone. These fixtures, the temporary Media entry, and the issue task were removed afterward. The three saved repos retain their original IDs.
- The final phone check exposed a leftover icon-column layout squeezing project names; the scoped mobile tile rule now uses a vertical layout. Main's compact rows and charts were checked at a phone viewport. No page-wide horizontal overflow was observed.
- Project draft persistence is covered through storage tests. A browser quota failure was not forcibly injected.

## Limits

Trash applies to new removals. Records permanently deleted before this change cannot be reconstructed. There is no permanent-delete button or automatic Trash expiry in this batch.

Recovery drafts are device-local and depend on writable browser storage; they are not a replacement for synced saved project records. If storage is unavailable, copy any unsaved text before leaving.

GitHub activity is public, manually requested, and cached for five minutes. Private repository authentication and live push updates are outside this change. Provider failures have visible error/partial-result states. GitHub's issues response includes pull requests, so the UI calls the total "open items" and labels each entry by type. References: [list commits](https://docs.github.com/en/rest/commits/commits#list-commits), [list repository issues](https://docs.github.com/en/rest/issues/issues#list-repository-issues).

Workout charts describe recorded results. They do not estimate one-rep maxes or prescribe progression. Band resistance may differ between sessions; the UI explains this limitation.

Screenshots in `docs/screenshots/` are local review artifacts. The workout progress previews contain synthetic sessions used for verification, not the user's workout history.

## Useful next improvements

1. Add a small weekly training recap to Main once enough real sessions are recorded, with a direct link to Progress.
2. Let projects choose one open issue as their next step, showing it in the compact project tile and Today priorities.
3. Extend device recovery drafts to failed workout edits, using the same explicit recovery warning pattern.
