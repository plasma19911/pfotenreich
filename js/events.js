// Pfotenreich – Ereignis-Engine (Auswahl, Abklingzeiten, Ketten, Folgen, Reaktionen)
(function () {
  const P = self.P;
  P.EV = [];
  P.EVM = {};
  P.def = (e) => { if (P.EVM[e.id]) throw new Error('Doppelte Ereignis-ID ' + e.id); P.EV.push(e); P.EVM[e.id] = e; };

  P.CAT_LABEL = { pos: 'Erfreulich', fun: 'Alltag', pers: 'Persönlich', disc: 'Entdeckung', soc: 'Gesellschaft', risk: 'Chance & Risiko', crisis: 'Herausforderung', rare: 'Wendepunkt', turn: 'Wendepunkt', chain: 'Fortsetzung', stage: 'Meilenstein' };
  const CAT_W = { pos: 1.5, fun: 1.25, pers: 1.35, disc: 1.0, soc: 1.0, risk: 0.75, crisis: 0.6, rare: 0.3, turn: 1, chain: 1, stage: 1 };

  const RES_N = { food: 'Futter', wood: 'Holz', sisal: 'Sisal', cardboard: 'Karton', wool: 'Wolle', catnip: 'Katzenminze', know: 'Wissen', shells: 'Muscheln' };
  P.RES_N = RES_N;

  // Wendet Folgen an und liefert einen lesbaren Text
  P.fx = function (s, o) {
    const out = [];
    for (const k in o) {
      const v = o[k];
      if (!v) continue;
      if (RES_N[k]) {
        s.res[k] = Math.max(0, (s.res[k] || 0) + v);
        out.push(`${v > 0 ? '+' : ''}${v} ${RES_N[k]}`);
      } else if (k === 'coh') { s.coh = P.clamp(s.coh + v, 0, 100); out.push(`Zusammenhalt ${v > 0 ? '+' : ''}${v}`); }
      else if (k === 'trust') { s.trust = P.clamp(s.trust + v, 0, 100); out.push(`Vertrauen ${v > 0 ? '+' : ''}${v}`); }
      else if (P.VALUES[k]) { s.val[k] += v; out.push(`${P.VALUES[k].n} ${v > 0 ? '+' : ''}${v}`); }
      else if (k === 'mood') { for (const c of P.alive(s)) P.moodAdd(s, c, v); out.push(`Stimmung aller ${v > 0 ? '+' : ''}${v}`); }
      else if (k === 'exp') { s.exp += v; out.push(`Erkundung +${v}`); }
    }
    return out.join(' · ');
  };
  P.chron = (s, cat, txt) => { s.chron.push({ d: P.day(s), c: cat, t: txt }); if (s.chron.length > 3000) s.chron.splice(0, 200); };
  P.story = (s, txt, cat, cats) => {
    s.rep.stories.push({ t: txt, cats: cats || [] });
    if (s.rep.stories.length > 60) s.rep.stories.shift();
    (s._toasts || (s._toasts = [])).push({ t: txt, cats: cats || [] });
  };
  P.sched = (s, id, days, ctx) => s.sched.push({ id, at: s.t / 24 + days, ctx: ctx || {} });
  P.flag = (s, k, v) => { s.flags[k] = v === undefined ? 1 : v; };
  P.hasTrad = (s, k) => s.trad.some((t) => t.k === k);
  P.addTrad = (s, k, n, d) => {
    if (P.hasTrad(s, k)) return '';
    s.trad.push({ k, n, d, since: P.day(s) });
    P.chron(s, 'trad', `Eine neue Tradition entsteht: „${n}“. ${d}`);
    s.rep.stories.push({ t: `Neue Tradition: ${n}`, cats: [] });
    return ` · Neue Tradition: „${n}“`;
  };
  P.newCats = (s, n, o) => {
    const names = [];
    for (let i = 0; i < n; i++) {
      const c = P.newCat(s, Object.assign({ age: P.rf(s, 9, 60), origin: o && o.origin }, o || {}));
      names.push(c.name);
      if (o && o.mem) P.addMem(s, c, o.mem, 2);
    }
    return names;
  };
  P.qb = (s, type, o) => {
    const b = P.placeBuilding(s, type, Object.assign({ free: true }, o || {}));
    return b ? ` · Baustelle: ${P.bName(b)}` : '';
  };
  P.decided = (s, id) => s.dec.find((d) => d.id === id);

  // Ereignis auswählen
  P.genEvent = function (s, offline) {
    const day = s.t / 24;
    // fällige Fortsetzungen zuerst
    for (let i = 0; i < s.sched.length; i++) {
      const sc = s.sched[i];
      if (sc.at > day) continue;
      const e = P.EVM[sc.id];
      s.sched.splice(i, 1);
      if (!e) return null;
      const ctx = e.req ? e.req(s, sc.ctx) : sc.ctx;
      if (!ctx) return null; // Bedingungen entfallen (z. B. Katze nicht mehr da) – Kette endet still
      return push(s, e, ctx);
    }
    const recent = s.evLog.slice(-3).map((x) => x.c);
    const cands = [];
    for (const e of P.EV) {
      if (e.c === 'chain' || e.c === 'stage' || e.manual) continue;
      if (s.stage < e.st[0] || s.stage > e.st[1]) continue;
      if (e.once && s.once[e.id]) continue;
      const last = s.hist[e.id];
      if (last !== undefined && day - last < (e.cd || 10)) continue;
      if (s.pending.some((p) => p.id === e.id)) continue;
      if (e.season !== undefined && !(Array.isArray(e.season) ? e.season.includes(P.season(s)) : P.season(s) === e.season)) continue;
      if (offline && (e.c === 'crisis')) continue; // keine Krisen-Entscheidungen während der Abwesenheit anhäufen
      const ctx = e.req ? e.req(s, {}) : {};
      if (!ctx) continue;
      let w = (e.w || 3) * (CAT_W[e.c] || 1);
      if (recent.includes(e.c)) w *= 0.45;
      if (last === undefined) w *= 1.4; // Neues bevorzugen
      cands.push({ e, ctx, w });
    }
    if (!cands.length) return null;
    const pick = P.wpick(s, cands, (x) => x.w);
    return push(s, pick.e, pick.ctx);
  };
  function push(s, e, ctx) {
    const p = { id: e.id, ctx, d: P.day(s), uid: s.nid++ };
    s.pending.push(p);
    s.hist[e.id] = s.t / 24;
    if (e.once) s.once[e.id] = 1;
    s.evLog.push({ id: e.id, c: e.c, d: P.day(s) });
    if (s.evLog.length > 200) s.evLog.shift();
    return p;
  }

  P.evText = (s, p) => { const e = P.EVM[p.id]; return typeof e.x === 'function' ? e.x(s, p.ctx) : e.x; };
  P.evTitle = (s, p) => { const e = P.EVM[p.id]; return typeof e.t === 'function' ? e.t(s, p.ctx) : e.t; };
  P.evOpts = (s, p) => {
    const e = P.EVM[p.id];
    return e.o.map((o, i) => ({ i, l: typeof o.l === 'function' ? o.l(s, p.ctx) : o.l, h: o.h ? (typeof o.h === 'function' ? o.h(s, p.ctx) : o.h) : '', ok: !o.if || o.if(s, p.ctx), why: o.why || 'Voraussetzungen fehlen' }));
  };
  P.evCats = (s, p) => ['a', 'b', 'c'].map((k) => p.ctx[k]).filter((id) => id !== undefined && P.cat(s, id));

  // Entscheidung treffen
  P.resolve = function (s, uid, oi) {
    const idx = s.pending.findIndex((p) => p.uid === uid);
    if (idx < 0) return null;
    const p = s.pending[idx];
    const e = P.EVM[p.id];
    const o = e.o[oi];
    if (!o || (o.if && !o.if(s, p.ctx))) return null;
    s.pending.splice(idx, 1);
    const label = typeof o.l === 'function' ? o.l(s, p.ctx) : o.l;
    let res = o.f(s, p.ctx) || '';
    s.dec.push({ id: e.id, o: oi, d: P.day(s), l: label });
    if (s.dec.length > 400) s.dec.shift();
    s.stats.events++;
    const title = typeof e.t === 'function' ? e.t(s, p.ctx) : e.t;
    if (e.c !== 'fun' || e.chron) P.chron(s, e.c === 'rare' || e.c === 'turn' || e.c === 'stage' ? 'turn' : 'dec', `${title}: ${label}.`);
    const reacts = reactions(s, p, o.tg || []);
    // beteiligte Katzen merken sich das Ereignis
    for (const id of P.evCats(s, p)) P.addMem(s, id, `${title} – entschieden: ${label}.`, e.c === 'rare' || e.c === 'turn' ? 3 : 2);
    s._react = { cats: reacts.map((r) => ({ id: r.id, emo: r.emo })), at: Date.now() };
    P.checkStage(s);
    return { res, reacts, label, title };
  };

  const LIKE_LINES = ['nickt zufrieden', 'schnurrt anerkennend', 'reckt stolz den Schwanz', 'stupst dich dankbar an', 'findet das genau richtig'];
  const DIS_LINES = ['legt die Ohren an', 'peitscht mit dem Schwanz', 'murrt leise', 'dreht sich beleidigt weg', 'hält das für einen Fehler'];
  function reactions(s, p, tags) {
    const out = [];
    const involved = P.evCats(s, p).map((id) => P.cat(s, id));
    const pool = involved.concat(P.shuffle(s, P.adults(s)).filter((c) => !involved.includes(c)).slice(0, 8));
    for (const c of pool) {
      if (out.length >= 3) break;
      let sc = 0, why = '';
      for (const t of c.traits) {
        const T = P.TRAITS[t];
        for (const tg of tags) {
          if (T.like.includes(tg)) { sc += 1; why = t; }
          if (T.dis.includes(tg)) { sc -= 1; why = t; }
        }
      }
      if (!sc && !involved.includes(c)) continue;
      const emo = sc > 0 ? (tags.includes('festive') ? 'joy' : 'proud') : sc < 0 ? 'angry' : 'surprise';
      const line = sc > 0 ? P.pick(s, LIKE_LINES) : sc < 0 ? P.pick(s, DIS_LINES) : 'schaut überrascht';
      P.moodAdd(s, c, sc * 5);
      s.trust = P.clamp(s.trust + sc * 0.5, 0, 100);
      out.push({ id: c.id, t: `${c.name}${why ? ' (' + why + ')' : ''} ${line}.`, emo, sc });
    }
    return out;
  }

  // Ereignis-Kontext-Helfer für Inhalte
  P.ctxA = (s, pred) => { const a = P.pickCat(s, pred); return a ? { a: a.id } : null; };
  P.ctxAB = (s, pa, pb) => {
    const a = P.pickCat(s, pa); if (!a) return null;
    const b = P.pickCat(s, pb || pa, [a.id]); if (!b) return null;
    return { a: a.id, b: b.id };
  };
  P.isAd = (s) => (c) => P.ph(s, c) === 2;
  P.has = (c, t) => c.traits.includes(t);
  P.alivePred = (s, id) => { const c = P.cat(s, id); return c && !c.dead && !c.away; };
})();
