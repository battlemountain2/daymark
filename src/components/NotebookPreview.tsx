import { Fragment } from "react";
import { inlineNoteParts } from "@/lib/note-links";
import { wikiReference } from "@/lib/notebook-links";
type WikiOptions = {
  onWikiLink?: (reference: string) => void;
  wikiState?: (reference: string) => "known" | "missing" | "ambiguous";
};

function styledText(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
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
        Start writing. Use [[Note title]] to connect an idea.
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
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const text = inline(heading[2]);
      nodes.push(
        heading[1].length === 1 ? (
          <h1 key={idx} className="obs-h1">
            {text}
          </h1>
        ) : heading[1].length === 2 ? (
          <h2 key={idx} className="obs-h2">
            {text}
          </h2>
        ) : (
          <h3 key={idx} className="obs-h3">
            {text}
          </h3>
        ),
      );
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
      const items = [trimmed.slice(2)];
      while (idx + 1 < lines.length && /^[-*]\s/.test(lines[idx + 1].trim()))
        items.push(lines[++idx].trim().slice(2));
      nodes.push(
        <ul key={idx} className="obs-list">
          {items.map((item, i) => (
            <li key={i} className="obs-li">
              {inline(item)}
            </li>
          ))}
        </ul>,
      );
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
