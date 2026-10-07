"use client";
import { useState } from "react";
import { useDraft } from "../lib/hooks";
import {
  fmt,
  ratio,
  decimal,
  presetFor,
  comparison,
  analysisIsCurrent,
} from "../lib/domain.mjs";
import {
  Header,
  Field,
  TextArea,
  Button,
  Notice,
  Analysis,
  Recipe,
} from "./ui";
const GROUPS = [
  ["overall", "Gesamteindruck", ["unausgewogen", "okay", "gut", "sehr gut"]],
  ["acidity", "Säure", ["zu spitz", "angenehm", "zu wenig"]],
  [
    "bitterness",
    "Bitterkeit / Nachgeschmack",
    ["zu bitter", "trocken", "angenehm"],
  ],
  ["sweetness", "Süße", ["wenig", "gut", "sehr süß"]],
  ["body", "Körper", ["zu dünn", "gut", "zu schwer"]],
];
function TasteGroup({ group, value, onChange }) {
  const [key, label, options] = group;
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="pills">
        {options.map((v) => (
          <button
            type="button"
            key={v}
            className={`pill ${value === v ? "selected" : ""}`}
            aria-pressed={value === v}
            onClick={() => onChange(key, value === v ? "" : v)}
          >
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function ShotEditor({
  coffee,
  batch,
  equipment,
  storage,
  existing = null,
  onBack,
  onSave,
}) {
  const initial = existing
    ? {
        ...existing,
        _baseRevision: existing.revision || 0,
        dose: String(existing.dose ?? ""),
        yield: String(existing.yield ?? ""),
        time: String(existing.time ?? ""),
        sensory: existing.sensory || {},
        basket: existing.equipment?.basket || batch.basket || "",
      }
    : presetFor(coffee, batch, equipment);
  const draft = useDraft(
      storage,
      `shot:${coffee.id}:${batch.id}:${existing?.id || "new"}`,
      initial,
    ),
    d = draft.value;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const update = (key, value) =>
    draft.update((current) => ({ ...current, [key]: value }));
  const taste = (key, value) =>
    draft.update((current) => ({
      ...current,
      sensory: { ...current.sensory, [key]: value },
    }));
  let r = "—";
  try {
    r = ratio(decimal(d.dose), decimal(d.yield));
  } catch {}
  function step(delta) {
    try {
      update(
        "dose",
        String(Math.round((decimal(d.dose) + delta) * 10) / 10).replace(
          ".",
          ",",
        ),
      );
    } catch {
      setError("Bitte zuerst eine vollständige Dosis eingeben.");
    }
  }
  async function save(analyze) {
    setBusy(true);
    setError("");
    try {
      if (analyze && !(batch.target || coffee.target)?.trim())
        throw new Error(
          "Bitte zuerst ein Geschmacksziel beim Kaffee ergänzen. „Nur speichern“ bleibt möglich.",
        );
      if (
        analyze &&
        !d.note.trim() &&
        !Object.values(d.sensory || {}).some(Boolean)
      )
        throw new Error(
          "Wie schmeckt der Shot? Eine kurze Notiz oder Auswahl reicht.",
        );
      const result = await onSave(d, existing, analyze);
      setSaved(true);
      try {
        await draft.clear();
      } catch {
        setError(
          "Shot ist gespeichert; der Entwurf konnte noch nicht entfernt werden.",
        );
      }
      onBack(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        title={existing ? "Versuch bearbeiten" : "Versuch erfassen"}
        subtitle={`${coffee.roaster} · ${coffee.name}`}
        onBack={() => onBack()}
      />
      {!draft.ready ? (
        <div className="loading">Entwurf laden …</div>
      ) : (
        <>
          {(error || draft.error) && (
            <Notice kind="error">{error || draft.error}</Notice>
          )}
          {existing && d._baseRevision !== (existing.revision || 0) && (
            <Notice>
              <strong>Dieser Versuch wurde geändert.</strong>
              <p>
                Aktuell gespeichert: {fmt(existing.dose)} →{" "}
                {fmt(existing.yield)} g · Mahlgrad {existing.grind || "offen"} ·{" "}
                {existing.note || "Geschmack offen"}. Deine Eingaben bleiben
                erhalten.
              </p>
              <Button
                onClick={() =>
                  draft.update((v) => ({
                    ...v,
                    _baseRevision: existing.revision || 0,
                  }))
                }
              >
                Entwurf mit diesem Stand abgleichen
              </Button>
            </Notice>
          )}
          <div className="target">
            <small>Dein Geschmacksziel</small>
            <p>
              {batch.target ||
                coffee.target ||
                "Noch offen – beim Kaffee ergänzen"}
            </p>
          </div>
          {!existing && (
            <p className="metadata" style={{ marginBottom: 20 }}>
              Die geplante Einstellung ist vorausgefüllt. Bitte tatsächliche
              Werte prüfen. Zeit und Geschmack beginnen leer.
            </p>
          )}
          <div className="form-row">
            <Field label="Dosis · g">
              {(inputId) => (
                <div className="measure-input">
                  <input
                    id={inputId}
                    inputMode="decimal"
                    autoComplete="off"
                    value={d.dose}
                    onChange={(e) => update("dose", e.target.value)}
                  />
                  <span className="unit">g</span>
                </div>
              )}
            </Field>
            <Field label="Yield · g">
              {(inputId) => (
                <div className="measure-input">
                  <input
                    id={inputId}
                    inputMode="decimal"
                    autoComplete="off"
                    value={d.yield}
                    onChange={(e) => update("yield", e.target.value)}
                  />
                  <span className="unit">g</span>
                </div>
              )}
            </Field>
          </div>
          <p className="ratio-line">
            Automatische Brew Ratio <strong>{r}</strong>
          </p>
          <div className="form-row">
            <Field
              label="Zeit · s (optional)"
              inputMode="decimal"
              autoComplete="off"
              value={d.time}
              onChange={(e) => update("time", e.target.value)}
              placeholder="Gemessen"
            />
            <Field
              label="Mahlgrad"
              value={d.grind}
              autoComplete="off"
              onChange={(e) => update("grind", e.target.value)}
              placeholder="Skalenwert"
            />
          </div>
          <p className="metadata" style={{ marginTop: 8 }}>
            Zeit{" "}
            {d.timeBasis === "pump" ? "ab Pumpenstart" : "ab erstem Tropfen"}.
            Fehlende Messung bleibt unbekannt.
          </p>
          <section className="taste-section">
            <h2>Wie schmeckt er?</h2>
            <p>Eine kurze Einschätzung im Verhältnis zu deinem Ziel.</p>
            <TasteGroup
              group={GROUPS[0]}
              value={d.sensory.overall}
              onChange={taste}
            />
            <TextArea
              label="Dein Geschmackseindruck"
              value={d.note}
              maxLength={2000}
              onChange={(e) => update("note", e.target.value)}
              placeholder="Zum Beispiel: süßer, aber hinten noch trocken"
            />
            <details>
              <summary>Geschmack genauer beschreiben</summary>
              {GROUPS.slice(1).map((g) => (
                <TasteGroup
                  key={g[0]}
                  group={g}
                  value={d.sensory[g[0]]}
                  onChange={taste}
                />
              ))}
            </details>
          </section>
          <details>
            <summary>Weitere Bezugsdetails</summary>
            <div className="actions">
              <Button onClick={() => step(-0.1)}>Dosis −0,1 g</Button>
              <Button onClick={() => step(0.1)}>Dosis +0,1 g</Button>
            </div>
            <div className="fields">
              <Field label="Zeitmessung">
                {(inputId) => (
                  <select
                    id={inputId}
                    value={d.timeBasis || "first-drop"}
                    onChange={(e) => update("timeBasis", e.target.value)}
                  >
                    <option value="first-drop">Ab erstem Tropfen</option>
                    <option value="pump">Ab Pumpenstart</option>
                  </select>
                )}
              </Field>
              <Field
                label="Sieb"
                value={d.basket || ""}
                onChange={(e) => update("basket", e.target.value)}
              />
              <Field
                label="Druck / Bezugshinweis (optional)"
                value={d.pressure || ""}
                onChange={(e) => update("pressure", e.target.value)}
                placeholder="Nur wenn relevant"
              />
              <p className="metadata">
                {existing && !existing.equipment
                  ? "Historisches Equipment nicht dokumentiert; es wird nicht rückwirkend erfunden."
                  : `${equipment.machine}${equipment.grinder ? ` · ${equipment.grinder}` : ""}`}
                . Temperatur/PID bleibt im normalen Dial-in unverändert.
              </p>
            </div>
          </details>
          <div className="form-end">
            <Button
              variant="primary"
              disabled={busy || saved}
              onClick={() => save(true)}
            >
              {busy
                ? "Speichere lokal …"
                : existing
                  ? "Änderungen speichern und auswerten"
                  : "Shot auswerten"}
            </Button>
            <button
              type="button"
              className="subtle-link"
              disabled={busy || saved}
              onClick={() => save(false)}
            >
              Nur speichern
            </button>
            <p className="metadata">
              Erst dauerhaft speichern, danach KI-Beratung.
            </p>
          </div>
        </>
      )}
    </>
  );
}
export function ShotDetail({
  coffee,
  batch,
  shot,
  onBack,
  onSettings,
  onRetry,
  onEdit,
  onNext,
  onFinalize,
  onArchive,
  onRestore,
  busy = false,
}) {
  const shots = batch.shots.filter((s) => !s.archivedAt),
    index = shots.findIndex((s) => s.id === shot.id),
    previous = index > 0 ? shots[index - 1] : null;
  const [compareId, setCompareId] = useState(previous?.id || ""),
    compare = batch.shots.find((s) => s.id === compareId),
    rows = comparison(compare, shot);
  return (
    <>
      <Header
        title="Dein Versuch"
        subtitle={`${coffee.name} · ${batch.label || "Packung"}`}
        onBack={onBack}
        onSettings={onSettings}
      />
      <Recipe
        recipe={{
          settings: { ...shot, basket: shot.equipment?.basket || batch.basket },
          note: shot.note,
          equipment: shot.equipment || null,
        }}
        title="Gemessene Einstellung"
        reference
      />
      {!!Object.values(shot.sensory || {}).filter(Boolean).length && (
        <p>{Object.values(shot.sensory).filter(Boolean).join(" · ")}</p>
      )}
      <Analysis
        shot={shot}
        onRetry={onRetry}
        busy={busy}
        current={analysisIsCurrent(coffee, batch, shot)}
      />
      {shots.length > 1 && (
        <section className="section">
          <h2>Was hat sich geändert?</h2>
          <Field label="Vergleichen mit">
            {(inputId) => (
              <select
                id={inputId}
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <option value="">Versuch auswählen</option>
                {shots
                  .filter((s) => s.id !== shot.id)
                  .map((s) => (
                    <option value={s.id} key={s.id}>
                      {new Date(s.created || 0).toLocaleDateString("de-DE")} ·{" "}
                      {fmt(s.dose)} → {fmt(s.yield)} g · Mahlgrad{" "}
                      {s.grind || "offen"}
                    </option>
                  ))}
              </select>
            )}
          </Field>
          {compare && (
            <>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Wert</th>
                    <th scope="col">Vergleich</th>
                    <th scope="col">Dieser Versuch</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <th scope="row">{r.label}</th>
                      <td>
                        {r.key === "grind" ? r.before || "—" : fmt(r.before)}{" "}
                        {r.unit}
                      </td>
                      <td
                        className={r.changed && r.comparable ? "changed" : ""}
                      >
                        {r.key === "grind" ? r.after || "—" : fmt(r.after)}{" "}
                        {r.unit}
                        {!r.comparable && " · andere Zeitbasis"}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Ratio</th>
                    <td>{ratio(compare.dose, compare.yield)}</td>
                    <td>{ratio(shot.dose, shot.yield)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="metadata" style={{ marginTop: 12 }}>
                Ratio folgt aus Dosis und Yield. Zeit ist ein Ergebnis des
                Bezugs.
              </p>
              <dl className="detail-list">
                <div>
                  <dt>Vorher geschmeckt</dt>
                  <dd>
                    {compare.note ||
                      Object.values(compare.sensory || {})
                        .filter(Boolean)
                        .join(" · ") ||
                      "Nicht erfasst"}
                  </dd>
                </div>
                <div>
                  <dt>Jetzt geschmeckt</dt>
                  <dd>
                    {shot.note ||
                      Object.values(shot.sensory || {})
                        .filter(Boolean)
                        .join(" · ") ||
                      "Nicht erfasst"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
      )}
      {!shot.archivedAt && (
        <>
          <div className="actions">
            <Button variant="primary" onClick={onNext}>
              Nächsten Versuch vorbereiten
            </Button>
            <Button onClick={onFinalize}>Als mein Rezept bestätigen</Button>
          </div>
          <p className="metadata" style={{ marginTop: 12 }}>
            Du entscheidest, wann dein Ziel erreicht ist. Die KI finalisiert
            nichts automatisch.
          </p>
        </>
      )}
      <details className="section">
        <summary>Bearbeiten und weitere Angaben</summary>
        <p className="metadata">
          {shot.equipment?.machine || "Historische Maschine nicht dokumentiert"}
          {shot.equipment?.grinder ? ` · ${shot.equipment.grinder}` : ""}
          {shot.pressure ? ` · ${shot.pressure}` : ""}
        </p>
        <div className="actions">
          <Button onClick={onEdit}>Versuch bearbeiten</Button>
          {shot.archivedAt ? (
            <Button onClick={onRestore}>Aus Archiv zurückholen</Button>
          ) : (
            <Button variant="danger" onClick={onArchive}>
              Versuch archivieren
            </Button>
          )}
        </div>
      </details>
    </>
  );
}
