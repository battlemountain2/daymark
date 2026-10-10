import {hhmm,type ClassBlock} from './schedule';
export type WorkoutWindow={start:number;lastStart:number;end:number};
export function workoutWindows(classes:ClassBlock[],now:number,duration=60,buffer=20):WorkoutWindow[] {
 if(!Number.isFinite(now)||!Number.isInteger(duration)||duration<15||duration>180||!Number.isInteger(buffer)||buffer<0||buffer>60)return [];
 const start=Math.max(8*60,now),end=21*60;
 if(start>=end)return [];
 const blocks=classes.map(c=>({start:hhmm(c.start),end:hhmm(c.end)})).filter(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.end>c.start).sort((a,b)=>a.start-b.start);
 const free:{start:number;end:number}[]=[];let cursor=start;
 for(const block of blocks){if(block.end<=cursor)continue;if(block.start>cursor)free.push({start:cursor,end:Math.min(end,block.start)});cursor=Math.max(cursor,block.end);if(cursor>=end)break;}
 if(cursor<end)free.push({start:cursor,end});
 return free.map(g=>({start:g.start+buffer,lastStart:g.end-buffer-duration,end:g.end-buffer})).filter(g=>g.lastStart>=g.start).slice(0,3);
}
