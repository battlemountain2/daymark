import {groupMusicEditions} from "./radar-reconcile";
export type Follow = {
  id: string;
  provider: "tvmaze" | "musicbrainz";
  name: string;
  detail: string;
  url: string;
};
export type Release = {
  id: string;
  title: string;
  date: string;
  url: string;
  kind: string;
  source?: string;
  follow?: string;
  artworkId?: string;
};
let nextMusic = 0;
let queue: Promise<unknown> = Promise.resolve();
export async function remote(url: string, music = false) {
  const request = async () => {
    if (music) {
      const wait = Math.max(0, nextMusic - Date.now());
      if (wait) await new Promise((r) => setTimeout(r, wait));
      nextMusic = Date.now() + 1100;
    }
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Daymark/1.0 (personal release calendar; https://hey-brayan.vercel.app)",
      },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok)
      throw Error("The release source is unavailable. Try again later.");
    return r.json();
  };
  if (!music) return request();
  const job = queue.then(request, request);
  queue = job.catch(() => {});
  return job;
}
export async function searchFollows(
  provider: string,
  query: string,
): Promise<Follow[]> {
  if (provider === "tvmaze") {
    const found = await remote(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`,
    );
    return found
      .slice(0, 6)
      .map(
        (r: {
          show: {
            id: number;
            name: string;
            premiered: string;
            type: string;
            url: string;
          };
        }) => ({
          id: String(r.show.id),
          provider: "tvmaze",
          name: r.show.name,
          detail: `${r.show.premiered || "Year unknown"} · ${r.show.type}`,
          url: r.show.url,
        }),
      );
  }
  const found = await remote(
    `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query.replace(/[+\-!(){}\[\]^"~*?:\\/]/g, " "))}&fmt=json&limit=6`,
    true,
  );
  return (found.artists || []).map(
    (a: {
      id: string;
      name: string;
      disambiguation?: string;
      country?: string;
    }) => ({
      id: a.id,
      provider: "musicbrainz",
      name: a.name,
      detail:
        [a.disambiguation, a.country].filter(Boolean).join(" · ") || "Artist",
      url: `https://musicbrainz.org/artist/${a.id}`,
    }),
  );
}
export function validFollow(provider: string, id: string) {
  return provider === "tvmaze"
    ? /^\d{1,9}$/.test(id)
    : provider === "musicbrainz" && /^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(id);
}
export async function releaseSnapshotFor(
  provider: string,
  id: string,
  now = new Date(),
): Promise<{releases:Release[];complete:boolean}> {
  const since = new Date(now.getTime() - 14 * 86400000)
      .toISOString()
      .slice(0, 10),
    until = new Date(now.getTime() + 180 * 86400000).toISOString().slice(0, 10);
  if (provider === "tvmaze") {
    const episodes = await remote(
      `https://api.tvmaze.com/shows/${id}/episodes`,
    );
    return {complete:true,releases:episodes
      .filter(
        (e: { airdate?: string }) =>
          e.airdate && e.airdate >= since && e.airdate <= until,
      )
      .map(
        (e: {
          id: number;
          name: string;
          season: number;
          number: number;
          airdate: string;
          url: string;
        }) => ({
          id: `tvmaze:${e.id}`,
          title: `S${e.season} E${e.number} · ${e.name}`,
          date: e.airdate,
          url: e.url,
          kind: "Show",
          source: "TVmaze",
          follow: `tvmaze:${id}`,
        }),
      )};
  }
  const query = `arid:${id} AND status:official AND date:[${since} TO ${until}]`;
  const result = await remote(
    `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=50`,
    true,
  );
  return {complete:Number(result.count ?? result.releases?.length ?? 0) <= (result.releases?.length ?? 0),releases:groupMusicEditions(result.releases || [],since,until).map(r=>({
    id:`musicbrainz:${r['release-group']?.id || r.id}`,
    artworkId:r.id,
    title:r.title,date:r.date!,url:`https://musicbrainz.org/release/${r.id}`,
    kind:'Music edition',source:'MusicBrainz · edition date',follow:`musicbrainz:${id}`,
  }))};
}
export async function releasesFor(provider:string,id:string,now=new Date()):Promise<Release[]>{return (await releaseSnapshotFor(provider,id,now)).releases;}
