// Pfotenreich – dezente, prozedural erzeugte Musik und Geräusche (WebAudio, keine Dateien)
(function () {
  const P = self.P;
  const AU = (P.AU = { music: false, sfx: true, ctx: null, started: false });
  function ctx() {
    if (!AU.ctx) {
      const C = self.AudioContext || self.webkitAudioContext;
      if (!C) return null;
      AU.ctx = new C();
      AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.5; AU.master.connect(AU.ctx.destination);
      AU.mbus = AU.ctx.createGain(); AU.mbus.gain.value = 0.0;
      const delay = AU.ctx.createDelay(); delay.delayTime.value = 0.38;
      const fb = AU.ctx.createGain(); fb.gain.value = 0.35;
      const lp = AU.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      AU.mbus.connect(lp); lp.connect(AU.master); lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(AU.master);
      AU.sbus = AU.ctx.createGain(); AU.sbus.gain.value = 0.6; AU.sbus.connect(AU.master);
    }
    if (AU.ctx.state === 'suspended') AU.ctx.resume();
    return AU.ctx;
  }
  AU.unlock = () => { ctx(); if (!AU.started) { AU.started = true; loop(); } };
  function tone(bus, f, dur, type, vol, when) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  let mood = 0;
  function loop() {
    const c = AU.ctx;
    if (c && AU.music) {
      AU.mbus.gain.setTargetAtTime(0.16, c.currentTime, 1.5);
      const base = [220, 196, 174.6, 196][mood % 4];
      const n = SCALE[Math.floor(Math.random() * SCALE.length)];
      tone(AU.mbus, base * Math.pow(2, n / 12), 2.6, 'sine', 0.22);
      if (Math.random() < 0.35) tone(AU.mbus, base / 2 * Math.pow(2, SCALE[Math.floor(Math.random() * 4)] / 12), 4, 'triangle', 0.12);
      if (Math.random() < 0.05) mood++;
    } else if (c) AU.mbus.gain.setTargetAtTime(0, c.currentTime, 0.5);
    setTimeout(loop, 900 + Math.random() * 1400);
  }
  AU.play = function (k) {
    if (!AU.sfx || !ctx()) return;
    const b = AU.sbus;
    switch (k) {
      case 'tap': tone(b, 660, 0.12, 'sine', 0.12); break;
      case 'open': tone(b, 520, 0.2, 'sine', 0.1); tone(b, 780, 0.25, 'sine', 0.08, 0.06); break;
      case 'event': tone(b, 392, 0.4, 'triangle', 0.12); tone(b, 523, 0.5, 'triangle', 0.1, 0.12); break;
      case 'choose': tone(b, 440, 0.25, 'triangle', 0.12); tone(b, 660, 0.35, 'triangle', 0.1, 0.08); break;
      case 'build': tone(b, 180, 0.08, 'square', 0.06); tone(b, 160, 0.08, 'square', 0.05, 0.12); break;
      case 'purr': {
        const c = ctx(); const t = c.currentTime; const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = 48; lfo.frequency.value = 24; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain);
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
        g.gain.setValueAtTime(0.06, t); g.gain.linearRampToValueAtTime(0, t + 0.9);
        o.connect(f); f.connect(g); g.connect(b); o.start(t); lfo.start(t); o.stop(t + 1); lfo.stop(t + 1);
        break;
      }
      case 'stage': [0, 4, 7, 12].forEach((n, i) => tone(b, 392 * Math.pow(2, n / 12), 0.6, 'triangle', 0.1, i * 0.12)); break;
    }
  };
})();
