// Pfotenreich – Prozedurales Grafiksystem: Katzen (Seitenansicht & Porträt), Ereignisszenen
(function () {
  const P = self.P;
  const A = (P.ART = {});
  const TAU = Math.PI * 2;

  function ell(g, x, y, rx, ry, rot) { g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  A.ell = ell;
  const furCol = (L) => P.FUR[L.fur][1];
  const patCol = (L) => (L.pc >= 0 ? P.FUR[L.pc][1] : P.shade(P.FUR[L.fur][1], P.FUR[L.fur][1] === '#2b2523' ? 0.25 : -0.38));
  const isDark = (hex) => { const [r, g, b] = P.hexToRgb(hex); return r * 0.3 + g * 0.59 + b * 0.11 < 90; };
  const JOB_ACC = { builder: 'helmet', fisher: 'straw', scholar: 'glasses', trader: 'satchel', gardener: 'leaf', inventor: 'goggles', explorer: 'bandana', carer: 'scarf', crafter: 'yarnpin' };
  function srand(seed, i) { return P.h2(seed, i, 7); }

  // Directional light and deterministic hair strokes, shared by world and portraits.
  function furSurface(g, L, x, y, rx, ry, dense) {
    const light = g.createLinearGradient(x-rx, y-ry, x+rx*.5, y+ry);
    light.addColorStop(0, 'rgba(255,245,218,.30)');
    light.addColorStop(.44, 'rgba(255,245,218,.025)');
    light.addColorStop(1, 'rgba(25,19,17,.35)');
    g.fillStyle=light; g.fillRect(x-rx*1.7,y-ry*1.8,rx*3.4,ry*3.6);
    const count=dense?160:34;
    g.lineWidth=dense?Math.max(.35,rx*.009):.22;
    for(let i=0;i<count;i++) {
      const u=srand(L.seed,i+301), v=srand(L.seed,i+601);
      const xx=x+(u-.5)*rx*2.8, yy=y+(v-.5)*ry*2.6;
      g.strokeStyle=i%3?'rgba(255,244,221,.19)':'rgba(24,18,15,.17)';
      g.beginPath();g.moveTo(xx,yy);
      g.quadraticCurveTo(xx+rx*.015, yy+ry*.035,xx+(u-.5)*rx*.07,yy+ry*(L.len===2?.14:.07));g.stroke();
    }
  }

  // Muster in eine bereits gesetzte Clipping-Region zeichnen
  function pattern(g, L, x0, y0, w, h, side) {
    const pc = patCol(L), sd = L.seed;
    if (L.pat === 1 || L.pat === 6) {
      g.strokeStyle = pc; g.lineWidth = L.pat === 6 ? 0.7 : 1.3; g.lineCap = 'round';
      const step = L.pat === 6 ? 1.6 : 2.6;
      g.beginPath();
      for (let x = x0; x < x0 + w; x += step) {
        const o = (srand(sd, x * 10 | 0) - 0.5) * 1.5;
        g.moveTo(x + o, y0); g.quadraticCurveTo(x + o + 1.5, y0 + h * 0.4, x + o, y0 + h * (side ? 0.62 : 0.5));
      }
      g.stroke();
    } else if (L.pat === 2) {
      g.fillStyle = pc;
      for (let i = 0; i < 9; i++) { g.beginPath(); ell(g, x0 + srand(sd, i) * w, y0 + srand(sd, i + 20) * h * 0.7, 1.2 + srand(sd, i + 40) * 1.2, 1 + srand(sd, i + 60), 0); g.fill(); }
    } else if (L.pat === 3) {
      g.fillStyle = pc;
      for (let i = 0; i < 6; i++) { g.beginPath(); ell(g, x0 + srand(sd, i) * w, y0 + srand(sd, i + 9) * h, 2.5 + srand(sd, i + 3) * 3.5, 2 + srand(sd, i + 5) * 3, srand(sd, i + 7) * 3); g.fill(); }
    }
  }

  // ───────── Katze in der Welt (Seitenansicht, Blick nach rechts) ─────────
  A.drawCat = function (g, c, x, y, sc, face, pose, t, o) {
    o = o || {};
    const L = c.look, fur = furCol(L), dark = P.shade(fur, -0.35);
    const ks = o.kid === 0 ? 0.55 : o.kid === 1 ? 0.78 : 1;
    const S = sc * L.size * ks;
    g.save();
    g.translate(x, y);
    // Schatten
    g.fillStyle = 'rgba(30,25,20,0.22)';
    g.beginPath(); ell(g, 0, 0.5, 9 * S, 2.6 * S, 0); g.fill();
    g.scale(face * S, S);
    const bw = [8.2, 9.3, 10.6][L.body], bh = [4.4, 5.2, 6.2][L.body];
    const tt = t + (L.seed % 100) * 0.13;
    // LOD: sehr klein → vereinfachte Silhouette
    if (S < 0.42) {
      g.fillStyle = fur;
      g.beginPath(); ell(g, 0, -6, bw, bh, 0); ell(g, bw, -10, 4.5, 4.5, 0); g.fill();
      g.strokeStyle = fur; g.lineWidth = 3; g.beginPath(); g.moveTo(-bw, -7); g.lineTo(-bw - 5, -15); g.stroke();
      if (L.pat === 3 || L.pat === 4 || L.pat === 5) { g.fillStyle = L.pat === 4 ? '#f2eee6' : patCol(L); g.beginPath(); ell(g, -2, -5, 4, 3, 0); g.fill(); }
      g.restore();
      return;
    }
    const pz = {};
    const sway = Math.sin(tt * 2.2) * 2;
    const walkT = tt * 7.4;
    let tail, legs = [], body, head, extra = null, eyesClosed = false, headTilt = 0;
    switch (pose) {
      case 'sleep': {
        const br = 1 + Math.sin(tt * 1.6) * 0.035;
        body = { x: 0, y: -4 * br, rx: bw + 1, ry: 4.4 * br };
        head = { x: bw - 1.5, y: -4.2, r: 4 };
        tail = [[-bw, -2.5], [-bw - 3, 2.5], [bw - 3, 1.4]];
        eyesClosed = true;
        break;
      }
      case 'sit': case 'groom': case 'fish': case 'read': {
        body = { x: -1, y: -7, rx: 6, ry: 7.4, rot: -0.28 };
        head = { x: 2.6, y: -16, r: 4.4 };
        legs = [[2.2, -6, 2.6, 0], [4.4, -6, 4.8, 0]];
        tail = [[-5.5, -1.5], [-11, 1.5 + sway * 0.2], [-13 + sway, -4]];
        pz.haunch = 1;
        if (pose === 'groom') { headTilt = 0.35; extra = 'groom'; eyesClosed = Math.sin(tt * 3) > 0; }
        if (pose === 'fish') extra = 'rod';
        if (pose === 'read') extra = 'book';
        break;
      }
      case 'stretch': {
        body = { x: 0, y: -6, rx: bw + 2, ry: bh - 0.6, rot: 0.24 };
        head = { x: bw + 2.5, y: -5, r: 4.3 };
        legs = [[bw * 0.7, -3, bw + 6, 0], [bw * 0.5, -3, bw + 4, 0], [-bw * 0.7, -9, -bw * 0.75, 0], [-bw * 0.45, -9, -bw * 0.4, 0]];
        tail = [[-bw, -10], [-bw - 4, -18], [-bw + 1, -22]];
        eyesClosed = true;
        break;
      }
      case 'play': {
        body = { x: 0, y: -5, rx: bw, ry: bh - 1 };
        head = { x: bw + 1, y: -7.5, r: 4.4 };
        legs = [[bw * 0.55, -3, bw * 0.7 + 1, 0], [bw * 0.75, -3, bw + 1.5, 0], [-bw * 0.6, -3, -bw * 0.65, 0], [-bw * 0.35, -3, -bw * 0.35, 0]];
        tail = [[-bw, -6], [-bw - 6, -10 + Math.sin(tt * 9) * 4], [-bw - 9, -6 + Math.sin(tt * 9 + 1) * 5]];
        extra = 'yarn';
        break;
      }
      default: { // walk, carry, build, stand
        const moving = pose === 'walk' || pose === 'carry';
        body = { x: 0, y: -7.5, rx: bw, ry: bh };
        head = { x: bw + 1, y: -11.5, r: 4.5 };
        const sw = (ph) => (moving ? Math.sin(walkT + ph) * 2.2 : 0);
        const lift = (ph) => (moving ? Math.max(0, Math.cos(walkT + ph)) * 1.2 : 0);
        legs = [[-bw * 0.62, -5, -bw * 0.62 + sw(0), -lift(0)], [-bw * 0.32, -5, -bw * 0.32 + sw(Math.PI), -lift(Math.PI)], [bw * 0.45, -5, bw * 0.45 + sw(Math.PI), -lift(Math.PI)], [bw * 0.72, -5, bw * 0.72 + sw(0), -lift(0)]];
        tail = [[-bw, -8.5], [-bw - 6, -13 + sway], [-bw - 4 + sway, -19]];
        if (pose === 'carry') extra = 'fish';
        if (pose === 'build') extra = 'hammer';
        if (moving) { body.y -= (1-Math.cos(walkT*2))*.16; head.y += Math.sin(walkT*2+.6)*.18; }
        else { body.ry *= 1+Math.sin(tt*1.8)*.018; head.y+=Math.sin(tt*.8)*.12; }
      }
    }
    if (L.tail === 2) tail = [tail[0], [(tail[0][0] + tail[1][0]) / 2, (tail[0][1] + tail[1][1]) / 2], [tail[0][0] - 3, tail[0][1] - 3]];
    const tailW = L.tail === 1 ? 4.4 : L.len === 2 ? 3.8 : 2.6;
    const pc = patCol(L);
    const white = '#f3efe8';
    const legCol = L.pat === 5 ? pc : fur;
    // Schwanz
    g.lineCap = 'round';
    g.strokeStyle = L.pat === 5 ? pc : fur; g.lineWidth = tailW;
    g.beginPath(); g.moveTo(tail[0][0], tail[0][1]); g.quadraticCurveTo(tail[1][0], tail[1][1], tail[2][0], tail[2][1]); g.stroke();
    if (L.tail === 3) { g.beginPath(); g.arc(tail[2][0] + 1.6, tail[2][1], 1.6, Math.PI, TAU * 0.9); g.stroke(); }
    if (L.pat === 1 || L.pat === 6) { g.strokeStyle = pc; g.lineWidth = tailW * 0.9; g.setLineDash([1.2, 2.2]); g.beginPath(); g.moveTo(tail[0][0], tail[0][1]); g.quadraticCurveTo(tail[1][0], tail[1][1], tail[2][0], tail[2][1]); g.stroke(); g.setLineDash([]); }
    if (L.pat === 4 && L.tail !== 2) { g.strokeStyle = white; g.lineWidth = tailW * 0.8; g.beginPath(); g.moveTo(tail[2][0], tail[2][1]); g.lineTo(tail[2][0] + (tail[1][0] - tail[2][0]) * 0.25, tail[2][1] + (tail[1][1] - tail[2][1]) * 0.25); g.stroke(); }
    // hintere Beine
    const legW = L.body === 2 ? 2.6 : 2.2;
    g.lineWidth = legW;
    const drawLeg = (l, back) => {
      g.strokeStyle = back ? P.shade(legCol, -0.15) : legCol;
      g.beginPath(); g.moveTo(l[0], l[1]); g.quadraticCurveTo((l[0]+l[2])*.5-0.65, (l[1]+l[3])*.5, l[2], l[3] - 0.6); g.stroke();
      g.fillStyle = L.pat === 4 ? white : back ? P.shade(legCol, -0.15) : legCol;
      g.beginPath(); ell(g, l[2] + 0.5, l[3] - 0.5, 1.5, 1, 0); g.fill();
    };
    if (legs.length === 4) { drawLeg(legs[0], 1); drawLeg(legs[2], 1); }
    // Körper + Kopf
    const shape = () => {
      g.beginPath();
      ell(g, body.x, body.y, body.rx, body.ry, body.rot || 0);
      if (pz.haunch) ell(g, -2.2, -3.6, 5, 3.6, 0);
      g.moveTo(head.x + head.r, head.y);
      ell(g, head.x, head.y, head.r * 1.05, head.r, headTilt);
    };
    if (L.len >= 1) { // Fell-Flaum
      g.fillStyle = P.shade(fur, 0.06);
      g.beginPath(); ell(g, body.x, body.y, body.rx + (L.len === 2 ? 1.6 : 0.8), body.ry + (L.len === 2 ? 1.3 : 0.6), body.rot || 0); g.fill();
      if (L.len === 2) { g.beginPath(); ell(g, head.x - 1.5, head.y + 2.5, head.r * 0.9, head.r * 0.75, 0); g.fill(); }
    }
    g.fillStyle = fur; shape(); g.fill();
    g.save(); shape(); g.clip();
    pattern(g, L, body.x - body.rx - 2, body.y - body.ry - 8, body.rx * 2 + 12, body.ry * 2 + 10, 1);
    if (L.pat === 4) { g.fillStyle = white; g.beginPath(); ell(g, body.x + 2, body.y + body.ry * 0.7, body.rx * 0.8, body.ry * 0.6, 0); ell(g, head.x + 1.5, head.y + head.r * 0.6, head.r * 0.75, head.r * 0.55, 0); g.fill(); }
    if (L.pat === 5) { g.fillStyle = pc; g.globalAlpha = 0.85; g.beginPath(); ell(g, head.x + 1.5, head.y + 0.5, head.r * 0.8, head.r * 0.8, 0); g.fill(); g.globalAlpha = 1; }
    furSurface(g,L,body.x,body.y,body.rx+8,body.ry+7,false);
    g.restore();
    g.strokeStyle = 'rgba(30,20,15,0.28)'; g.lineWidth = 0.5; shape(); g.stroke();
    if (legs.length) { drawLeg(legs[legs.length === 4 ? 1 : 0], 0); drawLeg(legs[legs.length === 4 ? 3 : 1], 0); }
    // Ohren
    const hx = head.x, hy = head.y, r = head.r;
    const ear = (ex, ey, s2) => {
      g.fillStyle = L.pat === 5 ? pc : fur;
      g.beginPath();
      if (L.ear === 2) { ell(g, ex + 1, ey + 1.5, 2 * s2, 1.4 * s2, 0.6); }
      else if (L.ear === 1) { g.moveTo(ex - 2.2 * s2, ey + 1.5); g.quadraticCurveTo(ex, ey - 4 * s2, ex + 2.2 * s2, ey + 1.5); }
      else { g.moveTo(ex - 2.2 * s2, ey + 1.5); g.lineTo(ex + 0.3, ey - 3.8 * s2); g.lineTo(ex + 2.3 * s2, ey + 1.5); }
      g.fill();
      if (L.ear !== 2) { g.fillStyle = '#e9a7a2'; g.beginPath(); g.moveTo(ex - 1 * s2, ey + 1.2); g.lineTo(ex + 0.3, ey - 2.2 * s2); g.lineTo(ex + 1.2 * s2, ey + 1.2); g.fill(); }
      if (L.ear === 3) { g.strokeStyle = dark; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ex + 0.3, ey - 3.8 * s2); g.lineTo(ex + 0.6, ey - 5.5 * s2); g.stroke(); }
    };
    ear(hx - r * 0.45, hy - r * 0.62, 0.9);
    ear(hx + r * 0.25, hy - r * 0.72, 1);
    // Gesicht
    if (S > 0.65) {
      const ex = hx + r * 0.45, ey = hy - r * 0.12;
      const blink = Math.sin(tt * 0.9) > 0.985;
      if (eyesClosed || blink) { g.strokeStyle = '#2a1d16'; g.lineWidth = 0.6; g.beginPath(); g.arc(ex, ey, 1, 0.2, Math.PI - 0.2); g.stroke(); }
      else {
        g.fillStyle = P.EYES[L.eye][1]; g.beginPath(); ell(g, ex, ey, 1.25, 1.4, 0); g.fill();
        g.fillStyle = '#1b1411'; g.beginPath(); ell(g, ex + 0.3, ey, 0.45, 1.1, 0); g.fill();
        g.fillStyle = '#fff'; g.fillRect(ex - 0.4, ey - 0.8, 0.45, 0.45);
      }
      g.fillStyle = isDark(fur) && L.pat !== 4 ? '#5a3a3a' : '#e48c8c';
      g.beginPath(); g.moveTo(hx + r * 1.02, hy + r * 0.12); g.lineTo(hx + r * 0.8, hy + r * 0.05); g.lineTo(hx + r * 0.85, hy + r * 0.3); g.fill();
      if (S > 1.1) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.25; g.beginPath(); g.moveTo(hx + r * 0.8, hy + r * 0.35); g.lineTo(hx + r * 1.7, hy + r * 0.2); g.moveTo(hx + r * 0.8, hy + r * 0.45); g.lineTo(hx + r * 1.7, hy + r * 0.6); g.stroke(); }
    }
    // Ausstattung
    const acc = o.job && JOB_ACC[o.job];
    if (acc && S > 0.55) jobAcc(g, acc, hx, hy, r, body);
    if (L.acc && S > 0.55) persAcc(g, L, hx, hy, r);
    // Extras
    if (extra === 'rod') {
      g.strokeStyle = '#7a5a36'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4, -8); g.lineTo(16, -22); g.stroke();
      g.strokeStyle = 'rgba(240,240,240,0.7)'; g.lineWidth = 0.3; const bob = Math.sin(tt * 2) * 0.8; g.beginPath(); g.moveTo(16, -22); g.lineTo(20, 4 + bob); g.stroke();
      g.fillStyle = '#d33'; g.beginPath(); g.arc(20, 4 + bob, 0.9, 0, TAU); g.fill();
    } else if (extra === 'yarn') {
      const by = -2.5 - Math.abs(Math.sin(tt * 5)) * 4;
      g.fillStyle = P.ACC_COL[L.seed % 6]; g.beginPath(); g.arc(bw + 8, by, 2.4, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.4; g.beginPath(); g.arc(bw + 8, by, 1.5, 0.3, 2.5); g.stroke();
    } else if (extra === 'fish') {
      g.fillStyle = '#9fb5c4'; g.beginPath(); ell(g, hx + r + 1.5, hy + r * 0.6, 3, 1.1, 0.3); g.fill();
      g.beginPath(); g.moveTo(hx + r + 4, hy + r * 1.2); g.lineTo(hx + r + 6, hy + r * 0.4); g.lineTo(hx + r + 6, hy + r * 1.8); g.fill();
    } else if (extra === 'hammer') {
      const a = Math.sin(tt * 9) * 0.6 - 0.4;
      g.save(); g.translate(bw * 0.7, -7); g.rotate(a);
      g.strokeStyle = '#7a5a36'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, 0); g.lineTo(6, -3); g.stroke();
      g.fillStyle = '#8b8f96'; g.fillRect(5, -5.2, 2, 4.2);
      g.restore();
    } else if (extra === 'groom') {
      g.strokeStyle = legCol; g.lineWidth = 2; g.beginPath(); g.moveTo(3.5, -7); g.lineTo(hx + 1.5, hy + 2.5 + Math.sin(tt * 6)); g.stroke();
    } else if (extra === 'book') {
      g.fillStyle = '#8a5a3a'; g.fillRect(4, -9, 5, 3.5); g.fillStyle = '#f2e6c9'; g.fillRect(4.5, -8.6, 4, 2.7);
    }
    g.restore();
  };

  function jobAcc(g, a, hx, hy, r, body) {
    switch (a) {
      case 'helmet': g.fillStyle = '#e8b730'; g.beginPath(); g.arc(hx, hy - r * 0.55, r * 0.75, Math.PI, 0); g.fill(); g.fillRect(hx - r * 0.9, hy - r * 0.6, r * 1.8, 0.8); break;
      case 'straw': g.fillStyle = '#dcc07a'; g.beginPath(); ell(g, hx, hy - r * 0.75, r * 1.2, r * 0.3, 0); g.fill(); g.beginPath(); ell(g, hx, hy - r * 1.05, r * 0.55, r * 0.45, 0); g.fill(); g.fillStyle = '#b8483c'; g.fillRect(hx - r * 0.55, hy - r * 0.95, r * 1.1, 0.6); break;
      case 'glasses': g.strokeStyle = '#3a2a20'; g.lineWidth = 0.4; g.beginPath(); g.arc(hx + r * 0.45, hy - r * 0.12, 1.5, 0, TAU); g.stroke(); break;
      case 'goggles': g.fillStyle = '#b07a3a'; g.fillRect(hx - r, hy - r * 0.62, r * 2, 1); g.fillStyle = '#9fd3e6'; g.beginPath(); g.arc(hx + r * 0.2, hy - r * 0.55, 1.3, 0, TAU); g.fill(); break;
      case 'bandana': g.fillStyle = '#c8483c'; g.beginPath(); g.moveTo(hx - r * 0.3, hy + r * 0.7); g.lineTo(hx + r * 0.6, hy + r * 0.8); g.lineTo(hx - r * 0.1, hy + r * 1.5); g.fill(); break;
      case 'scarf': g.fillStyle = '#e07aa5'; g.beginPath(); ell(g, hx - r * 0.4, hy + r * 0.9, r * 0.75, r * 0.35, 0.3); g.fill(); break;
      case 'leaf': g.fillStyle = '#5aa557'; g.beginPath(); ell(g, hx - r * 0.2, hy - r * 0.95, r * 0.5, r * 0.22, -0.4); g.fill(); break;
      case 'satchel': g.fillStyle = '#8a5a3a'; g.fillRect(body.x - 2, body.y - 1, 4.5, 3.5); g.strokeStyle = '#5a3a22'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(body.x - 2, body.y - 1); g.lineTo(hx - r * 0.5, hy + r * 0.7); g.stroke(); break;
      case 'yarnpin': g.fillStyle = '#9a5bc0'; g.beginPath(); g.arc(hx - r * 0.6, hy - r * 0.6, 1.1, 0, TAU); g.fill(); break;
    }
  }
  function persAcc(g, L, hx, hy, r) {
    const col = P.ACC_COL[L.accC];
    switch (L.acc) {
      case 1: g.fillStyle = col; g.beginPath(); g.moveTo(hx - r * 0.6, hy + r * 0.6); g.lineTo(hx + r * 0.5, hy + r * 0.85); g.lineTo(hx - r * 0.2, hy + r * 1.6); g.fill(); break;
      case 2: for (let i = 0; i < 3; i++) { g.fillStyle = ['#f2d14b', '#f28bb0', '#fff'][i]; g.beginPath(); g.arc(hx - r * 0.5 + i * r * 0.45, hy - r * 0.85, 0.9, 0, TAU); g.fill(); } break;
      case 3: g.strokeStyle = col; g.lineWidth = 0.8; g.beginPath(); g.arc(hx - r * 0.2, hy + r * 0.5, r * 0.75, 0.6, 2.6); g.stroke(); g.fillStyle = '#e8c53a'; g.beginPath(); g.arc(hx - r * 0.1, hy + r * 1.25, 0.7, 0, TAU); g.fill(); break;
      case 4: g.fillStyle = '#e8c53a'; g.beginPath(); g.arc(hx + r * 0.1, hy - r * 0.5, 0.5, 0, TAU); g.fill(); break;
      case 5: g.fillStyle = col; g.beginPath(); g.moveTo(hx - r * 0.7, hy - r * 0.7); g.lineTo(hx - r * 1.3, hy - r * 1.1); g.lineTo(hx - r * 1.3, hy - r * 0.3); g.closePath(); g.moveTo(hx - r * 0.7, hy - r * 0.7); g.lineTo(hx - r * 0.1, hy - r * 1.2); g.lineTo(hx - r * 0.1, hy - r * 0.3); g.fill(); break;
    }
  }

  // ───────── Porträt (Frontansicht) mit Gesichtsausdruck ─────────
  A.portrait = function (g, c, cx, cy, R, expr, t, o) {
    o = o || {};
    const L = c.look, fur = furCol(L), pc = patCol(L), white = '#f3efe8';
    const kid = o.kid !== undefined ? o.kid : 2;
    const elder = kid === 3;
    const tt = (t || 0) + (L.seed % 50) * 0.1;
    expr = expr || 'neutral';
    g.save();
    g.translate(cx, cy);
    const wide = [0.92, 1.0, 1.13][L.body];
    const bob = Math.sin(tt * 1.5) * R * 0.015;
    g.translate(0, bob + (expr === 'proud' ? -R * 0.05 : 0));
    // Schultern / Brust
    g.fillStyle = L.len === 2 ? P.shade(fur, 0.05) : fur;
    g.beginPath(); ell(g, 0, R * 1.45, R * 1.15 * wide, R * 0.95, 0); g.fill();
    if (L.pat === 4) { g.fillStyle = white; g.beginPath(); ell(g, 0, R * 1.4, R * 0.55, R * 0.75, 0); g.fill(); }
    if (L.len === 2) { g.fillStyle = P.shade(fur, 0.12); g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(i * R * 0.2 - R * 0.1, R * 0.75); g.lineTo(i * R * 0.2, R * 1.15); g.lineTo(i * R * 0.2 + R * 0.1, R * 0.75); } g.fill(); }
    // Ohren
    const earBack = expr === 'angry' ? 0.45 : expr === 'scared' ? 0.9 : expr === 'sad' ? 0.3 : 0;
    const es = kid <= 1 ? 0.8 : 1;
    for (const sd of [-1, 1]) {
      g.save(); g.translate(sd * R * 0.62 * wide, -R * 0.55); g.rotate(sd * (0.25 + earBack));
      g.fillStyle = L.pat === 5 ? pc : fur;
      g.beginPath();
      if (L.ear === 2) { g.moveTo(-R * 0.3, 0); g.quadraticCurveTo(0, -R * 0.4 * es, R * 0.35, R * 0.05); g.quadraticCurveTo(0, -R * 0.05, -R * 0.3, 0); }
      else if (L.ear === 1) { g.moveTo(-R * 0.32, R * 0.1); g.quadraticCurveTo(0, -R * 0.85 * es, R * 0.32, R * 0.1); }
      else { g.moveTo(-R * 0.32, R * 0.12); g.lineTo(0, -R * 0.72 * es); g.lineTo(R * 0.32, R * 0.12); }
      g.fill();
      if (L.ear !== 2) { g.fillStyle = '#e8a5a0'; g.beginPath(); g.moveTo(-R * 0.17, R * 0.05); g.lineTo(0, -R * 0.45 * es); g.lineTo(R * 0.17, R * 0.05); g.fill(); }
      if (L.ear === 3) { g.strokeStyle = P.shade(fur, -0.4); g.lineWidth = R * 0.04; g.beginPath(); g.moveTo(0, -R * 0.7); g.lineTo(sd * R * 0.05, -R * 0.98); g.stroke(); }
      g.restore();
    }
    // Kopf
    const head = () => { g.beginPath(); ell(g, 0, 0, R * 1.02 * wide, R * 0.9, 0); if (L.body === 2 || L.len === 2) { ell(g, -R * 0.62 * wide, R * 0.25, R * 0.42, R * 0.38, 0); ell(g, R * 0.62 * wide, R * 0.25, R * 0.42, R * 0.38, 0); } };
    g.fillStyle = fur; head(); g.fill();
    g.save(); head(); g.clip();
    const sd = L.seed;
    if (L.pat === 1 || L.pat === 6) {
      g.strokeStyle = pc; g.lineCap = 'round'; g.lineWidth = R * (L.pat === 6 ? 0.04 : 0.07);
      g.beginPath(); // „M“ auf der Stirn
      g.moveTo(-R * 0.35, -R * 0.35); g.lineTo(-R * 0.2, -R * 0.75); g.lineTo(0, -R * 0.45); g.lineTo(R * 0.2, -R * 0.75); g.lineTo(R * 0.35, -R * 0.35);
      for (const s2 of [-1, 1]) for (let i = 0; i < 3; i++) { g.moveTo(s2 * R * 0.95, R * (0.0 + i * 0.18)); g.lineTo(s2 * R * 0.55, R * (0.05 + i * 0.15)); }
      g.moveTo(0, -R * 0.9); g.lineTo(0, -R * 0.55);
      g.stroke();
    } else if (L.pat === 2) {
      g.fillStyle = pc;
      for (let i = 0; i < 8; i++) { g.beginPath(); ell(g, (srand(sd, i) - 0.5) * R * 1.8, (srand(sd, i + 9) - 0.6) * R * 1.2, R * 0.09, R * 0.08, 0); g.fill(); }
    } else if (L.pat === 3) {
      g.fillStyle = pc;
      for (let i = 0; i < 5; i++) { g.beginPath(); ell(g, (srand(sd, i) - 0.5) * R * 2, (srand(sd, i + 4) - 0.5) * R * 1.6, R * (0.25 + srand(sd, i + 2) * 0.3), R * (0.2 + srand(sd, i + 6) * 0.25), srand(sd, i) * 3); g.fill(); }
    } else if (L.pat === 4) {
      g.fillStyle = white; g.beginPath(); g.moveTo(-R * 0.08, -R * 0.9); g.lineTo(R * 0.08, -R * 0.9); g.lineTo(R * 0.55, R * 0.9); g.lineTo(-R * 0.55, R * 0.9); g.fill();
    } else if (L.pat === 5) {
      const gr = g.createRadialGradient(0, R * 0.15, R * 0.1, 0, R * 0.15, R * 0.85);
      gr.addColorStop(0, pc); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-R * 1.5, -R, R * 3, R * 2);
    }
    furSurface(g,L,0,0,R*wide,R,true);
    g.restore();
    // Schnauze
    g.fillStyle = L.pat === 5 ? P.shade(pc, 0.1) : P.shade(fur, 0.18);
    g.beginPath(); ell(g, -R * 0.17, R * 0.38, R * 0.22, R * 0.17, 0); ell(g, R * 0.17, R * 0.38, R * 0.22, R * 0.17, 0); g.fill();
    if (elder) { g.strokeStyle = 'rgba(240,240,240,0.55)'; g.lineWidth = R * 0.02; g.beginPath(); for (let i = 0; i < 6; i++) { const x = (srand(sd, i + 30) - 0.5) * R * 0.6; g.moveTo(x, R * 0.3); g.lineTo(x + R * 0.04, R * 0.5); } g.stroke(); }
    // Augen
    const eyeR = R * (kid <= 1 ? 0.27 : 0.205);
    const blink = Math.sin(tt * 0.8) > 0.985;
    for (const s2 of [-1, 1]) {
      const ex = s2 * R * 0.38, ey = -R * 0.08;
      const col = P.EYES[s2 > 0 && L.eye2 >= 0 ? L.eye2 : L.eye][1];
      g.save(); g.translate(ex, ey);
      if (expr === 'joy' || blink) {
        g.strokeStyle = '#2a1d16'; g.lineWidth = R * 0.06; g.lineCap = 'round';
        g.beginPath(); g.arc(0, eyeR * 0.3, eyeR * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      } else {
        const open = expr === 'proud' || expr === 'comfort' ? 0.55 : expr === 'surprise' || expr === 'scared' ? 1.25 : expr === 'angry' ? 0.75 : 1;
        g.fillStyle = '#fff'; g.beginPath(); ell(g, 0, 0, eyeR * 1.05, eyeR * open, 0); g.fill();
        g.fillStyle = col; g.beginPath(); ell(g, 0, 0, eyeR * 0.95, eyeR * 0.95 * Math.min(1, open), 0); g.fill();
        const pw = expr === 'scared' ? 0.12 : expr === 'surprise' ? 0.55 : expr === 'angry' ? 0.12 : kid <= 1 ? 0.55 : 0.28;
        g.fillStyle = '#16100d'; g.beginPath(); ell(g, 0, 0, eyeR * pw, eyeR * 0.85 * Math.min(1, open), 0); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-eyeR * 0.3, -eyeR * 0.35 * open, eyeR * 0.22, 0, TAU); g.fill();
        if (open < 1) { g.fillStyle = fur; g.fillRect(-eyeR * 1.2, -eyeR * 1.4, eyeR * 2.4, eyeR * (1.4 - open * 0.95)); }
        g.strokeStyle = 'rgba(20,12,10,0.6)'; g.lineWidth = R * 0.025; g.beginPath(); ell(g, 0, 0, eyeR * 1.05, eyeR * open, 0); g.stroke();
      }
      g.restore();
      if (expr === 'angry' || expr === 'sad') {
        g.strokeStyle = P.shade(fur, -0.45); g.lineWidth = R * 0.05; g.lineCap = 'round';
        g.beginPath(); const tilt = expr === 'angry' ? 1 : -1;
        g.moveTo(ex - s2 * eyeR * 0.9, ey - eyeR * (1.3 + 0.3 * tilt)); g.lineTo(ex + s2 * eyeR * 0.9, ey - eyeR * (1.3 - 0.3 * tilt)); g.stroke();
      }
    }
    // Nase & Mund
    g.fillStyle = isDark(fur) && L.pat !== 4 ? '#4a2e2e' : '#e3898c';
    g.beginPath(); g.moveTo(-R * 0.1, R * 0.2); g.lineTo(R * 0.1, R * 0.2); g.lineTo(0, R * 0.32); g.fill();
    g.strokeStyle = '#3a2620'; g.lineWidth = R * 0.03; g.lineCap = 'round';
    g.beginPath();
    if (expr === 'surprise' || expr === 'scared') { g.moveTo(0, R * 0.32); g.lineTo(0, R * 0.42); g.stroke(); g.fillStyle = '#7a3a3a'; g.beginPath(); ell(g, 0, R * 0.52, R * 0.08, R * 0.1, 0); g.fill(); }
    else if (expr === 'sad' || expr === 'angry') { g.moveTo(0, R * 0.32); g.lineTo(0, R * 0.4); g.moveTo(-R * 0.16, R * 0.5); g.quadraticCurveTo(0, R * 0.38, R * 0.16, R * 0.5); g.stroke(); if (expr === 'angry') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(R * 0.08, R * 0.45); g.lineTo(R * 0.12, R * 0.56); g.lineTo(R * 0.15, R * 0.45); g.fill(); } }
    else { g.moveTo(0, R * 0.32); g.lineTo(0, R * 0.38); g.moveTo(-R * 0.17, R * 0.38); g.quadraticCurveTo(-R * 0.08, R * (expr === 'joy' || expr === 'proud' ? 0.5 : 0.45), 0, R * 0.38); g.quadraticCurveTo(R * 0.08, R * (expr === 'joy' || expr === 'proud' ? 0.5 : 0.45), R * 0.17, R * 0.38); g.stroke(); }
    // Schnurrhaare
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = R * 0.015;
    g.beginPath();
    for (const s2 of [-1, 1]) for (let i = 0; i < 3; i++) { g.moveTo(s2 * R * 0.3, R * (0.33 + i * 0.06)); g.lineTo(s2 * R * 1.15, R * (0.2 + i * 0.13)); }
    g.stroke();
    if (expr === 'comfort' || expr === 'joy') { g.fillStyle = 'rgba(240,120,130,0.35)'; g.beginPath(); ell(g, -R * 0.55, R * 0.25, R * 0.14, R * 0.08, 0); ell(g, R * 0.55, R * 0.25, R * 0.14, R * 0.08, 0); g.fill(); }
    if (expr === 'scared') { g.fillStyle = '#9fd3f0'; g.beginPath(); g.moveTo(R * 0.85, -R * 0.5); g.quadraticCurveTo(R * 0.95, -R * 0.25, R * 0.85, -R * 0.2); g.quadraticCurveTo(R * 0.75, -R * 0.25, R * 0.85, -R * 0.5); g.fill(); }
    if (expr === 'sad') { g.fillStyle = '#9fd3f0'; g.beginPath(); ell(g, -R * 0.4, R * 0.15 + (tt % 2) * R * 0.1, R * 0.05, R * 0.08, 0); g.fill(); }
    // Accessoires (Beruf + persönlich)
    const job = o.job;
    if (job === 'scholar' || elder && c.job === 'scholar') { g.strokeStyle = '#3a2a20'; g.lineWidth = R * 0.04; g.beginPath(); g.arc(-R * 0.38, -R * 0.08, eyeR * 1.35, 0, TAU); g.moveTo(R * 0.38 + eyeR * 1.35, -R * 0.08); g.arc(R * 0.38, -R * 0.08, eyeR * 1.35, 0, TAU); g.moveTo(-R * 0.38 + eyeR * 1.35, -R * 0.1); g.lineTo(R * 0.38 - eyeR * 1.35, -R * 0.1); g.stroke(); }
    if (job === 'builder') { g.fillStyle = '#e8b730'; g.beginPath(); g.arc(0, -R * 0.62, R * 0.75, Math.PI, 0); g.fill(); g.fillRect(-R * 0.95, -R * 0.66, R * 1.9, R * 0.1); }
    if (job === 'fisher') { g.fillStyle = '#dcc07a'; g.beginPath(); ell(g, 0, -R * 0.72, R * 1.3, R * 0.2, 0); g.fill(); g.beginPath(); ell(g, 0, -R * 0.95, R * 0.6, R * 0.35, 0); g.fill(); g.fillStyle = '#b8483c'; g.fillRect(-R * 0.6, -R * 0.88, R * 1.2, R * 0.08); }
    if (job === 'inventor') { g.fillStyle = '#9b6a32'; g.fillRect(-R * 1.0, -R * 0.62, R * 2, R * 0.12); for (const s2 of [-1, 1]) { g.fillStyle = '#7a5226'; g.beginPath(); g.arc(s2 * R * 0.35, -R * 0.56, R * 0.2, 0, TAU); g.fill(); g.fillStyle = '#a9dcef'; g.beginPath(); g.arc(s2 * R * 0.35, -R * 0.56, R * 0.13, 0, TAU); g.fill(); } }
    if (job === 'gardener') { g.fillStyle = '#5aa557'; for (let i = -2; i <= 2; i++) { g.beginPath(); ell(g, i * R * 0.25, -R * 0.82 + Math.abs(i) * R * 0.06, R * 0.16, R * 0.08, i * 0.5); g.fill(); } }
    if (job === 'explorer') { g.fillStyle = '#c8483c'; g.beginPath(); g.moveTo(-R * 0.6, R * 0.8); g.lineTo(R * 0.6, R * 0.8); g.lineTo(0, R * 1.35); g.fill(); }
    if (job === 'carer') { g.fillStyle = '#e07aa5'; g.beginPath(); ell(g, 0, R * 0.92, R * 0.75, R * 0.18, 0); g.fill(); }
    if (job === 'trader') { g.strokeStyle = '#6a4226'; g.lineWidth = R * 0.07; g.beginPath(); g.moveTo(-R * 0.8, R * 0.9); g.lineTo(R * 0.6, R * 1.8); g.stroke(); }
    if (L.acc) {
      const col = P.ACC_COL[L.accC];
      if (L.acc === 1) { g.fillStyle = col; g.beginPath(); g.moveTo(-R * 0.65, R * 0.8); g.lineTo(R * 0.65, R * 0.8); g.lineTo(0, R * 1.4); g.fill(); }
      if (L.acc === 2) for (let i = -2; i <= 2; i++) { g.fillStyle = ['#f2d14b', '#f28bb0', '#fff', '#b28bf2', '#f2d14b'][i + 2]; g.beginPath(); g.arc(i * R * 0.28, -R * 0.82 + Math.abs(i) * R * 0.08, R * 0.1, 0, TAU); g.fill(); }
      if (L.acc === 3) { g.strokeStyle = col; g.lineWidth = R * 0.1; g.beginPath(); g.arc(0, R * 0.4, R * 0.62, 0.5, Math.PI - 0.5); g.stroke(); g.fillStyle = '#e8c53a'; g.beginPath(); g.arc(0, R * 1.0, R * 0.08, 0, TAU); g.fill(); }
      if (L.acc === 4) { g.fillStyle = '#e8c53a'; g.beginPath(); g.arc(R * 0.78, -R * 0.4, R * 0.06, 0, TAU); g.fill(); }
      if (L.acc === 5) { g.fillStyle = col; g.beginPath(); g.moveTo(-R * 0.55, -R * 0.68); g.lineTo(-R * 0.85, -R * 0.9); g.lineTo(-R * 0.85, -R * 0.5); g.closePath(); g.moveTo(-R * 0.55, -R * 0.68); g.lineTo(-R * 0.25, -R * 0.9); g.lineTo(-R * 0.25, -R * 0.5); g.fill(); }
    }
    if (expr === 'comfort') { heart(g, R * 0.9, -R * 0.8, R * 0.2); }
    if (expr === 'angry') { g.strokeStyle = '#d8423a'; g.lineWidth = R * 0.05; g.beginPath(); const x = R * 0.85, y = -R * 0.75, k = R * 0.12; g.moveTo(x - k, y - k * 0.3); g.lineTo(x - k * 0.3, y - k * 0.3); g.lineTo(x - k * 0.3, y - k); g.moveTo(x + k, y - k * 0.3); g.lineTo(x + k * 0.3, y - k * 0.3); g.lineTo(x + k * 0.3, y - k); g.stroke(); }
    if (expr === 'proud') { g.fillStyle = '#f2d14b'; star(g, R * 0.95, -R * 0.75, R * 0.12); }
    g.restore();
  };
  function heart(g, x, y, s) { g.fillStyle = '#e8577a'; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.3); g.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.4, y - s * 0.2, x, y + s * 0.9); g.fill(); }
  function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  A.heart = heart; A.star = star;

  // Emote-Symbol über einer Katze in der Welt
  A.emote = function (g, x, y, emo, s) {
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(255,253,245,0.95)'; g.strokeStyle = 'rgba(60,40,30,0.35)'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, 7 * s, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-2 * s, 6 * s); g.lineTo(0, 10 * s); g.lineTo(2 * s, 6 * s); g.fill();
    if (emo === 'joy' || emo === 'love' || emo === 'comfort') heart(g, 0, 0.5 * s, 3.4 * s);
    else if (emo === 'proud') { g.fillStyle = '#e2b23a'; star(g, 0, 0, 4.5 * s); }
    else if (emo === 'angry') { g.strokeStyle = '#d8423a'; g.lineWidth = 1.4 * s; g.beginPath(); g.moveTo(-3 * s, -3 * s); g.lineTo(3 * s, 3 * s); g.moveTo(3 * s, -3 * s); g.lineTo(-3 * s, 3 * s); g.stroke(); }
    else if (emo === 'surprise') { g.fillStyle = '#3a2a20'; g.fillRect(-0.9 * s, -4 * s, 1.8 * s, 5 * s); g.fillRect(-0.9 * s, 2.3 * s, 1.8 * s, 1.6 * s); }
    else if (emo === 'scared' || emo === 'sad') { g.fillStyle = '#5aa7e0'; g.beginPath(); g.moveTo(0, -4 * s); g.quadraticCurveTo(3.5 * s, 1 * s, 0, 3.5 * s); g.quadraticCurveTo(-3.5 * s, 1 * s, 0, -4 * s); g.fill(); }
    else if (emo === 'zzz') { g.fillStyle = '#6a7aa8'; g.font = `bold ${8 * s}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('z', 0, 0.5 * s); }
    else if (emo === 'idea') { g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(0, -0.8 * s, 3 * s, 0, TAU); g.fill(); g.fillStyle = '#9a8a6a'; g.fillRect(-1.2 * s, 2 * s, 2.4 * s, 1.6 * s); }
    else if (emo === 'music') { g.fillStyle = '#7a5bc0'; g.beginPath(); g.arc(-1 * s, 2 * s, 1.8 * s, 0, TAU); g.fill(); g.fillRect(0.4 * s, -4 * s, 1.1 * s, 6 * s); g.fillRect(0.4 * s, -4 * s, 3 * s, 1.1 * s); }
    g.restore();
  };

  // ───────── Ereignisszenen ─────────
  const SKY = [['#bfe3f2', '#f6f1dc'], ['#8fcbe8', '#f8ecc8'], ['#e7b98a', '#f3dcc0'], ['#c9d6e3', '#eef2f5']];
  A.scene = function (g, w, h, key, t, season, s) {
    g.save();
    let sky = SKY[season || 0];
    if (key === 'night' || key === 'festival') sky = ['#1d2650', '#3d3f78'];
    if (key === 'storm' || key === 'rain') sky = ['#6f7a88', '#a5adb6'];
    if (key === 'winter') sky = ['#cbd8e6', '#f2f6fa'];
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const night = key === 'night' || key === 'festival';
    if (night) {
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,230,${0.4 + 0.5 * Math.abs(Math.sin(t + i))})`; g.fillRect(P.h2(i, 1, 3) * w, P.h2(i, 2, 3) * h * 0.55, 1.5, 1.5); }
      g.fillStyle = '#f6efc8'; g.beginPath(); g.arc(w * 0.82, h * 0.18, h * 0.08, 0, TAU); g.fill();
    } else if (key !== 'storm' && key !== 'rain') {
      g.fillStyle = 'rgba(255,240,180,0.9)'; g.beginPath(); g.arc(w * 0.8, h * 0.2, h * 0.09, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 3; i++) { const cx = ((t * 6 + i * w * 0.4) % (w + 120)) - 60; g.beginPath(); ell(g, cx, h * (0.15 + i * 0.07), 34, 10, 0); ell(g, cx + 20, h * (0.13 + i * 0.07), 22, 11, 0); g.fill(); }
    }
    // Hügel
    const grassC = season === 3 || key === 'winter' ? '#e8eef2' : season === 2 ? '#b9a25a' : season === 1 ? '#7fb257' : '#8cc06a';
    g.fillStyle = night ? '#2b3b4a' : P.shade(grassC, -0.15);
    g.beginPath(); g.moveTo(0, h * 0.6); for (let x = 0; x <= w; x += 10) g.lineTo(x, h * 0.55 + Math.sin(x * 0.02 + 1) * h * 0.05); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = night ? '#34495a' : grassC;
    g.beginPath(); g.moveTo(0, h * 0.7); for (let x = 0; x <= w; x += 10) g.lineTo(x, h * 0.68 + Math.sin(x * 0.03) * h * 0.03); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.save();
    g.beginPath();g.rect(0,h*.73,w,h*.27);g.clip();
    for(let i=0;i<240;i++) {
      const x=P.h2(i,9,13)*w,y=h*(.73+P.h2(i,10,13)*.27);
      g.strokeStyle=night?'rgba(167,189,182,.10)':'rgba(38,60,30,.16)';
      g.lineWidth=.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.sin(i)*2,y-2-P.h2(i,11,13)*4);g.stroke();
    }
    g.restore();
    // Requisiten nach Szene
    const prop = SCENES[key];
    if (prop) prop(g, w, h, t, night, s);
    if (key === 'storm' || key === 'rain') {
      g.strokeStyle = 'rgba(220,230,245,0.55)'; g.lineWidth = 1;
      g.beginPath(); for (let i = 0; i < 70; i++) { const x = (P.h2(i, 5, 1) * w + t * 300) % w, y = (P.h2(i, 6, 1) * h + t * 500) % h; g.moveTo(x, y); g.lineTo(x - 4, y + 10); } g.stroke();
    }
    if (key === 'winter') { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 60; i++) { const x = (P.h2(i, 5, 2) * w + Math.sin(t + i) * 10) % w, y = (P.h2(i, 6, 2) * h + t * 25) % h; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } }
    g.restore();
  };
  function tree(g, x, y, s, c) { g.fillStyle = '#6b4a2e'; g.fillRect(x - 2 * s, y - 14 * s, 4 * s, 14 * s); g.fillStyle = c || '#4f8a45'; g.beginPath(); g.arc(x, y - 20 * s, 10 * s, 0, TAU); g.arc(x - 7 * s, y - 15 * s, 7 * s, 0, TAU); g.arc(x + 7 * s, y - 15 * s, 7 * s, 0, TAU); g.fill(); }
  function scratchTree(g, x, y, s, levels) {
    for (let i = 0; i < levels; i++) {
      g.fillStyle = '#c9a777'; g.fillRect(x - 3 * s, y - (i + 1) * 22 * s, 6 * s, 22 * s);
      g.strokeStyle = '#a8865a'; g.lineWidth = s; g.beginPath(); for (let k = 0; k < 6; k++) { g.moveTo(x - 3 * s, y - i * 22 * s - k * 3.5 * s); g.lineTo(x + 3 * s, y - i * 22 * s - k * 3.5 * s - 1.5 * s); } g.stroke();
      g.fillStyle = '#8a6a48'; g.beginPath(); ell(g, x, y - (i + 1) * 22 * s, 14 * s, 3.5 * s, 0); g.fill();
      g.fillStyle = '#d9b98a'; g.fillRect(x - 9 * s, y - (i + 1) * 22 * s - 12 * s, 18 * s, 10 * s);
      g.fillStyle = '#5a3d28'; g.beginPath(); g.arc(x, y - (i + 1) * 22 * s - 6 * s, 3 * s, 0, TAU); g.fill();
    }
  }
  const SCENES = {
    meadow: (g, w, h, t) => { tree(g, w * 0.12, h * 0.7, 1.4); tree(g, w * 0.9, h * 0.68, 1.1, '#5d9a4e'); for (let i = 0; i < 30; i++) { g.fillStyle = ['#f2d14b', '#fff', '#f28bb0'][i % 3]; g.beginPath(); g.arc(P.h2(i, 1, 9) * w, h * 0.72 + P.h2(i, 2, 9) * h * 0.25, 2, 0, TAU); g.fill(); } },
    river: (g, w, h, t) => { g.fillStyle = '#5b9cc4'; g.beginPath(); g.moveTo(0, h * 0.72); g.bezierCurveTo(w * 0.3, h * 0.66, w * 0.6, h * 0.82, w, h * 0.74); g.lineTo(w, h * 0.86); g.bezierCurveTo(w * 0.6, h * 0.94, w * 0.3, h * 0.8, 0, h * 0.86); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const x = ((t * 20 + i * 60) % (w + 40)) - 20; g.beginPath(); g.moveTo(x, h * 0.78 + (i % 3) * 4); g.lineTo(x + 14, h * 0.78 + (i % 3) * 4); g.stroke(); } g.fillStyle = '#8a6440'; g.fillRect(w * 0.6, h * 0.7, w * 0.25, 5); for (let i = 0; i < 4; i++) g.fillRect(w * 0.62 + i * w * 0.06, h * 0.7, 3, 18); },
    forest: (g, w, h) => { for (let i = 0; i < 9; i++) tree(g, (i + 0.5) * w / 9, h * (0.66 + (i % 2) * 0.06), 1.2 + (i % 3) * 0.2, ['#3f7a3a', '#4f8a45', '#2f6a35'][i % 3]); },
    storm: (g, w, h, t) => { for (let i = 0; i < 4; i++) { g.save(); g.translate(w * (0.15 + i * 0.25), h * 0.7); g.rotate(Math.sin(t * 3 + i) * 0.12); tree(g, 0, 0, 1.2, '#4a6a45'); g.restore(); } g.fillStyle = '#5a4a3a'; g.beginPath(); g.moveTo(w * 0.55, h * 0.75); g.lineTo(w * 0.75, h * 0.62); g.lineTo(w * 0.95, h * 0.75); g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(w * 0.75, h * 0.75, h * 0.06, Math.PI, 0); g.fill(); },
    night: (g, w, h, t) => { tree(g, w * 0.1, h * 0.7, 1.3, '#26402f'); for (let i = 0; i < 26; i++) { const x = P.h2(i, 3, 4) * w + Math.sin(t + i) * 8, y = h * 0.4 + P.h2(i, 4, 4) * h * 0.45 + Math.cos(t * 1.3 + i) * 6; g.fillStyle = `rgba(230,255,140,${0.5 + 0.5 * Math.sin(t * 3 + i)})`; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); } },
    festival: (g, w, h, t) => { g.strokeStyle = '#d9c9a0'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, h * 0.25); g.quadraticCurveTo(w / 2, h * 0.45, w, h * 0.25); g.stroke(); for (let i = 1; i < 12; i++) { const x = i * w / 12, y = h * 0.25 + Math.sin(i / 12 * Math.PI) * h * 0.1; g.fillStyle = ['#f2a04b', '#e8577a', '#f2d14b', '#7ac0e8'][i % 4]; g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3 + i); g.beginPath(); ell(g, x, y + 8, 5, 7, 0); g.fill(); g.globalAlpha = 1; } const gl = g.createRadialGradient(w / 2, h * 0.85, 4, w / 2, h * 0.85, h * 0.35); gl.addColorStop(0, 'rgba(255,190,90,0.6)'); gl.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h); },
    ruins: (g, w, h) => { g.fillStyle = '#9a958a'; g.fillRect(w * 0.1, h * 0.45, w * 0.08, h * 0.3); g.fillRect(w * 0.1, h * 0.45, w * 0.25, h * 0.05); g.fillRect(w * 0.3, h * 0.55, w * 0.06, h * 0.2); g.strokeStyle = 'rgba(200,230,240,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(w * 0.68, h * 0.72, h * 0.22, Math.PI, 0); g.moveTo(w * 0.68, h * 0.5); g.lineTo(w * 0.68, h * 0.72); g.moveTo(w * 0.55, h * 0.56); g.lineTo(w * 0.6, h * 0.72); g.moveTo(w * 0.81, h * 0.56); g.lineTo(w * 0.76, h * 0.72); g.stroke(); g.fillStyle = 'rgba(160,210,170,0.35)'; g.beginPath(); g.arc(w * 0.68, h * 0.72, h * 0.22, Math.PI, 0); g.fill(); g.fillStyle = '#4f8a45'; for (let i = 0; i < 7; i++) { g.beginPath(); ell(g, w * (0.56 + i * 0.035), h * 0.7, 4, 8, 0); g.fill(); } },
    market: (g, w, h, t) => { for (let i = 0; i < 3; i++) { const x = w * (0.15 + i * 0.3); g.fillStyle = '#8a6440'; g.fillRect(x, h * 0.55, 4, h * 0.2); g.fillRect(x + w * 0.2, h * 0.55, 4, h * 0.2); g.fillStyle = '#a07850'; g.fillRect(x, h * 0.68, w * 0.2 + 4, 8); for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#f3efe8' : ['#d8423a', '#3f78c2', '#e2b23a'][i]; g.beginPath(); g.moveTo(x - 4 + k * (w * 0.2 + 12) / 6, h * 0.5); g.lineTo(x - 4 + (k + 1) * (w * 0.2 + 12) / 6, h * 0.5); g.lineTo(x - 4 + (k + 1) * (w * 0.2 + 12) / 6, h * 0.56); g.lineTo(x - 4 + k * (w * 0.2 + 12) / 6, h * 0.56); g.fill(); } g.fillStyle = '#9fb5c4'; for (let k = 0; k < 3; k++) { g.beginPath(); ell(g, x + 10 + k * 14, h * 0.665, 6, 2.5, 0); g.fill(); } } },
    city: (g, w, h, t, night, s) => { const lv = s ? Math.max(2, s.stage - 1) : 3; for (let i = 0; i < 5; i++) scratchTree(g, w * (0.1 + i * 0.2), h * 0.78, 0.8 + (i % 2) * 0.15, Math.max(1, lv - (i % 2))); g.strokeStyle = '#8a6a48'; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w * (0.1 + i * 0.2) + 10, h * 0.78 - 22 * 0.85 * lv + 6); g.quadraticCurveTo(w * (0.2 + i * 0.2), h * 0.78 - 22 * 0.85 * lv + 22, w * (0.3 + i * 0.2) - 10, h * 0.78 - 22 * 0.85 * lv + 6); g.stroke(); } if (night) for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(255,210,120,0.8)'; g.fillRect(P.h2(i, 1, 5) * w, h * 0.3 + P.h2(i, 2, 5) * h * 0.4, 3, 3); } },
    home: (g, w, h) => { tree(g, w * 0.88, h * 0.7, 1.2); scratchTree(g, w * 0.2, h * 0.76, 0.9, 1); g.fillStyle = '#7a6040'; g.beginPath(); g.arc(w * 0.6, h * 0.76, h * 0.12, Math.PI, 0); g.fill(); g.fillStyle = '#2a1d14'; g.beginPath(); g.arc(w * 0.6, h * 0.76, h * 0.05, Math.PI, 0); g.fill(); },
    visitors: (g, w, h, t) => { g.fillStyle = '#c9a777'; g.beginPath(); g.moveTo(w * 0.45, h * 0.6); g.lineTo(w * 0.55, h * 0.6); g.lineTo(w * 0.8, h); g.lineTo(w * 0.2, h); g.fill(); for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(60,45,40,0.75)'; const x = w * (0.47 + i * 0.03), y = h * 0.62; g.beginPath(); ell(g, x, y, 4, 2.5, 0); ell(g, x + 3, y - 2, 2, 2, 0); g.fill(); } tree(g, w * 0.1, h * 0.72, 1.2); },
    garden: (g, w, h, t) => { for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { const x = w * 0.05 + i * w * 0.08, y = h * (0.72 + r * 0.06); g.fillStyle = '#4f9a4a'; g.beginPath(); ell(g, x, y, 6, 4, 0); g.fill(); g.fillStyle = '#b28bd8'; g.beginPath(); g.arc(x, y - 4 + Math.sin(t * 2 + i) * 0.6, 1.6, 0, TAU); g.fill(); } for (let i = 0; i < 4; i++) { const x = (t * 30 + i * 80) % w, y = h * 0.5 + Math.sin(t * 4 + i) * 10; g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); } },
    workshop: (g, w, h) => { g.fillStyle = '#c8a070'; g.fillRect(w * 0.1, h * 0.45, w * 0.35, h * 0.3); g.fillStyle = '#a0473a'; g.beginPath(); g.moveTo(w * 0.07, h * 0.47); g.lineTo(w * 0.275, h * 0.3); g.lineTo(w * 0.48, h * 0.47); g.fill(); for (let i = 0; i < 8; i++) { g.fillStyle = P.ACC_COL[i % 6]; g.beginPath(); g.arc(w * (0.55 + (i % 4) * 0.08), h * (0.78 - Math.floor(i / 4) * 0.06), 6, 0, TAU); g.fill(); } g.strokeStyle = '#7a5a36'; g.lineWidth = 2; g.beginPath(); g.arc(w * 0.85, h * 0.6, 12, 0, TAU); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(w * 0.85 + Math.cos(a) * 12, h * 0.6 + Math.sin(a) * 12); g.lineTo(w * 0.85 + Math.cos(a) * 16, h * 0.6 + Math.sin(a) * 16); } g.stroke(); },
    winter: (g, w, h) => { tree(g, w * 0.15, h * 0.7, 1.2, '#dfe8ee'); tree(g, w * 0.85, h * 0.7, 1.0, '#dfe8ee'); },
    rain: (g, w, h) => { tree(g, w * 0.2, h * 0.7, 1.2, '#4a6a45'); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(200,220,240,0.6)'; g.beginPath(); ell(g, w * (0.3 + i * 0.1), h * 0.88, 8, 2, 0); g.stroke(); } },
  };
})();
