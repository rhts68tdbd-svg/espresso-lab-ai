# Vollständiger Checkpoint – Dial-in-Umsetzung, 07.10.2026

## Verbindlicher Stand

Der Nutzer hat die Zusammenführung von Kaffees und Passport und den Beginn der Umsetzung ausdrücklich freigegeben. Die ergänzte achtseitige Zusammenfassung und der vollständige Review sind als Revision 3 gespeichert. Maßgebliches Produktkonzept: [PRODUCT.md](PRODUCT.md). Plan: [PLAN.md](PLAN.md). Einzelne Prüfungen und verbleibende Grenzen: [VALIDATION.md](VALIDATION.md). Die neu beigefügte Wissensquelle wurde abgeglichen.

- Repository: https://github.com/rhts68tdbd-svg/espresso-lab-ai
- Unveränderte Audit-/Main-Basis: `4bd3ecae31d089f42d8f69f96313eff24067d278` (v1.4.0).
- Lokaler Arbeitsbranch: `redesign/local-dial-in`. Foundation-Commit: `521e920`.
- Dieser Checkpoint wird mit dem geprüften Implementierungsstand committet; der HEAD dieses Branches ist der nächste Einstieg. Keine Übertragung an GitHub, kein PR, keine Veröffentlichung vorgenommen.

## Zusammenhängendes Ergebnis

Die App führt einen neu probierten Kaffee vom Zielprofil über gezielte Versuche zum ausdrücklich bestätigten Rezept. Zwei Hauptbereiche: **Einstellen** und **Kaffees**. Die Sammlung vereint Suche, Favoriten, Bewertungen, Rezepte und Packungen. Der optionale Rückblick erzeugt nur übergreifende Angaben aus ohnehin vorhandenen Daten; kein zusätzlicher Passport-Tab oder zusätzliche Pflege.

Manuelle Anlage und bestätigte KI-Verpackungsvorschläge führen zu Ziel, Packung und persönlicher Basis. Fotos werden browserseitig komprimiert. Wiederkauf legt bewusst eine eigene Packung unter dem bekannten Kaffee an und nutzt das frühere Rezept als Referenz. Zeit und Geschmack werden nicht aus dem vorherigen Versuch übernommen. Ratio wird berechnet.

Der Versuch wird vor jedem KI-Aufruf dauerhaft lokal gespeichert. Retry verwendet dieselbe Shot-ID. Die KI erhält höchstens sechs relevante Vergleichsversuche, Messungen, historischen Equipment-Kontext, Rösterangaben und Rezeptreferenz. Ein Ergebnis wird nur in unveränderten Kontext übernommen. Früher gespeicherte Auswertungen werden nach relevanten Änderungen kenntlich gemacht und nicht automatisch als neuer Plan verwendet. Im Rocket-Giotto-Dial-in kein Temperatur-/PID-Stellhebel.

Vergleich zeigt Änderungen und tatsächlichen Geschmack. Das vom Nutzer bestätigte Rezept ist eine unabhängige Kopie mit Quellenbezug. Eine spätere Änderung des Quellversuchs verändert es nicht.

## Datenvertrauen und Migration

IndexedDB bleibt lokal: DB `espresso-lab-ai`, Version 1, Store `kv`, Key `state`. Keine Cloud-Datenbank, Accounts oder Synchronisierung. Schema 2 wird beim Laden nur im Speicher normalisiert. Vor dem ersten Commit aus einem älteren Format werden unveränderter Rohbestand und neue Daten atomar gesichert; bei Quota/Abort bleibt der Bestand erhalten. Legacy-/Unknown-Felder und alte Ratings bleiben bewahrt.

Import validiert Struktur und Referenzen vor einer ausdrücklichen Übernahme, erstellt einen atomaren Recovery-Stand und erhält Entwürfe. Export wartet auf bereits begonnene Entwurfsschreibvorgänge. Getrennte Fenster haben eigene Entwürfe; Revisionen und Editor-Ausgangsstände verhindern stilles Überschreiben. Archivieren ist wiederherstellbar. Kein automatischer Merge oder Löschen/Neuinitialisieren echter Browserdaten.

