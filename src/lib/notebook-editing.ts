export type EditorSelection = { start: number; end: number };
export type EditorEdit = EditorSelection & { content: string };
export type FormatAction = "bold" | "italic" | "heading" | "bullet" | "checklist" | "quote" | "link" | "indent" | "outdent";

export function formatNote(content: string, selection: EditorSelection, action: FormatAction): EditorEdit {
  const { start, end } = selection;
  if (["bold", "italic", "link"].includes(action)) {
    const chosen = content.slice(start, end);
    const marker = action === "bold" ? "**" : "*";
    const placeholder = action === "link" ? "Note title" : "text";
    const left = action === "link" ? "[[" : marker;
    const right = action === "link" ? "]]" : marker;
    if (chosen.startsWith(left) && chosen.endsWith(right) && chosen.length >= left.length + right.length) {
      const plain = chosen.slice(left.length, -right.length);
      return { content: content.slice(0, start) + plain + content.slice(end), start, end: start + plain.length };
    }
    const inner = chosen || placeholder;
    return { content: content.slice(0, start) + left + inner + right + content.slice(end), start: start + left.length, end: start + left.length + inner.length };
  }
  const from = start === 0 ? 0 : content.lastIndexOf("\n", start - 1) + 1;
  const selectionEnd = end > start && content[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = content.indexOf("\n", selectionEnd);
  const to = nextBreak < 0 ? content.length : nextBreak;
  const lines = content.slice(from, to).split("\n");
  const prefix = { heading: "## ", bullet: "- ", checklist: "- [ ] ", quote: "> " }[action as "heading" | "bullet" | "checklist" | "quote"];
  const remove = prefix && lines.every(line => line.startsWith(prefix));
  const changed = lines.map(line => action === "indent" ? `  ${line}` : action === "outdent" ? line.replace(/^(  |\t)/, "") : remove ? line.slice(prefix.length) : prefix + line);
  const replacement = changed.join("\n");
  return { content: content.slice(0, from) + replacement + content.slice(to), start: from, end: from + replacement.length };
}

/** Continue ordinary lists, but leave Markdown examples inside fences literal. */
export function continueNoteList(content: string, selection: EditorSelection): EditorEdit | null {
  if (selection.start !== selection.end) return null;
  const from = selection.start === 0 ? 0 : content.lastIndexOf("\n", selection.start - 1) + 1;
  let fence: string | null = null;
  for (const line of content.slice(0, from).split("\n")) {
    const marker = line.trim().match(/^(`{3,}|~{3,})/)?.[1];
    if (marker && !fence) fence = marker;
    else if (marker && fence && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
  }
  if (fence) return null;
  const line = content.slice(from, selection.start);
  const match = line.match(/^(\s*)([-*+]|\d+\.) (\[[ xX]\] )?(.*)$/);
  if (!match) return null;
  if (!match[4].trim()) return { content: content.slice(0, from) + content.slice(selection.start), start: from, end: from };
  const marker = /\d/.test(match[2]) ? `${Number.parseInt(match[2]) + 1}.` : match[2];
  const added = `\n${match[1]}${marker} ${match[3] ? "[ ] " : ""}`;
  return { content: content.slice(0, selection.start) + added + content.slice(selection.end), start: selection.start + added.length, end: selection.start + added.length };
}

export const NOTE_TEMPLATES = {
  lecture: { title: "Lecture notes", content: "## Main ideas\n\n- \n\n## Examples & connections\n\n\n## Questions\n\n- [ ] \n\n## Next steps\n\n- [ ] " },
  reading: { title: "Reading notes", content: "## Source\n\nAuthor / title:\nPages:\n\n## Main argument\n\n\n## Passages & page references\n\n> \n\n## Connections\n\n\n## Questions to revisit\n\n- [ ] " },
} as const;

export type EditHistory = { entries: EditorEdit[]; position: number; at: number; typing: boolean };
export function recordEdit(history: EditHistory, before: EditorEdit, after: EditorEdit, typing: boolean, at: number): EditHistory {
  if (history.entries[history.position]?.content !== before.content) history = { entries: [before], position: 0, at: 0, typing: false };
  const entries = history.entries.slice(0, history.position + 1);
  entries[history.position] = before;
  if (typing && history.typing && at - history.at < 650 && history.position > 0) entries[entries.length - 1] = after;
  else entries.push(after);
  if (entries.length > 100) entries.shift();
  return { entries, position: entries.length - 1, at, typing };
}
