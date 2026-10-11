# Dashboard improvements — October 10, 2026

This batch implements the first pass of the approved roadmap. It is available in the local preview on port 3100. It has not been deployed.

## What changed

- Fixed CSV source-status parsing so “Unverified” and “Not verified” cannot become Verified. Recall ratings no longer change a card’s source-verification status.
- Review scheduling uses Mountain calendar dates, including evening and daylight-saving boundaries. Failed review saves keep the current card and pause quiz advancement. Timer writes run outside React state updaters, and keyboard handlers use current review state.
- Focus windows use the remaining time in a gap and reserve a configurable campus travel buffer. An unfinished timer requires an explicit choice before it is replaced or assigned to a different project/task.
- Workout Plan, Session and History views record actual dates, weights, reps, load type, rest settings and session notes. Prior completed values can prefill a new session, with explicit pound/kilogram conversion. Rest deadlines survive refresh. History remains editable; clear marks, remove sessions and undo are available. Earlier checkmarks are retained separately without inventing historical weights or dates.
- Main keeps the existing Day at a glance area, reduces quiet-day duplication and phone navigation height, and adds up to three chosen task priorities within that area.
- Notebook uses plain formatting instructions and a searchable Connect note picker. Write + preview shows the finished result beside the writing area. The Main return button now explicitly opens Main.
- Projects accept public GitHub repositories or repository links. Each project retains its own notes, next step, linked tasks and completed focus minutes. Adding the same next step repeatedly reuses the task identity. Failed project edits retain drafts for retry.
- Personal defaults include greeting name, larger reading text, workout units and travel time. Named layouts save a space’s panel order, visibility and spacing.
- School links directly to course notes and filtered review cards. Recent review hints derive from actual recent ratings, separate from saved source material. PDFs support bookmarks and resume positions without erasing bookmarks during preference saves.
- Media uses smaller empty sections, distinguishes missing connections from empty history, prefers known saved/listened albums for Rediscover, and presents a visual weekly recap with artwork fallbacks. Saved items can be removed with undo.

## Verification

The complete path was checked from browser actions through authenticated routes and local database records, then back through reloads.

- 107 automated tests pass, including status parsing, Mountain dates, failed-save retries, remaining focus windows, workout snapshots, unit conversion, independent workout sync, repository validation, project focus history and Rediscover selection.
- Production build and TypeScript checks pass. Lint reports no errors; three existing warnings remain in the font setup, EvidenceBank and LofiDeck.
- Browser checks covered GitHub lookup and adding the three requested repos; project-to-task creation without duplicates; choosing/completing Today priorities; focus reassignment and Escape cancellation; workout input validation, timer reload, clear-and-undo, completion, prefilling and remove-and-undo; note connection insertion, preview and undo; larger text actually rendering at 20px; saved layouts; course-filtered review; three-page PDF rendering, bookmarking page 3 and retaining it after reload; and Media recap/removal recovery.
- Database checks confirmed three independent project records, one task after repeated add, and the persisted PDF bookmark. Synthetic workout and Media records were removed after verification; the small preview PDF remains as a reader fixture.
- Desktop and 390px phone layouts were visually inspected. Screenshots are in the ignored `docs/screenshots` directory.

## Repositories and release boundaries

Daymark, Hermes and Mathfoundry are saved in the local preview’s project shelf under `battlemountain2`. Existing project writing is preserved. GitHub metadata is fetched through the [official repositories REST API](https://docs.github.com/en/rest/repos/repos), with no additional GitHub login for public repositories.

The preview uses an isolated database, so deploying code alone does not transfer these project records to production. When this release is deployed, add the same three through Main → On your desk → Add a GitHub project → Find repositories. Production credentials and feeds were not available in this checkout; disconnected preview feeds do not imply a production integration failure.

This first pass does not add a rich-text document engine, new note attachments, PDF full-text search/thumbnails, customizable workout routines, live GitHub issue/PR synchronization, or statistical training graphs. Those remain follow-up improvements rather than being presented as finished.
