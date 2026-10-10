import films from '@/data/letterboxd.json';
export type Pick = { id: string; title: string; kind: string; url: string; detail: string; artwork?:string; occurredAt?:string; minutes?:number; year?:number; imdb?:string; tmdb?:number };
export type Entertainment = { films: Pick[]; games: Pick[]; recent: Pick[]; watching: Pick[]; releases: Pick[]; notes: string[]; refreshedAt: string };
async function json(url: string, headers?: Record<string,string>) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!r.ok) throw new Error('Provider unavailable');
  return r.json();
}
export async function getEntertainment(): Promise<Entertainment> {
  const result: Entertainment = { films: films.filter(f=>f.rating >= 4 || f.liked).map(f=>({id:f.id,title:f.title,kind:'movie',year:Number(f.year),url:f.url,detail:`Rewatch · ${f.year} · ${f.rating}/5`})),games:[],recent:[],watching:[],releases:[],notes:[],refreshedAt:new Date().toISOString() };
  await Promise.all([
    (async()=>{
      if (!process.env.STEAM_API_KEY) { result.notes.push('Steam is not connected in this environment.'); return; }
      try {
        const params = new URLSearchParams({key:process.env.STEAM_API_KEY,steamid:process.env.STEAM_ID || '76561198390517322',include_appinfo:'1',include_played_free_games:'1'});
        const [owned,recent] = await Promise.all([json(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`),json(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?${params}`)]);
        const map = (g: {appid:number;name:string;playtime_forever:number;playtime_2weeks?:number}):Pick => ({id:`steam:${g.appid}`,title:g.name,kind:'game',url:`https://store.steampowered.com/app/${g.appid}`,artwork:`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,detail:g.playtime_forever ? `${Math.round(g.playtime_forever/60)} hours played` : 'Unplayed in your library'});
        result.games=(owned.response?.games || []).map(map);
        result.recent=(recent.response?.games || []).map(map);
        if (!owned.response?.games) result.notes.push('Steam did not return your library. Check Game details privacy.');
      } catch { result.notes.push('Steam is temporarily unavailable.'); }
    })(),
    (async()=>{
      if (!process.env.TRAKT_CLIENT_ID) {result.notes.push('Trakt is not connected in this environment. Add TRAKT_CLIENT_ID from your own Trakt app to load viewing history.');return;}
      const headers={'Content-Type':'application/json','User-Agent':'Daymark/0.1.0','trakt-api-version':'2','trakt-api-key':process.env.TRAKT_CLIENT_ID};
      try {
        const user=process.env.TRAKT_USER || '2701bry';
        const response=await fetch(`https://api.trakt.tv/users/${encodeURIComponent(user)}/history/episodes?limit=20`,{headers,signal:AbortSignal.timeout(8000),cache:'no-store'});
        if (!response.ok) {
          const reason=response.status===401?'Trakt rejected the app client ID. Check TRAKT_CLIENT_ID.':response.status===403?'Trakt denied access. Check the app client ID, app approval, and account privacy settings.':response.status===404?'Trakt could not find this account. Check TRAKT_USER.':response.status===429?'Trakt’s request limit was reached. Try refreshing later.':'Trakt is temporarily unavailable.';
          result.notes.push(reason); return;
        }
        const history=await response.json();
        result.watching=history.map((h:{show:{title:string;year?:number;ids:{slug:string;imdb?:string;tmdb?:number}};episode:{season:number;number:number;title:string};watched_at:string})=>({id:`trakt:${h.show.ids.slug}:${h.episode.season}:${h.episode.number}`,title:h.show.title,year:h.show.year,imdb:h.show.ids.imdb,tmdb:h.show.ids.tmdb,occurredAt:h.watched_at,kind:'show',url:`https://trakt.tv/shows/${h.show.ids.slug}`,detail:`Last watched S${h.episode.season} E${h.episode.number} · ${h.episode.title}`}));
        result.watching=result.watching.filter((p,i,a)=>a.findIndex(x=>x.title===p.title)===i);
      } catch {result.notes.push('Trakt is temporarily unavailable.');}
    })()
  ]);
  return result;
}
