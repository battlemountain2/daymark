export type AlbumResult={artistName:string;collectionName:string;artworkUrl100?:string;collectionViewUrl?:string;releaseDate?:string};
export const normalizeAlbum=(s:string)=>s.normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function matchAlbum(results:AlbumResult[],artist:string,album:string,year?:string):AlbumResult|null {
 const name=normalizeAlbum(album),person=normalizeAlbum(artist);
 const matches=results.filter(r=>normalizeAlbum(r.artistName)===person&&normalizeAlbum(r.collectionName)===name);
 return matches.find(r=>year&&r.releaseDate?.startsWith(year))||matches[0]||null;
}
export function lastFmAlbumArtwork(data: {album?: {name?:string;artist?:string;image?:{'#text'?:string}[]}}, artist:string, album:string): string|null {
 const result=data.album;
 if(!result?.artist||!result.name||normalizeAlbum(result.artist)!==normalizeAlbum(artist)||normalizeAlbum(result.name)!==normalizeAlbum(album))return null;
 for(const image of [...(result.image||[])].reverse()) {
  try { const url=new URL(image['#text']||''); if(url.protocol==='https:'&&['lastfm.freetls.fastly.net','lastfm-img.freetls.fastly.net','lastfm-img2.akamaized.net'].includes(url.hostname)&&!url.username&&!url.password)return url.href; } catch {}
 }
 return null;
}
