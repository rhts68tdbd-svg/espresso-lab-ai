import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import {
  coffeeFingerprint,
  equipmentFingerprint,
  ratingFingerprint,
  ensureUnchanged,
} from "../lib/edit-contract.mjs";
import { createStorage, ConflictError } from "../lib/storage.mjs";
import {
  emptyState,
  normalizeState,
  createCoffeeOrBatch,
  makeBackup,
  parseBackup,
  decimal,
  shotFromDraft,
  snapshotRecipe,
  changeBatch,
  ageDays,
  presetFor,
} from "../lib/domain.mjs";

const fixture = () => ({
  coffees: [
    {
      id: "coffee-a",
      roaster: "Röster",
      name: "Schokolade",
      rating: { score: 8.2 },
      unknown: "retained",
      images: ["data:image/jpeg;base64,TEST"],
      batches: [
        {
          id: "pack-a",
          basket: "18 g",
          shots: [
            {
              id: "shot-a",
              dose: 17.5,
              yield: 35,
              time: 31,
              grind: "0,8",
              note: "Schokoladig, rund",
              sensory: { overall: "sehr gut" },
            },
          ],
          finalId: "shot-a",
        },
      ],
    },
  ],
  activeCoffeeId: "coffee-a",
  activeBatchId: "pack-a",
  equipment: { defaultDose: 17.5 },
  unrecognized: { keep: true },
});
async function seed(factory, value) {
  const store = createStorage(factory);
  const db = await new Promise((res, rej) => {
    const r = factory.open("espresso-lab-ai", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, "state");
    tx.oncomplete = res;
    tx.onabort = () => rej(tx.error);
  });
  db.close();
  return store;
}

