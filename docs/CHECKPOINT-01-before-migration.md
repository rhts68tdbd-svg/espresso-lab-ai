# Checkpoint vor additiver Migration

- Ausgang: v1.4.0, `4bd3ecae31d089f42d8f69f96313eff24067d278`; origin/main am 07.10.2026 identisch. Branch `redesign/local-dial-in`.
- Review: 36 Befunde, 4 P0; Revision 3 bestätigt zwei Hauptbereiche und lokale Architektur. Nutzer autorisiert Umsetzung.
- Persistenz bleibt `espresso-lab-ai`, IndexedDB-Version 1, Store `kv`, Key `state`. Kein Store wird gelöscht oder umbenannt.
- Migration ergänzt Schema-/Revisionsmetadaten, fehlende Packungsstruktur aus Legacy und unabhängige Kopien vorhandener Finalshots. Unknown Fields und ursprüngliche Ratings werden erhalten.
- Laden allein schreibt niemals. Vor erstem Commit einer Migration wird der unveränderte Rohzustand im selben atomaren Vorgang unter `pre-migration` gesichert. Bei Quota-/Transaktionsfehler bleibt der alte Bestand unangetastet.
- Import validiert vor Übernahme. Bestätigung und atomare Sicherung des bisherigen Zustands sind Voraussetzung für Ersetzen. Keine automatische Kaffee-Zusammenführung.
- Prüfungen geplant: leere Datenbank vs. fehlerhafte Daten, Legacy-Migration, falsche Referenzen, doppelte IDs, Transaktionsabort, Zwei-Fenster-Konflikt, Foto-/Rezept-Backup-Roundtrip.
- Produktion: unverändert. Keine echten Nutzerdaten gelesen oder migriert. Keine API-Schlüssel ausgegeben.
