// Headless-Test der Simulation: node test/sim_test.js
global.self = globalThis;
for (const f of ['util','data','cats','world','events','events_content','sim','save']) require('../js/' + f + '.js');
const P = self.P;
const seed = +(process.argv[2]||12345), days = +(process.argv[3]||320), strat = process.argv[4]||'rand';
console.log('Ereignisse (ohne Gründung):', P.EVENT_COUNT());
const s = P.newGame(seed, 'Test');
P.resolve(s, s.pending[0].uid, 0);
const stageDay = {}; const seen = {}; let t0 = Date.now();
let decisions=0;
function decide(){ while (s.pending.length) { const p = s.pending[0]; const opts = P.evOpts(s,p).filter(o=>o.ok); const o = strat==='first'?opts[0]:opts[Math.floor(Math.random()*opts.length)]; seen[p.id]=(seen[p.id]||0)+1; const r=P.resolve(s,p.uid,o.i); if(!r) throw new Error('resolve failed '+p.id); decisions++; } }
for (let h = 0; h < days*24; h += 0.25) {
  P.step(s, 0.25, false);
  if (Math.random() < 0.3) decide();
  if (!stageDay[s.stage]) stageDay[s.stage] = (s.t/24).toFixed(1);
  if (h % (24*20) === 0) console.log('Tag', Math.floor(s.t/24), 'Stufe', s.stage, 'Pop', P.alive(s).length, 'Futter', s.res.food|0, 'Wissen', s.res.know|0, 'Zus', s.coh|0, 'Infra', P.infra(s)|0, 'Geb', s.b.length, 'Reg', s.regions.length, 'Trad', s.trad.length, 'Pfad', s.path);
}
console.log('Stufen erreicht an Tag:', stageDay);
console.log('Entscheidungen', decisions, 'verschiedene Ereignisse', Object.keys(seen).length);
const st=P.reqStatus(s,s.stage+1); if(st) console.log('Fehlend:', st.items.filter(i=>i.have<i.need).map(i=>i.n+' '+i.have+'/'+i.need).join(', '));
console.log('Gebäude:', Object.entries(s.b.reduce((a,b)=>(a[b.type]=(a[b.type]||0)+1,a),{})).map(e=>e.join(':')).join(' '));
console.log('Jobs:', Object.entries(P.alive(s).reduce((a,c)=>(a[c.job]=(a[c.job]||0)+1,a),{})).map(e=>e.join(':')).join(' '));
console.log('Werte', s.val, 'Lebende', P.alive(s).length, 'Gesamt', s.cats.length, 'Chronik', s.chron.length, 'ms', Date.now()-t0);
// Speichern/Laden/Offline
const json = P.serialize(s); const s2 = P.parseSave(json);
const pend0 = s2.pending.length; s2.lastReal = Date.now() - 3*24*3600*1000;
const rep = P.catchUp(s2, Date.now());
console.log('Offline 3 echte Tage:', 'sim h', rep.sim|0, 'Geburten', rep.births.length, 'Bauten', rep.built.length, 'neue Entsch.', rep.newDecisions, 'offen', s2.pending.length, 'JSON KB', (json.length/1024)|0);
const s3 = P.parseSave(json); s3.lastReal = Date.now() - 40*24*3600*1000; const rep3=P.catchUp(s3, Date.now()); console.log('Offline 40 Tage: sim', rep3.sim|0, 'eingefroren', rep3.frozen|0, 'offen', s3.pending.length, 'Pop', P.alive(s3).length);
// Determinismus
const a = P.parseSave(json), b = P.parseSave(json); a.lastReal=b.lastReal=Date.now()-3600e3; const now=Date.now(); P.catchUp(a,now); P.catchUp(b,now); console.log('Deterministisch:', P.serialize(a)===P.serialize(b));
console.log('DEBUG cap', P.housing(s)|0, 'al', P.alive(s).length, 'saving', s._saving, 'res', JSON.stringify(Object.fromEntries(Object.entries(s.res).map(([k,v])=>[k,v|0]))), 'storage', P.storage(s), 'sites', s.b.filter(b=>b.prog<1).map(b=>b.type+':'+b.prog.toFixed(2)).join(','));
