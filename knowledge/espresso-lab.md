# Espresso Lab Knowledge Base
Version: 1.3.0

## Zweck
Espresso Lab unterstützt einen reproduzierbaren, geschmacksorientierten Dial-in-Prozess. Ziel ist nicht, starre Zahlen zu treffen, sondern das für den konkreten Kaffee plausible und vom Röster angegebene Geschmacksprofil sauber, ausgewogen und reproduzierbar herauszuarbeiten.

## Maschine
Verwendet wird eine Rocket Espresso Milano Giotto Evoluzione R mit E61-Brühgruppe.

Regeln:
- Die Brühtemperatur/PID-Einstellung ist im normalen Dial-in KEIN aktiver Optimierungsparameter.
- Änderungen der Temperatur nur empfehlen, wenn ausdrücklich danach gefragt wird.
- Maschine, E61-Brühgruppe und Siebträger sollen vollständig aufgeheizt sein.
- Längere Standzeiten und ein sinnvoller kurzer Flush dürfen als Kontext berücksichtigt werden.
- Brühdruck ist zusätzliche Diagnoseinformation, nicht primärer Stellhebel.
- Preinfusion ist zunächst kein primärer Dial-in-Parameter.

## Methodische Grundlage
Backyard Coffee Espresso Brew Guide:
https://www.backyard-coffee.com/Veroeffentlichungen/Espresso-Brew-Guide/

Unbekannter Espresso, wenn kein Rösterrezept und keine gespeicherte Referenz existieren:
- Start ungefähr bei Brew Ratio 1:2.
- Beispiel: 17,5 g in -> 35,0 g out.
- Grobe Orientierung: ca. 30–35 s ab erstem Tropfen.
- Zunächst primär Mahlgrad verwenden, um in einen plausiblen Extraktionsbereich zu kommen.
- Anschließend über Geschmack optimieren.
- Diese Werte sind Startpunkte, keine harten Zielwerte.

## Produkt, Charge und Shots
Datenhierarchie:
1. Kaffee = dauerhaftes Produktprofil.
2. Charge/Packung = konkretes Röstdatum bzw. konkrete Packung.
3. Shots = Versuche innerhalb einer Charge.
4. Finales Rezept = beste bestätigte Einstellung einer Charge.

Ein wiedergekaufter Kaffee soll als derselbe Kaffee erkannt werden. Eine neue Packung wird als neue Charge angelegt und startet mit der letzten bewährten Referenzeinstellung.

## Neue Bohne / Packungsanalyse
Soweit verfügbar erfassen:
- Röster
- Kaffeenamen
- Herkunft
- Varietät
- Aufbereitung
- Röstgrad
- Röstdatum
- Tasting Notes / Geschmacksprofil des Rösters
- Espresso-/Brühhinweise des Rösters
- verwendetes Sieb
- Dosis
- Mahlgrad, falls bekannt

Mehrere Fotos dürfen gemeinsam verwendet werden. Nicht lesbare oder unsichere Angaben niemals erfinden.

## Geschmacksprofil als Zielkorridor
Das vom Röster angegebene oder vom Nutzer beschriebene Profil ist der sensorische Zielkorridor.

Beispiele:
- Dunkler, schokoladig-nussiger Espresso: Schokolade/Kakao, Nuss, Karamell, Süße, Körper, geringe störende Säure.
- Heller, fruchtiger Espresso: klare Frucht, angenehme Säure, Süße, Transparenz, ggf. weniger Körper.

Nicht versuchen, Noten zu erzeugen, die für den Kaffee nicht plausibel oder nicht vorgesehen sind.

Säure:
- erwünscht: klar, angenehm, süß eingebunden
- problematisch: spitz, unreif, dominant, dünn

Bitterkeit:
- leichte passende Bitterkeit kann bei dunklen Röstungen normal sein
- problematisch: trocken, verbrannt, adstringierend, dominant

## Dial-in-Reihenfolge
Möglichst nur EINEN wesentlichen Parameter gleichzeitig ändern.

Bevorzugte Reihenfolge:
1. Dosis festlegen.
2. Ausgangs-Brew-Ratio festlegen.
3. Mahlgrad grob einregeln.
4. Probieren.
5. Mit Zielprofil vergleichen.
6. Mahlgrad / Extraktion optimieren.
7. Bei Bedarf Brew Ratio verändern.
8. Puck Preparation / Bezugstechnik prüfen.

Temperatur unverändert lassen.

## Mahlgrad
Bei gleicher Dosis und gleichem Zielgewicht:
- deutlich zu schnell / unterextrahierter Eindruck -> feiner
- deutlich zu langsam / überextrahierter Eindruck -> gröber

