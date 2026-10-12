/** Server rendering only, not a browser interaction test. */
import "./jsx-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyState } from "../lib/domain.mjs";
import { createStorage } from "../lib/storage.mjs";
import { deletionSummary } from "../lib/delete-contract.mjs";
const { default: AppDialog } = await import("../components/AppDialog.jsx");
const { default: Settings } = await import("../components/Settings.jsx");
const { Recipe, Analysis } = await import("../components/ui.jsx");
const noop = () => {};
const render = (Component, props) =>
  renderToStaticMarkup(React.createElement(Component, props));
const coffee = {
  id: "c",
  name: "Testkaffee",
  roaster: "Röster",
  archivedAt: 100,
  batches: [
    { id: "b", shots: [{ id: "s" }], images: ["photo"], finalRecipe: {} },
  ],
};
test("Löschdialog benennt Kaffee, Umfang, Unwiderruflichkeit und beide eindeutigen Aktionen", () => {
  const html = render(AppDialog, {
    modal: { type: "deleteCoffee", coffee, summary: deletionSummary(coffee) },
    onClose: noop,
    onConfirm: noop,
  });
  for (const text of [
    "Testkaffee",
    "Röster",
    "1 Packungen",
    "1 Versuche",
    "1 Rezepte",
    "1 Fotos",
    "Entwürfe",
    "Sicherungsständen",
    "Backup-Dateien",
    "Abbrechen",
    "Kaffee endgültig löschen",
  ])
    assert.ok(html.includes(text), text);
  assert.ok(!html.includes("Alle Daten bleiben erhalten"));
});
test("Archivieren bleibt reversibel und erhält eigene Beschriftung", () => {
  const html = render(AppDialog, {
    modal: { type: "archiveCoffee" },
    onClose: noop,
    onConfirm: noop,
  });
  assert.ok(html.includes("Alle Daten bleiben erhalten"));
  assert.ok(!html.includes("endgültig löschen"));
});
test("Archiv bietet Wiederherstellen und endgültiges Löschen; Versionsnummer kennzeichnet das KI-Update", () => {
  const html = render(Settings, {
    state: { ...emptyState(), coffees: [coffee] },
    storage: createStorage(),
    onDeleteCoffee: noop,
  });
  for (const text of [
    "Archivierte Kaffees",
    "In Sammlung zurückholen",
    "Endgültig löschen",
    "Espresso Lab 1.5.1",
  ])
    assert.ok(html.includes(text));
});
test("Alte Zeiten zeigen keinen erfundenen Messbeginn", () => {
  const html = render(Recipe, { recipe: { settings: { time: 30 } } });
  assert.ok(html.includes("Messbeginn unbekannt"));
  assert.ok(!html.includes("ab erstem Tropfen"));
});
test("Veraltete KI bleibt sichtbar, wird als frühere Auswertung bezeichnet und kann erneut angefragt werden", () => {
  const html = render(Analysis, {
    current: false,
    shot: {
      ai: { diagnosis: "ALT", next_change: "VORHER", rationale: "BEGRÜNDUNG" },
      analysisStatus: "failed",
      analysisError: "Verbindung fehlgeschlagen",
    },
    onRetry: noop,
  });
  for (const text of [
    "früheren Angaben",
    "Frühere Auswertung ansehen",
    "ALT",
    "BEGRÜNDUNG",
    "KI-Auswertung starten",
    "Verbindung fehlgeschlagen",
  ])
    assert.ok(html.includes(text));
});
