// Pfotenreich – Welt, Gelände, Regionen und Gebäudeplatzierung
(function () {
  const P = self.P;
  P.W = 60; P.H = 60; P.TS = 32; P.CX = 30; P.CY = 30;
  // Geländetypen
  P.T = { GRASS: 0, FLOWER: 1, FOREST: 2, WATER: 3, SAND: 4, ROCK: 5, HILL: 6, RUIN: 7 };
  const T = P.T;

  P.regionAt = function (x, y) {
    const dx = x - P.CX, dy = y - P.CY, d = Math.hypot(dx, dy);
    if (d < 9) return 0;
    if (d < 16) return 1;
    if (x >= 41 && y < 22) return 6;
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (a > -45 && a <= 45) return 2;
    if (a > 45 && a <= 135) return 3;
    if (a > 135 || a <= -135) return 4;
    return 5;
  };

  P.genWorld = function (seed) {
    const W = P.W, H = P.H;
    const tiles = new Uint8Array(W * H), region = new Uint8Array(W * H), tree = new Uint8Array(W * H);
    const brookX = (y) => 34 + Math.sin(y * 0.23 + seed % 7) * 1.6 + Math.sin(y * 0.07) * 1.2;
    const riverX = (y) => 51 + Math.sin(y * 0.13 + seed % 5) * 2.6;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const rg = P.regionAt(x, y);
      region[i] = rg;
      let t = T.GRASS;
      const n = P.fbm(x * 0.12, y * 0.12, seed);
      const n2 = P.fbm(x * 0.25, y * 0.25, seed + 31);
      if (n2 > 0.62) t = T.FLOWER;
      // Wald
      if (rg === 4 && n > 0.38) t = T.FOREST;
      else if (rg !== 0 && n > 0.68) t = T.FOREST;
      // Hügel
      if (rg === 5) { t = n2 > 0.66 ? T.ROCK : T.HILL; if (n > 0.72) t = T.FOREST; }
      // Ruinen
      if (rg === 6) { t = n2 > 0.45 ? T.RUIN : n > 0.6 ? T.ROCK : T.GRASS; }
      // Bach von Norden durch die Lichtung in den See
      const bx = brookX(y);
      if (y > 6 && y < 47 && Math.abs(x - bx) < 0.75) t = T.WATER;
      else if (y > 6 && y < 47 && Math.abs(x - bx) < 1.7 && t !== T.FOREST) t = T.SAND;
      // Fluss im Osten
      const rx = riverX(y);
      if (Math.abs(x - rx) < 1.9) t = T.WATER;
      else if (Math.abs(x - rx) < 2.9 && t !== T.WATER) t = T.SAND;
      // See im Süden
      const ex = (x - 28) / 9.5, ey = (y - 51) / 5.5;
      const e = ex * ex + ey * ey + (P.noise(x * 0.4, y * 0.4, seed + 5) - 0.5) * 0.4;
      if (e < 1) t = T.WATER;
      else if (e < 1.5 && t !== T.WATER) t = T.SAND;
      // Lichtung frei halten
      if (rg === 0 && t === T.FOREST) t = T.GRASS;
      tiles[i] = t;
      if (t === T.FOREST) tree[i] = 1 + Math.floor(P.h2(x, y, seed) * 3);
      else if ((t === T.GRASS || t === T.FLOWER || t === T.HILL) && P.h2(x, y, seed + 3) > 0.94 && rg !== 0) tree[i] = 1 + Math.floor(P.h2(y, x, seed) * 3);
    }
    return { tiles, region, tree, seed };
  };

  P.tileAt = (w, x, y) => (x < 0 || y < 0 || x >= P.W || y >= P.H ? T.ROCK : w.tiles[y * P.W + x]);
  P.isBuildable = (w, x, y) => {
    const t = P.tileAt(w, x, y);
    return (t === T.GRASS || t === T.FLOWER || t === T.SAND || t === T.HILL || t === T.RUIN) && !w.tree[y * P.W + x];
  };
  P.nearWater = (w, x, y) => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (P.tileAt(w, x + dx, y + dy) === T.WATER) return [dx, dy];
    return null;
  };
  P.regionUnlocked = (s, ri) => s.regions.includes(P.REGION_KEYS[ri]);

  P.housing = (s) => s.b.reduce((a, b) => a + (b.prog >= 1 ? (P.BUILD[b.type].cap || 0) * (1 + (b.lv - 1) * 0.6) : 0), 0) + (s.stage <= 1 ? 6 : 0);
  P.storage = (s) => 60 + s.b.reduce((a, b) => a + (b.prog >= 1 ? (P.BUILD[b.type].store || 0) * b.lv : 0), 0) + s.stage * 30;
  P.infra = (s) => s.b.reduce((a, b) => a + (b.prog >= 1 ? (P.BUILD[b.type].infra || 0) * b.lv : 0), 0);
  P.countB = (s, type, done) => s.b.filter((b) => b.type === type && (!done || b.prog >= 1)).length;

  // Ankerpunkte je Kategorie – Viertel bilden sich so ganz von selbst
  function anchor(s, k) {
    const C = [P.CX, P.CY];
    switch (k) {
      case 'center': return C;
      case 'home': return [P.CX - 2, P.CY + 1];
      case 'food': return [P.CX + 2, P.CY - 1];
      case 'culture': return [P.CX - 1, P.CY - 3];
      case 'work': return [P.CX - 7, P.CY - 5];
      case 'nature': return [P.CX - 4, P.CY + 8];
      case 'water': return [P.CX + 4, P.CY];
      default: return C;
    }
  }

  P.findSite = function (s, type) {
    const w = s.world, def = P.BUILD[type];
    const occ = new Set(s.b.filter((b) => !P.BUILD[b.type].virtual).map((b) => b.x + ',' + b.y));
    const [ax, ay] = anchor(s, def.k);
    const dense = s.stage >= 4;
    let best = null, bs = 1e9;
    for (let y = 2; y < P.H - 2; y++) for (let x = 2; x < P.W - 2; x++) {
      if (!P.regionUnlocked(s, w.region[y * P.W + x])) continue;
      if (!P.isBuildable(w, x, y) || occ.has(x + ',' + y)) continue;
      const water = P.nearWater(w, x, y);
      if (def.k === 'water' && !water) continue;
      if (def.k !== 'water' && water && type !== 'memorial') continue;
      // Abstand halten (in frühen Stufen locker, später dichter)
      let crowd = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && occ.has(x + dx + ',' + (y + dy))) crowd++;
      if (!dense && crowd > 0) continue;
      if (dense && crowd > 3) continue;
      if (def.tall && crowd > 1) continue;
      const d = Math.hypot(x - ax, y - ay);
      const sc = d + P.h2(x, y, s.seed + s.b.length) * 2.5 + crowd * 0.8;
      if (sc < bs) { bs = sc; best = [x, y]; }
    }
    return best;
  };

  P.placeBuilding = function (s, type, o) {
    o = o || {};
    const def = P.BUILD[type];
    if (def.unique && s.b.some((x) => x.type === type)) return null;
    let b;
    if (def.virtual) {
      // Hängebrücke zwischen zwei hohen Gebäuden
      const talls = s.b.filter((x) => P.BUILD[x.type].tall && x.prog >= 1);
      const have = new Set(s.b.filter((x) => x.type === 'bridge').map((x) => [x.a, x.bb].sort().join('-')));
      let pair = null, pd = 1e9;
      for (let i = 0; i < talls.length; i++) for (let j = i + 1; j < talls.length; j++) {
        const A = talls[i], B = talls[j];
        const d = Math.hypot(A.x - B.x, A.y - B.y);
        if (d < 2 || d > 9) continue;
        const key = [A.id, B.id].sort().join('-');
        if (have.has(key)) continue;
        if (d < pd) { pd = d; pair = [A, B]; }
      }
      if (!pair) return null;
      b = { id: s.nid++, type, x: pair[0].x, y: pair[0].y, a: pair[0].id, bb: pair[1].id };
    } else {
      const site = o.at || P.findSite(s, type);
      if (!site) return null;
      b = { id: s.nid++, type, x: site[0], y: site[1] };
    }
    if (!o.free) for (const k in def.cost) s.res[k] -= def.cost[k];
    Object.assign(b, { lv: 1, prog: 0, work: 0, need: def.work, cond: 100, built: null, name: o.name || null, honor: o.honor || null, by: o.by || null });
    s.b.push(b);
    s.worldDirty = true;
    return b;
  };

  P.bName = (b) => b.name || (P.BUILD[b.type].lv ? P.BUILD[b.type].lv[b.lv - 1] : P.BUILD[b.type].n);

  P.canAfford = (s, cost, mul) => {
    mul = mul || 1;
    for (const k in cost) if ((s.res[k] || 0) < cost[k] * mul) return false;
    return true;
  };

  P.unlockRegion = function (s, key, why) {
    if (s.regions.includes(key)) return false;
    s.regions.push(key);
    s.worldDirty = true;
    const R = P.REGIONS[key];
    P.chron(s, 'disc', `Neues Gebiet erschlossen: ${R.n}${why ? ' – ' + why : ''}.`);
    s.rep.disc.push({ t: `Neues Gebiet: ${R.n}` });
    return true;
  };
})();
