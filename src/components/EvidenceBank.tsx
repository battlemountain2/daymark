"use client";
import { cloudStorage } from "@/lib/cloud-storage";


import { useState, useMemo, useEffect } from "react";
import { type ColourKey } from "@/lib/term";

export type EvidenceItem = {
  id: string;
  course: string;
  author: string;
  work: string;
  year: string;
  pages: string;
  thesis: string;
  quote: string;
  evidenceKind: "verified-quote" | "reading-note";
  chicagoNotes: string;
  chicagoBib: string;
  tags: string[];
  ck: ColourKey;
};

const EVIDENCE_DATABASE: EvidenceItem[] = [
  {
    id: "lutgens-2018-1",
    course: "GEOG 1160",
    author: "Frederick K. Lutgens & Edward J. Tarbuck",
    work: "The Atmosphere: An Introduction to Meteorology",
    year: "2018",
    pages: "142–165",
    thesis: "Atmospheric circulation is the planetary thermodynamic mechanism transferring surplus equatorial solar energy poleward via Hadley, Ferrel, and Polar cells modulated by Coriolis deflection.",
    quote: "The unequal heating of Earth's surface establishes horizontal pressure gradients, driving winds that transport energy across latitude zones.",
    evidenceKind: "verified-quote",
    chicagoNotes: "Frederick K. Lutgens and Edward J. Tarbuck, The Atmosphere: An Introduction to Meteorology, 14th ed. (Boston: Pearson, 2018), 148.",
    chicagoBib: "Lutgens, Frederick K., and Edward J. Tarbuck. The Atmosphere: An Introduction to Meteorology. 14th ed. Boston: Pearson, 2018.",
    tags: ["atmospheric circulation", "Hadley cell", "pressure gradients", "Coriolis force"],
    ck: "geo",
  },
  {
    id: "sutter-2013-1",
    course: "HIST 300",
    author: "Paul S. Sutter",
    work: "The World with Us: The State of American Environmental History",
    year: "2013",
    pages: "94–119",
    thesis: "Environmental history has transitioned from romantic declensionist wilderness narratives toward analyzing hybrid socio-ecological landscapes, state infrastructures, and labor.",
    quote: "Nature is not a pristine baseline separate from human affairs, but a dynamic historical actor continually co-produced through labor, politics, and technology.",
    evidenceKind: "reading-note",
    chicagoNotes: "Paul S. Sutter, “The World with Us: The State of American Environmental History,” Journal of American History 100, no. 1 (2013): 102.",
    chicagoBib: "Sutter, Paul S. “The World with Us: The State of American Environmental History.” Journal of American History 100, no. 1 (2013): 94–119.",
    tags: ["hybridity", "environmental historiography", "infrastructure", "second nature"],
    ck: "his",
  },
  {
    id: "worster-1984-1",
    course: "HIST 300",
    author: "Donald Worster",
    work: "History as Natural History: An Essay on Theory and Method",
    year: "1984",
    pages: "1–19",
    thesis: "Arid environments necessitate concentrated capital and state power, transforming the American West into a modern 'hydraulic society' commanded by mega-dams.",
    quote: "The domination of nature inevitably leads to the domination of human beings by those who control the apparatus of technological manipulation.",
    evidenceKind: "reading-note",
    chicagoNotes: "Donald Worster, “History as Natural History: An Essay on Theory and Method,” Pacific Historical Review 53, no. 1 (1984): 8.",
    chicagoBib: "Worster, Donald. “History as Natural History: An Essay on Theory and Method.” Pacific Historical Review 53, no. 1 (1984): 1–19.",
    tags: ["hydraulic society", "water politics", "Bureau of Reclamation", "dams"],
    ck: "his",
  },
  {
    id: "cronon-1995-1",
    course: "GEOG 1150",
    author: "William Cronon",
    work: "The Trouble with Wilderness; or, Getting Back to the Wrong Nature",
    year: "1995",
    pages: "69–90",
    thesis: "The cultural myth of uninhabited wilderness alienates society from everyday urban/suburban ecological responsibility while historically dispossessing Indigenous peoples.",
    quote: "Wilderness embodies a dualistic vision in which the human is outside the natural, leaving us with no comfortable place to actually live sustainably.",
    evidenceKind: "reading-note",
    chicagoNotes: "William Cronon, “The Trouble with Wilderness; or, Getting Back to the Wrong Nature,” in Uncommon Ground: Rethinking the Human Place in Nature, ed. William Cronon (New York: W. W. Norton & Co., 1995), 81.",
    chicagoBib: "Cronon, William. “The Trouble with Wilderness; or, Getting Back to the Wrong Nature.” In Uncommon Ground: Rethinking the Human Place in Nature, edited by William Cronon, 69–90. New York: W. W. Norton & Co., 1995.",
    tags: ["wilderness myth", "preservation critique", "indigenous erasure", "conservation"],
    ck: "geo",
  },
  {
    id: "gis-proj-1",
    course: "GEOG 1115L",
    author: "GIScience Faculty",
    work: "Foundations of Spatial Analysis & Map Projections",
    year: "2026",
    pages: "Lab Manual W01",
    thesis: "Transforming 3D spherical coordinates (GCS) to 2D planar coordinates (PCS) introduces systematic distortion across area, shape, or distance.",
    quote: "Every flat map is an intentional compromise between conformality, equivalence, and azimuthal fidelity.",
    evidenceKind: "reading-note",
    chicagoNotes: "UNM Department of Geography, Foundations of Spatial Analysis & Map Projections (Albuquerque: University of New Mexico, 2026), 14.",
    chicagoBib: "Department of Geography. Foundations of Spatial Analysis & Map Projections. Albuquerque: University of New Mexico, 2026.",
    tags: ["projections", "coordinate systems", "datums", "raster-vector"],
    ck: "geo",
  },
];

