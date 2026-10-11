import type {Music} from "./music";
import type {Pick} from "./entertainment";
export type RediscoverAlbum={artist:string;album:string;source:string};
export function rediscoverPool(music:Music,saved:Pick[],history:Pick[],seed:Array<{artist:string;album:string}>):RediscoverAlbum[]{
  const key=(artist:string,album:string)=>`${artist.trim()}:${album.trim()}`.toLowerCase();
  const recent=new Set(music.recent.filter(t=>t.album).map(t=>key(t.artist,t.album!)));
  const personal=[...saved.filter(p=>p.kind==='album'&&p.artist).map(p=>({artist:p.artist!,album:p.title,source:'Your collection'})),...history.filter(p=>p.kind==='Listening'&&p.album&&p.artist).map(p=>({artist:p.artist!,album:p.album!,source:'Your listening history'}))];
  const unique=(items:RediscoverAlbum[])=>Array.from(new Map(items.filter(a=>!recent.has(key(a.artist,a.album))).map(a=>[key(a.artist,a.album),a])).values());
  const known=unique(personal);
  return known.length?known:unique(seed.map(a=>({...a,source:'Daymark picks'})));
}
