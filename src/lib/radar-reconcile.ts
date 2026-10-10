import type {Release} from './release-radar';
export type MusicEdition={id:string;title:string;date?:string;'release-group'?:{id:string}};
export function groupMusicEditions(rows:MusicEdition[],since:string,until:string) {
 const groups=new Map<string,MusicEdition>();
 for(const row of rows){if(!row.date||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date<since||row.date>until)continue;const key=row['release-group']?.id||row.id;const current=groups.get(key);if(!current||row.date<current.date!)groups.set(key,row);}
 return Array.from(groups.values());
}
export function missingRadarReleases(saved:Release[],fresh:Release[],follow:string,since:string,until:string) {
 const ids=new Set(fresh.map(r=>r.id));
 return saved.filter(r=>r.follow===follow && r.date>=since && r.date<=until && !ids.has(r.id)).map(r=>r.id);
}
