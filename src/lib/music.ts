/**
 * What he's actually listening to.
 *
 * This replaces a frozen 76-album catalogue that "Record of the Day" rotated
 * through. A museum of what he owned in August is less interesting than what he
 * played yesterday, and the cover art is better besides.
 *
 * Two backends, because the first one is fragile:
 *
 *  - **Last.fm** is where his history lives (`adox23`), but it needs an API key
 *    and Last.fm suspends them liberally — the first key we tried came back
 *    "API Key Suspended" within minutes of creation.
 *  - **ListenBrainz** needs no key at all, is open, and even serves
 *    collaborative-filtering recommendations for free. It can import a full
 *    Last.fm history, so it's a real escape hatch rather than a downgrade.
 *
 * Whichever is configured wins; if both are, Last.fm goes first. If neither
 * works the panel says so rather than pretending.
 */

export type Track = {
  artist: string;
  title: string;
  album: string | null;
  /** Square cover, largest the source offers. Null when nothing is known. */
  art: string | null;
  url: string | null;
  playedAt: string | null;
  nowPlaying: boolean;
};

export type TopArtist = { name: string; plays: number | null; url: string | null };

export type Suggestion = { name: string; reason: string; url: string | null };

export type Music = {
  source: "lastfm" | "listenbrainz" | null;
  user: string | null;
  recent: Track[];
  top: TopArtist[];
  suggestions: Suggestion[];
  totalScrobbles: number | null;
  error: string | null;
  /**
   * Why the preferred source wasn't used, when a fallback still worked.
   * Without this a suspended Last.fm key looks identical to a working one —
   * the panel fills with ListenBrainz data and nothing says why.
   */
  note: string | null;
};

const EMPTY: Music = {
  source: null, user: null, recent: [], top: [],
  suggestions: [], totalScrobbles: null, error: null, note: null,
};

const UA = { "User-Agent": "daymark/1.0 (personal dashboard)" };

/* ------------------------------------------------------------------ Last.fm */

const LFM = "https://ws.audioscrobbler.com/2.0/";

async function lfm(method: string, params: Record<string, string>, revalidate: number) {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("LASTFM_API_KEY is not set");
  const q = new URLSearchParams({ method, api_key: key, format: "json", ...params });
  const res = await fetch(`${LFM}?${q}`, { headers: UA, next: { revalidate } });
  const json = await res.json();
  // Last.fm answers 200 with an error body as often as it uses a status code.
  if (json?.error) throw new Error(json.message || `Last.fm error ${json.error}`);
  if (!res.ok) throw new Error(`Last.fm ${res.status}`);
  return json;
}

/** Last.fm ships four sizes; the largest is the only one worth showing. */
const lfmArt = (images: any[]): string | null => {
  const pick = (s: string) => images?.find((i) => i.size === s)?.["#text"] || "";
  const url = pick("extralarge") || pick("large") || pick("medium");
  return url && !url.includes("2a96cbd8b46e442fc41c2b86b821562f") ? url : null;
};

async function fromLastfm(user: string): Promise<Music> {
  const [recentRes, topRes, libraryRes] = await Promise.all([
    lfm("user.getrecenttracks", { user, limit: "12" }, 300),
    lfm("user.gettopartists", { user, period: "1month", limit: "8" }, 60 * 60),
    // A separate, much longer list used only to filter suggestions. With ~4,700
    // artists scrobbled, excluding just this month's top eight would recommend
    // him things he has played hundreds of times. Cached for a day; it barely
    // moves.
    lfm("user.gettopartists", { user, period: "overall", limit: "300" }, 60 * 60 * 24)
      .catch(() => null),
  ]);

  const rawRecent = recentRes?.recenttracks?.track ?? [];
  const recent: Track[] = (Array.isArray(rawRecent) ? rawRecent : [rawRecent]).map((t: any) => ({
    artist: t.artist?.["#text"] ?? "",
    title: t.name ?? "",
    album: t.album?.["#text"] || null,
    art: lfmArt(t.image),
    url: t.url ?? null,
    playedAt: t.date?.uts ? new Date(Number(t.date.uts) * 1000).toISOString() : null,
    nowPlaying: t["@attr"]?.nowplaying === "true",
  }));

  const top: TopArtist[] = (topRes?.topartists?.artist ?? []).map((a: any) => ({
    name: a.name, plays: Number(a.playcount) || null, url: a.url ?? null,
  }));

  // Suggestions come from artists similar to his recent favourites, minus
  // everything already in his library — otherwise it recommends him back to
  // himself, which for a 149,000-scrobble account is most of the output.
  const known = new Set(top.map((a) => a.name.toLowerCase()));
  for (const t of recent) known.add(t.artist.toLowerCase());
  for (const a of libraryRes?.topartists?.artist ?? []) known.add(String(a.name).toLowerCase());

  const seeds = top.slice(0, 4);
  const similar = await Promise.all(
    seeds.map((s) =>
      lfm("artist.getsimilar", { artist: s.name, limit: "40", autocorrect: "1" }, 60 * 60 * 12)
        .then((r) => ({ seed: s.name, list: r?.similarartists?.artist ?? [] }))
        .catch(() => ({ seed: s.name, list: [] as any[] }))
    )
  );

  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  // Two passes: one candidate per seed first so the list stays varied, then
  // top up from whatever is left. With a large library most candidates get
  // filtered, and a strict one-per-seed rule returned almost nothing.
  for (const pass of [1, 3]) {
    for (const { seed, list } of similar) {
      let taken = 0;
      for (const a of list) {
        if (taken >= pass) break;
        const k = String(a.name).toLowerCase();
        if (known.has(k) || seen.has(k)) continue;
        seen.add(k);
        taken++;
        suggestions.push({ name: a.name, reason: `like ${seed}`, url: a.url ?? null });
      }
    }
    if (suggestions.length >= 5) break;
  }

  return {
    source: "lastfm",
    user,
    recent,
    top,
    suggestions: suggestions.slice(0, 5),
    totalScrobbles: Number(recentRes?.recenttracks?.["@attr"]?.total) || null,
    error: null,
    note: null,
  };
}

