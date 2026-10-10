import { remote as radarRemote } from "./release-radar";
import { normalizeAlbum } from "./album-art";
export type CatalogMeta = { id: string; name: string; releaseInfo?: string; type?: string; poster?: string; description?: string; runtime?: string; trailers?: { source?: string; type?: string }[] };
export type MediaPreview = { artwork: string | null; description?: string; runtime?: string; trailer?: string; source?: string };
export function matchMedia(results: CatalogMeta[], title: string, year?: string): CatalogMeta | null {
  const matches = results.filter(m => normalizeAlbum(m.name) === normalizeAlbum(title) && /^tt\d+$/.test(m.id) && (!year || m.releaseInfo?.slice(0,4) === year));
  // Never pick a remake or ambiguous title just because it was ranked first.
  return matches.length === 1 ? matches[0] : null;
}
export function safeArtwork(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const u = new URL(value); return u.protocol === "https:" && ["images.metahub.space", "m.media-amazon.com", "image.tmdb.org", "static.tvmaze.com", "coverartarchive.org", "archive.org"].some(h => u.hostname === h || (h === "archive.org" && u.hostname.endsWith(".archive.org"))) ? value : null; } catch { return null; }
}
const remote = async (url: string) => {
  const r = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Daymark/1.0 (personal dashboard; https://hey-brayan.vercel.app)" } });
  if (!r.ok) return null;
  return r.json();
};
export async function filmPreview(title: string, year?: string, kind = "movie", imdb?:string): Promise<MediaPreview> {
  const type = kind === "show" || kind === "anime" ? "series" : "movie";
  if (imdb && !/^tt\d{1,12}$/.test(imdb)) return {artwork:null};
  const results = imdb ? null : await remote(`https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(title)}.json`);
  const match = imdb ? {id:imdb,name:title} as CatalogMeta : matchMedia(results?.metas || [], title, year);
  if (!match) return { artwork: null };
  const data = await remote(`https://v3-cinemeta.strem.io/meta/${type}/${match.id}.json`);
  const meta: CatalogMeta = data?.meta || match;
  if (imdb && meta.id !== imdb) return {artwork:null};
  const trailer = meta.trailers?.find(t => t.type === "Trailer" && /^[\w-]{11}$/.test(t.source || ""))?.source;
  return { artwork: safeArtwork(match.poster) || safeArtwork(meta.poster), description: typeof meta.description === "string" ? meta.description.slice(0, 1800) : undefined, runtime: typeof meta.runtime === "string" ? meta.runtime : undefined, trailer, source: `https://www.imdb.com/title/${match.id}/` };
}
export async function releaseArtwork(provider: string, id: string): Promise<string | null> {
  if (provider === "tvmaze") {
    const show = await remote(`https://api.tvmaze.com/shows/${id}`);
    return safeArtwork(show?.image?.original || show?.image?.medium);
  }
  const cover = await remote(`https://coverartarchive.org/release/${id}`);
  const front = cover?.images?.find((a: { front?: boolean }) => a.front);
  const image = safeArtwork(front?.thumbnails?.[500] || front?.image);
  if (image) return image;
  const release = await radarRemote(`https://musicbrainz.org/ws/2/release/${id}?inc=release-groups&fmt=json`, true);
  const group = release?.["release-group"]?.id;
  if (!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(group || "")) return null;
  const fallback = await remote(`https://coverartarchive.org/release-group/${group}`);
  const groupFront = fallback?.images?.find((a: { front?: boolean }) => a.front);
  return safeArtwork(groupFront?.thumbnails?.[500] || groupFront?.image);
}
