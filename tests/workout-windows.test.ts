import {test} from 'node:test';import assert from 'node:assert/strict';import {workoutWindows} from '../src/lib/workout-windows';import type {ClassBlock} from '../src/lib/schedule';
const block=(start:string,end:string):ClassBlock=>({start,end,code:'TEST',title:'Class',where:'Campus',ck:'his'});
test('workout windows fit duration and both buffers, never overlap classes or suggest past starts',()=>{
 const classes=[block('09:00','10:45'),block('14:00','14:50')];
 const windows=workoutWindows(classes,8*60,60,20);
 assert.equal(windows[0].start,10*60+45+20);
 for(const w of windows){assert.ok(w.start>=8*60);assert.ok(w.lastStart>=w.start);assert.ok(w.lastStart+60<=w.end);assert.ok(w.end<=21*60);}
 assert.deepEqual(workoutWindows(classes,21*60),[]);
 assert.deepEqual(workoutWindows(classes,8*60,NaN),[]);
});
test('overlapping classes merge before finding free workout space',()=>{
 const windows=workoutWindows([block('09:00','11:00'),block('10:00','12:00')],9*60,60,20);
 assert.equal(windows[0].start,12*60+20);
});
