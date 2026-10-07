# Umsetzung und Prüfstand – 07.10.2026

## Umgesetzt

Die sechs geplanten Produkt-/UI-Blöcke sind im lokalen Branch funktional verbunden. **Einstellen** und **Kaffees** sind die Hauptnavigation. Der Passport geht in der Sammlung auf; der optionale Rückblick zeigt nur abgeleitete übergreifende Angaben. Keine Cloud-Datenbank, Accounts oder Synchronisierung ergänzt.

- Manueller/Fotoweg, bewusst übernommener KI-Vorschlag, persönliches Ziel und Grundeinstellung.
- Richtige Wiederkaufzuordnung, eigene Packungshistorien, Auswahl früherer Packungen und Rezeptreferenz.
- Kompakte tatsächliche Messwerte, automatisch berechnete Ratio, unbekannte Zeit bleibt leer, kurzes freiwillig genaueres Tasting.
- Dauerhafter Commit vor KI, gleiche Shot-ID beim Wiederholen, Kontext-/Versionsschutz gegen verspätete Antworten. Gespeicherte Auswertungen werden nach relevanten Änderungen als früherer Stand markiert und nicht als nächste Einstellung übernommen.
- Vergleich historischer Versuche; unabhängige Rezeptkopie nach ausdrücklicher Bestätigung; Quellen-Edit verändert das Rezept nicht.
- Kombinierte Suche/Favoriten/Sortierung, optionaler Score und Geschmackstags, vorhandene Altprofile erhalten.
- Validierter Export/Import, atomare Rohsicherung vor Migration/Ersetzen, wiederherstellbares Archiv, Entwürfe pro Fenster, Fehlermeldung statt Neuinitialisierung.
- Light/Dark-Tokens, lesbare Felder, native Dialoge, Safe Areas, Browser-Zurück, Offline-Shell und bewusstes Update.

## Bestandene Gegenproben

`npm test`: **22** Domain-/IndexedDB-/KI-Vertragsproben. Darunter Legacy-Daten, falsche Imports und Referenzen, Quota/Abort, Zwei-Fenster-Revisionskonflikt, Fotos und Rezepte im Roundtrip, getrennte Entwürfe, Abgleich offener Formulare, unbekannte Zeit und Begrenzung der KI-Payload, vorhandene Rösterrezepte und das Verwerfen überholter Vorschläge nach Ziel-/Referenzänderungen.

`npm run test:browser`: **22** komplette Browser-Gegenproben auf dem Produktionsbuild. Echte IndexedDB und ausschließlich synthetische Daten; kontrollierte KI-Antworten. Geprüft werden:

1. Zwei Hauptbereiche und handlungsfähiger Leerzustand.
2. Kaffeeanlage direkt zum sinnvollen Start, ohne erfundene Messzeit.
3. Entwurf mit Geschmack/Messwerten nach Reload erhalten.
4. Shot-Commit nachweislich vor API-Anfrage; API-Fehler verliert nichts.
5. Wiederholen derselben ID ohne Doppel-Shot.
6. Genau eine geplante Änderung; neue Zeit/Sensorik leer.
7. Bewusste Rezeptbestätigung.
8. Quell-Shot-Edit verändert keine Rezeptkopie.
9. Suche/Favoriten gemeinsam.
10. Wiederkauf als neue Packung desselben Kaffees, mit Rezeptreferenz.
11. Historische Packung mit Rezept und Verlauf erreichbar.
12. Lange Namen, 320/390 px und 200-Prozent-Schrift ohne horizontalen Überlauf.
13. Fremdes JSON verändert den Bestand nicht.
14. Tatsächlich heruntergeladener Export vollständig.
15. Import dieses Downloads in wirklich leeren Browserkontext.
16. Service-Worker-Neustart ohne Netz, Entwurf und lokale Speicherung nutzbar.
17. Ungültige/zu große API-Anfragen vor Provider-Aufruf abgewiesen.
18. Erzwungener IndexedDB-Schreibfehler: Formular/Bestand erhalten; Retry speichert einmal.
19. Zwei reale Browserfenster: offener Editor überschreibt Änderungen nicht still.
20. Verzögerte KI-Antwort nach Shot-Edit überschreibt weder Geschmack noch Messung.
21. Keine Laufzeit-Exceptions im gesamten Testablauf.
22. Nicht benötigter serverseitiger Bildoptimierer liefert 404 statt Bilder zu verarbeiten.

Zusätzliche isolierte Fotoprobe: tatsächlicher PNG-Dateiupload → Canvas-Komprimierung zu JPEG → IndexedDB-Commit → Foto in Sammlung. Shot-Ansichten bei 320/390 px und großer Schrift sowie Dark Mode aufgenommen und visuell geprüft. Kein reales Verpackungsfoto wurde damit erfolgreich von einer KI gelesen.

