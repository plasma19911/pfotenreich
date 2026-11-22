// Pfotenreich – Simulation: Wirtschaft, Berufe, Bauplanung, Stufen, Zeit & Offline-Fortschritt
(function () {
  const P = self.P;
  P.SAVE_V = 1;

  P.newRep = (since) => ({ since: since || Date.now(), births: [], deaths: [], built: [], disc: [], stories: [], stage: [], sim: 0, frozen: 0 });

  P.newGame = function (seed, realm) {
    const s = {
      v: P.SAVE_V, seed, rng: seed, realm: realm || 'Pfotenreich',
      t: 7, created: Date.now(), lastReal: Date.now(),
      stage: 0, foundDay: 0,
      res: { food: 30, wood: 8, sisal: 4, cardboard: 2, wool: 0, catnip: 0, know: 0, shells: 0 },
      coh: 55, trust: 60, val: { nat: 0, trade: 0, inv: 0, com: 0 }, path: null, path2: null,
      cats: [], b: [], regions: ['center'], exp: 0,
      pending: [], hist: {}, once: {}, sched: [], dec: [], evLog: [], flags: {}, chron: [], trad: [], districts: [], legacy: [],
      prio: { food: 2, build: 2, grow: 2, know: 2, culture: 2 }, project: null,
      nextEv: 0, nid: 1, weather: 'sonnig', usedNames: {}, hungry: false, festUntil: 0,
      stats: { births: 0, deaths: 0, events: 0, built: 0 }, rep: P.newRep(),
    };
    // Gründerkatzen: unterschiedliche Talente, gemischte Geschlechter
    const talents = P.shuffle(s, ['Fischen', 'Bauen', 'Sammeln', 'Erkunden', 'Lehren', 'Pflegen', 'Basteln', 'Gärtnern']);
    const sexes = P.shuffle(s, ['w', 'w', 'm', 'm', P.chance(s, 0.5) ? 'w' : 'm']);
    for (let i = 0; i < 5; i++) {
      const c = P.newCat(s, { founder: true, age: P.rf(s, 18, 50), talent: talents[i], sex: sexes[i] });
      if (i < 2 && !c.look.acc) { c.look.acc = P.ri(s, 1, 5); }
    }
    s.world = P.genWorld(seed);
    s.pending.push({ id: 'found', ctx: {}, d: 0, uid: s.nid++ });
    return s;
  };

  // ───────── Stündliche Wirtschaft ─────────
  function seasonMul(s, kind) {
    const se = P.season(s);
    if (kind === 'fish') return [1.05, 1.15, 1.0, 0.7][se] * (s.weather === 'Sturm' ? 0.6 : s.weather === 'Regen' ? 0.85 : 1);
    if (kind === 'gather') return [1.0, 1.15, 1.1, 0.55][se];
    if (kind === 'garden') return [1.1, 1.3, 0.9, 0.4][se];
    return 1;
  }
  function eff(s, c) {
    const talent = P.TALENT_JOB[c.talent] === c.job ? 1.4 : 1;
    const mood = 0.6 + c.mood / 160;
    let w = 1;
    if (c.weak === 'wasserscheu' && c.job === 'fisher') w = 0.75;
    if (c.weak === 'Langschläfer') w *= 0.92;
    if (c.weak === 'tollpatschig' && c.job === 'builder') w *= 0.85;
    if (c.traits.includes('fleißig')) w *= 1.1;
    return talent * mood * w;
  }

  P.hourly = function (s, h, offline) {
    if (s.stage < 1) return;
    const al = P.alive(s);
    const out = { food: 0, wood: 0, sisal: 0, cardboard: 0, wool: 0, catnip: 0, know: 0, shells: 0, work: 0, exp: 0, coh: 0 };
    const fishBonus = 1 + 0.1 * (s.flags.lift || 0) + (s.flags.reserve ? 0.1 : 0) - (s.flags.fishRest ? 0.08 : 0) + (s.flags.edu === 'fish' ? 0.08 : 0);
    const jettySlots = s.b.reduce((a, b) => a + (b.prog >= 1 && P.BUILD[b.type].fish ? P.BUILD[b.type].slots * b.lv : 0), 0);
    let fishers = 0;
    const hasSchool = P.countB(s, 'school', true);
    for (const c of al) {
      const ph = P.ph(s, c);
      if (ph === 3) { out.know += 0.02; continue; }
      if (ph < 2 || !c.job) continue;
      const e = eff(s, c);
      switch (c.job) {
        case 'fisher': fishers++; out.food += 0.5 * e * seasonMul(s, 'fish') * fishBonus * (fishers <= jettySlots ? 1.5 : 1); break;
        case 'gatherer': { const g = seasonMul(s, 'gather') * e; out.food += 0.2 * g; out.wood += 0.2 * g; out.sisal += 0.1 * g; out.cardboard += 0.015 * g; break; }
        case 'builder': out.work += 1 * e * (1 + 0.1 * (s.flags.crane || 0)); break;
        case 'explorer': out.exp += 0.1 * e * (s.flags.crows ? 1.3 : 1); out.cardboard += 0.03 * e; break;
        case 'carer': out.coh += 0.01 * e; break;
        case 'scholar': out.know += (hasSchool ? 0.22 : 0.09) * e * (s.flags.edu === 'mech' ? 1.15 : 1); break;
        case 'crafter': out.wool += 0.15 * e; out.cardboard += 0.05 * e; break;
        case 'gardener': { const g = seasonMul(s, 'garden') * e * (s.flags.bees ? 1.2 : 1); out.catnip += 0.1 * g; out.food += 0.22 * g; break; }
        case 'trader': out.shells += 0.12 * e * (s.path === 'trade' ? 1.3 : 1); out.cardboard += 0.04 * e; out.wood += 0.04 * e; break;
        case 'inventor': out.know += 0.1 * e; s.val.inv += 0.0002 * e; break;
      }
    }
    // Verbrauch
    let cons = 0;
    for (const c of al) cons += P.ph(s, c) === 0 ? 0.05 : 0.1;
    // Gebäude wirken: Futterplätze/Lager ermöglichen Vorrat; Kultur stützt Zusammenhalt
    for (const k in out) if (s.res[k] !== undefined) s.res[k] += out[k] * h;
    s.res.food -= cons * h;
    const cap = P.storage(s);
    if (s.res.food > cap) s.res.food = cap;
    for (const k of ['wood', 'sisal', 'cardboard', 'wool', 'catnip']) if (s.res[k] > cap * 1.5) s.res[k] = cap * 1.5;
    s.hungry = s.res.food <= 0.5;
    if (s.res.food < 0) s.res.food = 0;
    s.exp += out.exp * h;
    s.coh = P.clamp(s.coh + out.coh * h, 0, 100);
    s._rates = { food: out.food - cons, wood: out.wood, sisal: out.sisal, cardboard: out.cardboard, wool: out.wool, catnip: out.catnip, know: out.know, shells: out.shells, work: out.work, exp: out.exp };

    // Bauen: Arbeit verteilt sich auf Baustellen; ohne Baustelle reparieren
    let work = out.work * h;
    const sites = s.b.filter((b) => b.prog < 1);
    if (!sites.length && work > 0) {
      const dmg = s.b.filter((b) => b.cond < 90).sort((a, b) => a.cond - b.cond)[0];
      if (dmg) dmg.cond = Math.min(100, dmg.cond + work * 8);
      s.res.wood += work * 0.05;
    }
    for (const b of sites) {
      if (work <= 0) break;
      const need = b.need - b.work;
      const use = Math.min(need, work * (sites.length > 1 ? 0.7 : 1));
      b.work += use; work -= use;
      b.prog = b.work / b.need;
      if (b.prog >= 0.999) finishBuilding(s, b);
    }
  };

  function finishBuilding(s, b) {
    b.prog = 1; b.work = b.need; b.built = P.day(s);
    s.stats.built++;
    s.worldDirty = true;
    const def = P.BUILD[b.type];
    const nm = P.bName(b);
    if (b.upFrom) { P.chron(s, 'build', `${nm} ausgebaut (Stufe ${b.lv}).`); delete b.upFrom; }
    else if (!['bridge', 'memorial'].includes(b.type) || b.type === 'bridge') {
      const imp = def.unique || def.tall || def.job || b.type === 'bridge';
      if (imp) P.chron(s, 'build', `Neues Bauwerk: ${nm}.`);
    }
    s.rep.built.push({ type: b.type, name: nm, id: b.id });
    if (b.type === 'monument') {
      const f = s.flags.monument && s.flags.monument !== 'all' && s.flags.monument !== 'gens' ? P.N(s, s.flags.monument) : 'den Gründerkatzen';
      b.name = `Denkmal für ${f}`;
      P.chron(s, 'turn', `Das Gründerdenkmal ist fertig – zu Ehren von ${f}.`);
      for (const c of P.alive(s)) P.moodAdd(s, c, 10);
    }
    if (s.project && s.project === b.type) s.project = null;
    if (b.by) { const c = P.cat(s, b.by); if (c) P.addMem(s, c, `Hat beim Bau von ${nm} mitgeholfen.`, 1); }
    assignHomes(s);
  }

  function assignHomes(s) {
    const homes = s.b.filter((b) => b.prog >= 1 && P.BUILD[b.type].cap);
    const load = {};
    for (const c of P.alive(s)) if (c.home && homes.some((h) => h.id === c.home)) load[c.home] = (load[c.home] || 0) + 1;
    for (const c of P.alive(s)) {
      if (c.home && homes.some((h) => h.id === c.home)) continue;
      // Familien zusammenhalten
      const mom = c.parents.length ? P.cat(s, c.parents[0]) : null;
      let target = mom && mom.home && homes.find((h) => h.id === mom.home && (load[h.id] || 0) < cap(h)) ? mom.home : null;
      if (!target) { const h = homes.filter((h) => (load[h.id] || 0) < cap(h)).sort((a, b) => cap(b) - (load[b.id] || 0) - (cap(a) - (load[a.id] || 0)))[0]; target = h ? h.id : null; }
      if (target) { c.home = target; load[target] = (load[target] || 0) + 1; }
    }
    function cap(h) { return Math.round(P.BUILD[h.type].cap * (1 + (h.lv - 1) * 0.6)); }
  }
  P.assignHomes = assignHomes;

  // ───────── Berufsverteilung ─────────
  P.availableJobs = function (s) {
    const jobs = [];
    for (const k in P.JOBS) {
      const J = P.JOBS[k];
      if (s.stage < J.st) continue;
      if (J.need) { const needs = Array.isArray(J.need) ? J.need : [J.need]; if (!needs.some((n) => P.countB(s, n, true))) continue; }
      jobs.push(k);
    }
    return jobs;
  };
  function slotsFor(s, job) {
    let n = 0;
    for (const b of s.b) if (b.prog >= 1 && P.BUILD[b.type].job === job) n += P.BUILD[b.type].slots * b.lv;
    return n;
  }
  P.assignJobs = function (s) {
    const ws = P.workers(s);
    const n = ws.length;
    if (!n) return;
    const avail = P.availableJobs(s);
    const pr = s.prio;
    const kits = P.alive(s).filter((c) => P.ph(s, c) <= 1).length;
    const cons = P.alive(s).reduce((a, c) => a + (P.ph(s, c) === 0 ? 0.05 : 0.1), 0);
    const target = {};
    const sites = s.b.filter((b) => b.prog < 1).length;
    target.builder = Math.max(1, Math.round(n * (0.1 + 0.04 * pr.build) + (sites ? 1 : 0)));
    if (avail.includes('explorer')) target.explorer = s.regions.length < P.REGION_KEYS.length ? Math.max(1, Math.round(n * 0.04 * pr.grow)) : Math.round(n * 0.02);
    if (avail.includes('scholar')) target.scholar = Math.max(1, Math.round(n * 0.045 * pr.know));
    if (avail.includes('carer')) target.carer = kits ? Math.max(1, Math.round(kits / 6)) : 0;
    for (const j of ['crafter', 'gardener', 'trader', 'inventor']) if (avail.includes(j)) target[j] = Math.min(slotsFor(s, j), Math.max(1, Math.round(n * 0.05 * (j === 'crafter' || j === 'trader' ? pr.culture + 1 : pr.know + 1) / 2)));
    // Futter: genug Fischer, Rest Sammler
    const used = Object.values(target).reduce((a, b) => a + b, 0);
    let rest = Math.max(0, n - used);
    const full = s.res.food > P.storage(s) * 0.75;
    const needFood = cons * (full ? 0.85 : 1.15 + pr.food * 0.12) - (target.gardener || 0) * 0.25;
    let fishers = Math.ceil(Math.max(0, needFood) / 0.62);
    fishers = Math.min(rest, Math.max(1, fishers));
    if (s._saving && rest - fishers < 2 && fishers > 1) fishers = Math.max(1, rest - 2);
    target.fisher = fishers;
    target.gatherer = Math.max(0, rest - fishers);
    if (target.gatherer === 0 && rest > 0 && fishers > 1) { target.fisher--; target.gatherer = 1; }
    // Überbelegung kürzen, falls zu wenige Katzen
    let total = Object.values(target).reduce((a, b) => a + b, 0);
    const cutOrder = ['inventor', 'trader', 'crafter', 'carer', 'scholar', 'explorer', 'gardener', 'builder'];
    while (total > n) { const k = cutOrder.find((x) => target[x] > (x === 'builder' ? 1 : 0)); if (!k) break; target[k]--; total--; }

    // Zuteilung: bestehende Berufe behalten, wenn noch gebraucht; dann nach Eignung
    const count = {};
    const free = [];
    for (const c of P.shuffle(s, ws)) {
      if (c.job && target[c.job] && (count[c.job] || 0) < target[c.job]) count[c.job] = (count[c.job] || 0) + 1;
      else free.push(c);
    }
    const fit = (c, j) => (P.TALENT_JOB[c.talent] === j ? 3 : 0) + c.traits.reduce((a, t) => a + (P.TRAITS[t].job.includes(j) ? 1 : 0), 0) - (j === 'fisher' && c.weak === 'wasserscheu' ? 3 : 0);
    const order = Object.keys(target).sort((a, b) => (a === 'gatherer') - (b === 'gatherer'));
    for (const j of order) {
      while ((count[j] || 0) < target[j] && free.length) {
        free.sort((a, b) => fit(b, j) - fit(a, j));
        const c = free.shift();
        if (c.job !== j && c.job) P.addMem(s, c, `Arbeitet jetzt als ${P.JOBS[j].n[c.sex === 'w' ? 1 : 0]}.`, 1);
        c.job = j; count[j] = (count[j] || 0) + 1;
      }
    }
    for (const c of free) c.job = 'gatherer';
    for (const c of P.alive(s)) if (P.ph(s, c) !== 2) c.job = P.ph(s, c) === 3 && c.job === 'scholar' ? 'scholar' : null;
  };

  // ───────── Bauplanung ─────────
  P.buildOptions = function (s) {
    const list = [];
    for (const k in P.BUILD) {
      const d = P.BUILD[k];
      if (d.st > s.stage) continue;
      if (d.unique && s.b.some((b) => b.type === k)) continue;
      if (d.path && s.path !== d.path && s.path2 !== d.path) continue;
      if (d.needFlag && !s.flags[d.needFlag]) continue;
      list.push(k);
    }
    return list;
  };
  P.plan = function (s) {
    if (s.stage < 1) return;
    const sites = s.b.filter((b) => b.prog < 1).length;
    const maxSites = 1 + Math.floor(s.stage / 2);
    if (sites >= maxSites) return;
    const al = P.alive(s).length;
    const cap = P.housing(s);
    const opts = P.buildOptions(s);
    const req = P.REQ[s.stage + 1];
    const rates = s._rates || {};
    const cands = [];
    const pr = s.prio;
    // Spielerprojekt zuerst
    if (s.project && opts.includes(s.project)) {
      const d = P.BUILD[s.project];
      if (P.canAfford(s, d.cost)) { if (P.placeBuilding(s, s.project)) { s.project = null; return; } }
      else return; // Material sparen
    }
    for (const k of opts) {
      const d = P.BUILD[k];
      if (k === 'tunnel' || k === 'memorial') continue;
      let sc = 0;
      const have = P.countB(s, k);
      if (d.cap) {
        const homesT = opts.filter((x) => P.BUILD[x].cap && P.BUILD[x].st < 99).sort((a, b) => P.BUILD[b].st - P.BUILD[a].st);
        if (k !== homesT[0] && k !== homesT[1] && !(d.tall >= 3 && s.stage >= 5)) continue;
        if (k === homesT[1] && P.canAfford(s, P.BUILD[homesT[0]].cost)) continue;
        sc = cap < al + 3 ? 10 : cap < al + 8 ? 4 : cap < al + 14 ? 0.6 : 0;
        sc *= 0.7 + pr.grow * 0.25;
        if (d.tall >= 3 && s.stage >= 5 && have < (s.stage === 6 ? 3 + al / 60 : 2 + al / 90)) sc = Math.max(sc, 3);
      } else if (d.k === 'food' || d.fish) {
        if (k === 'feedspot' || k === 'store') sc = s.res.food > P.storage(s) * 0.8 ? 6 : 1;
        else sc = (rates.food || 0) < 0.3 ? 7 : 1.5;
        if (k === 'feedspot' && have >= 2) sc *= 0.3;
        sc *= 0.7 + pr.food * 0.25;
      } else if (d.coh) {
        sc = s.coh < 55 ? 4 : 1.5;
        sc /= 1 + have * 0.5;
        sc *= 0.6 + pr.culture * 0.3;
      } else if (d.job) {
        sc = have === 0 ? 8 : 2 / (1 + have);
        if (have >= 1 + Math.floor(al / 45)) sc = 0;
        else if (have > 0 && P.alive(s).filter((c) => c.job === d.job).length < slotsFor(s, d.job)) sc = 0;
        if (d.job === 'scholar') sc *= 0.6 + pr.know * 0.3;
      } else if (k === 'bridge') {
        const talls = s.b.filter((b) => P.BUILD[b.type].tall && b.prog >= 1).length;
        sc = have < talls * 1.3 ? (have < (s.stage - 3) * 4 ? 3 : 0.8) : 0;
      }
      if (req && req.b && req.b[k] && P.countB(s, k) < req.b[k]) sc += 9;
      if (d.path) sc += 4;
      // Obergrenzen gegen Wildwuchs kleiner Bauten
      const lim = { feedspot: Math.min(6, 1 + al / 14), sunspot: Math.min(10, 2 + al / 16), scratch: Math.min(10, 2 + al / 18), lounge: Math.min(6, 1 + al / 40), jetty: Math.min(10, 2 + al / 16), pond: Math.min(6, 1 + al / 40), store: Math.min(8, 1 + al / 30), garden: Math.min(5, 1 + al / 40), bridge: 99 };
      if (lim[k] !== undefined && have >= lim[k]) continue;
      if (sc > 0) cands.push({ k, sc, ok: P.canAfford(s, d.cost) });
    }
    // Ausbaustufen bestehender Gebäude
    for (const b of s.b) {
      const d = P.BUILD[b.type];
      if (!d.lv || b.prog < 1 || b.lv >= 3 || d.lvSt[b.lv] > s.stage) continue;
      const cost = {}; for (const r in d.cost) cost[r] = Math.ceil(d.cost[r] * (1 + b.lv * 0.6));
      if (!P.canAfford(s, cost)) continue;
      cands.push({ k: 'up', b, cost, sc: (cap < al + 4 ? 6 : 1.5), ok: true });
    }
    if (!cands.length) return;
    cands.sort((a, b) => b.sc - a.sc);
    // Wichtiges, aber zu teures Vorhaben → Material sparen statt Kleinkram bauen
    if (!cands[0].ok && cands[0].sc >= 8 && (s.saveSince === undefined || s.saveSince === null || s.t - s.saveSince < 48)) {
      if (s._saving !== cands[0].k) s.saveSince = s.t;
      s._saving = cands[0].k; return;
    }
    s._saving = null; s.saveSince = null;
    const top = cands.find((c) => c.ok);
    if (!top) return;
    if (top.k === 'up') {
      for (const r in top.cost) s.res[r] -= top.cost[r];
      top.b.lv++; top.b.prog = 0; top.b.work = 0; top.b.need = P.BUILD[top.b.type].work * (1 + top.b.lv * 0.4); top.b.upFrom = top.b.lv - 1;
      s.worldDirty = true;
      return;
    }
    P.placeBuilding(s, top.k);
  };

  // ───────── Stufen ─────────
  P.reqStatus = function (s, stage) {
    const r = P.REQ[stage];
    if (!r) return null;
    const al = P.alive(s).length;
    const days = P.day(s) - s.foundDay + (s.t % 24) / 24;
    const items = [];
    items.push({ n: 'Zeit seit Gründung', have: Math.floor(days * 10) / 10, need: r.minDay, unit: 'Tage' });
    items.push({ n: 'Einwohner', have: al, need: r.pop });
    items.push({ n: 'Futtervorrat', have: Math.floor(s.res.food), need: r.foodStock });
    if (r.know) items.push({ n: 'Wissen', have: Math.floor(s.res.know), need: r.know });
    items.push({ n: 'Zusammenhalt', have: Math.round(s.coh), need: r.coh });
    items.push({ n: 'Infrastruktur', have: Math.round(P.infra(s)), need: r.infra });
    if (r.regions) items.push({ n: 'Erschlossene Gebiete', have: s.regions.length, need: r.regions });
    if (r.trad) items.push({ n: 'Traditionen', have: s.trad.length, need: r.trad });
    if (r.path) items.push({ n: 'Entwicklungspfad gewählt', have: s.path ? 1 : 0, need: 1, bool: 1 });
    for (const k in r.b) items.push({ n: P.BUILD[k].n, have: P.countB(s, k, true), need: r.b[k] });
    return { items, ok: items.every((i) => i.have >= i.need) };
  };
  P.checkStage = function (s) {
    if (s.stage < 1 || s.stage >= 6) return false;
    const st = P.reqStatus(s, s.stage + 1);
    if (!st || !st.ok) return false;
    s.stage++;
    P.chron(s, 'stage', `${s.realm} ist jetzt ein${s.stage === 2 || s.stage === 4 || s.stage === 5 || s.stage === 6 ? 'e' : ''} ${P.STAGES[s.stage].n}!`);
    s.rep.stage.push(s.stage);
    s.worldDirty = true;
    // Meilenstein-Entscheidung
    const e = P.EVM['stage' + s.stage];
    if (e) s.pending.unshift({ id: e.id, ctx: {}, d: P.day(s), uid: s.nid++ });
    P.assignJobs(s);
    return true;
  };

  // ───────── Tägliche Abläufe ─────────
  const WEATHER = [
    [['sonnig', 5], ['wolkig', 3], ['Regen', 2]],
    [['sonnig', 7], ['wolkig', 2], ['Gewitter', 1]],
    [['wolkig', 4], ['Regen', 3], ['Sturm', 1.2], ['Nebel', 2], ['sonnig', 2]],
    [['Schnee', 4], ['wolkig', 3], ['sonnig', 2], ['Nebel', 1]],
  ];
  P.daily = function (s, d, offline) {
    if (s.stage < 1) return;
    const w = P.wpick(s, WEATHER[P.season(s)], (x) => x[1]);
    s.weather = w[0];
    P.deathsDay(s);
    P.birthsDay(s);
    P.socialDay(s, offline);
    P.moodDay(s, offline);
    P.wishesDay(s);
    // Zusammenhalt strebt einem Zielwert entgegen
    const al = P.alive(s);
    const culture = s.b.reduce((a, b) => a + (b.prog >= 1 ? (P.BUILD[b.type].coh || 0) * b.lv * (b.cond / 100) : 0), 0);
    const tgt = P.clamp(32 + Math.min(32, (culture * 2.5) / Math.max(2, Math.sqrt(al.length))) + Math.min(12, s.trad.length * 1.5) + (s.trust - 50) * 0.15 - (s.hungry ? 15 : 0), 10, 95);
    s.coh = P.clamp(s.coh + (tgt - s.coh) * 0.35, offline ? 30 : 0, 100);
    s.trust = P.clamp(s.trust + (55 - s.trust) * 0.03, 0, 100);
    // Verfall (gering) und Wetterschäden
    for (const b of s.b) if (b.prog >= 1) b.cond = Math.max(offline ? 50 : 20, b.cond - (s.weather === 'Sturm' ? 3 : 0.4) * (s.flags.sturdy ? 0.5 : 1));
    // Traditionen & Feste zu Beginn jeder Jahreszeit
    if (d % P.DAYS_PER_SEASON === 0 && s.trad.length) {
      const t = s.trad[(d / P.DAYS_PER_SEASON) % s.trad.length | 0];
      s.festUntil = s.t + 5;
      s.coh = P.clamp(s.coh + 3, 0, 100);
      P.chron(s, 'trad', `Fest: ${t.n} wird gefeiert.`);
      P.story(s, `Heute feiert ${s.realm}: ${t.n}.`, 'trad', []);
      for (const c of al) if (c.wish === 'feast' && P.ph(s, c) >= 2 && P.chance(s, 0.3)) P.fulfillWish(s, c);
    }
    // Zuwanderung einzelner Katzen, wenn es sich gut lebt
    if (s.stage >= 1 && s.coh > 55 && P.housing(s) - al.length >= 3 && P.chance(s, 0.12 + s.stage * 0.02)) {
      const n = P.newCats(s, 1, { origin: P.pick(s, ['aus dem Wald', 'vom Fluss herab', 'über die Hügel', 'aus einer fernen Stadt']) });
      P.story(s, `${n[0]} ist zugezogen und bleibt.`, 'pers', [s.nid - 1]);
      P.chron(s, 'pers', `${n[0]} zieht nach ${s.realm}.`);
    }
    // Kleine Alltagsgeschichten
    flavor(s);
    // Erkundung
    for (const k of P.REGION_KEYS) {
      const R = P.REGIONS[k];
      if (s.regions.includes(k) || R.st > s.stage) continue;
      if (s.exp >= R.cost) { P.unlockRegion(s, k, 'die Entdecker haben den Weg gefunden'); break; }
    }
    // Entdecker finden Kleinigkeiten
    const ex = al.filter((c) => c.job === 'explorer');
    if (ex.length && P.chance(s, 0.35)) {
      const c = P.pick(s, ex);
      const finds = [['einen Haufen Karton', { cardboard: 5 }], ['wilden Sisal', { sisal: 6 }], ['einen Beerenstrauch', { food: 8 }], ['einen alten Wollrest', { wool: 3 }]];
      const f = P.pick(s, finds);
      P.fx(s, f[1]);
      P.story(s, `${c.name} hat ${f[0]} gefunden.`, 'disc', [c.id]);
    }
    // Fortsetzungen, deren Bedingungen entfallen sind, nicht ewig aufheben
    s.sched = s.sched.filter((x) => s.t / 24 - x.at < 30);
    P.assignJobs(s);
    assignHomes(s);
    P.plan(s);
    P.checkStage(s);
  };

  const FLAVOR = [
    (s, a) => `${a.name} hat den ganzen Nachmittag einen Schmetterling beobachtet.`,
    (s, a) => `${a.name} hat sich auf dem höchsten Ast verirrt und wurde mit viel Geduld heruntergelockt.`,
    (s, a) => `${a.name} hat ein neues Lieblingsplätzchen in der Sonne gefunden.`,
    (s, a) => `${a.name} bringt den Kleinen das Anschleichen bei.`,
    (s, a) => `${a.name} hat beim Putzen einen beeindruckenden Haarball produziert.`,
    (s, a) => `${a.name} hat heimlich ein Wollknäuel in ${P.pr(s, a).seine} Höhle geschmuggelt.`,
    (s, a) => `${a.name} summt beim Arbeiten ein altes Lied.`,
  ];
  function flavor(s) {
    if (!P.chance(s, 0.6)) return;
    const a = P.pickCat(s, (c) => P.ph(s, c) >= 1);
    if (!a) return;
    P.story(s, P.pick(s, FLAVOR)(s, a), 'pers', [a.id]);
  }

  // ───────── Zeitschritt ─────────
  P.step = function (s, h, offline) {
    const d0 = Math.floor(s.t / 24);
    s.t += h;
    P.hourly(s, h, offline);
    const d1 = Math.floor(s.t / 24);
    for (let d = d0 + 1; d <= d1; d++) P.daily(s, d, offline);
    // Ereignisse
    if (s.stage >= 1 && s.t >= s.nextEv) {
      const maxPend = offline ? 3 : 3;
      if (s.pending.length < maxPend) P.genEvent(s, offline);
      const early = P.day(s) - s.foundDay < 1;
      s.nextEv = s.t + (offline ? P.rf(s, 7, 12) : early ? P.rf(s, 0.35, 0.7) : P.rf(s, 0.6, 1.3));
    }
    // Regelmäßige Bauplanung auch untertags
    if (Math.floor((s.t - h) / 3) !== Math.floor(s.t / 3)) { P.plan(s); P.assignHomes(s); }
  };

  // Nachberechnung nach Abwesenheit: grobe Schritte, Negatives begrenzt, keine automatischen Entscheidungen
  P.MAX_OFFLINE_H = 24 * 60; // max. 60 Spieltage (= 15 echte Tage) werden simuliert
  P.catchUp = function (s, nowMs, onProgress) {
    const elapsed = Math.max(0, (nowMs - s.lastReal) / 1000);
    let hours = elapsed / P.HOUR_REAL_SEC;
    const rep = P.newRep(s.lastReal);
    s.rep = rep;
    let frozen = 0;
    if (hours > P.MAX_OFFLINE_H) { frozen = hours - P.MAX_OFFLINE_H; hours = P.MAX_OFFLINE_H; }
    rep.sim = hours; rep.frozen = frozen;
    if (s.stage < 1) { s.t += Math.min(hours, 2); s.lastReal = nowMs; return rep; }
    const startPend = s.pending.length;
    let done = 0;
    while (done < hours) {
      const step = done < 12 ? 0.25 : done < 72 ? 1 : 3;
      const h = Math.min(step, hours - done);
      P.step(s, h, true);
      done += h;
    }
    rep.newDecisions = s.pending.length - startPend;
    s.lastReal = nowMs;
    return rep;
  };
})();
