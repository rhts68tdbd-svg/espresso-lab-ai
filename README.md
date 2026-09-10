# Espresso Lab AI v1

Mobile-first iPhone PWA mit OpenAI-Integration, lokaler IndexedDB-Speicherung und integrierter Espresso-Lab-Knowledge-Base.

## Was bereits enthalten ist
- geführtes Anlegen neuer Kaffees
- Packungsfoto vom iPhone
- KI-Extraktion von Röster, Kaffee, Tasting Notes usw.
- sensorisches Zielprofil
- Rocket Giotto Evoluzione R als Maschinenkontext
- Brühtemperatur ausdrücklich nicht als normaler Dial-in-Stellhebel
- schnelle Shot-Eingabe
- Multi-Tag-Tasting statt eines einzelnen Dropdowns
- automatische Brew Ratio
- gesamte Shot-Historie als Kontext für die KI
- genau eine bevorzugte nächste Änderung
- finales Referenzrezept
- erneuter Start mit finaler Einstellung
- Shot bearbeiten / löschen
- Kaffee bearbeiten / löschen
- JSON-Backup Export + Import
- lokale Speicherung in IndexedDB
- keine Datenbank und kein Login nötig

## OpenAI
Serverseitig wird die Responses API verwendet. Der API-Key liegt niemals im Browser.

Standardmodell:
`gpt-5.6-terra`

### Lokal
1. `npm install`
2. `.env.local` erstellen:
   `OPENAI_API_KEY=sk-...`
   `OPENAI_MODEL=gpt-5.6-terra`
3. `npm run dev`
4. http://localhost:3000

### Vercel
1. Projekt zu GitHub hochladen.
2. In Vercel importieren.
3. Settings -> Environment Variables:
   - `OPENAI_API_KEY` = dein OpenAI API Key
   - optional `OPENAI_MODEL` = `gpt-5.6-terra`
4. Deploy.

## iPhone
1. Vercel-URL in Safari öffnen.
2. Teilen.
3. „Zum Home-Bildschirm“.
4. Als Web-App öffnen.

## Datenschutz / Speicherung
Kaffee- und Shot-Daten bleiben lokal in IndexedDB auf dem Gerät. Für KI-Funktionen werden die jeweils benötigten Kaffee-/Shot-Daten an den serverseitigen API-Endpunkt gesendet und von dort an die OpenAI API übergeben. Packungsbilder werden nur für die angeforderte KI-Extraktion übertragen.

## Knowledge Base
Die fachliche Basis liegt in:
- `knowledge/espresso-lab.md`
- `lib/knowledge.js`
- `lib/prompt.js`

Damit ist die Knowledge Base nicht nur Dokumentation, sondern wird bei jeder KI-Auswertung tatsächlich als Kontext übergeben.


## v1.0.1 – iPhone Photo Fix
- robustere Bildverarbeitung auf iOS/Safari
- iPhone-Fotos werden vor dem API-Aufruf in JPEG umgewandelt
- maximale Kantenlänge 1024 px, JPEG-Qualität 0,68
- Größenprüfung vor dem Request
- konkrete Fehlermeldungen bei nicht lesbaren/zu großen Bildern
- serverseitige Validierung für JPEG/PNG
