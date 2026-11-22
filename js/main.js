// Pfotenreich – Start, Spielschleife, Eingabe, Autosave, Offline-Rückkehr
(function () {
  const P = self.P, R = P.R, UI = P.UI;
  P.VERSION = '1.0.0';
  const $ = (q) => document.querySelector(q);
  let S = null;
  const cv = $('#world');
  const DEBUG = /[?&]debug=1/.test(location.search);
  let speed = 1;

  P.SETTINGS = Object.assign({ music: false, sfx: true, reduced: false, low: false }, JSON.parse(localStorage.getItem('pfotenreich_settings') || '{}'));
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem('pfotenreich_settings') === null) P.SETTINGS.reduced = true;
  P.applySettings = () => {
    P.AU.music = P.SETTINGS.music; P.AU.sfx = P.SETTINGS.sfx;
    R.reduced = P.SETTINGS.reduced; R.quality = P.SETTINGS.low ? 1 : 2;
    R.resize(cv);
  };

  P.loadState = function (s, fromImport) {
    S = s;
    UI.bind(s);
    R.agents.clear(); R.invalidate(); R.follow = null;
    if (!s.world) s.world = P.genWorld(s.seed);
    P.assignHomes(s);
    // Kamera auf das Zentrum
    R.cam.x = P.CX * P.TS + 16; R.cam.y = P.CY * P.TS; R.cam.z = s.stage >= 4 ? 1.1 : 1.8;
    if (fromImport) { s.lastReal = Date.now(); P.save(s); UI.closeSheet(); }
    UI.hud();
  };

  async function boot() {
    P.applySettings();
    window.addEventListener('resize', () => R.resize(cv));
    let raw = null;
    try { raw = await P.loadRaw(); } catch (e) { }
    if (raw) {
      try {
        const s = P.parseSave(raw);
        const away = Date.now() - s.lastReal;
        const rep = P.catchUp(s, Date.now());
        s._toasts = [];
        P.loadState(s);
        await P.save(s);
        if (away > 20 * 60 * 1000 && s.stage >= 1) UI.openReport(rep);
        else if (s.pending.length) UI.openEvent();
      } catch (e) {
        console.error(e);
        UI.info('Der Spielstand konnte nicht geladen werden (' + e.message + '). Falls du ihn exportiert hast, kannst du ihn unter Menü wieder importieren.');
        UI.showStart((s) => { P.loadState(s); P.save(s); UI.openEvent(); });
      }
    } else {
      UI.showStart((s) => { s.lastReal = Date.now(); P.loadState(s); P.save(s); UI.openEvent(); });
    }
    requestAnimationFrame(frame);
    setInterval(() => { if (S) { UI.hud(); UI.pumpToasts(); } }, 500);
    setInterval(() => { if (S) P.save(S); }, 20000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', () => { if (S) P.save(S); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
    if (DEBUG) setupDebug();
  }

  function onVis() {
    if (!S) return;
    if (document.hidden) { P.save(S); return; }
    const away = Date.now() - S.lastReal;
    if (away > 5000) {
      const rep = P.catchUp(S, Date.now());
      S._toasts = [];
      R.invalidate();
      P.save(S);
      if (away > 20 * 60 * 1000 && S.stage >= 1) UI.openReport(rep);
    }
  }

  // ───────── Spielschleife ─────────
  let last = performance.now(), acc = 0, frameSkip = 0, lastStage = -1, lastBuilt = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!S) return;
    if (P.SETTINGS.low && (frameSkip++ & 1)) return;
    // Simulation: 1 Sekunde Echtzeit = 1/900 Spielstunde
    acc += dt * speed;
    if (acc >= 1) {
      const n = Math.floor(acc); acc -= n;
      const h = n / P.HOUR_REAL_SEC;
      if (S.stage >= 1) P.step(S, h, false);
      S.lastReal = Date.now();
      if (S.stage !== lastStage) { if (lastStage >= 1 && S.stage > lastStage && !UI.modalOpen()) { UI.stageUp(); } lastStage = S.stage; }
      if (S.stats.built !== lastBuilt) { if (lastBuilt) P.AU.play('build'); lastBuilt = S.stats.built; }
    }
    R.draw(cv, S, dt, now / 1000);
    UI.tickAnims(now / 1000);
  }

  // ───────── Eingabe: Ziehen, Pinch, Mausrad, Tippen ─────────
  const ptrs = new Map();
  let downInfo = null, pinch0 = null;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, cx: R.cam.x, cy: R.cam.y };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.cam.z }; downInfo && (downInfo.moved = true); }
    P.AU.unlock();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch0.z * d) / pinch0.d);
    } else if (ptrs.size === 1 && downInfo) {
      const dx = e.clientX - downInfo.x, dy = e.clientY - downInfo.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) { downInfo.moved = true; R.follow = null; }
      if (downInfo.moved) { R.cam.x = downInfo.cx - dx / R.cam.z; R.cam.y = downInfo.cy - dy / R.cam.z; }
    }
  });
  const up = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = null;
    if (ptrs.size === 1) { const [p] = [...ptrs.values()]; downInfo = { x: p.x, y: p.y, t: performance.now(), moved: true, cx: R.cam.x, cy: R.cam.y }; return; }
    if (downInfo && !downInfo.moved && performance.now() - downInfo.t < 500) tap(e.clientX, e.clientY);
    downInfo = null;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, R.cam.z * Math.pow(1.0015, -e.deltaY)); }, { passive: false });
  function zoomAt(sx, sy, nz) {
    const r = cv.getBoundingClientRect();
    const [wx, wy] = R.screenToWorld(cv, sx - r.left, sy - r.top);
    R.cam.z = P.clamp(nz, 0.45, 4);
    const [wx2, wy2] = R.screenToWorld(cv, sx - r.left, sy - r.top);
    R.cam.x += wx - wx2; R.cam.y += wy - wy2;
  }
  function tap(sx, sy) {
    if (!S) return;
    const r = cv.getBoundingClientRect();
    const hit = R.pick(cv, S, sx - r.left, sy - r.top);
    if (!hit) { if (R.follow) { R.follow = null; } UI.closeSheet(); return; }
    P.AU.play('tap');
    if (hit.cat) { const ag = R.agents.get(hit.cat); if (ag) { ag.emo = 'love'; ag.emoT = 2; } UI.openCat(hit.cat); }
    else if (hit.b) UI.openBuilding(hit.b);
  }

  // Knöpfe
  $('#evBtn').onclick = () => UI.openEvent();
  $('#bVolk').onclick = () => UI.openVolk();
  $('#bChron').onclick = () => UI.openChronik();
  $('#bReich').onclick = () => UI.openReich();
  $('#bMenu').onclick = () => UI.openMenu();
  $('#hudTop').onclick = () => UI.openReich();
  $('#sheet .close').onclick = () => UI.closeSheet();
  $('#bHome').onclick = () => { R.follow = null; R.cam.x = P.CX * P.TS + 16; R.cam.y = P.CY * P.TS; };
  $('#bZoomIn').onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, R.cam.z * 1.35);
  $('#bZoomOut').onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, R.cam.z / 1.35);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { UI.closeSheet(); } });

  function setupDebug() {
    const d = document.createElement('div'); d.id = 'debug';
    d.innerHTML = `<b>Test</b> <button data-s="1">1×</button><button data-s="60">60×</button><button data-s="900">900×</button><button data-s="7200">7200×</button><button data-o="1">+1 Tag offline</button>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { speed = +b.dataset.s; });
    d.querySelector('[data-o]').onclick = () => { S.lastReal -= 6 * 3600 * 1000; onVis(); };
    P.DBG = { get S() { return S; }, setSpeed: (v) => (speed = v) };
  }

  boot();
})();
