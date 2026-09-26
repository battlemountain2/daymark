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

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !showAnkiModal) {
      const t = setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTag, showAnkiModal]);

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
    const filename = `${activeTag.toLowerCase().replace(/\s+/g, "_")}-notes-${dateStr}.txt`;
    const blob = new Blob([currentContent], { type: "text/plain;charset=utf-8" });
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
            <div className="scratchpad-badge mono">⌘J Scratchpad</div>
            <h3 className="scratchpad-title">Course-Aware Brain Dump</h3>
          </div>
          <button
            type="button"
            className="scratchpad-close-btn mono"
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕ Esc
          </button>
        </div>

        {/* Status Notification Banner */}
        {bannerMsg && (
          <div className="scratchpad-banner mono">
            {bannerMsg}
          </div>
        )}

        {/* Course Tag Selector */}
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
        </div>

        {/* Main Note Canvas */}
        <div className="scratchpad-editor-wrap">
          <textarea
            ref={textareaRef}
            className="scratchpad-textarea mono"
            value={currentContent}
            onChange={handleTextChange}
            placeholder={`Jot lecture notes, lab findings, or quotes for ${activeTag}...\n\n- Highlight text & click "⚡ Create Anki Card" to build flashcards\n- Click "★ Send to Friday Synthesis" to push directly into Evidence Bank\n- Auto-saves locally in browser`}
            spellCheck={false}
          />
        </div>

        {/* Footer & Metrics */}
        <div className="scratchpad-footer">
          <div className="scratchpad-metrics mono">
            <span>{words} {words === 1 ? "word" : "words"}</span>
            <span className="dot-sep">·</span>
            <span>{chars} chars</span>
            <span className="dot-sep">·</span>
            <span className={`save-indicator ${savedPing ? "saving" : ""}`}>
              {savedPing ? "Saving..." : "Saved"}
            </span>
          </div>

          <div className="scratchpad-actions mono">
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
              title="Download as .txt"
            >
              ⬇ Export
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
