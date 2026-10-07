"use client";
import { useRef, useState } from "react";
import { parseBackup } from "../lib/domain.mjs";
import { downloadJson } from "./Settings";
import { Header, Notice, Button, Dialog } from "./ui";
export default function Recovery({ storage, error, retry, restore }) {
  const [candidate, setCandidate] = useState(null),
    [detail, setDetail] = useState(""),
    [busy, setBusy] = useState(false),
    file = useRef(null);
  async function read(e) {
    try {
      const raw = JSON.parse(await e.target.files[0].text()),
        parsed = parseBackup(raw);
      setCandidate({ raw, summary: parsed.summary });
    } catch (err) {
      setDetail(err.message);
    } finally {
      e.target.value = "";
    }
  }
  return (
    <div className="shell">
      <Header title="Dein Bestand bleibt geschützt" />
      <Notice kind="error">{error}</Notice>
      <p>
        Es wird kein leerer Bestand gespeichert. Du kannst erneut laden, die
        unveränderten Rohdaten exportieren oder ein geprüftes Backup
        wiederherstellen.
      </p>
      {detail && <Notice kind="error">{detail}</Notice>}
      <div className="actions">
        <Button onClick={retry}>Erneut laden</Button>
        <Button
          onClick={async () => {
            try {
              const raw = await storage.readRaw();
              if (raw === undefined)
                throw new Error("Kein gespeicherter Rohbestand gefunden.");
              downloadJson(raw, "espresso-lab-unveraenderter-bestand.json");
            } catch (e) {
              setDetail(e.message);
            }
          }}
        >
          Rohdaten exportieren
        </Button>
        <Button onClick={() => file.current.click()}>Backup prüfen</Button>
        <Button
          onClick={async () => {
            try {
              const r =
                (await storage.readRecovery()) ||
                (await storage.readMigrationBackup());
              if (!r)
                throw new Error("Noch kein lokaler Sicherungsstand vorhanden.");
              const parsed = parseBackup(r.state);
              setCandidate({ raw: r.state, summary: parsed.summary });
            } catch (e) {
              setDetail(e.message);
            }
          }}
        >
          Sicherungsstand prüfen
        </Button>
      </div>
      <input
        className="visually-hidden"
        ref={file}
        type="file"
        accept="application/json,.json"
        onChange={read}
      />
      {candidate && (
        <Dialog
          title="Geprüften Stand wiederherstellen?"
          onClose={() => {
            if (!busy) setCandidate(null);
          }}
        >
          <p>
            {candidate.summary.coffees} Kaffees, {candidate.summary.shots}{" "}
            Versuche. Der bisherige Rohbestand wird atomar gesichert.
          </p>
          {detail && <Notice kind="error">{detail}</Notice>}
          <div className="actions">
            <Button disabled={busy} onClick={() => setCandidate(null)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await restore(candidate.raw);
                  setCandidate(null);
                } catch (e) {
                  setDetail(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Wiederherstellen
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
