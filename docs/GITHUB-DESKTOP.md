# Manuelle Übergabe mit GitHub Desktop

Der Nutzer übernimmt den Push manuell. Die ZIP enthält ein eigenständiges lokales Git-Repository mit dem vollständigen vorbereiteten Branch `redesign/local-dial-in` und seiner Commit-Historie. Der Remote verweist bereits auf das bestehende Repository https://github.com/rhts68tdbd-svg/espresso-lab-ai.git. Kein GitHub-Plugin ist für diesen Weg nötig.

## Schritte

1. ZIP vollständig in einen neuen Ordner entpacken. Das darin enthaltene Repository heißt `espresso-lab-ai`. Der versteckte Ordner `.git` gehört zur Übergabe und muss mit entpackt werden.
2. GitHub Desktop öffnen und **File → Add Local Repository → Choose…** auswählen. Den gerade entpackten Ordner `espresso-lab-ai` wählen, dann **Add Repository**. Alternativ diesen Ordner auf das GitHub-Desktop-Fenster ziehen.
3. Oben unter **Current Branch** den bereits vorhandenen Branch `redesign/local-dial-in` prüfen. Die enthaltenen Änderungen sind bereits committet; der Changes-Bereich sollte leer sein.
4. **Publish branch** anklicken. Falls nach einem Ziel gefragt wird, das vorhandene Repository `rhts68tdbd-svg/espresso-lab-ai` verwenden. Dafür in GitHub Desktop mit einem Konto angemeldet sein, das dort Schreibzugriff hat.
5. Unter **Repository → View on GitHub** den veröffentlichten Branch prüfen. Der erwartete Commit steht in `START-HIER.txt` neben dem Repository-Ordner.

Die Übergabe ist für das Hinzufügen als eigenes lokales Repository vorbereitet. Ein bestehender lokaler Klon muss dafür nicht mit Dateien überschrieben werden. Falls stattdessen **Publish repository** angeboten wird, zuerst unter **Repository → Repository Settings → Remote** die vorhandene GitHub-Adresse prüfen. Für diesen Schritt kein neues GitHub-Repository erzeugen.

## Umfang und Abnahme

Enthalten: vollständiger Quellcode, Lockfile, Git-Historie, Checkpoints, Prüfnachweise und Anleitung. `node_modules`, `.next`, generierter Service Worker, Browser-Testdaten und Zugangsdaten sind nicht Teil des Pakets. Die optionale Serverkonfiguration bleibt in Vercel; neue Accounts oder Datenbankdienste werden nicht benötigt.

Nach Paketpatch geprüft: Next.js 15.5.27, PostCSS 8.5.23, sharp 0.35.5; 22/22 Datentests, 22/22 Browserprüfungen, Build bestanden, npm audit mit 0 bekannten gemeldeten Schwachstellen. Einzelheiten: [VALIDATION.md](VALIDATION.md).

Veröffentlichung dieses Branches ist kein Merge in main. Ein Branch-Push kann eine Vercel-Preview auslösen; deren tatsächlicher Status wurde noch nicht bestätigt. Reale KI-/Smartphone-Abnahme und externes Backup auf der bestehenden Produktions-Origin stehen vor dem Produktivrollout noch aus.

## Offizielle Quellen für die Desktop-Schritte

- https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop
- https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-branches-in-github-desktop
