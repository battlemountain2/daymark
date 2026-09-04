"use client";

import React, { useState, useEffect, useRef } from "react";

interface ScratchpadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTag?: string;
}

const DEFAULT_TAGS = [
  { id: "General", label: "General", ck: "adm" },
  { id: "POLS 2120", label: "POLS 2120", ck: "pol" },
  { id: "HIST 300", label: "HIST 300", ck: "his" },
  { id: "GEOG 1160", label: "GEOG 1160", ck: "geo" },
  { id: "GEOG 1150", label: "GEOG 1150", ck: "geo" },
  { id: "PHED 2996", label: "PHED 2996", ck: "fit" },
];

const STORAGE_KEY = "hb:scratchpad:v2";

export default function ScratchpadDrawer({ isOpen, onClose, defaultTag = "General" }: ScratchpadDrawerProps) {
  const [activeTag, setActiveTag] = useState<string>(defaultTag);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return { General: "" };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      // Legacy fallback
      const old = localStorage.getItem("hb:scratchpad:notes");
      if (old) return { General: old };
    } catch {}
    return { General: "" };
  });

  const [copied, setCopied] = useState(false);
  const [savedPing, setSavedPing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync defaultTag if provided
  useEffect(() => {
    if (defaultTag && DEFAULT_TAGS.some(t => t.id === defaultTag)) {
      setActiveTag(defaultTag);
    }
  }, [defaultTag]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTag]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
            <h3 className="scratchpad-title">Quick Brain Dump</h3>
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
            placeholder={`Jot quick thoughts, seminar questions, or assignment reminders for ${activeTag}...\n\n- Stored automatically in browser\n- Accessible anytime with ⌘J\n- Export as .txt or copy directly`}
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
              {savedPing ? "Saving..." : "Saved locally"}
            </span>
          </div>

          <div className="scratchpad-actions mono">
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
      </div>
    </div>
  );
}
