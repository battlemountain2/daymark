"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Flashcard } from "@/lib/study-hub-types";
import type { EvidenceItem } from "@/components/EvidenceBank";

interface ScratchpadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTag?: string;
}

const DEFAULT_TAGS = [
  { id: "General", label: "General", ck: "adm" },
  { id: "GEOG 1160", label: "GEOG 1160", ck: "geo" },
  { id: "GEOG 1160L", label: "GEOG 1160L", ck: "geo" },
  { id: "HIST 300", label: "HIST 300", ck: "his" },
  { id: "GEOG 1150", label: "GEOG 1150", ck: "geo" },
  { id: "GEOG 1115L", label: "GEOG 1115L", ck: "geo" },
];

const STORAGE_KEY = "hb:scratchpad:v2";

export default function ScratchpadDrawer({ isOpen, onClose, defaultTag = "General" }: ScratchpadDrawerProps) {
  const [activeTag, setActiveTag] = useState<string>(defaultTag);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return { General: "" };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      const old = localStorage.getItem("hb:scratchpad:notes");
      if (old) return { General: old };
    } catch {}
    return { General: "" };
  });

  const [copied, setCopied] = useState(false);
  const [savedPing, setSavedPing] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [isHandoffRunning, setIsHandoffRunning] = useState(false);

  // 1-Click Anki Card Composer Modal
  const [showAnkiModal, setShowAnkiModal] = useState(false);
  const [ankiFront, setAnkiFront] = useState("");
  const [ankiBack, setAnkiBack] = useState("");
  const [ankiSource, setAnkiSource] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync defaultTag if provided
  useEffect(() => {
    if (defaultTag && DEFAULT_TAGS.some(t => t.id === defaultTag)) {
      setActiveTag(defaultTag);
    }
  }, [defaultTag]);

  // Focus textarea when opened in edit mode
  useEffect(() => {
    if (isOpen && !showAnkiModal && viewMode === "edit") {
      const t = setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTag, showAnkiModal, viewMode]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAnkiModal) {
          setShowAnkiModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showAnkiModal]);

  const currentContent = notes[activeTag] || "";

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const updated = { ...notes, [activeTag]: val };
    setNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedPing(true);
      setTimeout(() => setSavedPing(false), 800);
    } catch {}
  };

  const handleCopy = async () => {
    if (!currentContent) return;
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const handleExport = () => {
    if (!currentContent) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `${activeTag.toLowerCase().replace(/\s+/g, "_")}-notes-${dateStr}.md`;
    const blob = new Blob([currentContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!currentContent) return;
    if (window.confirm(`Clear scratchpad for ${activeTag}?`)) {
      const updated = { ...notes, [activeTag]: "" };
      setNotes(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  // Open Anki modal with selected text or current line
  const handleOpenAnkiModal = () => {
    const el = textareaRef.current;
    let selected = "";
    if (el) {
      selected = el.value.substring(el.selectionStart, el.selectionEnd).trim();
    }
    if (!selected) {
      selected = currentContent.slice(0, 120);
    }
    setAnkiFront(selected);
    setAnkiBack("");
    setAnkiSource(`${activeTag} Scratchpad (${new Date().toLocaleDateString()})`);
    setShowAnkiModal(true);
  };

  const handleSaveAnkiCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ankiFront.trim() || !ankiBack.trim()) return;

    const newCard: Flashcard = {
      id: `custom-${Date.now()}`,
      front: ankiFront.trim(),
      back: ankiBack.trim(),
      source: ankiSource.trim() || `${activeTag} Lecture Notes`,
      tags: `${activeTag.replace(/\s+/g, "")}::Custom::QuickNote`,
      status: "Verified",
      parsedTag: {
        courseCode: activeTag === "General" ? "UNM" : activeTag,
        week: "W05",
        unit: "Notes",
        topic: "Scratchpad",
        raw: activeTag,
      },
      courseCode: activeTag === "General" ? "GENERAL" : activeTag,
    };

    try {
      const stored = localStorage.getItem("hb:custom-anki-cards");
      const list: Flashcard[] = stored ? JSON.parse(stored) : [];
      list.unshift(newCard);
      localStorage.setItem("hb:custom-anki-cards", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("custom-anki-updated"));

      setShowAnkiModal(false);
      setBannerMsg(`⚡ Created Anki Card for ${activeTag}!`);
      setTimeout(() => setBannerMsg(null), 3000);
    } catch (err) {
      console.error("Failed to save custom card", err);
    }
  };

  // ★ Send to Friday Synthesis Evidence Bank
  const handleSendToSynthesis = () => {
    if (!currentContent.trim()) return;
    const lines = currentContent.trim().split("\n").filter(Boolean);
    const thesis = lines[0] || "Quick lecture synthesis point.";
    const quote = lines.slice(1).join(" ") || lines[0];

    const item: EvidenceItem = {
      id: `custom-ev-${Date.now()}`,
      course: activeTag === "General" ? "GEOG 1160" : activeTag,
      author: "Brayan (Lecture Scratchpad)",
      work: `${activeTag} In-Class Notes`,
      year: new Date().getFullYear().toString(),
      pages: "Scratchpad Notes",
      thesis: thesis.slice(0, 160),
      quote: quote.slice(0, 280),
      evidenceKind: "reading-note",
      chicagoNotes: `${activeTag} Lecture & Lab Notes, UNM Fall 2026.`,
      chicagoBib: `${activeTag} Course Notes. University of New Mexico, Fall 2026.`,
      tags: ["scratchpad", "synthesis", activeTag.toLowerCase()],
      ck: (DEFAULT_TAGS.find(t => t.id === activeTag)?.ck || "adm") as any,
    };

    try {
      const stored = localStorage.getItem("hb:custom-synthesis-evidence");
      const list: EvidenceItem[] = stored ? JSON.parse(stored) : [];
      list.unshift(item);
      localStorage.setItem("hb:custom-synthesis-evidence", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("custom-evidence-updated"));

      setBannerMsg(`★ Pushed to Friday 8:00 PM Evidence Bank!`);
      setTimeout(() => setBannerMsg(null), 3500);
    } catch (err) {
      console.error("Failed to push evidence", err);
    }
  };

  // 🚀 Handoff to Agent: Enriches note with syllabus connections & Anki cards
  const handleAgentHandoff = async () => {
    if (!currentContent.trim()) return;
    setIsHandoffRunning(true);
    setBannerMsg("🚀 Handoff in progress: Agent is analyzing syllabus & enriching notes...");

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "handoff",
          course: activeTag,
          title: `${activeTag} Lecture Note`,
          rawContent: currentContent,
        }),
      });

      if (!res.ok) throw new Error("Handoff API error");
      const data = await res.json();

      if (data.enrichedMarkdown) {
        const updated = { ...notes, [activeTag]: data.enrichedMarkdown };
        setNotes(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Inject mined Anki cards into active deck
        if (data.generatedCards && data.generatedCards.length > 0) {
          const stored = localStorage.getItem("hb:custom-anki-cards");
          const list: Flashcard[] = stored ? JSON.parse(stored) : [];
          const combined = [...data.generatedCards, ...list];
          localStorage.setItem("hb:custom-anki-cards", JSON.stringify(combined));
          window.dispatchEvent(new CustomEvent("custom-anki-updated"));
        }

        setViewMode("preview");
        const providerBadge = data.provider ? ` [${data.provider}]` : "";
        setBannerMsg(`✓${providerBadge} Enriched notes & generated ${data.generatedCards?.length || 0} Anki cards!`);
        setTimeout(() => setBannerMsg(null), 4000);
      }
    } catch (err) {
      console.error("Agent handoff error", err);
      setBannerMsg("⚠️ Agent handoff failed. Notes preserved locally.");
      setTimeout(() => setBannerMsg(null), 3500);
    } finally {
      setIsHandoffRunning(false);
    }
  };

  // 📋 Copy prompt formatted for ChatGPT or Gemini mobile/web app
  const handleCopyAIPrompt = async (modelName: "ChatGPT" | "Gemini") => {
    const prompt = [
      `You are my academic copilot for ${activeTag} at UNM (Fall 2026).`,
      `Here are my raw lecture notes from today:`,
      `"""`,
      currentContent,
      `"""`,
      ``,
      `Please:`,
      `1. Connect these concepts to the Week 5 syllabus topics and readings.`,
      `2. Insert Obsidian wiki-links [[Concept]] connecting to related regional geography or water history ideas.`,
      `3. Generate 3-5 high-yield Anki flashcards formatted as Front / Back.`,
      `4. Add Obsidian callout boxes (> [!NOTE] or > [!WARNING]) for exam tips.`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(prompt);
      setBannerMsg(`📋 Prompt copied for ${modelName}! Ready to paste in app.`);
      setTimeout(() => setBannerMsg(null), 3000);
    } catch {}
  };

  // Helper to render Obsidian Markdown preview
  const renderObsidianPreview = (content: string) => {
    if (!content.trim()) {
      return <div className="sub mono" style={{ padding: 24, textAlign: "center" }}>No notes to preview yet. Switch to Editor to write.</div>;
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
          if (trimmed.startsWith("> ")) {
            return <blockquote key={idx} className="obs-quote">{trimmed.slice(2)}</blockquote>;
          }
          if (trimmed === "---") {
            return <hr key={idx} className="obs-divider" />;
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            // Highlight [[Wiki-Links]]
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

  const renderWithWikiLinks = (str: string) => {
    const parts = str.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        const link = part.slice(2, -2);
        return (
          <span key={i} className="obs-wikilink mono" title={`Concept Link: ${link}`}>
            [[{link}]]
          </span>
        );
      }
      return part;
    });
  };

  // Metrics
  const words = currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0;
  const chars = currentContent.length;

  if (!isOpen) return null;

  return (
    <div className="scratchpad-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="scratchpad-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="scratchpad-header">
          <div className="scratchpad-title-group">
            <div className="scratchpad-badge mono">⌘J Academic Vault</div>
            <h3 className="scratchpad-title">Course-Aware Lecture Vault</h3>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* View Mode Toggle: Edit vs Obsidian Preview */}
            <div className="obs-mode-toggle mono">
              <button
                type="button"
                className={`obs-btn ${viewMode === "edit" ? "active" : ""}`}
                onClick={() => setViewMode("edit")}
              >
                ✎ Editor
              </button>
              <button
                type="button"
                className={`obs-btn ${viewMode === "preview" ? "active" : ""}`}
                onClick={() => setViewMode("preview")}
              >
                ✦ Obsidian View
              </button>
            </div>
            <button
              type="button"
              className="scratchpad-close-btn mono"
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {bannerMsg && (
          <div className="scratchpad-banner mono">
            {bannerMsg}
          </div>
        )}

        {/* Course Tag Selector & Quick AI Copilot Dropdowns */}
        <div className="scratchpad-tags-bar">
          <span className="scratchpad-tags-label mono">Course:</span>
          <div className="scratchpad-tags-scroll">
            {DEFAULT_TAGS.map((t) => {
              const hasNotes = Boolean(notes[t.id]?.trim());
              const isActive = activeTag === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`scratchpad-tag-btn mono ${isActive ? "active" : ""} ${t.ck}`}
                  onClick={() => setActiveTag(t.id)}
                >
                  {t.label}
                  {hasNotes && <span className="scratchpad-tag-dot" />}
                </button>
              );
            })}
          </div>

          {/* Quick AI Prompt Helpers */}
          <div className="ai-handoff-chips mono">
            <button
              type="button"
              className="ai-chip gemini"
              onClick={() => handleCopyAIPrompt("Gemini")}
              title="Copy formatted syllabus prompt for Google Gemini"
            >
              🔵 Gemini Prompt
            </button>
            <button
              type="button"
              className="ai-chip gpt"
              onClick={() => handleCopyAIPrompt("ChatGPT")}
              title="Copy formatted syllabus prompt for ChatGPT / Whisper"
            >
              🟢 ChatGPT Prompt
            </button>
          </div>
        </div>

        {/* Main Note Canvas / Preview */}
        <div className="scratchpad-editor-wrap">
          {viewMode === "edit" ? (
            <textarea
              ref={textareaRef}
              className="scratchpad-textarea mono"
              value={currentContent}
              onChange={handleTextChange}
              placeholder={`Jot raw lecture notes, lab findings, or quotes for ${activeTag}...\n\n- Tap "🚀 Handoff to Agent" to enrich with syllabus context & Anki cards\n- Use [[Concept]] for Obsidian-style bi-directional links\n- Auto-saved directly to local Markdown vault`}
              spellCheck={false}
            />
          ) : (
            <div className="obsidian-preview-pane">
              {renderObsidianPreview(currentContent)}
            </div>
          )}
        </div>

        {/* Footer & Metrics */}
        <div className="scratchpad-footer">
          <div className="scratchpad-metrics mono">
            <span>{words} {words === 1 ? "word" : "words"}</span>
            <span className="dot-sep">·</span>
            <span>{chars} chars</span>
            <span className="dot-sep">·</span>
            <span className={`save-indicator ${savedPing ? "saving" : ""}`}>
              {savedPing ? "Saving..." : "Saved to Vault"}
            </span>
          </div>

          <div className="scratchpad-actions mono">
            {/* 🚀 Main Handoff to Agent Button */}
            <button
              type="button"
              className={`scratchpad-act-btn handoff ${isHandoffRunning ? "loading" : ""}`}
              onClick={handleAgentHandoff}
              disabled={!currentContent.trim() || isHandoffRunning}
              title="Trigger agent to cross-reference syllabus, enrich notes, and mine Anki cards"
            >
              {isHandoffRunning ? "⏳ Enriching..." : "🚀 Handoff to Agent"}
            </button>

            <button
              type="button"
              className="scratchpad-act-btn highlight"
              onClick={handleOpenAnkiModal}
              disabled={!currentContent.trim()}
              title="Convert highlighted text or note into an Anki card"
            >
              ⚡ Make Card
            </button>
            <button
              type="button"
              className="scratchpad-act-btn star"
              onClick={handleSendToSynthesis}
              disabled={!currentContent.trim()}
              title="Send note to Friday 8:00 PM Synthesis Evidence Bank"
            >
              ★ To Synthesis
            </button>
            <button
              type="button"
              className="scratchpad-act-btn"
              onClick={handleCopy}
              disabled={!currentContent}
              title="Copy current note to clipboard"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
            <button
              type="button"
              className="scratchpad-act-btn"
              onClick={handleExport}
              disabled={!currentContent}
              title="Download as Obsidian .md"
            >
              ⬇ Export .md
            </button>
            <button
              type="button"
              className="scratchpad-act-btn danger"
              onClick={handleClear}
              disabled={!currentContent}
              title="Clear active note"
            >
              🗑 Clear
            </button>
          </div>
        </div>

        {/* 1-Click Anki Card Creator Modal */}
        {showAnkiModal && (
          <div className="anki-quick-modal-backdrop" onClick={() => setShowAnkiModal(false)}>
            <div className="anki-quick-modal" onClick={(e) => e.stopPropagation()}>
              <div className="anki-modal-head">
                <span className="mono anki-badge">⚡ 1-Click Anki Generator</span>
                <button type="button" className="mono close-x" onClick={() => setShowAnkiModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveAnkiCard} className="anki-modal-form">
                <div className="anki-field">
                  <label className="mono">Target Course</label>
                  <input type="text" value={activeTag} disabled className="mono disabled-inp" />
                </div>
                <div className="anki-field">
                  <label className="mono">Front (Question / Prompt / Term)</label>
                  <textarea
                    rows={2}
                    value={ankiFront}
                    onChange={(e) => setAnkiFront(e.target.value)}
                    placeholder="e.g. What is the Lifting Condensation Level (LCL)?"
                    required
                    autoFocus
                    className="mono"
                  />
                </div>
                <div className="anki-field">
                  <label className="mono">Back (Answer / Definition / Thesis)</label>
                  <textarea
                    rows={3}
                    value={ankiBack}
                    onChange={(e) => setAnkiBack(e.target.value)}
                    placeholder="e.g. The exact altitude where an ascending air parcel cools to its dew point, triggering condensation."
                    required
                    className="mono"
                  />
                </div>
                <div className="anki-field">
                  <label className="mono">Source / Citation</label>
                  <input
                    type="text"
                    value={ankiSource}
                    onChange={(e) => setAnkiSource(e.target.value)}
                    placeholder="e.g. Lecture notes p. 4"
                    className="mono"
                  />
                </div>
                <div className="anki-modal-actions mono">
                  <button type="button" className="deck-btn mono" onClick={() => setShowAnkiModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="deck-btn primary mono">
                    ✓ Add to Active Deck
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