test("Laden migriert nur im Speicher und erhält unbekannte Felder sowie fehlendes Profil", async () => {
  const original = fixture(),
    storage = await seed(new IDBFactory(), original),
    state = await storage.load();
  assert.deepEqual(await storage.readRaw(), original);
  assert.equal(await storage.readMigrationBackup(), undefined);
  assert.equal(state.coffees[0].unknown, "retained");
  assert.deepEqual(state.unrecognized, { keep: true });
  assert.equal(state.coffees[0].rating.profile, undefined);
  await storage.commit(state.revision, (s) => ({
    ...s,
    activeCoffeeId: "coffee-a",
  }));
  assert.deepEqual((await storage.readMigrationBackup()).state, original);
  await storage.close();
});
test("Fehlerhafte bestehende Daten werden niemals als leerer Bestand behandelt", async () => {
  const raw = { important: "do not overwrite" },
    storage = await seed(new IDBFactory(), raw);
  await assert.rejects(storage.load());
  await assert.rejects(storage.commit(0, (s) => s));
  assert.deepEqual(await storage.readRaw(), raw);
  await storage.close();
});
test("Ungültiger Import, doppelte IDs und kaputte Referenzen verändern nichts", async () => {
  const storage = await seed(new IDBFactory(), fixture()),
    before = await storage.readRaw();
  for (const bad of [
    {},
    [],
    { format: "espresso-lab-backup", formatVersion: 99 },
    { ...fixture(), coffees: [fixture().coffees[0], fixture().coffees[0]] },
    {
      ...fixture(),
      coffees: [
        {
          ...fixture().coffees[0],
          batches: [{ id: "pack-a", shots: [], finalId: "missing" }],
        },
      ],
    },
  ])
    await assert.rejects(storage.replaceBackup(bad, 0));
  assert.deepEqual(await storage.readRaw(), before);
  await storage.close();
});
test("Zwei Fenster: zweiter veralteter Commit wird atomar abgewiesen", async () => {
  const factory = new IDBFactory(),
    a = createStorage(factory),
    b = createStorage(factory);
  const changes = await Promise.allSettled([
    a.commit(0, (s) => ({ ...s, marker: "A" })),
    b.commit(0, (s) => ({ ...s, marker: "B" })),
  ]);
  assert.equal(changes.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(
    changes.find((r) => r.status === "rejected").reason instanceof
      ConflictError,
  );
  const current = await b.load();
  assert.equal(current.revision, 1);
  assert.equal(current.marker, "A");
  await a.close();
  await b.close();
});
test("Speicher-Quota/Abort rollt Bestand und Migrationssicherung gemeinsam zurück", async () => {
  const original = fixture(),
    storage = await seed(new IDBFactory(), original),
    put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (v, k) {
    if (k === "state") throw new DOMException("full", "QuotaExceededError");
    return put.call(this, v, k);
  };
  try {
    await assert.rejects(
      storage.commit(0, (s) => ({ ...s, marker: "failed" })),
    );
  } finally {
    IDBObjectStore.prototype.put = put;
  }
  assert.deepEqual(await storage.readRaw(), original);
  assert.equal(await storage.readMigrationBackup(), undefined);
  await storage.close();
});
test("Export/Import erhält Fotos, unabhängiges Rezept, Packungen und Entwürfe", async () => {
  const a = await seed(new IDBFactory(), fixture());
  await a.saveDraft("new-coffee", { name: "Angefangen", images: ["PHOTO"] });
  const backup = JSON.parse(JSON.stringify(await a.exportBackup()));
  const b = createStorage(new IDBFactory());
  await b.replaceBackup(backup, 0);
  const out = await b.exportBackup();
  assert.deepEqual(out.state.coffees, backup.state.coffees);
  assert.deepEqual(out.drafts, backup.drafts);
  assert.deepEqual(out.state.unrecognized, { keep: true });
  await a.close();
  await b.close();
});
test("Import sichert alten Bestand; Wiederherstellung bewahrt den ersetzten Zustand", async () => {
  const storage = await seed(new IDBFactory(), fixture());
  await storage.replaceBackup(makeBackup(emptyState()), 0);
  assert.equal((await storage.load()).coffees.length, 0);
  const recovery = await storage.readRecovery();
  assert.deepEqual(recovery.state, fixture());
  await storage.replaceBackup(recovery.state, 1);
  assert.equal((await storage.load()).coffees.length, 1);
  await storage.close();
});
test("Wiederkauf erzeugt neue Packung unter vorhandener Identität; alte Shots bleiben getrennt", () => {
  const state = normalizeState(fixture()),
    next = createCoffeeOrBatch(
      state,
      {
        name: "Schokolade",
        roaster: "Röster",
        target: "Rund",
        images: ["NEWPHOTO"],
      },
      "coffee-a",
    );
  assert.equal(next.coffees.length, 1);
  assert.equal(next.coffees[0].batches.length, 2);
  assert.equal(next.coffees[0].batches[0].shots.length, 1);
  assert.equal(next.coffees[0].batches[1].shots.length, 0);
  assert.equal(next.coffees[0].batches[1].basket, "18 g");
  const preset = presetFor(
    next.coffees[0],
    next.coffees[0].batches[1],
    next.equipment,
  );
  assert.equal(preset.grind, "0,8");
  assert.equal(preset.time, "");
  assert.deepEqual(preset.sensory, {});
});
test("Finalrezept verändert sich nicht bei Source-Edit; unbekanntes historisches Equipment bleibt unbekannt", () => {
  const state = normalizeState(fixture()),
    before = structuredClone(state.coffees[0].batches[0].finalRecipe);
  const next = changeBatch(state, "coffee-a", "pack-a", (b) => ({
    ...b,
    shots: b.shots.map((s) => ({ ...s, yield: 50, grind: "2" })),
  }));
  assert.deepEqual(next.coffees[0].batches[0].finalRecipe, before);
  assert.equal(before.equipment, null);
});
test("Legacy-Kaffee aktiv: Packungsbeziehung wird passend zu diesem Kaffee ergänzt", () => {
  const state = normalizeState({
    coffees: [
      { id: "a", name: "A", shots: [] },
      { id: "b", name: "B", shots: [] },
    ],
    activeId: "b",
  });
  assert.equal(state.activeCoffeeId, "b");
  assert.equal(state.activeBatchId, "legacy-batch-b");
});
test("Messungen sind streng; fehlende Zeit und tatsächlicher Geschmack werden nicht erfunden", () => {
  assert.equal(decimal("17,5"), 17.5);
  for (const bad of ["", 0, "17,", "-4", "1e3", "NaN", "12abc", "1.2.3"])
    assert.throws(() => decimal(bad));
  const s = shotFromDraft(
    { dose: "17,5", yield: "35", time: "", grind: "2" },
    emptyState().equipment,
    { basket: "18 g" },
  );
  assert.equal(s.time, null);
  assert.deepEqual(s.sensory, {});
});
test("Packungsalter unterscheidet valide Daten von fehlenden/ungültigen Angaben", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  assert.equal(ageDays("01.10.2026", now), 6);
  assert.equal(ageDays("2026-02-30", now), null);
  assert.equal(ageDays("2027-01-01", now), null);
});

