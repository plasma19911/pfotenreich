# Projektstand Pfotenreich – Version 1.0.0

## Umgesetzt und getestet

- **Kompletter Spielkreislauf:** Gründung → automatischer Alltag → Ereignis → Entscheidung → sichtbare Folgen und Reaktionen → Weiterentwicklung → Speichern → Rückkehr mit bebildertem Bericht.
- **Sieben Entwicklungsstufen** (Ursprung bis Metropole). Jede Stufe hat eigene Voraussetzungen: Mindestzeit, Einwohner, Futtervorrat, Wissen, Zusammenhalt, Infrastruktur, Gebiete, Traditionen, bestimmte Bauwerke und ab der Metropole einen Entwicklungspfad. Jede Stufe hat eine eigene Meilenstein-Entscheidung.
  - Simulierter Verlauf (Node-Test mit mehreren Seeds): Siedlung nach etwa 2 Spieltagen (rund 12 echte Stunden), Dorf ab Tag 14–28, Kleinstadt ab etwa Tag 28–42, Stadt ab Tag 70 (rund 17 echte Tage), Metropole ab Tag 220 (rund 55 echte Tage).
- **27 Gebäudetypen**, viele mit drei Ausbaustufen und eigenem Aussehen. Dazu kommen Hängebrücken zwischen hohen Bauten, Baustellen mit Gerüst und Bauanimation, Verfall und Reparatur, pfadabhängige Akzentfarben und Turmstile sowie einzigartige Pfadbauwerke (Hängende Gärten, Flusshafen, Seilbahn, Amphitheater).
- **Automatisierung:** Die Katzen übernehmen Berufe nach Talent, Eigenschaften und Bedarf. Die Bauplanung richtet sich nach Bedarf und Prioritäten, spart bei Bedarf Material und hat Obergrenzen gegen Wildwuchs. Dazu kommen Erkundung neuer Gebiete, Geburten, Partnerschaften, Freundschaften und Rivalitäten, Wünsche, Feste der Traditionen und Zuwanderung.
- **Bewohner:** Name, Geschlecht, Alter und Lebensphase, Aussehen aus 12 Fellfarben, 7 Mustern, Felllänge, Körperbau, Augen (auch zweifarbig), Ohren, Schwanz und Accessoires, mit Vererbung. Dazu kommen 2 Eigenschaften, Talent, Schwäche, Herzenswunsch, Stimmung, Beziehungen, Familie, Erinnerungen und eine Lebensgeschichte. Gründerkatzen erhalten Gedenksteine, Namensvererbung, benannte Gebäude und das Denkmal.
- **81 Ereignisse:** 12 erfreuliche, 13 persönliche, 9 Alltag, 5 Entdeckungen, 12 Gesellschaft, 6 Chance & Risiko, 4 Krisen, 3 seltene, 6 Wendepunkte bzw. Entwicklungspfade, 6 Fortsetzungen und 5 Meilensteine. Hinzu kommen mehrere verzweigte Ketten (Weidenclan, Knäuelschleuder, Tunnel, Moorclan, Flusshändler, Fernweh und Heimkehr), Abklingzeiten, Ereignisverlauf und Bedingungen an Stufe, Jahreszeit, Bewohner und Gebäude.
- **Entwicklungspfade** entstehen aus vier Gesellschaftswerten, die viele Entscheidungen verschieben. Möglich sind Garten-, Handels-, Erfinder- und Festkultur sowie Mischformen.
- **Darstellung:** prozedural gezeichnete 2D-Welt. Gelände-Kacheln werden passend zur Zoomstufe gerendert und bleiben dadurch scharf. Dazu kommen Tag und Nacht mit Fensterlicht, vier Jahreszeiten, Wetter (Regen, Sturm, Gewitter, Schnee, Nebel), Wasserglitzern, Glühwürmchen, Blätter, Konfetti bei Festen und Viertelnamen.
  - Katzen haben 10 Posen (Laufen, Sitzen, Schlafen, Putzen, Strecken, Spielen, Angeln, Tragen, Bauen, Lesen) und Emote-Reaktionen. Ereignisse zeigen animierte Porträts mit 8 Gesichtsausdrücken.
  - Bei großer Bevölkerung werden bis zu 80 Katzen animiert. Wichtige Katzen (Gründer, an Ereignissen beteiligte, verfolgte) sind immer dabei.
- **Speichern:** IndexedDB mit rollierenden Sicherungen, localStorage als Ausweichlösung, versioniertes Datenmodell mit Migrationen, Export und Import mit Prüfung. Entscheidungen werden sofort gespeichert. Der deterministische Zufall verhindert, dass Neuladen Ereignisse oder Belohnungen dupliziert.
- **PWA:** Manifest, Service Worker und Icons. Nach dem ersten Laden ist das Spiel offline spielbar.
- **Einstellungen:** Musik und Geräusche getrennt schaltbar, reduzierte Bewegung (folgt der Systemeinstellung), Akku-Sparmodus.

## Prüfungen

- `test/sim_test.js` simuliert 330 Spieltage mit zufälligen Entscheidungen bei mehreren Seeds. Alle Stufen werden erreicht, und rund 72 verschiedene Ereignisse treten auf. Geprüft werden außerdem Speichern und Laden, Offline-Nachberechnung über 3 und 40 echte Tage sowie Determinismus.
- Browser-Test (Chrome, Handy-Ansicht 390×844): Start, Gründung, Ereignisse, Bewohner, Chronik, Reich, Menü, Neuladen mit Rückkehrbericht und Darstellung aller Stufen bei Tag und Nacht ohne Konsolenfehler. Die Bildrate lag bei etwa 60 fps, auch mit über 250 Bewohnern.
- Fehlerhafte Importdateien (kein JSON, neuere Version, kaputte Daten) werden abgefangen.

## Bekannte Grenzen und Ideen für später

- Die Grafik ist bewusst prozedural (keine externen Assets). Eine illustrierte Sprite-Grafik würde die Detailtiefe noch erhöhen.
- In späten Stufen häufen sich Wissen und Material an. Ein Verbrauch durch Forschung oder Großprojekte wäre eine sinnvolle Erweiterung.
- Der Zusammenhalt liegt bei vielen positiven Entscheidungen oft hoch. Er könnte stärker auf Krisen reagieren.
- Katzen gehen auf direktem Weg zu ihrem Ziel und nutzen keine Wege-Navigation.
- Getestet wurde in Chrome (Desktop und mobile Emulation). Safari/iOS ist nicht geprüft.
