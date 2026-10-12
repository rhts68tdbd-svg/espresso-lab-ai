import { DataError, counts } from "./domain.mjs";

export function deletionSummary(coffee) {
  return {
    ...counts({ coffees: [coffee] }),
    photos: new Set([
      ...(coffee.images || []),
      ...(coffee.image ? [coffee.image] : []),
      ...coffee.batches.flatMap((b) => b.images || []),
    ]).size,
  };
}
export function draftBelongsToCoffee(key, cid) {
  const full = key.startsWith("draft:") ? key : `draft:${key}`;
  return (
    ["shot", "edit-coffee", "pack-coffee", "new-coffee"].some((kind) =>
      full.startsWith(`draft:${kind}:${cid}:`),
    ) ||
    full === `draft:rating:${cid}` ||
    full.startsWith(`draft:rating:${cid}:tab:`)
  );
}
export function withoutCoffee(state, cid) {
  return {
    ...state,
    coffees: state.coffees.filter((c) => c.id !== cid),
    ...(state.activeCoffeeId === cid
      ? { activeCoffeeId: null, activeBatchId: null }
      : {}),
    ...(state.activeId === cid ? { activeId: null } : {}),
  };
}
export function checkDeletion(state, expectedCoffee) {
  const coffee = state.coffees.find((c) => c.id === expectedCoffee?.id);
  if (!coffee?.archivedAt)
    throw new DataError(
      "Nur archivierte Kaffees können endgültig gelöscht werden. Bitte das Archiv neu öffnen.",
    );
  if (JSON.stringify(coffee) !== JSON.stringify(expectedCoffee))
    throw new DataError(
      "Dieser Kaffee wurde inzwischen geändert. Bitte den Löschdialog schließen und die Angaben erneut prüfen.",
    );
  return coffee;
}
