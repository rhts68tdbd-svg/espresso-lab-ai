import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { createStorage, ConflictError } from "../lib/storage.mjs";
import {
  emptyState,
  createCoffeeOrBatch,
  shotFromDraft,
  snapshotRecipe,
  analysisIsCurrent,
  findCoffee,
  comparison,
  presetFor,
  makeBackup,
} from "../lib/domain.mjs";
import { analysisContext, analysisPayload } from "../lib/analysis-context.mjs";
import { validateAnalysisInput } from "../lib/ai-contract.mjs";
import { applyAnalysisOutcome } from "../lib/analysis-save.mjs";
import {
  deletionSummary,
  draftBelongsToCoffee,
} from "../lib/delete-contract.mjs";

function fixture() {
  const state = createCoffeeOrBatch(emptyState(), {
    name: "Testkaffee",
    target: "Rund und süß",
    images: ["PHOTO"],
  });
  state.equipment = {
    ...state.equipment,
    machine: "Maschine A",
    grinder: "Mühle A",
  };
  const coffee = state.coffees[0],
    batch = coffee.batches[0];
  batch.basket = "18 g";
  const shot = shotFromDraft(
    {
      dose: "18",
      yield: "36",
      time: "30",
      timeBasis: "first-drop",
      grind: "2",
      basket: "18 g",
      sensory: { overall: "okay" },
    },
    state.equipment,
    batch,
  );
  batch.shots.push(shot);
  shot.ai = {
    diagnosis: "Noch etwas dünn",
    change_parameter: "yield",
    next_settings: { yield: 34 },
  };
  shot.analysisSignature = analysisContext(coffee, batch, shot);
  shot.analyzedAt = 100;
  return { state, coffee, batch, shot };
}

test("Siebkorrektur wird gespeichert; historische Maschine und Mühle bleiben erhalten", () => {
  const { state, batch, shot } = fixture();
  const edited = shotFromDraft(
    { ...shot, basket: "20 g" },
    { ...state.equipment, machine: "Neue Maschine", grinder: "Neue Mühle" },
    batch,
    shot,
  );
  assert.equal(edited.equipment.basket, "20 g");
  assert.equal(edited.equipment.machine, "Maschine A");
  assert.equal(edited.equipment.grinder, "Mühle A");
  const historical = { ...shot, equipment: null };
  const unknown = shotFromDraft(
    { ...historical, basket: "20 g" },
    state.equipment,
    batch,
    historical,
  );
  assert.deepEqual(unknown.equipment, { basket: "20 g" });
  assert.equal(shot.equipment.basket, "18 g");
});
test("Bearbeitung erhält alte KI-Antwort als veraltet; auch Fehler beim erneuten Auswerten vernichten sie nicht", () => {
  const { state, coffee, batch, shot } = fixture();
  const recipe = snapshotRecipe(coffee, batch, shot);
  const edited = shotFromDraft(
    { ...shot, yield: "38" },
    state.equipment,
    batch,
    shot,
  );
  batch.shots[0] = edited;
  assert.deepEqual(edited.ai, shot.ai);
  assert.equal(edited.analyzedAt, 100);
  assert.equal(analysisIsCurrent(coffee, batch, edited), false);
  assert.equal(presetFor(coffee, batch, state.equipment).yield, "38");
  const context = analysisContext(coffee, batch, edited);
  const failed = applyAnalysisOutcome(
    state,
    coffee.id,
    batch.id,
    shot.id,
    context,
    { analysisStatus: "failed", analysisError: "offline" },
  );
  assert.deepEqual(failed.coffees[0].batches[0].shots[0].ai, shot.ai);
  assert.equal(recipe.settings.yield, 36);
  const complete = applyAnalysisOutcome(
    failed,
    coffee.id,
    batch.id,
    shot.id,
    context,
    {
      ai: { diagnosis: "Neu" },
      analysisSignature: context,
      analysisStatus: "complete",
    },
  );
  const latest = complete.coffees[0].batches[0].shots[0];
  assert.equal(latest.ai.diagnosis, "Neu");
  assert.equal(
    analysisIsCurrent(
      complete.coffees[0],
      complete.coffees[0].batches[0],
      latest,
    ),
    true,
  );
});
test("Unbekannter Messbeginn bleibt in Payload, Rezept, Bearbeitung und Vergleich unbekannt", () => {
  const { state, coffee, batch, shot } = fixture();
  delete shot.timeBasis;
  const old = { ...shot, id: "old", created: shot.created - 1 };
  batch.shots.unshift(old);
  const ref = snapshotRecipe(coffee, batch, shot);
  assert.equal(ref.settings.timeBasis, "unknown");
  const payload = analysisPayload(coffee, batch, shot, {
    ...ref,
    settings: { ...ref.settings, timeBasis: undefined },
  });
  for (const s of [
    payload.shot,
    ...payload.history,
    payload.reference.settings,
  ])
    assert.equal(s.timeBasis, "unknown");
  assert.doesNotThrow(() => validateAnalysisInput(payload));
  assert.equal(
    shotFromDraft(shot, state.equipment, batch, shot).timeBasis,
    "unknown",
  );
  assert.equal(presetFor(coffee, batch, state.equipment).timeBasis, "unknown");
  for (const other of [
    shot,
    { ...shot, timeBasis: "first-drop" },
    { ...shot, timeBasis: "pump" },
  ])
    assert.equal(
      comparison(shot, other).find((r) => r.key === "time").comparable,
      false,
    );
  const measured = { ...shot, timeBasis: "pump" };
  assert.equal(
    comparison(measured, measured).find((r) => r.key === "time").comparable,
    true,
  );
});
test("Mühlenwechsel oder unbekannte Mühle übernimmt weder alten Mahlgrad noch alten KI-Plan", () => {
  const { state, coffee, batch, shot } = fixture();
  assert.equal(presetFor(coffee, batch, state.equipment).yield, 34);
  assert.equal(presetFor(coffee, batch, state.equipment).grind, "2");
  for (const equipment of [
    { ...state.equipment, grinder: "Mühle B" },
    { ...state.equipment, grinder: "" },
  ]) {
    const preset = presetFor(coffee, batch, equipment);
    assert.equal(preset.grind, "");
    assert.equal(preset.yield, "36");
  }
  const otherMachine = presetFor(coffee, batch, {
    ...state.equipment,
    machine: "Maschine B",
  });
  assert.equal(otherMachine.yield, "36");
  assert.equal(
    presetFor(coffee, { ...batch, basket: "20 g" }, state.equipment).yield,
    "36",
  );
  shot.ai.change_parameter = "grind";
  shot.ai.next_settings = null;
  assert.equal(presetFor(coffee, batch, state.equipment).grind, "");
  assert.match(
    presetFor(coffee, batch, state.equipment)._grindHint,
    /tatsächlich/,
  );
  shot.ai.next_settings = { grind: "1.8" };
  assert.equal(presetFor(coffee, batch, state.equipment).grind, "1.8");
});
test("Identischer Kaffee ohne Röster wird vorgeschlagen; archivierte und andere Röster bleiben getrennt", () => {
  const coffee = { id: "c", name: "Caffè  Crema", roaster: "" };
  assert.equal(findCoffee([coffee], "", "CAFFE CREMA"), coffee);
  assert.equal(
    findCoffee([{ ...coffee, archivedAt: 1 }], "", coffee.name),
    null,
  );
  assert.equal(
    findCoffee([{ ...coffee, roaster: "Nord" }], "Süd", coffee.name),
    null,
  );
  assert.equal(findCoffee([coffee], "", ""), null);
});

