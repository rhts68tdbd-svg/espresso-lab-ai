"use client";
import { useEffect, useRef, useState } from "react";
import { useDraft } from "../lib/hooks";
import { decimal, parseBackup, fmt } from "../lib/domain.mjs";
import { requestJson } from "../lib/api-client.mjs";
import { equipmentFingerprint } from "../lib/edit-contract.mjs";
import { Header, Field, Button, Notice, Dialog } from "./ui";
export function downloadJson(value, name) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export default function Settings({
  state,
  storage,
  onBack,
  onSaveEquipment,
  onReplace,
  onRestoreCoffee,
}) {
  const eq = state.equipment,
    draft = useDraft(storage, "equipment", {
      _baseFingerprint: equipmentFingerprint(eq, state.preferences.theme),
      machine: eq.machine,
      grinder: eq.grinder,
      baskets: eq.baskets.join("; "),
      defaultDose: String(eq.defaultDose),
      defaultRatio: String(eq.defaultRatio),
      theme: state.preferences.theme,
    }),
    d = draft.value;
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [candidate, setCandidate] = useState(null),
    [lastExport, setLastExport] = useState(null),
    [recovery, setRecovery] = useState(null),
    file = useRef(null);
  useEffect(() => {
    storage
      .readMetadata("last-export")
      .then(setLastExport)
      .catch(() => {});
    storage
      .readRecovery()
      .then(async (r) =>
        setRecovery(r || (await storage.readMigrationBackup())),
      )
      .catch((e) => setError(e.message));
  }, [storage]);
  const set = (key, value) => draft.update((v) => ({ ...v, [key]: value }));
  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSaveEquipment(
        {
          machine: d.machine.trim(),
          grinder: d.grinder.trim(),
          baskets: d.baskets
            .split(";")
            .map((x) => x.trim())
            .filter(Boolean),
          defaultDose: decimal(d.defaultDose, { max: 100 }),
          defaultRatio: decimal(d.defaultRatio, { max: 10 }),
        },
        d.theme,
        d._baseFingerprint,
      );
      await draft.clear();
      setMessage("Einstellungen dauerhaft gespeichert.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    setError("");
    try {
      const backup = await storage.exportBackup();
      downloadJson(
        backup,
        `espresso-lab-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`,
      );
      const stamp = Date.now();
      await storage.metadata("last-export", stamp);
      setLastExport(stamp);
      setMessage(
        "Backup-Datei erstellt. Bitte außerhalb dieses Browsers aufbewahren.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function readFile(e) {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    setError("");
    try {
      if (chosen.size > 64_000_000)
        throw new Error(
          "Diese Datei ist größer als 64 MB. Bitte den Bestand vor einem Import prüfen.",
        );
      const raw = JSON.parse(await chosen.text()),
        parsed = parseBackup(raw);
      setCandidate({ raw, summary: parsed.summary, recovery: false });
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "Die Datei enthält kein lesbares JSON. Dein Bestand bleibt unverändert."
          : e.message,
      );
    }
  }
  async function replace() {
    setBusy(true);
    setError("");
    try {
      await onReplace(candidate.raw);
      setCandidate(null);
      const r = await storage.readRecovery();
      setRecovery(r);
      setMessage(
        "Backup übernommen. Der vorherige Bestand ist als lokale Wiederherstellung gesichert.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function previewRecovery() {
    try {
      const parsed = parseBackup(recovery.state);
      setCandidate({
        raw: recovery.state,
        summary: parsed.summary,
        recovery: true,
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <Header
        title="Einstellungen"
        subtitle="Deine Basis und ein sicherer Datenbestand."
        onBack={onBack}
      />
      {(error || draft.error) && (
        <Notice kind="error">{error || draft.error}</Notice>
      )}
      {message && <Notice kind="success">{message}</Notice>}
      {draft.ready &&
        d._baseFingerprint !==
          equipmentFingerprint(eq, state.preferences.theme) && (
          <Notice>
            <p>
              Gespeicherte Grunddaten wurden geändert. Aktuell: {eq.machine} ·{" "}
              {eq.grinder || "Mühle offen"} · {fmt(eq.defaultDose)} g · 1:
              {fmt(eq.defaultRatio)}. Prüfe deinen Entwurf.
            </p>
            <Button
              onClick={() =>
                draft.update((v) => ({
                  ...v,
                  _baseFingerprint: equipmentFingerprint(
                    eq,
                    state.preferences.theme,
                  ),
                }))
              }
            >
              Entwurf mit diesem Stand abgleichen
            </Button>
          </Notice>
        )}
      {draft.ready && (
        <>
          <section className="section">
            <h2>Persönliche Starteinstellung</h2>
            <p className="metadata" style={{ margin: "8px 0 20px" }}>
              Für einen unbekannten Kaffee. Bekannte Kaffees beginnen mit ihrem
              bestätigten Rezept.
            </p>
            <div className="fields">
              <div className="form-row">
                <Field
                  label="Dosis · g"
                  inputMode="decimal"
                  value={d.defaultDose}
                  onChange={(e) => set("defaultDose", e.target.value)}
                />
                <Field
                  label="Ratio · 1 zu"
                  inputMode="decimal"
                  value={d.defaultRatio}
                  onChange={(e) => set("defaultRatio", e.target.value)}
                />
              </div>
              <Field
                label="Siebe (mit ; trennen)"
                value={d.baskets}
                onChange={(e) => set("baskets", e.target.value)}
              />
              <Field
                label="Espressomaschine"
                value={d.machine}
                onChange={(e) => set("machine", e.target.value)}
              />
              <Field
                label="Mühle"
                value={d.grinder}
                onChange={(e) => set("grinder", e.target.value)}
              />
              <Field label="Darstellung">
                {(inputId) => (
                  <select
                    id={inputId}
                    value={d.theme}
                    onChange={(e) => set("theme", e.target.value)}
                  >
                    <option value="system">Wie das Gerät</option>
                    <option value="light">Hell</option>
                    <option value="dark">Dunkel</option>
                  </select>
                )}
              </Field>
            </div>
            <Button
              variant="primary"
              className="wide"
              onClick={save}
              disabled={busy}
              style={{ marginTop: 20 }}
            >
              Einstellungen speichern
            </Button>
          </section>
          <details>
            <summary>Equipment mit KI recherchieren</summary>
            <p className="metadata">
              Optionaler Vorschlag mit Quellen. Wird nur auf deine Bestätigung
              übernommen.
            </p>
            {["machine", "grinder"].map((kind) => (
              <EquipmentResearch
                key={kind}
                kind={kind}
                query={d[kind]}
                current={eq[`${kind}Research`]}
                onApply={async (result) => {
                  await onSaveEquipment({
                    [`${kind}Research`]: {
                      ...result,
                      confirmedAt: Date.now(),
                      sourceQuery: d[kind],
                    },
                    ...(kind === "grinder"
                      ? {
                          grinderType: result.profile.adjustment_type || "",
                          finerDirection: result.profile.finer_direction || "",
                        }
                      : {}),
                  });
                  setMessage("Equipmentprofil bestätigt und gespeichert.");
                }}
              />
            ))}
          </details>
        </>
      )}
      <section className="section">
        <h2>Backup und Wiederherstellung</h2>
        <p className="metadata" style={{ margin: "8px 0 16px" }}>
          Deine Daten liegen auf diesem Gerät. Ein vollständiger Export enthält
          Fotos, Packungen, Versuche, Rezepte und Entwürfe.
        </p>
        <p className="metadata">
          {lastExport
            ? `Letzte Backup-Datei erstellt: ${new Date(lastExport).toLocaleString("de-DE")}`
            : "Noch keine Backup-Datei auf diesem Gerät erstellt."}
        </p>
        <div className="actions">
          <Button onClick={exportData}>Backup exportieren</Button>
          <Button onClick={() => file.current.click()}>
            Backup prüfen und importieren
          </Button>
        </div>
        <input
          ref={file}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Backupdatei auswählen"
          onChange={readFile}
        />
        {recovery && (
          <Button onClick={previewRecovery} style={{ marginTop: 12 }}>
            Lokalen Sicherungsstand prüfen
          </Button>
        )}
        <button
          className="subtle-link"
          onClick={async () => {
            try {
              if (!navigator.storage?.persist)
                throw new Error(
                  "Dieser Browser unterstützt die Anfrage für beständigen Speicher nicht.",
                );
              const ok = await navigator.storage.persist();
              setMessage(
                ok
                  ? "Beständiger Speicher wurde vom Browser gewährt. Externe Backups bleiben erforderlich."
                  : "Der Browser hat beständigen Speicher nicht gewährt. Bitte externe Backups aufbewahren.",
              );
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Beständigen Browserspeicher anfragen
        </button>
      </section>
      {state.coffees.some((c) => c.archivedAt) && (
        <details className="section">
          <summary>Archivierte Kaffees</summary>
          <p className="metadata">
            Archivieren entfernt keine Daten und keine Rezepte.
          </p>
          {state.coffees
            .filter((c) => c.archivedAt)
            .map((c) => (
              <div className="insight-row" key={c.id}>
                <p>
                  {c.roaster} · {c.name}
                </p>
                <Button
                  onClick={() => onRestoreCoffee(c.id)}
                  style={{ marginTop: 8 }}
                >
                  In Sammlung zurückholen
                </Button>
              </div>
            ))}
        </details>
      )}
      <p className="metadata section">Espresso Lab 1.5 · Fachgrundlage 1.4.0</p>
      {candidate && (
        <Dialog
          title={
            candidate.recovery
              ? "Sicherungsstand wiederherstellen?"
              : "Backup übernehmen?"
          }
          onClose={() => {
            if (!busy) setCandidate(null);
          }}
        >
          <p>
            {candidate.summary.coffees} Kaffees · {candidate.summary.batches}{" "}
            Packungen · {candidate.summary.shots} Versuche ·{" "}
            {candidate.summary.recipes} Rezepte
          </p>
          <Notice>
            Dieser Stand ersetzt deinen aktuellen Bestand. Der vorherige Stand
            wird im selben sicheren Speichervorgang lokal gesichert.
          </Notice>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions">
            <Button disabled={busy} onClick={() => setCandidate(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" disabled={busy} onClick={replace}>
              {busy ? "Speichere …" : "Bestand sicher ersetzen"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function EquipmentResearch({ kind, query, current, onApply }) {
  const [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function research() {
    setBusy(true);
    setError("");
    try {
      const r = await requestJson("/api/research-equipment", { kind, query });
      setResult({ ...r, requestedQuery: query });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section">
      <h3>{kind === "machine" ? "Maschine" : "Mühle"}</h3>
      {current && (
        <details>
          <summary>Gespeichertes Profil prüfen</summary>
          <EquipmentProfile result={current} />
        </details>
      )}
      <Button
        onClick={research}
        disabled={busy || !query.trim()}
        style={{ marginTop: 12 }}
      >
        {busy
          ? "Recherchiere …"
          : `${query || "Modell eingeben"} recherchieren`}
      </Button>
      {error && <Notice kind="error">{error}</Notice>}
      {result && (
        <div className="equipment-result">
          <EquipmentProfile result={result} />
          {result.requestedQuery !== query && (
            <Notice kind="error">
              Modellname wurde geändert. Bitte erneut recherchieren.
            </Notice>
          )}
          <div className="actions">
            <Button onClick={() => setResult(null)}>Verwerfen</Button>
            <Button
              variant="primary"
              disabled={busy || result.requestedQuery !== query}
              onClick={async () => {
                setBusy(true);
                try {
                  await onApply(result);
                  setResult(null);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Profil bestätigen
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
function EquipmentProfile({ result }) {
  const p = result.profile || {};
  return (
    <>
      <dl className="detail-list">
        {Object.entries(p)
          .filter(([key, value]) => value && !["confidence"].includes(key))
          .map(([key, value]) => (
            <div key={key}>
              <dt>
                {{
                  manufacturer: "Hersteller",
                  model: "Modell",
                  equipment_type: "Typ",
                  adjustment_type: "Verstellung",
                  finer_direction: "Richtung feiner",
                  burrs: "Mahlwerk",
                  brew_group: "Brühgruppe",
                  pump: "Pumpe",
                  boiler_system: "Kesselsystem",
                  verified_summary: "Zusammenfassung",
                  relevant_notes: "Hinweise",
                }[key] || key}
              </dt>
              <dd>{Array.isArray(value) ? value.join(" · ") : value}</dd>
            </div>
          ))}
      </dl>
      <p className="metadata">Einschätzung: {p.confidence || "unbekannt"}</p>
      <div className="source-list">
        {(result.sources || [])
          .filter((s) => /^https?:\/\//.test(s.url))
          .map((s, n) => (
            <a key={n} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title || s.url}
            </a>
          ))}
      </div>
    </>
  );
}
