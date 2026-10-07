import { DataError } from "./domain.mjs";
export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    diagnosis: { type: "string" },
    next_change: { type: "string" },
    keep_constant: { type: "string" },
    tasting_focus: { type: "string" },
    rationale: { type: "string" },
    trend_summary: { type: "string" },
    confidence: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
    channeling_suspected: { type: "boolean" },
    ready_to_finalize: { type: "boolean" },
    recommend_confirmation_shot: { type: "boolean" },
    change_parameter: {
      type: "string",
      enum: ["grind", "yield", "dose", "preparation", "none"],
    },
    next_settings: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        dose: { type: ["number", "null"] },
        yield: { type: ["number", "null"] },
        grind: { type: ["string", "null"] },
      },
      required: ["dose", "yield", "grind"],
    },
  },
  required: [
    "diagnosis",
    "next_change",
    "keep_constant",
    "tasting_focus",
    "rationale",
    "trend_summary",
    "confidence",
    "channeling_suspected",
    "ready_to_finalize",
    "recommend_confirmation_shot",
    "change_parameter",
    "next_settings",
  ],
};
const string = (value, label, max = 2000, required = false) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new DataError(`${label} fehlt oder ist zu lang.`);
  return value;
};
const positive = (v, label, max) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > max)
    throw new DataError(`${label} ist ungültig.`);
};
function shot(s, requireTaste = false) {
  if (!s || typeof s !== "object") throw new DataError("Shot fehlt.");
  positive(s.dose, "Dosis", 100);
  positive(s.yield, "Yield", 1000);
  if (s.time != null) positive(s.time, "Zeit", 600);
  string(s.grind || "", "Mahlgrad", 200);
  string(s.note || "", "Geschmackseindruck");
  if (
    !s.sensory ||
    typeof s.sensory !== "object" ||
    Array.isArray(s.sensory) ||
    Object.entries(s.sensory).some(
      ([k, v]) => k.length > 30 || typeof v !== "string" || v.length > 150,
    )
  )
    throw new DataError("Geschmacksdaten sind ungültig.");
  if (
    requireTaste &&
    !s.note?.trim() &&
    !Object.values(s.sensory).some((v) => v.trim())
  )
    throw new DataError(
      "Bitte einen tatsächlichen Geschmackseindruck ergänzen.",
    );
  if (s.timeBasis && !["first-drop", "pump"].includes(s.timeBasis))
    throw new DataError("Zeitbasis ist ungültig.");
}
export function validateAnalysisInput(body) {
  if (!body?.coffee || !body.batch)
    throw new DataError("Kaffee und Packung fehlen.");
  string(body.coffee.name, "Kaffeename", 300, true);
  string(body.coffee.roaster || "", "Röster", 300);
  string(body.coffee.target, "Geschmacksziel", 2000, true);
  string(body.coffee.tasting || "", "Rösterprofil");
  shot(body.shot, true);
  if (!Array.isArray(body.history) || body.history.length > 6)
    throw new DataError(
      "Bitte höchstens sechs relevante Vergleichsversuche senden.",
    );
  body.history.forEach((s) => shot(s));
  return body;
}
export function validateAnalysisResult(result, current) {
  for (const key of [
    "diagnosis",
    "next_change",
    "keep_constant",
    "tasting_focus",
    "rationale",
    "trend_summary",
  ])
    string(result?.[key], "KI-Antwort", 4000);
  if (
    !["hoch", "mittel", "niedrig"].includes(result.confidence) ||
    !["grind", "yield", "dose", "preparation", "none"].includes(
      result.change_parameter,
    )
  )
    throw new DataError("Die KI-Antwort passt nicht zum Auswertungsvertrag.");
  for (const key of [
    "channeling_suspected",
    "ready_to_finalize",
    "recommend_confirmation_shot",
  ])
    if (typeof result[key] !== "boolean")
      throw new DataError("Unvollständige KI-Antwort.");
  const plan = result.next_settings;
  if (plan != null) {
    if (
      typeof plan !== "object" ||
      Array.isArray(plan) ||
      Object.keys(plan).some((k) => !["dose", "yield", "grind"].includes(k))
    )
      throw new DataError("Ungültiger Einstellvorschlag.");
    for (const [key, max] of [
      ["dose", 100],
      ["yield", 1000],
    ])
      if (plan[key] != null) positive(plan[key], "Einstellvorschlag", max);
    if (plan.grind != null) string(plan.grind, "Mahlgradvorschlag", 200);
    const changes = Object.keys(plan).filter(
      (k) => plan[k] != null && String(plan[k]) !== String(current[k]),
    );
    if (
      changes.length > 1 ||
      changes.some((k) => k !== result.change_parameter)
    )
      throw new DataError(
        "Die KI hat mehrere oder widersprüchliche Einstellungen vorgeschlagen. Bitte erneut auswerten.",
      );
  }
  // Null means retain the measured value, never blank a known setting.
  return {
    ...result,
    next_settings: plan
      ? Object.fromEntries(Object.entries(plan).filter(([, v]) => v != null))
      : null,
  };
}
