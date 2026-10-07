# Vollständiger Checkpoint vor GitHub-Push – 07.10.2026

## Autorisierung und Quellstand

Der Nutzer hat nach der konkreten Vorlage Paketdownload und Push ausdrücklich mit „Ja pushen“ freigegeben. Ziel ist ausschließlich der bestehende Branch `redesign/local-dial-in` im Repository https://github.com/rhts68tdbd-svg/espresso-lab-ai. Der Branch-Push kann eine Vercel-Preview auslösen; ein Main-Merge und produktiver Rollout sind nicht Bestandteil dieses Schritts.

- Audit-/Main-Basis: `4bd3ecae31d089f42d8f69f96313eff24067d278`. Remote-Main vor Push erneut identisch bestätigt. Der Zielbranch war remote noch nicht vorhanden.
- Implementierung: `521e920` (Daten-/Produktgrundlage), `bc7e36c` (zusammenhängender Dial-in-/Sammlungsstand).
- Dieser Checkpoint wird mit der geprüften Paketkorrektur und aktueller Dokumentation committet. Maßgeblicher freigegebener Stand ist dessen Branch-HEAD. Nach dem Push Remote-Hash mit lokalem HEAD vergleichen.

Die zwei Hauptbereiche Einstellen/Kaffees, die Vereinigung des Passport, Kaffee/Packung/Versuche/Rezept und die lokale IndexedDB-Architektur bleiben wie akzeptiert. Vollständiger Implementierungsüberblick: [CHECKPOINT-02-implementation.md](CHECKPOINT-02-implementation.md). Aktuelle Anforderungen: [PRODUCT.md](PRODUCT.md). Die achtseitige PDF-Zusammenfassung ist Revision 3.

## Paketkorrektur

Next.js 15.5.21 → **15.5.27**. Der Patch alleine beließ zwei verwundbare transitive Abhängigkeiten. Deshalb gezielte Overrides nur unter next: **PostCSS 8.5.23**, **sharp 0.35.5**. Letzteres liegt im von Next.js deklarierten Versionsbereich. Kein Framework-Hauptversionswechsel. Paket/Lockfile zusammen aktualisiert.

Node.js **24.x** als Build-/Serverlaufzeit festgelegt, lokal 24.19.0 geprüft; Vercels Unterstützung anhand offizieller Dokumentation bestätigt. Native sharp-Bibliothek lädt erfolgreich und meldet librsvg 2.63.2. Der nicht benötigte Next-Bildoptimierer bleibt deaktiviert. Quellen und Prüfbericht: [VALIDATION.md](VALIDATION.md), [security-audit-2026-10-07.json](security-audit-2026-10-07.json).

## Bestandene Prüfungen nach Paketänderung

- `npm test`: **22/22** bestanden.
- `npm run build`: bestanden, Next.js **15.5.27**; Service Worker aus tatsächlichen Build-Dateien generiert.
- `ESPRESSO_TEST_CHROMIUM=/tmp/chromium npm run test:browser`: **22/22** bestanden. Ausschließlich synthetische Daten und kontrollierte KI-Antworten.
- `npm audit --json`: **0 bekannte gemeldete Schwachstellen**; alle fünf Schwereklassen 0. Keine Aussage über unbekannte Lücken oder vollständige Anwendungssicherheit.
- `npm run format:check` und `git diff --check`: bestanden. Keine Secrets oder Browserdaten im Commit.

## Datensicherheit und Grenzen

DB `espresso-lab-ai`, Version 1, Store `kv`, Key `state` bleiben. Laden schreibt nicht; additive Migration/Import sichern den bisherigen Rohbestand atomar. Keine echten Nutzerdaten gelesen, gelöscht, neu initialisiert oder migriert. Keine Cloud-Datenbank, Accounts oder Synchronisierung ergänzt.

Backups innerhalb desselben Browsers ersetzen keinen extern gespeicherten Export. Vor Produktivrollout bestehenden Origin und externes Backup prüfen. Preview-Daten sind wegen anderer Browser-Origin getrennt; keine vorhandenen Daten auf der Produktionsadresse daraus ableiten. Keine echte KI-Abnahme oder physische Smartphone-Abnahme behauptet.

## Nächster Einstieg

Push abschließen und Remote-Hash bestätigen. Danach tatsächlichen Vercel-Preview-Stand, verfügbaren OPENAI_MODEL und Konfiguration prüfen. Reale KI-/Verpackungsantworten sowie physisches iOS/Android mit Tastatur, Kamera/HEIC, einhändigem Erfassen und PWA-Update mit offenem Entwurf abnehmen. Vor Produktivrollout eigener Deployment-Checkpoint und externes Backup. Die frühere Freigabeblockade gilt für den hier ausdrücklich freigegebenen Branch-Push nicht mehr.
