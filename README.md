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
