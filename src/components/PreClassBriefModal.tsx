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

    void navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => setCopied(false));
  };

  return (
    <div className="brief-modal-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${brief.title} class brief`}>
      <div className={`brief-modal-box ${brief.ck}`} onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="brief-header">
          <div className="brief-header-left">
            <span className="brief-badge mono">{brief.code}</span>
            <span className="brief-title">{brief.title}</span>
            <span className="brief-where mono">{brief.where}</span>
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
          <div className="brief-reading-box">
            <span className="br-label">Reading</span>
            <div className="br-source">{brief.reading}</div>
          </div>

          {/* Section 1: Core Thesis */}
          <div className="brief-section">
            <div className="brief-sec-head mono">The central idea</div>
            <div className="brief-thesis-text">{brief.thesis}</div>
          </div>

          {/* Section 2: Key Author Debate */}
          <div className="brief-section">
            <div className="brief-sec-head mono">Authors in conversation</div>
            <div className="brief-debate-text">{brief.authorDebate}</div>
          </div>

          {/* Section 3: Ready Discussion Questions */}
          <div className="brief-section">
            <div className="brief-sec-head mono">Questions to take to class</div>
            <div className="brief-questions-list">
              {brief.questions.map((item, idx) => (
                <div key={idx} className="brief-q-item">
                  <div className="bq-num mono">Q{idx + 1}</div>
                  <div className="bq-content">
                    <p className="bq-text">&ldquo;{item.q}&rdquo;</p>
                    <span className="bq-cite mono">Source: {item.cite}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Key Takeaways */}
          <div className="brief-section">
            <div className="brief-sec-head mono">Takeaways</div>
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
            {copied ? "Copied" : "Copy to notes"}
          </button>
          <span className="brief-esc-hint mono">Press [Esc] or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
}
