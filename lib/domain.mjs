/** Local data contract. Keep legacy fields; never infer taste or measurements. */
import { analysisContext } from "./analysis-context.mjs";
export const SCHEMA_VERSION = 2;
export const clone = (value) => structuredClone(value);
export const id = () => globalThis.crypto.randomUUID();
export function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    coffees: [],
    activeCoffeeId: null,
    activeBatchId: null,
    equipment: {
      machine: "Rocket Espresso Milano Giotto Evoluzione R",
      grinder: "",
      grinderType: "",
      finerDirection: "",
      machineResearch: null,
      grinderResearch: null,
      baskets: ["15 g"],
      defaultDose: 17.5,
      defaultRatio: 2,
    },
    preferences: { theme: "system" },
  };
}
export class DataError extends Error {}
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const identity = (v, label, seen) => {
  if (typeof v !== "string" || !v.trim() || seen.has(v))
    throw new DataError(`${label}: ID fehlt oder ist doppelt.`);
  seen.add(v);
};
/** Strict structural validation; historical measurements are retained, even if incomplete. */
export function validateState(state) {
  if (!object(state) || !Array.isArray(state.coffees))
    throw new DataError("Die Datei enthält keinen Espresso-Lab-Bestand.");
  if (state.schemaVersion !== SCHEMA_VERSION)
    throw new DataError("Dieses Datenformat wird nicht unterstützt.");
  if (!Number.isSafeInteger(state.revision) || state.revision < 0)
    throw new DataError("Ungültige Datenrevision.");
  if (!object(state.equipment)) throw new DataError("Equipment-Daten fehlen.");
  if (
    !Array.isArray(state.equipment.baskets) ||
    !state.equipment.baskets.every((v) => typeof v === "string") ||
    typeof state.equipment.machine !== "string" ||
    typeof state.equipment.grinder !== "string"
  )
    throw new DataError(
      "Equipment-Felder sind ungültig. Der Bestand bleibt erhalten.",
    );
  for (const key of ["defaultDose", "defaultRatio"])
    if (
      typeof state.equipment[key] !== "number" ||
      !Number.isFinite(state.equipment[key]) ||
      state.equipment[key] <= 0
    )
      throw new DataError("Die persönliche Starteinstellung ist ungültig.");
  if (
    !object(state.preferences) ||
    !["system", "light", "dark"].includes(state.preferences.theme)
  )
    throw new DataError("Darstellungseinstellungen sind ungültig.");
  const cs = new Set(),
    bs = new Set(),
    ss = new Set();
  for (const c of state.coffees) {
    if (!object(c)) throw new DataError("Ungültiger Kaffee.");
    identity(c.id, "Kaffee", cs);
    if (
      c.rating != null &&
      (!object(c.rating) ||
        (c.rating.tags != null &&
          (!Array.isArray(c.rating.tags) ||
            !c.rating.tags.every((t) => typeof t === "string"))) ||
        (c.rating.profile != null && !object(c.rating.profile)))
    )
      throw new DataError("Bewertungsdaten sind ungültig.");
    for (const key of [
      "tasting",
      "target",
      "origin",
      "roast",
      "variety",
      "process",
    ])
      if (c[key] != null && typeof c[key] !== "string")
        throw new DataError("Kaffeeangaben sind ungültig.");
    if (
      typeof c.name !== "string" ||
      typeof c.roaster !== "string" ||
      !Array.isArray(c.batches)
    )
      throw new DataError("Kaffee-Identität oder Packungen sind ungültig.");
    if (
      c.images != null &&
      (!Array.isArray(c.images) ||
        !c.images.every((i) => typeof i === "string"))
    )
      throw new DataError("Ungültige Fotos.");
    for (const b of c.batches) {
      if (!object(b)) throw new DataError("Ungültige Packung.");
      identity(b.id, "Packung", bs);
      for (const key of [
        "label",
        "target",
        "basket",
        "roastDate",
        "openedDate",
      ])
        if (b[key] != null && typeof b[key] !== "string")
          throw new DataError("Packungsangaben sind ungültig.");
      if (!Array.isArray(b.shots))
        throw new DataError("Versuche einer Packung sind ungültig.");
      if (
        b.images != null &&
        (!Array.isArray(b.images) ||
          !b.images.every((i) => typeof i === "string"))
      )
        throw new DataError("Ungültige Packungsfotos.");
      for (const s of b.shots) {
        if (!object(s)) throw new DataError("Ungültiger Versuch.");
        identity(s.id, "Versuch", ss);
        for (const key of ["dose", "yield", "time"]) {
          if (
            s[key] != null &&
            (typeof s[key] !== "number" || !Number.isFinite(s[key]))
          )
            throw new DataError(`Ungültiger Messwert: ${key}.`);
        }
        if (s.sensory != null && !object(s.sensory))
          throw new DataError("Ungültige Geschmacksdaten.");
        if (
          s.sensory &&
          Object.values(s.sensory).some((v) => typeof v !== "string")
        )
          throw new DataError("Ungültige Geschmackswerte.");
        if (s.equipment != null && !object(s.equipment))
          throw new DataError("Ungültiger historischer Equipment-Kontext.");
        if (
          s.revision != null &&
          (!Number.isSafeInteger(s.revision) || s.revision < 0)
        )
          throw new DataError("Ungültige Versuchsversion.");
      }
      if (
        b.finalId &&
        !b.shots.some((s) => s.id === b.finalId) &&
        !b.finalRecipe
      )
        throw new DataError(
          "Ein Finalrezept verweist auf einen fehlenden Versuch.",
        );
      if (
        b.finalRecipe &&
        (!object(b.finalRecipe) || !object(b.finalRecipe.settings))
      )
        throw new DataError("Ungültige Rezeptkopie.");
    }
  }
  if (state.activeCoffeeId != null && !cs.has(state.activeCoffeeId))
    throw new DataError("Aktiver Kaffee fehlt.");
  if (
    state.activeBatchId != null &&
    !state.coffees
      .find((c) => c.id === state.activeCoffeeId)
      ?.batches.some((b) => b.id === state.activeBatchId)
  )
    throw new DataError("Aktive Packung gehört nicht zum aktiven Kaffee.");
  return state;
}
export function snapshotRecipe(coffee, batch, shot, { legacy = false } = {}) {
  if (!legacy) {
    decimal(shot.dose, { max: 100 });
    decimal(shot.yield, { max: 1000 });
  }
  return {
    id: `recipe-${shot.id}`,
    sourceShotId: shot.id,
    confirmedAt: legacy ? null : Date.now(),
    legacy,
    target: batch.target || coffee.target || "",
    settings: {
      dose: shot.dose,
      yield: shot.yield,
      time: shot.time ?? null,
      timeBasis: shot.timeBasis || "first-drop",
      grind: shot.grind || "",
      pressure: shot.pressure || "",
      basket: shot.equipment?.basket || batch.basket || "",
    },
    equipment: shot.equipment ? clone(shot.equipment) : null,
    sensory: clone(shot.sensory || {}),
    note: shot.note || "",
    tags: clone(shot.tags || []),
  };
}
export function normalizeState(raw) {
  if (raw === undefined) return emptyState();
  if (!object(raw) || !Array.isArray(raw.coffees))
    throw new DataError(
      "Gespeicherte Daten sind nicht lesbar. Der Bestand wurde nicht verändert.",
    );
  if (
    raw.schemaVersion != null &&
    (!Number.isInteger(raw.schemaVersion) ||
      raw.schemaVersion > SCHEMA_VERSION ||
      raw.schemaVersion < 1)
  )
    throw new DataError("Dieser Bestand benötigt eine andere App-Version.");
  const base = emptyState();
  if (raw.schemaVersion === SCHEMA_VERSION) validateState(raw);
  if (raw.preferences != null && !object(raw.preferences))
    throw new DataError("Darstellungseinstellungen sind beschädigt.");
  if (raw.equipment != null && !object(raw.equipment))
    throw new DataError("Equipment-Daten sind beschädigt.");
  const coffees = raw.coffees.map((c, n) => {
    if (!object(c)) throw new DataError("Ein Kaffee ist nicht lesbar.");
    const next = {
      ...c,
      id: c.id || `legacy-coffee-${n}`,
      roaster: c.roaster || "",
      name: c.name || "",
    };
    if (c.batches != null && !Array.isArray(c.batches))
      throw new DataError("Packungsdaten sind beschädigt.");
    next.batches = (
      c.batches || [
        {
          id: `legacy-batch-${next.id}`,
          label: "Importierte Packung",
          roastDate: "",
          basket: c.basket || "",
          shots: c.shots || [],
          finalId: c.finalId || null,
          created: c.created,
        },
      ]
    ).map((b) => {
      if (!object(b) || !Array.isArray(b.shots))
        throw new DataError("Versuchshistorie ist beschädigt.");
      const batch = { ...b };
      const source = b.shots.find((s) => s?.id === b.finalId);
      if (source && !b.finalRecipe)
        batch.finalRecipe = snapshotRecipe(next, b, source, { legacy: true });
      return batch;
    });
    if (!next.images) next.images = c.image ? [c.image] : [];
    return next;
  });
  const active =
    coffees.find((c) => c.id === (raw.activeCoffeeId || raw.activeId)) || null;
  const activeBatch =
    active?.batches.find((b) => b.id === raw.activeBatchId) ||
    active?.batches.at(-1) ||
    null;
  const state = {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    revision: raw.revision ?? 0,
    coffees,
    equipment: { ...base.equipment, ...raw.equipment },
    preferences: { ...base.preferences, ...raw.preferences },
    activeCoffeeId: active?.id || null,
    activeBatchId: activeBatch?.id || null,
  };
  return validateState(state);
}
export const BACKUP_FORMAT = "espresso-lab-backup";
export function makeBackup(state, drafts = {}) {
  validateState(state);
  return {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    state: clone(state),
    drafts: clone(drafts),
  };
}
export function parseBackup(raw) {
  if (!object(raw)) throw new DataError("Keine gültige Backupdatei.");
  if (
    raw.format != null &&
    (raw.format !== BACKUP_FORMAT || raw.formatVersion !== 1)
  )
    throw new DataError("Dieses Backupformat wird nicht unterstützt.");
  const state = normalizeState(raw.format ? raw.state : raw);
  // Missing state is not a valid empty backup.
  if (raw.format && !object(raw.state))
    throw new DataError("Der Backupbestand fehlt.");
  const drafts = raw.format ? raw.drafts || {} : {};
  if (
    !object(drafts) ||
    Object.entries(drafts).some(
      ([k, v]) => !k.startsWith("draft:") || !object(v),
    )
  )
    throw new DataError("Ungültige Entwürfe im Backup.");
  return { state, drafts, summary: counts(state) };
}
export function counts(state) {
  return {
    coffees: state.coffees.length,
    batches: state.coffees.reduce((n, c) => n + c.batches.length, 0),
    shots: state.coffees.reduce(
      (n, c) => n + c.batches.reduce((m, b) => m + b.shots.length, 0),
      0,
    ),
    recipes: state.coffees.reduce(
      (n, c) => n + c.batches.filter((b) => b.finalRecipe).length,
      0,
    ),
  };
}
export function decimal(
  value,
  { optional = false, min = 0, max = 10000 } = {},
) {
  const text = String(value ?? "").trim();
  if (!text && optional) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(text))
    throw new DataError("Bitte eine vollständige Zahl eingeben, z. B. 17,5.");
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n) || n <= min || n > max)
    throw new DataError(
      `Der Wert muss größer als ${min} und höchstens ${max} sein.`,
    );
  return n;
}
export const fmt = (v) =>
  v == null || !Number.isFinite(Number(v))
    ? "—"
    : Number(v).toLocaleString("de-DE", { maximumFractionDigits: 2 });
