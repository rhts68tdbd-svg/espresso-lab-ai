# Espresso Lab KI 1.5.1

Korrekturstand: [Änderungen und Prüfungen 1.5.1](docs/RELEASE-1.5.1.md). Dieses Projekt ist die bestehende KI-App; Espresso Lab Local bleibt separat.

Eine persönliche mobile App, die einen neu probierten Kaffee vom Geschmacksziel zum bestätigten Rezept führt. Kein tägliches Espresso-Tagebuch.

**Verbindlich:** [Produktkonzept](docs/PRODUCT.md), [konsolidierter Plan](docs/PLAN.md), [Prüfstand](docs/VALIDATION.md). Kaffees und Passport sind zusammengeführt: **Einstellen** und **Kaffees** sind die beiden Hauptbereiche. Seltene Einrichtung liegt hinter dem Einstellungs-Icon.

## Entwicklung

Node.js 24.x verwenden (lokal geprüft mit 24.19.0; als Build-/Serverlaufzeit in package.json festgelegt).

```sh
npm ci
npm run dev
npm test
npm run build
npm run start -- --hostname 127.0.0.1
```

`npm run build` erzeugt anschließend den Service Worker mit den tatsächlichen Build-Dateien. Entwicklungsmodus registriert keinen Offline-Cache. Produktionsstart und erster vollständiger Online-Aufruf sind Voraussetzung für den Offline-Neustart.

## Browserprüfung

```sh
npx playwright install chromium
npm run build
npm run test:browser
npm run format:check
```

Die Browserprüfung startet ihren eigenen lokalen Produktionsserver, verwendet ausschließlich synthetische Daten und deaktiviert den API-Schlüssel im Testserver. KI-Antworten sind kontrollierte Fixtures. Optional: `ESPRESSO_TEST_CHROMIUM=/absoluter/pfad/chromium` für einen bereits vorhandenen Testbrowser. Keine Sitzung des Nutzers wird verwendet.

## Optionale KI

`OPENAI_API_KEY` und optional `OPENAI_MODEL` liegen ausschließlich serverseitig, lokal in `.env.local` bzw. in Vercel. Die bisherige Modell-Voreinstellung ist aus Kompatibilitätsgründen erhalten; ihre tatsächliche Verfügbarkeit wurde nicht bestätigt. Einen für das API-Projekt verfügbaren Modellnamen explizit setzen und reale Antworten vor Veröffentlichung prüfen. Die App benötigt keine Nutzerkonten.

„Shot auswerten“ bestätigt zuerst den IndexedDB-Commit und startet danach die KI. Ein Fehler verliert keinen Versuch. Wiederholen wertet dieselbe ID aus; geänderte Eingaben verhindern die Übernahme einer verspäteten Antwort. Pro Vorschlag höchstens eine wesentliche Stellgröße. Temperatur/PID bleibt im normalen Rocket-Giotto-Dial-in unverändert.

## Lokale Daten

- DB `espresso-lab-ai`, Version 1, Store `kv`, Key `state` bleiben unverändert.
- Versionierter Anwendungsbestand, atomare Revisionsprüfung und bestätigter Transaktionsabschluss.
- Laden schreibt nichts. Vor erstem Commit aus einer älteren Form wird der vollständige Rohbestand atomar unter `pre-migration` gesichert.
- Bestehende Finals werden als unabhängige Rezeptkopie ergänzt. Unbekanntes historisches Equipment und fehlende Ratings werden nicht erfunden.
- Backups enthalten Fotos, Packungen, Versuche, Rezepte und Entwürfe. Import: prüfen, Vorschau bestätigen, alten Bestand atomar sichern, erst dann ersetzen.
- Archivieren ist rückgängig machbar. Im Archiv entfernt eine gesondert bestätigte Aktion den Kaffee mit Unterdaten, Entwürfen und internen Sicherungskopien endgültig. Extern exportierte Backups bleiben erhalten.
- Entwürfe werden pro Browserfenster gesichert. Lange offene Formulare prüfen ihren Ausgangsstand vor dem Speichern.

Eine lokale Sicherung liegt weiterhin im selben Browser. Für Verlust oder Wechsel des Browser-Origins wird ein **extern gespeicherter Export** benötigt. Neue versionierte Backups nicht ungeprüft in ältere App-Versionen importieren. Rollback und Originwechsel erfordern einen eigenen Sicherungs-/Transferplan.

## Codeaufbau

`lib/domain.mjs`: Parser, Modell und additive Migration. `lib/storage.mjs`: IndexedDB-Transaktionen und Backups. `lib/hooks.js`: Commit-Grenze, Entwürfe und Browsernavigation. Feature-Komponenten für Sammlung, Kaffee/Packung, Erfassung, Vergleich, Bewertung und Einrichtung. Kleine gemeinsame Controls in `components/ui.jsx`; keine zusätzliche UI-Bibliothek. Die Fachgrundlage bleibt `knowledge/espresso-lab.md`.

## Veröffentlichung

Der Korrekturstand liegt auf `fix/ai-v1.5.1`, ausgehend vom verifizierten Produktions-main. Noch nicht veröffentlicht: Der Git-Push-Test scheiterte an fehlender Authentifizierung. [Veröffentlichungsweg](docs/GITHUB-DESKTOP.md) und [aktueller Prüfstand](docs/RELEASE-1.5.1.md). Die Historie vom 07.10.2026 ist keine erneute Geräte-/KI-Abnahme für 1.5.1.

Ältere Releasebeschreibungen sind ausschließlich Historie: [LEGACY-RELEASES.md](docs/LEGACY-RELEASES.md). Sie ersetzen dieses Produktkonzept nicht.
