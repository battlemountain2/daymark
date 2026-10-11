import { createElement, Fragment } from "react";
import { inlineNoteParts } from "@/lib/note-links";
import { wikiReference } from "@/lib/notebook-links";
type WikiOptions = {
  onWikiLink?: (reference: string) => void;
  wikiState?: (reference: string) => "known" | "missing" | "ambiguous";
  onTaskToggle?: (line: number) => void;
};

function styledText(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : part.startsWith("*") ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );
}
export const renderWithWikiLinks = (str: string, options: WikiOptions = {}) => {
  // Inline code is literal, so [[examples]] inside code cannot become buttons.
  return str.split(/(`[^`]+`)/g).map((segment, index) => (
    <Fragment key={index}>
      {segment.startsWith("`") ? (
        <code>{segment.slice(1, -1)}</code>
      ) : (
        inlineNoteParts(segment).map((part, i) => {
          if (part.kind === "link")
            return (
              <a
                key={i}
                href={part.url}
                target={part.url.startsWith("/") ? undefined : "_blank"}
                rel="noreferrer"
              >
                {part.text}
              </a>
            );
          if (part.kind !== "wiki")
            return <Fragment key={i}>{styledText(part.text)}</Fragment>;
          const reference = part.text.slice(2, -2),
            state = options.wikiState?.(reference) || "known",
            label = wikiReference(reference).label;
          return options.onWikiLink ? (
            <button
              type="button"
              key={i}
              className={`obs-wikilink ${state}`}
              onClick={() => options.onWikiLink?.(reference)}
              title={
                state === "missing"
                  ? `Create note: ${label}`
                  : state === "ambiguous"
                    ? `Choose a note: ${label}`
                    : `Open note: ${label}`
              }
            >
              {label}
            </button>
          ) : (
            <span key={i} className="obs-wikilink">
              {label}
            </span>
          );
        })
      )}
    </Fragment>
  ));
};
export const renderObsidianPreview = (
  content: string,
  options: WikiOptions = {},
) => {
  if (!content.trim())
    return (
      <div className="sub" style={{ padding: 24 }}>
        Your formatted note will appear here as you write. Use Connect note to link an idea.
      </div>
    );
  let fence: string | null = null,
    code: string[] = [];
  const lines = content.split("\n"),
    nodes = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx],
      trimmed = line.trim(),
      marker = trimmed.match(/^(`{3,}|~{3,})/);
    if (marker && !fence) {
      fence = marker[1];
      continue;
    }
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length
      ) {
        nodes.push(
          <pre key={idx}>
            <code>{code.join("\n")}</code>
          </pre>,
        );
        fence = null;
        code = [];
      } else code.push(line);
      continue;
    }
    const inline = (text: string) => renderWithWikiLinks(text, options);
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const text = inline(heading[2]);
      nodes.push(createElement(`h${heading[1].length}`, { key: idx, className: `obs-h${heading[1].length}` }, text));
    } else if (/^> \[!(NOTE|WARNING|TIP)\]/.test(trimmed)) {
      const callout = trimmed.match(/^> \[!(NOTE|WARNING|TIP)\]\s*(.*)$/)!;
      nodes.push(
        <div
          key={idx}
          className={`obs-callout ${callout[1] === "WARNING" ? "warn" : callout[1].toLowerCase()}`}
        >
          {inline(callout[2])}
        </div>,
      );
    } else if (trimmed === "---")
      nodes.push(<hr key={idx} className="obs-divider" />);
    else if (trimmed.startsWith("> "))
      nodes.push(
        <blockquote key={idx} className="obs-quote">
          {inline(trimmed.slice(2))}
        </blockquote>,
      );
    else if (/^[-*]\s/.test(trimmed)) {
      const items = [{ text: trimmed.slice(2), line: idx }];
      while (idx + 1 < lines.length && /^[-*]\s/.test(lines[idx + 1].trim()))
        items.push({ text: lines[++idx].trim().slice(2), line: idx });
      nodes.push(
        <ul key={idx} className="obs-list">
          {items.map((item, i) => {
            const task = item.text.match(/^\[([ xX])\] (.*)$/);
            return <li key={i} className={`obs-li ${task ? "notebook-task" : ""}`}>
              {task ? <label><input type="checkbox" checked={task[1].toLowerCase() === "x"} disabled={!options.onTaskToggle} onChange={() => options.onTaskToggle?.(item.line)} /><span>{inline(task[2])}</span></label> : inline(item.text)}
            </li>;
          })}
        </ul>,
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const start = Number.parseInt(trimmed), items = [trimmed.replace(/^\d+\.\s/, "")];
      while (idx + 1 < lines.length && /^\d+\.\s/.test(lines[idx + 1].trim())) items.push(lines[++idx].trim().replace(/^\d+\.\s/, ""));
      nodes.push(<ol key={idx} start={start} className="obs-list">{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ol>);
    } else if (!trimmed) nodes.push(<div key={idx} style={{ height: 8 }} />);
    else
      nodes.push(
        <p key={idx} className="obs-p">
          {inline(line)}
        </p>,
      );
  }
  if (code.length)
    nodes.push(
      <pre key="unfinished-code">
        <code>{code.join("\n")}</code>
      </pre>,
    );
  return <div className="obsidian-preview-content">{nodes}</div>;
};