Vor einem produktiven Rollout ist ein extern abgelegtes Backup erforderlich; Sicherungen innerhalb derselben Browserdatenbank ersetzen es nicht. Browser-Origin beibehalten. Ältere App-Versionen sind kein geprüfter Leser des neuen Backupformats.

## Dateien und Aufbau

- `app/`: Shell, Light/Dark-Tokens, mobile Controls und begrenzte API-Routen.
- `components/`: Einstieg/Sammlung/Kaffee, Anlage, Shot-Erfassung/-Vergleich, Bewertung, Einstellungen, Recovery und gemeinsame kleine Controls.
- `lib/`: Domain/Storage, Commit- und Draft-Hooks, Navigation, Editor-Konfliktprüfung, gemeinsamer Analysekontext und Runtime-KI-Vertrag.
- `scripts/`: Build-Service-Worker; eigene statische Appdateien offline, APIs niemals im Cache; bewusste Aktualisierung.
- `public/`: Manifest, passende Icons; `sw.js` wird aus dem jeweiligen Build generiert und nicht versioniert.
- `tests/`: Domain-/IndexedDB-/KI-Proben und vollständiger Browserablauf mit synthetischen Daten.
- README, Paket/Lockfile, Umsetzungs-/Prüfdokumentation. Ältere Releases sind nur Historie.

## Letzte bestandene Prüfungen

- `npm test`: **22/22** bestanden.
- `npm run build`: bestanden, Next.js 15.5.21; Offline-Shell aus tatsächlichen Build-Dateien erzeugt.
- `ESPRESSO_TEST_CHROMIUM=/tmp/chromium npm run test:browser`: **22/22** bestanden, isolierter Chromium-Kontext.
- Manuelle visuelle Kontrolle bei 320/390 px, großer Schrift und Dark Mode; zusätzlicher tatsächlicher Foto-Dateiupload samt Canvas/IndexedDB/Sammlungsanzeige bestanden.
- Abschließende Format-/Diff-Prüfung gehört zum selben Abschlusscommit.

Keine echten Nutzerdaten verändert und keine bezahlten Modellaufrufe durchgeführt. Browserproben ersetzen keine physische iOS-/Android-Prüfung oder reale KI-Abnahme.

## Offen und nächster Einstieg

1. **Freigabe für Paketdownload und den konkret benannten GitHub-Push** einholen. Die automatische Freigabeprüfung hat den Push mangels ausdrücklicher Autorisierung des Quellcode-Exports abgelehnt. Der Patchdownload wurde vor Netzwerkfreigabe abgebrochen; der Offline-Versuch konnte das fehlende Cachepaket nicht bereitstellen. Kein Umweg versucht.
2. Verifizierten Next.js-15.5.27-Patch und erforderliche Korrekturen seiner Abhängigkeitskette installieren, Audit/Build/Workflowprüfungen erneut durchführen. Vorhandener Auditbefund: next critical sowie postcss/sharp high. Der ungenutzte serverseitige Bildoptimierer ist deaktiviert (Browserprobe: 404); das ersetzt den Paketpatch nicht.
3. Geprüften Branch an das bestehende Repository übertragen. Ein Push kann eine Vercel-Preview auslösen. Noch kein automatischer Main-Merge oder Produktivrollout.
4. Tatsächlichen Modellnamen und Serverkonfiguration prüfen; mit freigegebenem Testkontext echte Verpackung/Shot-Antworten prüfen. Keine Schlüssel ausgeben oder verlangen.
5. Physisches Smartphone: Kamera/HEIC, Tastatur, einhändiges Erfassen, installierte PWA und Update mit offenem Entwurf. Vor Produktion vollständiger Deployment-Checkpoint und externes Backup.

Nicht am letzten Chattext oder an veralteten Releaseanforderungen neu beginnen. Auf diesem Branch und den verknüpften Dokumenten fortsetzen. Kein weiteres Architekturprojekt erforderlich.
