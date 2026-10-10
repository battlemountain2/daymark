import {normalizeAlbum,type AlbumResult} from './album-art';
// Catalog identities verified against the linked Apple album pages, October 7, 2026.
export const soundtracks=[
 {title:'NieR: Automata',album:'NieR:Automata Original Soundtrack',artist:'Square Enix Music, MONACA & Keiichi Okabe',catalogId:1212176108,motif:'AUTOMATA',design:'automata',source:'https://music.apple.com/us/album/nier-automata-original-soundtrack/1212176108'},
 {title:'Cowboy Bebop',album:'COWBOY BEBOP (Original Motion Picture Soundtrack)',artist:'SEAT BELTS',catalogId:1521453383,motif:'BEBOP',design:'bebop',source:'https://music.apple.com/us/album/cowboy-bebop-original-motion-picture-soundtrack/1521453383'},
 {title:'Persona 5',album:'Persona 5 (Original Soundtrack)',artist:'ATLUS Sound Team',catalogId:1226945984,motif:'TAKE YOUR TIME',design:'persona',source:'https://music.apple.com/us/album/persona-5-original-soundtrack/1226945984'},
 {title:'Hollow Knight',album:'Hollow Knight (Original Soundtrack)',artist:'Christopher Larkin',catalogId:1263341718,motif:'HALLOWNEST',design:'hollow',source:'https://music.apple.com/us/album/hollow-knight-original-soundtrack/1263341718'},
];
export function matchSoundtrack(results:(AlbumResult & {collectionId?:number})[],item:typeof soundtracks[number]) {
 return results.find(r=>r.collectionId===item.catalogId && normalizeAlbum(r.collectionName)===normalizeAlbum(item.album) && normalizeAlbum(r.artistName)===normalizeAlbum(item.artist)) || null;
}