/* ------------------------------------------------------------- ListenBrainz */

const LB = "https://api.listenbrainz.org/1";

const lb = async (path: string, revalidate: number) => {
  const res = await fetch(`${LB}${path}`, { headers: UA, next: { revalidate } });
  if (!res.ok) throw new Error(`ListenBrainz ${res.status}`);
  const text = await res.text();
  // Some stats endpoints answer 200 with an empty body when nothing has been
  // computed for that user yet. JSON.parse would throw on that.
  return text ? JSON.parse(text) : null;
};

/** Cover art from the recording's release MBID, via the Cover Art Archive. */
const cover = (mbid: string | null | undefined): string | null =>
  mbid ? `https://coverartarchive.org/release/${mbid}/front-250` : null;

async function fromListenBrainz(user: string): Promise<Music> {
  const [listens, nowRes, artistsRes] = await Promise.all([
    lb(`/user/${encodeURIComponent(user)}/listens?count=12`, 300),
    lb(`/user/${encodeURIComponent(user)}/playing-now`, 60).catch(() => null),
    lb(`/stats/user/${encodeURIComponent(user)}/artists?count=8&range=month`, 60 * 60).catch(() => null),
  ]);

  const toTrack = (l: any, nowPlaying: boolean): Track => {
    const m = l?.track_metadata ?? {};
    return {
      artist: m.artist_name ?? "",
      title: m.track_name ?? "",
      album: m.release_name || null,
      art: cover(m.mbid_mapping?.release_mbid ?? m.additional_info?.release_mbid),
      url: null,
      playedAt: l?.listened_at ? new Date(l.listened_at * 1000).toISOString() : null,
      nowPlaying,
    };
  };

  const nowList = (nowRes?.payload?.listens ?? []).map((l: any) => toTrack(l, true));
  const recent = [...nowList, ...(listens?.payload?.listens ?? []).map((l: any) => toTrack(l, false))];

  const top: TopArtist[] = (artistsRes?.payload?.artists ?? []).map((a: any) => ({
    name: a.artist_name, plays: a.listen_count ?? null, url: null,
  }));

  // ListenBrainz gives collaborative-filtering recommendations for free, but
  // they come back as MBIDs; resolving every one costs a request each, so this
  // only labels them generically rather than pretending to know why.
  let suggestions: Suggestion[] = [];
  try {
    const rec = await lb(`/cf/recommendation/user/${encodeURIComponent(user)}/recording?count=5`, 60 * 60 * 12);
    const mbids = rec?.payload?.mbids ?? [];
    suggestions = mbids.slice(0, 5).map((m: any) => ({
      name: m.recording_mbid,
      reason: "from your listening",
      url: `https://musicbrainz.org/recording/${m.recording_mbid}`,
    }));
  } catch {
    // Recommendations are computed in batches; a new account simply has none.
  }

  return {
    source: "listenbrainz",
    user,
    recent,
    top,
    suggestions,
    totalScrobbles: listens?.payload?.count ?? null,
    error: null,
    note: null,
  };
}

/* -------------------------------------------------------------------- entry */

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function getMusic(): Promise<Music> {
  const lastfmUser = process.env.LASTFM_USER;
  const lastfmKey = process.env.LASTFM_API_KEY;
  const lbUser = process.env.LISTENBRAINZ_USER;

  // Name the missing half. "Set LASTFM_USER + LASTFM_API_KEY" when one of them
  // is already set is a maddening thing to read.
  let note: string | null = null;
  if (lastfmKey && !lastfmUser) note = "LASTFM_API_KEY is set but LASTFM_USER is not.";
  if (lastfmUser && !lastfmKey) note = "LASTFM_USER is set but LASTFM_API_KEY is not.";

  if (lastfmUser && lastfmKey) {
    try {
      return await fromLastfm(lastfmUser);
    } catch (e) {
      // Carry the reason forward even if the fallback succeeds. Swallowing it
      // is how a suspended key becomes invisible: the panel fills with
      // ListenBrainz data and nothing ever says Last.fm was skipped.
      note = `Last.fm: ${msg(e)}`;
      if (!lbUser) return { ...EMPTY, error: note };
    }
  }

  if (lbUser) {
    try {
      return { ...(await fromListenBrainz(lbUser)), note };
    } catch (e) {
      return { ...EMPTY, error: `ListenBrainz: ${msg(e)}${note ? ` · ${note}` : ""}` };
    }
  }

  return {
    ...EMPTY,
    error: note ?? "Set LASTFM_USER + LASTFM_API_KEY, or LISTENBRAINZ_USER (no key needed).",
  };
}
