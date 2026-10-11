import type {Flashcard} from './study-hub-types';
import type {SRSStore} from './spaced-repetition';
import {daysBetween} from './localtime';
export function recentReviewTopics(cards:Flashcard[],store:SRSStore,today:string){
  const courses:Record<string,number>={};
  for(const card of cards){
    const history=store[card.id]?.history||[],last=history[history.length-1];
    if(!last||!/^\d{4}-\d{2}-\d{2}$/.test(last.date))continue;
    const age=daysBetween(last.date,today);
    if(age>=0&&age<=7&&last.grade<=2)courses[card.courseCode]=(courses[card.courseCode]||0)+1;
  }
  return Object.entries(courses).sort((a,b)=>b[1]-a[1]).map(([course,count])=>({course,count}));
}
