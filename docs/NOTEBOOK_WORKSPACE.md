# Notebook workspace

The dashboard's Notebook link now opens a dedicated `/notebook` workspace. Quick note still opens the existing drawer. Both use the same saved notes, course drafts, links, passages and cloud sync.

## Writing

- Write, Split and Read views, with course folders and full-text note search.
- Wrapping titles and a page editor that grows with the document.
- Formatting controls for bold, italic, headings, lists, checklists, quotes and note links.
- Keyboard formatting, list continuation, indentation and undo/redo.
- Lecture and reading templates create separate notes.
- Read-view checklists update the underlying Markdown.
- Existing wiki links, backlinks, course links and passage connections remain available.
- Note changes save locally immediately and queue for cloud sync. Failed saves keep the current text available and block navigation that would discard it.

## Backup and restore

Backup & restore downloads a versioned JSON file containing saved notes, course drafts, connections and passage references. Study-vault notes are included as notebook copies when the vault endpoint is available. Offline export clearly reports when vault notes could not be included. PDF files and flashcards are separate.

Import validates the file and previews additions before applying. Restore re-reads current storage, preserves existing writing, creates separate copies for differing versions and remaps restored links. Identical repeated imports are skipped. Restored drafts become saved notes, preserving the current capture inbox. Storage writes and the sync outbox roll back together if a local write fails.

Backups are limited to 10 MB, 5,000 entries per collection and 200,000 characters per note. This editor supports a useful Markdown subset; it is not a complete CommonMark or Obsidian implementation. Source PDFs must still exist for passage links to open.

## Verification

- 91 automated tests pass, including formatting/history, restore conflicts, cyclic links, repeated imports, invalid files, storage rollback and bounded sync batches.
- Production build and TypeScript checks pass. Lint has no errors and six existing warnings outside the changed notebook components.
- Browser checks cover formatting, templates, checklist editing, autosave, backup download, conflict restore and duplicate-free repeat restore.
- Restored notes and the active reading note were verified in an isolated local database after sync; reload reopens the selected note.
- Phone testing at 390 × 844 covers Write, Split, Read and restore preview without horizontal page overflow. Desktop testing uses 1280 × 800.
- The notebook route redirects signed-out requests to login.

This release is prepared locally for review; it has not been deployed.