async function archivedStore() {
  const { state, coffee, batch, shot } = fixture();
  batch.finalRecipe = snapshotRecipe(coffee, batch, shot);
  coffee.archivedAt = 100;
  state.coffees.push({
    id: "other",
    name: "Behalten",
    roaster: "",
    images: ["OTHER_PHOTO"],
    batches: [],
  });
  const storage = createStorage(new IDBFactory());
  await storage.replaceBackup(makeBackup(state), 0);
  await storage.replaceBackup(makeBackup(state), 1); // creates an internal recovery copy
  await storage.saveDraft(
    `shot:${coffee.id}:${batch.id}:new`,
    { note: "A" },
    "A",
  );
  await storage.saveDraft(
    `shot:${coffee.id}:${batch.id}:new`,
    { note: "B" },
    "B",
  );
  await storage.saveDraft(`edit-coffee:${coffee.id}:${batch.id}`, {
    images: ["DRAFT_PHOTO"],
  });
  await storage.saveDraft(`pack-coffee:${coffee.id}:new`, { name: "Nachkauf" });
  await storage.saveDraft(`rating:${coffee.id}`, { score: "8" });
  await storage.saveDraft("rating:other", { score: "9" });
  await storage.saveDraft("new-coffee:new:new", { name: "Unrelated draft" });
  return { storage, coffee, batch, shot };
}

