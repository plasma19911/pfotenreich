// Pfotenreich – Darstellung: Kamera, Gelände, Gebäude, Bewohner-Agenten, Licht, Wetter, Partikel
(function () {
  const P = self.P;
  const A = P.ART;
  const TAU = Math.PI * 2;
  const R = (P.R = {
    cam: { x: P.CX * P.TS, y: P.CY * P.TS, z: 1.6 },
    agents: new Map(), particles: [], lights: [], terrain: null, terrainKey: '', follow: null,
    reduced: false, quality: 2, hover: null, selB: null,
  });
  const TS = P.TS;
  const ell = A.ell;

  // ───────── Gelände-Cache ─────────
  const PAL = [
    { grass: '#789361', grass2: '#6e8856', flower: ['#f7e15a', '#ffffff', '#f49ac1'], tree: ['#4f9a45', '#3f8a3e', '#5aa64b'], sand: '#e6d39a', hill: '#9cc06a', rock: '#a29d93', water: '#598f9a', ruin: '#b8b1a2' },
    { grass: '#78894d', grass2: '#697f46', flower: ['#f2c94c', '#ffffff', '#e86f8f'], tree: ['#3f8a3a', '#2f7a35', '#4c9a42'], sand: '#e8d59a', hill: '#93b85c', rock: '#a09a8f', water: '#4e8895', ruin: '#b5ad9c' },
    { grass: '#a39460', grass2: '#938654', flower: ['#e8a33c', '#d9643a', '#f2d14b'], tree: ['#d98a3a', '#c8642f', '#b9a03a'], sand: '#dccb92', hill: '#b0a05a', rock: '#9c958a', water: '#5a95ba', ruin: '#ada594' },
    { grass: '#e9eef2', grass2: '#dce4ea', flower: ['#ffffff', '#e9eef2', '#cfd9e2'], tree: ['#d7e2ea', '#c5d3de', '#e6edf2'], sand: '#e4e6e2', hill: '#e2e9ee', rock: '#b9bec4', water: '#9cc4dc', ruin: '#c9ccd0' },
  ];
  R.palette = PAL;

  // Gelände wird in Kacheln (8×8 Felder) passend zur Zoomstufe gerendert und zwischengespeichert → scharf und speichersparend
  const CH = 8, CHPX = CH * TS;
  const chunks = new Map();
  function getChunk(s, cx, cy, lvl) {
    const k = cx + ',' + cy + ',' + lvl;
    let c = chunks.get(k);
    if (c) { chunks.delete(k); chunks.set(k, c); return c; }
    return null;
  }
  function makeChunk(s, cx, cy, lvl) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = (CHPX + 2) * lvl;
    const g = cv.getContext('2d');
    g.scale(lvl, lvl); g.translate(1-cx * CHPX, 1-cy * CHPX);
    g.beginPath(); g.rect(cx * CHPX-1, cy * CHPX-1, CHPX+2, CHPX+2); g.clip();
    drawTerrain(g, s, cx * CH - 2, cy * CH - 2, cx * CH + CH + 2, cy * CH + CH + 3);
    chunks.set(cx + ',' + cy + ',' + lvl, cv);
    while (chunks.size > 70) chunks.delete(chunks.keys().next().value);
    return cv;
  }
  function drawTerrain(g, s, X0, Y0, X1, Y1) {
    const w = s.world, se = P.season(s), pal = PAL[se];
    X0 = Math.max(0, X0); Y0 = Math.max(0, Y0); X1 = Math.min(P.W, X1); Y1 = Math.min(P.H, Y1);
    const loop = (f) => { for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) f(x, y); };
    g.fillStyle = pal.grass; g.fillRect(X0 * TS - TS, Y0 * TS - TS, (X1 - X0 + 2) * TS, (Y1 - Y0 + 2) * TS);
    const T = P.T;
    // Grundflächen mit organischen Kanten
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const t = w.tiles[y * P.W + x], px = x * TS, py = y * TS;
      const n = P.h2(x, y, w.seed);
      let c = P.shade(pal.grass,(P.fbm(x*.14,y*.14,w.seed)-.5)*.20);
      if (t === T.SAND) c = pal.sand; else if (t === T.HILL) c = pal.hill; else if (t === T.ROCK) c = pal.hill; else if (t === T.RUIN) c = pal.ruin; else if (t === T.FOREST) c = P.shade(pal.grass2, -0.08);
      g.fillStyle = c;
      if(t===T.SAND) {
        const same=(dx,dy)=>w.tiles[(y+dy)*P.W+x+dx]===T.SAND||w.tiles[(y+dy)*P.W+x+dx]===T.WATER;
        const rr=TS*.42;g.beginPath();g.roundRect(px,py,TS+.3,TS+.3,[!same(-1,0)&&!same(0,-1)?rr:0,!same(1,0)&&!same(0,-1)?rr:0,!same(1,0)&&!same(0,1)?rr:0,!same(-1,0)&&!same(0,1)?rr:0]);g.fill();
      } else g.fillRect(px,py,TS+.3,TS+.3);
    }
    // Cached fine surface detail: soil, grass, sand grains and submerged stones.
    loop((x,y)=>{
      const tile=w.tiles[y*P.W+x], px=x*TS,py=y*TS;
      for(let i=0;i<26;i++) {
        const u=P.h2(x*31+i,y,w.seed+31),v=P.h2(x,y*31+i,w.seed+47);
        g.fillStyle=i%3?'rgba(255,247,213,.075)':'rgba(23,34,20,.11)';
        g.fillRect(px+u*TS,py+v*TS,.55+u*1.7,.5+v*.7);
      }
    });
    loop((x,y)=>{
      const tile=w.tiles[y*P.W+x];if(tile!==T.GRASS&&tile!==T.FLOWER&&tile!==T.HILL)return;
      g.lineWidth=.5;
      for(let i=0;i<22;i++) {
        const u=P.h2(x*23+i,y,71),v=P.h2(x,y*23+i,72),xx=x*TS+u*TS,yy=y*TS+v*TS;
        g.strokeStyle=i%3?'rgba(43,64,28,.19)':'rgba(230,222,171,.28)';
        g.beginPath();g.moveTo(xx,yy);g.quadraticCurveTo(xx+(u-.5)*3,yy-2,xx+(u-.5)*4,yy-2-v*3);g.stroke();
      }
    });
    // Hügel-Schattierung
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const t = w.tiles[y * P.W + x];
      if (t !== T.HILL && t !== T.ROCK) continue;
      const n = P.fbm(x * 0.3, y * 0.3, w.seed + 77);
      g.fillStyle = n > 0.5 ? 'rgba(255,255,230,0.12)' : 'rgba(40,60,20,0.1)';
      g.beginPath(); g.arc(x * TS + 16, y * TS + 16, 20, 0, TAU); g.fill();
    }
    // Connected water surface with soft bank depth instead of circular tiles.
    loop((x,y)=>{
      if(w.tiles[y*P.W+x]!==T.WATER)return;
      const px=x*TS,py=y*TS;
      const wet=(xx,yy)=>xx>=0&&yy>=0&&xx<P.W&&yy<P.H&&w.tiles[yy*P.W+xx]===T.WATER;
      g.save();g.beginPath();const rr=TS*.45;
      g.roundRect(px,py,TS+.2,TS+.2,[!wet(x-1,y)&&!wet(x,y-1)?rr:0,!wet(x+1,y)&&!wet(x,y-1)?rr:0,!wet(x+1,y)&&!wet(x,y+1)?rr:0,!wet(x-1,y)&&!wet(x,y+1)?rr:0]);g.clip();
      g.fillStyle=pal.water;g.fillRect(px,py,TS+.2,TS+.2);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if(wet(x+dx,y+dy))continue;
        let gr;
        if(dx)gr=g.createLinearGradient(px+(dx<0?0:TS),0,px+(dx<0?10:TS-10),0);
        else gr=g.createLinearGradient(0,py+(dy<0?0:TS),0,py+(dy<0?10:TS-10));
        gr.addColorStop(0,'rgba(206,195,141,.70)');gr.addColorStop(.35,'rgba(142,166,137,.35)');gr.addColorStop(1,'rgba(84,137,145,0)');
        g.fillStyle=gr;g.fillRect(px,py,TS+.2,TS+.2);
      }
      for(let i=0;i<5;i++) {
        const u=P.h2(x*5+i,y,51),v=P.h2(x,y*5+i,52);
        g.strokeStyle='rgba(229,244,233,.16)';g.lineWidth=.45;g.beginPath();
        g.moveTo(px+u*24,py+v*TS);g.quadraticCurveTo(px+u*24+3,py+v*TS-1,px+u*24+6,py+v*TS);g.stroke();
      }
      g.restore();
    });
    // Pfade zwischen Gebäuden
    const done = s.b.filter((b) => !P.BUILD[b.type].virtual);
    if (done.length) {
      const pc = s.stage >= 4 ? '#c9b48e' : '#bfa274';
      g.strokeStyle = pc; g.lineCap = 'round'; g.lineWidth = s.stage >= 5 ? 9 : 7;
      g.beginPath();
      for (const b of done) {
        let best = null, bd = 1e9;
        for (const o of done) { if (o === b || o.id > b.id) continue; const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; best = o; } }
        const tx = best ? best.x : P.CX, ty = best ? best.y : P.CY;
        g.moveTo(b.x * TS + 16, b.y * TS + 26); g.quadraticCurveTo((b.x + tx) / 2 * TS + 16 + 8, (b.y + ty) / 2 * TS + 22, tx * TS + 16, ty * TS + 26);
      }
      g.stroke();
      if (s.stage >= 4) { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.setLineDash([4, 6]); g.stroke(); g.setLineDash([]); }
      // Platz in der Mitte
      g.fillStyle = s.stage >= 3 ? '#cdb994' : '#c6ac7e';
      g.beginPath(); ell(g, P.CX * TS + 16, P.CY * TS + 18, 40 + s.stage * 8, 28 + s.stage * 5, 0); g.fill();
      if (s.stage >= 4) { g.strokeStyle = 'rgba(120,100,70,0.25)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); ell(g, P.CX * TS + 16, P.CY * TS + 18, 12 * i + s.stage * 4, 8 * i + s.stage * 3, 0); g.stroke(); } }
    }
    // Blumen, Steine, Ruinen
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const t = w.tiles[y * P.W + x], px = x * TS, py = y * TS;
      if (t === T.FLOWER || (t === T.GRASS && P.h2(x, y, w.seed + 9) > 0.8)) {
        for (let i = 0; i < 3; i++) { g.fillStyle = pal.flower[(i + x) % 3]; g.beginPath(); g.arc(px + P.h2(x * 7 + i, y, 1) * TS, py + P.h2(x, y * 7 + i, 2) * TS, 1.6, 0, TAU); g.fill(); }
      }
      if (t === T.GRASS || t === T.HILL) { g.strokeStyle = 'rgba(40,80,20,0.18)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 3; i++) { const gx = px + P.h2(x + i, y * 3, 5) * TS, gy = py + P.h2(x * 3, y + i, 6) * TS; g.moveTo(gx, gy); g.lineTo(gx - 1, gy - 4); g.moveTo(gx + 2, gy); g.lineTo(gx + 3, gy - 3); } g.stroke(); }
      if (t === T.ROCK) { g.fillStyle = pal.rock; g.beginPath(); ell(g, px + 16, py + 18, 11, 7, 0); g.fill(); g.fillStyle = P.shade(pal.rock, 0.2); g.beginPath(); ell(g, px + 14, py + 15, 6, 3.5, 0); g.fill(); }
      if (t === T.RUIN) { g.strokeStyle = 'rgba(90,80,70,0.35)'; g.lineWidth = 1; g.strokeRect(px + 3, py + 3, 12, 10); g.strokeRect(px + 16, py + 14, 13, 12); if (P.h2(x, y, 4) > 0.8) { g.fillStyle = '#9a958a'; g.fillRect(px + 8, py + 4, 6, 20); g.fillStyle = '#b5b0a5'; g.fillRect(px + 8, py + 4, 6, 4); } }
      if (t === T.SAND && P.h2(x, y, 11) > 0.85) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); ell(g, px + 10, py + 20, 3, 2, 0); g.fill(); }
    }
    // Bäume (y-sortiert im Cache)
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const tr = w.tree[y * P.W + x];
      if (!tr) continue;
      const px = x * TS + 16 + (P.h2(x, y, 3) - 0.5) * 10, py = y * TS + 26;
      const sz = 0.8 + P.h2(y, x, 4) * 0.5;
      g.fillStyle = 'rgba(20,40,10,0.22)'; g.beginPath(); ell(g, px + 4, py, 14 * sz, 5 * sz, 0); g.fill();
      g.fillStyle = '#6b4a2e'; g.fillRect(px - 2.5 * sz, py - 14 * sz, 5 * sz, 14 * sz);
      const col = pal.tree[tr - 1];
      if (tr === 3 && se !== 3) { // Nadelbaum
        g.fillStyle = se === 2 ? '#3f6a3a' : '#2f6a40';
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(px - (13 - k * 3) * sz, py - (8 + k * 9) * sz); g.lineTo(px, py - (26 + k * 9) * sz); g.lineTo(px + (13 - k * 3) * sz, py - (8 + k * 9) * sz); g.fill(); }
      } else {
        g.fillStyle = P.shade(col, -0.15); g.beginPath(); g.arc(px + 2, py - 18 * sz, 13 * sz, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.arc(px - 1, py - 20 * sz, 11.5 * sz, 0, TAU); g.arc(px - 8 * sz, py - 14 * sz, 7 * sz, 0, TAU); g.arc(px + 8 * sz, py - 15 * sz, 7.5 * sz, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,220,0.18)'; g.beginPath(); g.arc(px - 4 * sz, py - 24 * sz, 5 * sz, 0, TAU); g.fill();
      }
    }
    // Small leaf clusters break up circular canopy silhouettes; kept in terrain cache.
    loop((x,y)=>{
      const tr=w.tree[y*P.W+x];
      if(!tr)return;
      const px=x*TS+16+(P.h2(x,y,3)-.5)*10,py=y*TS+26;
      const sz=.8+P.h2(y,x,4)*.5,col=pal.tree[tr-1]||pal.tree[0];
      g.strokeStyle='rgba(38,28,17,.35)';g.lineWidth=.65;
      g.beginPath();g.moveTo(px,py);g.lineTo(px-1,py-13*sz);g.stroke();
      for(let i=0;i<42;i++) {
        const a=P.h2(x*43+i,y,81)*TAU,r=Math.sqrt(P.h2(x,y*43+i,83))*11*sz;
        const lx=px+Math.cos(a)*r,ly=py-20*sz+Math.sin(a)*r*.85;
        g.fillStyle=P.shade(col,(i%4===0?.20:-.12)+Math.sin(a)*.08);
        g.beginPath();ell(g,lx,ly,(1.2+P.h2(i,x,91)*1.5)*sz,1.15*sz,a);g.fill();
      }
    });
    // Nebel über unerschlossenen Gebieten
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const ri = w.region[y * P.W + x];
      if (P.regionUnlocked(s, ri)) continue;
      const n = P.noise(x * 0.4, y * 0.4, 5);
      g.fillStyle = `rgba(236,232,222,${0.62 + n * 0.25})`;
      g.beginPath(); g.arc(x * TS + 16, y * TS + 16, TS * 0.95, 0, TAU); g.fill();
    }
    // Namen der gesperrten Gebiete
    g.font = '600 26px Georgia, serif'; g.textAlign = 'center';
    const pos = {}; for (let y = 0; y < P.H; y++) for (let x = 0; x < P.W; x++) { const ri = w.region[y * P.W + x]; if (!pos[ri]) pos[ri] = [0, 0, 0]; pos[ri][0] += x; pos[ri][1] += y; pos[ri][2]++; }
    for (const ri in pos) {
      if (P.regionUnlocked(s, +ri)) continue;
      const k = P.REGION_KEYS[ri], Rg = P.REGIONS[k];
      let cx = (pos[ri][0] / pos[ri][2]) * TS, cy = (pos[ri][1] / pos[ri][2]) * TS;
      if (k === 'meadow') { cx = P.CX * TS + 16; cy = (P.CY - 12.5) * TS; }
      g.fillStyle = 'rgba(110,95,75,0.55)'; g.fillText(Rg.n, cx, cy);
      g.font = '18px Georgia, serif'; g.fillText(Rg.st > s.stage ? `ab Stufe ${P.STAGES[Rg.st].n}` : `Erkundung ${Math.floor(Math.min(s.exp, Rg.cost))}/${Rg.cost}`, cx, cy + 26); g.font = '600 26px Georgia, serif';
    }
  }
  function key(s) { return P.season(s) + '|' + s.regions.length + '|' + s.b.length + '|' + s.stage + '|' + Math.floor(s.exp / 10); }
  R.invalidate = () => { R.terrainKey = ''; chunks.clear(); };

  // ───────── Gebäude ─────────
  const ACC = { nat: '#5fa04e', trade: '#d39b2e', inv: '#4f86b8', com: '#c45c7a' };
  const accent = (s) => ACC[s.flags.style || s.path] || '#c8483c';
  function post(g, x, y, h, w) {
    const rope=g.createLinearGradient(x-w/2,0,x+w/2,0);
    rope.addColorStop(0,'#8d714d');rope.addColorStop(.28,'#ddc49a');rope.addColorStop(.65,'#b99b70');rope.addColorStop(1,'#796040');
    g.fillStyle=rope;g.fillRect(x-w/2,y-h,w,h);
    g.strokeStyle = '#a8865a'; g.lineWidth = 1; g.beginPath();
    for (let k = 3; k < h; k += 3.5) { g.moveTo(x - w / 2, y - k); g.lineTo(x + w / 2, y - k - 1.4); }
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + w / 2 - 1.5, y - h, 1.5, h);
  }
  function plat(g, x, y, rx, ry, c) {
    g.fillStyle = P.shade(c, -0.25); g.beginPath(); ell(g, x, y + 2, rx, ry, 0); g.fill();
    g.fillStyle = c; g.beginPath(); ell(g, x, y, rx, ry, 0); g.fill();
  }
  function box(g, x, y, w, h, c, door) {
    const d = h * 0.32;
    g.fillStyle = P.shade(c, -0.18); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2 + d * 0.6, y - d * 0.6); g.lineTo(x + w / 2 + d * 0.6, y - h - d * 0.6); g.lineTo(x + w / 2, y - h); g.fill();
    const timber=g.createLinearGradient(x-w/2,y-h,x+w/2,y);
    timber.addColorStop(0,P.shade(c,.17));timber.addColorStop(.45,c);timber.addColorStop(1,P.shade(c,-.19));
    g.fillStyle=timber;g.fillRect(x-w/2,y-h,w,h);
    g.strokeStyle='rgba(63,39,20,.16)';g.lineWidth=.45;
    for(let i=3;i<h;i+=3.5){g.beginPath();g.moveTo(x-w/2,y-i);g.bezierCurveTo(x-w*.2,y-i+.8,x+w*.2,y-i-.7,x+w/2,y-i);g.stroke();}
    g.strokeStyle='rgba(255,235,199,.2)';g.beginPath();g.moveTo(x-w/2+.6,y-.5);g.lineTo(x-w/2+.6,y-h+.5);g.lineTo(x+w/2,y-h+.5);g.stroke();
    g.fillStyle = P.shade(c, 0.15); g.beginPath(); g.moveTo(x - w / 2, y - h); g.lineTo(x - w / 2 + d * 0.6, y - h - d * 0.6); g.lineTo(x + w / 2 + d * 0.6, y - h - d * 0.6); g.lineTo(x + w / 2, y - h); g.fill();
    g.strokeStyle = 'rgba(90,60,30,0.3)'; g.lineWidth = 0.7; g.strokeRect(x - w / 2, y - h, w, h);
    if (door) { g.fillStyle = '#3a2618'; g.beginPath(); g.arc(x, y - h * 0.38, Math.min(w, h) * 0.22, 0, TAU); g.fill(); }
  }
  function roof(g, x, y, w, h, c) {
    g.fillStyle = c; g.beginPath(); g.moveTo(x - w / 2 - 3, y); g.lineTo(x, y - h); g.lineTo(x + w / 2 + 3, y); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w / 2 + 3, y); g.lineTo(x + 2, y); g.fill();
  }
  function cushion(g, x, y, c) { g.fillStyle = c; g.beginPath(); ell(g, x, y, 6, 2.6, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); ell(g, x - 1.5, y - 0.8, 3, 1, 0); g.fill(); }
  function windowLight(g, x, y, s, night) {
    g.fillStyle = night ? '#ffd27a' : '#6b4a32'; g.fillRect(x - 1.8, y - 2.2, 3.6, 4.4);
    if (night) R.lights.push([x, y, 20, 0.5]);
  }
  function snowCap(g, x, y, w) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); ell(g, x, y, w / 2, 2.5, 0); g.fill(); }

  P.bHeight = function (b) {
    const t = b.type, lv = b.lv || 1;
    if (t === 'treehouse') return 30 + lv * 10;
    if (t === 'tower') return 54 + lv * 22;
    if (t === 'skytower') return 150;
    if (t === 'council') return 64;
    if (t === 'hanging') return 96;
    return 20;
  };

  const DRAW = {
    den(g, b, s, t, X, Y, n) {
      if (b.lv === 1) {
        g.fillStyle = '#7d6343'; g.beginPath(); g.arc(X, Y, 13, Math.PI, 0); g.fill();
        g.fillStyle = '#6aa64f'; g.beginPath(); g.arc(X, Y - 9, 10, Math.PI * 1.1, Math.PI * 1.9); g.fill();
        g.fillStyle = '#2a1d14'; g.beginPath(); g.arc(X, Y, 5.5, Math.PI, 0); g.fill();
        if (n) R.lights.push([X, Y - 3, 14, 0.35]);
      } else if (b.lv === 2) {
        box(g, X, Y, 22, 15, '#d4b07c', true);
        g.fillStyle = accent(s); g.fillRect(X - 9, Y - 4, 6, 3);
        if (n) R.lights.push([X, Y - 6, 16, 0.4]);
      } else {
        g.fillStyle = '#c99b5c'; g.beginPath(); g.arc(X, Y, 14, Math.PI, 0); g.fill();
        g.strokeStyle = '#a87a3e'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.arc(X, Y, 14 - i * 3, Math.PI, 0); g.stroke(); }
        g.fillStyle = '#3a2618'; g.beginPath(); g.arc(X, Y, 5.5, Math.PI, 0); g.fill();
        cushion(g, X + 10, Y + 1, accent(s));
        windowLight(g, X - 8, Y - 7, s, n);
      }
    },
    feedspot(g, b, s, t, X, Y) {
      g.fillStyle = '#8a6440'; g.beginPath(); ell(g, X - 5, Y - 1, 8, 3.5, 0); g.fill();
      g.fillStyle = '#a07850'; g.beginPath(); ell(g, X - 5, Y - 2.5, 6.5, 2.3, 0); g.fill();
      g.fillStyle = '#9fb5c4'; g.beginPath(); ell(g, X - 6, Y - 3.5, 3.5, 1.2, 0.2); g.fill(); g.beginPath(); ell(g, X - 3, Y - 3, 3, 1.1, -0.3); g.fill();
      g.fillStyle = '#7a5a36'; g.fillRect(X + 6, Y - 14, 2, 14); g.fillStyle = '#d4b07c'; g.fillRect(X + 2, Y - 16, 10, 6);
      g.fillStyle = '#5a7a9a'; g.beginPath(); ell(g, X + 7, Y - 13, 3, 1.2, 0); g.fill();
    },
    scratch(g, b, s, t, X, Y) { post(g, X, Y, 28, 6); plat(g, X, Y - 28, 9, 3, '#8a6a48'); cushion(g, X, Y - 30, accent(s)); },
    sunspot(g, b, s, t, X, Y) {
      if (b.honor && b.name && /Statue/.test(b.name)) { const c = P.cat(s, b.honor); g.fillStyle = '#b9a07a'; g.fillRect(X - 6, Y - 8, 12, 8); if (c) { g.save(); g.globalAlpha = 0.95; A.drawCat(g, c, X, Y - 8, 0.9, 1, 'sit', 0, {}); g.restore(); } return; }
      g.fillStyle = '#a49a8a'; g.beginPath(); ell(g, X, Y - 2, 12, 5, 0); g.fill(); g.fillStyle = '#bdb3a2'; g.beginPath(); ell(g, X - 1, Y - 3.5, 10, 3.6, 0); g.fill();
      cushion(g, X + 4, Y - 4, '#e2b23a');
    },
    jetty(g, b, s, t, X, Y) {
      const dir = P.nearWater(s.world, b.x, b.y) || [1, 0];
      g.fillStyle = '#8a6440';
      const L = 26;
      g.save(); g.translate(X, Y - 6);
      g.rotate(Math.atan2(dir[1], dir[0]));
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#9a7450' : '#8a6440'; g.fillRect(i * 4.5 - 2, -5, 4, 10); }
      g.fillStyle = '#6b4a2e'; g.fillRect(L - 4, -6, 2.5, 12); g.fillRect(4, -6, 2.5, 12);
      g.restore();
      g.strokeStyle = '#7a5a36'; g.lineWidth = 1; g.beginPath(); g.moveTo(X + 2, Y - 8); g.lineTo(X + dir[0] * 20 + 6, Y - 22 + dir[1] * 20); g.stroke();
      if (b.name === 'Kaimauer') { g.fillStyle = '#a9a39a'; g.fillRect(X - 14, Y - 4, 28, 5); }
    },
    treehouse(g, b, s, t, X, Y, n) {
      const lv = b.lv, H = P.bHeight(b);
      const trunks = lv === 1 ? [0] : [-8, 8];
      for (const dx of trunks) post(g, X + dx, Y, H - 4, 6);
      plat(g, X, Y - H * 0.45, 15, 4, '#8a6a48');
      plat(g, X, Y - H + 4, 16, 4.5, '#8a6a48');
      box(g, X - 2, Y - H + 3, 16, 12, '#d9b98a', true);
      if (lv >= 2) { g.strokeStyle = '#e6d6b0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X - 8, Y - H * 0.45 - 2); g.quadraticCurveTo(X, Y - H * 0.45 + 5, X + 8, Y - H * 0.45 - 2); g.stroke(); box(g, X + 6, Y - H * 0.45 - 1, 9, 8, '#cfa977', true); }
      if (lv >= 3) roof(g, X - 2, Y - H - 9, 18, 10, accent(s));
      windowLight(g, X + 3, Y - H - 3, s, n);
      cushion(g, X - 9, Y - H * 0.45 - 2, accent(s));
      if (s.flags.style === 'nat' || s.path === 'nat') { g.fillStyle = '#5aa557'; g.beginPath(); ell(g, X + 10, Y - H + 2, 5, 3, 0); ell(g, X - 12, Y - H * 0.45, 4, 2.5, 0); g.fill(); }
      if (P.season(s) === 3) snowCap(g, X - 2, Y - H - (lv >= 3 ? 9 : 2), 18);
    },
    store(g, b, s, t, X, Y) {
      box(g, X - 6, Y, 14, 12, '#cfa977'); box(g, X + 7, Y, 12, 10, '#d9b98a'); box(g, X, Y - 12, 13, 9, '#c69a62');
      g.fillStyle = '#7a8fa3'; g.beginPath(); ell(g, X - 6, Y - 6, 3.5, 1.5, 0); g.fill();
      g.fillStyle = '#8a6440'; g.beginPath(); ell(g, X + 13, Y - 3, 3.5, 5, 0); g.fill();
    },
    workshop(g, b, s, t, X, Y, n) {
      box(g, X, Y, 24, 16, '#c8a070', false);
      roof(g, X, Y - 16, 26, 10, '#a0473a');
      g.fillStyle = '#3a2618'; g.fillRect(X - 4, Y - 10, 8, 10);
      for (let i = 0; i < 4; i++) { g.fillStyle = P.ACC_COL[i]; g.beginPath(); g.arc(X - 15 + i * 2, Y - 2 - (i % 2) * 4, 3, 0, TAU); g.fill(); }
      windowLight(g, X + 8, Y - 10, s, n);
    },
    garden(g, b, s, t, X, Y) {
      g.fillStyle = '#7a5a3a'; g.beginPath(); ell(g, X, Y - 4, 15, 8, 0); g.fill();
      for (let i = 0; i < 9; i++) { const px = X - 10 + (i % 3) * 10, py = Y - 9 + Math.floor(i / 3) * 5; g.fillStyle = P.season(s) === 3 ? '#a9b8a0' : '#4f9a4a'; g.beginPath(); ell(g, px, py, 4, 2.8, 0); g.fill(); if (P.season(s) < 2) { g.fillStyle = '#b28bd8'; g.beginPath(); g.arc(px, py - 2 + Math.sin(t * 2 + i) * 0.4, 1.3, 0, TAU); g.fill(); } }
      g.strokeStyle = '#a0805a'; g.lineWidth = 1; g.beginPath(); ell(g, X, Y - 4, 16, 9, 0); g.stroke();
    },
    pond(g, b, s, t, X, Y) {
      g.fillStyle = '#9a958a'; g.beginPath(); ell(g, X, Y - 5, 15, 8, 0); g.fill();
      g.fillStyle = P.season(s) === 3 ? '#bcd7e6' : '#4e8895'; g.beginPath(); ell(g, X, Y - 5, 12, 6, 0); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.8; const r2 = (t * 4) % 6; g.beginPath(); ell(g, X + 3, Y - 5, r2, r2 * 0.5, 0); g.stroke();
      g.fillStyle = '#e8853a'; g.beginPath(); ell(g, X - 4 + Math.sin(t) * 3, Y - 5, 2, 0.9, 0); g.fill();
    },
    council(g, b, s, t, X, Y, n) {
      const H = 64;
      post(g, X - 12, Y, H, 7); post(g, X + 12, Y, H, 7); post(g, X, Y, H + 8, 9);
      plat(g, X, Y - 22, 24, 6, '#8a6a48'); plat(g, X, Y - 44, 22, 5.5, '#8a6a48'); plat(g, X, Y - H, 26, 6.5, '#7a5a3a');
      box(g, X, Y - H + 2, 24, 14, '#d9b98a', true);
      roof(g, X, Y - H - 12, 28, 14, accent(s));
      g.fillStyle = '#5a3d28'; g.fillRect(X + 14, Y - H - 30, 1.5, 20);
      const wv = Math.sin(t * 3) * 2;
      g.fillStyle = accent(s); g.beginPath(); g.moveTo(X + 15.5, Y - H - 30); g.lineTo(X + 27, Y - H - 27 + wv); g.lineTo(X + 15.5, Y - H - 23); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X + 20, Y - H - 26.5 + wv * 0.5, 1.4, 0, TAU); g.fill();
      for (const [dx, dy] of [[-14, -24], [12, -46], [-8, -46]]) cushion(g, X + dx, Y + dy, '#e2b23a');
      windowLight(g, X - 6, Y - H - 5, s, n); windowLight(g, X + 6, Y - H - 5, s, n);
    },
    festplatz(g, b, s, t, X, Y, n) {
      g.fillStyle = '#d2bd92'; g.beginPath(); ell(g, X, Y - 4, 17, 9, 0); g.fill();
      g.strokeStyle = '#b39a6a'; g.lineWidth = 1; g.beginPath(); ell(g, X, Y - 4, 12, 6, 0); g.stroke();
      for (const dx of [-16, 16]) { g.fillStyle = '#7a5a36'; g.fillRect(X + dx - 1, Y - 26, 2, 24); }
      g.strokeStyle = '#d9c9a0'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(X - 16, Y - 24); g.quadraticCurveTo(X, Y - 16, X + 16, Y - 24); g.stroke();
      for (let i = 1; i < 6; i++) { const x = X - 16 + i * 32 / 6, y = Y - 24 + Math.sin(i / 6 * Math.PI) * 7; g.fillStyle = ['#f2a04b', '#e8577a', '#f2d14b', '#7ac0e8', '#8bd17a'][i % 5]; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y); g.lineTo(x, y + 4); g.fill(); if (n || s.festUntil > s.t) R.lights.push([x, y + 2, 12, 0.5]); }
    },
    school(g, b, s, t, X, Y, n) {
      box(g, X, Y, 28, 18, '#d9b98a', false); roof(g, X, Y - 18, 30, 12, '#4f6a8a');
      g.fillStyle = '#2f3f35'; g.fillRect(X - 10, Y - 14, 9, 7); g.strokeStyle = '#fff'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(X - 9, Y - 12); g.lineTo(X - 4, Y - 11); g.stroke();
      g.fillStyle = '#3a2618'; g.fillRect(X + 3, Y - 10, 7, 10);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X, Y - 24, 2.3, 0, TAU); for (const [dx, dy] of [[-2.5, -3], [0, -4], [2.5, -3]]) g.arc(X + dx, Y - 24 + dy, 1.1, 0, TAU); g.fill();
      windowLight(g, X - 5, Y - 4, s, n);
    },
    market(g, b, s, t, X, Y) {
      for (const [dx, col] of [[-10, '#d8423a'], [10, accent(s)]]) {
        g.fillStyle = '#8a6440'; g.fillRect(X + dx - 8, Y - 14, 2, 14); g.fillRect(X + dx + 6, Y - 14, 2, 14);
        g.fillStyle = '#a07850'; g.fillRect(X + dx - 9, Y - 6, 18, 4);
        for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f3efe8' : col; g.fillRect(X + dx - 10 + k * 5, Y - 18, 5, 5); }
        g.fillStyle = '#9fb5c4'; g.beginPath(); ell(g, X + dx - 3, Y - 7, 3, 1.2, 0); ell(g, X + dx + 3, Y - 7, 3, 1.2, 0); g.fill();
      }
    },
    tinker(g, b, s, t, X, Y, n) {
      box(g, X, Y, 24, 17, '#b98a5a', false); roof(g, X, Y - 17, 26, 9, '#6a7a8a');
      g.fillStyle = '#7a6a5a'; g.fillRect(X + 6, Y - 32, 5, 14);
      for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; g.fillStyle = `rgba(230,230,230,${0.5 * (1 - k)})`; g.beginPath(); g.arc(X + 8.5 + k * 6, Y - 34 - k * 18, 2 + k * 4, 0, TAU); g.fill(); }
      g.save(); g.translate(X - 6, Y - 9); g.rotate(t); g.strokeStyle = '#d39b2e'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 4, 0, TAU); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); g.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } g.stroke(); g.restore();
      windowLight(g, X + 6, Y - 8, s, n);
    },
    greenhouse(g, b, s, t, X, Y) {
      g.fillStyle = 'rgba(170,220,200,0.45)'; g.beginPath(); g.moveTo(X - 15, Y); g.lineTo(X - 15, Y - 12); g.quadraticCurveTo(X, Y - 26, X + 15, Y - 12); g.lineTo(X + 15, Y); g.fill();
      g.strokeStyle = 'rgba(240,250,250,0.9)'; g.lineWidth = 1; g.stroke();
      g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(X + i * 6, Y); g.lineTo(X + i * 6, Y - 18 + Math.abs(i) * 3); } g.stroke();
      for (let i = 0; i < 5; i++) { g.fillStyle = '#4f9a4a'; g.beginPath(); ell(g, X - 10 + i * 5, Y - 4, 3, 4, 0); g.fill(); }
    },
    lounge(g, b, s, t, X, Y) {
      g.fillStyle = '#7a5a36'; g.fillRect(X - 13, Y - 18, 2, 18); g.fillRect(X + 11, Y - 18, 2, 18);
      g.fillStyle = accent(s); g.beginPath(); g.moveTo(X - 16, Y - 18); g.quadraticCurveTo(X, Y - 26, X + 16, Y - 18); g.lineTo(X + 14, Y - 15); g.quadraticCurveTo(X, Y - 21, X - 14, Y - 15); g.fill();
      cushion(g, X - 6, Y - 2, '#e2b23a'); cushion(g, X + 6, Y - 1, '#e07aa5'); cushion(g, X, Y - 5, '#7ac0e8');
    },
    tower(g, b, s, t, X, Y, n) {
      const lv = b.lv, H = P.bHeight(b), floors = Math.round(H / 20);
      post(g, X - 12, Y, H, 6); post(g, X + 12, Y, H, 6); post(g, X, Y, H + 6, 8);
      for (let i = 1; i <= floors; i++) {
        const fy = Y - i * (H / floors);
        plat(g, X, fy, 20, 5, i % 2 ? '#8a6a48' : '#7a5a3a');
        box(g, X + (i % 2 ? -6 : 6), fy + 1, 14, 11, i % 3 ? '#d9b98a' : '#cfa977', true);
        windowLight(g, X + (i % 2 ? 4 : -4), fy - 6, s, n);
        if (s.flags.style === 'nat') { g.fillStyle = '#5aa557'; g.beginPath(); ell(g, X + (i % 2 ? 12 : -12), fy - 1, 5, 3, 0); g.fill(); }
        if (s.flags.style === 'com' && i % 2) cushion(g, X - 14, fy - 1, '#e07aa5');
      }
      if (s.flags.style === 'inv') { g.strokeStyle = '#8b8f96'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(X + 19, Y); g.lineTo(X + 19, Y - H); g.stroke(); const ly = Y - ((t * 15) % H); g.fillStyle = '#d39b2e'; g.fillRect(X + 16, ly - 4, 6, 4); }
      if (s.flags.style === 'trade') { g.fillStyle = '#d39b2e'; g.fillRect(X - 20, Y - H * 0.5, 40, 2); }
      roof(g, X, Y - H - 8, 26, 14, accent(s));
      if (P.season(s) === 3) snowCap(g, X, Y - H - 8, 26);
    },
    skytower(g, b, s, t, X, Y, n) {
      const H = P.bHeight(b), floors = 8;
      for (const dx of [-16, 0, 16]) post(g, X + dx, Y, H + (dx ? 0 : 10), dx ? 7 : 10);
      for (let i = 1; i <= floors; i++) {
        const fy = Y - i * (H / floors), w = 26 - i;
        plat(g, X, fy, w, 6, i % 2 ? '#8a6a48' : '#7a5a3a');
        box(g, X - 8, fy + 1, 13, 11, '#d9b98a', true); box(g, X + 8, fy + 1, 12, 10, '#cfa977', true);
        windowLight(g, X - 8, fy - 7, s, n); windowLight(g, X + 8, fy - 6, s, n);
        if (s.path === 'nat' || s.flags.style === 'nat' || i % 3 === 0) { g.fillStyle = '#5aa557'; g.beginPath(); ell(g, X + w - 4, fy - 1, 6, 3.5, 0); ell(g, X - w + 4, fy - 1, 5, 3, 0); g.fill(); }
      }
      g.fillStyle = '#4f9a4a'; g.beginPath(); g.arc(X, Y - H - 14, 16, 0, TAU); g.arc(X - 12, Y - H - 6, 10, 0, TAU); g.arc(X + 12, Y - H - 6, 10, 0, TAU); g.fill();
      g.fillStyle = accent(s); g.fillRect(X - 1, Y - H - 44, 2, 20); g.beginPath(); g.moveTo(X + 1, Y - H - 44); g.lineTo(X + 14, Y - H - 40 + Math.sin(t * 3) * 2); g.lineTo(X + 1, Y - H - 36); g.fill();
    },
    monument(g, b, s, t, X, Y) {
      g.fillStyle = '#a9a093'; g.fillRect(X - 14, Y - 6, 28, 6); g.fillStyle = '#bdb4a6'; g.fillRect(X - 10, Y - 16, 20, 10);
      const ids = s.flags.monument && typeof s.flags.monument === 'number' ? [s.flags.monument] : s.cats.filter((c) => c.founder).slice(0, 3).map((c) => c.id);
      ids.forEach((id, i) => { const c = P.cat(s, id); if (!c) return; const bronze = { ...c, look: { ...c.look, fur: 6, pat: 0, acc: 0, pc: -1 } }; A.drawCat(g, bronze, X + (i - (ids.length - 1) / 2) * 9, Y - 16, ids.length > 1 ? 0.8 : 1.2, i % 2 ? -1 : 1, 'sit', 0, {}); });
      g.fillStyle = '#e2b23a'; g.fillRect(X - 5, Y - 12, 10, 3);
    },
    memorial(g, b, s, t, X, Y) {
      g.fillStyle = '#9a958a'; g.beginPath(); g.moveTo(X - 6, Y); g.lineTo(X - 6, Y - 10); g.quadraticCurveTo(X, Y - 17, X + 6, Y - 10); g.lineTo(X + 6, Y); g.fill();
      g.fillStyle = '#7a756a'; g.beginPath(); g.arc(X, Y - 8, 1.8, 0, TAU); for (const [dx, dy] of [[-2, -2.5], [0, -3.3], [2, -2.5]]) g.arc(X + dx, Y - 8 + dy, 0.8, 0, TAU); g.fill();
      g.fillStyle = '#f2d14b'; g.beginPath(); g.arc(X + 7, Y - 1, 1.5, 0, TAU); g.fill(); g.fillStyle = '#f28bb0'; g.beginPath(); g.arc(X - 7, Y - 1, 1.5, 0, TAU); g.fill();
    },
    tunnel(g, b, s, t, X, Y) {
      g.fillStyle = '#8a7a62'; g.beginPath(); g.arc(X, Y, 15, Math.PI, 0); g.fill();
      g.fillStyle = '#a9a093'; g.beginPath(); g.arc(X, Y, 9, Math.PI, 0); g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(X, Y, 7, Math.PI, 0); g.fill();
    },
    hanging(g, b, s, t, X, Y) {
      DRAW.tower(g, { type: 'tower', lv: 2 }, s, t, X, Y, false);
      g.fillStyle = '#4f9a4a';
      for (let i = 0; i < 12; i++) { const vx = X - 18 + (i % 6) * 7, vy = Y - 30 - Math.floor(i / 6) * 40; g.beginPath(); ell(g, vx, vy, 4, 8 + Math.sin(t + i) * 1.5, 0); g.fill(); g.fillStyle = i % 2 ? '#e86f8f' : '#4f9a4a'; }
    },
    harbor(g, b, s, t, X, Y) {
      DRAW.jetty(g, b, s, t, X, Y); box(g, X - 6, Y, 16, 12, '#c69a62', true);
      g.fillStyle = '#c69a62'; const bx = X + 12 + Math.sin(t) * 2; g.beginPath(); g.moveTo(bx - 8, Y - 4); g.lineTo(bx + 8, Y - 4); g.lineTo(bx + 5, Y + 1); g.lineTo(bx - 5, Y + 1); g.fill();
      g.fillStyle = '#f3efe8'; g.beginPath(); g.moveTo(bx, Y - 18); g.lineTo(bx + 7, Y - 6); g.lineTo(bx, Y - 6); g.fill();
    },
    cable(g, b, s, t, X, Y) {
      post(g, X, Y, 40, 8); box(g, X, Y - 40, 16, 10, '#b98a5a', false);
      const c = s.b.find((o) => o.type === 'council' || o.type === 'skytower');
      if (c) { const cx = c.x * TS + 16, cy = c.y * TS + 26 - P.bHeight(c); g.strokeStyle = '#5a4a3a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(X, Y - 46); g.lineTo(cx, cy); g.stroke(); const k = (Math.sin(t * 0.4) + 1) / 2; const gx = X + (cx - X) * k, gy = Y - 46 + (cy - Y + 46) * k; g.fillStyle = '#d39b2e'; g.fillRect(gx - 4, gy, 8, 6); }
    },
    amphi(g, b, s, t, X, Y) {
      for (let i = 3; i >= 0; i--) { g.fillStyle = i % 2 ? '#c9b48e' : '#b9a47e'; g.beginPath(); g.arc(X, Y - 2, 8 + i * 5, Math.PI, 0); g.fill(); }
      g.fillStyle = accent(s); g.beginPath(); ell(g, X, Y - 3, 6, 2.5, 0); g.fill();
    },
  };

  function drawBuilding(g, b, s, t, night) {
    const X = b.x * TS + 16, Y = b.y * TS + 26;
    const draw = DRAW[b.type];
    if (!draw) return;
    if (b.prog < 1) {
      // Baustelle: Gerüst, aufsteigendes Gebäude, Staub
      const H = P.bHeight(b) + 10;
      g.fillStyle = 'rgba(120,90,60,0.25)'; g.beginPath(); ell(g, X, Y, 18, 6, 0); g.fill();
      g.save(); g.beginPath(); g.rect(X - 60, Y - H * b.prog - 4, 120, H * b.prog + 10); g.clip(); g.globalAlpha = 0.85; draw(g, b, s, t, X, Y, false); g.restore();
      g.strokeStyle = '#8a6440'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(X - 14, Y); g.lineTo(X - 14, Y - H); g.moveTo(X + 14, Y); g.lineTo(X + 14, Y - H);
      for (let k = 8; k < H; k += 10) { g.moveTo(X - 14, Y - k); g.lineTo(X + 14, Y - k); }
      g.stroke();
      g.fillStyle = '#e2b23a'; g.fillRect(X - 12, Y - H * b.prog - 2, 24, 2);
      if (!R.reduced && Math.random() < 0.08) R.particles.push({ x: X + (Math.random() - 0.5) * 24, y: Y - 2, vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 6, life: 1.2, k: 'dust' });
      return;
    }
    draw(g, b, s, t, X, Y, night);
    if (b.cond < 55) { g.strokeStyle = 'rgba(70,50,30,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X - 6, Y - 10); g.lineTo(X - 2, Y - 6); g.lineTo(X - 5, Y - 2); g.stroke(); }
    if (b.honor && P.BUILD[b.type].tall !== undefined) { g.fillStyle = '#e2b23a'; A.star(g, X + 14, Y - 6, 3); }
  }
  function bridgeCurve(s, br) {
    const A1 = s.b.find((x) => x.id === br.a), B1 = s.b.find((x) => x.id === br.bb);
    if (!A1 || !B1) return null;
    const ax = A1.x * TS + 16, ay = A1.y * TS + 26 - P.bHeight(A1) + 6, bx = B1.x * TS + 16, by = B1.y * TS + 26 - P.bHeight(B1) + 6;
    return { ax, ay, bx, by, mx: (ax + bx) / 2, my: (ay + by) / 2 + 14 };
  }
  R.bridgeCurve = bridgeCurve;
  function drawBridge(g, s, br) {
    const c = bridgeCurve(s, br);
    if (!c) return;
    const prog = br.prog;
    g.save();
    if (prog < 1) g.globalAlpha = 0.45 + prog * 0.4;
    g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(c.ax, c.ay - 6); g.quadraticCurveTo(c.mx, c.my - 6, c.bx, c.by - 6); g.stroke();
    const n = Math.max(4, Math.floor(Math.hypot(c.bx - c.ax, c.by - c.ay) / 6));
    for (let i = 0; i <= n * prog; i++) {
      const k = i / n, x = (1 - k) * (1 - k) * c.ax + 2 * (1 - k) * k * c.mx + k * k * c.bx, y = (1 - k) * (1 - k) * c.ay + 2 * (1 - k) * k * c.my + k * k * c.by;
      g.fillStyle = i % 2 ? '#a07850' : '#8a6440'; g.fillRect(x - 2.5, y - 1.5, 5, 3);
      g.strokeStyle = 'rgba(90,60,40,0.6)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 6); g.stroke();
    }
    g.restore();
  }
  function qpt(c, k) { return [(1 - k) * (1 - k) * c.ax + 2 * (1 - k) * k * c.mx + k * k * c.bx, (1 - k) * (1 - k) * c.ay + 2 * (1 - k) * k * c.my + k * k * c.by - 2]; }

  // ───────── Agenten: sichtbare Bewohner, deren Tun dem Simulationszustand folgt ─────────
  const MAX_AGENTS = 80;
  function chooseVisible(s) {
    const al = P.alive(s);
    if (al.length <= MAX_AGENTS) return al;
    const imp = new Set();
    if (R.follow) imp.add(R.follow);
    for (const c of al) if (c.founder) imp.add(c.id);
    for (const p of s.pending) for (const id of P.evCats(s, p)) imp.add(id);
    if (s._react) for (const r of s._react.cats) imp.add(r.id);
    const rot = Math.floor(Date.now() / 120000);
    const rest = al.filter((c) => !imp.has(c.id)).sort((a, b) => P.h2(a.id, rot, 1) - P.h2(b.id, rot, 1));
    return al.filter((c) => imp.has(c.id)).concat(rest).slice(0, MAX_AGENTS);
  }
  R.visibleCats = chooseVisible;
  function bpos(b) { return [b.x * TS + 16, b.y * TS + 26]; }
  function nearestB(s, x, y, pred) {
    let best = null, bd = 1e12;
    for (const b of s.b) { if (!pred(b)) continue; const d = (b.x * TS - x) ** 2 + (b.y * TS - y) ** 2; if (d < bd) { bd = d; best = b; } }
    return best;
  }
  function waterSpot(s, ag) {
    const b = nearestB(s, ag.x, ag.y, (b) => (b.type === 'jetty' || b.type === 'pond' || b.type === 'harbor') && b.prog >= 1);
    if (b) { const [x, y] = bpos(b); return [x + (Math.random() - 0.5) * 14, y - 4 + (Math.random() - 0.5) * 6]; }
    // nächstes Wasserfeld
    const w = s.world; let best = null, bd = 1e9;
    const tx = Math.floor(ag.x / TS), ty = Math.floor(ag.y / TS);
    for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) { const x = tx + dx, y = ty + dy; if (P.tileAt(w, x, y) !== P.T.WATER && P.nearWater(w, x, y) && P.regionUnlocked(s, w.region[y * P.W + x] || 0)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x, y]; } } }
    return best ? [best[0] * TS + 16, best[1] * TS + 20] : [P.CX * TS + 120, P.CY * TS];
  }
  function homeOf(s, c) { return s.b.find((b) => b.id === c.home && b.prog >= 1) || s.b.find((b) => P.BUILD[b.type].cap && b.prog >= 1); }

  function planAgent(s, c, ag, hour) {
    const ph = P.ph(s, c);
    const night = hour < 6 || hour >= 21.5;
    const fest = s.festUntil > s.t;
    ag.elev = 0; ag.onBridge = null;
    const home = homeOf(s, c);
    const go = (x, y, act, pose, dur) => { ag.tx = x; ag.ty = y; ag.act = act; ag.pose = pose; ag.dur = dur; ag.timer = 0; ag.arrived = false; };
    if (night) {
      if (home) { const [x, y] = bpos(home); const tall = P.BUILD[home.type].tall; const off = (c.id % 5 - 2) * 5; go(x + off, y + 2, 'sleep', 'sleep', 999); if (tall) ag.sleepElev = (P.bHeight(home) * ((c.id % 3) + 1)) / 3.4; else ag.sleepElev = 0; return; }
      go(P.CX * TS + 16 + (c.id % 7 - 3) * 8, P.CY * TS + 18 + (c.id % 3) * 6, 'sleep', 'sleep', 999); return;
    }
    if (fest && Math.random() < 0.6) {
      const fp = s.b.find((b) => b.type === 'festplatz' && b.prog >= 1) || s.b.find((b) => b.type === 'amphi');
      const [x, y] = fp ? bpos(fp) : [P.CX * TS + 16, P.CY * TS + 18];
      go(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20, 'party', Math.random() < 0.5 ? 'play' : 'sit', 8 + Math.random() * 8); return;
    }
    if (ph <= 1) {
      const p = c.parents.length ? R.agents.get(c.parents[0]) : null;
      const [bx, by] = p ? [p.x, p.y] : home ? bpos(home) : [P.CX * TS, P.CY * TS];
      go(bx + (Math.random() - 0.5) * 30, by + (Math.random() - 0.5) * 20, 'play', Math.random() < 0.7 ? 'play' : 'sit', 4 + Math.random() * 5); return;
    }
    // Freizeit je nach Stimmung/Charakter
    const leisure = c.mood < 45 ? 0.15 : c.traits.includes('gemütlich') ? 0.4 : 0.25;
    if (Math.random() < leisure || !c.job) {
      const r = Math.random();
      const spot = nearestB(s, ag.x + (Math.random() - 0.5) * 300, ag.y + (Math.random() - 0.5) * 300, (b) => b.prog >= 1 && (b.type === 'sunspot' || b.type === 'scratch' || b.type === 'lounge'));
      if (spot && r < 0.6) { const [x, y] = bpos(spot); const pose = spot.type === 'scratch' ? 'stretch' : Math.random() < 0.5 ? 'sleep' : 'groom'; go(x + (Math.random() - 0.5) * 12, y - 2, 'rest', pose, 6 + Math.random() * 10); return; }
      // Freund besuchen
      const fid = Object.keys(c.rel).find((id) => c.rel[id] > 50 && R.agents.has(+id));
      if (fid && r < 0.85) { const f = R.agents.get(+fid); go(f.x + 10, f.y + 2, 'social', 'sit', 6 + Math.random() * 6); ag.emo = 'love'; ag.emoT = 2.5; return; }
      // Brückenspaziergang
      const brs = s.b.filter((b) => b.type === 'bridge' && b.prog >= 1);
      if (brs.length && r < 0.95) { const br = brs[c.id % brs.length]; ag.onBridge = { br, k: 0, dir: Math.random() < 0.5 ? 1 : -1 }; ag.act = 'bridge'; ag.pose = 'walk'; ag.dur = 99; ag.timer = 0; return; }
      go(ag.x + (Math.random() - 0.5) * 80, ag.y + (Math.random() - 0.5) * 60, 'wander', 'walk', 3);
      return;
    }
    // Arbeit
    switch (c.job) {
      case 'fisher': { const [x, y] = waterSpot(s, ag); go(x, y, 'work', 'fish', 10 + Math.random() * 10); ag.after = 'carry'; return; }
      case 'builder': {
        const site = s.b.find((b) => b.prog < 1 && !P.BUILD[b.type].virtual) || s.b.find((b) => b.prog < 1);
        if (site) { let [x, y] = bpos(site); if (site.type === 'bridge') { const cc = bridgeCurve(s, site); if (cc) [x, y] = [cc.ax, cc.ay + P.bHeight(s.b.find((o) => o.id === site.a))]; } go(x + (Math.random() - 0.5) * 24, y + 3, 'work', 'build', 8 + Math.random() * 6); return; }
        const d = s.b.filter((b) => b.cond < 85)[0];
        if (d) { const [x, y] = bpos(d); go(x + 8, y + 2, 'work', 'build', 6); return; }
        break;
      }
      case 'gatherer': {
        const w = s.world; const tx = Math.floor(ag.x / TS) + Math.floor((Math.random() - 0.5) * 16), ty = Math.floor(ag.y / TS) + Math.floor((Math.random() - 0.5) * 16);
        if (P.regionUnlocked(s, (w.region[ty * P.W + tx]) || 0) && P.tileAt(w, tx, ty) !== P.T.WATER) { go(tx * TS + 16, ty * TS + 20, 'work', 'groom', 4 + Math.random() * 4); ag.after = 'carry'; return; }
        break;
      }
      case 'explorer': {
        // Richtung Nebelgrenze
        const a = (c.id * 1.7 + Date.now() / 60000) % TAU, r2 = 8 + (s.regions.length * 2.5);
        go((P.CX + Math.cos(a) * r2) * TS, (P.CY + Math.sin(a) * r2) * TS, 'work', 'walk', 4); return;
      }
      case 'scholar': { const b = nearestB(s, ag.x, ag.y, (b) => (b.type === 'school' || b.type === 'council') && b.prog >= 1); if (b) { const [x, y] = bpos(b); go(x + (Math.random() - 0.5) * 22, y + 4, 'work', 'read', 12); return; } break; }
      case 'crafter': case 'inventor': case 'trader': case 'gardener': {
        const types = { crafter: ['workshop'], inventor: ['tinker', 'cable'], trader: ['market', 'harbor'], gardener: ['garden', 'greenhouse', 'hanging'] }[c.job];
        const b = nearestB(s, ag.x, ag.y, (b) => types.includes(b.type) && b.prog >= 1);
        if (b) { const [x, y] = bpos(b); go(x + (Math.random() - 0.5) * 24, y + 3 + Math.random() * 4, 'work', c.job === 'gardener' ? 'groom' : c.job === 'crafter' ? 'play' : 'sit', 10); return; }
        break;
      }
      case 'carer': { const k = P.alive(s).find((x) => P.ph(s, x) <= 1 && R.agents.has(x.id)); if (k) { const a2 = R.agents.get(k.id); go(a2.x + 12, a2.y, 'work', 'sit', 8); ag.emo = 'comfort'; ag.emoT = 2; return; } break; }
    }
    go(ag.x + (Math.random() - 0.5) * 60, ag.y + (Math.random() - 0.5) * 40, 'wander', 'walk', 3);
  }

  function updateAgents(s, dt) {
    const vis = chooseVisible(s);
    const ids = new Set(vis.map((c) => c.id));
    for (const id of R.agents.keys()) if (!ids.has(id)) R.agents.delete(id);
    const hour = P.hour(s);
    for (const c of vis) {
      let ag = R.agents.get(c.id);
      if (!ag) {
        const h = homeOf(s, c);
        const [x, y] = h ? bpos(h) : [P.CX * TS + 16 + (Math.random() - 0.5) * 60, P.CY * TS + 20 + (Math.random() - 0.5) * 40];
        ag = { id: c.id, x: x + (Math.random() - 0.5) * 20, y: y + 4, tx: x, ty: y, face: 1, act: 'idle', pose: 'sit', timer: 0, dur: Math.random() * 3, elev: 0, emo: null, emoT: 0 };
        R.agents.set(c.id, ag);
      }
      ag.emoT -= dt;
      if (ag.onBridge) {
        const ob = ag.onBridge; const cc = bridgeCurve(s, ob.br);
        if (!cc) { ag.onBridge = null; continue; }
        ob.k += dt * 0.12 * ob.dir;
        const [x, y] = qpt(cc, P.clamp(ob.k < 0 ? -ob.k : ob.k, 0, 1));
        ag.bx = x; ag.by = y; ag.face = (cc.bx - cc.ax) * ob.dir > 0 ? 1 : -1; ag.pose = 'walk';
        if (Math.abs(ob.k) >= 1) { ag.onBridge = null; ag.dur = 0; ag.timer = 1; const e = s.b.find((b) => b.id === (ob.dir > 0 ? ob.br.bb : ob.br.a)); if (e) { const [ex, ey] = bpos(e); ag.x = ex; ag.y = ey; } }
        continue;
      }
      const dx = ag.tx - ag.x, dy = ag.ty - ag.y, d = Math.hypot(dx, dy);
      const speed = (P.ph(s, c) <= 1 ? 22 : 18) * (c.traits.includes('gemütlich') ? 0.8 : 1);
      if (!ag.arrived && d > 2) {
        ag.x += (dx / d) * speed * dt; ag.y += (dy / d) * speed * dt;
        ag.face = dx >= 0 ? 1 : -1;
        ag.walking = true;
        if (d > 300) { ag.x = ag.tx - (dx / d) * 300; ag.y = ag.ty - (dy / d) * 300; }
      } else {
        ag.arrived = true; ag.walking = false;
        ag.timer += dt;
        if (ag.act === 'sleep') ag.elev = ag.sleepElev || 0;
        if (ag.timer > ag.dur || (ag.act === 'sleep' && hour >= 6 && hour < 21.5)) {
          if (ag.after === 'carry') { ag.after = null; const f = nearestB(s, ag.x, ag.y, (b) => (b.type === 'feedspot' || b.type === 'store' || b.type === 'market') && b.prog >= 1); if (f) { const [x, y] = bpos(f); ag.tx = x + (Math.random() - 0.5) * 10; ag.ty = y + 4; ag.act = 'carry'; ag.pose = 'carry'; ag.dur = 1; ag.timer = 0; ag.arrived = false; continue; } }
          planAgent(s, c, ag, hour);
        }
      }
    }
    // Reaktionen nach Entscheidungen
    if (s._react && Date.now() - s._react.at < 500) {
      for (const r of s._react.cats) { const ag = R.agents.get(r.id); if (ag) { ag.emo = r.emo; ag.emoT = 6; } }
      s._react.at = 0;
    }
  }

  // ───────── Hauptzeichnung ─────────
  R.resize = (cv) => {
    const dpr = Math.min(window.devicePixelRatio || 1, R.quality >= 2 ? 2 : 1.25);
    cv.width = Math.floor(cv.clientWidth * dpr); cv.height = Math.floor(cv.clientHeight * dpr);
    R.dpr = dpr;
  };
  R.clampCam = (cv) => {
    const z = R.cam.z;
    R.cam.z = P.clamp(z, 0.45, 4);
    const hw = cv.clientWidth / 2 / R.cam.z, hh = cv.clientHeight / 2 / R.cam.z;
    R.cam.x = P.clamp(R.cam.x, Math.min(hw, P.W * TS / 2), Math.max(P.W * TS - hw, P.W * TS / 2));
    R.cam.y = P.clamp(R.cam.y, Math.min(hh, P.H * TS / 2), Math.max(P.H * TS - hh, P.H * TS / 2));
  };
  R.screenToWorld = (cv, sx, sy) => [R.cam.x + (sx - cv.clientWidth / 2) / R.cam.z, R.cam.y + (sy - cv.clientHeight / 2) / R.cam.z];

  function darkness(h) {
    if (h < 5 || h >= 21.5) return 0.58;
    if (h < 7) return 0.58 * (1 - (h - 5) / 2);
    if (h >= 19) return 0.58 * ((h - 19) / 2.5);
    return 0;
  }
  let glowSprite = null;
  function glow() {
    if (glowSprite) return glowSprite;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,200,110,1)'); gr.addColorStop(0.4, 'rgba(255,170,80,0.45)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowSprite = c; return c;
  }

  R.draw = function (cv, s, dt, tReal) {
    const g = cv.getContext('2d');
    if (!s.world) s.world = P.genWorld(s.seed);
    const k = key(s);
    if (k !== R.terrainKey || (s.worldDirty && (!R._lastT || tReal - R._lastT > 2))) { chunks.clear(); R.terrainKey = k; s.worldDirty = false; R._lastT = tReal; }
    if (R.follow) { const ag = R.agents.get(R.follow); if (ag) { R.cam.x += ((ag.onBridge ? ag.bx : ag.x) - R.cam.x) * Math.min(1, dt * 3); R.cam.y += ((ag.onBridge ? ag.by : ag.y) - 10 - R.cam.y) * Math.min(1, dt * 3); } }
    R.clampCam(cv);
    updateAgents(s, R.reduced ? dt : dt);
    const W = cv.clientWidth, H = cv.clientHeight, z = R.cam.z, dpr = R.dpr || 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-R.cam.x, -R.cam.y);
    const vx0 = R.cam.x - W / 2 / z - 40, vy0 = R.cam.y - H / 2 / z - 40, vx1 = R.cam.x + W / 2 / z + 40, vy1 = R.cam.y + H / 2 / z + 200;
    g.imageSmoothingEnabled = true;
    const want = R.quality >= 2 ? (z * dpr <= 1.1 ? 1 : z * dpr <= 2.2 ? 2 : 3) : (z * dpr <= 1.4 ? 1 : 2);
    let budget = 3;
    for (let cy = Math.max(0, Math.floor(vy0 / CHPX)); cy <= Math.min(Math.ceil(P.H / CH) - 1, Math.floor((vy1 - 160) / CHPX)); cy++) for (let cx = Math.max(0, Math.floor(vx0 / CHPX)); cx <= Math.min(Math.ceil(P.W / CH) - 1, Math.floor(vx1 / CHPX)); cx++) {
      let c = getChunk(s, cx, cy, want);
      if (!c) {
        if (budget-- > 0) c = makeChunk(s, cx, cy, want);
        else c = getChunk(s, cx, cy, 1) || getChunk(s, cx, cy, 2) || getChunk(s, cx, cy, 3) || makeChunk(s, cx, cy, 1);
      }
      const level=c.width/(CHPX+2);
      g.drawImage(c,level,level,CHPX*level,CHPX*level,cx*CHPX,cy*CHPX,CHPX+.25,CHPX+.25);
    }
    const t = tReal;
    const hour = P.hour(s), dark = darkness(hour), night = dark > 0.3;
    // Wasserglitzern
    if (!R.reduced) {
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath();
      const w = s.world;
      for (let ty = Math.max(0, Math.floor(vy0 / TS)); ty < Math.min(P.H, vy1 / TS); ty++) for (let tx = Math.max(0, Math.floor(vx0 / TS)); tx < Math.min(P.W, vx1 / TS); tx++) {
        if (w.tiles[ty * P.W + tx] !== P.T.WATER || P.season(s) === 3) continue;
        const ph = P.h2(tx, ty, 2) * 6;
        const o = Math.sin(t * 1.3 + ph);
        if (o > 0.4) { const x = tx * TS + 8 + P.h2(tx, ty, 9) * 14, y = ty * TS + 10 + P.h2(ty, tx, 9) * 12; g.moveTo(x, y); g.lineTo(x + 6 + o * 3, y); }
      }
      g.stroke();
    }
    // Zeichenliste
    R.lights.length = 0;
    const list = [];
    for (const b of s.b) {
      if (P.BUILD[b.type].virtual) continue;
      const X = b.x * TS + 16, Y = b.y * TS + 26;
      if (X < vx0 - 40 || X > vx1 + 40 || Y < vy0 || Y > vy1 + 40) continue;
      list.push({ y: Y, b });
    }
    for (const [id, ag] of R.agents) {
      if (ag.onBridge) continue;
      if (ag.x < vx0 || ag.x > vx1 || ag.y < vy0 || ag.y > vy1) continue;
      list.push({ y: ag.y + (ag.elev ? -0.1 : 0.1) + (ag.elev || 0) * 0, a: ag });
    }
    list.sort((p, q) => p.y - q.y);
    const zs = z;
    for (const it of list) {
      if (it.b) drawBuilding(g, it.b, s, t, night);
      else drawAgent(g, s, it.a, t, zs);
    }
    // Brücken und Katzen darauf
    for (const b of s.b) if (b.type === 'bridge') drawBridge(g, s, b);
    for (const [id, ag] of R.agents) if (ag.onBridge) drawAgent(g, s, ag, t, zs, true);
    // Auswahlmarkierung
    if (R.selB) { const b = s.b.find((x) => x.id === R.selB); if (b && !P.BUILD[b.type].virtual) { g.strokeStyle = 'rgba(255,240,180,0.95)'; g.lineWidth = 2 / z; g.setLineDash([4 / z, 3 / z]); g.beginPath(); ell(g, b.x * TS + 16, b.y * TS + 26, 20, 8, 0); g.stroke(); g.setLineDash([]); } }
    // Partikel
    updateParticles(g, s, dt, t, vx0, vy0, vx1, vy1, night);
    // Viertelnamen
    if (s.stage >= 4 && z < 1.4) drawDistricts(g, s, z);
    g.restore();
    // Licht & Atmosphäre (Bildschirmraum)
    const se = P.season(s);
    if (hour >= 17 && hour < 20) { g.fillStyle = `rgba(255,150,60,${0.12 * Math.sin((hour - 17) / 3 * Math.PI)})`; g.fillRect(0, 0, W, H); }
    if (hour >= 5 && hour < 7.5) { g.fillStyle = `rgba(255,190,140,${0.1 * Math.sin((hour - 5) / 2.5 * Math.PI)})`; g.fillRect(0, 0, W, H); }
    const wdark = s.weather === 'Sturm' || s.weather === 'Gewitter' ? 0.2 : s.weather === 'Regen' ? 0.1 : 0;
    if (dark + wdark > 0.01) {
      g.fillStyle = `rgba(18,24,60,${Math.min(0.7, dark + wdark)})`; g.fillRect(0, 0, W, H);
      if (dark > 0.05) {
        g.globalCompositeOperation = 'lighter';
        const gs = glow();
        for (const [lx, ly, r, a] of R.lights) {
          const sx = (lx - R.cam.x) * z + W / 2, sy = (ly - R.cam.y) * z + H / 2;
          if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
          const rr = r * z * 1.3;
          g.globalAlpha = Math.min(0.5, a * dark * 1.2);
          g.drawImage(gs, sx - rr, sy - rr, rr * 2, rr * 2);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
    }
    if (s.weather === 'Nebel') { g.fillStyle = 'rgba(235,238,240,0.28)'; g.fillRect(0, 0, W, H); }
    weatherOverlay(g, s, W, H, t, dt, se);
  };

  function drawAgent(g, s, ag, t, z, onBridge) {
    const c = P.cat(s, ag.id); if (!c) return;
    const ph = P.ph(s, c);
    const x = onBridge ? ag.bx : ag.x, y = onBridge ? ag.by : ag.y - (ag.elev || 0);
    let pose = ag.walking ? (ag.act === 'carry' ? 'carry' : 'walk') : ag.arrived ? ag.pose : 'walk';
    if (R.reduced && pose === 'walk' && !ag.walking) pose = 'sit';
    const sc = 0.62;
    A.drawCat(g, c, x, y, sc * (z < 0.8 ? 0.95 : 1), ag.face, pose, R.reduced ? 0 : t, { kid: ph <= 1 ? ph : undefined, job: ph === 2 ? c.job : null });
    if (R.follow === c.id) { g.strokeStyle = '#fff4c2'; g.lineWidth = 1.5 / z; g.beginPath(); ell(g, x, y + 1, 9, 3, 0); g.stroke(); }
    if (ag.emoT > 0 && ag.emo) A.emote(g, x + 6, y - 22, ag.emo, 0.75);
    else if (pose === 'sleep' && ((t + ag.id) % 6) < 2 && z > 1.2) A.emote(g, x + 6, y - 14, 'zzz', 0.55);
    if (z > 2.2 || R.follow === c.id) {
      g.font = '600 6px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillStyle = 'rgba(255,255,255,0.85)'; const tw = g.measureText(c.name).width + 4; g.fillRect(x - tw / 2, y + 3, tw, 8);
      g.fillStyle = '#3a2a20'; g.fillText(c.name, x, y + 9);
    }
  }

  function drawDistricts(g, s, z) {
    const groups = {};
    for (const b of s.b) { if (b.prog < 1 || P.BUILD[b.type].virtual) continue; const k = P.BUILD[b.type].k; (groups[k] || (groups[k] = [])).push(b); }
    g.font = `italic 600 ${Math.round(14 / z)}px Georgia, serif`; g.textAlign = 'center';
    const used = new Set();
    for (const d of s.districts) {
      let k = d.k; if (used.has(k)) k = ['home', 'culture', 'work', 'nature', 'water', 'food'].find((x) => !used.has(x) && groups[x]) || k; used.add(k);
      const arr = groups[k]; if (!arr || !arr.length) continue;
      const cx = arr.reduce((a, b) => a + b.x, 0) / arr.length * TS + 16, cy = arr.reduce((a, b) => a + b.y, 0) / arr.length * TS + 40;
      g.fillStyle = 'rgba(255,250,235,0.75)'; const w = g.measureText(d.n).width + 12 / z; g.fillRect(cx - w / 2, cy - 12 / z, w, 17 / z);
      g.fillStyle = '#5a3d28'; g.fillText(d.n, cx, cy);
    }
  }

  function updateParticles(g, s, dt, t, vx0, vy0, vx1, vy1, night) {
    if (R.reduced) { R.particles.length = 0; return; }
    const se = P.season(s);
    // Umgebungspartikel erzeugen
    if (R.particles.length < 90) {
      const rx = vx0 + Math.random() * (vx1 - vx0), ry = vy0 + Math.random() * (vy1 - vy0 - 160);
      if (night && se === 1 && Math.random() < 0.3) R.particles.push({ x: rx, y: ry, vx: 0, vy: 0, life: 4, k: 'fly', ph: Math.random() * 6 });
      else if (se === 2 && Math.random() < 0.08) R.particles.push({ x: rx, y: ry - 100, vx: 10 + Math.random() * 10, vy: 12, life: 6, k: 'leaf', ph: Math.random() * 6, c: ['#d98a3a', '#c8642f', '#e2b23a'][Math.floor(Math.random() * 3)] });
      else if (se === 0 && Math.random() < 0.05) R.particles.push({ x: rx, y: ry - 100, vx: 8, vy: 9, life: 6, k: 'leaf', ph: Math.random() * 6, c: '#f7c6d6' });
      else if (!night && se < 2 && Math.random() < 0.04) R.particles.push({ x: rx, y: ry, vx: 0, vy: -2, life: 3, k: 'mote', ph: Math.random() * 6 });
      if (s.festUntil > s.t && Math.random() < 0.3) { const fp = s.b.find((b) => b.type === 'festplatz') || { x: P.CX, y: P.CY }; R.particles.push({ x: fp.x * TS + 16 + (Math.random() - 0.5) * 60, y: fp.y * TS, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 20, life: 2, k: 'confetti', c: P.ACC_COL[Math.floor(Math.random() * 6)] }); }
    }
    for (let i = R.particles.length - 1; i >= 0; i--) {
      const p = R.particles[i];
      p.life -= dt;
      if (p.life <= 0) { R.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'fly') { p.x += Math.sin(t * 2 + p.ph) * 0.4; p.y += Math.cos(t * 1.7 + p.ph) * 0.3; g.fillStyle = `rgba(230,255,140,${0.4 + 0.6 * Math.abs(Math.sin(t * 3 + p.ph))})`; g.beginPath(); g.arc(p.x, p.y, 1.5, 0, TAU); g.fill(); R.lights.push([p.x, p.y, 6, 0.6]); }
      else if (p.k === 'leaf') { p.x += Math.sin(t * 2 + p.ph) * 0.5; g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(t * 2 + p.ph); g.beginPath(); ell(g, 0, 0, 2.5, 1.2, 0); g.fill(); g.restore(); }
      else if (p.k === 'mote') { g.fillStyle = `rgba(255,250,210,${0.5 * Math.sin(p.life / 3 * Math.PI)})`; g.beginPath(); g.arc(p.x, p.y, 1.2, 0, TAU); g.fill(); }
      else if (p.k === 'dust') { p.vy += 10 * dt; g.fillStyle = `rgba(180,150,110,${p.life * 0.4})`; g.beginPath(); g.arc(p.x, p.y, 2.5 + (1.2 - p.life) * 3, 0, TAU); g.fill(); }
      else if (p.k === 'confetti') { p.vy += 30 * dt; g.fillStyle = p.c; g.fillRect(p.x, p.y, 2, 3); }
      else if (p.k === 'heart') { g.save(); g.globalAlpha = Math.min(1, p.life); A.heart(g, p.x, p.y, 3); g.restore(); }
    }
  }
  R.burst = (x, y, k) => { for (let i = 0; i < 8; i++) R.particles.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 1.5, k: k || 'heart' }); };

  const rainDrops = [];
  function weatherOverlay(g, s, W, H, t, dt, se) {
    if (R.reduced) return;
    const wv = s.weather;
    if (wv === 'Regen' || wv === 'Sturm' || wv === 'Gewitter') {
      g.strokeStyle = 'rgba(200,215,235,0.5)'; g.lineWidth = 1; g.beginPath();
      const n = wv === 'Regen' ? 80 : 140, wind = wv === 'Sturm' ? 10 : 3;
      for (let i = 0; i < n; i++) { const x = (P.h2(i, 1, 3) * W + t * 60 * wind) % W, y = (P.h2(i, 2, 3) * H + t * 520) % H; g.moveTo(x, y); g.lineTo(x - wind, y + 11); }
      g.stroke();
      if (wv === 'Gewitter' && Math.sin(t * 0.7) > 0.997) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, W, H); }
    } else if (wv === 'Schnee') {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 90; i++) { const x = (P.h2(i, 1, 4) * W + Math.sin(t * 0.8 + i) * 20 + t * 8) % W, y = (P.h2(i, 2, 4) * H + t * (30 + (i % 5) * 6)) % H; g.beginPath(); g.arc(x, y, 1.2 + (i % 3) * 0.6, 0, TAU); g.fill(); }
    } else if (wv === 'sonnig' && se < 2 && darkness(P.hour(s)) === 0) {
      const gr = g.createLinearGradient(0, 0, W * 0.6, H * 0.6); gr.addColorStop(0, 'rgba(255,245,200,0.18)'); gr.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
  }

  // Antippen: Katze oder Gebäude finden
  R.pick = function (cv, s, sx, sy) {
    const [wx, wy] = R.screenToWorld(cv, sx, sy);
    let best = null, bd = (16 / Math.min(R.cam.z, 1.5)) ** 2;
    for (const [id, ag] of R.agents) {
      const x = ag.onBridge ? ag.bx : ag.x, y = (ag.onBridge ? ag.by : ag.y - (ag.elev || 0)) - 6;
      const d = (x - wx) ** 2 + (y - wy) ** 2;
      if (d < bd) { bd = d; best = { cat: id }; }
    }
    if (best) return best;
    let bb = null;
    for (const b of s.b) {
      if (P.BUILD[b.type].virtual) continue;
      const X = b.x * TS + 16, Y = b.y * TS + 26, h = P.bHeight(b) + 12;
      if (wx > X - 18 && wx < X + 18 && wy < Y + 6 && wy > Y - h) { if (!bb || Y > bb.y * TS) bb = b; }
    }
    if (bb) return { b: bb.id };
    for (const b of s.b) if (b.type === 'bridge') { const c = bridgeCurve(s, b); if (c) for (let k = 0; k <= 1; k += 0.1) { const [x, y] = qpt(c, k); if ((x - wx) ** 2 + (y - wy) ** 2 < 100) return { b: b.id }; } }
    return null;
  };
})();
