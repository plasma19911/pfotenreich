# Pfotenreich

Ein Handyspiel über die Entstehung einer Katzenzivilisation, vom ersten Lager bis zur Metropole. Es läuft komplett im Browser als installierbare PWA. Es braucht keinen Server, keine kostenpflichtigen APIs, keine Werbung und keine Käufe.

## Starten

**Lokal:** Im Projektordner einen einfachen Webserver starten und im Browser öffnen:

```bash
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

Mit `file://` startet das Spiel zwar auch, Service Worker und Installation funktionieren dann aber nicht.

**Auf dem Handy installieren:** Den Ordner auf einen beliebigen statischen Hoster legen, zum Beispiel GitHub Pages, Netlify oder einen eigenen Webspace mit HTTPS. Dann die Seite auf dem Handy öffnen und im Browsermenü „Zum Startbildschirm hinzufügen“ bzw. „App installieren“ wählen. Nach dem ersten Laden ist das Spiel offline spielbar.

**Testmodus:** Mit `index.html?debug=1` erscheinen Zeitraffer-Knöpfe (60× bis 7200×) und ein Knopf „+1 Tag offline“. Der Testmodus ist nur zum Ausprobieren gedacht.

**Simulationstest ohne Browser:** `node test/sim_test.js [seed] [tage]` simuliert ein ganzes Reich. Der Test trifft dabei zufällige Entscheidungen und prüft Stufenaufstieg, Speichern und Laden, Offline-Nachberechnung und Determinismus.

## Bedienung

- Ziehen verschiebt die Kamera. Mit zwei Fingern, dem Mausrad oder ＋/－ wird gezoomt, ⌂ springt zum Zentrum.
- Katzen und Gebäude antippen öffnet ihre Karte. „In der Welt zeigen“ lässt die Kamera einer Katze folgen.
- Der leuchtende Knopf unten zeigt, dass Entscheidungen offen sind.
- **Volk:** alle Bewohner mit Porträt, Wesen, Wünschen, Beziehungen, Erinnerungen und Stammbaum.
- **Chronik:** die automatisch geführte Geschichte, filterbar.
- **Reich:** Voraussetzungen für die nächste Stufe, Vorräte, Werte, Entwicklungspfad, Prioritäten, ein optionales Bauvorhaben, Traditionen und Gebiete.
- **Menü:** Musik, Geräusche, reduzierte Bewegung, Akku-Sparmodus, Speichern, Export/Import, Neues Reich.

## Zeit

1 Spielstunde = 15 echte Minuten, 1 Spieltag = 6 echte Stunden, eine Jahreszeit = 10 Spieltage, ein Jahr = 40 Spieltage (10 echte Tage).
Geschlossen rechnet der Browser nicht weiter. Beim nächsten Öffnen wird die vergangene Zeit in groben Schritten nachberechnet, höchstens 60 Spieltage (15 echte Tage). Danach „schlummert“ das Reich.
Während der Abwesenheit sind die Härten begrenzt: Niemand verhungert, Stimmung und Zusammenhalt haben Untergrenzen, und Gebäude verfallen nicht. Es entstehen höchstens 3 offene Entscheidungen. Krisen-Ereignisse werden in dieser Zeit nicht ausgelöst, und keine Entscheidung wird automatisch getroffen.

## Aufbau des Quellcodes

| Datei | Aufgabe |
|---|---|
| `js/util.js` | deterministischer Zufall (Zustand im Spielstand), Rauschen, Farben, Zeitfunktionen |
| `js/data.js` | Stufen und Voraussetzungen, Gebäude, Regionen, Berufe, Eigenschaften, Namen |
| `js/cats.js` | Bewohner: Aussehen und Vererbung, Lebensphasen, Beziehungen, Partnerschaften, Geburten, Tod, Wünsche, Stimmung |
| `js/world.js` | Weltgenerierung (Bach, Fluss, See, Wald, Hügel, Ruinen), Regionen, Gebäudeplatzierung |
| `js/events.js` | Ereignis-Engine: Auswahl, Gewichtung, Abklingzeiten, Ketten, Folgen, Bewohner-Reaktionen |
| `js/events_content.js` | alle Ereignisse; neue Ereignisse einfach mit `P.def({...})` ergänzen |
| `js/sim.js` | Wirtschaft, Berufsverteilung, Bauplanung, Stufenaufstieg, Tagesablauf, Offline-Nachberechnung |
| `js/save.js` | IndexedDB (mit localStorage als Ausweichlösung), versioniertes Datenmodell, Migrationen, Import-Prüfung |
| `js/art.js` | prozedurales Grafiksystem: Katzen in der Welt, Porträts mit Gesichtsausdrücken, Ereignisszenen |
| `js/render.js` | Kamera, Gelände-Kacheln je Zoomstufe, Gebäude, Bewohner-Agenten, Licht, Wetter, Partikel |
| `js/audio.js` | prozedurale Musik und Geräusche (WebAudio) |
| `js/ui.js` | Oberfläche: HUD, Ereignisse, Rückkehrbericht, Bewohner, Chronik, Reich, Menü |
| `js/main.js` | Start, Spielschleife, Eingabe, Autosave, Rückkehr nach Abwesenheit |

**Spielstände bei Updates:** `P.SAVE_V` erhöhen und in `P.MIGRATIONS` eine Funktion für die alte Version ergänzen. Fehlende Felder werden außerdem automatisch mit Standardwerten aufgefüllt.
