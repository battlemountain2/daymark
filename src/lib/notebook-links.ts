import { noteTitle, type NotebookNote } from "./notebook";
export type LinkableNote = {
  id: string;
  title: string;
  course: string;
  content: string;
  aliases?: string[];
  kind: "note" | "draft" | "vault";
};
const normalize = (value: string) =>
  value.trim().normalize("NFKC").toLocaleLowerCase();
export function wikiReference(value: string) {
  const raw = value.replace(/^\[\[|\]\]$/g, "");
  const [destination, ...alias] = raw.split("|");
  const [target, ...heading] = destination.split("#");
  return {
    target: target.trim(),
    heading: heading.join("#"),
    label: alias.join("|").trim() || target.trim(),
  };
}
export function noteIndex(
  records: Record<string, NotebookNote>,
  drafts: Record<string, string>,
): LinkableNote[] {
  return [
    ...Object.values(records).filter(n => n.deletedAt === undefined).map((n) => ({ ...n, kind: "note" as const })),
    ...Object.entries(drafts)
      .filter(([, content]) => content.trim())
      .map(([course, content]) => ({
        id: course,
        title: noteTitle(content),
        course,
        content,
        kind: "draft" as const,
      })),
  ];
}
export function resolveWiki(
  reference: string,
  notes: LinkableNote[],
  course: string,
): LinkableNote[] {
  const { target } = wikiReference(reference);
  if (!target) return [];
  const id = notes.find((n) => n.id === target);
  if (id) return [id];
  const qualified = notes.filter((n) =>
    [n.title, ...(n.aliases || [])].some(
      (title) => normalize(`${n.course}/${title}`) === normalize(target),
    ),
  );
  if (qualified.length) return qualified;
  const matches = notes.filter((n) =>
    [n.title, ...(n.aliases || [])].some(
      (title) => normalize(title) === normalize(target),
    ),
  );
  const local = matches.filter(
    (n) => normalize(n.course) === normalize(course),
  );
  return local.length ? local : matches;
}
export function wikiReferences(content: string): string[] {
  let fence: string | null = null;
  const references = new Set<string>();
  for (const line of content.split("\n")) {
    const marker = line.trim().match(/^(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
        fence = null;
      continue;
    }
    if (fence) continue;
    const text = line.replace(/`+[^`\n]*`+/g, "");
    for (const match of text.matchAll(/\[\[([^\]\n]+)\]\]/g))
      references.add(match[1]);
  }
  return [...references];
}
export function backlinks(
  targetId: string,
  notes: LinkableNote[],
): LinkableNote[] {
  return notes.filter(
    (n) =>
      n.id !== targetId &&
      wikiReferences(n.content).some((reference) => {
        const targets = resolveWiki(reference, notes, n.course);
        return targets.length === 1 && targets[0].id === targetId;
      }),
  );
}
export function noteReference(
  note: LinkableNote,
  notes: LinkableNote[],
  course: string,
) {
  const resolved = resolveWiki(note.title, notes, course);
  // Ambiguous titles use the stable identity; the alias stays friendly in preview.
  if (resolved.length === 1 && resolved[0].id === note.id) return note.title;
  const qualified = `${note.course}/${note.title}`;
  const candidates = resolveWiki(qualified, notes, course);
  return candidates.length === 1 && candidates[0].id === note.id
    ? `${qualified}|${note.title}`
    : `${note.id}|${note.title}`;
}

/** Renaming is one notebook write; existing references gain a stable target. */
export function renameNotebook(
  records: Record<string, NotebookNote>,
  id: string,
  title: string,
  drafts: Record<string, string>,
  now = Date.now(),
) {
  const old = records[id];
  if (!old || !title.trim() || (old.customTitle && title.trim() === old.title))
    return records;
  const next = {
    ...records,
    [id]: {
      ...old,
      title: title.trim(),
      customTitle: true,
      aliases: [...new Set([...(old.aliases || []), old.title])],
      updatedAt: now,
    },
  };
  const index = noteIndex(records, drafts);
  for (const note of Object.values(records)) {
    let fence: string | null = null;
    const content = note.content
      .split("\n")
      .map((line) => {
        const marker = line.trim().match(/^(`{3,}|~{3,})/);
        if (marker) {
          if (!fence) fence = marker[1];
          else if (
            marker[1][0] === fence[0] &&
            marker[1].length >= fence.length
          )
            fence = null;
          return line;
        }
        if (fence) return line;
        return line
          .split(/(`+[^`]*`+)/g)
          .map((part) =>
            part.startsWith("`")
              ? part
              : part.replace(
                  /\[\[([^\]\n]+)\]\]/g,
                  (original, reference: string) => {
                    const matches = resolveWiki(reference, index, note.course);
                    if (matches.length !== 1 || matches[0].id !== id)
                      return original;
                    const parsed = wikiReference(reference);
                    const label =
                      parsed.label === old.title ? title.trim() : parsed.label;
                    return `[[${id}${parsed.heading ? `#${parsed.heading}` : ""}|${label}]]`;
                  },
                ),
          )
          .join("");
      })
      .join("\n");
    if (content !== note.content)
      next[note.id] = { ...next[note.id], content, updatedAt: now };
  }
  return next;
}
