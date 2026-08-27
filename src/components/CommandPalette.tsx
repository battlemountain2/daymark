"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ⌘K.
 *
 * The dashboard has grown seven panels and three routes, and everything you
 * might want to *do* — tick a reading off, jump to the sky page, add a to-do
 * you thought of on the walk over — costs a scroll and a hunt. This is the
 * keyboard path to all of it.
 *
 * Two deliberate choices:
 *
 * **Anything you type that matches nothing becomes a to-do.** No separate
 * "add" mode, no second dialog: type "email Dr Fitzgerald" and the last row
 * offers to make it a to-do due today. The fastest capture is the one with no
 * ceremony, and half-finished capture flows are how notes get lost.
 *
 * **It is reachable without a keyboard.** A ⌘K palette on a phone is
 * decoration, so the header carries a button that opens the same thing. He
 * reads this on a phone between classes more than he reads it on the laptop.
 *
 * Mutations go through the same `mutate` the panels use, which means they
 * queue in the outbox and survive with no signal — a tick from the palette in
 * a basement classroom behaves exactly like a tick from the list.
 */

export type Command = {
  id: string;
  label: string;
  /** Right-aligned detail: a due date, a destination, a shortcut. */
  hint?: string;
  group: string;
  /** Extra words to match on that aren't worth showing. */
  keywords?: string;
  run: () => void;
};

/**
 * Subsequence match with a bias toward word starts.
 *
 * Substring-only matching fails the way people actually type — "dayglance"
 * should find "Day at a glance" — and unweighted subsequence matching is far
 * too loose, happily matching "sky" inside "Ask Sydney". Scoring word-initial
 * hits far higher than mid-word ones gets both right, and returning `null`
 * rather than 0 keeps "matched with a bad score" distinct from "no match".
 */
export function score(haystack: string, needle: string): number | null {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().replace(/\s+/g, "");
  if (!n) return 0;

  let total = 0;
  let at = 0;
  for (const ch of n) {
    const found = h.indexOf(ch, at);
    if (found === -1) return null;
    const wordStart = found === 0 || /[\s\-:/·]/.test(h[found - 1]);
    total += wordStart ? 12 : found === at ? 6 : 1;   // contiguous beats scattered
    at = found + 1;
  }
  // A short label that used most of its characters is a better hit than a long
  // one that happened to contain them.
  return total + Math.max(0, 24 - haystack.length / 2);
}

type Props = {
  commands: Command[];
  /** Called with the typed text when nothing matched and the user hits Enter. */
  onCapture?: (text: string) => void;
};

export default function CommandPalette({ commands, onCapture }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Where focus was before the palette stole it, so Escape can hand it back.
  const restoreTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setSel(0);
    restoreTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        restoreTo.current = document.activeElement as HTMLElement;
        setOpen((v) => !v);
        return;
      }
      // A bare "/" opens it too, the way search does everywhere else — but not
      // while the user is typing into something.
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        restoreTo.current = el;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    // The palette listens for its own shortcut, so it must also let go of it.
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, s: score(`${c.label} ${c.keywords ?? ""}`, q) }))
      .filter((r): r is { c: Command; s: number } => r.s !== null)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, 40).map((r) => r.c);
  }, [commands, q]);

  const capture = q.trim().length >= 2 && onCapture ? q.trim() : null;
  const total = results.length + (capture ? 1 : 0);
  const active = Math.min(sel, Math.max(0, total - 1));

  // Keep the highlighted row on screen when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="1"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, q]);

  function runAt(i: number) {
    if (capture && i === results.length) { onCapture!(capture); close(); return; }
    const c = results[i];
    if (!c) return;
    close();
    // After close, so a command that moves focus isn't undone by the restore.
    c.run();
  }

  if (!open) {
    return (
      <button type="button" className="cmdopen mono" onClick={() => {
        restoreTo.current = document.activeElement as HTMLElement;
        setOpen(true);
      }} aria-label="Open the command palette">
        <span aria-hidden="true">⌘K</span>
      </button>
    );
  }

  return (
    <div className="cmdscrim" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="cmdbox" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="cmdinput"
          value={q}
          placeholder="Jump somewhere, tick something off, or type a new to-do…"
          aria-label="Search commands"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdlist"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); close(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (total ? (s + 1) % total : 0)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (total ? (s - 1 + total) % total : 0)); }
            else if (e.key === "Enter") { e.preventDefault(); runAt(active); }
          }}
        />
        <div className="cmdlist" id="cmdlist" role="listbox" ref={listRef}>
          {results.map((c, i) => {
            const first = i === 0 || results[i - 1].group !== c.group;
            return (
              <div key={c.id}>
                {first && <div className="cmdgroup mono">{c.group}</div>}
                <div
                  role="option"
                  aria-selected={i === active}
                  data-active={i === active ? "1" : "0"}
                  className={`cmdrow${i === active ? " on" : ""}`}
                  onMouseMove={() => setSel(i)}
                  onMouseDown={(e) => { e.preventDefault(); runAt(i); }}
                >
                  <span className="cmdlabel">{c.label}</span>
                  {c.hint && <span className="cmdhint mono">{c.hint}</span>}
                </div>
              </div>
            );
          })}

          {capture && (
            <div>
              <div className="cmdgroup mono">Capture</div>
              <div
                role="option"
                aria-selected={active === results.length}
                data-active={active === results.length ? "1" : "0"}
                className={`cmdrow${active === results.length ? " on" : ""}`}
                onMouseMove={() => setSel(results.length)}
                onMouseDown={(e) => { e.preventDefault(); runAt(results.length); }}
              >
                <span className="cmdlabel">Add to-do: &ldquo;{capture}&rdquo;</span>
                <span className="cmdhint mono">due today</span>
              </div>
            </div>
          )}

          {!total && <div className="cmdempty sub">Nothing matches that.</div>}
        </div>
        <div className="cmdfoot mono">
          <span>↑↓ move</span><span>⏎ run</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
