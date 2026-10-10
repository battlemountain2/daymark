import {isSignedIn} from '@/lib/auth';
import albums from '@/data/albums.json';
import {soundtracks,matchSoundtrack} from '@/lib/soundtracks';
import {matchAlbum,lastFmAlbumArtwork} from '@/lib/album-art';
async function fallback(artist:string,album:string) {
 if(!process.env.LASTFM_API_KEY)return null;
 try {
  const query=new URLSearchParams({method:'album.getinfo',artist,album,api_key:process.env.LASTFM_API_KEY,format:'json',autocorrect:'0'});
  const r=await fetch(`https://ws.audioscrobbler.com/2.0/?${query}`,{next:{revalidate:86400},signal:AbortSignal.timeout(7000)});
  return r.ok?lastFmAlbumArtwork(await r.json(),artist,album):null;
 }catch{return null;}
}
export async function GET(req:Request){
 if(!await isSignedIn())return new Response(null,{status:401});
 const q=new URL(req.url).searchParams,artist=q.get('artist')||'',album=q.get('album')||'';
 const item=[...albums,...soundtracks].find(a=>a.artist===artist&&a.album===album);
 if(!item)return Response.json({art:null,link:null},{status:400});
 try{
  const soundtrack = soundtracks.find(s=>s.artist===artist&&s.album===album);
  const query=new URLSearchParams({term:`${artist} ${album}`,entity:'album',media:'music',limit:'25',country:'US'});
  const endpoint=soundtrack ? `https://itunes.apple.com/lookup?id=${soundtrack.catalogId}&country=US` : `https://itunes.apple.com/search?${query}`;
  const r=await fetch(endpoint,{next:{revalidate:86400},signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw Error();
  const data=await r.json(),match=soundtrack ? matchSoundtrack(data.results||[],soundtrack) : matchAlbum(data.results||[],artist,album,'year' in item?item.year??undefined:undefined);
  const appleArt=match?.artworkUrl100,link=match?.collectionViewUrl;
  const art=appleArt&&/^https:\/\/[^/]+\.mzstatic\.com\//.test(appleArt)?appleArt.replace(/100x100[^.]*\./,'600x600bb.'):await fallback(artist,album);
  return Response.json({art,link:link&&/^https:\/\/(music|itunes)\.apple\.com\//.test(link)?link:null},{headers:{'Cache-Control':art?'private, max-age=86400':'no-store'}});
 }catch{const art=await fallback(artist,album);return Response.json({art,link:null},{headers:{'Cache-Control':art?'private, max-age=86400':'no-store'}});}
}
