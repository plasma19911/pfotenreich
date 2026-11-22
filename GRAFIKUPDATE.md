# Pfotenreich 1.2 – Fantasygrafik und Zeitsteuerung

Im Spiel werden lokal gespeicherte, generierte Rastergrafiken verwendet:

- 16 realistische Anime-Fantasy-Porträts mit Hüten, Brillen, Fellbärten, Mänteln, Schmuck und Rüstungen.
- Vier animierte Weltfiguren mit je vier Laufphasen: dicker Schmied, dünner Späher, kleiner Magier und großer Gelehrter. Körperbreite, Größe und Lebensphase unterscheiden die Bewohner zusätzlich.
- Neun Gebäudevorlagen sowie neun Natur- und Einrichtungsobjekte.
- Vier Landschaftsbilder für Ereignisse und Startbildschirm.
- Generierte Gras-, Erd-, Stein- und Wassertexturen für die tatsächlich bespielbare Karte.

Die Bilder sind WebP-Dateien unter `assets/`. Transparenz der Katzen und Gebäude bleibt erhalten. Keine kostenpflichtige Laufzeit-API, alle Grafiken werden offline zwischengespeichert. Falls ein Bild nicht geladen werden kann, bleibt die prozedurale Darstellung als Rückfall erhalten. Die Welt bleibt ein zweidimensionales Spiel mit gerenderten Bildfiguren.

## Zeit und Baustart

Bei 1× entspricht eine echte Minute einem Spieltag. Pause, 1×, 5×, 10×, 25×, 50× und 100× stehen oben im HUD zur Verfügung. Bei 100× dauert ein Spieltag 0,6 Sekunden. Die Simulation verarbeitet auch bei hohem Tempo kleine Zeitschritte. Der Akkusparmodus beeinflusst das Simulationstempo nicht mehr. Offline gilt 1×, begrenzt auf 60 Spieltage.

Der Fehler beim Baustart ist behoben: Die Gründung teilt sofort Berufe zu. Bestehende Reiche ohne Arbeitszuteilung werden beim Laden bzw. nächsten Simulationsschritt repariert. Es wird kein neues Reich dafür benötigt.

## Prüfung

`node test/construction_test.js` prüft alle drei Gründungsentscheidungen, sofortige Bautätigkeit, Reparatur alter Arbeitszuteilungen, eine Minute pro Tag und die 100×-Umrechnung. Der bestehende Simulationstest läuft ebenfalls. Zusätzlich wurden die eingebundenen Bilddateien, alle Gebäudetypen und Jahreszeiten über Canvas gerendert und Weltansichten visuell geprüft. Ein Test auf einem echten Handy steht noch aus.
