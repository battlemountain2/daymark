/**
 * A small RSS/Atom reader.
 *
 * No dependency: feeds are simple enough that a parser for titles, links and
 * dates is a few regexes, and pulling in a full XML library to read a headline
 * is not a trade worth making.
 *
 * Two things learned the hard way while picking these sources:
 *
 * 1. Many large publishers (Condé Nast, Vox Media, IGN, NPR, Reddit) return 403
 *    to anything from a datacenter IP. Vercel is a datacenter, so those fail in
 *    production exactly as they fail in testing. Google News topic feeds carry
 *    their stories anyway, which is why they're in the list.
 * 2. One dead feed must never take down the panel. Every fetch is individually
 *    caught and simply contributes nothing.
 */

import { unstable_cache } from "next/cache";

export type Category = "linux" | "music" | "tech" | "screen" | "news";

export type Source = {
  name: string;
  url: string;
  cat: Category;
  /** Audio, not an article. Rendered with a duration instead of a read-it link. */
  listen?: boolean;
  /**
   * How many items to take. Defaults to 12, which suits a publisher posting
   * several times a day. A *daily* podcast at 12 would contribute a fortnight
   * of back-catalogue and crowd out everything else in a list sorted by date.
   */
  take?: number;
  /**
   * Stop reading the body after this many bytes.
   *
   * NPR's podcast feeds carry the *entire* run of the show — Consider This is
   * 1,750 episodes and 9.5MB of XML, Short Wave 7.8MB — and none of them
   * support range requests (`accept-ranges: none`), so there is no polite way
   * to ask for just the top. Worse, they are far over Next's 2MB data-cache
   * ceiling, so the fetch cache silently refuses to store them and every single
   * page render re-downloads the lot. That was ~20MB per request in testing,
   * logged only as an easily-missed "items over 2MB can not be cached" line.
   *
   * Feeds are newest-first and the parser only matches *complete*
   * `<item>…</item>` blocks, so cutting the stream mid-document costs nothing
   * but the tail nobody reads. 256KB is around sixty episodes of the fattest
   * feed here — twenty times what any source is allowed to contribute.
   */
  cap?: number;
};

/** Applied to every NPR feed; see `cap` above for why. */
const NPR_CAP = 256 * 1024;

/**
 * Confirmed reachable from a datacenter IP. Swap freely — anything that starts
 * 403ing just disappears from the panel rather than breaking it.
 *
 * **NPR arrives as podcasts, and that is not a workaround — it is the only door
 * that opens.** `feeds.npr.org/<topic>/rss.xml` sits behind Akamai and returns a
 * 403 challenge page to any datacenter IP, browser User-Agent or not. The
 * *podcast* feeds on the same host are served by a different origin entirely
 * (no Akamai header, `application/xml`, 200) because podcast clients are
 * datacenter-hosted by nature — Overcast and Pocket Casts poll from AWS, so
 * blocking datacenters would break NPR's own distribution. Verified show by
 * show; the ids below were each confirmed against the channel title, because
 * several NPR ids point at a different programme than the obvious guess.
 */
