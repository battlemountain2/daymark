"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import PdfContinuousReader, { type PdfReaderHandle, type PdfSelection } from "./PdfContinuousReader";
import type { PrivateFile } from "@/lib/private-files";
import { usePersonalRecords } from "@/lib/use-personal-records";
import {uploadPdf} from "@/lib/upload-pdf";
import { cloudStorage, getCloudStatus } from "@/lib/cloud-storage";
import {ReadingLinkEditor} from "./ReadingLinks";
import type {Term} from "@/lib/term";
import type {Item} from "./TodoPanel";
import type { Flashcard } from "@/lib/study-hub-types";
type Rect = { x: number; y: number; w: number; h: number };
type Highlight = {
  id: string;
  file: string;
  page: number;
  label: string;
  quote: string;
  comment: string;
  rects: Rect[];
  created: string;
};
type ReaderPrefs = {
  page: number;
  zoom: number;
  background: string;
  offset: number;
  notesWidth: number;
};
export default function ReadingDesk({
  onFocus,
  onOpenNote,
  courseFilter,
  courseRequest,
  fileRequest,
  term,
  assignments,
}: {
  fileRequest?: string;
  term: Term;
  assignments: Item[];
  courseFilter?: string;
  courseRequest?: number;
  onFocus: () => void;
  onOpenNote: (key: string) => void;
}) {
  const [readerOpen,setReaderOpen] = useState(false),[libraryCourse,setLibraryCourse] = useState("All courses");
  useEffect(()=>{if(courseFilter){setLibraryCourse(courseFilter);setCourse(courseFilter);setReaderOpen(false);}},[courseFilter,courseRequest]);
  const [files, setFiles] = useState<PrivateFile[]>([]),
    [active, setActive] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [uploading, setUploading] = useState(false),
    [course, setCourse] = useState("HIST 300");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [count, setCount] = useState(0),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [bg, setBg] = useState("paper"),
    [offset, setOffset] = useState(0),
    [notesWidth, setNotesWidth] = useState(38),
    [mobilePane, setMobilePane] = useState("page");
  const [width, setWidth] = useState(600),
    [selection, setSelection] = useState<PdfSelection | null>(null),
    [chosen, setChosen] = useState<string | null>(null),
    [query, setQuery] = useState("");
  const highlights = usePersonalRecords<Highlight>("daymark:highlights"),
    notes = usePersonalRecords<string>("hb:scratchpad:v2"),
    prefs = usePersonalRecords<ReaderPrefs>("daymark:reader"),
    links = usePersonalRecords<{
      from: string;
      to: string;
      highlight?: string;
    }>("daymark:note-links");
  const pdfReader = useRef<PdfReaderHandle>(null),
    container = useRef<HTMLDivElement>(null),
    initialPrefs = useRef<string | null>(null);
  function jumpPage(next: number) { const target = Math.max(1, Math.min(count || 1, next)); setPage(target); pdfReader.current?.jumpTo(target); setSelection(null); }
  const readerRoot = useRef<HTMLElement>(null);
  const linkedReadingShown = useRef(false);
  const writePrefs = prefs.write;
  const skipRestoreSave = useRef(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cardFront, setCardFront] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setCloudReady(getCloudStatus().state !== "checking");
    update();
    window.addEventListener("daymark:sync-status", update);
    return () => window.removeEventListener("daymark:sync-status", update);
  }, []);
  useEffect(()=>{if(fileRequest){setActive(fileRequest);setReaderOpen(true);}},[fileRequest,courseRequest]);
  const file = files.find((f) => f.id === active);
  const noteKey = file
    ? `${file.course} · ${file.name.replace(/\.pdf$/i, "")}`
    : "General";
  const current = chosen ? highlights.records[chosen] : null;
  async function refresh() {
    try {
      const r = await fetch("/api/files");
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setFiles(
        data.files.filter((f: PrivateFile) => f.type === "application/pdf"),
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not load private files.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    try {
      setActive(localStorage.getItem("daymark:last-reading"));
    } catch {}
  }, []);
  useEffect(() => {
    if (!active || !cloudReady) return;
    initialPrefs.current = null;
    skipRestoreSave.current = true;
    let saved: ReaderPrefs | undefined;
    try {
      saved = JSON.parse(localStorage.getItem("daymark:reader") || "{}")[
        active
      ];
    } catch {}
    const source = new URLSearchParams(location.search);
    const linked = source.get("reading") === active;
    setPage(
      linked ? Math.max(1, Number(source.get("page")) || 1) : saved?.page || 1,
    );
    setZoom(saved?.zoom || 1);
    setBg(saved?.background || "paper");
    setOffset(saved?.offset || 0);
    setNotesWidth(saved?.notesWidth || 38);
    setChosen(linked ? source.get("highlight") : null);
    if (linked && source.get("highlight")) setMobilePane("notes");
    setSelection(null);
    try {
      localStorage.setItem("daymark:last-reading", active);
    } catch {}
    initialPrefs.current = active;
  }, [active, cloudReady]);
  useEffect(() => {
    if (!file || !cloudReady || linkedReadingShown.current) return;
    if (new URLSearchParams(location.search).get("reading") !== file.id) return;
    linkedReadingShown.current = true;
    readerRoot.current?.scrollIntoView({block:"start"});
  }, [file, cloudReady]);
  useEffect(() => {
    if (skipRestoreSave.current) {
      skipRestoreSave.current = false;
      return;
    }
    if (readerOpen && active && cloudReady && initialPrefs.current === active)
      writePrefs(active, { page, zoom, background: bg, offset, notesWidth });
  }, [active, page, zoom, bg, offset, notesWidth, writePrefs, cloudReady, readerOpen]);
  useEffect(() => {
    if (!active || !readerOpen || !cloudReady) return;
    let disposed = false;
    let task:
      | ReturnType<(typeof import("pdfjs-dist"))["getDocument"]>
      | undefined;
    setPdf(null);
    setCount(0);
    setMessage("");
    void import("pdfjs-dist")
      .then((lib) => {
        if (disposed) return;
        lib.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
        task = lib.getDocument({ url: `/api/files/${active}` });
        return task.promise;
      })
      .then((doc) => {
        if (!doc || disposed) return;
        setPdf(doc);
        setCount(doc.numPages);
        setPage((p) => Math.max(1, Math.min(p, doc.numPages)));
      })
      .catch(() => {
        if (!disposed)
          setMessage(
            "Could not open this PDF. Check your connection and try another file.",
          );
      });
    return () => {
      disposed = true;
      void task?.destroy();
    };
  }, [active, readerOpen, cloudReady]);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(240, entries[0].contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, file?.id, readerOpen]);
  async function upload(f: File) {
    setUploading(true);
    setMessage("");
    try {
      const data = await uploadPdf(f,course,setMessage);
      setMessage("");
      setFiles(
        data.files.filter((x: PrivateFile) => x.type === "application/pdf"),
      );
      setActive(data.id);
      setReaderOpen(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  function addHighlight() {
    if (!file || !selection?.rects.length) return;
    const id = crypto.randomUUID();
    if (
      highlights.write(id, {
        id,
        file: file.id,
        page: selection.page,
        label: String(selection.page + offset),
        quote: selection.quote,
        comment: "",
        rects: selection.rects,
        created: new Date().toISOString(),
      })
    ) {
      setChosen(id);
      setMobilePane("notes");
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }
  function insertQuote() {
    if (!current || !file) return;
    const quote = `> ${current.quote}\n> ${file.name}, p. ${current.label}\n> Source: /?space=school&reading=${file.id}&page=${current.page}&highlight=${current.id}\n\n${current.comment}`;
    if (
      notes.write(noteKey, `${notes.records[noteKey] || ""}\n\n${quote}`.trim())
    ) {
      links.write(crypto.randomUUID(), {
        from: noteKey,
        to: file.name,
        highlight: current.id,
      });
      setMessage("Inserted with a source link.");
    }
  }
  function makeCard() {
    if (!current || !file) return;
    const id = `highlight-${current.id}`;
    const card: Flashcard = {
      id,
      front:
        cardFront?.trim() ||
        current.comment ||
        "What does this passage tell us?",
      back: current.quote,
      sourceNote: noteKey,
      source: `${file.name}, p. ${current.label} · /?space=school&reading=${file.id}&page=${current.page}&highlight=${current.id}`,
      tags: `${file.course}::Reading`,
      status: "Draft",
      courseCode: file.course,
      parsedTag: {
        courseCode: file.course,
        week: "",
        unit: "Reading",
        topic: file.name,
        raw: file.course,
      },
    };
    try {
      const cards: Flashcard[] = JSON.parse(
        localStorage.getItem("hb:custom-anki-cards") || "[]",
      );
      if (!Array.isArray(cards)) throw Error("Invalid card collection");
      cloudStorage.setItem(
        "hb:custom-anki-cards",
        JSON.stringify([...cards.filter((c) => c.id !== id), card]),
      );
      window.dispatchEvent(new Event("custom-anki-updated"));
      setCardFront(null);
      setMessage(
        "Flashcard draft saved in Study Hub. Review the question before studying.",
      );
    } catch {
      setMessage("Could not save the card. Your passage is still available.");
    }
  }
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const id = q.get("reading");
    if (id) {
      setReaderOpen(true);
      setActive(id);
      const p = Number(q.get("page"));
      if (p > 0) setPage(p);
      setChosen(q.get("highlight"));
    }
  }, []);
  useEffect(()=>{
    if(!readerOpen || !active || !cloudReady || initialPrefs.current !== active)return;
    const url=new URL(location.href);url.searchParams.set('reading',active);url.searchParams.set('page',String(page));if(chosen)url.searchParams.set('highlight',chosen);else url.searchParams.delete('highlight');history.replaceState(null,'',url);
  },[readerOpen,active,cloudReady,page,chosen]);
  return (
    <section className={`card reading-desk${readerOpen ? " reader-open" : ""}`} ref={readerRoot}>
      <div className="card-head">
        <h2>{readerOpen && file ? file.name.replace(/\.pdf$/i, "") : "Readings"}</h2>
        {readerOpen && <button type="button" onClick={()=>{setReaderOpen(false);const url=new URL(location.href);url.searchParams.delete('reading');url.searchParams.delete('page');url.searchParams.delete('highlight');history.replaceState(null,'',url);}}>Back to library</button>}
      </div>
      <div className="card-body">
        {!readerOpen && <>
          {file && (libraryCourse === "All courses" || file.course === libraryCourse) && <button type="button" className="reading-resume" onClick={()=>setReaderOpen(true)}><span className="mono sub">Resume · {file.course} · page {prefs.records[file.id]?.page || page}</span><strong>{file.name.replace(/\.pdf$/i,'')}</strong></button>}
          <label className="reading-course-filter">Course <select value={libraryCourse} onChange={e=>setLibraryCourse(e.target.value)}><option>All courses</option>{Array.from(new Set([...files.map(f=>f.course),...(courseFilter?[courseFilter]:[])])).sort().map(c=><option key={c}>{c}</option>)}</select></label>
          {Array.from(new Set(files.filter(f=>libraryCourse==='All courses'||f.course===libraryCourse).map(f=>f.course))).sort().map(c=><details className="reading-course-group" key={c} open={libraryCourse===c?true:undefined}><summary>{c} · {files.filter(f=>f.course===c).length} readings</summary>
           <div className="reading-library">{files.filter(f=>f.course===c).map(f=><article className="reading-library-card" key={f.id}>
            <button type="button" className="reading-library-item" onClick={()=>{setActive(f.id);setReaderOpen(true);}}><strong>{f.name.replace(/\.pdf$/i,'')}</strong><span className="sub">{prefs.records[f.id]?.page?`Page ${prefs.records[f.id].page}`:'Start reading'}{Object.values(highlights.records).filter(h=>h.file===f.id).length?` · ${Object.values(highlights.records).filter(h=>h.file===f.id).length} passages`:''}</span></button>
            <ReadingLinkEditor file={f.id} title={f.name.replace(/\.pdf$/i,'')} course={f.course} term={term} assignments={assignments}/>
           </article>)}</div>
          </details>)}
          {files.length>0 && !files.some(f=>libraryCourse==='All courses'||f.course===libraryCourse) && <p className="sub">No readings for this course yet.</p>}
        </>}
        <details className="personal-setup reading-library-settings"><summary>Add a reading</summary><label className="reader-course">Course for new PDFs<select value={course} onChange={e=>setCourse(e.target.value)}>{['HIST 300','GEOG 1150','GEOG 1160','GEOG 1160L','GEOG 1115L','Personal'].map(c=><option key={c}>{c}</option>)}</select></label><label className="file-button">{uploading?'Storing…':'Choose PDF'}<input type="file" accept="application/pdf" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></label></details>
        {!files.length && (
          <p className="sub">
            {loading
              ? "Loading your readings…"
              : "Add a PDF to read beside your notes."}
          </p>
        )}
        {readerOpen && file && (
          <>
            <div className="reader-toolbar">
              <span className="mono">{file.course}</span>
              <button
                disabled={page <= 1}
                onClick={() => jumpPage(page - 1)}
                aria-label="Previous PDF page"
              >
                ←
              </button>
              <label>
                Page{" "}
                <input
                  aria-label="PDF page"
                  type="number"
                  min={1}
                  max={count || 1}
                  value={page}
                  onChange={(e) =>
                    jumpPage(
                      Math.max(
                        1,
                        Math.min(count || 1, Number(e.target.value) || 1),
                      ),
                    )
                  }
                />
              </label>
              <span>of {count || "…"}</span>
              <button
                disabled={page >= count}
                onClick={() => jumpPage(page + 1)}
                aria-label="Next PDF page"
              >
                →
              </button>
              <button onClick={onFocus}>Focus</button>
              <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer">Open original PDF ↗</a>
            </div>
            <details className="reader-comfort">
              <summary>Reading comfort & citation pages</summary>
              <div className="reader-settings">
                <label>
                  Zoom
                  <select
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  >
                    <option value={0.85}>85%</option>
                    <option value={1}>Fit width</option>
                    <option value={1.25}>125%</option>
                    <option value={1.5}>150%</option>
                  </select>
                </label>
                <label>
                  Background
                  <select value={bg} onChange={(e) => setBg(e.target.value)}>
                    <option value="paper">Paper</option>
                    <option value="warm">Warm</option>
                    <option value="dim">Dim</option>
                  </select>
                </label>
                <label>
                  Notes width
                  <input
                    type="range"
                    min={30}
                    max={50}
                    value={notesWidth}
                    onChange={(e) => setNotesWidth(Number(e.target.value))}
                  />
                </label>
                <label>
                  Printed page offset
                  <input
                    type="number"
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value) || 0)}
                  />
                </label>
              </div>
              <p className="sub">
                Printed page = PDF page + offset. Check against the document before citing.
              </p>
            </details>
            <div className="reader-mobile-tabs">
              <button
                aria-pressed={mobilePane === "page"}
                onClick={() => setMobilePane("page")}
              >
                Page
              </button>
              <button
                aria-pressed={mobilePane === "notes"}
                onClick={() => setMobilePane("notes")}
              >
                Notes & passages
              </button>
            </div>
            <div
              className="reader-workspace"
              data-pane={mobilePane}
              style={{
                gridTemplateColumns: `minmax(0,${100 - notesWidth}fr) minmax(0,${notesWidth}fr)`,
              }}
            >
              <div className="reader-page-side" ref={container}>
                <div className="selection-actions">
                  <button disabled={!selection} onClick={addHighlight}>
                    Highlight selected passage
                  </button>
                  <span className="sub">
                    {selection
                      ? `${selection.quote.length} characters selected`
                      : "Select text on the page to highlight."}
                  </span>
                </div>
                {pdf ? <PdfContinuousReader key={file.id} ref={pdfReader} pdf={pdf} width={width} zoom={zoom} background={bg} initialPage={page} highlights={Object.values(highlights.records).filter(h => h.file === file.id)} onPage={setPage} onSelection={setSelection} onHighlight={id => { setChosen(id); setCardFront(null); setMobilePane("notes"); }} /> : <p role="status">{message || "Opening all pages…"}</p>}
              </div>
              <aside className="reader-notes-side">
                {current && (
                  <div className="passage-comment">
                    <span className="mono sub">
                      PASSAGE · P. {current.label}
                    </span>
                    <blockquote>{current.quote}</blockquote>
                    <label>
                      Your comment
                      <textarea
                        value={current.comment}
                        onChange={(e) =>
                          highlights.write(current.id, {
                            ...current,
                            comment: e.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="reader-toolbar">
                      <button onClick={insertQuote}>Insert into notes</button>
                      <button
                        onClick={() =>
                          setCardFront(
                            current.comment ||
                              "What does this passage tell us?",
                          )
                        }
                      >
                        Make card draft
                      </button>
                      <button
                        onClick={() => {
                          highlights.write(current.id, null);
                          setChosen(null);
                        }}
                      >
                        Remove highlight
                      </button>
                    </div>
                    {cardFront !== null && (
                      <div>
                        <label className="desk-field">
                          Card question
                          <textarea
                            value={cardFront}
                            onChange={(e) => setCardFront(e.target.value)}
                          />
                        </label>
                        <p className="sub">
                          The answer will be the exact passage above, with its
                          page and source link.
                        </p>
                        <button disabled={!cardFront.trim()} onClick={makeCard}>
                          Save reviewed draft
                        </button>
                        <button onClick={() => setCardFront(null)}>
                          Cancel draft
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <label className="desk-field">
                  Your reading notes
                  <textarea
                    className="reading-notebook"
                    value={notes.records[noteKey] || ""}
                    placeholder="Add a comment…"
                    onChange={(e) => notes.write(noteKey, e.target.value)}
                  />
                </label>
                <details>
                  <summary>Connect a note</summary>
                  <label className="desk-field">
                    Related note
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value)
                          links.write(crypto.randomUUID(), {
                            from: noteKey,
                            to: e.target.value,
                          });
                        e.target.value = "";
                      }}
                    >
                      <option value="">Choose a note…</option>
                      {Object.keys(notes.records)
                        .filter((k) => k !== noteKey)
                        .map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                    </select>
                  </label>
                  {Object.entries(links.records)
                    .filter(([, l]) => l.from === noteKey || l.to === noteKey)
                    .map(([id, l]) => (
                      <p key={id} className="sub">
                        {l.highlight && highlights.records[l.highlight] ? (
                          <a
                            href={`/?space=school&reading=${highlights.records[l.highlight].file}&page=${highlights.records[l.highlight].page}&highlight=${l.highlight}`}
                          >
                            Source passage ↗
                          </a>
                        ) : (
                          <button
                            onClick={() =>
                              onOpenNote(l.from === noteKey ? l.to : l.from)
                            }
                          >
                            {l.from === noteKey
                              ? l.to
                              : `Linked from ${l.from}`}
                          </button>
                        )}{" "}
                        {l.highlight && "· quoted passage"}{" "}
                        <button
                          onClick={() => links.write(id, null)}
                          aria-label="Remove note link"
                        >
                          ×
                        </button>
                      </p>
                    ))}
                </details>
                <label className="desk-field">
                  Find a passage
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search quotes and comments…"
                  />
                </label>
                <div className="passage-list">
                  {Object.values(highlights.records)
                    .filter(
                      (h) =>
                        h.file === file.id &&
                        `${h.quote} ${h.comment}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                    .map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          jumpPage(h.page);
                          setChosen(h.id);
                          setMobilePane("notes");
                        }}
                      >
                        <span className="mono sub">P. {h.label}</span>
                        <p>{h.quote.slice(0, 160)}</p>
                      </button>
                    ))}
                </div>
              </aside>
            </div>
          </>
        )}
        {(message || highlights.error || notes.error || prefs.error) && (
          <p role="status">
            {message || highlights.error || notes.error || prefs.error}
          </p>
        )}
      </div>
    </section>
  );
}
