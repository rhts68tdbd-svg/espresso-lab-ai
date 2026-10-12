# Update der bestehenden KI-App auf 1.5.1

Der vorbereitete Stand liegt auf `fix/ai-v1.5.1`, basierend auf dem Produktions-main vom 07.10.2026. Die Local-App ist ein eigenständiges Projekt und gehört nicht in diesen Branch.

## GitHub Desktop

1. Das Paket vollständig in einen neuen Ordner entpacken.
2. GitHub Desktop → **File → Add Local Repository** → enthaltenen Ordner `espresso-lab-ai` auswählen. Der enthaltene `.git`-Ordner gehört dazu.
3. Branch **fix/ai-v1.5.1** veröffentlichen. Das Ziel ist das vorhandene Repository `rhts68tdbd-svg/espresso-lab-ai`.
4. Einen Pull Request nach **main** öffnen. Änderungsumfang und Prüfstand stehen in `docs/RELEASE-1.5.1.md`; ein vorbereiteter PR-Text liegt in `docs/PR-1.5.1.md`.
5. Vor dem Produktivupdate in der bestehenden Handy-App ein Backup exportieren. Den PR nach Prüfung zusammenführen und das Deployment des bestehenden Vercel-Projekts abwarten.
6. Den bisherigen Link https://espresso-lab-ai.vercel.app/ öffnen und gegebenenfalls **Update laden** wählen. In Einstellungen muss **Espresso Lab 1.5.1** stehen. Auch andere offene Fenster aktualisieren.

Keine neue Domain, kein neues Vercel-Projekt und kein neuer API-Schlüssel sind für dieses Update vorgesehen. Bestehende Vercel-Umgebungsvariablen beibehalten. Ein Branch-Push allein aktualisiert die Produktion noch nicht.

## Alternativ mit Git

Im entpackten Repository:

```sh
git push -u origin fix/ai-v1.5.1
```

Danach denselben Pull-Request- und Deploymentweg verwenden. Das Paket enthält Quellcode und Git-Historie, jedoch keine Zugangsdaten, Nutzerdaten oder installierten Abhängigkeiten.