export const SOURCES: Source[] = [
  // Linux, in roughly descending nerd-density.
  { name: "Phoronix", url: "https://www.phoronix.com/rss.php", cat: "linux" },
  { name: "LWN", url: "https://lwn.net/headlines/rss", cat: "linux" },
  { name: "It's FOSS", url: "https://itsfoss.com/feed/", cat: "linux" },
  { name: "OMG Ubuntu", url: "https://www.omgubuntu.co.uk/feed", cat: "linux" },

  // Hyperpop is niche enough that the general music press only catches some of
  // it; Bandcamp Daily and a scoped news query cover the rest.
  { name: "Bandcamp Daily", url: "https://daily.bandcamp.com/feed", cat: "music" },
  { name: "Stereogum", url: "https://www.stereogum.com/feed/", cat: "music" },
  { name: "Dazed", url: "https://www.dazeddigital.com/rss", cat: "music" },
  { name: "Google News", cat: "music",
    url: "https://news.google.com/rss/search?q=hyperpop+OR+%22PC+Music%22+OR+%22digicore%22+when:14d&hl=en-US&gl=US&ceid=US:en" },

  // Pitchfork's own feeds 403 from anywhere but a home browser, and unlike NPR
  // there is no second door. A site-scoped news query is the whole of it — the
  // reviews come through with their headline format intact ("Artist: Album
  // Review"), and `parse()` recovers "Pitchfork" as the source from the suffix.
  { name: "Pitchfork", cat: "music",
    url: "https://news.google.com/rss/search?q=site:pitchfork.com+when:10d&hl=en-US&gl=US&ceid=US:en" },

  // NPR. Ids verified against the channel title of each feed.
  { name: "NPR Music", url: "https://feeds.npr.org/510019/podcast.xml", cat: "music", listen: true, take: 3, cap: NPR_CAP },
  { name: "Up First", url: "https://feeds.npr.org/510318/podcast.xml", cat: "news", listen: true, take: 2, cap: NPR_CAP },
  { name: "Consider This", url: "https://feeds.npr.org/510355/podcast.xml", cat: "news", listen: true, take: 2, cap: NPR_CAP },
  { name: "Short Wave", url: "https://feeds.npr.org/510351/podcast.xml", cat: "news", listen: true, take: 3, cap: NPR_CAP },
  { name: "Throughline", url: "https://feeds.npr.org/510333/podcast.xml", cat: "news", listen: true, take: 3, cap: NPR_CAP },
  { name: "Pop Culture Happy Hour", url: "https://feeds.npr.org/510282/podcast.xml", cat: "screen", listen: true, take: 3, cap: NPR_CAP },

  { name: "Hacker News", url: "https://hnrss.org/frontpage", cat: "tech" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", cat: "tech" },
  { name: "Engadget", url: "https://www.engadget.com/rss.xml", cat: "tech" },

  { name: "Variety", url: "https://variety.com/feed/", cat: "screen" },
  { name: "AV Club", url: "https://www.avclub.com/rss", cat: "screen" },
];

export type Story = {
  id: string;
  title: string;
  url: string;
  source: string;
  cat: Category;
  published: string | null;
  /** Audio. */
  listen?: boolean;
  /** Runtime in whole minutes, when the feed declares one. */
  mins?: number;
};

/**
 * `<itunes:duration>` is specified loosely and publishers use all of it: bare
 * seconds ("2988"), "MM:SS", or "HH:MM:SS". NPR alone ships the first and the
 * third across different shows, so all three have to be read.
 */
export function durationMins(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (/^\d+$/.test(s)) {
    const m = Math.round(Number(s) / 60);
    return m > 0 ? m : undefined;
  }
  const parts = s.split(":").map(Number);
  if (!parts.length || parts.some((n) => !isFinite(n))) return undefined;
  // Right-to-left, so "MM:SS" and "HH:MM:SS" both work without branching.
  const secs = parts.reverse().reduce((total, n, i) => total + n * 60 ** i, 0);
  const m = Math.round(secs / 60);
  return m > 0 ? m : undefined;
}

const decode = (s: string): string =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")          // last, or it double-decodes the others
    .replace(/\s+/g, " ")
    .trim();

const tag = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : null;
};

/** Atom puts the URL in an attribute; RSS puts it in the element body. */
function linkOf(block: string): string | null {
  const rss = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim() && !/^\s*<\//.test(rss[1])) return decode(rss[1]);
  const atom = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  return atom ? decode(atom[1]) : null;
}

function parse(xml: string, src: Source, limit: number): Story[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: Story[] = [];
  for (const b of blocks.slice(0, limit)) {
    const title = tag(b, "title");
    const url = linkOf(b);
    if (!title || !url) continue;
    const when = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    const t = when ? Date.parse(when) : NaN;

    // Google News appends the real publisher to the headline (" … - The
    // Guardian"). Pulling it out gives a clean title *and* a truthful source,
    // instead of a dozen rows that all say "Google News".
    let clean = title;
    let source = src.name;
    if (/news\.google\.com/.test(src.url)) {
      const m = title.match(/^(.*\S)\s+-\s+([^-]{2,40})$/);
      if (m) { clean = m[1]; source = m[2].trim(); }
    }

    out.push({
      id: `${src.name}:${url}`.slice(0, 200),
      title: clean.slice(0, 180),
      url,
      source,
      cat: src.cat,
      published: isFinite(t) ? new Date(t).toISOString() : null,
      ...(src.listen ? { listen: true, mins: durationMins(tag(b, "itunes:duration")) } : {}),
    });
  }
  return out;
}

