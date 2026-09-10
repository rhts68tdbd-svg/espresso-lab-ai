# Espresso Lab AI v1.2

Aufbauend auf v1.1.

## Neu
- Haupt-/Coverbild pro Kaffee.
- KI wählt bei der Packungsanalyse automatisch das wahrscheinlich beste Vorderseiten-/Hauptverpackungsfoto als Titelbild.
- Titelbild kann jederzeit manuell geändert werden.
- Home und Kaffeeübersicht verwenden das gewählte echte Packungsfoto.
- Equipment kann jetzt aktiv über OpenAI Web Search recherchiert werden.
- Separate Recherche für Espressomaschine und Mühle.
- Primär-/Herstellerquellen werden bevorzugt.
- Gefundene Quellen werden in der App angezeigt.
- Recherchierte Equipmentdaten werden erst nach Bestätigung übernommen.
- Mühlenprofil kann Mahlwerk, Verstellart und – falls verifiziert – Richtung „feiner“ enthalten.
- Maschinenprofil kann Brühgruppe, Pumpentyp und Kesselsystem enthalten.
- Gespeicherte Equipment-Recherche wird bei jeder Shot-KI-Analyse als Teil des Equipmentkontexts mitgegeben.
- Eine einzige kanonische Knowledge Base bleibt erhalten.

## OpenAI
Die Equipment-Recherche verwendet die Responses API mit dem integrierten Web-Search-Tool.
`gpt-5.6-terra` unterstützt laut aktueller OpenAI-Modell-Dokumentation Web Search und Bildinput.

## Update
Wie bisher den sichtbaren Inhalt des lokalen GitHub-Repository-Ordners durch den Inhalt dieses ZIP ersetzen.
Den versteckten `.git`-Ordner NICHT löschen.
Danach GitHub Desktop:
1. Commit to main
2. Push origin
3. Vercel deployt automatisch

Environment Variables bleiben unverändert:
- OPENAI_API_KEY
- optional OPENAI_MODEL=gpt-5.6-terra


## v1.2.1 – Equipment UX & Fotoaufnahme
- „Recherchiertes Profil übernehmen“ speichert das Profil jetzt direkt dauerhaft.
- Gespeicherte Maschinen- und Mühlenprofile werden oben in den Einstellungen sichtbar mit „✓ gespeichert“ angezeigt.
- Klarer Hinweis, dass die gespeicherten Equipmentdaten bei zukünftigen Shot-Analysen als KI-Kontext verwendet werden.
- Dateiauswahl für Kaffeefotos durch klare mobile Buttons ersetzt:
  - „📷 Foto aufnehmen oder auswählen“
  - „📷 Weiteres Foto aufnehmen“
- Die native Datei-/Kameraauswahl bleibt technisch erhalten, die unklare Anzeige „Keine Datei ausgewählt“ wird aber nicht mehr als primäre UI gezeigt.


## v1.2.2 – Equipment-Darstellung
- Gespeicherte Equipment-Karten auf iPhone/iPad kompakter gestaltet.
- Titel verwendet jetzt den vom Nutzer bestätigten Equipment-Namen statt potenziell langer KI-Zitationsstrings.
- Schriftgröße der gespeicherten Equipment-Titel reduziert.
- Karten sind gegen horizontales Überlaufen abgesichert (`min-width: 0`, `overflow-wrap`, kompakter Badge).
- Recherche-Prompt verschärft: strukturierte Equipment-Felder dürfen keine URLs, Markdown-Links oder Zitationsklammern enthalten; Quellen bleiben separat.


## v1.2.3 – Equipment UX Cleanup
- Equipment-Grunddaten klar getrennt von recherchierbarem Equipment.
- Siebe und Standarddosis bleiben als manuelle Grunddaten erhalten.
- Eigener Button „Grunddaten speichern“.
- Alte permanente Felder „Mühlentyp / Verstellung“ und „Richtung feiner“ aus der Hauptansicht entfernt.
- Recherchierte Maschinen- und Mühlendaten erscheinen direkt als kompakte gespeicherte Karten.
- „Profil übernehmen & speichern“ speichert direkt.
- Gespeicherte Equipment-Karten bieten „Details bearbeiten“ für manuelle Korrekturen.
- Kein zusätzlicher allgemeiner „Equipment speichern“-Button mehr.


## v1.2.4 – Build Fix
- Behebt den Vercel/Webpack-Buildfehler `Identifier 'EquipmentResearchCard' has already been declared`.
- Eine veraltete doppelte `EquipmentResearchCard`-Komponente wurde entfernt.
- Funktional entspricht diese Version v1.2.3, nur mit sauberem, kompilierbarem Komponentenbaum.


## v1.3.0 – Coffee Passport
- Automatischer Coffee Passport ab gespeicherter finaler Einstellung.
- Persönlicher Score 1,0–10,0, optional Favorit und „Würde ich wieder kaufen“.
- Bewertung öffnet sich nach dem Finalisieren, kann übersprungen und später bearbeitet werden.
- Passport nutzt vorhandene Daten: Titelbild, Röster, Herkunft, finales Rezept, Packungen/Chargen und Shot-Verlauf.
- Visualisierung des Dial-in-Verlaufs und des finalen Sensorik-Eindrucks.
- Anzeige „Shots bis zum Sweet Spot“.
- Coffee Library: Sortierung nach Neueste, bester Bewertung oder Name; Favoritenfilter.
- Score/Favorit/Wiederkauf direkt auf Kaffee-Karten sichtbar.
- Bewertung liegt auf Kaffee-Ebene und bleibt bei weiteren Chargen desselben Kaffees erhalten.


## v1.3.1 – Final-Shot Save Fix
- Kritischer Bug behoben: Beim Klick auf „Als finale Einstellung speichern“ wurde der gerade analysierte Shot durch ein veraltetes Coffee-/Batch-Objekt wieder überschrieben.
- Die Finalisierung verwendet jetzt ausdrücklich den bereits aktualisierten Batch inklusive aktuellem Shot und setzt darauf `finalId`.
- Der Shot bleibt damit gespeichert und steht direkt für Coffee Passport und Bewertung zur Verfügung.
- Nebenfix: Der Shot-Vergleich zeigt jetzt tatsächlich den vorherigen Shot (`-2`) statt den aktuellen Shot mit sich selbst zu vergleichen.
