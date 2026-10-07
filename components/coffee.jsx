"use client";
import { useMemo } from "react";
import {
  fmt,
  ratio,
  norm,
  latestRecipe,
  presetFor,
  analysisIsCurrent,
} from "../lib/domain.mjs";
import {
  Header,
  Button,
  Icon,
  IconButton,
  Identity,
  Recipe,
  Empty,
  Field,
  PackAge,
  Analysis,
} from "./ui";

export function CoffeeRow({ coffee, onOpen, onFavorite }) {
  const ref = latestRecipe(coffee),
    b = coffee.batches.at(-1);
  return (
    <article className="coffee-row">
      <button className="coffee-open" onClick={() => onOpen(coffee.id, b?.id)}>
        <Identity coffee={coffee} />
        <div className="badge-row">
          {ref && <span className="badge">Rezept vorhanden</span>}
          {coffee.rating?.score > 0 && (
            <span className="badge">{fmt(coffee.rating.score)}/10</span>
          )}
          {!ref && (
            <span className="metadata">
              {b?.shots.filter((s) => !s.archivedAt).length || 0} Versuche
              dokumentiert
            </span>
          )}
        </div>
        {coffee.tasting && <p className="metadata">{coffee.tasting}</p>}
      </button>
      {onFavorite && (
        <button
          type="button"
          className={`icon-button favorite ${coffee.favorite ? "on" : ""}`}
          aria-label={`${coffee.name}: ${coffee.favorite ? "Favorit entfernen" : "Als Favorit markieren"}`}
          aria-pressed={!!coffee.favorite}
          onClick={() => onFavorite(coffee.id)}
        >
          <Icon name="star" />
        </button>
      )}
    </article>
  );
}

