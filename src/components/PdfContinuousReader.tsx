"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  PDFDocumentProxy,
  RenderTask,
  TextLayer as PdfTextLayer,
} from "pdfjs-dist";

export type PdfRect = { x: number; y: number; w: number; h: number };
export type PdfSelection = { page: number; quote: string; rects: PdfRect[] };
type Mark = { id: string; page: number; quote: string; rects: PdfRect[] };
export type PdfReaderHandle = { jumpTo: (page: number) => void };
type Props = {
  pdf: PDFDocumentProxy;
  width: number;
  zoom: number;
  background: string;
  initialPage: number;
  highlights: Mark[];
  onPage: (page: number) => void;
  onSelection: (selection: PdfSelection | null) => void;
  onHighlight: (id: string) => void;
};

function PdfPage({
  pdf,
  number,
  width,
  zoom,
  visible,
  highlights,
  onHighlight,
}: {
  pdf: PDFDocumentProxy;
  number: number;
  width: number;
  zoom: number;
  visible: boolean;
  highlights: Mark[];
  onHighlight: (id: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    text = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(792 / 612),
    [error, setError] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    let disposed = false,
      render: RenderTask | undefined,
      layer: PdfTextLayer | undefined;
    setReady(false);
    setError(false);
    void pdf
      .getPage(number)
      .then(async (page) => {
        const lib = await import("pdfjs-dist");
        if (disposed || !canvas.current || !text.current) return;
        const natural = page.getViewport({ scale: 1 });
        setRatio(natural.height / natural.width);
        const viewport = page.getViewport({
          scale: (width * zoom) / natural.width,
        });
        const c = canvas.current,
          el = text.current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.floor(viewport.width * dpr);
        c.height = Math.floor(viewport.height * dpr);
        c.style.width = `${viewport.width}px`;
        c.style.height = `${viewport.height}px`;
        el.replaceChildren();
        el.style.setProperty("--scale-factor", String(viewport.scale));
        el.style.setProperty("--total-scale-factor", String(viewport.scale));
        const context = c.getContext("2d");
        if (!context) throw Error("Canvas unavailable");
        render = page.render({
          canvas: c,
          canvasContext: context,
          viewport,
          transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
        });
        await render.promise;
        if (disposed) return;
        layer = new lib.TextLayer({
          textContentSource: await page.getTextContent(),
          container: el,
          viewport,
        });
        if (disposed) return;
        await layer.render();
        if (!disposed) setReady(true);
      })
      .catch((e) => {
        if (!disposed && e.name !== "RenderingCancelledException")
          setError(true);
      });
    return () => {
      disposed = true;
      render?.cancel();
      layer?.cancel();
    };
  }, [pdf, number, width, zoom, visible]);
  return (
    <div className="pdf-page-frame" data-pdf-page={number}>
      <div className="pdf-page-label">Page {number}</div>
      <div
        className="pdf-paper"
        style={{ width: width * zoom, height: width * zoom * ratio }}
      >
        {!ready && (
          <span
            className="pdf-page-placeholder"
            role={error ? "alert" : undefined}
          >
            {error
              ? "This page could not render. Open the original PDF or reopen this reading."
              : `Page ${number}`}
          </span>
        )}
        {visible && (
          <>
            <canvas ref={canvas} />
            <div className="textLayer" ref={text} />
            <div className="highlight-layer">
              {highlights.map((h) =>
                h.rects.map((r, i) => (
                  <button
                    key={`${h.id}-${i}`}
                    aria-label={`Open highlight: ${h.quote.slice(0, 70)}`}
                    aria-hidden={i > 0}
                    tabIndex={i > 0 ? -1 : 0}
                    onClick={() => onHighlight(h.id)}
                    style={{
                      left: `${r.x * 100}%`,
                      top: `${r.y * 100}%`,
                      width: `${r.w * 100}%`,
                      height: `${r.h * 100}%`,
                    }}
                  />
                )),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Keep all page positions scrollable, but only allocate canvases near the viewport. */
const PdfContinuousReader = forwardRef<PdfReaderHandle, Props>(
  function PdfContinuousReader(
    {
      pdf,
      width,
      zoom,
      background,
      initialPage,
      highlights,
      onPage,
      onSelection,
      onHighlight,
    },
    ref,
  ) {
    const root = useRef<HTMLDivElement>(null);
    const [fitWidth, setFitWidth] = useState(width);
    const [visible, setVisible] = useState<Set<number>>(new Set());
    const callbacks = useRef({ onPage, onSelection });
    callbacks.current = { onPage, onSelection };
    const lastPage = useRef(initialPage),
      start = useRef(initialPage);
    function jumpTo(page: number) {
      const number = Math.max(1, Math.min(pdf.numPages, page));
      const target = root.current?.querySelector<HTMLElement>(
        `[data-pdf-page="${number}"]`,
      );
      if (target && root.current) {
        root.current.scrollTop = target.offsetTop;
        lastPage.current = number;
        callbacks.current.onPage(number);
      }
    }
    useImperativeHandle(ref, () => ({ jumpTo }));
    useEffect(() => {
      const el = root.current;
      if (!el) return;
      const observer = new ResizeObserver(() => {
        // The vertical scrollbar consumes space inside the reading column.
        if (el.clientWidth > 0) setFitWidth(el.clientWidth);
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);
    useEffect(() => {
      const el = root.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          setVisible((previous) => {
            const next = new Set(previous);
            for (const entry of entries) {
              const number = Number(
                (entry.target as HTMLElement).dataset.pdfPage,
              );
              if (entry.isIntersecting) next.add(number);
              else next.delete(number);
            }
            return next;
          });
        },
        { root: el, rootMargin: "800px 0px" },
      );
      el.querySelectorAll("[data-pdf-page]").forEach((page) =>
        observer.observe(page),
      );
      // Restore after the page placeholders have their final width.
      const target = el.querySelector<HTMLElement>(
        `[data-pdf-page="${Math.min(pdf.numPages, start.current)}"]`,
      );
      if (target) el.scrollTop = target.offsetTop;
      return () => observer.disconnect();
    }, [pdf]);
    useEffect(() => {
      const el = root.current,
        target = el?.querySelector<HTMLElement>(
          `[data-pdf-page="${lastPage.current}"]`,
        );
      if (el && target) el.scrollTop = target.offsetTop;
    }, [fitWidth, zoom]);
    useEffect(() => {
      let frame = 0;
      const el = root.current;
      if (!el) return;
      const update = () => {
        frame = 0;
        const pages = el.children;
        // Binary search the page positions; a long book needs no per-scroll page walk.
        let low = 0,
          high = pages.length - 1;
        const line = el.scrollTop + Math.min(120, el.clientHeight / 3);
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          if ((pages[mid] as HTMLElement).offsetTop <= line) low = mid;
          else high = mid - 1;
        }
        const atEnd =
          el.scrollTop > 0 &&
          el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        const page = atEnd ? pdf.numPages : low + 1;
        if (lastPage.current !== page) {
          lastPage.current = page;
          callbacks.current.onPage(page);
        }
      };
      const scroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      el.addEventListener("scroll", scroll, { passive: true });
      return () => {
        el.removeEventListener("scroll", scroll);
        cancelAnimationFrame(frame);
      };
    }, [pdf]);
    useEffect(() => {
      const capture = () => {
        const selected = window.getSelection();
        if (!selected?.rangeCount || !selected.toString().trim()) {
          callbacks.current.onSelection(null);
          return;
        }
        const range = selected.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const layer = element?.closest(".textLayer"),
          paper = layer?.closest(".pdf-paper"),
          page = paper?.closest<HTMLElement>("[data-pdf-page]");
        if (!layer || !paper || !page || !root.current?.contains(layer)) return;
        const bounds = paper.getBoundingClientRect();
        callbacks.current.onSelection({
          page: Number(page.dataset.pdfPage),
          quote: selected.toString().trim().slice(0, 12000),
          rects: [...range.getClientRects()]
            .filter((r) => r.width > 0 && r.height > 0)
            .map((r) => ({
              x: (r.x - bounds.x) / bounds.width,
              y: (r.y - bounds.y) / bounds.height,
              w: r.width / bounds.width,
              h: r.height / bounds.height,
            }))
            .slice(0, 160),
        });
      };
      document.addEventListener("selectionchange", capture);
      return () => document.removeEventListener("selectionchange", capture);
    }, []);
    return (
      <div
        ref={root}
        className="pdf-scroll pdf-continuous"
        data-background={background}
        role="region"
        aria-label="PDF document"
        tabIndex={0}
      >
        {Array.from({ length: pdf.numPages }, (_, i) => (
          <PdfPage
            key={i + 1}
            pdf={pdf}
            number={i + 1}
            width={fitWidth}
            zoom={zoom}
            visible={visible.has(i + 1)}
            highlights={highlights.filter((h) => h.page === i + 1)}
            onHighlight={onHighlight}
          />
        ))}
      </div>
    );
  },
);
export default PdfContinuousReader;
