"use client";
import { useRef, useState } from "react";
import { useDraft } from "../lib/hooks";
import { findCoffee, latestRecipe, fmt } from "../lib/domain.mjs";
import { coffeeFingerprint } from "../lib/edit-contract.mjs";
import {
  Header,
  Button,
  Field,
  TextArea,
  Notice,
  PhotoPicker,
  Recipe,
} from "./ui";
export default function CoffeeForm({
  state,
  storage,
  coffee = null,
  batch = null,
  mode = "new",
  onBack,
  onSave,
  extract,
}) {
  const ref = coffee && latestRecipe(coffee),
    editing = mode === "edit",
    pack = mode === "pack";
  const initial = {
    _baseFingerprint: editing ? coffeeFingerprint(coffee, batch) : null,
    name: coffee?.name || "",
    roaster: coffee?.roaster || "",
    tasting: coffee?.tasting || "",
    target: batch?.target ?? coffee?.target ?? "",
    origin: coffee?.origin || "",
    roast: coffee?.roast || "",
    variety: coffee?.variety || "",
    process: coffee?.process || "",
    roasterRecipe: coffee?.roasterRecipe || "",
    roastDate: editing ? batch?.roastDate || "" : "",
    openedDate: editing ? batch?.openedDate || "" : "",
    label: editing ? batch?.label || "" : "",
    basket: editing
      ? batch?.basket || ""
      : ref?.recipe.settings.basket || state.equipment.baskets[0] || "",
    images: editing ? batch?.images || coffee?.images || [] : [],
    coverImageIndex: coffee?.coverImageIndex || 0,
    description: "",
  };
  const draft = useDraft(
      storage,
      `${mode}-coffee:${coffee?.id || "new"}:${editing ? batch.id : "new"}`,
      initial,
    ),
    d = draft.value;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [proposal, setProposal] = useState(null),
    [uncertainty, setUncertainty] = useState(""),
    [savedId, setSavedId] = useState(null),
    request = useRef(0);
  function set(key, value) {
    request.current++;
    draft.update((current) => ({ ...current, [key]: value }));
  }
  const match = !coffee ? findCoffee(state.coffees, d.roaster, d.name) : null;
  async function analyze() {
    setBusy(true);
    setError("");
    const version = ++request.current;
    try {
      const p = await extract(d.images, d.description);
      if (version !== request.current) {
        setError(
          "Du hast Angaben geändert. Der KI-Vorschlag wurde nicht automatisch übernommen.",
        );
        return;
      }
      setProposal(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function accept() {
    const p = proposal;
    draft.update({
      ...d,
      roaster: p.roaster || d.roaster,
      name: p.coffee_name || d.name,
      origin: p.origin || d.origin,
      roast: p.roast_level || d.roast,
      roastDate: p.roast_date || d.roastDate,
      tasting: (p.tasting_notes || []).join(", ") || d.tasting,
      target: p.target_profile || d.target,
      variety: p.variety || "",
      process: p.process || "",
      roasterRecipe: p.roaster_recipe || "",
      coverImageIndex: Number.isInteger(p.cover_image_index)
        ? p.cover_image_index
        : 0,
    });
    setUncertainty(
      [...(p.uncertain_fields || []), p.uncertainty_note]
        .filter(Boolean)
        .join(" · "),
    );
    setProposal(null);
  }
  async function save(existingId = null) {
    setBusy(true);
    setError("");
    try {
      if (!d.name.trim()) throw new Error("Bitte einen Kaffeenamen eingeben.");
      const result = await onSave(d, existingId);
      setSavedId(result);
      try {
        await draft.clear();
      } catch {
        setError(
          "Kaffee gespeichert; der alte Entwurf konnte noch nicht entfernt werden.",
        );
        return;
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
        title={
          editing
            ? "Angaben bearbeiten"
            : pack
              ? "Neue Packung"
              : "Neuen Kaffee einstellen"
        }
        subtitle={
          coffee
            ? `${coffee.roaster} · ${coffee.name}`
            : "Wenige Angaben reichen für den ersten Versuch."
        }
        onBack={() => onBack()}
      />
      {!draft.ready ? (
        <div className="loading" role="status">
          Entwurf laden …
        </div>
      ) : (
        <>
          {(error || draft.error) && (
            <Notice kind="error">{error || draft.error}</Notice>
          )}
          {editing &&
            d._baseFingerprint !== coffeeFingerprint(coffee, batch) && (
              <Notice>
                <strong>Gespeicherte Angaben wurden geändert.</strong>
                <p>
                  Aktuell: {coffee.name} · Ziel:{" "}
                  {batch.target || coffee.target || "offen"}. Dein Entwurf
                  bleibt im Formular.
                </p>
                <Button
                  onClick={() =>
                    draft.update((v) => ({
                      ...v,
                      _baseFingerprint: coffeeFingerprint(coffee, batch),
                    }))
                  }
                >
                  Entwurf mit diesem Stand abgleichen
                </Button>
              </Notice>
            )}
          {savedId && (
            <Notice kind="success">
              Bereits gespeichert. Bitte zum Kaffee zurückkehren.
            </Notice>
          )}
          <PhotoPicker
            images={d.images}
            onChange={(v) => set("images", v)}
            cover={d.coverImageIndex}
            onCover={(v) => set("coverImageIndex", v)}
            onError={setError}
          />
          {!editing && (
            <details>
              <summary>Verpackung mit KI vorbereiten</summary>
              <TextArea
                label="Beschreibung ergänzen (optional)"
                value={d.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <Button
                disabled={busy || (!d.images.length && !d.description.trim())}
                onClick={analyze}
                style={{ marginTop: 12 }}
              >
                {busy ? "Verpackung wird gelesen …" : "KI-Vorschlag erstellen"}
              </Button>
              <p className="metadata">
                Ein Vorschlag. Du prüfst Identität und Geschmacksziel vor dem
                Speichern.
              </p>
            </details>
          )}
          {proposal && (
            <section className="equipment-result">
              <h2>Bitte den Vorschlag prüfen</h2>
              <dl className="detail-list">
                {[
                  ["Röster", proposal.roaster],
                  ["Kaffee", proposal.coffee_name],
                  ["Rösterprofil", proposal.tasting_notes?.join(", ")],
                  ["Zielvorschlag", proposal.target_profile],
                  ["Röstdatum", proposal.roast_date],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "Nicht erkannt"}</dd>
                  </div>
                ))}
              </dl>
              <p className="metadata">{proposal.uncertainty_note}</p>
              <div className="actions">
                <Button onClick={() => setProposal(null)}>Verwerfen</Button>
                <Button variant="primary" onClick={accept}>
                  Vorschlag übernehmen
                </Button>
              </div>
            </section>
          )}
          {uncertainty && <Notice>Bitte prüfen: {uncertainty}</Notice>}
          <div className="fields section">
            {!pack && (
              <>
                <Field
                  label="Kaffeename"
                  value={d.name}
                  maxLength={300}
                  autoComplete="off"
                  onChange={(e) => set("name", e.target.value)}
                />
                <Field
                  label="Röster (optional)"
                  value={d.roaster}
                  maxLength={300}
                  onChange={(e) => set("roaster", e.target.value)}
                />
              </>
            )}
            <TextArea
              label="Dein Geschmacksziel"
              hint="Zum Beispiel: schokoladig und süß, runde Säure, kein trockener Nachgeschmack. Für die KI-Beratung nötig; später ergänzbar."
              value={d.target}
              maxLength={2000}
              onChange={(e) => set("target", e.target.value)}
            />
            {ref && pack && (
              <Recipe
                recipe={ref.recipe}
                title="Bewährte Startreferenz"
                reference
              />
            )}
          </div>
          {!editing && !ref && (
            <p className="metadata section">
              Persönlicher Start: {fmt(state.equipment.defaultDose)} g · Ratio
              1:{fmt(state.equipment.defaultRatio)}. Der Geschmack entscheidet
              über die nächsten Schritte.
            </p>
          )}
          {match && (
            <Notice>
              <strong>
                Dieser Kaffee könnte schon in deiner Sammlung sein.
              </strong>
              <p>
                {match.roaster} · {match.name}
              </p>
              <div className="actions">
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => save(match.id)}
                >
                  Neue Packung dieses Kaffees
                </Button>
              </div>
              <p className="metadata">
                Identität und alte Rezepte bleiben erhalten. Die neue Packung
                erhält eine eigene Historie.
              </p>
            </Notice>
          )}
          <details className="section">
            <summary>Weitere Kaffee- und Packungsangaben</summary>
            <div className="fields">
              <TextArea
                label="Tasting Notes laut Röster"
                value={d.tasting}
                maxLength={2000}
                onChange={(e) => set("tasting", e.target.value)}
              />
              {[
                ["origin", "Herkunft"],
                ["roast", "Röstgrad"],
                ["variety", "Varietät"],
                ["process", "Aufbereitung"],
                ["roasterRecipe", "Rezept laut Röster"],
                ["roastDate", "Röstdatum"],
                ["openedDate", "Geöffnet am"],
                ["label", "Packungsbezeichnung"],
                ["basket", "Sieb"],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  type={
                    ["roastDate", "openedDate"].includes(key) &&
                    (!d[key] || /^\d{4}-\d{2}-\d{2}$/.test(d[key]))
                      ? "date"
                      : "text"
                  }
                  value={
                    typeof d[key] === "object" ? JSON.stringify(d[key]) : d[key]
                  }
                  onChange={(e) => set(key, e.target.value)}
                />
              ))}
            </div>
          </details>
          <div className="form-end">
            <Button
              variant={match ? "secondary" : "primary"}
              disabled={busy || !!savedId || !d.name.trim()}
              onClick={() => save(pack ? coffee.id : null)}
            >
              {busy
                ? "Speichere …"
                : editing
                  ? "Änderungen speichern"
                  : match
                    ? "Bewusst als anderen Kaffee anlegen"
                    : "Speichern und ersten Versuch vorbereiten"}
            </Button>
            <p className="metadata">
              Entwurf bleibt beim Zurückgehen erhalten.
            </p>
          </div>
        </>
      )}
    </>
  );
}
