// Pfotenreich – Hilfsfunktionen (deterministischer Zufall, Farben, Zeit)
(function () {
  const P = (self.P = self.P || {});

  // Deterministischer Zufall: Zustand liegt im Spielstand (s.rng) → Neuladen erzeugt keine anderen Ergebnisse
  P.r = function (s) {
    let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  P.ri = (s, a, b) => a + Math.floor(P.r(s) * (b - a + 1));
  P.rf = (s, a, b) => a + P.r(s) * (b - a);
  P.pick = (s, a) => a[Math.floor(P.r(s) * a.length)];
  P.chance = (s, p) => P.r(s) < p;
  P.shuffle = (s, a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(P.r(s) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  P.wpick = (s, items, wf) => {
    let tot = 0;
    const ws = items.map((i) => {
      const w = Math.max(0, wf(i));
      tot += w;
      return w;
    });
    if (tot <= 0) return null;
    let x = P.r(s) * tot;
    for (let i = 0; i < items.length; i++) {
      x -= ws[i];
      if (x <= 0) return items[i];
    }
    return items[items.length - 1];
  };
  P.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  P.lerp = (a, b, t) => a + (b - a) * t;

  // Hash / Rauschen für Weltgenerierung
  P.h2 = (x, y, seed) => {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  P.noise = (x, y, seed) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = P.h2(xi, yi, seed), b = P.h2(xi + 1, yi, seed), c = P.h2(xi, yi + 1, seed), d = P.h2(xi + 1, yi + 1, seed);
    return P.lerp(P.lerp(a, b, u), P.lerp(c, d, u), v);
  };
  P.fbm = (x, y, seed) => P.noise(x, y, seed) * 0.6 + P.noise(x * 2.1, y * 2.1, seed + 7) * 0.3 + P.noise(x * 4.3, y * 4.3, seed + 13) * 0.1;

  // Farben
  const mixCache = new Map();
  P.hexToRgb = (h) => {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  P.rgb = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(P.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  P.mix = (a, b, t) => {
    const k = a + b + t.toFixed(3);
    let v = mixCache.get(k);
    if (v) return v;
    const A = P.hexToRgb(a), B = P.hexToRgb(b);
    v = P.rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
    if (mixCache.size > 5000) mixCache.clear();
    mixCache.set(k, v);
    return v;
  };
  P.shade = (h, t) => (t >= 0 ? P.mix(h, '#ffffff', t) : P.mix(h, '#000000', -t));

  // Zeit: 1 Spielstunde = 15 echte Minuten → 1 Spieltag = 6 echte Stunden
  P.HOUR_REAL_SEC = 900;
  P.DAYS_PER_SEASON = 10;
  P.DAYS_PER_YEAR = 40;
  P.SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
  P.day = (s) => Math.floor(s.t / 24);
  P.hour = (s) => s.t % 24;
  P.season = (s) => Math.floor(P.day(s) / P.DAYS_PER_SEASON) % 4;
  P.year = (s) => Math.floor(P.day(s) / P.DAYS_PER_YEAR) + 1;
  P.dateStr = (s, d) => {
    d = d === undefined ? P.day(s) : d;
    return `Tag ${(d % P.DAYS_PER_SEASON) + 1}, ${P.SEASONS[Math.floor(d / P.DAYS_PER_SEASON) % 4]}, Jahr ${Math.floor(d / P.DAYS_PER_YEAR) + 1}`;
  };
  P.esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
})();
