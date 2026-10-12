# Espresso Lab KI 1.5.1 — Korrekturstand vom 12.10.2026

Dieses Update gehört zur **KI-App** unter https://espresso-lab-ai.vercel.app/. Es basiert auf dem verifizierten GitHub-main `63314ad23ea8b555c78fb346332f92e94f942fd8` im Repository `rhts68tdbd-svg/espresso-lab-ai`. Die eigenständige Espresso Lab Local 2.0.1 wird nicht geändert.

## Korrekturen

| Fehler in 1.5                                                | Verhalten in 1.5.1                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geändertes Sieb geht beim Bearbeiten verloren                | Das bearbeitete Sieb wird übernommen. Historische Maschine und Mühle bleiben erhalten; fehlende Angaben werden nicht rückwirkend ergänzt.                                                                                                                                               |
| Bearbeiten entfernt eine vorhandene KI-Auswertung            | Die bisherige Antwort bleibt als frühere Auswertung abrufbar. Ihre Signatur passt nach einer Änderung nicht mehr; sie wird nicht als aktueller Plan übernommen. Auch eine fehlgeschlagene Neuauswertung entfernt sie nicht. Eine erfolgreiche Neuauswertung ersetzt die letzte Antwort. |
| Fehlender Messbeginn wird als „ab erstem Tropfen“ behandelt  | Unbekannte Zeitbasis bleibt in Anzeige, Rezept, Vergleich und KI-Anfrage unbekannt. Die KI erhält dazu eine ausdrückliche Anweisung.                                                                                                                                                    |
| Alte Mahlgradskala wird nach Mühlenwechsel übernommen        | Ein neuer Shot erhält den historischen Mahlgrad nur bei dokumentierter gleicher Mühle. Automatische KI-Einstellungen benötigen zusätzlich passende Maschine und passendes Sieb. Relative Mahlgradtipps erfordern das Eintragen des tatsächlich eingestellten Werts.                     |
| Identischer Kaffee ohne optionalen Röster wird nicht erkannt | Gleiche normalisierte Kaffeenamen werden bei beidseitig fehlendem Röster als vorhandener Kaffee vorgeschlagen. Keine automatische Zusammenführung.                                                                                                                                      |

Die fünf Geschmacksgruppen sind direkt sichtbar. Für die KI genügt weiterhin eine Geschmacksnotiz oder eine Auswahl; die zusätzlichen Geschmacksfelder sind ausdrücklich freiwillig. Die Local-App verwendet einen anderen Auswertungsvertrag und ist von diesem Update getrennt.

## Endgültiges Löschen

1. Kaffee wie bisher archivieren.
2. Einstellungen → Archivierte Kaffees → **Endgültig löschen**.
3. Der Dialog nennt Kaffee/Röster und Anzahl von Packungen, Versuchen, Rezepten und unterschiedlichen Fotos. Erst **Kaffee endgültig löschen** führt die Löschung aus. Abbrechen verändert nichts.

Entfernt werden der Kaffee mit seinen Unterdaten, zugehörige Bearbeitungs-/Packungs-/Shot-/Bewertungsentwürfe aller Fenster und derselbe Kaffee in den internen Sicherungsständen `recovery` und `pre-migration`. Andere Kaffees, Einstellungen und neue, unabhängige Entwürfe bleiben erhalten. Gemeinsam verwendete Fotodaten bleiben bei anderen Kaffees erhalten. Ein minimaler Löschmarker enthält nur die ID und verhindert, dass ein veraltetes Formular der Version 1.5.1 seinen Entwurf zurückschreibt.

Alle Änderungen erfolgen in **einer IndexedDB-Transaktion**. Bei Konflikt, nicht mehr archiviertem Kaffee, geänderten Daten oder Speicherfehler wird nichts teilweise gelöscht. Unlesbare interne Sicherungen führen zum Abbruch statt zum stillen Verwerfen fremder Daten. Verspätete KI-Antworten erzeugen keine gelöschten Einträge neu; laufende Anfragen in diesem App-Fenster werden nach erfolgreichem Löschen abgebrochen.

Bereits exportierte Backup-Dateien werden nicht geändert. Ihr späterer, ausdrücklich bestätigter Import darf den Kaffee wiederherstellen. Alte App-Fenster sollten nach dem Rollout ebenfalls auf 1.5.1 aktualisiert werden.

## Daten und KI

DB `espresso-lab-ai`, DB-Version 1, Store `kv`, Key `state`, Anwendungsschema 2 und bestehende Origin bleiben erhalten. Keine Daten werden beim App-Start gelöscht. Die Fachgrundlage 1.4.0, KI-Funktionen, API-Key-Konfiguration und Modellkonfiguration bleiben bestehen.

Bekannter gesonderter Punkt aus dem Review: Der Quellcode enthält weiterhin keine Nutzeranmeldung oder serverseitige Zugriffssperre für die KI-Endpunkte. Ob das bestehende Vercel-Projekt externen Zugriff begrenzt, wurde nicht geprüft. Dieses Update führt keine neue Anmeldespflicht oder geheime Konfiguration ein.

## Nachweise und Grenzen

- `npm test`: **38/38 bestanden**; bestehende Daten-/KI-Verträge, neue Fehlerregressionen, atomare Löschung und Rückabwicklung, doppelte Löschung, Migrationssicherung, verspätete Antworten sowie fünf serverseitige UI-Renderprüfungen.
- `npm run build`: bestanden; drei KI-Routen weiterhin vorhanden. 133 kB initiales JavaScript; Service-Worker-Shell mit 18 unveränderlichen Assets erzeugt.
- `npm run format:check` und `git diff --check`: bestanden.
- Ausschließlich synthetische Daten verwendet; keine persönlichen Kaffees gelöscht, keine kostenpflichtigen KI-Aufrufe ausgeführt.
- Kein neuer Browser-/iPhone-/Safari-Interaktionstest und kein realer KI-Test für 1.5.1. Historische Browserprüfungen von 1.5 sind keine neue Abnahme.
- **Noch nicht veröffentlicht.** Git-Push-Test abgewiesen: `fatal: unable to get password from user`. GitHub und Vercel waren in dieser Sitzung nicht verbunden. Der vorhandene Handy-Link erhält das Update erst nach Veröffentlichung im bestehenden Projekt.