export function DialView({
  state,
  onNew,
  onOpen,
  onShot,
  onChoose,
  onSettings,
  onEdit,
  onRetry,
  analysisBusy,
}) {
  const coffee = state.coffees.find(
      (c) => c.id === state.activeCoffeeId && !c.archivedAt,
    ),
    batch = coffee?.batches.find((b) => b.id === state.activeBatchId),
    last = batch?.shots.filter((s) => !s.archivedAt).at(-1);
  const complete = batch?.finalRecipe && !batch?.dialing;
  const active = coffee && batch && !complete;
  const choices = state.coffees
    .filter((c) => !c.archivedAt)
    .flatMap((c) =>
      c.batches
        .filter((b) => !b.closedDate && (!b.finalRecipe || b.dialing))
        .map((b) => ({ coffee: c, batch: b })),
    );
  const preset = active ? presetFor(coffee, batch, state.equipment) : null;
  return (
    <>
      <Header
        title="Einstellen"
        subtitle="Vom ersten Eindruck zu deinem Rezept."
        onSettings={onSettings}
      />
      {active ? (
        <>
          <section className="action-block">
            <span className="eyebrow">AKTUELLER KAFFEE</span>
            <Identity coffee={coffee} batch={batch} />
            <PackAge batch={batch} />
            <div className="target">
              <small>Dein Geschmacksziel</small>
              <p>{batch.target || coffee.target || "Noch offen"}</p>
            </div>
            {!(batch.target || coffee.target) ? (
              <Button
                variant="primary"
                className="wide"
                onClick={() => onEdit(coffee.id, batch.id)}
              >
                Zielprofil festlegen
              </Button>
            ) : (
              <>
                <h3>
                  {last
                    ? "Geplant für den nächsten Versuch"
                    : "Deine Starteinstellung"}
                </h3>
                <div className="plan-values">
                  <span>
                    {fmt(preset.dose)} g → {fmt(preset.yield)} g
                  </span>
                  <span>
                    {ratio(Number(preset.dose), Number(preset.yield))}
                  </span>
                  <span>Mahlgrad {preset.grind || "offen"}</span>
                </div>
                <p className="metadata">
                  Geplante Werte. Nach dem Bezug die tatsächlichen Messwerte
                  prüfen.
                </p>
                <Button
                  variant="primary"
                  className="wide"
                  onClick={() => onShot(coffee.id, batch.id)}
                >
                  Versuch erfassen
                </Button>
              </>
            )}
            <button
              className="subtle-link"
              onClick={() => onOpen(coffee.id, batch.id)}
            >
              Packung und Verlauf ansehen
            </button>
          </section>
          {last && (
            <section className="section">
              <div className="section-heading">
                <h2>Letzter Versuch</h2>
                <span className="metadata">
                  {fmt(last.dose)} → {fmt(last.yield)} g
                </span>
              </div>
              <p>
                {last.note ||
                  Object.values(last.sensory || {})
                    .filter(Boolean)
                    .join(" · ") ||
                  "Geschmack noch offen"}
              </p>
              <Analysis
                shot={last}
                current={analysisIsCurrent(coffee, batch, last)}
                onRetry={() => onRetry(coffee.id, batch.id, last.id)}
                busy={analysisBusy === last.id}
              />
            </section>
          )}
        </>
      ) : (
        <Empty
          title={
            complete ? "Dein Rezept steht." : "Welchen Kaffee probierst du?"
          }
          action={
            <Button variant="primary" onClick={onNew}>
              <Icon name="plus" />
              Neuen Kaffee einstellen
            </Button>
          }
        >
          {complete
            ? "Das bestätigte Rezept bleibt in deiner Sammlung. Bei einer neuen Packung dient es als Startpunkt."
            : "Packung fotografieren oder Namen eingeben, ein Geschmacksziel wählen und gezielt einstellen."}
        </Empty>
      )}
      {choices.length > (active ? 1 : 0) && (
        <section className="section">
          <Field label="Anderen Dial-in auswählen">
            {(inputId) => (
              <select
                id={inputId}
                value={active ? batch.id : ""}
                onChange={(e) => {
                  const item = choices.find(
                    (x) => x.batch.id === e.target.value,
                  );
                  if (item) onChoose(item.coffee.id, item.batch.id);
                }}
              >
                <option value="">Kaffee auswählen</option>
                {choices.map((x) => (
                  <option key={x.batch.id} value={x.batch.id}>
                    {x.coffee.name} · {x.batch.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </section>
      )}
      {active && (
        <div className="actions">
          <Button onClick={onNew}>
            <Icon name="plus" />
            Neuen Kaffee beginnen
          </Button>
        </div>
      )}
      {!active && !!state.coffees.filter((c) => !c.archivedAt).length && (
        <section className="section">
          <div className="section-heading">
            <h2>Zuletzt eingestellt</h2>
            <button className="subtle-link" onClick={() => onOpen()}>
              Alle Kaffees
            </button>
          </div>
          {state.coffees
            .filter((c) => !c.archivedAt)
            .slice(0, 2)
            .map((c) => (
              <CoffeeRow key={c.id} coffee={c} onOpen={onOpen} />
            ))}
        </section>
      )}
    </>
  );
}

export function CollectionView({
  state,
  filters,
  setFilters,
  onNew,
  onOpen,
  onFavorite,
  onSettings,
}) {
  const coffees = useMemo(() => {
    const tokens = norm(filters.query).split(/\s+/).filter(Boolean);
    const list = state.coffees.filter(
      (c) =>
        !c.archivedAt &&
        (!filters.favorites || c.favorite) &&
        tokens.every((t) =>
          norm(
            [
              c.name,
              c.roaster,
              c.origin,
              c.tasting,
              c.target,
              ...(c.rating?.tags || []),
            ].join(" "),
          ).includes(t),
        ),
    );
    return list.sort((a, b) =>
      filters.sort === "score"
        ? (b.rating?.score || -1) - (a.rating?.score || -1)
        : filters.sort === "name"
          ? a.name.localeCompare(b.name, "de")
          : (b.created || 0) - (a.created || 0),
    );
  }, [state.coffees, filters]);
  return (
    <>
      <Header
        title="Kaffees"
        subtitle="Deine Erfahrungen. Deine bewährten Rezepte."
        onSettings={onSettings}
      />
      <div className="search">
        <Icon name="search" />
        <label htmlFor="coffee-search" className="visually-hidden">
          Kaffees durchsuchen
        </label>
        <input
          id="coffee-search"
          className="search-input"
          type="search"
          autoComplete="off"
          placeholder="Name, Röster oder Geschmack"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        />
        {filters.query && (
          <IconButton
            name="close"
            label="Suche leeren"
            onClick={() => setFilters({ ...filters, query: "" })}
          />
        )}
      </div>
      <div className="collection-controls">
        <Button
          className={filters.favorites ? "primary" : ""}
          aria-pressed={filters.favorites}
          onClick={() =>
            setFilters({ ...filters, favorites: !filters.favorites })
          }
        >
          <Icon name="star" size={18} />
          Favoriten
        </Button>
        <label className="visually-hidden" htmlFor="coffee-sort">
          Kaffees sortieren
        </label>
        <select
          id="coffee-sort"
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="newest">Zuletzt hinzugefügt</option>
          <option value="score">Beste Bewertung</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      {!!coffees.length ? (
        <div className="row-list">
          {coffees.map((c) => (
            <CoffeeRow
              key={c.id}
              coffee={c}
              onOpen={onOpen}
              onFavorite={onFavorite}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={
            state.coffees.length
              ? "Kein passender Kaffee"
              : "Deine Sammlung beginnt hier."
          }
          action={
            <Button variant="primary" onClick={onNew}>
              Neuen Kaffee einstellen
            </Button>
          }
        >
          {state.coffees.length
            ? "Passe Suche oder Favoritenfilter an."
            : "Rezepte, Packungen und Bewertungen bleiben gemeinsam beim Kaffee."}
        </Empty>
      )}
      {!!coffees.length && (
        <Button className="wide" onClick={onNew} style={{ marginTop: 24 }}>
          <Icon name="plus" />
          Kaffee hinzufügen
        </Button>
      )}
      <Retrospective coffees={state.coffees.filter((c) => !c.archivedAt)} />
    </>
  );
}
function Retrospective({ coffees }) {
  const rated = coffees.filter((c) => c.rating?.score > 0),
    roasters = new Map(),
    tags = new Map();
  for (const c of coffees) {
    if (c.roaster) {
      const key = norm(c.roaster);
      roasters.set(key, {
        label: c.roaster,
        count: (roasters.get(key)?.count || 0) + 1,
      });
    }
    for (const tag of new Set(c.rating?.tags || []))
      tags.set(tag, (tags.get(tag) || 0) + 1);
  }
  if (!coffees.length) return null;
  return (
    <details className="section">
      <summary>Rückblick auf deine Kaffees</summary>
      <p className="metadata">
        Automatisch aus deiner Sammlung. Keine zusätzliche Pflege.
      </p>
      <div className="insights">
        <div>
          <h3>Dokumentierte Röstereien</h3>
          {[...roasters.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((r) => (
              <p key={r.label}>
                {r.label} · {r.count} {r.count === 1 ? "Kaffee" : "Kaffees"}
              </p>
            ))}
          {!roasters.size && <p>Rösterangaben fehlen noch.</p>}
        </div>
        <div>
          <h3>Selbst gewählte Geschmacksnoten</h3>
          {[...tags]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => (
              <p key={tag}>
                {tag} · bei {count} von{" "}
                {coffees.filter((c) => c.rating?.tags?.length).length} Kaffees
                mit Geschmacksnoten
              </p>
            ))}
          {!tags.size && (
            <p>
              Noch keine persönlichen Geschmacksnoten erfasst. Rösterangaben
              zählen hier nicht als eigener Geschmack.
            </p>
          )}
        </div>
        <p>
          {rated.length} von {coffees.length} Kaffees persönlich bewertet. Nicht
          bewertete Kaffees fließen nicht in Scores ein.
        </p>
      </div>
    </details>
  );
}

export function CoffeeView({
  coffee,
  batch,
  onBack,
  onSettings,
  onBatch,
  onShot,
  onNewBatch,
  onShotDetail,
  onEdit,
  onRate,
  onArchive,
  onPhoto,
  onRetry,
  analysisBusy,
  onFinishPack,
}) {
  const ref = latestRecipe(coffee),
    shots = batch.shots.filter((s) => !s.archivedAt),
    last = shots.at(-1),
    recipe = batch.finalRecipe;
  return (
    <>
      <Header title="Dein Kaffee" onBack={onBack} onSettings={onSettings} />
      <Identity coffee={coffee} batch={batch} large onPhoto={onPhoto} />
      <div className="badge-row">
        {coffee.favorite && <span className="badge">Favorit</span>}
        {coffee.rating?.score > 0 && (
          <span className="badge">{fmt(coffee.rating.score)}/10</span>
        )}
        {coffee.buyAgain === true && (
          <span className="badge">Würde ich wieder kaufen</span>
        )}
      </div>
      <div className="pack-select">
        <Field label="Packung">
          {(inputId) => (
            <select
              id={inputId}
              value={batch.id}
              onChange={(e) => onBatch(e.target.value)}
            >
              {[...coffee.batches].reverse().map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label || "Packung"}
                  {b.roastDate ? ` · ${b.roastDate}` : ""}
                  {b.finalRecipe ? " · Rezept" : ""}
                  {b.closedDate ? " · aufgebraucht" : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <PackAge batch={batch} />
      {recipe ? (
        <Recipe recipe={recipe} />
      ) : (
        ref && (
          <Recipe
            recipe={ref.recipe}
            title={`Referenz aus ${ref.batch.label || "früherer Packung"}`}
            reference
          />
        )
      )}
      <div className="target">
        <small>Geschmacksziel dieser Packung</small>
        <p>{batch.target || coffee.target || "Noch offen"}</p>
      </div>
      {!batch.closedDate && (
        <Button
          variant="primary"
          className="wide"
          onClick={() => onShot(coffee.id, batch.id)}
        >
          {recipe && !batch.dialing
            ? "Bewusst nachjustieren"
            : "Versuch erfassen"}
        </Button>
      )}
      <div className="actions">
        <Button onClick={onNewBatch}>Neue Packung</Button>
        <Button onClick={onRate}>
          {coffee.rating ? "Bewertung bearbeiten" : "Optional bewerten"}
        </Button>
      </div>
      {!recipe && last?.ai && (
        <Analysis
          shot={last}
          current={analysisIsCurrent(coffee, batch, last)}
          onRetry={() => onRetry(coffee.id, batch.id, last.id)}
          busy={analysisBusy === last.id}
        />
      )}
      <section className="section">
        <div className="section-heading">
          <h2>Versuche dieser Packung</h2>
          <span className="metadata">{shots.length}</span>
        </div>
        {shots.length ? (
          <div className="row-list">
            {shots.map((s, n) => (
              <button
                key={s.id}
                type="button"
                className="shot-row"
                onClick={() => onShotDetail(s.id)}
              >
                <div>
                  <strong>Versuch {n + 1}</strong>
                  <Icon name="chevron" size={18} />
                </div>
                <p className="shot-values">
                  {fmt(s.dose)} g → {fmt(s.yield)} g ·{" "}
                  {s.time == null ? "Zeit offen" : `${fmt(s.time)} s`} ·
                  Mahlgrad {s.grind || "offen"}
                </p>
                <p>
                  {s.note ||
                    Object.values(s.sensory || {})
                      .filter(Boolean)
                      .join(" · ") ||
                    "Geschmack offen"}
                </p>
                {recipe?.sourceShotId === s.id && (
                  <span className="badge">Ursprung deines Rezepts</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">
            Noch kein Versuch für diese Packung. Die frühere Referenz bleibt
            erhalten.
          </p>
        )}
      </section>
      <details className="section">
        <summary>Kaffee- und Packungsdetails</summary>
        <dl className="detail-list">
          {[
            ["Rösterprofil", coffee.tasting],
            ["Herkunft", coffee.origin],
            ["Röstgrad", coffee.roast],
            ["Varietät", coffee.variety],
            ["Aufbereitung", coffee.process],
            ["Rösterrezept", coffee.roasterRecipe],
            ["Geöffnet am", batch.openedDate],
            ["Sieb", batch.basket],
          ].map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
        {!!coffee.rating?.tags?.length && (
          <p className="metadata">
            Deine Geschmacksnoten: {coffee.rating.tags.join(", ")}
          </p>
        )}
        {coffee.rating?.profile && (
          <p className="metadata rating-profile">
            Historisches Profil:{" "}
            {Object.entries(coffee.rating.profile)
              .map(
                ([k, v]) =>
                  `${{ acidity: "Säure", sweetness: "Süße", bitterness: "Bitterkeit", body: "Körper", intensity: "Intensität" }[k] || k} ${v}/5`,
              )
              .join(" · ")}
            . Ursprung einzelner Altwerte ist nicht nachweisbar.
          </p>
        )}
        <div className="actions">
          <Button onClick={onEdit}>Angaben bearbeiten</Button>
          {!batch.closedDate && (
            <Button onClick={onFinishPack}>Packung aufgebraucht</Button>
          )}
          <Button variant="danger" onClick={onArchive}>
            Kaffee ins Archiv
          </Button>
        </div>
      </details>
      {batch.shots.some((s) => s.archivedAt) && (
        <details>
          <summary>Archivierte Versuche</summary>
          {batch.shots
            .filter((s) => s.archivedAt)
            .map((s) => (
              <button
                key={s.id}
                className="shot-row"
                onClick={() => onShotDetail(s.id)}
              >
                {fmt(s.dose)} → {fmt(s.yield)} g · {s.note || "Versuch"}
              </button>
            ))}
        </details>
      )}
    </>
  );
}
