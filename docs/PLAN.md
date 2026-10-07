# Konsolidierter Umsetzungsplan

Stand: 07.10.2026. Umsetzung durch Nutzer autorisiert. Verbindlicher Zweck und Navigation: [PRODUCT.md](PRODUCT.md).

| Block | Zusammenhängendes Ergebnis | Abnahme |
|---|---|---|
| 1 – Datenvertrauen | P0 Lade-/Commit-/Importfehler; atomare Revisionsprüfung, sichere additive Migration, Duplikatzuordnung | Ungültiger Import/Abort verliert nichts; konkurrierende Fenster überschreiben keine Daten; Rohbestand vor Migration gesichert |
| 2 – Einstieg und Shell | Zwei Hauptbereiche, kleines Designsystem, Foto/manuelle Anlage, Zielprofil, Basis, Packungswahl | Erstmaliger Kaffee und Wiederkauf verständlich; historische Packungen erreichbar |
| 3 – Versuch und KI | Kompakter Editor, tatsächlicher Geschmack, dauerhafte Entwürfe, lokaler Commit vor KI, wiederholbare Analyse | KI-Ausfall verliert keinen Shot; keine erfundene Zeit/Sensorik; verspätete Antwort überschreibt keine Eingabe |
| 4 – Vergleich und Rezept | Auswahl historischer Versuche, lokale Deltas, Equipment-Kontext, bestätigte Rezeptkopie | Rezept bleibt bei Source-Edit erhalten; Wiederkauf nutzt Referenz; expliziter Abschluss |
| 5 – Vereinte Sammlung | Kombinierte Suche/Favoriten/Sortierung, optionale Bewertung, abgeleiteter Rückblick | Kein Passport-Duplikat; keine künstlichen Werte; Erfahrungen unabhängig von aktueller Packung |
| 6 – Qualitätsabschluss | API-Grenzen, Backup-Roundtrip, Offline-Shell, Updateverhalten, mobile Prüfung | Tests/Build und isolierte Browserproben; reale Geräte-/KI-Prüfgrenzen ausdrücklich dokumentiert |

## Gestrichen oder ersetzt

- Separater Passport-Hauptbereich → Kaffees mit optionalem Rückblick.
- Tägliches Logging als Erfolgsmaßstab → geführter Dial-in bis zum Rezept.
- Cloud-/Supabase-Ausblick → verlässliche lokale Speicherung und externer Export.
- Pflichtslider/Kartenradar und automatisch ergänzte Profile → freiwillige, tatsächlich erhobene Angaben.
- KI-Erfolg als Speicherbedingung → Commit zuerst, danach Beratung.
- Finalrezept als veränderlicher Shot-Verweis → bestätigte Kopie mit Herkunft.

## Arbeitstakt und Entscheidungsgate

Innerhalb eines Blocks nur `RECOVERY.md`. Vollständiger Checkpoint am Blockende, vor riskanter Migration, vor Deployment und vor Limitpause. Keine Neuinitialisierung oder Löschung von Browserdaten. Kein automatischer Kaffee-Merge. Änderungen des Produktzwecks, irreversible Datenbereinigung oder Wechsel der lokalen Architektur erfordern eine konkrete gesicherte Vorlage und Nutzerentscheidung.

Die Umsetzung erfolgt auf einer eigenen Git-Branch. Ein Build oder isolierter Browsertest ist kein Beweis für reale KI-Qualität oder eine bestandene iOS-/Android-Geräteabnahme. Kein produktiver Deploy ohne dokumentierten Stand und konkret überprüfte Voraussetzungen.
