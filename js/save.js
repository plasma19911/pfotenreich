// Pfotenreich – Speichern (IndexedDB, versioniert), Migration, Export/Import
(function () {
  const P = self.P;
  const DB = 'pfotenreich', STORE = 'saves', KEY = 'main';

  function open() {
    return new Promise((res, rej) => {
      if (!self.indexedDB) return rej(new Error('kein IndexedDB'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  P.serialize = function (s) {
    const o = {};
    for (const k in s) if (k !== 'world' && k[0] !== '_' && k !== 'worldDirty') o[k] = s[k];
    return JSON.stringify(o);
  };
  P.save = async function (s) {
    const json = P.serialize(s);
    try {
      const db = await open();
      await new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(json, KEY);
        tx.objectStore(STORE).put(json, KEY + '_bak_' + (P.day(s) % 3)); // rollierende Sicherung
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    } catch (e) {
      try { localStorage.setItem('pfotenreich_save', json); } catch (e2) { console.warn('Speichern fehlgeschlagen', e2); }
    }
  };
  P.loadRaw = async function () {
    try {
      const db = await open();
      const v = await new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(KEY);
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      if (v) return v;
    } catch (e) { /* Fallback */ }
    try { return localStorage.getItem('pfotenreich_save'); } catch (e) { return null; }
  };
  P.wipe = async function () {
    try { const db = await open(); await new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = res; }); } catch (e) { }
    try { localStorage.removeItem('pfotenreich_save'); } catch (e) { }
  };

  // Migrationen: bei jeder Datenmodelländerung eine Funktion v → v+1 ergänzen
  P.MIGRATIONS = {
    // 1: (o) => { o.neuesFeld = ...; o.v = 2; return o; },
  };
  P.migrate = function (o) {
    if (typeof o.v !== 'number') throw new Error('Kein Pfotenreich-Spielstand');
    if (o.v > P.SAVE_V) throw new Error('Spielstand stammt aus einer neueren Version');
    while (o.v < P.SAVE_V) {
      const m = P.MIGRATIONS[o.v];
      if (!m) throw new Error('Keine Migration für Version ' + o.v);
      o = m(o);
    }
    // fehlende Felder robust ergänzen (vorwärtskompatibel)
    const def = P.newGame(o.seed || 1, o.realm);
    for (const k in def) if (o[k] === undefined && k !== 'world') o[k] = def[k];
    for (const k in def.res) if (o.res[k] === undefined) o.res[k] = 0;
    for (const k in def.val) if (o.val[k] === undefined) o.val[k] = 0;
    return o;
  };
  P.validate = function (o) {
    const need = ['seed', 'rng', 't', 'cats', 'b', 'res', 'regions', 'pending', 'chron'];
    for (const k of need) if (o[k] === undefined) throw new Error('Feld fehlt: ' + k);
    if (!Array.isArray(o.cats) || !Array.isArray(o.b)) throw new Error('Ungültige Struktur');
    if (o.cats.length > 5000 || o.b.length > 5000) throw new Error('Spielstand zu groß');
    for (const c of o.cats) if (typeof c.id !== 'number' || typeof c.name !== 'string' || !c.look) throw new Error('Ungültige Katze');
    for (const b of o.b) if (!P.BUILD[b.type]) throw new Error('Unbekanntes Gebäude: ' + b.type);
    for (const p of o.pending) if (!P.EVM[p.id]) throw new Error('Unbekanntes Ereignis: ' + p.id);
    return true;
  };
  P.parseSave = function (json) {
    let o;
    try { o = JSON.parse(json); } catch (e) { throw new Error('Datei ist kein gültiges JSON'); }
    if (o && o.pfotenreich && o.data) o = o.data; // Export-Hülle
    o = P.migrate(o);
    P.validate(o);
    o.world = P.genWorld(o.seed);
    o.pending = o.pending.filter((p) => P.EVM[p.id]);
    return o;
  };
  P.exportJSON = (s) => JSON.stringify({ pfotenreich: true, exported: new Date().toISOString(), data: JSON.parse(P.serialize(s)) });
})();
