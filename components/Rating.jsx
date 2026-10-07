"use client";
import { useState } from "react";
import { useDraft } from "../lib/hooks";
import { decimal } from "../lib/domain.mjs";
import { ratingFingerprint } from "../lib/edit-contract.mjs";
import { Header, Field, Button, Notice } from "./ui";
const TAGS = [
  "schokoladig",
  "nussig",
  "karamellig",
  "fruchtig",
  "floral",
  "würzig",
  "beerig",
  "zitrisch",
];
export default function Rating({ coffee, storage, onBack, onSave }) {
  const draft = useDraft(storage, `rating:${coffee.id}`, {
      _baseFingerprint: ratingFingerprint(coffee),
      score: coffee.rating?.score ? String(coffee.rating.score) : "",
      tags: coffee.rating?.tags || [],
      favorite: !!coffee.favorite,
      buyAgain: coffee.buyAgain ?? null,
    }),
    d = draft.value;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const set = (key, value) => draft.update((v) => ({ ...v, [key]: value }));
  async function save() {
    setBusy(true);
    setError("");
    try {
      const score = decimal(d.score, { optional: true, max: 10 });
      if (score != null && score < 1)
        throw new Error("Die Bewertung muss zwischen 1 und 10 liegen.");
      await onSave({ ...d, score });
      setSaved(true);
      await draft.clear();
      onBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        title="Deine Einschätzung"
        subtitle={coffee.name + " · alles freiwillig"}
        onBack={onBack}
      />
      {(error || draft.error) && (
        <Notice kind="error">{error || draft.error}</Notice>
      )}
      {draft.ready && d._baseFingerprint !== ratingFingerprint(coffee) && (
        <Notice>
          <p>
            Deine gespeicherte Einschätzung wurde geändert. Prüfe Bewertung und
            Favorit vor dem Speichern.
          </p>
          <Button
            onClick={() =>
              draft.update((v) => ({
                ...v,
                _baseFingerprint: ratingFingerprint(coffee),
              }))
            }
          >
            Entwurf mit diesem Stand abgleichen
          </Button>
        </Notice>
      )}
      {draft.ready && (
        <>
          <div className="fields">
            <Field
              label="Persönliche Bewertung · 1 bis 10"
              inputMode="decimal"
              value={d.score}
              placeholder="Noch nicht bewertet"
              onChange={(e) => set("score", e.target.value)}
              hint="Leer lassen, wenn du noch keine Bewertung vergeben möchtest."
            />
            <div className="pills">
              {[6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  className={`pill ${Number(String(d.score).replace(",", ".")) === n ? "selected" : ""}`}
                  aria-pressed={Number(d.score) === n}
                  onClick={() => set("score", String(n))}
                >
                  {n}
                </button>
              ))}
              <Button onClick={() => set("score", "")}>Wert entfernen</Button>
            </div>
            <Field label="Würdest du ihn wieder kaufen?">
              {(inputId) => (
                <select
                  id={inputId}
                  value={d.buyAgain === null ? "unknown" : String(d.buyAgain)}
                  onChange={(e) =>
                    set(
                      "buyAgain",
                      e.target.value === "unknown"
                        ? null
                        : e.target.value === "true",
                    )
                  }
                >
                  <option value="unknown">Noch offen</option>
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </select>
              )}
            </Field>
            <Button
              variant={d.favorite ? "primary" : "secondary"}
              aria-pressed={d.favorite}
              onClick={() => set("favorite", !d.favorite)}
            >
              {d.favorite ? "Als Favorit markiert" : "Als Favorit markieren"}
            </Button>
          </div>
          <section className="section">
            <h2>Was hast du selbst geschmeckt?</h2>
            <p className="metadata" style={{ margin: "8px 0 16px" }}>
              Optionale Noten für deine Sammlung. Kein kopiertes Rösterprofil.
            </p>
            <div className="pills">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  className={`pill ${d.tags.includes(tag) ? "selected" : ""}`}
                  aria-pressed={d.tags.includes(tag)}
                  onClick={() =>
                    set(
                      "tags",
                      d.tags.includes(tag)
                        ? d.tags.filter((t) => t !== tag)
                        : [...d.tags, tag],
                    )
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
          <div className="form-end">
            <Button variant="primary" disabled={busy || saved} onClick={save}>
              {busy ? "Speichere …" : "Einschätzung speichern"}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