test("Endgültiges Löschen entfernt genau Kaffee, Unterdaten, alle Tab-Entwürfe und lokale Wiederherstellung", async () => {
  const { storage, coffee, batch, shot } = await archivedStore();
  const externalBackup = await storage.exportBackup();
  const context = analysisContext(coffee, batch, shot);
  const summary = deletionSummary(coffee);
  assert.deepEqual(summary, {
    coffees: 1,
    batches: 1,
    shots: 1,
    recipes: 1,
    photos: 1,
  });
  const next = await storage.deleteCoffee(2, coffee);
  assert.equal(next.coffees.length, 1);
  assert.equal(next.coffees[0].id, "other");
  assert.equal(next.activeCoffeeId, null);
  assert.equal(next.activeBatchId, null);
  const exported = await storage.exportBackup();
  assert.deepEqual(Object.keys(exported.drafts).sort(), [
    "draft:new-coffee:new:new",
    "draft:rating:other",
  ]);
  assert.equal(
    (await storage.readRecovery()).state.coffees.some(
      (c) => c.id === coffee.id,
    ),
    false,
  );
  assert.equal(JSON.stringify(exported).includes("DRAFT_PHOTO"), false);
  for (const outcome of [
    { ai: { diagnosis: "late" } },
    { analysisStatus: "failed", analysisError: "late" },
  ])
    assert.equal(
      applyAnalysisOutcome(
        next,
        coffee.id,
        batch.id,
        shot.id,
        context,
        outcome,
      ),
      next,
    );
  await assert.rejects(
    storage.saveDraft(
      `shot:${coffee.id}:${batch.id}:new`,
      { note: "old window" },
      "B",
    ),
    /endgültig gelöscht/,
  );
  await storage.flushDrafts();
  assert.equal(Object.keys((await storage.exportBackup()).drafts).length, 2);
  // An explicit external-backup restore is the only intentional way back.
  await storage.replaceBackup(externalBackup, 3);
  await storage.saveDraft(`rating:${coffee.id}`, { score: "7" });
  assert.equal(
    (await storage.load()).coffees.some((c) => c.id === coffee.id),
    true,
  );
  await storage.close();
});
test("Löschen nach gleichzeitiger Änderung oder Wiederherstellung wird abgewiesen", async () => {
  const { storage, coffee } = await archivedStore();
  const before = await storage.exportBackup();
  await assert.rejects(storage.deleteCoffee(1, coffee), ConflictError);
  await assert.rejects(
    storage.deleteCoffee(2, { ...coffee, name: "veraltete Ansicht" }),
    /inzwischen geändert/,
  );
  assert.deepEqual((await storage.exportBackup()).state, before.state);
  await storage.commit(2, (s) => ({
    ...s,
    coffees: s.coffees.map((c) =>
      c.id === coffee.id ? { ...c, archivedAt: null } : c,
    ),
  }));
  await assert.rejects(storage.deleteCoffee(3, coffee), /Nur archivierte/);
  await storage.close();
});
test("Fehlgeschlagener Löschvorgang rollt auch Entwürfe, Löschmarker und lokale Sicherung zurück", async () => {
  const { storage, coffee, batch } = await archivedStore();
  const before = await storage.exportBackup(),
    recovery = await storage.readRecovery();
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (key === "state")
      throw new DOMException("simulated failure", "QuotaExceededError");
    return put.call(this, value, key);
  };
  try {
    await assert.rejects(storage.deleteCoffee(2, coffee), /simulated failure/);
  } finally {
    IDBObjectStore.prototype.put = put;
  }
  const after = await storage.exportBackup();
  assert.deepEqual(after.state, before.state);
  assert.deepEqual(after.drafts, before.drafts);
  assert.deepEqual(await storage.readRecovery(), recovery);
  assert.deepEqual(await storage.readMetadata("deleted-coffees"), []);
  await storage.saveDraft(`shot:${coffee.id}:${batch.id}:new`, {
    note: "still writable",
  });
  await storage.close();
});
test("Draft-Zuordnung löscht keine ähnlich benannten anderen Kaffees", () => {
  assert.equal(draftBelongsToCoffee("draft:shot:ab:b:new", "a"), false);
  assert.equal(draftBelongsToCoffee("draft:rating:ab", "a"), false);
  assert.equal(draftBelongsToCoffee("draft:rating:a:tab:1", "a"), true);
  assert.equal(draftBelongsToCoffee("draft:equipment", "a"), false);
});

test("Doppeltes endgültiges Löschen wird genau einmal durchgeführt", async () => {
  const { storage, coffee } = await archivedStore();
  const results = await Promise.allSettled([
    storage.deleteCoffee(2, coffee),
    storage.deleteCoffee(2, coffee),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(
    results.find((r) => r.status === "rejected").reason instanceof
      ConflictError,
  );
  assert.equal((await storage.load()).revision, 3);
  assert.equal((await storage.load()).coffees[0].id, "other");
  await storage.close();
});
test("Löschen bereinigt auch die vor 1.5 gespeicherte Migrationskopie", async () => {
  const factory = new IDBFactory(),
    storage = createStorage(factory);
  await storage.load();
  const db = await new Promise((resolve) => {
    const r = factory.open("espresso-lab-ai", 1);
    r.onsuccess = () => resolve(r.result);
  });
  const legacy = {
    coffees: [
      {
        id: "old",
        name: "Alt",
        roaster: "",
        archivedAt: 1,
        image: "OLD_PHOTO",
        shots: [{ id: "s", dose: 18, yield: 36, time: 30 }],
      },
    ],
    activeId: "old",
  };
  await new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(legacy, "state");
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
  const state = await storage.commit(0, (s) => s);
  assert.equal(
    (await storage.readMigrationBackup()).state.coffees[0].image,
    "OLD_PHOTO",
  );
  await storage.deleteCoffee(1, state.coffees[0]);
  const backup = (await storage.readMigrationBackup()).state;
  assert.equal(backup.coffees.length, 0);
  assert.equal(backup.activeId, null);
  assert.equal(JSON.stringify(backup).includes("OLD_PHOTO"), false);
  db.close();
  await storage.close();
});
