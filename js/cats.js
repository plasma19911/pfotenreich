// Pfotenreich – Bewohner & Beziehungen
(function () {
  const P = self.P;

  P.FUR = [
    ['schwarz', '#2b2523'], ['weiß', '#f1ece3'], ['grau', '#8a8a91'], ['rot', '#d8833d'], ['creme', '#ead0a2'], ['braun', '#7a5438'],
    ['zimt', '#ad6d40'], ['blaugrau', '#6e7d8d'], ['silber', '#c6cad1'], ['lilac', '#b8a6a9'], ['schoko', '#5a3b2b'], ['sand', '#c9a77a'],
  ];
  P.PAT = ['einfarbig', 'getigert', 'gefleckt', 'schildpatt', 'zweifarbig', 'maskiert', 'gestromt'];
  P.EYES = [['grün', '#6fbf4a'], ['gelb', '#e6c33a'], ['bernstein', '#d98e2b'], ['blau', '#5aa7e0'], ['kupfer', '#c0662d'], ['haselnuss', '#9c8a3c']];
  P.EARS = ['spitz', 'rund', 'Knickohren', 'Pinselohren'];
  P.TAILS = ['lang', 'buschig', 'kurz', 'geringelt'];
  P.LENS = ['kurz', 'mittel', 'lang'];
  P.BODIES = ['schlank', 'normal', 'rundlich'];
  P.ACCS = ['', 'Halstuch', 'Blumenkranz', 'Halsband', 'Ohrring', 'Schleife'];
  P.ACC_COL = ['#c8483c', '#3f78c2', '#e2b23a', '#5aa557', '#9a5bc0', '#e07aa5'];

  P.ph = (s, c) => {
    const a = s.t / 24 - c.born;
    return a < 3 ? 0 : a < 8 ? 1 : a < 120 ? 2 : 3;
  };
  P.PHASE = ['Kätzchen', 'Jungkatze', 'Erwachsen', 'Älteste'];
  P.ageYears = (s, c) => ((c.dead || s.t / 24) - c.born) / 4; // Anzeige: 4 Spieltage = 1 „Katzenjahr“
  P.cat = (s, id) => s.cats.find((c) => c.id === id);
  P.N = (s, id) => {
    const c = typeof id === 'object' ? id : P.cat(s, id);
    return c ? c.name : 'jemand';
  };
  P.pr = (s, id) => {
    const c = typeof id === 'object' ? id : P.cat(s, id);
    const w = c && c.sex === 'w';
    return { er: w ? 'sie' : 'er', Er: w ? 'Sie' : 'Er', sein: w ? 'ihr' : 'sein', seine: w ? 'ihre' : 'seine', ihn: w ? 'sie' : 'ihn', ihm: w ? 'ihr' : 'ihm', Kater: w ? 'Kätzin' : 'Kater', der: w ? 'die' : 'der' };
  };
  P.alive = (s) => s.cats.filter((c) => !c.dead && !c.away);
  P.adults = (s) => P.alive(s).filter((c) => P.ph(s, c) >= 2);
  P.workers = (s) => P.alive(s).filter((c) => P.ph(s, c) === 2);
  P.pickCat = (s, pred, excl) => {
    const l = P.alive(s).filter((c) => (!excl || !excl.includes(c.id)) && (!pred || pred(c)));
    return l.length ? P.pick(s, l) : null;
  };
  P.jobName = (c) => (c.job ? P.JOBS[c.job].n[c.sex === 'w' ? 1 : 0] : '—');

  function uniqueName(s, prefer, sex) {
    const used = new Set(P.alive(s).map((c) => c.name));
    if (prefer && !used.has(prefer)) return prefer;
    const okSex = (n) => (sex === 'w' ? !P.NAMES_M.has(n) : !P.NAMES_W.has(n));
    const free = P.NAMES.filter((n) => !used.has(n) && !s.usedNames[n] && okSex(n));
    if (free.length) return P.pick(s, free);
    const base = P.pick(s, P.NAMES.filter(okSex));
    const cnt = (s.usedNames[base] || 1) + 1;
    return base + (P.ROMAN[cnt] || ' ' + cnt + '.');
  }

  function randLook(s) {
    const fur = P.ri(s, 0, P.FUR.length - 1);
    const pat = P.wpick(s, [0, 1, 2, 3, 4, 5, 6], (p) => [3, 4, 2, 1.2, 2.5, 1, 1][p]);
    let pc = 1;
    if (pat === 3) pc = fur === 0 || fur === 10 ? 3 : fur === 7 ? 4 : P.pick(s, [0, 3]);
    else if (pat === 1 || pat === 2 || pat === 6) pc = -1; // dunklere Version der Grundfarbe
    else if (pat === 5) pc = P.pick(s, [5, 10, 0, 7]);
    return {
      fur, pat, pc,
      len: P.wpick(s, [0, 1, 2], (i) => [5, 3, 2][i]),
      size: P.rf(s, 0.88, 1.12),
      body: P.wpick(s, [0, 1, 2], (i) => [2, 4, 2][i]),
      eye: P.ri(s, 0, P.EYES.length - 1),
      eye2: P.chance(s, 0.06) ? P.ri(s, 0, P.EYES.length - 1) : -1,
      ear: P.wpick(s, [0, 1, 2, 3], (i) => [6, 2, 1, 1][i]),
      tail: P.wpick(s, [0, 1, 2, 3], (i) => [6, 2, 1, 1][i]),
      acc: P.chance(s, 0.35) ? P.ri(s, 1, P.ACCS.length - 1) : 0,
      accC: P.ri(s, 0, P.ACC_COL.length - 1),
      seed: P.ri(s, 1, 99999),
    };
  }
  function inheritLook(s, m, f) {
    const L = randLook(s);
    const from = (k) => (P.chance(s, 0.1) ? L[k] : P.chance(s, 0.5) ? m.look[k] : f.look[k]);
    const src = P.chance(s, 0.5) ? m.look : f.look;
    const r = { ...L };
    r.fur = from('fur');
    r.pat = src.pat;
    r.pc = src.pc;
    if (P.chance(s, 0.12)) { r.pat = L.pat; r.pc = L.pc; }
    for (const k of ['len', 'body', 'eye', 'ear', 'tail']) r[k] = from(k);
    r.size = P.clamp((m.look.size + f.look.size) / 2 + P.rf(s, -0.06, 0.06), 0.85, 1.15);
    r.acc = 0;
    return r;
  }

  P.lookText = (c) => {
    const L = c.look;
    const furN = P.FUR[L.fur][0];
    let pat = '';
    if (L.pat === 1) pat = 'getigertes';
    else if (L.pat === 2) pat = 'geflecktes';
    else if (L.pat === 3) pat = 'schildpattfarbenes (' + furN + '/' + P.FUR[L.pc][0] + ')';
    else if (L.pat === 4) pat = 'weiß-' + furN + 'es';
    else if (L.pat === 5) pat = 'maskiertes';
    else if (L.pat === 6) pat = 'gestromtes';
    const eyes = L.eye2 >= 0 && L.eye2 !== L.eye ? `ein ${P.EYES[L.eye][0]}es und ein ${P.EYES[L.eye2][0]}es Auge` : `${P.EYES[L.eye][0]}e Augen`;
    return `${P.LENS[L.len]}haariges, ${L.pat === 3 || L.pat === 4 ? pat : (pat ? pat + ' ' : '') + furN + 'es'} Fell · ${P.BODIES[L.body]} · ${eyes} · ${P.EARS[L.ear]} · Schwanz ${P.TAILS[L.tail]}${L.acc ? ' · trägt ' + (L.acc === 4 ? 'einen ' : L.acc === 2 ? 'einen ' : 'ein ') + P.ACCS[L.acc] : ''}`;
  };

  const ORIGINS = ['aus dem Weidenland', 'von den Klippen im Norden', 'aus einem verlassenen Gartenhaus', 'vom großen Fluss', 'aus den Heidehügeln', 'aus einem Hafen weit im Westen', 'aus dem Schilfmoor', 'von einer alten Mühle'];

  P.newCat = function (s, o) {
    o = o || {};
    const id = s.nid++;
    const sex = o.sex || (P.chance(s, 0.5) ? 'w' : 'm');
    const look = o.parents ? inheritLook(s, P.cat(s, o.parents[0]), P.cat(s, o.parents[1])) : randLook(s);
    const traitKeys = Object.keys(P.TRAITS);
    let t1 = P.pick(s, traitKeys), t2 = P.pick(s, traitKeys);
    while (t2 === t1) t2 = P.pick(s, traitKeys);
    if (o.parents && P.chance(s, 0.5)) {
      const p = P.cat(s, P.pick(s, o.parents));
      if (p && p.traits[0] !== t2) t1 = p.traits[0];
    }
    let talent = P.pick(s, P.TALENTS);
    if (o.talent) talent = o.talent;
    const c = {
      id, sex, look,
      name: uniqueName(s, o.name, sex),
      born: o.born !== undefined ? o.born : s.t / 24 - (o.age || 0),
      life: P.rf(s, 150, 205),
      traits: [t1, t2],
      talent,
      weak: P.pick(s, P.WEAK),
      wish: P.pick(s, P.WISHES).k,
      wishDone: false,
      job: null,
      mood: 70,
      rel: {},
      mem: [],
      parents: o.parents || [],
      kids: [],
      partner: null,
      gen: o.gen || 0,
      founder: !!o.founder,
      home: null,
      origin: o.origin || null,
      lastLitter: -99,
      dead: null,
    };
    s.usedNames[c.name] = (s.usedNames[c.name] || 0) + 1;
    if (o.parents) {
      for (const pid of o.parents) {
        const p = P.cat(s, pid);
        if (p) p.kids.push(id);
      }
    }
    c.story = makeStory(s, c, o);
    s.cats.push(c);
    return c;
  };

  function makeStory(s, c, o) {
    const pr = P.pr(s, c);
    const tr = P.TRAITS[c.traits[0]].d;
    if (o.founder) {
      return `${c.name} kam ${P.pick(s, ORIGINS)} und gehört zu den Gründerkatzen. ${pr.Er} ${tr} und ist bekannt für ${pr.sein} Talent im ${c.talent}. Schwäche: ${c.weak}.`;
    }
    if (o.parents && o.parents.length) {
      const m = P.cat(s, o.parents[0]), f = P.cat(s, o.parents[1]);
      return `${c.name} wurde am ${P.dateStr(s)} als Kind von ${m ? m.name : '?'} und ${f ? f.name : '?'} geboren. Man sagt, ${pr.er} ${tr}.`;
    }
    return `${c.name} kam ${o.origin || P.pick(s, ORIGINS)} ins Reich. ${pr.Er} ${tr}.`;
  }

  P.addMem = (s, c, txt, imp) => {
    c = typeof c === 'object' ? c : P.cat(s, c);
    if (!c) return;
    c.mem.push({ d: P.day(s), t: txt, i: imp || 1 });
    if (c.mem.length > 24) {
      // unwichtige zuerst vergessen
      let idx = c.mem.findIndex((m) => m.i < 2);
      if (idx < 0) idx = 0;
      c.mem.splice(idx, 1);
    }
  };
  P.relAdd = (s, a, b, v) => {
    a = typeof a === 'object' ? a : P.cat(s, a);
    b = typeof b === 'object' ? b : P.cat(s, b);
    if (!a || !b || a === b) return;
    a.rel[b.id] = P.clamp((a.rel[b.id] || 0) + v, -100, 100);
    b.rel[a.id] = P.clamp((b.rel[a.id] || 0) + v, -100, 100);
  };
  P.moodAdd = (s, c, v) => {
    c = typeof c === 'object' ? c : P.cat(s, c);
    if (c) c.mood = P.clamp(c.mood + v, 0, 100);
  };
  P.compat = (a, b) => {
    let v = 0;
    for (const t of a.traits) {
      if (b.traits.includes(t)) v += 2;
      const T = P.TRAITS[t];
      for (const u of b.traits) {
        const U = P.TRAITS[u];
        if (T.like.some((x) => U.like.includes(x))) v += 1;
        if (T.like.some((x) => U.dis.includes(x))) v -= 1.5;
      }
    }
    return v;
  };

  // Tägliches Sozialleben: Freundschaften, Rivalitäten, Partnerschaften
  function pruneRel(c) {
    const ks = Object.keys(c.rel);
    if (ks.length <= 24) return;
    ks.sort((a, b) => Math.abs(c.rel[b]) - Math.abs(c.rel[a]));
    for (const k of ks.slice(24)) delete c.rel[k];
  }
  P.socialDay = function (s, offline) {
    const al = P.alive(s).filter((c) => P.ph(s, c) >= 1);
    for (const c of al) pruneRel(c);
    if (al.length < 2) return;
    const n = Math.min(al.length * 2, 80);
    for (let i = 0; i < n; i++) {
      const a = P.pick(s, al);
      // bevorzugt Kollegen / Nachbarn
      let b = P.chance(s, 0.5) ? al.find((x) => x !== a && (x.job === a.job || x.home === a.home) && P.chance(s, 0.3)) : null;
      if (!b) b = P.pick(s, al);
      if (a === b) continue;
      const base = P.compat(a, b) * 0.8 + P.rf(s, -2, 3);
      P.relAdd(s, a, b, base);
      const r = a.rel[b.id] || 0;
      if (r > 55 && !(a.mem.some((m) => m.f === b.id))) {
        a.mem.push({ d: P.day(s), t: `Hat in ${b.name} einen guten Freund gefunden.`, i: 1, f: b.id });
        b.mem.push({ d: P.day(s), t: `Hat in ${a.name} einen guten Freund gefunden.`, i: 1, f: a.id });
        if (a.mem.length > 24) a.mem.shift();
        if (b.mem.length > 24) b.mem.shift();
        P.story(s, `${a.name} und ${b.name} sind jetzt unzertrennlich.`, 'pers', [a.id, b.id]);
      }
    }
    // Partnerschaften
    if (P.chance(s, 0.5)) {
      const singles = al.filter((c) => P.ph(s, c) === 2 && !c.partner);
      for (const a of P.shuffle(s, singles).slice(0, 6)) {
        if (a.partner) continue;
        const cand = singles.filter((b) => b !== a && !b.partner && (a.rel[b.id] || 0) > 45 && !related(s, a, b));
        if (!cand.length) continue;
        const b = cand.sort((x, y) => (a.rel[y.id] || 0) - (a.rel[x.id] || 0))[0];
        if (P.chance(s, 0.35)) {
          a.partner = b.id;
          b.partner = a.id;
          P.addMem(s, a, `Ist mit ${b.name} ein Paar geworden.`, 2);
          P.addMem(s, b, `Ist mit ${a.name} ein Paar geworden.`, 2);
          P.chron(s, 'fam', `${a.name} und ${b.name} sind nun ein Paar.`);
          P.story(s, `${a.name} und ${b.name} sind ein Paar geworden.`, 'fam', [a.id, b.id]);
          if (a.wish === 'family') a.wishProg = 1;
        }
      }
    }
  };
  function related(s, a, b) {
    if (a.parents.includes(b.id) || b.parents.includes(a.id)) return true;
    if (a.parents.length && b.parents.length && a.parents.some((p) => b.parents.includes(p))) return true;
    return false;
  }

  // Geburten
  P.birthsDay = function (s) {
    const al = P.alive(s);
    const cap = P.housing(s);
    let free = cap - al.length;
    if (free < 2) return;
    const foodOk = s.res.food > al.length * 2;
    if (!foodOk) return;
    const season = P.season(s);
    const moms = al.filter((c) => c.sex === 'w' && c.partner && P.ph(s, c) === 2 && P.day(s) - c.lastLitter > 7);
    for (const m of moms) {
      const f = P.cat(s, m.partner);
      if (!f || f.dead || f.away || f.sex !== 'm') continue;
      const p = (season === 0 ? 0.32 : season === 3 ? 0.08 : 0.2) * (m.mood > 50 ? 1 : 0.5);
      if (!P.chance(s, p) || free < 2) continue;
      const n = P.wpick(s, [1, 2, 3, 4], (k) => [3, 4, 2, 0.3][k - 1]);
      m.lastLitter = P.day(s);
      const names = [];
      for (let i = 0; i < n && free > 0; i++) {
        let prefer = null;
        // Kätzchen gelegentlich nach Gründerkatzen benannt
        if (P.chance(s, 0.12)) {
          const anc = s.cats.find((c) => c.founder && c.dead && (m.parents.includes(c.id) || f.parents.includes(c.id) || isAncestor(s, c.id, m) || isAncestor(s, c.id, f)));
          if (anc) prefer = anc.name + ' die Jüngere'.replace('die', 'die');
        }
        const k = P.newCat(s, { parents: [m.id, f.id], age: 0, gen: Math.max(m.gen, f.gen) + 1 });
        if (prefer) {
          k.name = prefer.replace(' die Jüngere', k.sex === 'w' ? ' die Jüngere' : ' der Jüngere');
          k.story += ` Benannt nach einer Gründerkatze.`;
        }
        k.home = m.home;
        names.push(k.name);
        free--;
        s.stats.births++;
      }
      P.addMem(s, m, `Hat ${names.length === 1 ? 'ein Kätzchen' : names.length + ' Kätzchen'} bekommen: ${names.join(', ')}.`, 3);
      P.addMem(s, f, `Ist Vater geworden: ${names.join(', ')}.`, 3);
      if (m.wish === 'family') P.fulfillWish(s, m);
      if (f.wish === 'family') P.fulfillWish(s, f);
      P.chron(s, 'fam', `${m.name} und ${f.name} bekommen Nachwuchs: ${names.join(', ')}.`);
      s.rep.births.push({ names, mom: m.id, dad: f.id, kid: s.nid - 1 });
    }
  };
  function isAncestor(s, aid, c, depth) {
    depth = depth || 0;
    if (!c || depth > 6) return false;
    if (c.parents.includes(aid)) return true;
    return c.parents.some((p) => isAncestor(s, aid, P.cat(s, p), depth + 1));
  }
  P.isAncestor = isAncestor;

  P.deathsDay = function (s) {
    for (const c of P.alive(s)) {
      const age = s.t / 24 - c.born;
      if (age > c.life) {
        c.dead = s.t / 24;
        s.stats.deaths++;
        c.rel = {}; c.job = null; c.mem = c.mem.filter((m) => m.i >= 2).slice(-10);
        const pr = P.pr(s, c);
        if (c.partner) {
          const p = P.cat(s, c.partner);
          if (p) { P.addMem(s, p, `Hat ${c.name} verloren und trägt ${pr.ihn} im Herzen.`, 3); p.partner = null; P.moodAdd(s, p, -20); }
        }
        for (const k of c.kids) { const kc = P.cat(s, k); if (kc && !kc.dead) { P.addMem(s, kc, `Erinnert sich liebevoll an ${c.name}.`, 2); P.moodAdd(s, kc, -10); } }
        const txt = c.founder
          ? `Gründerkatze ${c.name} ist in hohem Alter friedlich eingeschlafen. Ein Gedenkstein erinnert an ${pr.ihn}.`
          : `${c.name} ist mit ${Math.floor(P.ageYears(s, c))} Katzenjahren friedlich eingeschlafen.`;
        P.chron(s, c.founder ? 'death' : 'fam', txt);
        s.rep.deaths.push({ id: c.id, name: c.name, founder: c.founder });
        if (c.founder) {
          s.legacy.push(c.id);
          const b = P.placeBuilding(s, 'memorial', { free: true, name: `Gedenkstein für ${c.name}`, honor: c.id });
          if (b) b.prog = 1;
        }
      }
    }
  };

  P.fulfillWish = function (s, c) {
    if (c.wishDone) return;
    c.wishDone = true;
    const w = P.WISHES.find((x) => x.k === c.wish);
    P.addMem(s, c, `Herzenswunsch erfüllt: ${w ? w.t : ''}.`, 3);
    P.moodAdd(s, c, 25);
    P.chron(s, 'pers', `${c.name} hat sich einen Herzenswunsch erfüllt: ${w ? w.t : ''}.`);
    s.rep.stories.push({ t: `${c.name} hat sich einen Herzenswunsch erfüllt: ${w ? w.t : ''}.`, cats: [c.id] });
    // neuer Wunsch
    setTimeoutWish(s, c);
  };
  function setTimeoutWish(s, c) {
    const others = P.WISHES.filter((w) => w.k !== c.wish);
    c.wish = P.pick(s, others).k;
    c.wishDone = false;
  }

  // Wünsche prüfen (täglich)
  P.wishesDay = function (s) {
    for (const c of P.alive(s)) {
      if (P.ph(s, c) < 2 || c.wishDone) continue;
      const w = c.wish;
      if (w === 'house') { const h = s.b.find((b) => b.id === c.home); if (h && P.BUILD[h.type].tall) P.fulfillWish(s, c); }
      else if (w === 'friends') { if (Object.values(c.rel).filter((v) => v > 55).length >= 4) P.fulfillWish(s, c); }
      else if (w === 'teach') { if (c.job === 'scholar' && P.ph(s, c) >= 2 && P.chance(s, 0.05)) P.fulfillWish(s, c); }
      else if (w === 'garden') { if (c.job === 'gardener' && P.chance(s, 0.06)) P.fulfillWish(s, c); }
      else if (w === 'explore') { if (c.job === 'explorer' && P.chance(s, 0.04)) P.fulfillWish(s, c); }
      else if (w === 'bigfish') { if (c.job === 'fisher' && P.chance(s, 0.03)) P.fulfillWish(s, c); }
    }
  };

  // Stimmung: Zielwert aus Versorgung, Wohnraum, Zusammenhalt, Eigenschaften
  P.moodDay = function (s, offline) {
    const al = P.alive(s);
    const cap = P.housing(s);
    const crowded = al.length > cap;
    const culture = s.b.filter((b) => b.prog >= 1).reduce((a, b) => a + (P.BUILD[b.type].coh || 0) * b.lv, 0);
    const perCap = culture / Math.max(1, Math.sqrt(al.length));
    const season = P.season(s);
    for (const c of al) {
      let target = 55 + (s.hungry ? -22 : 8) + (crowded ? -10 : 4) + (s.coh - 50) * 0.3 + Math.min(10, perCap * 1.5);
      if (c.traits.includes('gemütlich') && s.weather === 'sonnig') target += 4;
      if (c.weak === 'wasserscheu' && c.job === 'fisher') target -= 8;
      if (c.job && P.TALENT_JOB[c.talent] === c.job) target += 6;
      if (season === 3) target -= 3;
      if (s.festUntil > s.t) target += 10;
      if (c.partner) target += 4;
      c.mood = P.clamp(c.mood + (target - c.mood) * 0.25, offline ? 35 : 5, 100);
    }
  };
})();