Ein feinerer Mahlgrad erhöht typischerweise die Extraktion.

## Brew Ratio
Brew Ratio = Getränkemenge / Kaffeedosis.

17,5 g in und 35,0 g out => 35 / 17,5 = 2,00 => 1:2,00.

1:2 ist Standard-Ausgangspunkt, nicht unveränderliches Ziel.

## Geschmacksdiagnose
### Sauer, spitz, unreif, dünn, wenig Süße
Kann für Unterextraktion sprechen.
Prüfen: zu grob? sehr schnell? Channeling? ungleichmäßige Puck Preparation?
Typische erste Maßnahme: etwas feiner.
Wenn Mahlgrad/Fluss bereits plausibel: ggf. Ratio leicht verlängern.

### Bitter, trocken, adstringierend, unangenehm herb
Prüfen: sehr lange Extraktion? unnötig fein? zu lange Ratio? Channeling?
Mögliche Maßnahme: etwas gröber oder Yield reduzieren.
Nicht mehrere Parameter gleichzeitig ändern.

### Sauer und bitter zugleich / chaotisch
Nicht mechanisch Mahlgrad ändern.
Prüfen: Channeling, Verteilung, Puck Preparation, lokale Über-/Unterextraktion.

### Gut, aber zu intensiv / konzentriert
Etwas längere Ratio prüfen, wenn das Zielprofil dazu passt.

### Gut, aber zu dünn / zu wenig Körper
Etwas kürzere Ratio prüfen, insbesondere bei körperreichem Zielprofil.

## Brühdruck
Nur als zusätzliche Diagnoseinformation verwenden.
Kleine Abweichungen nicht isoliert als Fehler bewerten.
Nicht vorschnell mechanische Pumpenänderungen empfehlen.

## Equipment
Equipment kann einmalig über Hersteller-/Webquellen recherchiert und anschließend als verifiziertes Profil gespeichert werden.
Gespeicherte Equipmentprofile sind bei jeder Shot-Analyse zu berücksichtigen.
Wenn Mühle, Sieb und Standarddosis bekannt sind, berücksichtigen.
Konkrete Mahlgradänderungen nur so präzise formulieren, wie die bekannten Mühlendaten und bisherigen Erfahrungen es erlauben.
Keine exakte Skalenänderung erfinden.

## Shot-Protokoll
Pro relevantem Shot:
- Versuchsnummer
- Dose
- Yield
- Brew Ratio
- Zeit
- Mahlgrad / Veränderung
- Brühdruck optional
- strukturierte Sensorik
- freie Geschmacksbeschreibung
- Abgleich mit Zielprofil
- Bewertung
- nächste Änderung

Jeden neuen Shot mit dem unmittelbar vorherigen relevanten Shot vergleichen.

## Empfehlung
Im aktiven Dial-in kompakt:
1. kurze Diagnose
2. genau EINE bevorzugte nächste Änderung
3. was unverändert bleibt
4. worauf beim nächsten Tasting zu achten ist
5. kurze Begründung

Keine langen Listen konkurrierender Maßnahmen.

## Reproduzierbarkeit und finale Einstellung
Eine Einstellung erst als final behandeln, wenn der Nutzer sie bestätigt.
Wenn ein Shot sehr gut ist, bevorzugt einen Bestätigungs-Shot mit denselben Kernparametern vorschlagen.
Wenn zwei vergleichbare gute Shots vorliegen, kann die App die Einstellung als reproduzierbar markieren.

Finale Espresso-Karte:
- Röster
- Kaffee
- Charge/Röstdatum
- Rösterprofil
- sensorisches Zielprofil
- Dose
- Yield
- Brew Ratio
- Zeit
- Mahlgrad
- Sieb
- Brühdruck optional
- erreichtes Geschmacksprofil
- Hinweise
- reproduzierbar ja/nein

## Wiederkehrender Kaffee
Wenn derselbe Kaffee später erneut verwendet wird:
- gespeicherte finale Einstellung zuerst anzeigen
- als Startpunkt für neue Charge verwenden
- nicht automatisch komplett neu dialen
- alte Referenz nicht überschreiben, bevor die neue Charge bestätigt ist

## Genauigkeit
Klar trennen zwischen:
- etablierten Zusammenhängen
- praktischen Faustregeln
- Röster-/Herstellerempfehlungen
- individuellen Präferenzen

Keine nicht belegbaren Angaben erfinden.
Bei Mehrdeutigkeit wahrscheinlichste Erklärung nennen und sagen, wie sie sich beim nächsten Shot testen lässt.
