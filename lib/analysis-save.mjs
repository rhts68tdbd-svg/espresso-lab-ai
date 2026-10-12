import { analysisContext } from "./analysis-context.mjs";
import { changeBatch } from "./domain.mjs";

/** Apply only to the still-present, unchanged shot; late replies never recreate data. */
export function applyAnalysisOutcome(state, cid, bid, sid, context, outcome) {
  const coffee = state.coffees.find((c) => c.id === cid);
  const batch = coffee?.batches.find((b) => b.id === bid);
  const target = batch?.shots.find((s) => s.id === sid);
  if (!coffee || coffee.archivedAt || !target || target.archivedAt)
    return state;
  if (analysisContext(coffee, batch, target) !== context) {
    if (outcome.ai)
      throw new Error(
        "Die Eingaben wurden während der Auswertung geändert. Bitte den aktuellen Versuch erneut auswerten.",
      );
    return state;
  }
  return changeBatch(state, cid, bid, (b) => ({
    ...b,
    shots: b.shots.map((s) => (s.id === sid ? { ...s, ...outcome } : s)),
  }));
}
