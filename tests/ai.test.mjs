import test from "node:test";
import assert from "node:assert/strict";
import { analysisPayload, analysisContext } from "../lib/api-client.mjs";
import { analysisIsCurrent, emptyState, presetFor } from "../lib/domain.mjs";
import {
  validateAnalysisInput,
  validateAnalysisResult,
} from "../lib/ai-contract.mjs";
const shot = {
  id: "shot",
  dose: 17.5,
  yield: 35,
  time: 31,
  timeBasis: "first-drop",
  grind: "2",
  note: "Noch trocken",
  sensory: { overall: "okay" },
  created: 10,
  revision: 1,
  equipment: { grinder: "Testmühle" },
};
const coffee = {
    name: "Test",
    roaster: "Röster",
    target: "Schokoladig und süß",
    tasting: "Schokolade",
    roasterRecipe: "17,5 g in, 35 g out; geschmacksabhängig anpassen",
    batches: [],
  },
  batch = { id: "b", shots: [shot], target: coffee.target, basket: "18 g" };
const result = {
  diagnosis: "Etwas trocken",
  next_change: "Yield auf 33 g reduzieren",
  keep_constant: "Dosis und Mahlgrad",
  tasting_focus: "Runderer Nachgeschmack",
  rationale: "Hypothese anhand des Tastings",
  trend_summary: "",
  confidence: "mittel",
  channeling_suspected: false,
  ready_to_finalize: false,
  recommend_confirmation_shot: false,
  change_parameter: "yield",
  next_settings: { dose: null, yield: 33, grind: null },
};
test("KI-Payload ist begrenzt, ohne Foto/rekursive Analysen und enthält historisches Equipment", () => {
  const history = Array.from({ length: 20 }, (_, n) => ({
    ...shot,
    id: "s" + n,
    created: n,
    ai: { huge: "do not send" },
  }));
  const payload = analysisPayload(
    { ...coffee, images: ["SECRET_PHOTO"] },
    { ...batch, shots: history },
    { ...shot, created: 30 },
  );
  assert.equal(payload.history.length, 6);
  assert.ok(!JSON.stringify(payload).includes("huge"));
  assert.ok(!JSON.stringify(payload).includes("SECRET_PHOTO"));
  assert.deepEqual(payload.equipment, shot.equipment);
  assert.equal(payload.coffee.roasterRecipe, coffee.roasterRecipe);
  validateAnalysisInput(payload);
});
test("Fehlendes Ziel oder tatsächlicher Geschmack verhindert spekulative Diagnose", () => {
  const payload = analysisPayload(coffee, batch, shot);
  assert.throws(() =>
    validateAnalysisInput({ ...payload, coffee: { ...coffee, target: "" } }),
  );
  assert.throws(() =>
    validateAnalysisInput({
      ...payload,
      shot: { ...shot, note: "", sensory: {} },
    }),
  );
});
test("KI-Vertrag akzeptiert genau eine Einstellung; Null überschreibt keine bekannten Werte", () => {
  assert.deepEqual(validateAnalysisResult(result, shot).next_settings, {
    yield: 33,
  });
  assert.throws(() =>
    validateAnalysisResult(
      { ...result, next_settings: { dose: 18, yield: 33, grind: null } },
      shot,
    ),
  );
  assert.throws(() =>
    validateAnalysisResult(
      {
        ...result,
        change_parameter: "temperature",
        next_settings: { temperature: 93 },
      },
      shot,
    ),
  );
});
test("Kontextänderungen machen laufende Ergebnisse ungültig; Favoriten ändern den Analysekontext nicht", () => {
  const before = analysisContext(coffee, batch, shot);
  assert.notEqual(
    analysisContext(coffee, batch, { ...shot, note: "Jetzt süß" }),
    before,
  );
  assert.notEqual(
    analysisContext(coffee, { ...batch, target: "Fruchtiger" }, shot),
    before,
  );
  assert.equal(
    analysisContext({ ...coffee, favorite: true }, batch, shot),
    before,
  );
});

test("Gespeicherte KI-Pläne werden nach Ziel- oder Referenzänderung nicht still weiterverwendet", () => {
  const measured = { ...shot, ai: result };
  const pack = { ...batch, shots: [measured] };
  measured.analysisSignature = analysisContext(coffee, pack, measured);
  const equipment = emptyState().equipment;
  assert.equal(analysisIsCurrent(coffee, pack, measured), true);
  assert.equal(presetFor(coffee, pack, equipment).yield, 33);
  const changed = { ...pack, target: "Weniger intensiv" };
  assert.equal(analysisIsCurrent(coffee, changed, measured), false);
  assert.equal(presetFor(coffee, changed, equipment).yield, "35");
  const confirmed = {
    ...coffee,
    batches: [
      { finalRecipe: { settings: { dose: 18, yield: 36 }, target: "Süß" } },
    ],
  };
  assert.equal(analysisIsCurrent(confirmed, pack, measured), false);
  const legacy = { ...measured, analysisSignature: undefined };
  assert.equal(
    presetFor(coffee, { ...pack, shots: [legacy] }, equipment).yield,
    "35",
  );
  assert.deepEqual(legacy.ai, result);
});
test("Historische fehlende Zeit verhindert keine neue Analyse; ungültige alte Dosis wird nicht als gültiger Vergleich versandt", () => {
  const p = analysisPayload(
    coffee,
    {
      ...batch,
      shots: [
        { ...shot, id: "old", created: 1, time: 0 },
        { ...shot, id: "bad", created: 2, dose: 0 },
      ],
    },
    { ...shot, created: 20 },
  );
  assert.equal(p.history.length, 1);
  assert.equal(p.history[0].time, null);
  validateAnalysisInput(p);
});
