# Grafikquellen und Stilvorgaben

Diese sechs Atlanten wurden für Pfotenreich mit der integrierten Bildgenerierung erstellt und anschließend als WebP für das Spiel komprimiert. Die Quelldateien werden nicht zur Laufzeit benötigt.

| Datei | Raster | Inhalt / verwendete Bildvorgabe |
|---|---|---|
| portraits.webp | 4 × 4 | Realistische Anime-Fantasy-Katzen für Erwachsene, markante unterschiedliche Staturen, übergroße Ohren, Hüte, Brillen, geflochtene Fellbärte, getragene Kleidung und Schmuck. |
| cats.webp | 4 × 4 | Vier vierbeinige Katzenfiguren in je vier Laufphasen, Blick rechts: rundlicher Schmied, schlanker Späher, kleiner Magier, großer cremefarbener Gelehrter; freigestellt. |
| buildings.webp | 3 × 3 | Mooshöhle, Kratzbaumhaus, Ratshalle, Fischerei, Bibliothek, Schmiede, Markt, Wohnturm, Gewächshaus; realistische Naturmaterialien, isometrisch, freigestellt. |
| scenes.webp | 2 × 2 | Gründung am Bach, sommerliche Kratzbaumstadt, Winterstadt, Laternenfest; natürliche Materialien und realistisches Licht. |
| terrain.webp | 2 × 2 | Senkrecht fotografisch dargestellte Waldwiese, Erde, Stein/Moos und Bachwasser; keine Schrift, kein Horizont. |
| props.webp | 3 × 3 | Eiche, Tanne, Felsen, Futterplatz, Kratzstamm, Sonnenbett, Lagerfeuer, Laterne und Wollkörbe; realistisches Fantasy-Design, freigestellt. |

`js/media.js` lädt die Atlanten und ordnet ihre Ausschnitte stabil den Bewohnern und Gebäuden zu. Es handelt sich um feste Bildvorlagen, nicht um bei jedem Bewohner neu generierte Modelle. Die Darstellung eines Bewohners ändert sich nicht bei einem Berufswechsel.