Die zusätzlich beigefügte `Espresso_Lab_Wissensquelle.txt` wurde abgeglichen: Zielkorridor, Rocket/E61-Kontext, Dosis/Ratio als Startpunkt, Geschmack als Maßstab, eine bevorzugte Änderung und ausdrücklicher Rezeptabschluss entsprechen der vorhandenen Fachgrundlage.

## Paketbefund F37 / P1 – korrigiert

Vor der Korrektur meldete `npm audit --omit=dev` für die Next.js-15.5.21-Abhängigkeitskette **ein critical und zwei high** (Pakete next, postcss, sharp). Das ist ein Paketbefund, kein Nachweis einer Ausnutzung dieser konkreten App.

Herstellerhinweise verifiziert:

- [Next.js GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4): AVIF-Bildoptimierung, betroffene 15.x-Versionen vor 15.5.24.
- [Next.js GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36): Windows-spezifische Serverbedingungen. Übertragbarkeit auf die bestehende Vercel-Bereitstellung nicht bestätigt.
- [Next.js 15.5.27](https://github.com/vercel/next.js/releases/tag/v15.5.27): passender Patch innerhalb der bestehenden Versionsreihe; npm nennt ihn als verfügbare Korrektur.

Nach Nutzerfreigabe installiert: **Next.js 15.5.27**, dazu gezielte npm-Overrides nur unter `next` auf **PostCSS 8.5.23** und **sharp 0.35.5**. Der alleinige Next-Patch beließ PostCSS 8.4.31 und sharp 0.34.5; die Zwischenprüfung meldete deshalb noch drei betroffene Pakete (next als indirekt betroffener Verbraucher). Ein Wechsel auf Next.js 16 war dafür nicht nötig. Die aktualisierte sharp-Version liegt im von Next.js 15.5.27 deklarierten zulässigen Bereich.

- [PostCSS GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp): korrigiert in 8.5.23.
- [sharp GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w): korrigiert ab 0.35.5. Installierte native Bibliothek geprüft: librsvg 2.63.2.
- Build-/Serverlaufzeit auf Node.js **24.x** im Paket festgelegt, passend zur geprüften lokalen Version 24.19.0 und zur Mindestanforderung der korrigierten sharp-Version. [Vercel unterstützt 24.x und übernimmt package.json-engines](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Die tatsächliche spätere Deployment-Laufzeit ist damit noch nicht beobachtet.

Abschlussprüfung `npm audit --json`: **0 bekannte gemeldete Schwachstellen**, alle fünf Schwereklassen 0. Rohbericht samt verwendeten Paket-/Laufzeitversionen: [security-audit-2026-10-07.json](security-audit-2026-10-07.json). Das ist ein Ergebnis der Paketprüfung zum Prüfzeitpunkt, kein Nachweis vollständiger Anwendungssicherheit.

Nach den Paketänderungen erneut bestanden: **22/22** Datentests, Produktionsbuild und **22/22** Browserprüfungen. Der ungenutzte serverseitige Bildoptimierer bleibt deaktiviert; Fotos werden im Browser komprimiert.

## Offene Freigabepunkte

- GitHub-Push an das bestehende Repository ist ausdrücklich freigegeben. Geprüfter Freigabestand: [CHECKPOINT-03-before-push.md](CHECKPOINT-03-before-push.md). Der ausgeführte Push scheiterte anschließend an fehlender GitHub-Authentifizierung (`could not read Username`). CLI, Token und Credential-Helper sind nicht verfügbar; die Plugin-Suche meldet GitHub verfügbar, aber nicht verbunden. Remote-Commit wird nach hergestellter Verbindung und erfolgreichem Push abgeglichen. Eine erneute Nutzerfreigabe für denselben Branch ist nicht erforderlich. Der Nutzer übernimmt den Push jetzt manuell mit GitHub Desktop; dafür wird ein vollständiges lokales Repository als ZIP mit [Desktop-Anleitung](GITHUB-DESKTOP.md) übergeben. Der Plugin-Zugang ist für diesen Weg nicht nötig.
- Reale KI-Qualität und tatsächliche OPENAI_MODEL-/Vercel-Konfiguration. Keine bezahlten Modellaufrufe in diesen Prüfungen.
- Physisches iOS/Android-Gerät: echte Tastatur, Kamera/HEIC, einhändige Nutzung, installierte PWA und tatsächliches Update mit offenem Entwurf.
- Vercel-Origin unverändert halten; vor produktivem Rollout externes Backup und vollständigen Deployment-Checkpoint prüfen. Ein Branch-Push kann eine Vercel-Preview auslösen.

„Espresso Lab ist fertig“ und eine vollständige Geräte-/KI-Abnahme werden ausdrücklich noch nicht behauptet.
