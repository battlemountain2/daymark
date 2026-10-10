"use client";
import { cloudStorage, getCloudStatus } from "@/lib/cloud-storage";


import {noteIndex, resolveWiki, wikiReference, backlinks, noteReference, renameNotebook, type LinkableNote} from "@/lib/notebook-links";
import {NOTEBOOK_KEY,editNotebookNote,noteTitle,type NotebookNote} from "@/lib/notebook";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {usePersonalRecords} from "@/lib/use-personal-records";
import { useCloudRevision } from "@/lib/use-cloud-revision";
import {inlineNoteParts} from '@/lib/note-links';
import type { Flashcard } from "@/lib/study-hub-types";
import type { EvidenceItem } from "@/components/EvidenceBank";
import {renderObsidianPreview,renderWithWikiLinks} from "./NotebookPreview";
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
const SIDEBAR_STORAGE_KEY = "hb:scratchpad-sidebar";
const DEFAULT_DRAWER_WIDTH = 1000;

export default function ScratchpadDrawer({ isOpen, onClose, defaultTag = "General" }: ScratchpadDrawerProps) {
  const cloudRevision = useCloudRevision();
  const notebook = usePersonalRecords<NotebookNote>(NOTEBOOK_KEY);
  const [editingContent,setEditingContent] = useState<string|null>(null);
  const pendingEdit = useRef(false);
  const connectedCards=usePersonalRecords<Flashcard>("hb:custom-anki-cards");
  const noteLinks=usePersonalRecords<{from:string;to:string;highlight?:string}>("daymark:note-links");
  const passages=usePersonalRecords<{file:string;page:number;quote?:string;comment?:string}>("daymark:highlights");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTag, setActiveTag] = useState<string>(defaultTag);
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("edit");
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return { General: "" };
    try {
      const saved = cloudStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      const old = cloudStorage.getItem("hb:scratchpad:notes");
      if (old) return { General: old };
    } catch {}
    return { General: "" };
  });

  // Resizable Drawer & Fullscreen State
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_DRAWER_WIDTH;
    const saved = cloudStorage.getItem(WIDTH_STORAGE_KEY);
    return saved ? Math.max(450, parseInt(saved, 10)) : DEFAULT_DRAWER_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sidebar State
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = cloudStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved !== null ? saved === "true" : true;
  });
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [allVaultNotes, setAllVaultNotes] = useState<VaultNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("draft");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Notifications & State Feedback
  const [copied, setCopied] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [isHandoffRunning, setIsHandoffRunning] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);
  const [cloudMessage, setCloudMessage] = useState("Draft saved on this device");
  const saveId = useRef<string | null>(null);
  useEffect(() => {
    const update = () => setCloudMessage(getCloudStatus().message);
    update(); window.addEventListener("daymark:sync-status", update);
    return () => window.removeEventListener("daymark:sync-status", update);
  }, []);

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

  const [titleEdit, setTitleEdit] = useState("");
  const [linkQuery, setLinkQuery] = useState<{start:number; end:number; query:string}|null>(null);
  const [linkChoice, setLinkChoice] = useState(0);
  const [ambiguousLinks, setAmbiguousLinks] = useState<LinkableNote[]>([]);
  const navigation = useRef<{course:string; id:string; content?:string}[]>([]);
  const navPosition = useRef(-1);
  const [navState,setNavState] = useState({back:false,forward:false});
  const searchRef = useRef<HTMLInputElement>(null);
  const closeAction = useRef(onClose);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    try { const saved = JSON.parse(cloudStorage.getItem(STORAGE_KEY) || "null"); if (saved) setNotes(saved); } catch {}
  }, [cloudRevision]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.innerWidth < 600) setShowSidebar(false);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const root = dialogRef.current?.querySelector('[aria-label="Create flashcard"]') || dialogRef.current;
      const controls = Array.from(root?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [isOpen]);

  // Sync defaultTag if provided
  useEffect(() => {
    if (defaultTag) {
      if(pendingEdit.current && !latestCommit.current(latestContent.current)) return;
      setActiveTag(defaultTag);
      setSelectedNoteId("draft");
      setEditingContent(null);
    }
  }, [defaultTag]);

  // Load All Vault Notes for Sidebar
  const loadAllVaultNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        const data = await res.json();
        setAllVaultNotes(data.notes || []);
      }
    } catch (e) {
      console.warn("Could not fetch vault notes", e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAllVaultNotes();
    }
  }, [isOpen, loadAllVaultNotes]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !showAnkiModal && viewMode !== "preview") {
      const t = setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTag, showAnkiModal, viewMode]);

  // Toggle Sidebar with auto-width adjustment
  const handleToggleSidebar = () => {
    const nextState = !showSidebar;
    setShowSidebar(nextState);
    cloudStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState));

    if (nextState && drawerWidth < 740 && !isFullscreen) {
      setDrawerWidth(760);
      cloudStorage.setItem(WIDTH_STORAGE_KEY, "760");
    }
  };

  // Handle Drag Resizing
  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const minW = showSidebar ? 560 : 420;
      const newWidth = Math.max(minW, Math.min(window.innerWidth - 30, window.innerWidth - e.clientX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      cloudStorage.setItem(WIDTH_STORAGE_KEY, drawerWidth.toString());
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, drawerWidth, showSidebar]);

  const handleResetResizer = () => {
    setDrawerWidth(DEFAULT_DRAWER_WIDTH);
    cloudStorage.setItem(WIDTH_STORAGE_KEY, DEFAULT_DRAWER_WIDTH.toString());
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        if (showAnkiModal) {
          setShowAnkiModal(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          closeAction.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showAnkiModal, isFullscreen]);

  const currentContent = editingContent ?? notebook.records[selectedNoteId]?.content ?? notes[activeTag] ?? "";
  const currentTitle = notebook.records[selectedNoteId]?.title || noteTitle(currentContent);
  useEffect(() => { setTitleEdit(currentTitle === "Untitled note" ? "" : currentTitle); }, [selectedNoteId, currentTitle]);
  const index = noteIndex(notebook.records,notes);
  const linkableNotes = [...index, ...allVaultNotes.filter(n=>!index.some(item=>item.id===n.id)).map(n=>({id:n.id,title:n.title,course:n.course,content:n.rawBody||n.content,kind:"vault" as const}))];
  const linkSuggestions = linkQuery ? linkableNotes.filter(n=>n.id!==selectedNoteId&&`${n.title} ${n.course}`.toLowerCase().includes(linkQuery.query.toLowerCase())).slice(0,7) : [];
  const noteIdentity = notebook.records[selectedNoteId] ? selectedNoteId : activeTag;
  const courses = Array.from(new Set([...DEFAULT_TAGS.map(t=>t.id),...Object.keys(notes),...Object.values(notebook.records).map(n=>n.course),...allVaultNotes.map(n=>n.course),activeTag]));
  function persistDraft(course:string,content:string) {
    const latest = JSON.parse(cloudStorage.getItem(STORAGE_KEY)||"{}");
    const next = {...latest,[course]:content};
    cloudStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    setNotes(next);
  }
  function commitContent(content:string) {
    setEditingContent(content);
    pendingEdit.current = true;
    if (selectedNoteId === "draft" && !content.trim()) {
      try { persistDraft(activeTag,content); pendingEdit.current = false; return true; } catch { setBannerMsg("Could not save on this device. Copy your text before leaving."); return false; }
    }
    const id = notebook.records[selectedNoteId] ? selectedNoteId : `note-${crypto.randomUUID()}`;
    const saved = notebook.update(id,current=>editNotebookNote(id,activeTag,content,current));
    if (saved) {
      pendingEdit.current = false;
      setSelectedNoteId(id);
      setEditingContent(null);
      // Keep an empty capture inbox above the saved entry. Save the entry first.
      if(selectedNoteId === "draft") try { persistDraft(activeTag,""); } catch { setBannerMsg("Note saved; the old draft is also retained on this device."); }
    }
    return saved;
  }
  closeAction.current = () => { if(pendingEdit.current && !commitContent(currentContent)) return; setLinkQuery(null); onClose(); };
  const latestContent = useRef(currentContent);
  latestContent.current = currentContent;
  const latestCommit = useRef(commitContent);
  latestCommit.current = commitContent;
  function saveNote() {
    if(currentContent.trim()&&commitContent(currentContent)) { setBannerMsg("Note saved. Changes continue to autosave."); }
  }
  const saveCopyToVault = async () => {
    setIsSavingVault(true);
    saveId.current ||= crypto.randomUUID();
    try {
      const res = await fetch("/api/vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", id: saveId.current, course: activeTag, title: `${activeTag} Lecture Note`, content: currentContent }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      saveId.current = null;
      setBannerMsg("Saved a copy to your cloud Vault.");
      await loadAllVaultNotes();
    } catch (error) { setBannerMsg(error instanceof Error ? error.message : "Save failed; draft remains on this device."); }
    finally { setIsSavingVault(false); }
  };

  function updateLinkQuery(el: HTMLTextAreaElement) {
    const cursor = el.selectionStart, before = el.value.slice(0,cursor), start = before.lastIndexOf("[["), query = before.slice(start + 2);
    if(start >= 0 && !/[\]\n]/.test(query) && !before.slice(start).includes("]]")) { setLinkQuery({start,end:cursor,query}); setLinkChoice(0); } else setLinkQuery(null);
  }
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { commitContent(e.target.value); updateLinkQuery(e.target); };
  function insertNoteLink(note: LinkableNote) {
    if(!linkQuery) return;
    const suffix = currentContent.slice(linkQuery.end).replace(/^\]\]/,"");
    const text = `[[${noteReference(note,linkableNotes,activeTag)}]]`;
    if(commitContent(currentContent.slice(0,linkQuery.start)+text+suffix)) {
      const cursor = linkQuery.start + text.length;
      setLinkQuery(null);
      requestAnimationFrame(()=>{textareaRef.current?.focus();textareaRef.current?.setSelectionRange(cursor,cursor);});
    }
  }
  function editorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if(!linkQuery) return;
    if(e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setLinkQuery(null); }
    if(e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setLinkChoice(previous=>Math.max(0,Math.min(linkSuggestions.length-1,previous+(e.key === "ArrowDown" ? 1 : -1)))); }
    if(e.key === "Enter" && linkSuggestions[linkChoice]) { e.preventDefault(); insertNoteLink(linkSuggestions[linkChoice]); }
  }

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
          const updatedText = latestContent.current
            ? `${latestContent.current.trim()}\n- ${transcript.trim()}`
            : `- ${transcript.trim()}`;
          latestCommit.current(updatedText);
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
    commitContent((currentContent + snippet).trim());
    setCopilotAnswer(null);
    setCopilotQuery("");
    setBannerMsg("✓ Inserted Copilot answer into note!");
    setTimeout(() => setBannerMsg(null), 2500);
  };

  // 🗂️ Select Note from Sidebar
  const handleSelectNote = (course: string, noteId: string, noteContent?: string, remember = true) => {
    if(pendingEdit.current && !commitContent(currentContent)) return;
    if(remember) {
      if(navPosition.current < 0) { navigation.current=[{course:activeTag,id:selectedNoteId,content:editingContent ?? undefined}]; navPosition.current=0; }
      navigation.current=navigation.current.slice(0,navPosition.current+1);
      const last=navigation.current[navPosition.current];
      if(last?.id!==noteId || last?.course!==course) { navigation.current.push({course,id:noteId,content:noteContent}); navPosition.current++; }
    }
    setNavState({back:navPosition.current>0,forward:navPosition.current<navigation.current.length-1});
    setActiveTag(course); setSelectedNoteId(noteId); setEditingContent(noteContent ?? null);
    setLinkQuery(null); setAmbiguousLinks([]); setBannerMsg(null);
    if (window.innerWidth < 600) setShowSidebar(false);
  };
  function navigateNote(direction: number) {
    if(pendingEdit.current && !commitContent(currentContent)) return;
    const position=navPosition.current+direction, target=navigation.current[position];
    if(!target) return;
    navPosition.current=position;
    handleSelectNote(target.course,target.id,target.content,false);
  }
  function createNote(title = "", targetCourse = activeTag) {
    const id=`note-${crypto.randomUUID()}`;
    const entry={...editNotebookNote(id,targetCourse,""),title:title.trim()||"Untitled note",customTitle:true};
    if(!notebook.write(id,entry)) return null;
    return {...entry,kind:"note" as const};
  }
  const handleNewNoteDraft = (targetCourse?: string) => {
    if(pendingEdit.current && !commitContent(currentContent)) return;
    const note=createNote("",targetCourse||activeTag);
    if(note) { handleSelectNote(note.course,note.id); setViewMode("edit"); requestAnimationFrame(()=>dialogRef.current?.querySelector<HTMLInputElement>('[aria-label="Note title"]')?.focus()); }
  };
  function openLinkedNote(note: LinkableNote) { handleSelectNote(note.course,note.kind === "draft" ? "draft" : note.id,note.kind === "vault" ? note.content : undefined); }
  function openWiki(reference: string) {
    const matches=resolveWiki(reference,linkableNotes,activeTag);
    if(matches.length===1) { openLinkedNote(matches[0]); return; }
    if(matches.length>1) { setAmbiguousLinks(matches); return; }
    const title=wikiReference(reference).target;
    if(!title) return;
    if(pendingEdit.current && !commitContent(currentContent)) return;
    const note=createNote(title);
    if(note) openLinkedNote(note);
  }
  const previewOptions = {onWikiLink:openWiki,wikiState:(reference:string):"known"|"missing"|"ambiguous"=>{const count=resolveWiki(reference,linkableNotes,activeTag).length;return count===1?"known":count>1?"ambiguous":"missing";}};
  function saveTitle() {
    const title=titleEdit.trim();
    if(!title || (title===currentTitle && notebook.records[selectedNoteId]?.customTitle)) return;
    const current=notebook.records[selectedNoteId];
    if(!current) { if(pendingEdit.current && !commitContent(currentContent)) return; const entry={...editNotebookNote(`note-${crypto.randomUUID()}`,activeTag,currentContent),title,customTitle:true}; if(notebook.write(entry.id,entry)) { setSelectedNoteId(entry.id); setEditingContent(null); if(selectedNoteId === "draft") { try { persistDraft(activeTag,""); } catch {} } } return; }
    if(!notebook.updateAll(latest=>renameNotebook(latest,current.id,title,notes))) setBannerMsg("Could not rename your note. Please try again.");
  }
  const incoming = backlinks(noteIdentity,linkableNotes);

  const toggleFolder = (course: string) => {
    setCollapsedFolders(prev => ({ ...prev, [course]: !prev[course] }));
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
    const filename = `${currentTitle.replace(/[\\/:*?"<>|]/g,"-") || "Untitled note"}.md`;

    let exportText = currentContent;
    if (!exportText.startsWith("---")) {
      const fm = [
        `---`,
        `title: ${JSON.stringify(currentTitle)}`,
        `course: ${JSON.stringify(activeTag)}`,
        `date: "${dateStr}"`,
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
      commitContent("");
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
      sourceNote: noteIdentity,
      source: ankiSource.trim() || `${activeTag}`,
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
      const stored = cloudStorage.getItem("hb:custom-anki-cards");
      const list: Flashcard[] = stored ? JSON.parse(stored) : [];
      list.unshift(newCard);
      cloudStorage.setItem("hb:custom-anki-cards", JSON.stringify(list));
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
      const stored = cloudStorage.getItem("hb:custom-synthesis-evidence");
      const list: EvidenceItem[] = stored ? JSON.parse(stored) : [];
      list.unshift(item);
      cloudStorage.setItem("hb:custom-synthesis-evidence", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("custom-evidence-updated"));

      setBannerMsg(`★ Pushed to Friday 8:00 PM Evidence Bank!`);
      setTimeout(() => setBannerMsg(null), 3500);
    } catch (err) {
      console.error("Failed to push evidence", err);
    }
  };

  // 🚀 Handoff to Agent
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
        commitContent(data.enrichedMarkdown);

        // Inject mined Anki cards into active deck
        if (data.generatedCards && data.generatedCards.length > 0) {
          const stored = cloudStorage.getItem("hb:custom-anki-cards");
          const list: Flashcard[] = stored ? JSON.parse(stored) : [];
          const combined = [...data.generatedCards, ...list];
          cloudStorage.setItem("hb:custom-anki-cards", JSON.stringify(combined));
          window.dispatchEvent(new CustomEvent("custom-anki-updated"));
        }

        setViewMode("preview");
        const providerBadge = data.provider ? ` [${data.provider}]` : "";
        setBannerMsg(`✓${providerBadge} Enriched notes & generated ${data.generatedCards?.length || 0} Anki cards!`);
        setTimeout(() => setBannerMsg(null), 4000);
        loadAllVaultNotes();
      }
    } catch (err) {
      console.error("Agent handoff error", err);
      setBannerMsg("⚠️ Agent handoff failed. Notes preserved locally.");
      setTimeout(() => setBannerMsg(null), 3500);
    } finally {
      setIsHandoffRunning(false);
    }
  };

  // Metrics
  const shortcutActions=useRef({newNote:handleNewNoteDraft,save:saveNote});
  shortcutActions.current={newNote:handleNewNoteDraft,save:saveNote};
  useEffect(()=>{
    if(!isOpen)return;
    const shortcuts=(event:KeyboardEvent)=>{
      if(showAnkiModal || !(event.metaKey||event.ctrlKey))return;
      if(event.key.toLowerCase()==="n"){event.preventDefault();shortcutActions.current.newNote();}
      if(event.key.toLowerCase()==="s"){event.preventDefault();shortcutActions.current.save();}
      if(event.key.toLowerCase()==="o"){event.preventDefault();setShowSidebar(true);requestAnimationFrame(()=>searchRef.current?.focus());}
    };
    window.addEventListener("keydown",shortcuts);
    return ()=>window.removeEventListener("keydown",shortcuts);
  },[isOpen,showAnkiModal]);

  const words = currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0;
  const chars = currentContent.length;

  if (!isOpen) return null;

  return (
    <div ref={dialogRef} className="scratchpad-overlay" onClick={()=>closeAction.current()} role="dialog" aria-modal="true" aria-label="Notebook">
      <div
        className={`scratchpad-drawer ${isFullscreen ? "fullscreen" : ""} ${isResizing ? "resizing" : ""}`}
        style={!isFullscreen ? { width: `min(${drawerWidth}px, 100vw)` } : undefined}
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
              {/* Sidebar Explorer Toggle */}
              <button
                type="button"
                className={`sidebar-toggle-btn mono ${showSidebar ? "active" : ""}`}
                onClick={handleToggleSidebar}
                title={showSidebar ? "Hide Vault Sidebar" : "Show Vault Sidebar"}
              >
                {showSidebar ? "Hide notes" : "Notes"}
              </button>
              <span className="scratchpad-badge mono">Notebook</span>
            </div>
            <label className="notebook-selector">Course<select aria-label="Notebook course" value={activeTag} onChange={e=>handleSelectNote(e.target.value,"draft")}>{courses.map(key=><option key={key} value={key}>{key}</option>)}</select></label>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" onClick={()=>handleNewNoteDraft()}>+ New note</button>
            {/* View Mode Toggle: Edit vs Split vs Preview */}
            <div className="obs-mode-toggle mono">
              <button
                type="button"
                className={`obs-btn ${viewMode === "edit" ? "active" : ""}`}
                onClick={() => setViewMode("edit")}
                title="Editor Mode"
              >
                Write
              </button>
              <button
                type="button"
                className={`obs-btn ${viewMode === "split" ? "active" : ""}`}
                onClick={() => setViewMode("split")}
                title="Split Side-by-Side Mode"
              >
                Split
              </button>
              <button
                type="button"
                className={`obs-btn ${viewMode === "preview" ? "active" : ""}`}
                onClick={() => setViewMode("preview")}
                title="Rendered Obsidian View"
              >
                Read
              </button>
            </div>

            {/* Fullscreen / Zen Toggle */}
            <button
              type="button"
              className="scratchpad-close-btn mono"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Restore normal size" : "Zen Fullscreen Mode"}
            >
              {isFullscreen ? "Restore" : "Full screen"}
            </button>

            <button
              type="button"
              className="scratchpad-close-btn mono"
              onClick={()=>closeAction.current()}
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

        {/* Dual-Pane Body (Sidebar + Main Canvas) */}
        <div className="scratchpad-body-container">
          {/* 🗂️ VAULT EXPLORER SIDEBAR */}
          {showSidebar && (
            <aside className="scratchpad-sidebar mono">
              <div className="sidebar-head">
                <span className="sidebar-head-title">Saved notes</span>
                <button
                  type="button"
                  className="scratchpad-tag-btn mono"
                  style={{ padding: "2px 7px", fontSize: 10 }}
                  onClick={() => handleNewNoteDraft()}
                  title="Start a fresh draft for this course"
                >
                  + New Note
                </button>
              </div>

              {/* Sidebar Search Bar */}
              <div className="sidebar-search">
                <input
                  type="text"
                  ref={searchRef}
                  aria-label="Search notes"
                  placeholder="Search notes…"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                />
              </div>

              {/* Folder Navigation */}
              <div className="sidebar-nav-scroll">
                {courses.map(course => {
                  const match = (value:string) => value.replace(/\s+/g,"").toUpperCase() === course.replace(/\s+/g,"").toUpperCase();
                  const query = sidebarSearch.trim().toLowerCase();
                  const entries = Object.values(notebook.records).filter(n=>match(n.course)).sort((a,b)=>b.updatedAt-a.updatedAt);
                  const vault = allVaultNotes.filter(n=>match(n.course));
                  const hasDraft = Boolean(notes[course]?.trim());
                  if(!entries.length&&!vault.length&&!hasDraft) return null;
                  return <div key={course} className="sidebar-folder">
                    <button type="button" className="sidebar-folder-title" aria-expanded={!collapsedFolders[course]} onClick={()=>toggleFolder(course)}><span>{course}</span><span>{entries.length+vault.length+(hasDraft?1:0)}</span></button>
                    {(!collapsedFolders[course]||query)&&<div>
                      {hasDraft&&(!query||notes[course].toLowerCase().includes(query))&&<button type="button" className={`sidebar-note-item ${activeTag===course&&selectedNoteId==='draft'?'active':''}`} onClick={()=>handleSelectNote(course,'draft')}>{noteTitle(notes[course])}<small>Captured</small></button>}
                      {entries.filter(n=>!query||`${n.title} ${n.content}`.toLowerCase().includes(query)).map(n=><button key={n.id} type="button" className={`sidebar-note-item ${selectedNoteId===n.id?'active':''}`} onClick={()=>handleSelectNote(course,n.id)}><span className="sidebar-note-label">{n.title}</span></button>)}
                      {vault.filter(n=>!query||`${n.title} ${n.content}`.toLowerCase().includes(query)).map(n=><button key={n.id} type="button" className={`sidebar-note-item ${selectedNoteId===n.id?'active':''}`} onClick={()=>handleSelectNote(course,n.id,n.rawBody||n.content)}><span className="sidebar-note-label">{n.title.replace(new RegExp(`^${n.date}-?`),"")}</span><small>Study vault</small></button>)}
                    </div>}
                  </div>;
                })}
              </div>
            </aside>
          )}

          {/* MAIN EDITOR & ACTION PANE */}
          <div className="scratchpad-main-pane">
            <div className="notebook-document-heading">
              <div className="notebook-history"><button type="button" aria-label="Previous note" disabled={!navState.back} onClick={()=>navigateNote(-1)}>←</button><button type="button" aria-label="Next note" disabled={!navState.forward} onClick={()=>navigateNote(1)}>→</button><span>{activeTag}</span></div>
              <input aria-label="Note title" placeholder="Untitled note" value={titleEdit} onChange={e=>setTitleEdit(e.target.value)} onBlur={saveTitle} onKeyDown={e=>{if(e.key==="Enter"){saveTitle();textareaRef.current?.focus();}}} />
              <span className="sub">Markdown · type [[ to connect a note</span>
            </div>
            {/* Note Canvas / Preview / Split View */}
            <div className={`scratchpad-editor-wrap ${viewMode === "split" ? "split-view" : ""}`}>
              {viewMode === "edit" ? (
                <textarea
                  ref={textareaRef}
                  className="scratchpad-textarea mono"
                  aria-label="Note body"
                  value={currentContent}
                  onChange={handleTextChange}
                  onClick={e=>updateLinkQuery(e.currentTarget)}
                  onKeyDown={editorKeyDown}
                  onKeyUp={e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key))updateLinkQuery(e.currentTarget);}}
                  placeholder={`Write ${activeTag} notes…`}
                  spellCheck={false}
                />
              ) : viewMode === "split" ? (
                <>
                  <textarea
                    ref={textareaRef}
                    className="scratchpad-textarea mono"
                  aria-label="Note body"
                    value={currentContent}
                    onChange={handleTextChange}
                  onClick={e=>updateLinkQuery(e.currentTarget)}
                  onKeyDown={editorKeyDown}
                  onKeyUp={e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key))updateLinkQuery(e.currentTarget);}}
                    placeholder={`Write ${activeTag} notes…`}
                    spellCheck={false}
                  />
                  <div className="obsidian-preview-pane">
                    {renderObsidianPreview(currentContent,previewOptions)}
                  </div>
                </>
              ) : (
                <div className="obsidian-preview-pane">
                  {renderObsidianPreview(currentContent,previewOptions)}
                </div>
              )}
            </div>

            {linkQuery && viewMode!=="preview" && <div className="notebook-link-suggestions" aria-label="Note link suggestions">
              <span className="sub">Link to a note · ↑ ↓ then Enter</span>
              {linkSuggestions.map((note,i)=><button type="button" key={note.id} className={i===linkChoice?"selected":""} onMouseDown={e=>e.preventDefault()} onClick={()=>insertNoteLink(note)}><strong>{note.title}</strong><small>{note.course}</small></button>)}
              {!linkSuggestions.length&&<span className="sub">Finish [[{linkQuery.query || "Note title"}]] and open it in Read to create the note.</span>}
              <button type="button" onClick={()=>setLinkQuery(null)}>Close suggestions</button>
            </div>}
            {ambiguousLinks.length>0&&<div className="notebook-link-suggestions"><span>Choose the connected note</span>{ambiguousLinks.map(note=><button type="button" key={note.id} onClick={()=>openLinkedNote(note)}>{note.title} · {note.course}</button>)}<button type="button" onClick={()=>setAmbiguousLinks([])}>Cancel</button></div>}
            <details className="notebook-backlinks" open={incoming.length>0}><summary>Backlinks · {incoming.length}</summary>{incoming.length ? incoming.map(note=><button type="button" key={note.id} onClick={()=>openLinkedNote(note)}><strong>{note.title}</strong><small>{note.course}</small></button>) : <p className="sub">Notes that link here with [[{currentTitle}]] will appear here.</p>}</details>

            {/* Inline Ask Copilot Bar */}
            <details className="notebook-tools notebook-copilot"><summary>Ask about this note</summary><div className="scratchpad-copilot-bar mono">
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
                  placeholder={`Ask about ${activeTag}…`}
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

            </details>
            <details className="notebook-tools notebook-connections"><summary>Connected notes & passages</summary><label className="desk-field">Link a note<select aria-label="Link a notebook note" defaultValue="" onChange={e=>{if(e.target.value)noteLinks.write(crypto.randomUUID(),{from:noteIdentity,to:e.target.value});e.target.value='';}}><option value="">Choose a note…</option>{Object.values(notebook.records).filter(n=>n.id!==noteIdentity).map(n=><option key={n.id} value={n.id}>{n.title}</option>)}{Object.keys(notes).filter(key=>key!==noteIdentity&&notes[key]?.trim()).map(key=><option key={key}>{key}</option>)}</select></label>{Object.entries(noteLinks.records).filter(([,l])=>l.from===noteIdentity||l.to===noteIdentity).map(([id,l])=>{const passage=l.highlight?passages.records[l.highlight]:null;const target=l.from===noteIdentity?l.to:l.from;return <p key={id}>{passage?<a href={`/?space=school&reading=${passage.file}&page=${passage.page}&highlight=${l.highlight}`}>Page {passage.page} · source passage ↗</a>:<button onClick={()=>handleSelectNote(notebook.records[target]?.course||target,notebook.records[target]?target:'draft')}>{l.from===noteIdentity?(notebook.records[target]?.title||target):`Linked from ${notebook.records[target]?.title||target}`}</button>} <button onClick={()=>noteLinks.write(id,null)} aria-label="Remove note connection">×</button>{passage?.quote&&<span className="notebook-source-excerpt" style={{display:"block"}}>{passage.quote.length>220?passage.quote.slice(0,220)+"…":passage.quote}</span>}</p>;})}{Object.values(connectedCards.records).filter(c=>c.sourceNote===noteIdentity||Object.values(noteLinks.records).some(l=>l.from===noteIdentity&&l.highlight&&c.id===`highlight-${l.highlight}`)).map(c=><details key={c.id} className="connected-card"><summary>Card · {c.front}</summary><p>{c.back}</p><div className="sub">{inlineNoteParts(c.source.replace(/.*? · (?=\/)/,"Source: ")).map((part,i)=>part.kind==='link'?<a key={i} href={part.url}>{part.text}</a>:<span key={i}>{part.text}</span>)}</div><a href="/study">Cards & review</a></details>)}{noteLinks.error&&<p role="status">{noteLinks.error}</p>}</details>
            {/* Footer & Metrics */}
            <div className="scratchpad-footer">
              <div className="scratchpad-metrics mono">
                <span>{words} {words === 1 ? "word" : "words"}</span>
                <span className="dot-sep">·</span>
                <span>{chars} chars</span>
                <span className="dot-sep">·</span>
                <span className="save-indicator" role="status">{notebook.error || cloudMessage}</span>
              </div>

              <details className="notebook-tools"><summary>Study & export tools</summary><div className="scratchpad-actions mono">
                <button type="button" className="scratchpad-act-btn" disabled={!currentContent.trim() || isSavingVault} onClick={() => void saveCopyToVault()}>{isSavingVault ? "Saving…" : "Copy to study vault"}</button>
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
                  title="Add note to weekly review"
                >
                  Add to review
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
              </div></details>
            </div>
          </div>
        </div>

        {/* 1-Click Anki Card Creator Modal */}
        {showAnkiModal && (
          <div className="anki-quick-modal-backdrop" onClick={() => setShowAnkiModal(false)}>
            <div className="anki-quick-modal" role="dialog" aria-modal="true" aria-label="Create flashcard" onClick={(e) => e.stopPropagation()}>
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
                    aria-label="Flashcard question"
                    autoFocus
                    rows={3}
                    value={ankiFront}
                    onChange={(e) => setAnkiFront(e.target.value)}
                    placeholder="Question or concept"
                    required
                  />
                </div>

                <div className="anki-field">
                  <label className="mono anki-label">Back (Answer / Definition):</label>
                  <textarea
                    className="anki-input mono"
                    aria-label="Flashcard answer"
                    rows={4}
                    value={ankiBack}
                    onChange={(e) => setAnkiBack(e.target.value)}
                    placeholder="Answer"
                    required
                  />
                </div>

                <div className="anki-field">
                  <label className="mono anki-label">Source Citation:</label>
                  <input
                    type="text"
                    className="anki-input-inline mono"
                    aria-label="Source citation"
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
