import {inlineNoteParts} from "@/lib/note-links";

  // Helper to render Obsidian Markdown preview
export const renderObsidianPreview = (content: string) => {
    if (!content.trim()) {
      return (
        <div className="sub mono" style={{ padding: 24, textAlign: "center" }}>
          No notes to preview yet. Switch to Editor to write.
        </div>
      );
    }

    const lines = content.split("\n");
    return (
      <div className="obsidian-preview-content">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("# ")) {
            return <h1 key={idx} className="obs-h1">{trimmed.slice(2)}</h1>;
          }
          if (trimmed.startsWith("## ")) {
            return <h2 key={idx} className="obs-h2">{trimmed.slice(3)}</h2>;
          }
          if (trimmed.startsWith("### ")) {
            return <h3 key={idx} className="obs-h3">{trimmed.slice(4)}</h3>;
          }
          if (trimmed.startsWith("> [!NOTE]")) {
            return <div key={idx} className="obs-callout note mono">💡 {trimmed.replace("> [!NOTE]", "").trim()}</div>;
          }
          if (trimmed.startsWith("> [!WARNING]")) {
            return <div key={idx} className="obs-callout warn mono">⚠️ {trimmed.replace("> [!WARNING]", "").trim()}</div>;
          }
          if (trimmed.startsWith("> [!TIP]")) {
            return <div key={idx} className="obs-callout tip mono">✦ {trimmed.replace("> [!TIP]", "").trim()}</div>;
          }
          if (trimmed.startsWith("> ")) {
            return <blockquote key={idx} className="obs-quote">{renderWithWikiLinks(trimmed.slice(2))}</blockquote>;
          }
          if (trimmed === "---") {
            return <hr key={idx} className="obs-divider" />;
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const text = trimmed.slice(2);
            return (
              <li key={idx} className="obs-li">
                {renderWithWikiLinks(text)}
              </li>
            );
          }
          if (!trimmed) {
            return <div key={idx} style={{ height: 8 }} />;
          }
          return <p key={idx} className="obs-p">{renderWithWikiLinks(line)}</p>;
        })}
      </div>
    );
  };

export const renderWithWikiLinks = (str: string) => {
    return inlineNoteParts(str).map((part,i) => part.kind === 'link'
      ? <a key={i} href={part.url} target={part.url.startsWith('/') ? undefined : '_blank'} rel="noreferrer">{part.text}</a>
      : part.kind === 'wiki'
        ? <span key={i} className="obs-wikilink mono" title={`Concept Link: ${part.text.slice(2,-2)}`}>{part.text}</span>
        : part.text);
  };
