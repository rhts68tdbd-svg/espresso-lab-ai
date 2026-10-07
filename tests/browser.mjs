import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const port = Number(process.env.ESPRESSO_TEST_PORT || 3102),
  base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--port",
    String(port),
    "--hostname",
    "127.0.0.1",
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, OPENAI_API_KEY: "" },
  },
);
let browser;
const passed = [],
  errors = [];
await mkdir("test-results", { recursive: true });
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (d.toString().includes("Ready")) resolve();
  });
  server.stderr.on("data", (d) => {
    if (d.toString().includes("EADDRINUSE"))
      reject(new Error("Test port occupied"));
  });
  server.on("exit", (code) => {
    if (code) reject(new Error("Test server failed: " + code));
  });
});
const state = (page) =>
  page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open("espresso-lab-ai", 1);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const value = await new Promise((res, rej) => {
      const tx = db.transaction("kv", "readonly"),
        r = tx.objectStore("kv").get("state");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    db.close();
    return value;
  });
async function poll(fn, predicate, limit = 10000) {
  const start = Date.now();
  while (Date.now() - start < limit) {
    const value = await fn();
    if (predicate(value)) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Condition not reached");
}
const check = (name) => {
  passed.push(name);
  console.log("PASS", name);
};
const visible = async (page, role, name) => {
  await page.getByRole(role, { name, exact: true }).waitFor();
};
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const ai = {
  diagnosis: "Die leichte Trockenheit passt noch nicht zum süßen Ziel.",
  next_change: "Yield auf 33 g reduzieren",
  keep_constant: "Dosis 17,5 g und Mahlgrad unverändert",
  tasting_focus: "Runderer Nachgeschmack",
  rationale: "Test-Hypothese",
  trend_summary: "Erster relevanter Versuch",
  confidence: "mittel",
  channeling_suspected: false,
  ready_to_finalize: false,
  recommend_confirmation_shot: false,
  change_parameter: "yield",
  next_settings: { dose: null, yield: 33, grind: null },
};
try {
  await ready;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.ESPRESSO_TEST_CHROMIUM
      ? {
          executablePath: process.env.ESPRESSO_TEST_CHROMIUM,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        }
      : {}),
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      acceptDownloads: true,
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await visible(page, "heading", "Einstellen");
  assert.equal(
    await page.getByRole("navigation").getByRole("button").count(),
    2,
  );
  check("Two primary areas; empty state is actionable");
  await page
    .getByRole("button", { name: "Neuen Kaffee einstellen", exact: true })
    .click();
  await page
    .getByLabel("Kaffeename", { exact: true })
    .fill(
      "QA Schokoladenmischung mit sehr langem vollständigem Namen ohne Abkürzung",
    );
  await page
    .getByLabel("Röster (optional)", { exact: true })
    .fill("QA Rösterei");
  await page
    .getByLabel("Dein Geschmacksziel", { exact: true })
    .fill("Schokoladig, süß und rund; ohne trockenen Nachgeschmack");
  await page
    .getByRole("button", {
      name: "Speichern und ersten Versuch vorbereiten",
      exact: true,
    })
    .click();
  await visible(page, "heading", "Versuch erfassen");
  assert.equal(
    await page.getByLabel("Dosis · g", { exact: true }).inputValue(),
    "17.5",
  );
  assert.equal(
    await page.getByLabel("Yield · g", { exact: true }).inputValue(),
    "35",
  );
  assert.equal(
    await page.getByLabel("Zeit · s (optional)", { exact: true }).inputValue(),
    "",
  );
  check("Manual coffee goes directly to baseline; no invented time");
  await page.getByLabel("Zeit · s (optional)", { exact: true }).fill("31");
  await page.getByLabel("Mahlgrad", { exact: true }).fill("2,0");
  await page
    .getByLabel("Dein Geschmackseindruck", { exact: true })
    .fill("Süßer Anfang, hinten noch trocken");
  await page.reload();
  await visible(page, "heading", "Versuch erfassen");
  assert.equal(
    await page
      .getByLabel("Dein Geschmackseindruck", { exact: true })
      .inputValue(),
    "Süßer Anfang, hinten noch trocken",
  );
  assert.equal(
    await page.getByLabel("Zeit · s (optional)", { exact: true }).inputValue(),
    "31",
  );
  check("Draft survives reload with same measurements and taste");
  let analyzedId = null,
    requests = 0;
  await page.route("**/api/analyze", async (route) => {
    requests++;
    const payload = route.request().postDataJSON(),
      saved = await state(page);
    assert.equal(saved.coffees[0].batches[0].shots.length, 1);
    analyzedId = payload.shot.id;
    assert.equal(saved.coffees[0].batches[0].shots[0].id, analyzedId);
    await route.fulfill({
      status: requests === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        requests === 1
          ? { error: "Testausfall: Shot bleibt lokal gespeichert." }
          : ai,
      ),
    });
  });
  await page
    .getByRole("button", { name: "Shot auswerten", exact: true })
    .click();
  await visible(page, "heading", "Dein Versuch");
  await page
    .getByText("Testausfall: Shot bleibt lokal gespeichert.", { exact: true })
    .waitFor();
  assert.equal((await state(page)).coffees[0].batches[0].shots.length, 1);
  check("Shot is committed before API; failure loses nothing");
  await page
    .getByRole("button", { name: "KI-Auswertung starten", exact: true })
    .click();
  await visible(page, "heading", "Yield auf 33 g reduzieren");
  const first = (await state(page)).coffees[0].batches[0];
  assert.equal(first.shots.length, 1);
  assert.equal(first.shots[0].id, analyzedId);
  check("Retry updates same shot without duplicate");
  await page
    .getByRole("button", { name: "Nächsten Versuch vorbereiten", exact: true })
    .click();
  await visible(page, "heading", "Versuch erfassen");
  assert.equal(
    await page.getByLabel("Yield · g", { exact: true }).inputValue(),
    "33",
  );
  assert.equal(
    await page.getByLabel("Zeit · s (optional)", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page
      .getByLabel("Dein Geschmackseindruck", { exact: true })
      .inputValue(),
    "",
  );
  check("Next proposal carries one change; taste and measured time reset");
  await page
    .getByLabel("Dein Geschmackseindruck", { exact: true })
    .fill("Schokoladig, süß, rund. Mein Ziel ist erreicht.");
  await page
    .getByRole("button", { name: "Nur speichern", exact: true })
    .click();
  await visible(page, "heading", "Dein Versuch");
  await page
    .getByRole("button", { name: "Als mein Rezept bestätigen", exact: true })
    .click();
  await visible(page, "dialog", "Als dein Rezept bestätigen?");
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Rezept bestätigen", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Rezept bestätigen", exact: true })
    .click();
  await visible(page, "heading", "Dein Kaffee");
  const final = (await state(page)).coffees[0].batches[0].finalRecipe;
  assert.equal(final.settings.yield, 33);
  check("Explicit user confirmation creates independent final recipe");
  await page.getByRole("button", { name: "Versuch 2", exact: false }).click();
  await page
    .getByText("Bearbeiten und weitere Angaben", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Versuch bearbeiten", exact: true })
    .click();
  await page.getByLabel("Yield · g", { exact: true }).fill("40");
  await page
    .getByRole("button", { name: "Nur speichern", exact: true })
    .click();
  await visible(page, "heading", "Dein Versuch");
  assert.equal(
    (await state(page)).coffees[0].batches[0].finalRecipe.settings.yield,
    33,
  );
  check("Editing source shot does not alter confirmed recipe");
  await page.getByRole("button", { name: "Kaffees", exact: true }).click();
  await visible(page, "heading", "Kaffees");
  await page.getByRole("button", { name: /Als Favorit markieren/ }).click();
  await poll(
    () => state(page),
    (s) => s.coffees[0].favorite,
  );
  await page.getByRole("button", { name: "Favoriten", exact: true }).click();
  await page
    .getByLabel("Kaffees durchsuchen", { exact: true })
    .fill("schokoladen");
  assert.equal(await page.locator(".coffee-row").count(), 1);
  check("Search and favorites work together in single collection");
  await page
    .getByRole("button", { name: "Kaffee hinzufügen", exact: true })
    .click();
  await page
    .getByLabel("Kaffeename", { exact: true })
    .fill(
      "QA Schokoladenmischung mit sehr langem vollständigem Namen ohne Abkürzung",
    );
  await page
    .getByLabel("Röster (optional)", { exact: true })
    .fill("QA Rösterei");
  await page
    .getByLabel("Dein Geschmacksziel", { exact: true })
    .fill("Schokoladig und süß");
  await page
    .getByRole("button", { name: "Neue Packung dieses Kaffees", exact: true })
    .click();
  await visible(page, "heading", "Versuch erfassen");
  const repeat = await state(page);
  assert.equal(repeat.coffees.length, 1);
  assert.equal(repeat.coffees[0].batches.length, 2);
  assert.equal(repeat.coffees[0].batches[1].shots.length, 0);
  assert.equal(
    await page.getByLabel("Yield · g", { exact: true }).inputValue(),
    "33",
  );
  check("Duplicate action adds pack to known coffee and reuses recipe");
  await page.getByRole("button", { name: "Kaffees", exact: true }).click();
  await page.locator(".coffee-open").click();
  await page
    .getByLabel("Packung", { exact: true })
    .selectOption(repeat.coffees[0].batches[0].id);
  await page
    .getByRole("heading", { name: "Dein Rezept", exact: true })
    .waitFor();
  assert.equal(await page.locator(".shot-row").count(), 2);
  check("Historical pack, recipe and shots are reachable");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await overflow(page));
    await page.screenshot({
      path: `test-results/coffee-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert.ok(await overflow(page));
  await page.screenshot({
    path: "test-results/coffee-large-text.png",
    fullPage: true,
  });
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  check("Long coffee name, 320/390px and 200-percent text do not overflow");
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  await visible(page, "heading", "Einstellungen");
  const before = await state(page);
  await page
    .getByLabel("Backupdatei auswählen", { exact: true })
    .setInputFiles({
      name: "wrong.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"unrelated":true}'),
    });
  await page
    .getByText(
      "Gespeicherte Daten sind nicht lesbar. Der Bestand wurde nicht verändert.",
      { exact: true },
    )
    .waitFor();
  assert.deepEqual(await state(page), before);
  check("Foreign JSON import does not change existing state");
  const download = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Backup exportieren", exact: true })
      .click(),
  ]);
  const path = await download[0].path(),
    backup = JSON.parse(await readFile(path, "utf8"));
  assert.equal(backup.format, "espresso-lab-backup");
  assert.deepEqual(backup.state.coffees, (await state(page)).coffees);
  check("Actual downloaded backup contains complete collection and recipes");
  const fresh = await browser.newContext({
      viewport: { width: 320, height: 740 },
      acceptDownloads: true,
    }),
    p2 = await fresh.newPage();
  p2.on("pageerror", (e) => errors.push(e.message));
  await p2.goto(base);
  await p2.getByRole("button", { name: "Einstellungen", exact: true }).click();
  await p2
    .getByLabel("Backupdatei auswählen", { exact: true })
    .setInputFiles(path);
  await visible(p2, "dialog", "Backup übernehmen?");
  await p2
    .getByRole("button", { name: "Bestand sicher ersetzen", exact: true })
    .click();
  await poll(
    () => state(p2),
    (s) => s?.coffees.length === 1,
  );
  assert.deepEqual((await state(p2)).coffees, backup.state.coffees);
  check("Downloaded backup restores into genuinely empty browser context");
  await page.getByRole("button", { name: "Einstellen", exact: true }).click();
  await page
    .getByRole("button", { name: "Versuch erfassen", exact: true })
    .click();
  await page
    .getByLabel("Dein Geschmackseindruck", { exact: true })
    .fill("Offline-Entwurf bleibt erhalten");
  await poll(
    () =>
      page.evaluate(async () => {
        const r = indexedDB.open("espresso-lab-ai", 1);
        const db = await new Promise(
          (res) => (r.onsuccess = () => res(r.result)),
        );
        const q = db.transaction("kv", "readonly").objectStore("kv").getAll();
        const values = await new Promise(
          (res) => (q.onsuccess = () => res(q.result)),
        );
        db.close();
        return values;
      }),
    (values) =>
      values.some((v) => v?.note === "Offline-Entwurf bleibt erhalten"),
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await poll(
    () => page.evaluate(() => !!navigator.serviceWorker.controller),
    Boolean,
  );
  await context.setOffline(true);
  await page.reload();
  await visible(page, "heading", "Versuch erfassen");
  assert.equal(
    await page
      .getByLabel("Dein Geschmackseindruck", { exact: true })
      .inputValue(),
    "Offline-Entwurf bleibt erhalten",
  );
  await page
    .getByRole("button", { name: "Nur speichern", exact: true })
    .click();
  await visible(page, "heading", "Dein Versuch");
  assert.equal((await state(page)).coffees[0].batches[1].shots.length, 1);
  await context.setOffline(false);
  check(
    "Installed service-worker shell restarts offline; draft and local save work",
  );
  for (const [path, body, status] of [
    ["analyze", {}, 400],
    ["research-equipment", { kind: "machine", query: {} }, 400],
    ["extract-coffee", { images: [123], description: "" }, 400],
    ["analyze", { large: "x".repeat(90000) }, 413],
  ]) {
    const response = await page.request.post(base + "/api/" + path, {
      data: body,
    });
    assert.equal(response.status(), status);
  }
  check("Server rejects invalid and oversized requests before provider call");
  await p2.getByRole("button", { name: "Einstellen", exact: true }).click();
  await p2
    .getByRole("button", { name: "Versuch erfassen", exact: true })
    .click();
  await p2
    .getByLabel("Dein Geschmackseindruck", { exact: true })
    .fill("Speicherfehler darf diesen Entwurf nicht verlieren");
  const beforeAbort = await state(p2);
  await p2.evaluate(() => {
    window.espressoOriginalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "state")
        throw new DOMException(
          "Synthetischer Speicherfehler",
          "QuotaExceededError",
        );
      return window.espressoOriginalPut.call(this, value, key);
    };
  });
  await p2.getByRole("button", { name: "Nur speichern", exact: true }).click();
  await p2.getByText("Synthetischer Speicherfehler", { exact: true }).waitFor();
  assert.deepEqual(await state(p2), beforeAbort);
  assert.equal(
    await p2
      .getByLabel("Dein Geschmackseindruck", { exact: true })
      .inputValue(),
    "Speicherfehler darf diesen Entwurf nicht verlieren",
  );
  await p2.evaluate(() => {
    IDBObjectStore.prototype.put = window.espressoOriginalPut;
    delete window.espressoOriginalPut;
  });
  await p2.getByRole("button", { name: "Nur speichern", exact: true }).click();
  await visible(p2, "heading", "Dein Versuch");
  check("Real browser write failure retains form and data; retry commits once");
  await page.getByRole("button", { name: "Kaffees", exact: true }).click();
  await page.locator(".coffee-open").click();
  await page.getByText("Kaffee- und Packungsdetails", { exact: true }).click();
  await page
    .getByRole("button", { name: "Angaben bearbeiten", exact: true })
    .click();
  await page
    .getByLabel("Dein Geschmacksziel", { exact: true })
    .fill("Entwurf aus Fenster A");
  const q = await context.newPage();
  q.on("pageerror", (e) => errors.push(e.message));
  await q.goto(page.url());
  await q
    .getByLabel("Dein Geschmacksziel", { exact: true })
    .fill("Bestätigtes Ziel aus Fenster B");
  await q
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await visible(q, "heading", "Dein Kaffee");
  await page
    .getByRole("button", {
      name: "Entwurf mit diesem Stand abgleichen",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await page
    .getByText(
      "Diese Angaben wurden inzwischen in einem anderen Fenster geändert. Dein Entwurf bleibt erhalten. Bitte gespeicherte Werte und Entwurf bewusst abgleichen.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    (await state(page)).coffees[0].batches[1].target,
    "Bestätigtes Ziel aus Fenster B",
  );
  await page
    .getByRole("button", {
      name: "Entwurf mit diesem Stand abgleichen",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await visible(page, "heading", "Dein Kaffee");
  assert.equal(
    (await state(page)).coffees[0].batches[1].target,
    "Entwurf aus Fenster A",
  );
  await q.close();
  check("Two real windows cannot silently overwrite a long-lived editor");
  await page.unroute("**/api/analyze");
  let held = null;
  await page.route("**/api/analyze", (route) => {
    held = route;
  });
  await page
    .getByRole("button", { name: "Versuch erfassen", exact: true })
    .click();
  await page
    .getByLabel("Dein Geschmackseindruck", { exact: true })
    .fill("Geschmack vor verzögerter Auswertung");
  await page
    .getByRole("button", { name: "Shot auswerten", exact: true })
    .click();
  await visible(page, "heading", "Dein Versuch");
  await poll(() => Promise.resolve(held), Boolean);
  await page
    .getByText("Bearbeiten und weitere Angaben", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Versuch bearbeiten", exact: true })
    .click();
  await page
    .getByLabel("Dein Geschmackseindruck", { exact: true })
    .fill("Neuer Eindruck nach eigener Korrektur");
  await page
    .getByRole("button", { name: "Nur speichern", exact: true })
    .click();
  await visible(page, "heading", "Dein Versuch");
  await held.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(ai),
  });
  await page
    .getByText("Shot lokal gespeichert. KI wertet Geschmack und Ziel aus …", {
      exact: true,
    })
    .waitFor({ state: "hidden" });
  const delayedShot = (await state(page)).coffees[0].batches[1].shots.at(-1);
  assert.equal(delayedShot.note, "Neuer Eindruck nach eigener Korrektur");
  assert.equal(delayedShot.ai, null);
  check("Late AI response cannot overwrite edited taste or measurement");
  const optimizer = await page.request.get(
    base + "/_next/image?url=%2Ficon-192.png&w=256&q=75",
  );
  assert.equal(optimizer.status(), 404);
  check("Unused server image optimization endpoint is disabled");
  assert.deepEqual(errors, []);
  check("No browser runtime exceptions in full workflow");
  console.log(
    JSON.stringify({ passed: passed.length, checks: passed }, null, 2),
  );
  await context.close();
  await fresh.close();
} catch (e) {
  console.error("FAIL", e.stack);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
