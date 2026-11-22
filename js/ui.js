// Pfotenreich – Bedienoberfläche: HUD, Ereignisse, Berichte, Bewohner, Chronik, Leitlinien, Menü
(function () {
  const P = self.P, A = P.ART, R = P.R;
  const UI = (P.UI = {});
  const $ = (q) => document.querySelector(q);
  const esc = P.esc;
  let S = null;
  const anims = new Set(); // animierte Porträt-Canvases

  UI.bind = (s) => { S = s; };

  // ───────── Porträt-Canvas ─────────
  function portraitCanvas(c, size, expr, opt) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
    cv.className = 'pc';
    const draw = (t) => {
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
      const bg = g.createRadialGradient(size / 2, size * 0.4, 2, size / 2, size / 2, size * 0.7);
      bg.addColorStop(0, opt && opt.bg ? opt.bg : '#fff7e6'); bg.addColorStop(1, opt && opt.bg2 ? opt.bg2 : '#ead9b8');
      g.fillStyle = bg; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip();
      const ph = P.ph(S, c);
      A.portrait(g, c, size / 2, size * 0.47, size * 0.27, c.dead ? 'neutral' : expr || moodExpr(c), t, { kid: c.dead ? 2 : ph, job: ph === 2 ? c.job : null });
      g.restore();
      if (c.dead) { g.fillStyle = 'rgba(240,235,225,0.45)'; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill(); }
    };
    draw(0);
    if (opt && opt.anim) { cv._draw = draw; anims.add(cv); }
    return cv;
  }
  UI.portraitCanvas = portraitCanvas;
  function moodExpr(c) { return c.mood > 80 ? 'joy' : c.mood > 60 ? 'neutral' : c.mood > 40 ? 'neutral' : c.mood > 25 ? 'sad' : 'sad'; }
  UI.tickAnims = (t) => { for (const cv of anims) { if (!cv.isConnected) { anims.delete(cv); continue; } cv._draw(t); } };

  // ───────── HUD ─────────
  UI.hud = function () {
    const s = S;
    const al = P.alive(s);
    const h = P.hour(s);
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15;
    const dayIcon = h < 6 || h >= 21 ? '🌙' : h < 8 ? '🌅' : h >= 18 ? '🌇' : '☀️';
    const wIcon = { sonnig: '☀️', wolkig: '☁️', Regen: '🌧️', Sturm: '🌬️', Gewitter: '⛈️', Schnee: '❄️', Nebel: '🌫️' }[s.weather] || '';
    $('#realm').textContent = s.realm;
    $('#stage').textContent = P.STAGES[s.stage].n;
    $('#date').textContent = `${P.dateStr(s)} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${dayIcon}${wIcon}`;
    const avgMood = al.length ? al.reduce((a, c) => a + c.mood, 0) / al.length : 0;
    const rate = s._rates ? s._rates.food : 0;
    $('#chips').innerHTML = `<span title="Bewohner">🐾 ${al.length}</span><span title="Futter" class="${s.hungry ? 'warn' : ''}">🐟 ${Math.floor(s.res.food)}<small>${rate >= 0 ? '▲' : '▼'}</small></span><span title="Stimmung">${avgMood > 65 ? '😺' : avgMood > 45 ? '🐱' : '😿'} ${Math.round(avgMood)}</span><span title="Zusammenhalt">🤝 ${Math.round(s.coh)}</span>`;
    const n = s.pending.length;
    const eb = $('#evBtn');
    eb.classList.toggle('hidden', n === 0);
    eb.querySelector('b').textContent = n;
    if (n) { const p = s.pending[0]; eb.querySelector('span').textContent = P.evTitle(s, p); }
  };

  // ───────── Toasts ─────────
  let toastQ = [], toastBusy = false;
  UI.pumpToasts = function () {
    const s = S;
    if (s._toasts && s._toasts.length) { toastQ.push(...s._toasts.slice(-3)); s._toasts.length = 0; if (toastQ.length > 4) toastQ = toastQ.slice(-4); }
    if (toastBusy || !toastQ.length || UI.modalOpen()) return;
    const t = toastQ.shift();
    toastBusy = true;
    const el = document.createElement('div'); el.className = 'toast';
    const c = t.cats && t.cats.length ? P.cat(s, t.cats[0]) : null;
    if (c) { const pc = portraitCanvas(c, 34, 'joy'); el.appendChild(pc); el.onclick = () => UI.openCat(c.id); }
    const sp = document.createElement('span'); sp.textContent = t.t; el.appendChild(sp);
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => { el.remove(); toastBusy = false; }, 4700);
  };

  // ───────── Modal / Sheet ─────────
  UI.modalOpen = () => !$('#modal').classList.contains('hidden');
  function openModal(html, cls) { const m = $('#modal'); m.className = 'modal ' + (cls || ''); m.querySelector('.mbody').innerHTML = html; m.scrollTop = 0; m.querySelector('.mbody').scrollTop = 0; return m.querySelector('.mbody'); }
  UI.closeModal = () => { $('#modal').classList.add('hidden'); };
  function openSheet(title, html) {
    const sh = $('#sheet'); sh.classList.remove('hidden');
    sh.querySelector('h2').textContent = title; const b = sh.querySelector('.sbody'); b.innerHTML = html; b.scrollTop = 0;
    P.AU.play('open');
    return b;
  }
  UI.openSheet = openSheet;
  UI.closeSheet = () => { $('#sheet').classList.add('hidden'); R.selB = null; };

  // ───────── Ereignis ─────────
  let sceneAnim = null;
  UI.openEvent = function (uid) {
    const s = S;
    const p = uid ? s.pending.find((x) => x.uid === uid) : s.pending[0];
    if (!p) return;
    const e = P.EVM[p.id];
    P.AU.play('event');
    const cats = P.evCats(s, p).map((id) => P.cat(s, id));
    const b = openModal(`
      <div class="evhead"><canvas id="evScene"></canvas><span class="evcat c-${e.c}">${P.CAT_LABEL[e.c] || ''}</span>${s.pending.length > 1 ? `<span class="evmore">+${s.pending.length - 1} weitere</span>` : ''}</div>
      <h3>${esc(P.evTitle(s, p))}</h3>
      <p class="evtext">${esc(P.evText(s, p))}</p>
      <div class="opts">${P.evOpts(s, p).map((o) => `<button class="opt" data-i="${o.i}" ${o.ok ? '' : 'disabled'}><b>${esc(o.l)}</b>${o.h ? `<small>${esc(o.ok ? o.h : o.why)}</small>` : ''}</button>`).join('')}</div>
      ${e.c !== 'stage' && p.id !== 'found' ? '<button class="ghost later">Später entscheiden</button>' : ''}`, 'event');
    const cv = b.querySelector('#evScene');
    startScene(cv, e.art || 'meadow', cats, 'neutral');
    b.querySelectorAll('.opt').forEach((btn) => btn.onclick = () => choose(p, +btn.dataset.i));
    const later = b.querySelector('.later'); if (later) later.onclick = () => { stopScene(); UI.closeModal(); };
  };
  function startScene(cv, art, cats, expr, reacts) {
    stopScene();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 340, h = cv.clientHeight || 190;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d');
    const t0 = performance.now();
    const frame = () => {
      const t = R.reduced ? 0 : (performance.now() - t0) / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      A.scene(g, w, h, art, t, P.season(S), S);
      const n = cats.length;
      cats.forEach((c, i) => {
        const x = n === 1 ? w * 0.5 : w * (0.32 + i * 0.36 / Math.max(1, n - 1));
        const ex = reacts ? (reacts.find((r) => r.id === c.id) || {}).emo || expr : expr;
        const map = { love: 'comfort', surprise: 'surprise', angry: 'angry', joy: 'joy', proud: 'proud' };
        A.portrait(g, c, x, h * 0.62, h * 0.22, map[ex] || ex, t, { kid: P.ph(S, c), job: P.ph(S, c) === 2 ? c.job : null });
        g.font = '600 12px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,250,240,0.9)';
        const tw = g.measureText(c.name).width + 10; g.fillRect(x - tw / 2, h - 18, tw, 16); g.fillStyle = '#3a2a20'; g.fillText(c.name, x, h - 6);
      });
      if (!cats.length && (art === 'meadow' || art === 'found')) {
        P.alive(S).slice(0, 5).forEach((c, i) => A.drawCat(g, c, w * (0.2 + i * 0.15), h * 0.9, 2.2, i % 2 ? -1 : 1, i % 3 === 0 ? 'sit' : 'walk', t, {}));
      }
      if (!R.reduced) sceneAnim = requestAnimationFrame(frame);
    };
    frame();
  }
  function stopScene() { if (sceneAnim) cancelAnimationFrame(sceneAnim); sceneAnim = null; }

  async function choose(p, oi) {
    const s = S;
    const e = P.EVM[p.id];
    const cats = P.evCats(s, p).map((id) => P.cat(s, id));
    const stageBefore = s.stage;
    const r = P.resolve(s, p.uid, oi);
    if (!r) return;
    P.AU.play('choose');
    await P.save(s); // Entscheidung sofort sichern → kein Duplizieren durch Neuladen
    R.invalidate();
    const reacts = r.reacts;
    const b = openModal(`
      <div class="evhead"><canvas id="evScene"></canvas><span class="evcat c-${e.c}">Entschieden</span></div>
      <h3>${esc(r.title)}</h3>
      <p class="chosen">Eure Wahl: <b>${esc(r.label)}</b></p>
      ${r.res ? `<p class="fx">${esc(r.res)}</p>` : ''}
      <div class="reacts">${reacts.map((x) => `<div class="react" data-id="${x.id}"><span class="rp"></span><span>${esc(x.t)}</span></div>`).join('')}</div>
      <button class="primary next">${s.pending.length ? `Weiter (${s.pending.length} offen)` : 'Weiter'}</button>`, 'event');
    const show = cats.length ? cats : reacts.slice(0, 2).map((x) => P.cat(s, x.id)).filter(Boolean);
    startScene(b.querySelector('#evScene'), e.art || 'meadow', show, 'joy', reacts);
    b.querySelectorAll('.react').forEach((el) => { const c = P.cat(s, +el.dataset.id); if (c) { const x = reacts.find((q) => q.id === c.id); el.querySelector('.rp').appendChild(portraitCanvas(c, 40, x.sc > 0 ? 'joy' : x.sc < 0 ? 'angry' : 'surprise')); el.onclick = () => UI.openCat(c.id); } });
    b.querySelector('.next').onclick = () => {
      stopScene();
      if (s.stage > stageBefore) { UI.stageUp(); return; }
      if (s.pending.length) UI.openEvent(); else UI.closeModal();
    };
    UI.hud();
  }

  UI.stageUp = function () {
    const s = S;
    P.AU.play('stage');
    const b = openModal(`<div class="evhead"><canvas id="evScene"></canvas><span class="evcat c-stage">Neue Stufe</span></div>
      <h3>${esc(s.realm)} ist jetzt: ${P.STAGES[s.stage].n}!</h3><p class="evtext">${esc(P.STAGES[s.stage].d)}</p>
      <p class="fx">Neue Bauwerke und Berufe sind verfügbar. Die Katzen bauen eigenständig weiter.</p><button class="primary next">Wunderbar!</button>`, 'event');
    startScene(b.querySelector('#evScene'), s.stage >= 4 ? 'city' : 'festival', P.alive(s).filter((c) => c.founder).slice(0, 2), 'joy');
    b.querySelector('.next').onclick = () => { stopScene(); if (s.pending.length) UI.openEvent(); else UI.closeModal(); };
  };

  // ───────── Bericht nach Rückkehr ─────────
  UI.openReport = function (rep) {
    const s = S;
    const realH = (Date.now() - rep.since) / 3600000;
    const away = realH >= 24 ? `${Math.floor(realH / 24)} Tag(e) und ${Math.floor(realH % 24)} Std.` : realH >= 1 ? `${Math.floor(realH)} Std. ${Math.floor((realH % 1) * 60)} Min.` : `${Math.floor(realH * 60)} Min.`;
    const items = [];
    const dedupe = (arr, k) => { const seen = new Set(); return arr.filter((x) => { const v = x[k]; if (seen.has(v)) return false; seen.add(v); return true; }); };
    for (const st of rep.stage) items.push(`<li class="big">🎉 ${esc(s.realm)} ist zur Stufe <b>${P.STAGES[st].n}</b> aufgestiegen!</li>`);
    for (const bth of rep.births.slice(-8)) items.push(`<li class="cats" data-ids="${bth.kid}">🍼 Nachwuchs bei ${esc(P.N(s, bth.mom))} und ${esc(P.N(s, bth.dad))}: <b>${esc(bth.names.join(', '))}</b></li>`);
    if (rep.births.length > 8) items.push(`<li>… und ${rep.births.length - 8} weitere Würfe.</li>`);
    const built = dedupe(rep.built, 'name');
    if (built.length) items.push(`<li>🏗️ Fertiggestellt: ${built.slice(0, 10).map((b) => `<b>${esc(b.name)}</b>`).join(', ')}${built.length > 10 ? ' u. a.' : ''}</li>`);
    for (const d of rep.disc) items.push(`<li>🧭 ${esc(d.t)}</li>`);
    for (const st of rep.stories.slice(-8)) items.push(`<li class="cats" data-ids="${(st.cats || []).join(',')}">✨ ${esc(st.t)}</li>`);
    for (const d of rep.deaths) items.push(`<li>🕯️ ${esc(d.name)} ist friedlich eingeschlafen${d.founder ? ' – eine Gründerkatze. Ein Gedenkstein erinnert an sie/ihn.' : '.'}</li>`);
    const b = openModal(`<div class="evhead"><canvas id="evScene"></canvas><span class="evcat c-pos">Willkommen zurück</span></div>
      <h3>Während du weg warst (${away})</h3>
      <p class="muted">${rep.sim >= 24 ? Math.floor(rep.sim / 24) + ' Spieltage' : Math.round(rep.sim) + ' Spielstunden'} sind in ${esc(s.realm)} vergangen.${rep.frozen > 0 ? ' Weil du sehr lange fort warst, hat das Reich danach geschlummert – nichts ist verloren gegangen.' : ''} Härten wurden während deiner Abwesenheit abgefedert.</p>
      <ul class="report">${items.join('') || '<li>Es war eine ruhige Zeit. Die Katzen haben gedöst, gefischt und geputzt.</li>'}</ul>
      ${s.pending.length ? `<p class="fx">${s.pending.length} Entscheidung(en) warten auf dich – nichts wurde ohne dich entschieden.</p>` : ''}
      <button class="primary next">${s.pending.length ? 'Zu den Entscheidungen' : 'Weiterspielen'}</button>`, 'event');
    const feat = (rep.births.length ? [P.cat(s, rep.births[rep.births.length - 1].kid)] : []).concat(P.alive(s).filter((c) => c.founder).slice(0, 1)).filter(Boolean).slice(0, 2);
    startScene(b.querySelector('#evScene'), 'home', feat, 'joy');
    b.querySelectorAll('li.cats').forEach((li) => { const ids = (li.dataset.ids || '').split(',').filter(Boolean).map(Number); const c = ids.length && P.cat(s, ids[0]); if (c) { li.prepend(portraitCanvas(c, 30, 'joy')); li.onclick = () => UI.openCat(c.id); } });
    b.querySelector('.next').onclick = () => { stopScene(); if (s.pending.length) UI.openEvent(); else UI.closeModal(); };
  };

  // ───────── Bewohner ─────────
  let volkSort = 'name', volkLimit = 60, volkFilter = '';
  UI.openVolk = function () {
    const s = S;
    const al = P.alive(s);
    let list = al.slice();
    if (volkFilter) list = list.filter((c) => (c.name + ' ' + P.jobName(c) + ' ' + c.traits.join(' ')).toLowerCase().includes(volkFilter.toLowerCase()));
    const sorters = { name: (a, b) => a.name.localeCompare(b.name), age: (a, b) => a.born - b.born, mood: (a, b) => b.mood - a.mood, job: (a, b) => (a.job || 'z').localeCompare(b.job || 'z') };
    list.sort((a, b) => (b.founder - a.founder) || sorters[volkSort](a, b));
    const away = s.cats.filter((c) => c.away && !c.dead);
    const jobs = {}; for (const c of al) if (c.job) jobs[c.job] = (jobs[c.job] || 0) + 1;
    const b = openSheet(`Bewohner (${al.length})`, `
      <div class="jobs">${Object.keys(jobs).map((j) => `<span>${P.JOBS[j].n[1]}: <b>${jobs[j]}</b></span>`).join('')}</div>
      <div class="row"><input id="vsearch" placeholder="Suchen: Name, Beruf, Eigenschaft…" value="${esc(volkFilter)}"><select id="vsort"><option value="name">Name</option><option value="age">Alter</option><option value="mood">Stimmung</option><option value="job">Beruf</option></select></div>
      <div class="catlist">${list.slice(0, volkLimit).map((c) => catRow(c)).join('')}</div>
      ${list.length > volkLimit ? `<button class="ghost more">Weitere ${list.length - volkLimit} anzeigen</button>` : ''}
      ${away.length ? `<h4>Auf Reisen</h4><div class="catlist">${away.map((c) => catRow(c)).join('')}</div>` : ''}
      <button class="ghost" id="memorial">Erinnerungen an Verstorbene (${s.cats.filter((c) => c.dead).length})</button>`);
    b.querySelector('#vsort').value = volkSort;
    b.querySelector('#vsort').onchange = (e) => { volkSort = e.target.value; UI.openVolk(); };
    b.querySelector('#vsearch').oninput = debounce((e) => { volkFilter = e.target.value; UI.openVolk(); setTimeout(() => { const i = $('#vsearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 350);
    const more = b.querySelector('.more'); if (more) more.onclick = () => { volkLimit += 80; UI.openVolk(); };
    b.querySelector('#memorial').onclick = () => UI.openMemorial();
    fillRows(b);
  };
  function catRow(c) {
    const s = S; const ph = P.ph(s, c);
    return `<div class="catrow" data-id="${c.id}"><span class="rp"></span><div><b>${esc(c.name)}</b>${c.founder ? ' <span class="badge">Gründer</span>' : ''}${c.away ? ' <span class="badge">auf Reisen</span>' : ''}<small>${P.PHASE[ph]} · ${esc(P.jobName(c))} · ${esc(c.traits.join(', '))}</small></div><span class="mood" style="--m:${c.mood}%"></span></div>`;
  }
  function fillRows(root) {
    const s = S;
    const rows = [...root.querySelectorAll('.catrow')];
    const io = 'IntersectionObserver' in self ? new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) { draw(en.target); io.unobserve(en.target); } }, { root: $('#sheet .sbody') }) : null;
    const draw = (el) => { const c = P.cat(s, +el.dataset.id); if (c && !el.querySelector('canvas')) el.querySelector('.rp').appendChild(portraitCanvas(c, 44)); };
    rows.forEach((el) => { el.onclick = () => UI.openCat(+el.dataset.id); if (io) io.observe(el); else draw(el); });
  }
  UI.openMemorial = function () {
    const s = S;
    const dead = s.cats.filter((c) => c.dead).sort((a, b) => b.dead - a.dead);
    const b = openSheet('In Erinnerung', `<p class="muted">Jede Katze, die in ${esc(s.realm)} gelebt hat, bleibt hier verzeichnet.</p><div class="catlist">${dead.map((c) => `<div class="catrow" data-id="${c.id}"><span class="rp"></span><div><b>${esc(c.name)}</b>${c.founder ? ' <span class="badge">Gründer</span>' : ''}<small>${P.dateStr(s, Math.floor(c.born < 0 ? 0 : c.born))} – ${P.dateStr(s, Math.floor(c.dead))}</small></div></div>`).join('') || '<p>Noch niemand.</p>'}</div>`);
    fillRows(b);
  };

  UI.openCat = function (id) {
    const s = S;
    const c = P.cat(s, id);
    if (!c) return;
    UI.closeModal(); stopScene();
    P.AU.play('purr');
    const ph = P.ph(s, c);
    const pr = P.pr(s, c);
    const home = s.b.find((b) => b.id === c.home);
    const rels = Object.entries(c.rel).map(([k, v]) => [+k, v]).filter(([k]) => P.cat(s, k)).sort((a, b) => b[1] - a[1]);
    const friends = rels.filter((r) => r[1] > 40).slice(0, 6), rivals = rels.filter((r) => r[1] < -30).slice(0, 4);
    const chip = (cid, extra) => { const o = P.cat(s, cid); return o ? `<button class="chip" data-id="${cid}">${esc(o.name)}${o.dead ? ' †' : ''}${extra ? ' <small>' + extra + '</small>' : ''}</button>` : ''; };
    const wish = P.WISHES.find((w) => w.k === c.wish);
    const gp = c.parents.flatMap((p) => { const pc = P.cat(s, p); return pc ? pc.parents : []; });
    const grandkids = c.kids.flatMap((k) => { const kc = P.cat(s, k); return kc ? kc.kids : []; });
    const named = s.b.filter((b) => b.honor === c.id);
    const b = openSheet(c.name, `
      <div class="catcard"><div class="bigp"></div>
        <div><p class="tags">${c.founder ? '<span class="badge">Gründerkatze</span> ' : ''}<span>${pr.Kater}</span> · <span>${P.PHASE[ph]}</span> · <span>${Math.floor(P.ageYears(s, c))} Katzenjahre</span> · <span>${c.gen ? c.gen + '. Generation' : '1. Generation'}</span></p>
        <p><b>Beruf:</b> ${esc(P.jobName(c))} · <b>Talent:</b> ${esc(c.talent)}</p>
        <p><b>Wesen:</b> ${c.traits.map((t) => `<span class="trait" title="${esc(P.TRAITS[t].d)}">${t}</span>`).join(' ')} · <b>Schwäche:</b> ${esc(c.weak)}</p>
        ${!c.dead ? `<p><b>Herzenswunsch:</b> ${esc(wish ? wish.t : '—')}</p><div class="bar"><span style="width:${c.mood}%"></span><i>Stimmung ${Math.round(c.mood)}</i></div>` : `<p class="muted">Verstorben am ${P.dateStr(s, Math.floor(c.dead))}</p>`}
        </div></div>
      <p class="muted look">${esc(P.lookText(c))}</p>
      <p class="story">${esc(c.story)}</p>
      ${!c.dead ? `<p><b>Zuhause:</b> ${home ? `<button class="chip" data-b="${home.id}">${esc(P.bName(home))}</button>` : 'noch ohne festes Zuhause'}</p>` : ''}
      ${named.length ? `<p><b>Nach ${pr.ihm} benannt:</b> ${named.map((n) => esc(P.bName(n))).join(', ')}</p>` : ''}
      <h4>Familie</h4>
      <p>${c.partner ? `Partner:in: ${chip(c.partner)}<br>` : ''}${c.parents.length ? `Eltern: ${c.parents.map((p) => chip(p)).join(' ')}<br>` : c.founder ? 'Kam als Gründerkatze ins Tal.<br>' : c.origin ? `Kam ${esc(c.origin)}.<br>` : ''}${gp.length ? `Großeltern: ${gp.map((p) => chip(p)).join(' ')}<br>` : ''}${c.kids.length ? `Kinder: ${c.kids.map((k) => chip(k)).join(' ')}<br>` : ''}${grandkids.length ? `Enkel: ${grandkids.slice(0, 12).map((k) => chip(k)).join(' ')}${grandkids.length > 12 ? ' …' : ''}` : ''}</p>
      ${c.kids.length || c.parents.length ? '<button class="ghost tree">Stammbaum anzeigen</button>' : ''}
      <h4>Beziehungen</h4>
      <p>${friends.length ? 'Freunde: ' + friends.map((r) => chip(r[0])).join(' ') : 'Noch keine engen Freunde.'}</p>
      ${rivals.length ? `<p>Rivalen: ${rivals.map((r) => chip(r[0])).join(' ')}</p>` : ''}
      <h4>Erinnerungen</h4>
      <ul class="mem">${c.mem.slice().reverse().map((m) => `<li><small>${P.dateStr(s, m.d)}</small> ${esc(m.t)}</li>`).join('') || '<li>Noch keine besonderen Erlebnisse.</li>'}</ul>
      ${!c.dead && !c.away ? '<button class="primary follow">In der Welt zeigen</button>' : ''}`);
    b.querySelector('.bigp').appendChild(portraitCanvas(c, 120, null, { anim: true }));
    b.querySelectorAll('.chip[data-id]').forEach((el) => el.onclick = () => UI.openCat(+el.dataset.id));
    b.querySelectorAll('.chip[data-b]').forEach((el) => el.onclick = () => UI.openBuilding(+el.dataset.b));
    const f = b.querySelector('.follow'); if (f) f.onclick = () => { R.follow = c.id; R.cam.z = Math.max(R.cam.z, 2.4); UI.closeSheet(); UI.toastHint(`Kamera folgt ${c.name}. Tippe auf die Welt, um loszulassen.`); };
    const tr = b.querySelector('.tree'); if (tr) tr.onclick = () => UI.openTree(c.id);
  };

  UI.openTree = function (id) {
    const s = S; const c = P.cat(s, id);
    // Vorfahren bis zu den Gründern, Nachfahren 3 Generationen
    const anc = (cid, d) => { const x = P.cat(s, cid); if (!x || d > 4) return ''; return `<div class="tnode">${node(x)}${x.parents.length ? `<div class="tkids up">${x.parents.map((p) => anc(p, d + 1)).join('')}</div>` : ''}</div>`; };
    const desc = (cid, d) => { const x = P.cat(s, cid); if (!x) return ''; return `<div class="tnode">${node(x)}${x.kids.length && d < 3 ? `<div class="tkids">${x.kids.map((k) => desc(k, d + 1)).join('')}</div>` : ''}</div>`; };
    const node = (x) => `<button class="tn${x.founder ? ' f' : ''}${x.dead ? ' d' : ''}" data-id="${x.id}"><span class="rp" data-pid="${x.id}"></span>${esc(x.name)}</button>`;
    const b = openSheet(`Stammbaum: ${c.name}`, `<p class="muted">Gründerkatzen sind golden umrandet, Verstorbene blass.</p><h4>Vorfahren</h4><div class="tree">${anc(id, 0)}</div><h4>Nachkommen</h4><div class="tree">${desc(id, 0)}</div>`);
    b.querySelectorAll('.tn').forEach((el) => { const x = P.cat(s, +el.dataset.id); el.querySelector('.rp').appendChild(portraitCanvas(x, 30)); el.onclick = () => UI.openCat(x.id); });
  };

  // ───────── Gebäude ─────────
  const BDESC = {
    den: 'Eine gemütliche Schlafstätte für einige Katzen.', feedspot: 'Hier wird Futter gelagert und verteilt.', scratch: 'Kratzen hält gesund und stärkt den Zusammenhalt.', sunspot: 'Warme Steine zum Dösen.',
    jetty: 'Fischer fangen hier mehr.', treehouse: 'Ein bewohnbarer Kratzbaum mit Plattformen.', store: 'Vergrößert den Vorrat.', workshop: 'Spielzeugmacher stellen Wolle und Karton her.', garden: 'Gärtner ziehen Katzenminze und Kräuter.',
    pond: 'Ein ruhiger Teich voller Fische.', council: 'Hier tagt der Katzenrat.', festplatz: 'Hier wird gefeiert.', school: 'Gelehrte geben hier Wissen weiter.', market: 'Händler tauschen Waren gegen Muscheln.',
    tinker: 'Erfinder tüfteln hier.', greenhouse: 'Ganzjährig grün.', lounge: 'Ein Ort zum Plaudern.', bridge: 'Verbindet die Bewohner hoher Bauten.', tower: 'Viele Etagen voller Wohnkisten.', monument: 'Erinnert an die Gründer.',
    skytower: 'Ein Wahrzeichen der Metropole.', hanging: 'Gärten, die über der Stadt schweben.', harbor: 'Tor zur Welt für Händler.', cable: 'Eine Seilbahn der Erfinder.', amphi: 'Bühne für Lieder und große Feste.', tunnel: 'Ein Unterschlupf in alten Gängen.', memorial: 'Ein Ort des Erinnerns.',
  };
  UI.openBuilding = function (id) {
    const s = S; const b = s.b.find((x) => x.id === id); if (!b) return;
    R.selB = b.id;
    const d = P.BUILD[b.type];
    const res = P.alive(s).filter((c) => c.home === b.id);
    const work = d.job ? P.alive(s).filter((c) => c.job === d.job) : [];
    const honor = b.honor ? P.cat(s, b.honor) : null;
    const bd = openSheet(P.bName(b), `
      <p>${esc(BDESC[b.type] || '')}</p>
      ${b.prog < 1 ? `<div class="bar"><span style="width:${Math.round(b.prog * 100)}%"></span><i>Im Bau: ${Math.round(b.prog * 100)} %</i></div>` : `<p class="muted">${d.lv ? `Ausbaustufe ${b.lv} von 3 · ` : ''}Zustand ${Math.round(b.cond)} % · erbaut ${b.built !== null ? P.dateStr(s, b.built) : 'zur Gründung'}</p>`}
      ${honor ? `<p>Benannt nach <button class="chip" data-id="${honor.id}">${esc(honor.name)}</button></p>` : ''}
      ${d.cap ? `<h4>Bewohner (${res.length}/${Math.round(d.cap * (1 + (b.lv - 1) * 0.6))})</h4><div class="chips">${res.map((c) => `<button class="chip" data-id="${c.id}">${esc(c.name)}</button>`).join('') || '—'}</div>` : ''}
      ${d.job ? `<h4>${P.JOBS[d.job].n[1]} im Reich (${work.length})</h4><div class="chips">${work.slice(0, 30).map((c) => `<button class="chip" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : ''}
      ${b.type === 'bridge' ? `<p>Verbindet ${esc(P.bName(s.b.find((x) => x.id === b.a) || {}) || '')} und ${esc(P.bName(s.b.find((x) => x.id === b.bb) || {}) || '')}.</p>` : ''}`);
    bd.querySelectorAll('.chip[data-id]').forEach((el) => el.onclick = () => UI.openCat(+el.dataset.id));
  };

  // ───────── Chronik ─────────
  let chronFilter = 'all', chronAsc = false;
  const CHRON_CAT = { all: 'Alles', found: 'Gründung', stage: 'Stufen', turn: 'Wendepunkte', dec: 'Entscheidungen', build: 'Bauwerke', disc: 'Entdeckungen', trad: 'Traditionen', fam: 'Familien', pers: 'Persönliches', death: 'Abschiede' };
  const CHRON_IC = { found: '🌱', stage: '🏛️', turn: '🌟', dec: '⚖️', build: '🏗️', disc: '🧭', trad: '🎐', fam: '👪', pers: '🐾', death: '🕯️' };
  UI.openChronik = function () {
    const s = S;
    let list = s.chron.filter((e) => chronFilter === 'all' || e.c === chronFilter || (chronFilter === 'stage' && e.c === 'found'));
    if (!chronAsc) list = list.slice().reverse();
    const shown = list.slice(0, 400);
    let lastY = null, html = '';
    for (const e of shown) {
      const y = Math.floor(e.d / P.DAYS_PER_YEAR) + 1;
      if (y !== lastY) { html += `<h4 class="year">Jahr ${y}</h4>`; lastY = y; }
      html += `<div class="ce c-${e.c}"><span>${CHRON_IC[e.c] || '•'}</span><div><small>${P.dateStr(s, e.d)}</small>${esc(e.t)}</div></div>`;
    }
    const founders = s.cats.filter((c) => c.founder);
    const b = openSheet(`Chronik von ${s.realm}`, `
      <div class="founders">${founders.map((c) => `<button class="fd" data-id="${c.id}"><span class="rp"></span>${esc(c.name)}${c.dead ? ' †' : ''}</button>`).join('')}</div>
      <p class="muted">Gegründet am ${P.dateStr(s, s.foundDay)} · ${s.stats.births} Geburten · ${s.stats.events} Entscheidungen · ${s.stats.built} Bauwerke · ${s.trad.length} Traditionen</p>
      <div class="filters">${Object.keys(CHRON_CAT).map((k) => `<button class="${k === chronFilter ? 'on' : ''}" data-k="${k}">${CHRON_CAT[k]}</button>`).join('')}<button data-ord="1">${chronAsc ? '↑ Älteste zuerst' : '↓ Neueste zuerst'}</button></div>
      <div class="chron">${html || '<p>Noch keine Einträge.</p>'}</div>${list.length > 400 ? '<p class="muted">Ältere Einträge über den Filter bzw. die Sortierung erreichbar.</p>' : ''}`);
    b.querySelectorAll('.filters button[data-k]').forEach((el) => el.onclick = () => { chronFilter = el.dataset.k; UI.openChronik(); });
    b.querySelector('[data-ord]').onclick = () => { chronAsc = !chronAsc; UI.openChronik(); };
    b.querySelectorAll('.fd').forEach((el) => { const c = P.cat(s, +el.dataset.id); el.querySelector('.rp').appendChild(portraitCanvas(c, 46)); el.onclick = () => UI.openCat(c.id); });
  };

  // ───────── Reich & Leitlinien ─────────
  const PRIO = { food: ['Versorgung', 'Mehr Fischer & Futterbauten'], build: ['Bauen', 'Mehr Baumeister, schnellere Bauten'], grow: ['Wachstum & Erkundung', 'Wohnraum und Entdecker'], know: ['Wissen', 'Gelehrte, Schulen, Erfinder'], culture: ['Kultur', 'Feste, Werkstätten, Treffpunkte'] };
  UI.openReich = function () {
    const s = S;
    const next = s.stage < 6 ? P.reqStatus(s, s.stage + 1) : null;
    const vals = s.val; const vmax = Math.max(10, ...Object.values(vals));
    const opts = P.buildOptions(s).filter((k) => !['tunnel', 'memorial'].includes(k));
    const r = s._rates || {};
    const rs = (k) => (r[k] !== undefined ? `<small class="${r[k] < 0 ? 'neg' : ''}">${r[k] >= 0 ? '+' : ''}${(r[k] * 24).toFixed(0)}/Tag</small>` : '');
    const b = openSheet(`${s.realm} · ${P.STAGES[s.stage].n}`, `
      <div class="stages">${P.STAGES.map((st, i) => `<span class="${i < s.stage ? 'done' : i === s.stage ? 'cur' : ''}" title="${esc(st.d)}">${st.n}</span>`).join('')}</div>
      ${next ? `<h4>Weg zur Stufe „${P.STAGES[s.stage + 1].n}“</h4><ul class="req">${next.items.map((i) => `<li class="${i.have >= i.need ? 'ok' : ''}"><span>${esc(i.n)}</span><span>${i.bool ? (i.have ? 'ja' : 'noch nicht') : `${i.have} / ${i.need}${i.unit ? ' ' + i.unit : ''}`}</span></li>`).join('')}</ul>` : '<p class="fx">Die höchste Stufe ist erreicht – doch die Geschichte geht weiter.</p>'}
      <h4>Vorräte</h4>
      <div class="res">${Object.keys(P.RES_N).map((k) => `<span><b>${Math.floor(s.res[k])}</b> ${P.RES_N[k]} ${rs(k)}</span>`).join('')}<span><b>${Math.round(P.housing(s))}</b> Schlafplätze</span><span><b>${P.storage(s)}</b> Lagerplatz</span></div>
      <h4>Gesellschaft</h4>
      <div class="bar"><span style="width:${s.coh}%"></span><i>Zusammenhalt ${Math.round(s.coh)}</i></div>
      <div class="bar trust"><span style="width:${s.trust}%"></span><i>Vertrauen in die Führung ${Math.round(s.trust)}</i></div>
      <div class="vals">${Object.keys(P.VALUES).map((k) => `<div><span>${P.VALUES[k].n}</span><i style="width:${(vals[k] / vmax) * 100}%;background:${P.VALUES[k].c}"></i><b>${Math.round(vals[k])}</b></div>`).join('')}</div>
      <p>${s.path ? `Entwicklungspfad: <b>${P.VALUES[s.path].path}${s.path2 ? ' mit ' + P.VALUES[s.path2].n : ''}</b>` : '<span class="muted">Noch kein Entwicklungspfad. Er entsteht aus euren vielen Entscheidungen – ein Wendepunkt wird kommen.</span>'}</p>
      <h4>Langfristige Prioritäten</h4><p class="muted">Die Katzen verteilen Berufe und Bauvorhaben selbst – du setzt nur die Leitlinien.</p>
      ${Object.keys(PRIO).map((k) => `<label class="prio"><span>${PRIO[k][0]}<small>${PRIO[k][1]}</small></span><input type="range" min="0" max="4" step="1" value="${s.prio[k]}" data-k="${k}"></label>`).join('')}
      <h4>Großes Bauvorhaben (optional)</h4>
      <p class="muted">Wählst du ein Projekt, sparen die Katzen gezielt Material dafür.</p>
      <select id="proj"><option value="">— keines, die Katzen entscheiden —</option>${opts.map((k) => `<option value="${k}" ${s.project === k ? 'selected' : ''}>${P.BUILD[k].n} (${Object.entries(P.BUILD[k].cost).map(([r2, v]) => v + ' ' + P.RES_N[r2]).join(', ')})</option>`).join('')}</select>
      <h4>Traditionen (${s.trad.length})</h4>
      <ul class="trad">${s.trad.map((t) => `<li><b>${esc(t.n)}</b> <small>seit ${P.dateStr(s, t.since)}</small><br>${esc(t.d)}</li>`).join('') || '<li class="muted">Noch keine. Traditionen entstehen aus Festen, Erfindungen und Geschichten.</li>'}</ul>
      ${s.districts.length ? `<h4>Viertel</h4><p>${s.districts.map((d) => esc(d.n)).join(' · ')}</p>` : ''}
      <h4>Gebiete (${s.regions.length}/${P.REGION_KEYS.length})</h4><p>${P.REGION_KEYS.map((k) => `<span class="${s.regions.includes(k) ? '' : 'muted'}">${P.REGIONS[k].n}</span>`).join(' · ')}</p>`);
    b.querySelectorAll('input[type=range]').forEach((el) => el.oninput = () => { s.prio[el.dataset.k] = +el.value; P.assignJobs(s); });
    b.querySelector('#proj').onchange = (e) => { s.project = e.target.value || null; P.plan(s); };
  };

  // ───────── Menü ─────────
  UI.openMenu = function () {
    const st = P.SETTINGS;
    const b = openSheet('Menü', `
      <h4>Einstellungen</h4>
      <label class="tog"><input type="checkbox" id="sMusic" ${st.music ? 'checked' : ''}> Musik</label>
      <label class="tog"><input type="checkbox" id="sSfx" ${st.sfx ? 'checked' : ''}> Geräusche</label>
      <label class="tog"><input type="checkbox" id="sReduced" ${st.reduced ? 'checked' : ''}> Reduzierte Bewegung (weniger Animationen & Partikel)</label>
      <label class="tog"><input type="checkbox" id="sLow" ${st.low ? 'checked' : ''}> Akku-Sparmodus (geringere Auflösung, 30 Bilder/s)</label>
      <h4>Spielstand</h4>
      <div class="btns"><button id="mSave">Jetzt speichern</button><button id="mExport">Als Datei exportieren</button><label class="btn">Datei importieren<input type="file" id="mImport" accept=".json,application/json" hidden></label></div>
      <div class="btns"><button id="mCopy">Als Text kopieren</button><button id="mPasteBtn">Text einfügen …</button></div>
      <textarea id="mPaste" class="hidden" rows="4" placeholder="Exportierten Spielstand hier einfügen"></textarea><button id="mPasteGo" class="ghost hidden">Eingefügten Spielstand laden</button>
      <p class="muted">Das Spiel speichert automatisch (alle 20 Sekunden, beim Schließen und nach jeder Entscheidung).</p>
      <h4>So funktioniert die Zeit</h4>
      <p class="muted">Bei 1× entspricht eine echte Minute einem Spieltag. Eine Jahreszeit dauert 10 Spieltage (10 echte Minuten), ein Jahr 40 Spieltage. Oben wählst du Pause oder 1× bis 100×; bei 100× dauert ein Spieltag 0,6 Sekunden. Der Zeitraffer gilt nur im geöffneten Spiel. Nach Abwesenheit werden höchstens 60 Spieltage (eine echte Stunde bei 1×) nachberechnet. Wichtige Entscheidungen bleiben dir überlassen.</p>
      <h4>Anleitung</h4>
      <p class="muted">Ziehen verschiebt die Kamera, zwei Finger oder das Mausrad zoomen. Tippe auf Katzen und Gebäude. Wenn unten ein leuchtender Knopf erscheint, wartet ein Ereignis auf deine Entscheidung. Unter „Reich“ setzt du Prioritäten und Bauvorhaben, unter „Volk“ lernst du jede Katze kennen, die „Chronik“ erzählt eure Geschichte.</p>
      <p class="muted">Pfotenreich · Version ${P.VERSION} · ohne Werbung, ohne Käufe.</p>
      <h4>Gefahrenzone</h4><button id="mNew" class="danger">Neues Reich beginnen …</button>`);
    const save = () => { localStorage.setItem('pfotenreich_settings', JSON.stringify(st)); P.applySettings(); };
    b.querySelector('#sMusic').onchange = (e) => { st.music = e.target.checked; P.AU.unlock(); save(); };
    b.querySelector('#sSfx').onchange = (e) => { st.sfx = e.target.checked; save(); };
    b.querySelector('#sReduced').onchange = (e) => { st.reduced = e.target.checked; save(); };
    b.querySelector('#sLow').onchange = (e) => { st.low = e.target.checked; save(); };
    b.querySelector('#mSave').onclick = async () => { await P.save(S); UI.toastHint('Gespeichert.'); };
    b.querySelector('#mExport').onclick = () => {
      const blob = new Blob([P.exportJSON(S)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `pfotenreich-${S.realm.replace(/[^\wäöüÄÖÜß-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
    const doImport = async (txt) => {
      try {
        if (txt.length > 20e6) throw new Error('Datei ist zu groß');
        const ns = P.parseSave(txt);
        if (!(await UI.ask(`Spielstand „${ns.realm}“ (${P.STAGES[ns.stage].n}, ${P.alive(ns).length} Bewohner) laden? Der aktuelle Stand wird ersetzt – exportiere ihn vorher, falls du ihn behalten willst.`, 'Laden'))) return;
        P.loadState(ns, true);
      } catch (err) { UI.info('Import fehlgeschlagen: ' + err.message); }
    };
    b.querySelector('#mImport').onchange = async (e) => { const f = e.target.files[0]; if (f) doImport(await f.text()); };
    b.querySelector('#mCopy').onclick = async () => { try { await navigator.clipboard.writeText(P.exportJSON(S)); UI.toastHint('Spielstand in die Zwischenablage kopiert.'); } catch (e) { UI.info('Kopieren wurde vom Browser blockiert. Nutze „Als Datei exportieren“.'); } };
    b.querySelector('#mPasteBtn').onclick = () => { b.querySelector('#mPaste').classList.remove('hidden'); b.querySelector('#mPasteGo').classList.remove('hidden'); b.querySelector('#mPaste').focus(); };
    b.querySelector('#mPasteGo').onclick = () => doImport(b.querySelector('#mPaste').value.trim());
    b.querySelector('#mNew').onclick = async () => {
      if (!(await UI.ask('Wirklich ein neues Reich beginnen? Der aktuelle Spielstand wird gelöscht. Tipp: Vorher exportieren!', 'Weiter'))) return;
      if (!(await UI.ask('Ganz sicher? Das kann nicht rückgängig gemacht werden.', 'Ja, neu beginnen'))) return;
      await P.wipe(); location.reload();
    };
  };

  // Eigene Dialoge (alert/confirm sind in manchen Umgebungen blockiert)
  UI.ask = (text, okLabel, cancelLabel) => new Promise((res) => {
    const d = document.createElement('div'); d.className = 'dlg';
    d.innerHTML = `<div class="dlgbox"><p>${esc(text)}</p><div class="btns">${cancelLabel !== null ? `<button class="no">${esc(cancelLabel || 'Abbrechen')}</button>` : ''}<button class="yes primary">${esc(okLabel || 'OK')}</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('.yes').onclick = () => { d.remove(); res(true); };
    const no = d.querySelector('.no'); if (no) no.onclick = () => { d.remove(); res(false); };
  });
  UI.info = (text) => UI.ask(text, 'OK', null);
  UI.toastHint = (t) => { (S._toasts || (S._toasts = [])).push({ t, cats: [] }); };

  function debounce(f, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => f(...a), ms); }; }

  // ───────── Startbildschirm ─────────
  UI.showStart = function (onStart) {
    const el = $('#start'); el.classList.remove('hidden');
    let seed = (Math.random() * 1e9) | 0;
    let s = P.newGame(seed, 'Pfotenreich');
    const render = () => {
      UI.bind(s);
      el.querySelector('.founders').innerHTML = P.alive(s).map((c) => `<div class="fcard"><span class="rp"></span><b>${esc(c.name)}</b><small>${c.sex === 'w' ? 'Kätzin' : 'Kater'} · ${esc(c.traits.join(', '))}</small><small>Talent: ${esc(c.talent)}</small></div>`).join('');
      el.querySelectorAll('.fcard').forEach((fc, i) => fc.querySelector('.rp').appendChild(portraitCanvas(P.alive(s)[i], 74, 'neutral', { anim: true })));
    };
    render();
    el.querySelector('#reroll').onclick = () => { seed = (Math.random() * 1e9) | 0; s = P.newGame(seed, 'Pfotenreich'); render(); P.AU.play('tap'); };
    el.querySelector('#begin').onclick = () => {
      P.AU.unlock();
      const name = (el.querySelector('#realmName').value || 'Pfotenreich').trim().slice(0, 28) || 'Pfotenreich';
      s.realm = name;
      el.classList.add('hidden');
      onStart(s);
    };
  };
})();