export default function EvidenceBank() {
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customItems, setCustomItems] = useState<EvidenceItem[]>([]);

  useEffect(() => {
    const loadCustom = () => {
      try {
        const stored = cloudStorage.getItem("hb:custom-synthesis-evidence");
        if (stored) {
          setCustomItems(JSON.parse(stored));
        }
      } catch {}
    };
    loadCustom();
    window.addEventListener("custom-evidence-updated", loadCustom);
    return () => window.removeEventListener("custom-evidence-updated", loadCustom);
  }, []);

  const allEvidence = useMemo(() => [...customItems, ...EVIDENCE_DATABASE], [customItems]);

  const filtered = useMemo(() => {
    return allEvidence.filter((item) => {
      if (selectedCourse !== "ALL" && item.course !== selectedCourse) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const mAuthor = item.author.toLowerCase().includes(q);
        const mWork = item.work.toLowerCase().includes(q);
        const mThesis = item.thesis.toLowerCase().includes(q);
        const mQuote = item.quote.toLowerCase().includes(q);
        const mTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!mAuthor && !mWork && !mThesis && !mQuote && !mTags) return false;
      }
      return true;
    });
  }, [search, selectedCourse]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="evidence-bank-container">
      <div className="eb-header">
        <div className="eb-title-block">
          <h3>Academic Evidence &amp; Citation Bank</h3>
          <p className="sub mono">
            Primary source arguments, direct quotations, and Chicago Notes-Bibliography citations for essays and discussion briefs.
          </p>
        </div>

        <div className="eb-search-toolbar">
          <input
            type="text"
            className="eb-search-input mono"
            placeholder="Search authors, theses, keywords (e.g. Lutgens, hydraulic, urbanization)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search the evidence bank"
          />
          <div className="eb-course-pills">
            {["ALL", "HIST 300", "GEOG 1160", "GEOG 1150", "GEOG 1115L"].map((c) => (
              <button
                key={c}
                type="button"
                className={`mono eb-pill ${selectedCourse === c ? "on" : ""}`}
                onClick={() => setSelectedCourse(c)}
                aria-pressed={selectedCourse === c}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="eb-grid">
        {filtered.map((item) => (
          <div key={item.id} className={`eb-card ${item.ck}`}>
            <div className="eb-card-top mono">
              <span className="eb-course">{item.course}</span>
              <span className="eb-author">{item.author} ({item.year})</span>
            </div>

            <div className="eb-work-title">{item.work}</div>

            <div className="eb-thesis-box">
              <span className="eb-k mono">Core Thesis:</span>
              <div className="eb-v">{item.thesis}</div>
            </div>

            {item.evidenceKind === "verified-quote" ? (
              <blockquote className="eb-quote">
                &ldquo;{item.quote}&rdquo;
                <span className="eb-pages mono">Verified quotation · p. {item.pages}</span>
              </blockquote>
            ) : (
              <div className="eb-quote is-note">
                {item.quote}
                <span className="eb-pages mono">
                  Reading note · coverage pp. {item.pages} · verify against the source before quoting
                </span>
              </div>
            )}

            <div className="eb-tags mono">
              {item.tags.map((t) => (
                <span key={t} className="eb-tag">#{t}</span>
              ))}
            </div>

            <div className="eb-actions mono">
              <button
                type="button"
                className="eb-copy-btn"
                onClick={() => copyToClipboard(item.chicagoNotes, `${item.id}-note`)}
              >
                {copiedId === `${item.id}-note` ? "✓ Copied Footnote" : "Copy Footnote"}
              </button>
              <button
                type="button"
                className="eb-copy-btn"
                onClick={() => copyToClipboard(item.chicagoBib, `${item.id}-bib`)}
              >
                {copiedId === `${item.id}-bib` ? "✓ Copied Bib" : "Copy Bibliography"}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="eb-empty mono">No evidence matches this search and course filter.</div>
        )}
      </div>
    </div>
  );
}