// Identify honestly as what this is. No browser spoofing: a publisher that
// blocks feed readers has made a choice, and Google News covers their stories
// anyway.
const HEADERS = {
  "User-Agent": "daymark/1.0 (+personal RSS reader; one request per 30 min)",
  Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
};

/**
 * Read at most `cap` bytes and hang up.
 *
 * `res.text()` would buffer all 9.5MB before we could look at it, so the body
 * is drained chunk by chunk and the connection cancelled the moment there is
 * enough. `cache: "no-store"` because Next's fetch cache stores whole responses
 * and these are the responses it refuses to store — the caching that matters
 * happens one level up, on the parsed result.
 */
async function readCapped(src: Source, cap: number): Promise<string> {
  // Abort, rather than `reader.cancel()`. Cancelling the reader deadlocks
  // inside Next's instrumented fetch — the page hung indefinitely and only in a
  // real Next server, never in plain Node — because something upstream is still
  // holding the other end of the body. Aborting tears down the whole request,
  // which is what we actually want anyway. The timeout is a second belt: a feed
  // that stalls mid-body must never be able to hang a render.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(src.url, { headers: HEADERS, cache: "no-store", signal: ctrl.signal });
    if (!res.ok || !res.body) return "";
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
        total += chunk.length;
        if (total >= cap) break;          // triggers the abort in `finally`
      }
    } catch {
      // An abort mid-read is the normal exit path here, not a failure: we keep
      // whatever arrived and parse it.
    }
    const buf = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { buf.set(c, at); at += c.length; }
    // A cut mid-character yields one replacement char at the very end, inside
    // the truncated item the parser is going to discard anyway.
    return new TextDecoder().decode(buf);
  } finally {
    clearTimeout(timer);
    ctrl.abort();
  }
}

async function readOne(src: Source, revalidate: number): Promise<Story[]> {
  try {
    if (src.cap) return parse(await readCapped(src, src.cap), src, src.take ?? 12);
    const res = await fetch(src.url, { headers: HEADERS, next: { revalidate } });
    if (!res.ok) return [];
    return parse(await res.text(), src, src.take ?? 12);
  } catch {
    return [];
  }
}

/**
 * The cached entry point, and the one the page should call.
 *
 * The caching has to live here rather than on the individual fetches because
 * the NPR bodies are exactly what Next's fetch cache won't hold. Caching the
 * *parsed* result instead stores about 50KB of headlines, so a revalidate
 * window costs one pass over the sources rather than one pass per page view.
 */
export const getStories = unstable_cache(
  async (): Promise<Story[]> => readStories(SOURCES),
  ["feeds"],
  { revalidate: 60 * 30, tags: ["feeds"] }
);

/** Everything at once; stragglers and failures contribute nothing. */
export async function readStories(sources: Source[] = SOURCES): Promise<Story[]> {
  const all = (await Promise.all(sources.map((s) => readOne(s, 60 * 30)))).flat();

  // Same story syndicated to two feeds shows up once.
  const seen = new Set<string>();
  const deduped = all.filter((s) => {
    const key = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 60);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return interleave(deduped.sort(byNewest));
}

const byNewest = (a: Story, b: Story): number => {
  if (!a.published) return 1;
  if (!b.published) return -1;
  return a.published < b.published ? 1 : -1;
};

/**
 * Spread the sources out instead of letting the busiest one own the top.
 *
 * Sorting purely by date is the obvious thing and the wrong thing here. Hacker
 * News posts every few minutes and NPR ships six shows a day, so a strict
 * recency sort fills all twelve visible rows with two sources and the panel
 * stops being "what's new in the things he follows" and becomes an HN mirror.
 * That was already true before NPR; adding seven feeds would have made it
 * unmissable.
 *
 * So: one item from each source, newest first, then a second from each, and so
 * on. The head of the list is maximally varied and recency still decides the
 * order *within* each round — a story from four days ago never outranks
 * this morning's from the same source, and a source that posted nothing today
 * simply contributes later.
 */
export function interleave(sorted: Story[]): Story[] {
  const buckets = new Map<string, Story[]>();
  for (const s of sorted) {
    const b = buckets.get(s.source);
    if (b) b.push(s);
    else buckets.set(s.source, [s]);
  }

  const out: Story[] = [];
  while (buckets.size) {
    const round: Story[] = [];
    for (const [name, items] of buckets) {
      round.push(items.shift()!);
      if (!items.length) buckets.delete(name);
    }
    out.push(...round.sort(byNewest));
  }
  return out;
}
