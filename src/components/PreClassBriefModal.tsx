"use client";

import { useEffect, useState } from "react";
import type { PreClassBrief } from "@/lib/pre-class-briefs";

type Props = {
  brief: PreClassBrief | null;
  onClose: () => void;
};

export default function PreClassBriefModal({ brief, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (brief) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [brief, onClose]);

  if (!brief) return null;

  const copyAsMarkdown = () => {
    const md = [
      `# ${brief.code}: ${brief.title} — 1-Minute Pre-Class Brief`,
      `**Location:** ${brief.where}`,
      `**Reading:** ${brief.reading}`,
      ``,
      `## Core Thesis`,
      brief.thesis,
      ``,
      `## Key Author / Theoretical Debate`,
      brief.authorDebate,
      ``,
      `## Seminar Discussion Questions`,
      ...brief.questions.map((q, i) => `${i + 1}. *${q.q}* (${q.cite})`),
      ``,
      `## Key Takeaways`,
      ...brief.keyTakeaways.map((t) => `- ${t}`),
    ].join("\n");

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="brief-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`brief-modal-box ${brief.ck}`} onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="brief-header">
          <div className="brief-header-left">
            <span className="brief-badge mono">{brief.code}</span>
            <span className="brief-title">{brief.title}</span>
            <span className="brief-where mono">📍 {brief.where}</span>
          </div>
          <button
            type="button"
            className="brief-close-btn mono"
            onClick={onClose}
            aria-label="Close Pre-Class Brief"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="brief-body">
          {/* Reading banner */}
          <div className="brief-reading-box mono">
            <span className="br-label">📖 REQUIRED READING:</span>
            <div className="br-source">{brief.reading}</div>
          </div>

          {/* Section 1: Core Thesis */}
          <div className="brief-section">
            <div className="brief-sec-head mono">✦ 1-Sentence Core Thesis</div>
            <div className="brief-thesis-text">{brief.thesis}</div>
          </div>

          {/* Section 2: Key Author Debate */}
          <div className="brief-section">
            <div className="brief-sec-head mono">⚖️ Key Author &amp; Theoretical Debate</div>
            <div className="brief-debate-text">{brief.authorDebate}</div>
          </div>

          {/* Section 3: Ready Discussion Questions */}
          <div className="brief-section">
            <div className="brief-sec-head mono">💬 2 Ready Seminar Discussion Questions</div>
            <div className="brief-questions-list">
              {brief.questions.map((item, idx) => (
                <div key={idx} className="brief-q-item">
                  <div className="bq-num mono">Q{idx + 1}</div>
                  <div className="bq-content">
                    <p className="bq-text">&ldquo;{item.q}&rdquo;</p>
                    <span className="bq-cite mono">🏷️ Reference: {item.cite}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Key Takeaways */}
          <div className="brief-section">
            <div className="brief-sec-head mono">🎯 3 Core Takeaways</div>
            <ul className="brief-takeaways-list">
              {brief.keyTakeaways.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="brief-footer">
          <button type="button" className="brief-copy-btn mono" onClick={copyAsMarkdown}>
            {copied ? "✓ Copied Brief to Clipboard!" : "📋 Copy as Markdown Notes"}
          </button>
          <span className="brief-esc-hint mono">Press [Esc] or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
}
