import {test} from 'node:test';
import assert from 'node:assert/strict';
import {frameLoop} from '../src/lib/frame-loop';
test('canvas owns exactly one frame and paints once with reduced motion',()=>{
 let id=0,hidden=false,reduced=false,painted=0;const pending=new Map<number,(time:number)=>void>();
 const loop=frameLoop(()=>painted++,{request:cb=>{pending.set(++id,cb);return id;},cancel:key=>{pending.delete(key);},hidden:()=>hidden,reduced:()=>reduced,interval:30});
 const tick=(time:number)=>{const [key,cb]=[...pending][0];pending.delete(key);cb(time);};
 tick(0);assert.equal(painted,1);assert.equal(pending.size,1);
 tick(10);assert.equal(painted,1);assert.equal(pending.size,1);tick(40);assert.equal(painted,2);assert.equal(pending.size,1);
 reduced=true;loop.redraw();tick(41);assert.equal(painted,3);assert.equal(pending.size,0);
 loop.redraw();tick(42);assert.equal(painted,4);assert.equal(pending.size,0);
 hidden=true;loop.redraw();assert.equal(pending.size,0);
 hidden=false;reduced=false;loop.redraw();tick(50);assert.equal(pending.size,1);
 loop.stop();assert.equal(pending.size,0);loop.redraw();assert.equal(pending.size,0);
});
