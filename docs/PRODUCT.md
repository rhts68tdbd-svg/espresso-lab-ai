# Verbindliches Produktkonzept – 07.10.2026

Espresso Lab führt einen neu probierten Kaffee vom Geschmacksziel zum ausdrücklich bestätigten Rezept. Es verlangt kein tägliches Espresso-Protokoll.

## Kernablauf

Kaffee/Packung per Foto oder manuell vorbereiten → Rösterprofil prüfen und eigenes Ziel bestätigen → mit persönlicher Grundeinstellung starten → tatsächliche Werte und Geschmack erfassen → KI nennt Diagnose, genau eine bevorzugte Änderung, unveränderte Werte und Tasting-Fokus → gezielt weiterprobieren → Nutzer bestätigt sein Rezept.

Für unbekannte Kaffees gilt die persönliche Basis, beispielsweise 17,5 g und Ratio 1:2 = 35 g Zielmenge. Zeit ist eine Messung, kein vorab erfundener Wert. Bei erneut gekauftem Kaffee dient das frühere bestätigte Rezept als Referenz; eine neue Packung erhält ihre eigene Historie.

## Navigation: Kaffees und Passport zusammengeführt

- **Einstellen:** aktueller Dial-in, Ziel, letzter Versuch, nächster Schritt. Neuer Kaffee unmittelbar erreichbar.
- **Kaffees:** eine Sammlung mit Suche, Favoriten, optionalen Bewertungen, bestätigten Rezepten und allen Packungen.
- **Einstellungen:** benanntes Icon; Equipment, persönliche Basis, Darstellung, Backup und Wiederherstellung.

Der Passport war als automatisch erzeugtes Gedächtnis und Rückschau gedacht. Ein eigener Bereich dupliziert jedoch Kaffees, Bewertungen, Favoriten und Rezepte. Der Nutzer hat die Zusammenführung ausdrücklich akzeptiert. Kein Passport-Tab, keine zusätzliche Dateneingabe. Ein untergeordneter **Rückblick** ist nur für übergreifende Erkenntnisse sinnvoll, z. B. dokumentierte Röstereien und selbst geschmeckte Profile. Er wird aus dem Bestand abgeleitet und benötigt keine eigene Entität.

## Verbindliche Grenzen

- Lokale IndexedDB, mobile Web-App/PWA, GitHub/Vercel und optionale KI-Serverrouten bleiben. Keine Accounts, Cloud-Datenbank oder Synchronisierung.
- Geschmack hat Vorrang vor starren Zeit-/Ratio-Sollwerten. Nur eine wesentliche Stellgröße pro nächstem Versuch.
- Im normalen Dial-in der Rocket Giotto Evoluzione R keine Temperatur-/PID-Änderung empfehlen; Druck nur optionaler Diagnosekontext.
- „Shot auswerten“ speichert zuerst dauerhaft lokal. KI-Ausfälle verlieren keinen Shot; Wiederholung verwendet dieselbe ID.
- Finalisierung erfolgt ausdrücklich durch den Nutzer. Rezept ist eine unabhängige Kopie; Editieren des Quell-Shots verändert es nicht.
- Fehlende Bewertungen, Messungen und Sensorik bleiben unbekannt. Bestehende Rohdaten und auch fragliche alte 3/5-Profile bleiben erhalten.
- Bestehende Kaffees werden niemals automatisch zusammengeführt. Duplikaterkennung bietet bewusst eine neue Packung des vorhandenen Kaffees an.

Diese Grundlage ersetzt widersprüchliche Anforderungen in älteren README-/ZIP-/Mockup-Ständen. Fachgrundlage bleibt `knowledge/espresso-lab.md`; Auditbasis ist GitHub-Commit `4bd3ecae31d089f42d8f69f96313eff24067d278`. Review und achtseitige Zusammenfassung liegen als Revision 3 vom 07.10.2026 vor.
