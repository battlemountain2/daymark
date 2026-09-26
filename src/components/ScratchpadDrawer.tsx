"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Flashcard } from "@/lib/study-hub-types";
import type { EvidenceItem } from "@/components/EvidenceBank";
import type { VaultNote } from "@/lib/vault";

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
const WIDTH_STORAGE_KEY = "hb:scratchpad-width";
const DEFAULT_DRAWER_WIDTH = 580;

export default function ScratchpadDrawer({ isOpen, onClose, defaultTag = "General" }: ScratchpadDrawerProps) {
  const [activeTag, setActiveTag] = useState<string>(defaultTag);
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("edit");
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

  // Resizable Drawer & Fullscreen State
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_DRAWER_WIDTH;
    const saved = localStorage.getItem(WIDTH_STORAGE_KEY);
    return saved ? Math.max(420, parseInt(saved, 10)) : DEFAULT_DRAWER_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Notifications & State Feedback
  const [copied, setCopied] = useState(false);
  const [savedPing, setSavedPing] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [isHandoffRunning, setIsHandoffRunning] = useState(false);

  // Vault History Explorer
  const [vaultNotes, setVaultNotes] = useState<VaultNote[]>([]);
  const [selectedVaultNoteId, setSelectedVaultNoteId] = useState<string>("draft");

  // Inline Copilot State
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // Speech-to-Text Dictation State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 1-Click Anki Card Composer Modal
  const [showAnkiModal, setShowAnkiModal] = useState(false);
  const [ankiFront, setAnkiFront] = useState("");
  const [ankiBack, setAnkiBack] = useState("");
  const [ankiSource, setAnkiSource] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Sync defaultTag if provided
  useEffect(() => {
    if (defaultTag && DEFAULT_TAGS.some(t => t.id === defaultTag)) {
      setActiveTag(defaultTag);
    }
  }, [defaultTag]);

  // Load vault notes for the active course
  const loadVaultHistory = useCallback(async (course: string) => {
    try {
      const res = await fetch(`/api/vault?course=${encodeURIComponent(course)}`);
      if (res.ok) {
        const data = await res.json();
        setVaultNotes(data.notes || []);
      }
    } catch (e) {
      console.warn("Could not fetch vault history", e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadVaultHistory(activeTag);
      setSelectedVaultNoteId("draft");
    }
  }, [isOpen, activeTag, loadVaultHistory]);

  // Focus textarea when opened in edit or split mode
  useEffect(() => {
    if (isOpen && !showAnkiModal && viewMode !== "preview") {
      const t = setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTag, showAnkiModal, viewMode]);

  // Handle Drag Resizing
  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(420, Math.min(window.innerWidth - 30, window.innerWidth - e.clientX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(WIDTH_STORAGE_KEY, drawerWidth.toString());
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, drawerWidth]);

  const handleResetResizer = () => {
    setDrawerWidth(DEFAULT_DRAWER_WIDTH);
    localStorage.setItem(WIDTH_STORAGE_KEY, DEFAULT_DRAWER_WIDTH.toString());
  };

  // Keyboard Shortcuts (Escape to close, Cmd+Enter for Handoff)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAnkiModal) {
          setShowAnkiModal(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showAnkiModal, isFullscreen]);

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

  // 🎙️ Web Speech API Dictation
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setBannerMsg("🎙️ Dictation active: Speak to add notes...");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + " ";
          }
        }
        if (transcript.trim()) {
          const updatedText = currentContent
            ? `${currentContent.trim()}\n- ${transcript.trim()}`
            : `- ${transcript.trim()}`;
          const updated = { ...notes, [activeTag]: updatedText };
          setNotes(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          setBannerMsg(`🎙️ Dictated: "${transcript.trim().slice(0, 45)}..."`);
          setTimeout(() => setBannerMsg(null), 3000);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error", e);
        setIsListening(false);
        setBannerMsg("⚠️ Speech recognition interrupted.");
        setTimeout(() => setBannerMsg(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Dictation start error", e);
      setIsListening(false);
    }
  };

  // 💬 Inline Ask Copilot
  const handleAskCopilot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotQuery.trim() || isCopilotLoading) return;

    setIsCopilotLoading(true);
    setBannerMsg("⚡ Asking Copilot...");

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ask_copilot",
          course: activeTag,
          query: copilotQuery.trim(),
          noteContext: currentContent,
        }),
      });

      if (!res.ok) throw new Error("Copilot API failed");
      const data = await res.json();
      setCopilotAnswer(data.answer || "No response received.");
      setBannerMsg(null);
    } catch (err) {
      console.error("Ask Copilot error", err);
      setCopilotAnswer("Could not reach Copilot. Please verify network or API keys.");
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const handleInsertCopilotAnswer = () => {
    if (!copilotAnswer) return;
    const snippet = `\n\n> [!TIP] Copilot Q&A: ${copilotQuery.trim()}\n> ${copilotAnswer}\n`;
    const updated = { ...notes, [activeTag]: (currentContent + snippet).trim() };
    setNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCopilotAnswer(null);
    setCopilotQuery("");
    setBannerMsg("✓ Inserted Copilot answer into note!");
    setTimeout(() => setBannerMsg(null), 2500);
  };

  // 🗂️ Switch between Vault History and Draft
  const handleVaultNoteSelect = (noteId: string) => {
    setSelectedVaultNoteId(noteId);
    if (noteId === "draft") {
      // Return to local working draft
      return;
    }
    const found = vaultNotes.find(n => n.id === noteId);
    if (found) {
      const updated = { ...notes, [activeTag]: found.rawBody || found.content };
      setNotes(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setBannerMsg(`📂 Loaded vault note: ${found.title}`);
      setTimeout(() => setBannerMsg(null), 3000);
    }
  };

  const handleNewNoteDraft = () => {
    if (currentContent.trim() && !window.confirm("Start fresh note for today? Current draft will be preserved in vault upon handoff.")) {
      return;
    }
    const updated = { ...notes, [activeTag]: "" };
    setNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSelectedVaultNoteId("draft");
    setBannerMsg(`✦ Started fresh note draft for ${activeTag}`);
    setTimeout(() => setBannerMsg(null), 2500);
  };

  const handleCopy = async () => {
    if (!currentContent) return;
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  // 1-Click Obsidian Vault Export
  const handleExport = () => {
    if (!currentContent) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `${dateStr}-${activeTag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.md`;

    let exportText = currentContent;
    if (!exportText.startsWith("---")) {
      const fm = [
        `---`,
        `title: "${activeTag} Lecture Notes"`,
        `course: "${activeTag}"`,
        `date: "${dateStr}"`,
        `week: 5`,
        `tags: ["lecture", "${activeTag.toLowerCase().replace(/\s+/g, "-")}"]`,
        `vault: "Obsidian"`,
        `---`,
        ``,
      ].join("\n");
      exportText = fm + exportText;
    }

    const blob = new Blob([exportText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBannerMsg(`⬇ Exported ${filename} for Obsidian!`);
    setTimeout(() => setBannerMsg(null), 3000);
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
        loadVaultHistory(activeTag);
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
            return <blockquote key={idx} className="obs-quote">{trimmed.slice(2)}</blockquote>;
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
        ref={drawerRef}
        className={`scratchpad-drawer ${isFullscreen ? "fullscreen" : ""}`}
        style={!isFullscreen ? { width: `${drawerWidth}px` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Resizer Drag Handle (Only when not in fullscreen) */}
        {!isFullscreen && (
          <div
            className={`scratchpad-resizer ${isResizing ? "dragging" : ""}`}
            onMouseDown={handleMouseDownResizer}
            onDoubleClick={handleResetResizer}
            title="Drag to resize width (double-click to reset)"
          />
        )}

        {/* Drawer Header */}
        <div className="scratchpad-header">
          <div className="scratchpad-title-group">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="scratchpad-badge mono">⌘J Academic Vault</span>
              {/* Vault Note Switcher Dropdown */}
              <select
                className="scratchpad-vault-select mono"
                value={selectedVaultNoteId}
                onChange={(e) => handleVaultNoteSelect(e.target.value)}
                title="Switch between current draft and saved vault notes"
              >
                <option value="draft">● Current Draft</option>
                {vaultNotes.map((vn) => (
                  <option key={vn.id} value={vn.id}>
                    {vn.date} · {vn.title.slice(0, 22)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="scratchpad-tag-btn mono"
                style={{ padding: "2px 7px", fontSize: 10 }}
                onClick={handleNewNoteDraft}
                title="Start a fresh note draft for today"
              >
                + New
              </button>
            </div>
            <h3 className="scratchpad-title">Course-Aware Lecture Vault</h3>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* View Mode Toggle: Edit vs Split vs Obsidian Preview */}
            <div className="obs-mode-toggle mono">
              <button
                type="button"
                className={`obs-btn ${viewMode === "edit" ? "active" : ""}`}
                onClick={() => setViewMode("edit")}
                title="Editor Mode"
              >
                ✎ Edit
              </button>
              <button
                type="button"
                className={`obs-btn ${viewMode === "split" ? "active" : ""}`}
                onClick={() => setViewMode("split")}
                title="Split Side-by-Side Mode"
              >
                🗗 Split
              </button>
              <button
                type="button"
                className={`obs-btn ${viewMode === "preview" ? "active" : ""}`}
                onClick={() => setViewMode("preview")}
                title="Rendered Obsidian View"
              >
                ✦ Obsidian
              </button>
            </div>

            {/* Fullscreen / Zen Toggle */}
            <button
              type="button"
              className="scratchpad-close-btn mono"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Restore normal size" : "Zen Fullscreen Mode"}
            >
              {isFullscreen ? "🗗 Restore" : "⛶ Full"}
            </button>

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

        {/* Course Tag Selector & Quick AI Prompt Helpers */}
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

          <div className="ai-handoff-chips mono">
            <button
              type="button"
              className="ai-chip gemini"
              onClick={() => handleCopyAIPrompt("Gemini")}
              title="Copy formatted syllabus prompt for Google Gemini"
            >
              🔵 Gemini
            </button>
            <button
              type="button"
              className="ai-chip gpt"
              onClick={() => handleCopyAIPrompt("ChatGPT")}
              title="Copy formatted syllabus prompt for ChatGPT"
            >
              🟢 ChatGPT
            </button>
          </div>
        </div>

        {/* Main Note Canvas / Preview / Split View */}
        <div className={`scratchpad-editor-wrap ${viewMode === "split" ? "split-view" : ""}`}>
          {viewMode === "edit" ? (
            <textarea
              ref={textareaRef}
              className="scratchpad-textarea mono"
              value={currentContent}
              onChange={handleTextChange}
              placeholder={`Jot raw lecture notes, lab findings, or quotes for ${activeTag}...\n\n- Tap "🚀 Handoff to Agent" to enrich with syllabus context & Anki cards\n- Use [[Concept]] for Obsidian-style bi-directional links\n- Auto-saved directly to local Markdown vault`}
              spellCheck={false}
            />
          ) : viewMode === "split" ? (
            <>
              <textarea
                ref={textareaRef}
                className="scratchpad-textarea mono"
                value={currentContent}
                onChange={handleTextChange}
                placeholder={`Writing live in Split Mode for ${activeTag}...`}
                spellCheck={false}
              />
              <div className="obsidian-preview-pane">
                {renderObsidianPreview(currentContent)}
              </div>
            </>
          ) : (
            <div className="obsidian-preview-pane">
              {renderObsidianPreview(currentContent)}
            </div>
          )}
        </div>

        {/* Inline Ask Copilot Bar */}
        <div className="scratchpad-copilot-bar mono">
          {copilotAnswer && (
            <div className="scratchpad-copilot-answer-card">
              <div className="scratchpad-copilot-answer-head">
                <span>✦ Copilot Insight ({activeTag})</span>
                <div className="scratchpad-copilot-answer-actions">
                  <button
                    type="button"
                    className="scratchpad-copilot-insert-btn"
                    onClick={handleInsertCopilotAnswer}
                  >
                    + Insert into note
                  </button>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
                    onClick={() => setCopilotAnswer(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div>{renderWithWikiLinks(copilotAnswer)}</div>
            </div>
          )}

          <form className="scratchpad-copilot-input-row" onSubmit={handleAskCopilot}>
            <input
              type="text"
              className="scratchpad-copilot-input mono"
              placeholder={`Ask Copilot quick question about ${activeTag}...`}
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
            />
            <button
              type="submit"
              className="scratchpad-copilot-submit"
              disabled={!copilotQuery.trim() || isCopilotLoading}
            >
              {isCopilotLoading ? "⚡ Querying..." : "⚡ Ask Copilot"}
            </button>
          </form>
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
            {/* 🎙️ Voice Dictation Button */}
            <button
              type="button"
              className={`scratchpad-act-btn dictate ${isListening ? "listening" : ""}`}
              onClick={toggleListening}
              title={isListening ? "Stop voice dictation" : "Start live voice dictation (speech-to-text)"}
            >
              {isListening ? "🎙️ Listening..." : "🎙️ Dictate"}
            </button>

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
                <button
                  type="button"
                  className="anki-modal-close"
                  onClick={() => setShowAnkiModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAnkiCard} className="anki-modal-body">
                <div className="anki-field">
                  <label className="mono anki-label">Front (Question / Prompt):</label>
                  <textarea
                    className="anki-input mono"
                    rows={3}
                    value={ankiFront}
                    onChange={(e) => setAnkiFront(e.target.value)}
                    placeholder="Enter question or concept to test..."
                    required
                  />
                </div>

                <div className="anki-field">
                  <label className="mono anki-label">Back (Answer / Definition):</label>
                  <textarea
                    className="anki-input mono"
                    rows={4}
                    value={ankiBack}
                    onChange={(e) => setAnkiBack(e.target.value)}
                    placeholder="Enter the concise verified answer..."
                    required
                  />
                </div>

                <div className="anki-field">
                  <label className="mono anki-label">Source Citation:</label>
                  <input
                    type="text"
                    className="anki-input-inline mono"
                    value={ankiSource}
                    onChange={(e) => setAnkiSource(e.target.value)}
                  />
                </div>

                <div className="anki-modal-actions mono">
                  <button
                    type="button"
                    className="anki-btn cancel"
                    onClick={() => setShowAnkiModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="anki-btn save"
                    disabled={!ankiFront.trim() || !ankiBack.trim()}
                  >
                    ⚡ Push to Active Deck
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
