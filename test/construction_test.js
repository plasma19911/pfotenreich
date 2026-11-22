// node test/construction_test.js
const assert=require('node:assert/strict');
global.self=globalThis;
for(const f of ['util','data','cats','world','events','events_content','sim','save'])require('../js/'+f+'.js');
for(const seed of [12345,42,88])for(const option of [0,1,2]){
 const s=P.newGame(seed,'Bautest');P.resolve(s,s.pending[0].uid,option);
 assert(P.workers(s).some(c=>c.job==='builder'),'Founding must assign builders');
 P.step(s,.1,false);assert(s.b.some(b=>b.prog>0),'Construction must start immediately');
 s.cats.forEach(c=>c.job=null);P.step(s,.1,false);
 assert(P.workers(s).some(c=>c.job==='builder'),'Repair existing saves with no jobs');
 const t=s.t;for(let i=0;i<240;i++)P.step(s,.25/P.HOUR_REAL_SEC,false);
 assert(Math.abs(s.t-t-24)<1e-7,'60 seconds at 1x must equal 24 game hours');
 assert(s.b.some(b=>b.prog>=1),'First buildings must finish during the first minute');
 const fast=P.parseSave(P.serialize(s)),slow=P.parseSave(P.serialize(s)),start=fast.t;
 for(let i=0;i<96;i++)P.step(fast,.25,false);
 for(let i=0;i<240;i++)P.step(slow,.25/P.HOUR_REAL_SEC,false);
 assert(Math.abs(fast.t-slow.t)<1e-7,'0.6 seconds at 100x equals 60 seconds at 1x');
}
console.log('PASS: all founding choices, immediate work, legacy repair, one-minute days and 100x time.');
