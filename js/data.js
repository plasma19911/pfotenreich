// Pfotenreich – Spieldaten (Stufen, Gebäude, Regionen, Berufe, Eigenschaften, Namen)
(function () {
  const P = self.P;

  P.STAGES = [
    { n: 'Ursprung', d: 'Eine Handvoll Katzen sucht einen Ort zum Bleiben.' },
    { n: 'Lager', d: 'Erste Schlafhöhlen, Futterplätze und Kratzstämme.' },
    { n: 'Siedlung', d: 'Kratzbaumhäuser, Angelstege, Vorräte und erste Berufe.' },
    { n: 'Dorf', d: 'Familien, Werkstätten, der Katzenrat und erste Traditionen.' },
    { n: 'Kleinstadt', d: 'Viertel, Handel, Pfotenschule und erste Hängebrücken.' },
    { n: 'Stadt', d: 'Wohntürme, Spezialisten, Politik und eine eigene Kultur.' },
    { n: 'Metropole', d: 'Wolkenkratzbäume, Brückennetze, einzigartige Viertel und Monumente.' },
  ];

  // Voraussetzungen für den Aufstieg in Stufe i (minDay = Spieltage seit Gründung)
  P.REQ = [
    null,
    null,
    { minDay: 0.1, pop: 6, foodStock: 20, coh: 35, infra: 3, b: { den: 2, feedspot: 1 } },
    { minDay: 4, pop: 16, foodStock: 50, know: 25, coh: 45, infra: 12, b: { treehouse: 2, jetty: 1, store: 1 }, regions: 2 },
    { minDay: 20, pop: 32, foodStock: 100, know: 140, coh: 50, infra: 28, b: { workshop: 1, council: 1 }, trad: 1, regions: 3 },
    { minDay: 70, pop: 70, foodStock: 200, know: 550, coh: 55, infra: 70, b: { school: 1, market: 1, bridge: 2 }, regions: 5, trad: 2 },
    { minDay: 220, pop: 140, foodStock: 350, know: 1800, coh: 60, infra: 150, b: { tower: 4, monument: 1, bridge: 6 }, path: 1, regions: 7, trad: 3 },
  ];

  // Gebäude. k = Kategorie (Planer/Platzierung), lv = Namen der Ausbaustufen, lvSt = ab welcher Zivilisationsstufe
  P.BUILD = {
    den: { n: 'Schlafhöhle', st: 1, cost: { wood: 3 }, work: 1, cap: 3, infra: 1, k: 'home', lv: ['Schlafhöhle', 'Kartonhöhle', 'Kuschelbau'], lvSt: [1, 3, 5] },
    feedspot: { n: 'Futterplatz', st: 1, cost: { wood: 2 }, work: 0.8, store: 40, infra: 1, k: 'food' },
    scratch: { n: 'Kratzstamm', st: 1, cost: { wood: 2, sisal: 2 }, work: 0.8, coh: 2, k: 'culture' },
    sunspot: { n: 'Sonnenplatz', st: 1, cost: { wood: 1 }, work: 0.5, coh: 1.5, k: 'culture' },
    jetty: { n: 'Angelsteg', st: 2, cost: { wood: 6 }, work: 2, fish: 0.25, slots: 3, infra: 2, k: 'water' },
    treehouse: { n: 'Kratzbaumhaus', st: 2, cost: { wood: 8, sisal: 5 }, work: 4, cap: 6, infra: 2, k: 'home', tall: 1, lv: ['Kratzbaumhaus', 'Doppelkratzbaum', 'Kratzbaumvilla'], lvSt: [2, 4, 5] },
    store: { n: 'Vorratslager', st: 2, cost: { wood: 6, cardboard: 3 }, work: 3, store: 150, infra: 2, k: 'food' },
    workshop: { n: 'Wollknäuelwerkstatt', st: 3, cost: { wood: 12, sisal: 6 }, work: 7, job: 'crafter', slots: 3, infra: 2, k: 'work' },
    garden: { n: 'Katzenminzegarten', st: 3, cost: { wood: 5 }, work: 3, job: 'gardener', slots: 3, infra: 1, k: 'nature' },
    pond: { n: 'Fischteich', st: 3, cost: { wood: 6, sisal: 2 }, work: 5, fish: 0.3, slots: 3, infra: 1, k: 'water' },
    council: { n: 'Katzenrat', st: 3, cost: { wood: 25, sisal: 14, cardboard: 6 }, work: 16, coh: 6, infra: 4, k: 'center', unique: 1, tall: 2 },
    festplatz: { n: 'Festplatz', st: 3, cost: { wood: 10, wool: 3 }, work: 5, coh: 4, infra: 1, k: 'culture', unique: 1 },
    school: { n: 'Pfotenschule', st: 4, cost: { wood: 24, cardboard: 12, sisal: 8 }, work: 14, job: 'scholar', slots: 5, infra: 3, k: 'work' },
    market: { n: 'Fischmarkt', st: 4, cost: { wood: 20, cardboard: 10, sisal: 6 }, work: 12, job: 'trader', slots: 4, infra: 4, k: 'work' },
    tinker: { n: 'Erfinderwerkstatt', st: 4, cost: { wood: 22, cardboard: 14, wool: 6 }, work: 14, job: 'inventor', slots: 3, infra: 3, k: 'work' },
    greenhouse: { n: 'Gewächshaus', st: 4, cost: { wood: 14, cardboard: 10 }, work: 10, job: 'gardener', slots: 4, infra: 2, k: 'nature', needFlag: 'greenhouse' },
    lounge: { n: 'Gemeinschaftsecke', st: 4, cost: { wood: 10, wool: 5 }, work: 5, coh: 3, infra: 1, k: 'culture' },
    bridge: { n: 'Hängebrücke', st: 4, cost: { wood: 10, sisal: 12 }, work: 6, infra: 6, k: 'infra', virtual: 1 },
    tower: { n: 'Kratzbaum-Wohnturm', st: 5, cost: { wood: 40, sisal: 30, cardboard: 16 }, work: 24, cap: 16, infra: 5, k: 'home', tall: 3, lv: ['Kratzbaum-Wohnturm', 'Doppelturm', 'Himmelsturm'], lvSt: [5, 6, 6] },
    monument: { n: 'Gründerdenkmal', st: 5, cost: { wood: 30, cardboard: 30, wool: 15 }, work: 30, coh: 8, infra: 3, k: 'center', unique: 1 },
    skytower: { n: 'Wolkenkratzbaum', st: 6, cost: { wood: 80, sisal: 60, cardboard: 40 }, work: 50, cap: 40, infra: 10, k: 'home', tall: 4 },
    hanging: { n: 'Hängende Gärten', st: 6, cost: { wood: 60, sisal: 30, catnip: 30 }, work: 40, coh: 8, job: 'gardener', slots: 6, infra: 6, k: 'nature', path: 'nat', unique: 1 },
    harbor: { n: 'Flusshafen', st: 6, cost: { wood: 70, sisal: 20, cardboard: 30 }, work: 40, job: 'trader', slots: 6, infra: 12, k: 'water', path: 'trade', unique: 1 },
    cable: { n: 'Seilbahn der Erfinder', st: 6, cost: { wood: 50, sisal: 50, wool: 20 }, work: 40, job: 'inventor', slots: 4, infra: 16, k: 'work', path: 'inv', unique: 1 },
    amphi: { n: 'Schnurr-Amphitheater', st: 6, cost: { wood: 60, cardboard: 40, wool: 20 }, work: 40, coh: 14, infra: 6, k: 'culture', path: 'com', unique: 1 },
    tunnel: { n: 'Tunnelunterschlupf', st: 99, cost: {}, work: 3, cap: 4, infra: 2, k: 'home' },
    memorial: { n: 'Gedenkstein', st: 99, cost: {}, work: 0.5, coh: 1, k: 'culture' },
  };

  P.REGION_KEYS = ['center', 'meadow', 'river', 'lake', 'forest', 'hills', 'ruins'];
  P.REGIONS = {
    center: { n: 'Lichtung', st: 0, cost: 0 },
    meadow: { n: 'Wiesenring', st: 1, cost: 6 },
    river: { n: 'Flussufer', st: 2, cost: 30 },
    lake: { n: 'Seeufer', st: 3, cost: 70 },
    forest: { n: 'Altwald', st: 3, cost: 120 },
    hills: { n: 'Sonnenhügel', st: 4, cost: 200 },
    ruins: { n: 'Alte Ruinen', st: 4, cost: 300 },
  };

  P.JOBS = {
    gatherer: { n: ['Sammler', 'Sammlerin'], t: 'Sammeln', st: 1 },
    fisher: { n: ['Fischer', 'Fischerin'], t: 'Fischen', st: 1 },
    builder: { n: ['Baumeister', 'Baumeisterin'], t: 'Bauen', st: 1 },
    explorer: { n: ['Entdecker', 'Entdeckerin'], t: 'Erkunden', st: 1 },
    carer: { n: ['Pfleger', 'Pflegerin'], t: 'Pflegen', st: 2 },
    scholar: { n: ['Gelehrter', 'Gelehrte'], t: 'Lehren', st: 2 },
    crafter: { n: ['Spielzeugmacher', 'Spielzeugmacherin'], t: 'Basteln', st: 3, need: 'workshop' },
    gardener: { n: ['Gärtner', 'Gärtnerin'], t: 'Gärtnern', st: 3, need: ['garden', 'greenhouse', 'hanging'] },
    trader: { n: ['Händler', 'Händlerin'], t: 'Handeln', st: 4, need: ['market', 'harbor'] },
    inventor: { n: ['Erfinder', 'Erfinderin'], t: 'Erfinden', st: 4, need: ['tinker', 'cable'] },
  };
  P.TALENTS = Object.keys(P.JOBS).map((k) => P.JOBS[k].t);
  P.TALENT_JOB = {};
  for (const k in P.JOBS) P.TALENT_JOB[P.JOBS[k].t] = k;

  // Eigenschaften: like/dis = Entscheidungs-Tags, die die Katze mag/ablehnt; job = bevorzugte Berufe
  P.TRAITS = {
    mutig: { like: ['bold', 'change'], dis: ['cautious'], job: ['explorer'], d: 'stürzt sich gern ins Abenteuer' },
    neugierig: { like: ['curious', 'open'], dis: ['closed'], job: ['explorer', 'inventor'], d: 'muss allem auf den Grund gehen' },
    vorsichtig: { like: ['cautious', 'frugal'], dis: ['bold'], job: ['scholar', 'carer'], d: 'denkt lieber zweimal nach' },
    gemütlich: { like: ['festive', 'free'], dis: ['strict'], job: ['fisher'], d: 'liebt lange Nickerchen in der Sonne' },
    fürsorglich: { like: ['care', 'generous'], dis: ['closed', 'strict'], job: ['carer'], d: 'kümmert sich um alle' },
    eitel: { like: ['prestige'], dis: ['frugal'], job: ['builder', 'trader'], d: 'achtet sehr auf glänzendes Fell' },
    schüchtern: { like: ['cautious', 'care'], dis: ['festive', 'bold'], job: ['inventor', 'gardener'], d: 'spricht leise, denkt viel' },
    chaotisch: { like: ['festive', 'free', 'change'], dis: ['strict'], job: ['crafter'], d: 'hinterlässt überall Wollfäden' },
    skeptisch: { like: ['cautious', 'closed'], dis: ['open', 'generous'], job: ['trader'], d: 'traut nicht jedem Versprechen' },
    verspielt: { like: ['festive', 'curious'], dis: ['strict', 'frugal'], job: ['crafter'], d: 'jagt jedem Knäuel nach' },
    fleißig: { like: ['build', 'frugal'], dis: ['free'], job: ['builder', 'gatherer'], d: 'packt immer mit an' },
    verträumt: { like: ['nature', 'curious'], dis: ['build'], job: ['gardener', 'fisher'], d: 'schaut gern den Wolken nach' },
    gesellig: { like: ['festive', 'open', 'generous'], dis: ['closed'], job: ['trader', 'carer'], d: 'kennt wirklich jede Katze' },
    stur: { like: ['tradition'], dis: ['change'], job: ['builder', 'fisher'], d: 'bleibt bei seiner Meinung' },
    weise: { like: ['tradition', 'care'], dis: ['bold'], job: ['scholar'], d: 'weiß fast immer Rat' },
    ehrgeizig: { like: ['prestige', 'build', 'bold'], dis: ['free'], job: ['builder', 'inventor'], d: 'will hoch hinaus' },
  };
  P.WEAK = ['wasserscheu', 'ungeduldig', 'vergesslich', 'tollpatschig', 'ängstlich im Dunkeln', 'verfressen', 'Langschläfer', 'leicht beleidigt', 'abergläubisch', 'zerstreut'];
  P.WISHES = [
    { k: 'bigfish', t: 'einmal einen Riesenfisch fangen' },
    { k: 'family', t: 'eine eigene Familie gründen' },
    { k: 'house', t: 'in einem hohen Kratzbaumhaus wohnen' },
    { k: 'explore', t: 'unbekannte Gegenden sehen' },
    { k: 'invent', t: 'etwas erfinden, das alle benutzen' },
    { k: 'feast', t: 'ein großes Fest erleben' },
    { k: 'friends', t: 'viele gute Freunde finden' },
    { k: 'teach', t: 'Wissen an die Jungen weitergeben' },
    { k: 'garden', t: 'einen blühenden Garten pflegen' },
    { k: 'famous', t: 'dass ein Bauwerk den eigenen Namen trägt' },
  ];
  P.TAG_WORDS = {
    bold: 'mutig', cautious: 'vorsichtig', generous: 'großzügig', frugal: 'sparsam', festive: 'festlich', curious: 'neugierig',
    open: 'offen', closed: 'abgeschottet', strict: 'streng', free: 'frei', care: 'fürsorglich', build: 'tatkräftig',
    prestige: 'prachtvoll', tradition: 'traditionsbewusst', change: 'erneuernd', nature: 'naturverbunden',
  };

  P.VALUES = {
    nat: { n: 'Naturverbundenheit', path: 'Gartenzivilisation', c: '#5fa04e' },
    trade: { n: 'Handelsgeist', path: 'Handelsmetropole', c: '#d39b2e' },
    inv: { n: 'Erfindergeist', path: 'Erfinderstadt', c: '#4f86b8' },
    com: { n: 'Gemeinschaftssinn', path: 'Festkultur', c: '#c45c7a' },
  };

  P.NAMES = ('Mira Tilda Oskar Fips Luna Smilla Kasimir Wanda Pünktchen Brösel Ronja Lotte Mats Krümel Ida Flocke Juri Emil Paula Socke Mokka Ziggy Bea ' +
    'Frieda Hugo Nele Pippa Rufus Toni Greta Anton Zora Balu Kiki Lenni Rosi Otto Tessa Momo Wilma Fridolin Elsa Karl Pepe Hanna Igor Juna Leo Minka ' +
    'Nemo Olli Piet Rieke Sami Tula Ulla Vito Xaver Yuki Zeno Amsel Bruno Cleo Dotti Erna Filou Gisela Henri Inka Jasper Klara Merle Odette Pelle ' +
    'Rasmus Selma Theo Uschi Vroni Willi Zimt Kakao Muffin Pfeffer Salbei Ingwer Kümmel Distel Holunder Nebel Funke Wolke Kiesel Rübe Flusen Biene ' +
    'Hagebutte Quitte Mohn Birke Eichel Lavendel Krokus Schnuppe Tinka Bommel Puschel Mimi Fritzi Lumi Sternchen Kobold Grummel Spatz Fuchsi Matti ' +
    'Ole Lasse Jule Fenja Bodo Hilde Kuno Lilo Nepomuk Ottilie Quirin Resi Sieglinde Tamino Valentin Wiebke Zacharias Agathe Benno Carla Dagobert ' +
    'Edda Ferdinand Gundula Hektor Isolde Jakob Kunigunde Ludwig Magnolia Norbert Philippa Ruprecht Sophie Tankred Ursel Viktor Wenzel Mathilda').split(' ');
  // grobe Zuordnung: menschliche Vornamen nach Geschlecht, alle übrigen Katzennamen passen zu allen
  P.NAMES_M = new Set('Oskar Kasimir Mats Juri Emil Hugo Rufus Toni Anton Balu Lenni Otto Fridolin Karl Pepe Igor Leo Nemo Olli Piet Sami Vito Xaver Zeno Bruno Henri Jasper Noah Pelle Rasmus Theo Willi Ole Lasse Bodo Kuno Nepomuk Quirin Tamino Valentin Zacharias Benno Dagobert Ferdinand Hektor Jakob Ludwig Norbert Ruprecht Tankred Viktor Wenzel Matti Grummel Kobold'.split(' '));
  P.NAMES_W = new Set('Mira Tilda Luna Smilla Wanda Ronja Lotte Ida Paula Bea Frieda Nele Pippa Greta Zora Kiki Rosi Tessa Wilma Elsa Hanna Juna Minka Rieke Tula Ulla Cleo Dotti Erna Gisela Inka Klara Merle Odette Selma Uschi Vroni Biene Mimi Fritzi Tinka Jule Fenja Hilde Lilo Ottilie Resi Sieglinde Wiebke Agathe Carla Edda Gundula Isolde Kunigunde Magnolia Philippa Sophie Ursel Mathilda Quitte Lavendel'.split(' '));
  P.ROMAN = ['', '', ' II.', ' III.', ' IV.', ' V.', ' VI.', ' VII.', ' VIII.', ' IX.', ' X.'];
})();
