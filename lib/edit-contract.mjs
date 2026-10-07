// Fingerprints protect long-lived editors from silently overwriting another window.
const productKeys = [
  "name",
  "roaster",
  "tasting",
  "target",
  "origin",
  "roast",
  "variety",
  "process",
  "roasterRecipe",
  "coverImageIndex",
];
const packKeys = [
  "target",
  "roastDate",
  "openedDate",
  "label",
  "basket",
  "images",
];
const manualKeys = [
  "machine",
  "grinder",
  "baskets",
  "defaultDose",
  "defaultRatio",
];
const select = (value, keys) =>
  Object.fromEntries(keys.map((key) => [key, value?.[key] ?? null]));
export const coffeeFingerprint = (coffee, batch) =>
  JSON.stringify({
    coffee: select(coffee, productKeys),
    batch: select(batch, packKeys),
  });
export const equipmentFingerprint = (equipment, theme) =>
  JSON.stringify({
    equipment: select(equipment, manualKeys),
    theme: theme || "system",
  });
export const ratingFingerprint = (coffee) =>
  JSON.stringify({
    rating: coffee.rating ?? null,
    favorite: !!coffee.favorite,
    buyAgain: coffee.buyAgain ?? null,
  });
export function ensureUnchanged(expected, current) {
  if (expected != null && expected !== current)
    throw new Error(
      "Diese Angaben wurden inzwischen in einem anderen Fenster geändert. Dein Entwurf bleibt erhalten. Bitte gespeicherte Werte und Entwurf bewusst abgleichen.",
    );
}
export function ratedCoffee(coffee, data) {
  ensureUnchanged(data._baseFingerprint, ratingFingerprint(coffee));
  return {
    ...coffee,
    rating: {
      ...coffee.rating,
      score: data.score,
      tags: data.tags,
      updated: Date.now(),
    },
    favorite: data.favorite,
    buyAgain: data.buyAgain,
  };
}
