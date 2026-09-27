# Cloud storage and dashboard update

Uses the existing `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. New tables are created additively on first use. No existing assignments, settings, or notes are deleted. Bundled Markdown Vault notes are imported with `INSERT OR IGNORE`; runtime saves use Turso.

After deployment, open Daymark once on each device that has existing local progress. The client imports per-item records, keeps an offline outbox, and syncs on focus, reconnect, and every 30 seconds. Conflicting versions are retained in recovery history under Agents & storage. Browser data from a different origin (for example localhost or the old alias) must be opened on that origin to migrate; a website cannot read another origin's local storage.

Synced: drafts, custom cards, evidence, spaced review state, workout sets and history, focus sessions, coding progress, grade simulations, and news preferences/saved stories. Workouts are now scoped to the calendar week. Legacy undated workout marks are assigned to the migration week. The application cannot reconstruct dates for old undated marks.

AI calls are user-triggered, capped at 30 actions per UTC hour, and record provider, latency, token use, and safe error codes. Model names can be overridden with `GEMINI_MODEL` and `OPENAI_MODEL`. The digest uses headlines, includes source links, and caches one successful result per Mountain Time day. No generation runs merely from opening the dashboard.

Assignments have Open, Overdue, and Completed filters. Marking work complete changes Daymark only, not Canvas submissions. Dismissed assignments are excluded from the homepage overdue count.

Verification: production build, strict TypeScript, ESLint (existing hook/font warnings), storage regression tests, phone layout checks, and authenticated local API smoke tests. Production credentials are secret in Vercel; local tests use a separate SQLite database and no paid model calls.

Fun additions are deliberately deferred for discussion. This release does not add study quests, knowledge graphs, agent personalities, or streaks.
