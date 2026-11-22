// Pfotenreich – Ereignis-Inhalte. Neue Ereignisse: einfach weitere P.def({...}) ergänzen.
// Felder: id, c (Kategorie), st [min,max Stufe], w (Gewicht), cd (Abklingzeit in Tagen), art (Szene), season?, once?,
// req(s,ctx) → Kontext oder null, t (Titel), x (Text), o (Optionen: l Label, h Hinweis, tg Tags, if Bedingung, f Folge)
(function () {
  const P = self.P;
  const F = P.fx, N = P.N, D = P.def;
  const ad = (s) => (c) => P.ph(s, c) === 2;
  const has = P.has;
  const pr = (s, id) => P.pr(s, id);

  // ───────────── Gründung ─────────────
  D({ id: 'found', c: 'turn', st: [0, 0], manual: 1, art: 'meadow',
    t: 'Ein Ort zum Bleiben',
    x: (s) => `Nach vielen Tagen Wanderschaft erreichen ${P.alive(s).map((c) => c.name).join(', ')} ein stilles Tal. Ein Bach plätschert, die Sonne wärmt die Steine, und eine alte Weide spendet Schatten. Wo soll die Gemeinschaft ihr erstes Lager aufschlagen?`,
    o: [
      { l: 'Am plätschernden Bach', h: 'Mehr Futter, Fischertradition', tg: ['nature', 'frugal'], f: (s) => found(s, 'bach') + ' · ' + F(s, { food: 15, nat: 1 }) },
      { l: 'Auf der sonnigen Anhöhe', h: 'Zusammenhalt, ein Sonnenplatz', tg: ['festive', 'care'], f: (s) => found(s, 'sonne') + ' · ' + F(s, { coh: 10, com: 1 }) + P.qb(s, 'sunspot') },
      { l: 'Unter der alten Weide', h: 'Holz und ein erster Kratzstamm', tg: ['build'], f: (s) => found(s, 'weide') + ' · ' + F(s, { wood: 10, inv: 1 }) + P.qb(s, 'scratch') },
    ] });
  function found(s, where) {
    s.stage = 1;
    s.flags.home = where;
    s.foundDay = P.day(s);
    P.placeBuilding(s, 'den', { free: true, at: [P.CX - 1, P.CY + 1] });
    P.placeBuilding(s, 'feedspot', { free: true, at: [P.CX + 1, P.CY - 1] });
    P.assignJobs(s);
    P.assignHomes(s);
    const names = P.alive(s).map((c) => c.name).join(', ');
    P.chron(s, 'found', `Gründung von ${s.realm}: ${names} lassen sich ${where === 'bach' ? 'am Bach' : where === 'sonne' ? 'auf der sonnigen Anhöhe' : 'unter der alten Weide'} nieder.`);
    for (const c of P.alive(s)) P.addMem(s, c, `Hat ${s.realm} gegründet.`, 3);
    return 'Das Lager ist gegründet';
  }

  // ───────────── Meilensteine (bei Stufenaufstieg) ─────────────
  D({ id: 'stage2', c: 'stage', st: [2, 6], art: 'home', t: 'Aus dem Lager wird eine Siedlung',
    x: (s) => `Die ersten Kratzbaumhäuser sollen entstehen. Beim abendlichen Putzen fragen sich alle: Wofür soll ${s.realm} stehen?`,
    o: [
      { l: 'Für reiche Fischgründe', h: 'Naturverbundenheit, Angelsteg', tg: ['nature'], f: (s) => F(s, { nat: 2, food: 10 }) + P.qb(s, 'jetty') },
      { l: 'Für kühne Bauten', h: 'Erfindergeist, Material', tg: ['build', 'prestige'], f: (s) => F(s, { inv: 2, wood: 12, sisal: 6 }) },
      { l: 'Für offene Türen', h: 'Handelsgeist, Neuankömmlinge', tg: ['open', 'generous'], f: (s) => F(s, { trade: 1, com: 1 }) + ' · Neu: ' + P.newCats(s, 2, { origin: 'aus der Ferne', mem: 'Kam, weil die Siedlung offen für alle ist.' }).join(', ') },
    ] });
  D({ id: 'stage3', c: 'stage', st: [3, 6], art: 'festival', t: 'Das Dorf braucht einen Rat',
    x: (s) => `${s.realm} ist ein richtiges Dorf geworden. Familien wachsen, Werkstätten entstehen. Doch wer entscheidet künftig, wenn es Streit gibt?`,
    o: [
      { l: 'Ein Rat der Ältesten', h: 'Tradition, Vertrauen', tg: ['tradition'], f: (s) => { s.flags.gov = 'elders'; return F(s, { trust: 8, com: 1 }); } },
      { l: 'Alle Pfoten stimmen ab', h: 'Gemeinschaftssinn', tg: ['open', 'festive'], f: (s) => { s.flags.gov = 'all'; return F(s, { coh: 6, com: 2 }); } },
      { l: 'Die Fähigsten führen', h: 'Erfinder- & Handelsgeist', tg: ['prestige', 'build'], f: (s) => { s.flags.gov = 'able'; return F(s, { inv: 1, trade: 1, know: 10 }); } },
    ] });
  D({ id: 'stage4', c: 'stage', st: [4, 6], art: 'city', t: 'Das erste Viertel',
    x: (s) => `Die Kleinstadt wächst über die Lichtung hinaus. Das erste eigene Viertel bekommt einen Namen – und eine Bestimmung.`,
    o: [
      { l: 'Das Fischerviertel', h: 'Futter, Naturverbundenheit', tg: ['nature', 'tradition'], f: (s) => { s.districts.push({ n: 'Fischerviertel', k: 'water' }); return F(s, { nat: 2, food: 20 }); } },
      { l: 'Das Werkstattviertel', h: 'Erfindergeist', tg: ['build', 'curious'], f: (s) => { s.districts.push({ n: 'Werkstattviertel', k: 'work' }); return F(s, { inv: 2, know: 20 }); } },
      { l: 'Das Marktviertel', h: 'Handelsgeist', tg: ['open'], f: (s) => { s.districts.push({ n: 'Marktviertel', k: 'food' }); return F(s, { trade: 2, shells: 10 }); } },
      { l: 'Das Festviertel', h: 'Gemeinschaftssinn', tg: ['festive'], f: (s) => { s.districts.push({ n: 'Festviertel', k: 'culture' }); return F(s, { com: 2, coh: 6 }); } },
    ] });
  D({ id: 'stage5', c: 'stage', st: [5, 6], art: 'city', t: 'Ein Wappen für die Stadt',
    x: (s) => `${s.realm} ist eine Stadt! Der Rat will ein Wappen auf die Banner sticken lassen. Was soll darauf zu sehen sein?`,
    o: [
      { l: 'Ein Blatt der Katzenminze', h: 'Naturverbundenheit', tg: ['nature'], f: (s) => { s.flags.crest = 'leaf'; return F(s, { nat: 3, coh: 3 }); } },
      { l: 'Eine goldene Muschel', h: 'Handelsgeist', tg: ['prestige', 'open'], f: (s) => { s.flags.crest = 'shell'; return F(s, { trade: 3, shells: 15 }); } },
      { l: 'Ein Zahnrad mit Pfote', h: 'Erfindergeist', tg: ['curious', 'build'], f: (s) => { s.flags.crest = 'gear'; return F(s, { inv: 3, know: 40 }); } },
      { l: 'Zwei verschlungene Schwänze', h: 'Gemeinschaftssinn', tg: ['care', 'festive'], f: (s) => { s.flags.crest = 'tails'; return F(s, { com: 3, coh: 6 }); } },
    ] });
  D({ id: 'stage6', c: 'stage', st: [6, 6], art: 'city', t: 'Die Metropole erwacht',
    x: (s) => `Über ${s.realm} spannen sich Brücken von Turm zu Turm. Was einst ${s.legacy.length ? 'mit ' + s.legacy.map((id) => N(s, id)).join(', ') + ' ' : ''}als kleines Lager begann, ist eine Metropole. Wofür soll sie berühmt werden?`,
    o: [
      { l: 'Für ihre schwebenden Gärten', h: 'Naturverbundenheit', tg: ['nature'], f: (s) => F(s, { nat: 4, coh: 5 }) },
      { l: 'Für ihre Märkte aus aller Welt', h: 'Handelsgeist', tg: ['open', 'prestige'], f: (s) => F(s, { trade: 4, shells: 30 }) },
      { l: 'Für ihre Wunderwerke', h: 'Erfindergeist', tg: ['curious'], f: (s) => F(s, { inv: 4, know: 80 }) },
      { l: 'Für ihre großen Feste', h: 'Gemeinschaftssinn', tg: ['festive'], f: (s) => F(s, { com: 4, coh: 8 }) },
    ] });

  // ───────────── Erfreuliches ─────────────
  D({ id: 'bigcatch', c: 'pos', st: [1, 6], w: 5, cd: 8, art: 'river',
    req: (s) => P.ctxA(s, (c) => c.job === 'fisher') || P.ctxA(s, ad(s)),
    t: 'Ein riesiger Fang',
    x: (s, c) => `${N(s, c.a)} schleppt einen Fisch heran, der fast so lang ist wie ${pr(s, c.a).er} selbst. Alle laufen zusammen und staunen. Was geschieht mit dem Fang?`,
    o: [
      { l: 'Gerecht an alle verteilen', h: 'Zusammenhalt ↑', tg: ['generous', 'care'], f: (s, c) => wish(s, c.a, 'bigfish') + F(s, { food: 8, coh: 4, com: 1 }) },
      { l: 'Für schlechte Zeiten einlagern', h: 'Vorrat ↑↑', tg: ['frugal', 'cautious'], f: (s, c) => wish(s, c.a, 'bigfish') + F(s, { food: 22 }) },
      { l: 'Ein Fest feiern!', h: 'Stimmung ↑↑, vielleicht Tradition', tg: ['festive'], f: (s, c) => { wish(s, c.a, 'bigfish'); s.festUntil = s.t + 4; let r = F(s, { coh: 7, mood: 6, com: 2, food: 2 }); if (P.chance(s, 0.6)) r += P.addTrad(s, 'fangfest', 'Fest des Großen Fangs', `Erinnert an ${N(s, c.a)}s Riesenfisch.`); return r; } },
      { l: 'Mit dem Weidenclan teilen', h: 'Neue Freunde jenseits des Tals', tg: ['open', 'generous'], if: (s) => s.stage >= 2 && !s.flags.clanFriend, f: (s) => { P.flag(s, 'clanFriend'); P.sched(s, 'clan_return', P.rf(s, 2, 5), {}); return F(s, { trade: 2, trust: 2 }) + ' · Der Weidenclan wird sich erinnern.'; } },
    ] });
  function wish(s, id, k) { const c = P.cat(s, id); if (c && c.wish === k && !c.wishDone) { P.fulfillWish(s, c); return `${c.name}s Herzenswunsch geht in Erfüllung! · `; } return ''; }

  D({ id: 'clan_return', c: 'chain', st: [2, 6], art: 'visitors', t: 'Der Weidenclan kommt zu Besuch',
    x: (s) => `Erinnert ihr euch an den geteilten Fisch? Eine Abordnung des Weidenclans steht mit Körben voller Geschenke am Bach. Ihre Anführerin fragt, ob die beiden Clans künftig zusammenhalten wollen.`,
    o: [
      { l: 'Ein Bündnis schließen', h: 'Handel & Zusammenhalt, regelmäßige Besuche', tg: ['open', 'generous'], f: (s) => { P.flag(s, 'alliance'); return F(s, { trade: 3, com: 2, cardboard: 8, coh: 4 }) + P.addTrad(s, 'clantag', 'Tag der zwei Clans', 'Einmal im Jahr besuchen sich beide Clans.'); } },
      { l: 'Geschenke dankbar annehmen', h: 'Material', tg: ['frugal'], f: (s) => F(s, { cardboard: 10, wood: 10, sisal: 6 }) },
      { l: 'Einige von ihnen aufnehmen', h: 'Neue Bewohner', tg: ['open', 'care'], f: (s) => 'Neu: ' + P.newCats(s, 3, { origin: 'aus dem Weidenclan', mem: 'Kam aus dem befreundeten Weidenclan.' }).join(', ') + ' · ' + F(s, { com: 1 }) },
    ] });

  D({ id: 'toyfind', c: 'pos', st: [1, 4], w: 4, cd: 12, art: 'meadow',
    req: (s) => P.ctxA(s, (c) => P.ph(s, c) >= 1 && (has(c, 'verspielt') || has(c, 'neugierig'))) || P.ctxA(s, (c) => P.ph(s, c) >= 1),
    t: 'Etwas Glitzerndes im Gras',
    x: (s, c) => `${N(s, c.a)} hat im hohen Gras eine silberne Kugel gefunden, die beim Rollen klingt und glitzert. Das halbe Lager jagt ihr bereits hinterher.`,
    o: [
      { l: 'Ein Spiel für alle daraus machen', h: 'Spaß & Zusammenhalt', tg: ['festive', 'generous'], f: (s) => F(s, { coh: 5, mood: 5 }) },
      { l: `Der Finderin / dem Finder lassen`, h: 'Eine sehr glückliche Katze', tg: ['free'], f: (s, c) => { P.moodAdd(s, c.a, 25); const cat = P.cat(s, c.a); if (cat && !cat.look.acc) { cat.look.acc = 3; cat.look.accC = 2; } return `${N(s, c.a)} trägt die Kugel jetzt stolz am Halsband.`; } },
      { l: 'Genau untersuchen', h: 'Wissen, Erfindergeist', tg: ['curious'], f: (s) => F(s, { know: 8, inv: 1 }) },
    ] });

  D({ id: 'toy_invent', c: 'pers', st: [2, 6], w: 4, cd: 30, once: 1, art: 'workshop',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && (c.talent === 'Basteln' || has(c, 'verspielt') || has(c, 'chaotisch'))),
    t: 'Die Knäuelschleuder',
    x: (s, c) => `${N(s, c.a)} hat aus einem Ast, Sisal und Wolle eine Schleuder gebaut, die Wollknäuel quer über den Platz fliegen lässt. Die Jungkatzen sind außer sich vor Begeisterung.`,
    o: [
      { l: 'Ein Wettspiel daraus machen', h: 'Kann zur Tradition werden', tg: ['festive', 'change'], f: (s, c) => { P.sched(s, 'toy_tradition', P.rf(s, 4, 8), { a: c.a }); return F(s, { coh: 4, com: 2 }) + ' · Die Kleinen üben jeden Abend.'; } },
      { l: 'In Serie herstellen', h: 'Erfindergeist, Wolle wird gebraucht', tg: ['build', 'curious'], f: (s, c) => { P.flag(s, 'slings'); wish(s, c.a, 'invent'); return F(s, { inv: 3, know: 10, wool: -2 }); } },
      { l: 'Freundlich, aber bitte woanders', h: 'Ruhe im Lager', tg: ['strict', 'cautious'], f: (s, c) => { P.moodAdd(s, c.a, -15); return `${N(s, c.a)} ist etwas geknickt.`; } },
    ] });
  D({ id: 'toy_tradition', c: 'chain', st: [2, 6], art: 'festival',
    req: (s, c) => (P.alivePred(s, c.a) ? c : null),
    t: 'Knäuelwerfen wird beliebt',
    x: (s, c) => `Seit ${N(s, c.a)}s Erfindung treffen sich jeden Abend Katzen zum Knäuelwerfen. Jemand schlägt vor, daraus ein jährliches Turnier zu machen – mit einem Pokal aus Karton.`,
    o: [
      { l: 'Das Knäuelturnier einführen', h: 'Neue Tradition', tg: ['festive', 'tradition'], f: (s, c) => { wish(s, c.a, 'invent'); return F(s, { coh: 5 }) + P.addTrad(s, 'knaeuel', 'Großes Knäuelturnier', `Erfunden von ${N(s, c.a)}.`); } },
      { l: 'Lieber locker und ohne Pokal', h: 'Freiheit, Spaß', tg: ['free'], f: (s) => F(s, { mood: 4, com: 1 }) },
    ] });

  D({ id: 'catnipyear', c: 'pos', st: [2, 6], w: 3, cd: 30, season: [0, 1], art: 'garden',
    t: 'Ein prächtiges Katzenminzejahr',
    x: () => `Überall duftet es: Die Katzenminze wächst in diesem Jahr üppig wie nie. Einige Katzen liegen schon selig auf dem Rücken.`,
    o: [
      { l: 'Ein ausgelassenes Minzefest', h: 'Stimmung ↑↑', tg: ['festive'], f: (s) => { s.festUntil = s.t + 3; return F(s, { mood: 10, coh: 5, com: 1 }); } },
      { l: 'Ernten und trocknen', h: 'Katzenminze-Vorrat', tg: ['frugal'], f: (s) => F(s, { catnip: 25, nat: 1 }) },
      { l: 'Als Handelsware anbieten', h: 'Muscheln', tg: ['open'], if: (s) => s.stage >= 3, f: (s) => F(s, { shells: 15, trade: 2 }) },
    ] });

  D({ id: 'visitors', c: 'pos', st: [2, 6], w: 3, cd: 14, art: 'visitors',
    t: 'Freundliche Wanderkatzen',
    x: () => `Drei Wanderkatzen mit staubigen Pfoten bitten um eine Nacht Rast. Als Dank breiten sie ihre Mitbringsel aus: Kartonstücke, bunte Fäden und Geschichten von fernen Orten.`,
    o: [
      { l: 'Gastfreundlich bewirten', h: 'Geschenke, Handelsgeist', tg: ['generous', 'open'], f: (s) => F(s, { food: -6, cardboard: 8, wool: 4, trade: 1 }) },
      { l: 'Einladen, für immer zu bleiben', h: 'Neue Bewohner', tg: ['open', 'care'], f: (s) => 'Neu: ' + P.newCats(s, P.ri(s, 1, 2), { origin: 'als Wanderkatze', mem: 'War Wanderkatze, bis die Gastfreundschaft überzeugte.' }).join(', ') },
      { l: 'Ihren Geschichten lauschen', h: 'Wissen, Erkundung', tg: ['curious'], f: (s) => F(s, { know: 12, exp: 6 }) },
    ] });

  D({ id: 'spring', c: 'disc', st: [1, 4], w: 3, cd: 40, once: 1, art: 'forest',
    req: (s) => P.ctxA(s, (c) => c.job === 'explorer') || P.ctxA(s, ad(s)),
    t: 'Eine verborgene Quelle',
    x: (s, c) => `${N(s, c.a)} folgt einem Glitzern zwischen Farnen und entdeckt eine kristallklare Quelle, in der silberne Fische stehen.`,
    o: [
      { l: 'Einen Fischteich anlegen', h: 'Dauerhaft mehr Futter', tg: ['build', 'frugal'], f: (s) => { P.flag(s, 'spring', 'pond'); return F(s, { food: 5 }) + P.qb(s, s.stage >= 3 ? 'pond' : 'jetty'); } },
      { l: 'Als stillen Ort bewahren', h: 'Naturverbundenheit, Zusammenhalt', tg: ['nature', 'tradition'], f: (s) => { P.flag(s, 'spring', 'holy'); return F(s, { nat: 3, coh: 4 }); } },
      { l: 'Ihr Wasser erforschen', h: 'Wissen', tg: ['curious'], f: (s) => F(s, { know: 15, inv: 1 }) },
    ] });

  D({ id: 'helper_invention', c: 'pos', st: [3, 6], w: 3, cd: 25, art: 'workshop',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && (c.job === 'inventor' || c.talent === 'Erfinden' || has(c, 'neugierig'))),
    t: 'Der Fischkorb-Aufzug',
    x: (s, c) => `${N(s, c.a)} präsentiert einen Korb an einem Seil, der Fische vom Steg bis hinauf in die Kratzbaumhäuser zieht. Niemand muss mehr mit nassem Fisch im Maul klettern.`,
    o: [
      { l: 'Überall einbauen', h: 'Fischerei dauerhaft +10 %', tg: ['build', 'change'], f: (s, c) => { s.flags.lift = (s.flags.lift || 0) + 1; wish(s, c.a, 'invent'); return F(s, { inv: 2, wood: -5 }) + ' · Fischerei effizienter.'; } },
      { l: 'Für Baustellen umbauen', h: 'Bauen dauerhaft +10 %', tg: ['build'], f: (s, c) => { s.flags.crane = (s.flags.crane || 0) + 1; wish(s, c.a, 'invent'); return F(s, { inv: 2, sisal: -5 }) + ' · Bauarbeiten schneller.'; } },
      { l: 'Klettern hält fit!', h: 'Tradition statt Technik', tg: ['tradition'], f: (s, c) => { P.moodAdd(s, c.a, -10); return F(s, { coh: 2 }); } },
    ] });

  D({ id: 'unlikely_friends', c: 'pers', st: [2, 6], w: 3, cd: 12, art: 'meadow',
    req: (s) => { const a = P.pickCat(s, ad(s)); if (!a) return null; const b = P.pickCat(s, (c) => ad(s)(c) && P.compat(a, c) < -1, [a.id]); return b ? { a: a.id, b: b.id } : null; },
    t: 'Eine unerwartete Freundschaft',
    x: (s, c) => `Ausgerechnet ${N(s, c.a)} und ${N(s, c.b)}, die sich sonst ständig anfauchen, wurden beim gemeinsamen Mäuse-Beobachten gesehen. Sie wirken fast verlegen.`,
    o: [
      { l: 'Sie zusammen arbeiten lassen', h: 'Ihre Freundschaft wächst', tg: ['care', 'change'], f: (s, c) => { P.relAdd(s, c.a, c.b, 50); return `${N(s, c.a)} und ${N(s, c.b)} werden echte Freunde. · ` + F(s, { coh: 3 }); } },
      { l: 'Beim Abendessen erwähnen', h: 'Alle schmunzeln', tg: ['festive'], f: (s, c) => { P.relAdd(s, c.a, c.b, 25); return F(s, { coh: 4, mood: 2 }); } },
      { l: 'Diskret nichts sagen', h: 'Ihre Sache', tg: ['free', 'cautious'], f: (s, c) => { P.relAdd(s, c.a, c.b, 35); return 'Ein stilles Lächeln.'; } },
    ] });

  D({ id: 'festival_idea', c: 'pos', st: [2, 6], w: 3, cd: 20, art: 'festival',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && (has(c, 'gesellig') || has(c, 'verspielt'))),
    t: 'Ein Fest ohne Anlass',
    x: (s, c) => `${N(s, c.a)} findet, dass man schon viel zu lange nicht mehr gemeinsam gefeiert hat. „Einfach so!“, ruft ${pr(s, c.a).er} und hängt bereits Wollgirlanden auf.`,
    o: [
      { l: 'Alle Arbeit ruht, wir feiern!', h: 'Zusammenhalt ↑↑, Vorrat ↓', tg: ['festive', 'free'], f: (s, c) => { s.festUntil = s.t + 5; wish(s, c.a, 'feast'); return F(s, { coh: 9, mood: 8, food: -10, com: 2 }); } },
      { l: 'Ein kleines Abendfest', h: 'Ausgewogen', tg: ['festive', 'frugal'], f: (s) => { s.festUntil = s.t + 2; return F(s, { coh: 4, mood: 4, food: -3 }); } },
      { l: 'Nach der Ernte feiern', h: 'Erst die Arbeit', tg: ['strict', 'build'], f: (s, c) => { P.moodAdd(s, c.a, -10); return F(s, { food: 5 }); } },
    ] });

  D({ id: 'gifted_kit', c: 'pers', st: [2, 6], w: 3, cd: 15, art: 'home',
    req: (s) => P.ctxA(s, (c) => P.ph(s, c) === 1),
    t: 'Eine außergewöhnliche Jungkatze',
    x: (s, c) => `${N(s, c.a)} ist noch jung, kann aber schon Knoten binden, Fischschwärme vorhersagen und alle Sterne beim Namen nennen. Die Ältesten tuscheln.`,
    o: [
      { l: 'Bei den Klügsten in die Lehre geben', h: 'Wissen, späteres Talent', tg: ['tradition', 'care'], f: (s, c) => { const k = P.cat(s, c.a); k.talent = 'Lehren'; P.addMem(s, k, 'Wurde früh in die Lehre gegeben.', 2); return F(s, { know: 15 }); } },
      { l: 'Frei erkunden lassen', h: 'Wird Entdecker:in, Erkundung', tg: ['free', 'curious'], f: (s, c) => { const k = P.cat(s, c.a); k.talent = 'Erkunden'; return F(s, { exp: 10, nat: 1 }); } },
      { l: 'Einen Platz im Rat der Jungen', h: 'Vertrauen, Gemeinschaftssinn', tg: ['change', 'open'], f: (s, c) => { P.moodAdd(s, c.a, 20); return F(s, { trust: 5, com: 2 }); } },
    ] });

  D({ id: 'glowworms', c: 'pos', st: [1, 6], w: 3, cd: 30, season: 1, art: 'night',
    t: 'Die Nacht der Glühwürmchen',
    x: () => `Über der Wiese tanzen tausende Glühwürmchen. Jungkatzen springen ihnen hinterher, die Alten liegen still im Gras und erzählen Geschichten.`,
    o: [
      { l: 'Die ganze Nacht draußen bleiben', h: 'Zusammenhalt, vielleicht Tradition', tg: ['festive', 'nature'], f: (s) => F(s, { coh: 5, nat: 1 }) + (P.chance(s, 0.5) ? P.addTrad(s, 'leuchtnacht', 'Nacht der Lichter', 'Im Sommer bleiben alle eine Nacht lang wach.') : '') },
      { l: 'Die Geschichten aufschreiben', h: 'Wissen', tg: ['tradition', 'curious'], f: (s) => F(s, { know: 12 }) },
      { l: 'Früh schlafen gehen', h: 'Ausgeruht arbeiten', tg: ['frugal', 'strict'], f: (s) => F(s, { food: 6 }) },
    ] });

  D({ id: 'stray_kit', c: 'pos', st: [1, 6], w: 3, cd: 18, art: 'forest',
    t: 'Ein Findelkind',
    x: () => `Unter einem Holunderbusch maunzt ein winziges, zerzaustes Kätzchen ganz allein. Weit und breit keine Mutter.`,
    o: [
      { l: 'Aufnehmen und großziehen', h: 'Neue Bewohnerin/neuer Bewohner', tg: ['care', 'generous'], f: (s) => { const k = P.newCat(s, { age: 1, origin: 'als Findelkind' }); P.addMem(s, k, 'Wurde als Findelkind unter einem Holunderbusch gefunden.', 3); const m = P.pickCat(s, (c) => ad(s)(c) && has(c, 'fürsorglich')) || P.pickCat(s, ad(s)); if (m) { P.relAdd(s, m, k, 60); P.addMem(s, m, `Kümmert sich um das Findelkind ${k.name}.`, 2); } return `${k.name} gehört jetzt zur Familie${m ? ', ' + m.name + ' kümmert sich' : ''}. · ` + F(s, { coh: 3 }); } },
      { l: 'Nach der Mutter suchen', h: 'Erkundung, vielleicht neue Freunde', tg: ['cautious', 'care'], f: (s) => { if (P.chance(s, 0.6)) return 'Die Mutter wird gefunden – und bleibt gleich mit: ' + P.newCats(s, 1, { sex: 'w', origin: 'als suchende Mutter' }).join('') + ' und ihr Kätzchen. · ' + P.newCats(s, 1, { age: 1 }).join(''); return F(s, { exp: 8 }) + ' · Keine Spur. Das Kätzchen bleibt trotzdem: ' + P.newCats(s, 1, { age: 1 }).join(''); } },
    ] });

  D({ id: 'return_lost', c: 'chain', st: [1, 6], art: 'visitors',
    req: (s, c) => { const k = P.cat(s, c.a); return k && k.away && !k.dead ? c : null; },
    t: 'Die Heimkehr',
    x: (s, c) => `Eine magere, aber strahlende Gestalt erscheint am Horizont: ${N(s, c.a)} ist von der großen Reise zurück! ${pr(s, c.a).Er} hat eine Karte aus Rindenstücken dabei und Geschichten für viele Abende.`,
    o: [
      { l: 'Ein Willkommensfest', h: 'Zusammenhalt ↑', tg: ['festive', 'care'], f: (s, c) => back(s, c) + F(s, { coh: 6, exp: 20 }) },
      { l: 'Die Karte sofort auswerten', h: 'Erkundung ↑↑', tg: ['curious'], f: (s, c) => back(s, c) + F(s, { exp: 45, know: 10 }) },
    ] });
  function back(s, c) {
    const k = P.cat(s, c.a); k.away = null; P.fulfillWish(s, k);
    P.addMem(s, k, 'Ist von einer großen Reise heimgekehrt.', 3);
    P.chron(s, 'pers', `${k.name} kehrt von der großen Reise zurück.`);
    return `${k.name} ist wieder zu Hause. · `;
  }

  // ───────────── Alltag & Humor ─────────────
  D({ id: 'sunspot_dispute', c: 'fun', st: [1, 6], w: 4, cd: 10, art: 'meadow',
    req: (s) => P.ctxAB(s, ad(s)),
    t: 'Streit um den besten Sonnenplatz',
    x: (s, c) => `${N(s, c.a)} und ${N(s, c.b)} liegen seit dem Morgen Rücken an Rücken auf demselben warmen Stein und weigern sich, auch nur einen Zentimeter nachzugeben. Das Fauchen wird lauter.`,
    o: [
      { l: 'Einen Sonnenplan aufstellen', h: 'Ordnung, Vertrauen', tg: ['strict', 'tradition'], f: (s, c) => { P.relAdd(s, c.a, c.b, 5); return F(s, { trust: 3 }); } },
      { l: 'Einen zweiten Sonnenplatz bauen', h: 'Kostet Holz, alle glücklich', tg: ['build', 'generous'], if: (s) => s.res.wood >= 2, f: (s, c) => { P.relAdd(s, c.a, c.b, 10); return F(s, { wood: -2 }) + P.qb(s, 'sunspot'); } },
      { l: 'Das regeln sie unter sich', h: 'Freundschaft – oder Rivalität', tg: ['free'], f: (s, c) => { if (P.chance(s, 0.5)) { P.relAdd(s, c.a, c.b, 30); return 'Am Abend liegen sie eng aneinandergekuschelt da.'; } P.relAdd(s, c.a, c.b, -30); return 'Seitdem gehen sich die beiden aus dem Weg.'; } },
    ] });

  D({ id: 'thief', c: 'fun', st: [1, 6], w: 3, cd: 14, art: 'night',
    t: 'Der nächtliche Fischdieb',
    x: () => `Jeden Morgen fehlen Fische am Futterplatz. Nur nasse Pfotenabdrücke führen zum Bach – und eine Spur Schuppen.`,
    o: [
      { l: 'Eine Nachtwache aufstellen', h: 'Vertrauen, etwas müde Katzen', tg: ['strict', 'cautious'], f: (s) => F(s, { trust: 4, food: 4 }) + ' · Der Dieb war ein frecher Waschbär. Er kommt nicht wieder.' },
      { l: 'Eine Wollfalle bauen', h: 'Lustig!', tg: ['curious', 'festive'], f: (s) => { const c = P.pickCat(s, ad(s)); if (c) P.addMem(s, c, 'Hat sich nachts in der eigenen Wollfalle verfangen.', 1); return `Gefangen wurde: ${c ? c.name : 'jemand'} – auf dem Rückweg vom Mitternachtssnack. Alle lachen tagelang. · ` + F(s, { coh: 4 }); } },
      { l: 'Wer Hunger hat, darf nehmen', h: 'Gemeinschaftssinn', tg: ['generous', 'care'], f: (s) => F(s, { com: 2, food: -4, coh: 2 }) },
    ] });

  D({ id: 'box', c: 'fun', st: [1, 6], w: 4, cd: 12, art: 'meadow',
    t: 'Die riesige Schachtel',
    x: () => `Der Wind hat eine gewaltige Kartonschachtel ins Tal geweht. Innerhalb weniger Minuten sitzen bereits sieben Katzen darin. Gleichzeitig.`,
    o: [
      { l: 'Ein Wettbewerb: Wer passt noch rein?', h: 'Spaß, Zusammenhalt', tg: ['festive'], f: (s) => F(s, { coh: 5, mood: 6 }) + ' · Rekord: 13 Katzen.' },
      { l: 'Sorgfältig zerlegen', h: 'Karton', tg: ['frugal', 'build'], f: (s) => F(s, { cardboard: 12 }) },
      { l: 'Als Kuschelbau aufstellen', h: 'Neue Schlafstätte', tg: ['care'], f: (s) => P.qb(s, 'den').replace(' · ', '') || 'Kein Platz frei.' },
    ] });

  D({ id: 'mirror', c: 'fun', st: [2, 6], w: 3, cd: 25, art: 'ruins',
    req: (s) => P.ctxA(s, ad(s)),
    t: 'Die Katze im Spiegel',
    x: (s, c) => `${N(s, c.a)} hat eine Spiegelscherbe gefunden und faucht seit einer Stunde die „fremde Katze“ darin an. Inzwischen schauen alle zu.`,
    o: [
      { l: 'Das Geheimnis erklären', h: 'Wissen', tg: ['curious'], f: (s) => F(s, { know: 6 }) },
      { l: 'Der eitelsten Katze schenken', h: 'Jemand wird sehr glücklich', tg: ['prestige'], f: (s) => { const v = P.pickCat(s, (c) => has(c, 'eitel')) || P.pickCat(s, ad(s)); P.moodAdd(s, v, 25); return `${v.name} putzt sich jetzt fünfmal täglich vor dem Spiegel.`; } },
      { l: 'Als Lichtfänger aufhängen', h: 'Hübsch, Zusammenhalt', tg: ['festive', 'nature'], f: (s) => F(s, { coh: 3 }) + ' · Lichtflecken tanzen über den Platz – perfekt zum Jagen.' },
    ] });

  D({ id: 'lazy_fisher', c: 'fun', st: [1, 6], w: 3, cd: 18, art: 'river',
    req: (s) => P.ctxA(s, (c) => c.job === 'fisher' && (has(c, 'gemütlich') || c.weak === 'Langschläfer')) || P.ctxA(s, (c) => c.job === 'fisher'),
    t: 'Im Schlaf gefangen',
    x: (s, c) => `${N(s, c.a)} ist am Steg eingeschlafen, die Pfote im Wasser. Als ${pr(s, c.a).er} aufwacht, hat sich ein dicker Karpfen in ${pr(s, c.a).seine} Krallen verirrt.`,
    o: [
      { l: 'Den Mittagsschlaf zur Tradition erklären', h: 'Gemütlichkeit, Stimmung', tg: ['free', 'festive'], f: (s) => F(s, { mood: 5, food: 4 }) + (P.chance(s, 0.4) ? P.addTrad(s, 'siesta', 'Große Mittagsruhe', 'Zur Mittagszeit schlafen alle – sogar die Fische.') : '') },
      { l: 'Ein Lob, aber bitte wach bleiben', h: 'Futter', tg: ['strict'], f: (s) => F(s, { food: 6 }) },
      { l: 'Die Methode erforschen', h: 'Wissen', tg: ['curious'], f: (s) => F(s, { know: 6, food: 3 }) + ' · Ergebnis: Funktioniert nur bei sehr gemütlichen Katzen.' },
    ] });

  D({ id: 'kit_prank', c: 'fun', st: [2, 6], w: 3, cd: 14, art: 'home',
    req: (s) => P.ctxA(s, (c) => P.ph(s, c) <= 1),
    t: 'Wo ist die Wolle?',
    x: (s, c) => `Über Nacht ist sämtliche Wolle verschwunden. Eine verdächtig zufriedene ${N(s, c.a)} sitzt auf einem auffällig weichen Hügel.`,
    o: [
      { l: 'Schatzsuche für alle!', h: 'Spaß', tg: ['festive', 'free'], f: (s) => F(s, { coh: 4, mood: 4 }) },
      { l: 'Strenges Wort beim Abendessen', h: 'Ordnung', tg: ['strict'], f: (s, c) => { P.moodAdd(s, c.a, -10); return F(s, { trust: 1 }); } },
      { l: 'Das Talent fördern: Verstecken!', h: 'Wird später Entdecker:in', tg: ['curious'], f: (s, c) => { P.cat(s, c.a).talent = 'Erkunden'; return F(s, { exp: 4 }); } },
    ] });

  D({ id: 'yarn_chaos', c: 'fun', st: [3, 6], w: 3, cd: 20, art: 'workshop',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && (has(c, 'chaotisch') || c.job === 'crafter')),
    t: 'Explosion in der Wollwerkstatt',
    x: (s, c) => `Ein lauter Knall – dann regnet es bunte Fäden. ${N(s, c.a)}s neue Spinnmaschine hat sich verheddert, und das halbe Dorf ist jetzt in Wolle gehüllt.`,
    o: [
      { l: 'Zum Kunstwerk erklären', h: 'Gemeinschaftssinn, Stimmung', tg: ['festive', 'change'], f: (s) => F(s, { com: 2, mood: 5 }) },
      { l: 'Großer Aufräumtag', h: 'Zusammenhalt, Wolle', tg: ['build', 'care'], f: (s) => F(s, { coh: 4, wool: 6 }) },
      { l: 'Eine größere Werkstatt bauen', h: 'Neue Werkstatt', tg: ['build', 'prestige'], if: (s) => P.canAfford(s, P.BUILD.workshop.cost), f: (s) => { P.placeBuilding(s, 'workshop'); return 'Baustelle: Wollknäuelwerkstatt'; } },
    ] });

  D({ id: 'cuddle_pile', c: 'fun', st: [1, 6], w: 3, cd: 20, season: 3, art: 'winter',
    t: 'Der große Kuschelhaufen',
    x: () => `In der kältesten Nacht des Winters bilden alle Katzen einen einzigen, schnurrenden Fellberg. Morgens weiß niemand mehr, welcher Schwanz zu wem gehört.`,
    o: [
      { l: 'Jedes Jahr wiederholen!', h: 'Tradition', tg: ['tradition', 'festive'], f: (s) => F(s, { coh: 6 }) + P.addTrad(s, 'kuschel', 'Nacht des Kuschelbergs', 'In der kältesten Winternacht schlafen alle zusammen.') },
      { l: 'Ein warmes Lob für alle', h: 'Stimmung', tg: ['care'], f: (s) => F(s, { mood: 6, coh: 3 }) },
    ] });

  D({ id: 'crow_trade', c: 'fun', st: [3, 6], w: 3, cd: 16, art: 'meadow',
    t: 'Krähen mit Glitzerkram',
    x: () => `Zwei Krähen landen am Futterplatz. Sie legen Muscheln und glänzende Knöpfe ab und starren eindringlich auf die Fische.`,
    o: [
      { l: 'Fisch gegen Glitzer tauschen', h: 'Muscheln, Handelsgeist', tg: ['open'], f: (s) => F(s, { food: -8, shells: 12, trade: 2 }) },
      { l: 'Freundschaft schließen', h: 'Späher in der Luft: Erkundung', tg: ['generous', 'curious'], f: (s) => { P.flag(s, 'crows'); return F(s, { food: -4, exp: 15 }) + ' · Die Krähen melden jetzt, was sie sehen.'; } },
      { l: 'Verscheuchen', h: 'Fische bleiben hier', tg: ['closed', 'bold'], f: (s) => 'Die Krähen ziehen beleidigt ab.' },
    ] });

  // ───────────── Persönliche Geschichten ─────────────
  D({ id: 'romance', c: 'pers', st: [1, 6], w: 3, cd: 10, art: 'night',
    req: (s) => { const a = P.pickCat(s, (c) => ad(s)(c) && !c.partner); if (!a) return null; const b = P.pickCat(s, (c) => ad(s)(c) && !c.partner && c.sex !== a.sex && !a.parents.includes(c.id) && !c.parents.includes(a.id), [a.id]); return b ? { a: a.id, b: b.id } : null; },
    t: 'Schnurren unter dem Mond',
    x: (s, c) => `${N(s, c.a)} und ${N(s, c.b)} sitzen jeden Abend nebeneinander auf dem höchsten Ast. Heute fragen sie, ob die Gemeinschaft ihren Bund feiern möchte.`,
    o: [
      { l: 'Ein feierlicher Schnurrbund', h: 'Fest, Tradition möglich', tg: ['festive', 'tradition'], f: (s, c) => pair(s, c) + F(s, { coh: 4 }) + (P.chance(s, 0.6) ? P.addTrad(s, 'schnurrbund', 'Der Schnurrbund', 'Paare werden unter dem Mond mit einem Fest geehrt.') : '') },
      { l: 'Still und glücklich', h: 'Ihre Privatsache', tg: ['free', 'care'], f: (s, c) => pair(s, c) },
    ] });
  function pair(s, c) {
    const a = P.cat(s, c.a), b = P.cat(s, c.b);
    if (!a || !b) return '';
    a.partner = b.id; b.partner = a.id; P.relAdd(s, a, b, 60);
    P.addMem(s, a, `Hat den Bund mit ${b.name} geschlossen.`, 3); P.addMem(s, b, `Hat den Bund mit ${a.name} geschlossen.`, 3);
    P.chron(s, 'fam', `${a.name} und ${b.name} schließen den Bund.`);
    return `${a.name} und ${b.name} sind ein Paar. · `;
  }

  D({ id: 'wanderlust', c: 'pers', st: [2, 6], w: 3, cd: 25, art: 'visitors',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && !c.founder && (has(c, 'mutig') || has(c, 'neugierig') || c.job === 'explorer')),
    t: 'Fernweh',
    x: (s, c) => `${N(s, c.a)} kann nicht mehr schlafen. „Hinter den Hügeln liegt die Welt“, sagt ${pr(s, c.a).er}. ${pr(s, c.a).Er} möchte für lange Zeit auf große Reise gehen.`,
    o: [
      { l: 'Mit Segen ziehen lassen', h: 'Kommt eines Tages zurück – mit Wissen', tg: ['free', 'bold'], f: (s, c) => { const k = P.cat(s, c.a); k.away = P.day(s); k.wish = 'explore'; P.sched(s, 'return_lost', P.rf(s, 6, 14), { a: c.a }); P.chron(s, 'pers', `${k.name} bricht zu einer großen Reise auf.`); return `${k.name} winkt ein letztes Mal vom Hügel.`; } },
      { l: 'Bitten zu bleiben', h: 'Bleibt – aber traurig', tg: ['cautious', 'closed'], f: (s, c) => { P.moodAdd(s, c.a, -25); return `${N(s, c.a)} bleibt, schaut aber oft zum Horizont.`; } },
      { l: 'Eine kurze Erkundungsreise vorschlagen', h: 'Erkundung, Kompromiss', tg: ['care', 'curious'], f: (s, c) => { P.moodAdd(s, c.a, 10); return F(s, { exp: 18 }); } },
    ] });

  D({ id: 'elder_story', c: 'pers', st: [2, 6], w: 3, cd: 20, art: 'night',
    req: (s) => P.ctxA(s, (c) => P.ph(s, c) === 3) || (s.stage >= 2 ? P.ctxA(s, (c) => c.founder && !c.dead) : null),
    t: 'Erzählungen am Abend',
    x: (s, c) => `${N(s, c.a)} möchte den Jungen erzählen, wie alles begann: von der Wanderung, ${s.flags.home === 'bach' ? 'dem Bach' : s.flags.home === 'sonne' ? 'der sonnigen Anhöhe' : 'der alten Weide'} und den ersten Nächten unter freiem Himmel.`,
    o: [
      { l: 'Ein Gründertag für alle', h: 'Tradition, Zusammenhalt', tg: ['tradition', 'festive'], f: (s, c) => wish(s, c.a, 'teach') + F(s, { coh: 5 }) + P.addTrad(s, 'gruendertag', 'Gründertag', 'Jedes Jahr wird die Geschichte der Gründung erzählt.') },
      { l: 'Die Geschichte in Rinde ritzen', h: 'Wissen, Chronik', tg: ['curious', 'tradition'], f: (s, c) => wish(s, c.a, 'teach') + F(s, { know: 18 }) },
      { l: 'Nur im kleinen Kreis', h: 'Persönliche Nähe', tg: ['care'], f: (s, c) => { const k = P.pickCat(s, (x) => P.ph(s, x) <= 1); if (k) { P.relAdd(s, c.a, k, 40); P.addMem(s, k, `Hat ${N(s, c.a)}s Geschichten gehört.`, 2); } return 'Leuchtende Augen am Feuer.'; } },
    ] });

  D({ id: 'vain_builder', c: 'pers', st: [2, 6], w: 3, cd: 30, art: 'workshop',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && (has(c, 'eitel') || has(c, 'ehrgeizig'))),
    t: 'Ein Denkmal für mich?',
    x: (s, c) => `${N(s, c.a)} hat Pläne gezeichnet: eine riesige Kartonstatue – von ${pr(s, c.a).ihm} selbst, natürlich. „Für die Moral!“`,
    o: [
      { l: 'Erlauben', h: 'Glückliche Katze, andere neidisch', tg: ['prestige', 'free'], f: (s, c) => { P.moodAdd(s, c.a, 30); const o = P.pickCat(s, ad(s), [c.a]); if (o) P.relAdd(s, c.a, o, -20); wish(s, c.a, 'famous'); return F(s, { cardboard: -6, coh: -2 }) + P.qb(s, 'sunspot', { name: `${N(s, c.a)}s Statue`, honor: c.a }); } },
      { l: 'Lieber eine Statue der Gründer', h: 'Würdigt die Gründerkatzen', tg: ['tradition', 'care'], f: (s, c) => { P.moodAdd(s, c.a, 5); return F(s, { coh: 4, com: 1 }) + ' · Die Idee wird für später vorgemerkt.'; } },
      { l: 'Ablehnen', h: 'Kränkung', tg: ['strict', 'frugal'], f: (s, c) => { P.moodAdd(s, c.a, -20); return `${N(s, c.a)} schmollt hinter dem Lager.`; } },
    ] });

  D({ id: 'shy_inventor', c: 'pers', st: [3, 6], w: 3, cd: 25, art: 'workshop',
    req: (s) => P.ctxA(s, (c) => ad(s)(c) && has(c, 'schüchtern')),
    t: 'Eine leise Idee',
    x: (s, c) => `${N(s, c.a)} hat heimlich ein Modell gebaut: ein Laufsteg, der Häuser miteinander verbindet. Aber ${pr(s, c.a).er} traut sich nicht, es vorzustellen.`,
    o: [
      { l: 'Vor allen loben und vorstellen', h: 'Mut, Erfindergeist', tg: ['bold', 'festive'], f: (s, c) => { P.moodAdd(s, c.a, 20); P.addMem(s, c.a, 'Hat zum ersten Mal vor allen gesprochen.', 3); wish(s, c.a, 'invent'); return F(s, { inv: 3, know: 10 }); } },
      { l: 'Unter vier Augen ermutigen', h: 'Vertrauen', tg: ['care', 'cautious'], f: (s, c) => { P.moodAdd(s, c.a, 12); return F(s, { trust: 4, inv: 1 }); } },
      { l: 'Eine eigene kleine Werkstatt geben', h: 'Werkstatt', tg: ['build', 'generous'], if: (s) => s.res.wood >= 12, f: (s, c) => { wish(s, c.a, 'invent'); P.placeBuilding(s, s.stage >= 4 ? 'tinker' : 'workshop', { free: false }); return `Baustelle für ${N(s, c.a)}s Werkstatt.`; } },
    ] });

  D({ id: 'twins', c: 'pers', st: [2, 6], w: 2, cd: 25, art: 'home',
    req: (s) => { const k = P.pickCat(s, (c) => P.ph(s, c) === 0 && c.parents.length); return k ? { a: k.id } : null; },
    t: 'Ein besonderes Kätzchen',
    x: (s, c) => `Das kleine ${N(s, c.a)} hat dieselbe Zeichnung wie eine Gründerkatze: dasselbe Muster, dieselben Augen. Die Ältesten sind gerührt.`,
    o: [
      { l: 'Nach der Gründerkatze benennen', h: 'Das Erbe lebt weiter', tg: ['tradition'], f: (s, c) => { const k = P.cat(s, c.a); const f = s.cats.find((x) => x.founder); if (f) { k.name = f.name + (k.sex === 'w' ? ' die Jüngere' : ' der Jüngere'); k.look.fur = f.look.fur; k.look.pat = f.look.pat; k.look.pc = f.look.pc; k.story += ` Trägt den Namen von ${f.name}.`; P.chron(s, 'fam', `Ein Kätzchen erhält den Namen der Gründerkatze ${f.name}.`); } return F(s, { coh: 4 }); } },
      { l: 'Den eigenen Namen behalten', h: 'Jede Katze ist einzigartig', tg: ['free', 'change'], f: (s) => F(s, { com: 1 }) },
    ] });

  D({ id: 'rival_reconcile', c: 'pers', st: [2, 6], w: 3, cd: 14, art: 'meadow',
    req: (s) => { for (const a of P.shuffle(s, P.adults(s)).slice(0, 30)) { for (const id in a.rel) { if (a.rel[id] < -35 && P.alivePred(s, +id)) return { a: a.id, b: +id }; } } return null; },
    t: 'Alte Rivalen',
    x: (s, c) => `${N(s, c.a)} und ${N(s, c.b)} können sich nicht ausstehen. Heute ist ein Wollknäuel zum Streitobjekt geworden – und das ganze Viertel hört zu.`,
    o: [
      { l: 'Vermitteln', h: 'Vertrauen, Versöhnung möglich', tg: ['care'], f: (s, c) => { if (P.chance(s, 0.6)) { P.relAdd(s, c.a, c.b, 45); return 'Sie reichen sich die Pfote. Fast.'; } P.relAdd(s, c.a, c.b, 15); return F(s, { trust: 2 }) + ' · Immerhin ein Waffenstillstand.'; } },
      { l: 'Ein fairer Wettstreit', h: 'Unterhaltsam', tg: ['bold', 'festive'], f: (s, c) => { const w = P.chance(s, 0.5) ? c.a : c.b; P.moodAdd(s, w, 15); P.relAdd(s, c.a, c.b, 10); return `${N(s, w)} gewinnt das Kletterrennen. Respekt auf beiden Seiten.` + ' · ' + F(s, { coh: 2 }); } },
      { l: 'In verschiedene Viertel umziehen', h: 'Ruhe', tg: ['strict', 'cautious'], f: (s) => F(s, { coh: 1 }) },
    ] });

  D({ id: 'founder_wish', c: 'pers', st: [2, 6], w: 4, cd: 30, art: 'meadow',
    req: (s) => P.ctxA(s, (c) => c.founder && !c.dead && P.ph(s, c) === 3),
    t: (s, c) => `${N(s, c.a)}s letzter großer Wunsch`,
    x: (s, c) => `Gründerkatze ${N(s, c.a)} ist alt geworden. Beim Sonnenbad sagt ${pr(s, c.a).er} leise: „Ich möchte, dass etwas von mir bleibt, wenn ich nicht mehr da bin.“`,
    o: [
      { l: 'Ein Gebäude nach ihr/ihm benennen', h: 'Für immer in der Stadt', tg: ['tradition', 'prestige'], f: (s, c) => { const b = s.b.filter((x) => x.prog >= 1 && !x.name && x.type !== 'bridge').sort((x, y) => (P.BUILD[y.type].work) - (P.BUILD[x.type].work))[0]; const cat = P.cat(s, c.a); P.fulfillWish(s, cat); if (b) { b.name = `${cat.name}s ${P.bName(b)}`; b.honor = cat.id; s.worldDirty = true; P.chron(s, 'pers', `${P.bName(b)} wird nach Gründerkatze ${cat.name} benannt.`); return `Ab heute heißt es: ${b.name}.`; } return 'Ein Platz wird nach ' + cat.name + ' benannt.'; } },
      { l: 'Das Wissen weitergeben', h: 'Wissen, ein Lehrling', tg: ['care', 'tradition'], f: (s, c) => { const k = P.pickCat(s, (x) => P.ph(s, x) === 1) || P.pickCat(s, ad(s), [c.a]); if (k) { k.talent = P.cat(s, c.a).talent; P.relAdd(s, c.a, k, 50); P.addMem(s, k, `Ist Lehrling der Gründerkatze ${N(s, c.a)}.`, 3); } return F(s, { know: 25 }) + (k ? ` · ${k.name} wird ${N(s, c.a)}s Lehrling.` : ''); } },
      { l: 'Einen Baum pflanzen', h: 'Naturverbundenheit', tg: ['nature'], f: (s, c) => { P.cat(s, c.a).tree = 1; return F(s, { nat: 2, coh: 3 }) + ` · Die „${N(s, c.a)}-Linde“ wächst am Platz.`; } },
    ] });

  D({ id: 'star_student', c: 'pers', st: [4, 6], w: 3, cd: 20, art: 'workshop',
    req: (s) => { if (!P.countB(s, 'school', true)) return null; return P.ctxAB(s, (c) => P.ph(s, c) === 1 || (ad(s)(c) && c.job !== 'scholar'), (c) => c.job === 'scholar'); },
    t: 'Die Schülerin übertrifft den Lehrer',
    x: (s, c) => `In der Pfotenschule hat ${N(s, c.a)} eine Rechenweise für Fischvorräte entdeckt, die ${N(s, c.b)} selbst nie verstanden hat. Die Klasse ist still.`,
    o: [
      { l: 'Zur Lehrkraft befördern', h: 'Wissen ↑', tg: ['change', 'prestige'], f: (s, c) => { const a = P.cat(s, c.a); a.talent = 'Lehren'; P.moodAdd(s, c.b, -8); return F(s, { know: 25 }); } },
      { l: 'Gemeinsam forschen lassen', h: 'Beziehung, Wissen', tg: ['care', 'curious'], f: (s, c) => { P.relAdd(s, c.a, c.b, 40); return F(s, { know: 18, coh: 2 }); } },
    ] });

  // ───────────── Entdeckungen ─────────────
  D({ id: 'storm_tunnels', c: 'disc', st: [2, 6], w: 3, cd: 50, once: 1, season: [2, 3], art: 'storm',
    t: 'Der Sturm legt alte Tunnel frei',
    x: () => `Nach einer Sturmnacht ist am Hang die Erde abgerutscht. Darunter: gemauerte Gänge, viel älter als jede Katzenerinnerung. Ein kühler Luftzug weht heraus.`,
    o: [
      { l: 'Vorsichtig erkunden', h: 'Entdeckungen – eine Geschichte beginnt', tg: ['curious', 'bold'], f: (s) => { P.sched(s, 'tunnel_deep', P.rf(s, 2, 4), {}); return F(s, { cardboard: 10, exp: 12 }) + ' · Tief drinnen hört man ein Summen…'; } },
      { l: 'Zum Unterschlupf ausbauen', h: 'Wohnraum', tg: ['build', 'cautious'], f: (s) => P.qb(s, 'tunnel').replace(' · ', '') || 'Kein geeigneter Platz.' },
      { l: 'Sicher verschließen', h: 'Ruhe', tg: ['cautious', 'closed'], f: (s) => F(s, { trust: 2 }) },
    ] });
  D({ id: 'tunnel_deep', c: 'chain', st: [2, 6], art: 'ruins', t: 'Im Herzen der Tunnel',
    x: () => `Das Summen kommt aus einer Kammer voller verstaubter Zahnräder – und daneben wächst im Licht eines Schachts ein unterirdischer Garten mit seltsamen Blüten.`,
    o: [
      { l: 'Die Maschinen studieren', h: 'Erfindergeist ↑↑', tg: ['curious', 'change'], f: (s) => { P.flag(s, 'machines'); return F(s, { inv: 5, know: 30 }); } },
      { l: 'Den Garten hinaustragen', h: 'Naturverbundenheit ↑↑', tg: ['nature', 'care'], f: (s) => { P.flag(s, 'greenhouse'); return F(s, { nat: 5, catnip: 10 }); } },
      { l: 'Alles als Erbe bewahren', h: 'Tradition, Zusammenhalt', tg: ['tradition'], f: (s) => F(s, { coh: 6, com: 2 }) + P.addTrad(s, 'tunnelgang', 'Gang durch die alten Tunnel', 'Jungkatzen besuchen einmal die Tunnel ihrer Vorfahren.') },
    ] });

  D({ id: 'greenhouse_find', c: 'disc', st: [3, 6], w: 3, cd: 60, once: 1, art: 'ruins',
    req: (s) => P.ctxA(s, (c) => c.job === 'explorer') || P.ctxA(s, (c) => ad(s)(c) && has(c, 'neugierig')),
    t: 'Das verlassene Gewächshaus',
    x: (s, c) => `${N(s, c.a)} hat hinter dem Wald ein halb eingestürztes Glashaus gefunden. Drinnen ist es warm, und Ranken hängen von der Decke.`,
    o: [
      { l: 'Wieder zum Blühen bringen', h: 'Gewächshäuser freigeschaltet', tg: ['nature', 'build'], f: (s) => { P.flag(s, 'greenhouse'); return F(s, { nat: 4, catnip: 8 }) + ' · Gärtner können jetzt Gewächshäuser bauen.'; } },
      { l: 'Glas bergen und tauschen', h: 'Muscheln, Handelsgeist', tg: ['open', 'frugal'], f: (s) => F(s, { shells: 20, trade: 3 }) },
      { l: 'Den Erfindern überlassen', h: 'Erfindergeist', tg: ['curious'], f: (s) => F(s, { inv: 3, know: 20 }) },
    ] });

  D({ id: 'old_map', c: 'disc', st: [2, 6], w: 2, cd: 40, art: 'ruins',
    req: (s) => (s.regions.length < P.REGION_KEYS.length ? P.ctxA(s, ad(s)) : null),
    t: 'Eine Karte im Baumstamm',
    x: (s, c) => `Im hohlen Stamm einer Eiche findet ${N(s, c.a)} eine verwitterte Karte mit Pfotenzeichen. Sie zeigt Wege, die niemand kennt.`,
    o: [
      { l: 'Sofort eine Expedition starten', h: 'Erkundung ↑↑', tg: ['bold', 'curious'], f: (s) => F(s, { exp: 35, food: -6 }) },
      { l: 'Kopieren und in der Schule lehren', h: 'Wissen', tg: ['tradition', 'curious'], f: (s) => F(s, { know: 20, exp: 10 }) },
    ] });

  D({ id: 'sandbath', c: 'disc', st: [1, 6], w: 2, cd: 40, once: 1, art: 'meadow',
    t: 'Der warme Sand',
    x: () => `Am Ufer wurde eine Stelle mit feinem, sonnenwarmem Sand entdeckt. Erste Katzen wälzen sich bereits darin.`,
    o: [
      { l: 'Ein Sonnenbad für alle anlegen', h: 'Sonnenplatz, Stimmung', tg: ['festive', 'nature'], f: (s) => F(s, { mood: 4 }) + P.qb(s, 'sunspot', { name: 'Sandbad' }) },
      { l: 'Sand zum Bauen nutzen', h: 'Material', tg: ['build', 'frugal'], f: (s) => F(s, { wood: 4, cardboard: 4 }) },
    ] });

  // ───────────── Gesellschaft ─────────────
  D({ id: 'clan_asks', c: 'soc', st: [2, 6], w: 3, cd: 20, art: 'visitors',
    t: 'Ein fremder Clan bittet um Aufnahme',
    x: () => `Ein müder Clan aus dem Moor steht am Rand des Tals: Ältere, Mütter mit Kätzchen, ein paar kräftige Fischer. Ihr Revier wurde überflutet.`,
    o: [
      { l: 'Alle aufnehmen', h: 'Viele neue Bewohner, Futter knapp', tg: ['open', 'generous', 'care'], f: (s) => { const n = P.newCats(s, P.ri(s, 4, 6), { origin: 'aus dem Moorclan', mem: 'Floh vor der Flut aus dem Moor.' }); P.flag(s, 'moorclan'); P.sched(s, 'moor_customs', P.rf(s, 5, 10), {}); return `Willkommen: ${n.join(', ')} · ` + F(s, { food: -12, trade: 2, com: 2, coh: -3 }); } },
      { l: 'Nur Alte und Kätzchen', h: 'Fürsorge mit Maß', tg: ['care', 'cautious'], f: (s) => { const n = P.newCats(s, 1, { age: 1, origin: 'aus dem Moorclan' }).concat(P.newCats(s, 1, { age: 110, origin: 'aus dem Moorclan' })); return `Aufgenommen: ${n.join(', ')} · ` + F(s, { com: 1, food: -4 }); } },
      { l: 'Proviant geben, aber weiterschicken', h: 'Vorrat ↓, Ruf gewahrt', tg: ['generous', 'closed'], f: (s) => F(s, { food: -10, trust: 1 }) },
      { l: 'Handel statt Aufnahme anbieten', h: 'Handelsgeist', tg: ['open', 'frugal'], if: (s) => s.stage >= 3, f: (s) => F(s, { trade: 3, shells: 10, food: -5 }) },
    ] });
  D({ id: 'moor_customs', c: 'chain', st: [2, 6], art: 'festival', t: 'Die Bräuche des Moorclans',
    x: () => `Die Neuankömmlinge aus dem Moor singen nachts, wenn der Nebel aufsteigt. Einige Alteingesessene finden das wunderschön, andere können nicht schlafen.`,
    o: [
      { l: 'Den Nebelgesang übernehmen', h: 'Neue Tradition, Gemeinschaft', tg: ['open', 'festive', 'change'], f: (s) => F(s, { com: 3, coh: 4 }) + P.addTrad(s, 'nebelgesang', 'Nebelgesang', 'Eine Tradition des Moorclans, die alle übernommen haben.') },
      { l: 'Ein eigenes Moorviertel', h: 'Eigenständigkeit, Vielfalt', tg: ['free', 'open'], f: (s) => { s.districts.push({ n: 'Moorviertel', k: 'home' }); return F(s, { trade: 2, coh: 1 }); } },
      { l: 'Um Ruhe nach Mitternacht bitten', h: 'Kompromiss', tg: ['strict'], f: (s) => F(s, { trust: 2, coh: -1 }) },
    ] });

  D({ id: 'riverbank', c: 'soc', st: [3, 6], w: 3, cd: 40, art: 'river',
    req: (s) => P.ctxAB(s, (c) => c.job === 'fisher', (c) => c.job === 'builder'),
    t: 'Wem gehört das Flussufer?',
    x: (s, c) => `${N(s, c.a)} will das Ufer für die Fischerei freihalten. ${N(s, c.b)} möchte dort eine breite Kaimauer mit Laufstegen bauen. Beide haben gute Gründe.`,
    o: [
      { l: 'Ein Schutzgebiet für Fische', h: 'Futter, Naturverbundenheit', tg: ['nature', 'tradition'], f: (s, c) => { P.moodAdd(s, c.a, 15); P.moodAdd(s, c.b, -10); s.flags.reserve = 1; return F(s, { nat: 3, food: 10 }); } },
      { l: 'Die Kaimauer bauen', h: 'Infrastruktur, Handelsgeist', tg: ['build', 'change'], f: (s, c) => { P.moodAdd(s, c.b, 15); P.moodAdd(s, c.a, -10); s.flags.quay = 1; return F(s, { trade: 2, inv: 1, wood: -8 }) + P.qb(s, 'jetty', { name: 'Kaimauer' }); } },
      { l: 'Einen Kompromiss aushandeln', h: 'Vertrauen', tg: ['care'], f: (s, c) => { P.relAdd(s, c.a, c.b, 20); return F(s, { trust: 5, coh: 2 }); } },
    ] });

  D({ id: 'tradition_question', c: 'soc', st: [4, 6], w: 3, cd: 30, art: 'festival',
    req: (s) => { if (!s.trad.length) return null; const k = P.pickCat(s, (c) => P.ph(s, c) <= 2 && c.gen >= 1 && P.ph(s, c) >= 1); return k ? { a: k.id, tr: P.pick(s, s.trad).k } : null; },
    t: 'Die neue Generation fragt: Warum?',
    x: (s, c) => `${N(s, c.a)} und andere Jungkatzen stellen die Tradition „${(s.trad.find((t) => t.k === c.tr) || {}).n}“ infrage. „Das macht man nur, weil man es schon immer so gemacht hat!“`,
    o: [
      { l: 'Die Tradition bewahren', h: 'Zusammenhalt, Jüngere murren', tg: ['tradition', 'strict'], f: (s, c) => { P.moodAdd(s, c.a, -10); return F(s, { coh: 4, trust: -2 }); } },
      { l: 'Gemeinsam neu gestalten', h: 'Gemeinschaftssinn, Erneuerung', tg: ['change', 'open'], f: (s, c) => { const t = s.trad.find((x) => x.k === c.tr); if (t) t.n = t.n + ' (neu)'; return F(s, { com: 2, inv: 1, coh: 2 }); } },
      { l: 'Freiwillig machen', h: 'Freiheit', tg: ['free'], f: (s) => F(s, { mood: 3, coh: -2 }) },
    ] });

  D({ id: 'trade_contact', c: 'rare', st: [3, 6], w: 3, cd: 80, once: 1, art: 'market',
    t: 'Händler vom großen Fluss',
    x: () => `Ein Floß aus Karton legt an. Darauf: geschniegelte Händlerkatzen aus einer fernen Stadt mit Muscheln, Gewürzen und Fäden in Farben, die hier niemand je gesehen hat.`,
    o: [
      { l: 'Eine Handelsroute eröffnen', h: 'Handelsgeist ↑↑, Muscheln', tg: ['open', 'change'], f: (s) => { P.flag(s, 'traderoute'); P.sched(s, 'caravan', P.rf(s, 6, 12), {}); return F(s, { trade: 5, shells: 25 }); } },
      { l: 'Ein einmaliger Tausch', h: 'Vorsichtig', tg: ['cautious'], f: (s) => F(s, { shells: 10, wool: 8, food: -10 }) },
      { l: 'Höflich ablehnen', h: 'Eigenständigkeit', tg: ['closed', 'tradition'], f: (s) => F(s, { coh: 3, nat: 1 }) },
    ] });
  D({ id: 'caravan', c: 'chain', st: [3, 6], art: 'market', t: 'Die Karawane kehrt zurück',
    req: (s, c) => (s.flags.traderoute ? c : null),
    x: () => `Die Flusshändler sind wieder da – diesmal mit drei Flößen. Sie fragen, ob sie dauerhaft einen Stand in der Stadt bekommen können.`,
    o: [
      { l: 'Einen festen Markt einrichten', h: 'Fischmarkt-Baustelle', tg: ['open', 'build'], f: (s) => F(s, { trade: 3 }) + P.qb(s, 'market') },
      { l: 'Nur zu Festzeiten', h: 'Tradition', tg: ['tradition'], f: (s) => F(s, { shells: 15 }) + P.addTrad(s, 'marktfest', 'Flussmarkt', 'Zu jedem Jahreszeitenwechsel kommen die Flusshändler.') },
      { l: 'Einige Händler aufnehmen', h: 'Neue Bewohner', tg: ['open'], f: (s) => 'Neu: ' + P.newCats(s, 2, { talent: 'Handeln', origin: 'vom großen Fluss' }).join(', ') },
    ] });

  D({ id: 'council_lead', c: 'soc', st: [3, 6], w: 3, cd: 40, art: 'festival',
    req: (s) => (P.countB(s, 'council', true) ? P.ctxAB(s, (c) => ad(s)(c) && (c.founder || c.gen >= 1), (c) => ad(s)(c) && (has(c, 'weise') || has(c, 'ehrgeizig'))) : null),
    t: 'Wer spricht für den Rat?',
    x: (s, c) => `Der Katzenrat braucht eine Sprecherin oder einen Sprecher. Zur Wahl stehen ${N(s, c.a)}, ${P.cat(s, c.a).founder ? 'eine Gründerkatze' : 'aus einer alten Familie'}, und ${N(s, c.b)}, ${P.has(P.cat(s, c.b), 'weise') ? 'weise und besonnen' : 'ehrgeizig und voller Pläne'}.`,
    o: [
      { l: (s, c) => `${N(s, c.a)} wählen`, h: 'Tradition, Zusammenhalt', tg: ['tradition'], f: (s, c) => { s.flags.speaker = c.a; P.moodAdd(s, c.a, 20); return F(s, { coh: 4, trust: 3 }); } },
      { l: (s, c) => `${N(s, c.b)} wählen`, h: 'Wissen, Fortschritt', tg: ['change', 'prestige'], f: (s, c) => { s.flags.speaker = c.b; P.moodAdd(s, c.b, 20); return F(s, { know: 20, inv: 1, trade: 1 }); } },
      { l: 'Jede Jahreszeit jemand anderes', h: 'Gemeinschaftssinn', tg: ['open', 'free'], f: (s) => F(s, { com: 3, trust: 2 }) },
    ] });

  D({ id: 'school_debate', c: 'soc', st: [4, 6], w: 3, cd: 35, art: 'workshop',
    req: (s) => (P.countB(s, 'school') ? {} : null),
    t: 'Was sollen die Kleinen lernen?',
    x: () => `In der Pfotenschule wird gestritten: Die Fischer wollen Angelkunde, die Ältesten Geschichten, die Erfinder Mechanik, die Gärtner Pflanzenkunde.`,
    o: [
      { l: 'Angeln und Vorratskunde', h: 'Futter dauerhaft', tg: ['frugal', 'tradition'], f: (s) => { s.flags.edu = 'fish'; return F(s, { nat: 1, food: 15 }); } },
      { l: 'Geschichten und Lieder', h: 'Gemeinschaftssinn', tg: ['tradition', 'festive'], f: (s) => { s.flags.edu = 'story'; return F(s, { com: 3, coh: 3 }); } },
      { l: 'Mechanik und Zahlen', h: 'Erfindergeist', tg: ['curious', 'change'], f: (s) => { s.flags.edu = 'mech'; return F(s, { inv: 3, know: 20 }); } },
      { l: 'Pflanzen und Wetter', h: 'Naturverbundenheit', tg: ['nature'], f: (s) => { s.flags.edu = 'plants'; return F(s, { nat: 3, catnip: 8 }); } },
    ] });

  D({ id: 'district_name', c: 'soc', st: [4, 6], w: 2, cd: 30, art: 'city',
    req: (s) => (s.districts.length < 2 + s.stage ? {} : null),
    t: 'Ein neues Viertel braucht einen Namen',
    x: () => `Rund um die neuen Häuser ist ein eigenes Viertel entstanden. Die Bewohner haben drei Vorschläge an den Rat geschickt.`,
    o: [
      { l: (s) => { const f = s.cats.find((c) => c.founder); return f ? `${f.name}-Viertel (nach der Gründerkatze)` : 'Gründerviertel'; }, h: 'Ehrt die Gründer', tg: ['tradition'], f: (s) => { const f = s.cats.find((c) => c.founder); s.districts.push({ n: f ? f.name + '-Viertel' : 'Gründerviertel', k: 'home' }); return F(s, { coh: 4 }); } },
      { l: 'Sonnenhangviertel', h: 'Naturverbundenheit', tg: ['nature'], f: (s) => { s.districts.push({ n: 'Sonnenhangviertel', k: 'nature' }); return F(s, { nat: 2 }); } },
      { l: 'Knäuelgasse', h: 'Gemeinschaftssinn', tg: ['festive'], f: (s) => { s.districts.push({ n: 'Knäuelgasse', k: 'culture' }); return F(s, { com: 2 }); } },
    ] });

  D({ id: 'bridge_plan', c: 'soc', st: [4, 6], w: 3, cd: 25, art: 'city',
    req: (s) => (s.b.filter((b) => P.BUILD[b.type].tall && b.prog >= 1).length >= 2 ? {} : null),
    t: 'Brücken zwischen den Bäumen',
    x: () => `Die Baumeister schlagen ein Netz aus Hängebrücken vor, damit niemand mehr hinunterklettern muss, um ins Nachbarhaus zu kommen.`,
    o: [
      { l: 'Ein großes Brückennetz', h: 'Viel Sisal, Infrastruktur ↑↑', tg: ['build', 'prestige'], if: (s) => P.canAfford(s, { wood: 20, sisal: 24 }), f: (s) => { let r = ''; for (let i = 0; i < 2; i++) { const b = P.placeBuilding(s, 'bridge'); if (b) r += ' · Brücke im Bau'; } return F(s, { inv: 1 }) + r; } },
      { l: 'Erst einmal eine Brücke', h: 'Vorsichtig', tg: ['cautious', 'build'], if: (s) => P.canAfford(s, P.BUILD.bridge.cost), f: (s) => (P.placeBuilding(s, 'bridge') ? 'Eine Hängebrücke entsteht.' : 'Kein passender Abstand gefunden.') },
      { l: 'Lieber auf dem Boden bleiben', h: 'Tradition', tg: ['tradition'], f: (s) => F(s, { nat: 1 }) },
    ] });

  D({ id: 'tower_style', c: 'soc', st: [5, 6], w: 3, cd: 50, once: 1, art: 'city',
    t: 'Der Stil der Türme',
    x: (s) => `${s.realm} wächst in die Höhe. Wie sollen die neuen Kratzbaum-Wohntürme aussehen?`,
    o: [
      { l: 'Begrünte Plattformen', h: 'Naturverbundenheit', tg: ['nature'], f: (s) => { s.flags.style = 'nat'; return F(s, { nat: 3 }); } },
      { l: 'Markt-Terrassen', h: 'Handelsgeist', tg: ['open', 'prestige'], f: (s) => { s.flags.style = 'trade'; return F(s, { trade: 3 }); } },
      { l: 'Kurbellifte und Zahnräder', h: 'Erfindergeist', tg: ['curious', 'build'], f: (s) => { s.flags.style = 'inv'; return F(s, { inv: 3 }); } },
      { l: 'Gemeinschaftslauben', h: 'Gemeinschaftssinn', tg: ['festive', 'care'], f: (s) => { s.flags.style = 'com'; return F(s, { com: 3 }); } },
    ] });

  D({ id: 'migration', c: 'soc', st: [5, 6], w: 3, cd: 25, art: 'visitors',
    t: 'Eine Welle von Zuzüglern',
    x: (s) => `Der Ruf von ${s.realm} hat sich verbreitet. Dutzende Katzen aus fernen Städten möchten hier leben.`,
    o: [
      { l: 'Ein neues Viertel für sie', h: 'Viele Bewohner, Vielfalt', tg: ['open', 'build'], f: (s) => { const n = P.newCats(s, P.ri(s, 6, 9), { origin: 'aus einer fernen Stadt' }); s.districts.push({ n: 'Neustadt', k: 'home' }); return `${n.length} neue Bewohner · ` + F(s, { trade: 3, coh: -3 }); } },
      { l: 'Nur wer ein Handwerk mitbringt', h: 'Gezielt', tg: ['cautious', 'frugal'], f: (s) => `Neu: ${P.newCats(s, 3, { talent: P.pick(s, ['Bauen', 'Erfinden', 'Handeln']) }).join(', ')} · ` + F(s, { know: 10 }) },
      { l: 'Die Stadt ist voll', h: 'Zusammenhalt', tg: ['closed'], f: (s) => F(s, { coh: 3, trade: -1 }) },
    ] });

  D({ id: 'fisher_strike', c: 'soc', st: [5, 6], w: 3, cd: 40, art: 'river',
    req: (s) => P.ctxA(s, (c) => c.job === 'fisher'),
    t: 'Die Fischer legen die Pfoten nieder',
    x: (s, c) => `${N(s, c.a)} spricht für alle Fischer: Sie wollen mehr Zeit auf den Sonnenplätzen – schließlich ernähren sie die ganze Stadt.`,
    o: [
      { l: 'Zustimmen', h: 'Vertrauen ↑, etwas weniger Fisch', tg: ['care', 'free'], f: (s) => { s.flags.fishRest = 1; return F(s, { trust: 6, com: 1 }); } },
      { l: 'Schichtsystem aushandeln', h: 'Ausgewogen', tg: ['build', 'care'], f: (s) => F(s, { trust: 3 }) },
      { l: 'Mehr Ehre statt mehr Freizeit', h: 'Ein Fischer-Festtag', tg: ['tradition', 'festive'], f: (s) => F(s, { coh: 3 }) + P.addTrad(s, 'fischertag', 'Tag der Fischer', 'Ein Tag im Jahr, an dem die Fischer bedient werden.') },
    ] });

  // ───────────── Chancen & Risiken ─────────────
  D({ id: 'heron', c: 'risk', st: [1, 6], w: 3, cd: 15, art: 'river',
    t: 'Ein Reiher am Wasser',
    x: () => `Ein großer grauer Reiher steht reglos im Bach und frisst die besten Fische weg. Die Fischer sind empört – und etwas eingeschüchtert.`,
    o: [
      { l: 'Gemeinsam verscheuchen', h: 'Mut & Zusammenhalt', tg: ['bold'], f: (s) => (P.chance(s, 0.7) ? F(s, { coh: 4, food: 4 }) + ' · Der Reiher flieht mit lautem Krächzen.' : F(s, { mood: -3 }) + ' · Der Reiher bleibt unbeeindruckt stehen.') },
      { l: 'Ein Blätterdach über den Steg', h: 'Holz, dauerhafter Schutz', tg: ['build', 'cautious'], if: (s) => s.res.wood >= 5, f: (s) => F(s, { wood: -5, food: 3 }) + ' · Der Reiher sucht sich ein anderes Revier.' },
      { l: 'Eine Weile woanders fischen', h: 'Weniger Fisch, keine Gefahr', tg: ['cautious'], f: (s) => F(s, { food: -4, exp: 5 }) },
    ] });

  D({ id: 'rainweek', c: 'risk', st: [1, 6], w: 3, cd: 20, season: [0, 2], art: 'rain',
    t: 'Eine Woche Regen',
    x: () => `Es regnet und regnet. Katzen sind nass, schlecht gelaunt und drängen sich in jeden trockenen Winkel.`,
    o: [
      { l: 'Drinnen Geschichten erzählen', h: 'Wissen, Futter ↓', tg: ['tradition', 'care'], f: (s) => F(s, { know: 10, food: -5, coh: 2 }) },
      { l: 'Trotzdem fischen', h: 'Futter ↑, Stimmung ↓', tg: ['bold', 'build'], f: (s) => F(s, { food: 10, mood: -5 }) },
      { l: 'Dächer flicken und verbessern', h: 'Holz ↓, Infrastruktur', tg: ['build', 'cautious'], if: (s) => s.res.wood >= 6, f: (s) => { for (const b of s.b) b.cond = Math.min(100, b.cond + 15); return F(s, { wood: -6, trust: 2 }); } },
    ] });

  D({ id: 'old_tree', c: 'risk', st: [2, 6], w: 3, cd: 40, art: 'forest',
    t: 'Die alte Eiche wankt',
    x: () => `Die riesige Eiche am Rand des Platzes neigt sich gefährlich. Generationen von Katzen haben an ihr gekratzt.`,
    o: [
      { l: 'Fällen und Holz gewinnen', h: 'Holz ↑↑', tg: ['build', 'frugal'], f: (s) => F(s, { wood: 25, nat: -1 }) },
      { l: 'Mit Seilen stützen', h: 'Sisal, Naturverbundenheit', tg: ['nature', 'care'], if: (s) => s.res.sisal >= 6, f: (s) => F(s, { sisal: -6, nat: 2, coh: 2 }) },
      { l: 'Zum Kratzturm umbauen', h: 'Ein neuer Kratzstamm', tg: ['change', 'build'], f: (s) => P.qb(s, 'scratch', { name: 'Eichenkratzturm' }).replace(' · ', '') },
    ] });

  D({ id: 'bees', c: 'risk', st: [3, 6], w: 2, cd: 30, art: 'garden',
    req: (s) => (P.countB(s, 'garden') ? {} : null),
    t: 'Bienen im Minzegarten',
    x: () => `Ein Bienenvolk hat sich im Katzenminzegarten niedergelassen. Die Gärtner werden gestochen, aber die Pflanzen blühen wie nie.`,
    o: [
      { l: 'Mit den Bienen leben', h: 'Naturverbundenheit, mehr Minze', tg: ['nature', 'care'], f: (s) => { s.flags.bees = 1; return F(s, { nat: 3, catnip: 10 }); } },
      { l: 'Den Stock behutsam umsiedeln', h: 'Wissen', tg: ['cautious', 'curious'], f: (s) => F(s, { know: 8 }) },
    ] });

  D({ id: 'flood', c: 'risk', st: [3, 6], w: 2, cd: 50, season: [0, 2], art: 'rain',
    t: 'Der Fluss tritt über die Ufer',
    x: () => `Nach tagelangem Regen steigt das Wasser. Die Stege stehen schon unter Wasser, und die Vorräte am Ufer sind in Gefahr.`,
    o: [
      { l: 'Vorräte in die Höhe tragen', h: 'Sicher, anstrengend', tg: ['cautious', 'care'], f: (s) => F(s, { coh: 3, mood: -2 }) },
      { l: 'Einen Damm bauen', h: 'Holz, langfristiger Schutz', tg: ['build', 'bold'], if: (s) => s.res.wood >= 12, f: (s) => { s.flags.dam = 1; return F(s, { wood: -12, inv: 2, trust: 3 }); } },
      { l: 'Das Wasser kommen lassen', h: 'Vorräte ↓, fruchtbarer Boden', tg: ['nature', 'free'], f: (s) => F(s, { food: -15, nat: 2, catnip: 8 }) },
    ] });

  D({ id: 'comet', c: 'rare', st: [3, 6], w: 2, cd: 120, art: 'night',
    t: 'Sternschnuppenregen',
    x: () => `In einer klaren Nacht fallen hunderte Sterne vom Himmel. Selbst die ältesten Katzen haben so etwas noch nie gesehen.`,
    o: [
      { l: 'Jede Katze wünscht sich etwas', h: 'Stimmung, Tradition', tg: ['festive', 'tradition'], f: (s) => F(s, { mood: 10, coh: 5 }) + P.addTrad(s, 'wunschnacht', 'Wunschnacht', 'In der Sternennacht flüstert jede Katze einen Wunsch.') },
      { l: 'Die Bahnen aufzeichnen', h: 'Wissen ↑↑', tg: ['curious'], f: (s) => F(s, { know: 35, inv: 1 }) },
    ] });

  D({ id: 'kitten_lost', c: 'risk', st: [2, 6], w: 3, cd: 20, art: 'forest',
    req: (s) => P.ctxA(s, (c) => P.ph(s, c) <= 1),
    t: 'Verlaufen im Wald',
    x: (s, c) => `Das kleine ${N(s, c.a)} ist einem Schmetterling in den Wald gefolgt und seit Stunden verschwunden. Es wird bald dunkel.`,
    o: [
      { l: 'Alle suchen gemeinsam', h: 'Zusammenhalt ↑', tg: ['care', 'bold'], f: (s, c) => { P.addMem(s, c.a, 'Hat sich als Kätzchen im Wald verlaufen und wurde von allen gesucht.', 3); return F(s, { coh: 6 }) + ` · ${N(s, c.a)} wird unter einem Farn gefunden, schlafend.`; } },
      { l: 'Die beste Entdeckerin schicken', h: 'Erkundung, eine neue Freundschaft', tg: ['cautious'], f: (s, c) => { const e = P.pickCat(s, (x) => x.job === 'explorer') || P.pickCat(s, ad(s)); if (e) { P.relAdd(s, e, c.a, 50); P.addMem(s, c.a, `Wurde von ${e.name} im Wald gefunden.`, 3); } return F(s, { exp: 8 }) + (e ? ` · ${e.name} bringt ${N(s, c.a)} heim.` : ''); } },
    ] });

  // ───────────── Herausforderungen ─────────────
  D({ id: 'coldsnap', c: 'crisis', st: [1, 6], w: 3, cd: 30, season: 3, art: 'winter',
    t: 'Eine bittere Kältewelle',
    x: () => `Eisiger Wind fegt durch das Tal. Der Bach friert zu, und selbst das dichteste Fell hilft kaum noch.`,
    o: [
      { l: 'Alle rücken zusammen', h: 'Zusammenhalt ↑, Platzmangel', tg: ['care', 'generous'], f: (s) => F(s, { coh: 5, mood: -2 }) },
      { l: 'Wolle verteilen', h: 'Wolle ↓, Stimmung ↑', tg: ['generous'], if: (s) => s.res.wool >= 5, f: (s) => F(s, { wool: -5, mood: 6 }) },
      { l: 'Im Eis fischen', h: 'Futter, gefährlich für Wasserscheue', tg: ['bold'], f: (s) => F(s, { food: 8, mood: -3 }) },
    ] });

  D({ id: 'shortage', c: 'crisis', st: [1, 6], w: 6, cd: 8, art: 'meadow',
    req: (s) => (s.res.food < P.alive(s).length * 1.5 ? {} : null),
    t: 'Die Vorräte werden knapp',
    x: () => `Die Futterplätze sind fast leer. Die Kätzchen maunzen, und auf den Gesichtern der Erwachsenen liegt Sorge.`,
    o: [
      { l: 'Rationieren', h: 'Vertrauen ↓, Vorräte halten', tg: ['strict', 'frugal'], f: (s) => { s.prio.food = 3; return F(s, { trust: -3, food: 6 }) + ' · Versorgung hat jetzt höchste Priorität.'; } },
      { l: 'Große Fischexpedition', h: 'Futter ↑↑', tg: ['bold'], f: (s) => F(s, { food: 22, mood: -2 }) },
      { l: 'Den Weidenclan um Hilfe bitten', h: 'Bündnis nötig', tg: ['open'], if: (s) => s.flags.clanFriend || s.flags.alliance, f: (s) => F(s, { food: 30, trade: 1 }) + ' · Der Weidenclan hilft ohne Zögern.' },
    ] });

  D({ id: 'cold_sickness', c: 'crisis', st: [2, 6], w: 2, cd: 30, season: [2, 3], art: 'home',
    t: 'Schnupfenwelle',
    x: () => `Überall wird geniest. Ein harmloser, aber lästiger Katzenschnupfen geht um, und viele bleiben lieber im Körbchen.`,
    o: [
      { l: 'Alle ruhen sich aus', h: 'Futter ↓, schnell gesund', tg: ['care'], f: (s) => F(s, { food: -6, mood: 2 }) },
      { l: 'Katzenminze-Tee', h: 'Minze ↓', tg: ['nature', 'care'], if: (s) => s.res.catnip >= 5, f: (s) => F(s, { catnip: -5, mood: 6, nat: 1 }) },
      { l: 'Weiterarbeiten', h: 'Stimmung ↓', tg: ['strict', 'build'], f: (s) => F(s, { mood: -6, food: 3 }) },
    ] });

  D({ id: 'landslide', c: 'crisis', st: [3, 6], w: 2, cd: 50, season: 2, art: 'storm',
    req: (s) => (s.b.length > 4 ? {} : null),
    t: 'Sturmnacht',
    x: () => `Ein Herbststurm reißt Dachpappe herunter und wirft einen Kratzstamm um. Niemand ist verletzt, aber einiges muss repariert werden.`,
    o: [
      { l: 'Sofort gemeinsam reparieren', h: 'Material ↓, Zusammenhalt ↑', tg: ['build', 'care'], f: (s) => { for (const b of s.b) b.cond = Math.max(60, b.cond); return F(s, { wood: -6, coh: 4 }); } },
      { l: 'Stärker wiederaufbauen', h: 'Mehr Material, robuster', tg: ['build', 'prestige'], if: (s) => s.res.wood >= 12, f: (s) => { for (const b of s.b) b.cond = 100; s.flags.sturdy = 1; return F(s, { wood: -12, inv: 1 }); } },
      { l: 'Nach und nach flicken', h: 'Gebäude bleiben eine Weile beschädigt', tg: ['frugal'], f: (s) => { for (const b of P.shuffle(s, s.b).slice(0, 4)) b.cond = Math.max(30, b.cond - 30); return 'Die Baumeister kümmern sich nebenbei.'; } },
    ] });

  // ───────────── Spätere Stufen ─────────────
  D({ id: 'flying_machine', c: 'pers', st: [5, 6], w: 3, cd: 60, once: 1, art: 'city',
    req: (s) => P.ctxA(s, (c) => c.job === 'inventor') || P.ctxA(s, (c) => ad(s)(c) && c.talent === 'Erfinden'),
    t: 'Der Pfotengleiter',
    x: (s, c) => `${N(s, c.a)} steht auf dem höchsten Turm, unter sich ein Gestell aus Karton und Stoff. „Ich kann fliegen!“, ruft ${pr(s, c.a).er}. Die ganze Stadt hält den Atem an.`,
    o: [
      { l: 'Das Projekt fördern', h: 'Erfindergeist ↑↑', tg: ['bold', 'curious', 'change'], f: (s, c) => { wish(s, c.a, 'invent'); P.flag(s, 'glider'); return F(s, { inv: 5, know: 30, wool: -10 }) + ` · ${N(s, c.a)} gleitet sanft bis zum Fischmarkt. Jubel!`; } },
      { l: 'Erst mit Sandsäcken testen', h: 'Wissen', tg: ['cautious', 'curious'], f: (s) => F(s, { know: 20, inv: 2 }) },
      { l: 'Verbieten – zu gefährlich', h: 'Vertrauen bei Vorsichtigen', tg: ['strict', 'cautious'], f: (s, c) => { P.moodAdd(s, c.a, -25); return F(s, { trust: 2 }); } },
    ] });

  D({ id: 'monument_choice', c: 'rare', st: [5, 6], w: 4, cd: 999, once: 1, art: 'city',
    req: (s) => (s.cats.some((c) => c.founder) ? {} : null),
    t: 'Ein Monument für die Gründer',
    x: (s) => `Der Rat möchte das Gründerdenkmal errichten. Doch wen soll es zeigen? Gründerkatzen: ${s.cats.filter((c) => c.founder).map((c) => c.name).join(', ')}.`,
    o: [
      { l: 'Alle Gründerkatzen gemeinsam', h: 'Zusammenhalt', tg: ['tradition', 'care'], f: (s) => { s.flags.monument = 'all'; return F(s, { coh: 5 }) + (P.canAfford(s, P.BUILD.monument.cost) ? ' · ' + (P.placeBuilding(s, 'monument') ? 'Baustelle angelegt.' : '') : ' · Sobald genug Material da ist, beginnt der Bau.'); } },
      { l: (s) => { const f = s.cats.filter((c) => c.founder).sort((a, b) => b.kids.length - a.kids.length)[0]; return `${f.name}, die/der die meisten Nachkommen hat`; }, h: 'Ehrt eine Familie', tg: ['prestige'], f: (s) => { const f = s.cats.filter((c) => c.founder).sort((a, b) => b.kids.length - a.kids.length)[0]; s.flags.monument = f.id; return F(s, { coh: 3 }) + ` · Das Denkmal wird ${f.name} zeigen.`; } },
      { l: 'Eine Katze aus jeder Generation', h: 'Gemeinschaftssinn', tg: ['change', 'open'], f: (s) => { s.flags.monument = 'gens'; return F(s, { com: 3 }); } },
    ] });

  D({ id: 'book_of_paws', c: 'pos', st: [4, 6], w: 2, cd: 80, once: 1, art: 'workshop',
    req: (s) => (P.countB(s, 'school', true) ? P.ctxA(s, (c) => c.job === 'scholar') : null),
    t: 'Das Buch der Pfoten',
    x: (s, c) => `${N(s, c.a)} hat alle Geschichten seit der Gründung zusammengetragen. Das „Buch der Pfoten“ umfasst ${s.chron.length} Einträge.`,
    o: [
      { l: 'In der Schule auslegen', h: 'Wissen ↑↑', tg: ['tradition', 'curious'], f: (s) => F(s, { know: 40 }) },
      { l: 'Jedes Jahr daraus vorlesen', h: 'Tradition', tg: ['tradition', 'festive'], f: (s) => F(s, { coh: 4 }) + P.addTrad(s, 'vorlesen', 'Lesung aus dem Buch der Pfoten', 'Zum Jahresbeginn wird aus der Chronik vorgelesen.') },
    ] });

  D({ id: 'market_day', c: 'pos', st: [4, 6], w: 3, cd: 15, art: 'market',
    req: (s) => (P.countB(s, 'market', true) ? {} : null),
    t: 'Großer Markttag',
    x: () => `Am Fischmarkt ist kein Durchkommen: Händler preisen Wollknäuel, getrocknete Minze und glänzende Muscheln an.`,
    o: [
      { l: 'Vorräte aufstocken', h: 'Futter, Muscheln ↓', tg: ['frugal'], if: (s) => s.res.shells >= 10, f: (s) => F(s, { shells: -10, food: 35 }) },
      { l: 'Baumaterial kaufen', h: 'Material, Muscheln ↓', tg: ['build'], if: (s) => s.res.shells >= 10, f: (s) => F(s, { shells: -10, wood: 20, sisal: 12, cardboard: 10 }) },
      { l: 'Einfach bummeln und genießen', h: 'Stimmung', tg: ['festive', 'free'], f: (s) => F(s, { mood: 6, trade: 1 }) },
    ] });

  D({ id: 'metro_skyline', c: 'pos', st: [6, 6], w: 3, cd: 30, art: 'city',
    t: 'Die Skyline bei Abendrot',
    x: (s) => `Von der höchsten Plattform aus sieht man ganz ${s.realm}: Brücken, Türme, Gärten und tausend Lichter. Irgendwo darunter liegt noch die erste Schlafhöhle.`,
    o: [
      { l: 'Die erste Schlafhöhle zum Museum machen', h: 'Tradition, Zusammenhalt', tg: ['tradition'], f: (s) => { const b = s.b.find((x) => x.type === 'den'); if (b) { b.name = 'Die erste Höhle (Museum)'; s.worldDirty = true; } return F(s, { coh: 6, know: 20 }); } },
      { l: 'Ein Lichterfest über den Dächern', h: 'Stimmung ↑↑', tg: ['festive'], f: (s) => { s.festUntil = s.t + 6; return F(s, { mood: 10, coh: 6, com: 2 }); } },
      { l: 'Noch höher bauen!', h: 'Material, Ehrgeiz', tg: ['build', 'prestige'], f: (s) => F(s, { wood: 30, sisal: 20, inv: 2 }) },
    ] });

  D({ id: 'sky_garden_idea', c: 'soc', st: [5, 6], w: 3, cd: 40, art: 'garden',
    t: 'Gärten in den Wolken',
    x: () => `Gärtner schlagen vor, auf den Dächern der Türme Katzenminze und Gras anzupflanzen, damit auch Turmbewohner barfuß im Grünen liegen können.`,
    o: [
      { l: 'Überall Dachgärten!', h: 'Naturverbundenheit ↑↑', tg: ['nature', 'build'], f: (s) => F(s, { nat: 4, catnip: 10, wood: -10 }) },
      { l: 'Lieber Sonnenterrassen', h: 'Gemeinschaftssinn', tg: ['festive'], f: (s) => F(s, { com: 3, coh: 3 }) },
    ] });

  D({ id: 'old_den_debate', c: 'soc', st: [5, 6], w: 2, cd: 60, once: 1, art: 'home',
    req: (s) => (P.countB(s, 'den') >= 2 ? {} : null),
    t: 'Die alten Höhlen',
    x: () => `Mitten zwischen den Türmen stehen noch die ersten Schlafhöhlen. Manche wollen sie abreißen, um Platz zu schaffen.`,
    o: [
      { l: 'Als Erinnerung erhalten', h: 'Tradition, Zusammenhalt', tg: ['tradition', 'care'], f: (s) => F(s, { coh: 5, com: 1 }) },
      { l: 'Zu Kuschelbauten ausbauen', h: 'Wohnraum', tg: ['change', 'build'], f: (s) => { for (const b of s.b) if (b.type === 'den' && b.lv < 3) b.lv++; s.worldDirty = true; return F(s, { wood: -8, inv: 1 }) + ' · Alle Höhlen ausgebaut.'; } },
    ] });

  D({ id: 'lantern_night', c: 'pos', st: [3, 6], w: 3, cd: 25, season: [2, 3], art: 'festival',
    t: 'Laternen aus Karton',
    x: () => `Jemand hat entdeckt, dass Glühwürmchen in Kartonlaternen ein warmes Licht geben. Bald hängen sie an jedem Ast.`,
    o: [
      { l: 'Ein Laternenumzug', h: 'Tradition, Zusammenhalt', tg: ['festive', 'tradition'], f: (s) => { s.festUntil = s.t + 3; return F(s, { coh: 5 }) + P.addTrad(s, 'laterne', 'Laternenumzug', 'Im Herbst ziehen alle mit Kartonlaternen durch die Gassen.'); } },
      { l: 'Die Glühwürmchen freilassen', h: 'Naturverbundenheit', tg: ['nature', 'care'], f: (s) => F(s, { nat: 2, coh: 2 }) },
    ] });

  // ───────────── Weltverändernde Wendepunkte (Entwicklungspfade) ─────────────
  const PATH_TXT = {
    nat: ['Das Grüne Erwachen', (s) => `Seit Langem leben die Katzen von ${s.realm} eng mit Bach, Wald und Garten. Die Gärtner schlagen vor, die ganze Stadt um lebende Pflanzen herum zu bauen.`],
    trade: ['Das Tor zur Welt', (s) => `Immer mehr Fremde kommen nach ${s.realm}, Muscheln wechseln die Pfoten, Sprachen mischen sich. Die Händler wollen ${s.realm} zur großen Handelsstadt machen.`],
    inv: ['Das Zeitalter der Zahnräder', (s) => `Kurbeln, Seilzüge und Gleiter: Die Erfinder von ${s.realm} haben die Gemeinschaft verändert. Sie wollen eine Stadt der Wunderwerke bauen.`],
    com: ['Das Herz der Feste', (s) => `Kaum ein Mond vergeht ohne Fest. Die Katzen von ${s.realm} verbindet mehr als Arbeit – sie wollen eine Stadt bauen, deren Mitte allen gehört.`],
  };
  for (const k of Object.keys(PATH_TXT)) {
    D({ id: 'path_' + k, c: 'turn', st: [3, 6], w: 6, cd: 20, art: k === 'nat' ? 'garden' : k === 'trade' ? 'market' : k === 'inv' ? 'workshop' : 'festival',
      req: (s) => { if (s.path) return null; const v = s.val; const sorted = Object.keys(v).sort((a, b) => v[b] - v[a]); if (sorted[0] !== k || v[k] < 12 || v[k] - v[sorted[1]] < 3) return null; return { second: sorted[1] }; },
      t: PATH_TXT[k][0], x: PATH_TXT[k][1],
      o: [
        { l: `Ganz zur ${P.VALUES[k].path} werden`, h: 'Öffnet einen eigenen Entwicklungspfad', tg: [k === 'nat' ? 'nature' : k === 'trade' ? 'open' : k === 'inv' ? 'curious' : 'festive', 'change'], f: (s) => setPath(s, k, null) },
        { l: (s, c) => `Mit ${P.VALUES[c.second].n} verbinden`, h: 'Eine Mischform', tg: ['change', 'open'], f: (s, c) => setPath(s, k, c.second) },
        { l: 'Noch nicht festlegen', h: 'Die Frage kehrt später zurück', tg: ['cautious', 'tradition'], f: (s) => F(s, { coh: 2 }) },
      ] });
  }
  function setPath(s, k, k2) {
    s.path = k; s.path2 = k2;
    const name = k2 ? `${P.VALUES[k].path} mit ${P.VALUES[k2].n}` : P.VALUES[k].path;
    P.chron(s, 'turn', `Wendepunkt: ${s.realm} wird zur ${name}.`);
    s.rep.stories.push({ t: `Wendepunkt: ${s.realm} wird zur ${name}.`, cats: [] });
    if (k === 'nat' || k2 === 'nat') P.flag(s, 'greenhouse');
    return `${s.realm} schlägt einen neuen Weg ein: ${name}. Neue Bauwerke werden möglich.`;
  }
  D({ id: 'path_balanced', c: 'turn', st: [5, 6], w: 5, cd: 25, art: 'city',
    req: (s) => { if (s.path) return null; const v = s.val; const sorted = Object.keys(v).sort((a, b) => v[b] - v[a]); return { k1: sorted[0], k2: sorted[1] }; },
    t: 'Eine Stadt vieler Seelen',
    x: (s) => `${s.realm} hat sich nie auf einen Weg festgelegt. Nun sagt der Rat: Eine Metropole braucht ein Herz. Welche beiden Seelen sollen die Stadt prägen?`,
    o: [
      { l: (s, c) => `${P.VALUES[c.k1].path} mit ${P.VALUES[c.k2].n}`, h: 'Die stärksten Werte', tg: ['change'], f: (s, c) => setPath(s, c.k1, c.k2) },
      { l: (s, c) => `${P.VALUES[c.k2].path} mit ${P.VALUES[c.k1].n}`, h: 'Umgekehrte Gewichtung', tg: ['change'], f: (s, c) => setPath(s, c.k2, c.k1) },
      { l: 'Gartenzivilisation der Feste', h: 'Natur & Gemeinschaft', tg: ['nature', 'festive'], f: (s) => setPath(s, 'nat', 'com') },
    ] });

  // Selbstprüfung
  P.EVENT_COUNT = () => P.EV.filter((e) => !e.manual).length;
})();
