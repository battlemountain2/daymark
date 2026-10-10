/** Exactly one scheduled frame; a reduced-motion scene still receives a static paint. */
export function frameLoop(draw:(time:number)=>void,environment:{request:(callback:(time:number)=>void)=>number;cancel:(id:number)=>void;hidden:()=>boolean;reduced:()=>boolean;interval:number}) {
 let pending:number|null=null,lastDraw=-Infinity,stopped=false;
 function tick(time:number) {
  pending=null;
  if(stopped||environment.hidden())return;
  if(environment.reduced()||time-lastDraw>=environment.interval){lastDraw=time;draw(time);}
  if(!stopped&&!environment.reduced())pending=environment.request(tick);
 }
 function redraw() {
  if(pending!==null)environment.cancel(pending);
  pending=null;lastDraw=-Infinity;
  if(!stopped&&!environment.hidden())pending=environment.request(tick);
 }
 redraw();
 return {redraw,stop(){stopped=true;if(pending!==null)environment.cancel(pending);pending=null;}};
}
