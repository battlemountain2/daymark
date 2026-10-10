export const READING_LINKS_KEY = "daymark:reading-links";
export type ReadingLink = {file:string; title:string; course:string; termStart:string; week?:number; assignment?:string};
/** Calendar dates use UTC arithmetic so DST cannot move a reading into another week. */
export function termWeek(start:string, date:string):number {
 return Math.floor((Date.parse(`${date}T12:00:00Z`)-Date.parse(`${start}T12:00:00Z`))/(7*86400000))+1;
}
export function readingUrl(file:string) {return `/?space=school&reading=${encodeURIComponent(file)}#readings`;}
export function readingsForWeek(records:Record<string,ReadingLink>,start:string,week:number) {
 return Object.values(records).filter(r=>r.termStart===start&&r.week===week);
}
export function readingsForAssignment(records:Record<string,ReadingLink>,assignment:string) {
 return Object.values(records).filter(r=>r.assignment===assignment);
}
