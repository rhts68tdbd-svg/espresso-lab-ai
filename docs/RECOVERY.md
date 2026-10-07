# Recovery

- Blockziel: geprüften Stand als vollständiges lokales Repository für den manuellen Push mit GitHub Desktop übergeben.
- Fertig: Dial-in-/Sammlungsumsetzung; Next.js 15.5.27, PostCSS 8.5.23, sharp 0.35.5; Node.js 24.x; Audit mit 0 gemeldeten Schwachstellen; bestehende Freigabe zum Branch-Push. Nutzer übernimmt den Push mit GitHub Desktop.
- Offen: manuelle Veröffentlichung von `redesign/local-dial-in` im bestehenden Repository; danach Remote-Commit, Vercel-Preview, reale KI und Smartphone-Nutzung prüfen. Der frühere Git-Push scheiterte an fehlender Authentifizierung; dafür wird jetzt kein Plugin-Zugang benötigt.
- Geänderte Dateien: docs/GITHUB-DESKTOP.md, docs/RECOVERY.md, docs/VALIDATION.md. GitHub-Desktop-ZIP wird aus dem gesamten committeten Stand einschließlich Git-Historie erstellt.
- Letzter bestandener Test: nach Paketpatch 22/22 Datentests, Produktionsbuild, 22/22 Browserprüfungen und npm audit mit 0 bekannten gemeldeten Schwachstellen.
- Nächster Einstieg: docs/GITHUB-DESKTOP.md und VALIDATION.md. Nach manueller Veröffentlichung Remote-Hash mit dem in START-HIER.txt genannten Commit vergleichen; dann reale Preview-/KI-/Geräteabnahme. DB/Store und bestehende Produktions-Origin beibehalten.
