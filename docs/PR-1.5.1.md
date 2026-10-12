# KI-Version 1.5.1: fünf Daten-/Kontextfehler und endgültiges Löschen

In 1.5 gingen Siebkorrekturen und frühere KI-Auswertungen bei Shot-Änderungen verloren. Fehlende Zeitbasis wurde als Messung ab erstem Tropfen interpretiert; historische Mahlgrade konnten nach einem Mühlenwechsel vorbefüllt werden. Identische Kaffees ohne optionalen Röster wurden nicht erkannt. Archivierte Kaffees ließen sich nicht endgültig entfernen.

Dieses Update korrigiert diese Fälle und ergänzt im Archiv einen bestätigungspflichtigen Löschvorgang. Aktueller Bestand, zugehörige Entwürfe aller Fenster und interne Sicherungskopien werden atomar bereinigt. Konflikte und Speicherfehler rollen vollständig zurück. Verspätete KI-Antworten erzeugen gelöschte Datensätze nicht neu.

Geschmacksgruppen sind direkt sichtbar; zusätzliche Angaben bleiben freiwillig. KI, Fachgrundlage, bestehende Datenbank und API-Konfiguration bleiben erhalten. Espresso Lab Local ist nicht betroffen.

Validiert: 38 Tests, Produktionsbuild, Formatierung und Diff-Prüfung. Kein neuer Browser-/iPhone- oder realer KI-Test. Vor Merge ein externes Backup in der bestehenden App exportieren; nach Deployment die Versionsanzeige 1.5.1 und einen synthetischen Archiv-/Löschvorgang am Gerät prüfen. Details: RELEASE-1.5.1.md.