test("Zwei Editorfenster behalten eigene Entwürfe; Speichern eines Fensters löscht den anderen nicht", async () => {
  const a = createStorage(new IDBFactory());
  await a.saveDraft("shot:a:b:new", { note: "Fenster A" }, "A");
  await a.saveDraft("shot:a:b:new", { note: "Fenster B" }, "B");
  assert.equal((await a.readDraft("shot:a:b:new", "A")).note, "Fenster A");
  await a.removeDraft("shot:a:b:new", "A");
  assert.equal((await a.readDraft("shot:a:b:new", "B")).note, "Fenster B");
  const backup = await a.exportBackup(),
    restored = createStorage(new IDBFactory());
  await restored.replaceBackup(backup, 0);
  assert.equal(
    (await restored.readDraft("shot:a:b:new", "NEW")).note,
    "Fenster B",
  );
  await a.close();
  await restored.close();
});
test("Export wartet auf bereits begonnene Entwurfsschreibvorgänge", async () => {
  const storage = createStorage(new IDBFactory()),
    pending = storage.saveDraft("new-coffee", { name: "Noch offen" });
  const backup = await storage.exportBackup();
  await pending;
  assert.equal(backup.drafts["draft:new-coffee"].name, "Noch offen");
  await storage.close();
});
test("Formularverträge schützen lange Entwürfe vor stillen konkurrierenden Änderungen", () => {
  const c = normalizeState(fixture()).coffees[0],
    b = c.batches[0];
  const fingerprint = coffeeFingerprint(c, b);
  assert.doesNotThrow(() =>
    ensureUnchanged(
      fingerprint,
      coffeeFingerprint(c, { ...b, shots: [...b.shots, { id: "unrelated" }] }),
    ),
  );
  assert.throws(() =>
    ensureUnchanged(
      fingerprint,
      coffeeFingerprint({ ...c, target: "Changed" }, b),
    ),
  );
  const eq = emptyState().equipment;
  assert.throws(() =>
    ensureUnchanged(
      equipmentFingerprint(eq, "system"),
      equipmentFingerprint({ ...eq, grinder: "Other" }, "system"),
    ),
  );
  assert.throws(() =>
    ensureUnchanged(
      ratingFingerprint(c),
      ratingFingerprint({ ...c, favorite: true }),
    ),
  );
});
test("Formal gültiges JSON mit falschen Equipment-, Rating- oder Referenztypen wird vor Import abgewiesen", () => {
  const good = normalizeState(fixture());
  for (const bad of [
    { ...good, equipment: { ...good.equipment, baskets: "invalid" } },
    { ...good, activeBatchId: "missing" },
    { ...good, coffees: [{ ...good.coffees[0], rating: { tags: "invalid" } }] },
  ])
    assert.throws(() =>
      parseBackup(
        makeBackup(good).format ? { ...makeBackup(good), state: bad } : bad,
      ),
    );
});