export const ratio = (dose, yieldValue) =>
  dose > 0 && yieldValue > 0 ? `1:${fmt(yieldValue / dose)}` : "—";
export const norm = (s = "") =>
  String(s)
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function findCoffee(coffees, roaster, name) {
  const tokenScore = (a, b) => {
    const A = new Set(norm(a).split(/\s+/).filter(Boolean)),
      B = new Set(norm(b).split(/\s+/).filter(Boolean));
    return A.size && B.size
      ? [...A].filter((x) => B.has(x)).length / Math.max(A.size, B.size)
      : 0;
  };
  return (
    coffees.find(
      (c) =>
        !c.archivedAt &&
        norm(name) &&
        0.6 * tokenScore(c.name, name) + 0.4 * tokenScore(c.roaster, roaster) >=
          0.8,
    ) || null
  );
}
export function latestRecipe(coffee) {
  for (const b of [...coffee.batches].reverse())
    if (b.finalRecipe) return { recipe: b.finalRecipe, batch: b };
  return null;
}
export function locate(state, coffeeId, batchId) {
  const coffee = state.coffees.find((c) => c.id === coffeeId),
    batch = coffee?.batches.find((b) => b.id === batchId);
  if (!coffee || !batch)
    throw new DataError(
      "Dieser Kaffee oder diese Packung ist nicht mehr verfügbar.",
    );
  return { coffee, batch };
}
export function changeBatch(state, cid, bid, update) {
  locate(state, cid, bid);
  return {
    ...state,
    coffees: state.coffees.map((c) =>
      c.id === cid
        ? {
            ...c,
            batches: c.batches.map((b) => (b.id === bid ? update(b, c) : b)),
          }
        : c,
    ),
  };
}
export function createCoffeeOrBatch(state, draft, existingId = null) {
  if (!String(draft.name || "").trim())
    throw new DataError("Bitte den Kaffeenamen eingeben.");
  const known = existingId
    ? state.coffees.find((c) => c.id === existingId)
    : null;
  if (existingId && !known) throw new DataError("Der vorhandene Kaffee fehlt.");
  const images = clone(draft.images || []),
    cid = known?.id || id(),
    bid = id();
  const ref = known && latestRecipe(known);
  const batch = {
    id: bid,
    created: Date.now(),
    label:
      draft.label ||
      (known ? `Packung ${known.batches.length + 1}` : "Erste Packung"),
    roastDate: draft.roastDate || "",
    openedDate: draft.openedDate || "",
    basket:
      draft.basket ||
      ref?.recipe.settings.basket ||
      state.equipment.baskets[0] ||
      "",
    target: draft.target ?? known?.target ?? "",
    images,
    shots: [],
    finalId: null,
    finalRecipe: null,
  };
  const coffee = known
    ? { ...known, batches: [...known.batches, batch] }
    : {
        id: cid,
        created: Date.now(),
        roaster: draft.roaster || "",
        name: draft.name.trim(),
        origin: draft.origin || "",
        roast: draft.roast || "",
        tasting: draft.tasting || "",
        target: draft.target || "",
        variety: draft.variety || "",
        process: draft.process || "",
        roasterRecipe: draft.roasterRecipe || "",
        images,
        coverImageIndex: draft.coverImageIndex || 0,
        rating: null,
        favorite: false,
        buyAgain: null,
        batches: [batch],
      };
  return {
    ...state,
    coffees: known
      ? state.coffees.map((c) => (c.id === cid ? coffee : c))
      : [coffee, ...state.coffees],
    activeCoffeeId: cid,
    activeBatchId: bid,
  };
}
export function shotFromDraft(draft, equipment, batch, existing = null) {
  return {
    ...existing,
    id: existing?.id || draft.id || id(),
    created: existing?.created || Date.now(),
    revision: (existing?.revision || 0) + 1,
    dose: decimal(draft.dose, { max: 100 }),
    yield: decimal(draft.yield, { max: 1000 }),
    time: decimal(draft.time, { optional: true, max: 600 }),
    timeBasis: draft.timeBasis || "first-drop",
    grind: String(draft.grind || "").trim(),
    pressure: String(draft.pressure || "").trim(),
    note: String(draft.note || "").trim(),
    sensory: clone(draft.sensory || {}),
    tags: clone(draft.tags || []),
    equipment: existing
      ? (existing.equipment ?? null)
      : { ...clone(equipment), basket: draft.basket || batch.basket || "" },
    ai: null,
    analysisStatus: "saved",
  };
}
export function presetFor(coffee, batch, equipment) {
  const last = batch.shots.filter((s) => !s.archivedAt).at(-1),
    ref = latestRecipe(coffee)?.recipe;
  const basis = last ||
    ref?.settings || {
      dose: equipment.defaultDose,
      yield: equipment.defaultDose * equipment.defaultRatio,
      grind: "",
    };
  const plan =
    last && analysisIsCurrent(coffee, batch, last)
      ? last.ai.next_settings
      : null;
  return {
    id: id(),
    dose: String(basis.dose ?? equipment.defaultDose),
    yield: String(
      basis.yield ?? equipment.defaultDose * equipment.defaultRatio,
    ),
    grind: basis.grind || "",
    ...Object.fromEntries(
      Object.entries(plan || {}).filter(([, value]) => value != null),
    ),
    time: "",
    timeBasis: last?.timeBasis || ref?.settings.timeBasis || "first-drop",
    basket: batch.basket || ref?.settings.basket || equipment.baskets[0] || "",
    note: "",
    sensory: {},
    tags: [],
  };
}
export function analysisIsCurrent(coffee, batch, shot) {
  return (
    !!shot.ai && shot.analysisSignature === analysisContext(coffee, batch, shot)
  );
}
export function comparison(previous, current) {
  if (!previous) return [];
  return [
    ["dose", "Dosis", "g"],
    ["yield", "Yield", "g"],
    ["grind", "Mahlgrad", ""],
    ["time", "Zeit", "s"],
  ].map(([key, label, unit]) => ({
    key,
    label,
    unit,
    before: previous[key],
    after: current[key],
    changed: previous[key] !== current[key],
    comparable:
      key !== "time" ||
      (previous.timeBasis || "first-drop") ===
        (current.timeBasis || "first-drop"),
  }));
}
export function ageDays(text, now = Date.now()) {
  if (!text) return null;
  let date = String(text);
  const d = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (d) date = `${d[3]}-${d[2]}-${d[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = Date.parse(date + "T00:00:00Z");
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== date ||
    parsed > now
  )
    return null;
  return Math.floor((now - parsed) / 86400000);
}
