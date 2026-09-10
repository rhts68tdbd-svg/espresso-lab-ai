# Espresso Lab AI v1.1

Nächste größere Version mit strukturellem Refactor und verbessertem Espresso-Workflow.

## Neu in v1.1
- Komponenten aus der Hauptkomponente herausgezogen -> Suchfeld verliert beim Tippen nicht mehr den Fokus.
- Suche auf Home mit Löschen-Button und Suche über Röster, Name, Herkunft, Tasting Notes und Zielprofil.
- Neues Datenmodell: Kaffee -> Charge/Packung -> Shots -> finales Rezept.
- Migration der bisherigen lokalen v1.x-Daten in eine importierte Legacy-Charge.
- Neue Packung/Charge kann aus einem bekannten Kaffee heraus angelegt werden.
- Letzte finale Einstellung wird als Referenz für neue Charge verwendet.
- Mehrere Packungsfotos (bis zu 4) pro KI-Analyse.
- Unsichere erkannte Felder werden sichtbar markiert.
- Duplikaterkennung auf Röster + Produktname.
- Equipment-Profil für Maschine, Mühle, Richtung „feiner“, Siebe und Standarddosis.
- Strukturierteres Tasting nach Säure, Bitterkeit/Trockenheit, Körper, Süße und Gesamteindruck.
- KI erhält Equipment, Kaffee, Charge, komplette Shot-Historie und aktuellen Shot.
- KI liefert zusätzlich Trend-Zusammenfassung und Empfehlung für einen Bestätigungs-Shot.
- Reproduzierbarkeit wird im Workflow berücksichtigt.
- Eine einzige kanonische Knowledge Base: `knowledge/espresso-lab.md`.
- Server liest diese Datei bei KI-Anfragen ein; keine doppelte JS-Kopie mehr.
- Editieren/Löschen von Shots und Kaffees bleibt erhalten.
- Backup Export/Import bleibt erhalten.

## Deployment
Wie bisher:
1. Bestehenden lokalen Repository-Ordner öffnen.
2. Alle sichtbaren Projektdateien ersetzen; `.git` nicht löschen.
3. GitHub Desktop: Commit to main.
4. Push origin.
5. Vercel deployt automatisch.

## Environment Variables in Vercel
- `OPENAI_API_KEY`
- optional `OPENAI_MODEL=gpt-5.6-terra`

## Wichtig
Die lokalen Daten bleiben unter derselben Domain erhalten. v1.1 migriert ältere Kaffeeobjekte beim Laden automatisch in das neue Charge-Modell.

## Noch nicht enthalten
- Supabase / Cloud-Sync zwischen iPhone und iPad
- Login
- echte semantische Duplikaterkennung über externe Produktdaten
