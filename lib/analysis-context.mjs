/** The signature uses the same bounded, measured context as the request. */
export function analysisContext(coffee, batch, shot) {
  const reference =
    [...(coffee.batches || [])].reverse().find((b) => b.finalRecipe)
      ?.finalRecipe || null;
  return JSON.stringify({
    shotRevision: shot.revision || 0,
    ...analysisPayload(coffee, batch, shot, reference),
  });
}
export const compactShot = (s) => ({
  id: s.id,
  dose: s.dose,
  yield: s.yield,
  time: typeof s.time === "number" && s.time > 0 ? s.time : null,
  timeBasis: s.timeBasis || "first-drop",
  grind: s.grind || "",
  pressure: s.pressure || "",
  note: s.note || "",
  sensory: s.sensory || {},
  equipment: s.equipment || null,
  created: s.created,
});

export function analysisPayload(coffee, batch, shot, reference = null) {
  return {
    coffee: {
      roaster: coffee.roaster,
      name: coffee.name,
      tasting: coffee.tasting || "",
      target: batch.target || coffee.target || "",
      origin: coffee.origin || "",
      roast: coffee.roast || "",
      variety: coffee.variety || "",
      process: coffee.process || "",
      roasterRecipe: coffee.roasterRecipe || "",
    },
    batch: {
      id: batch.id,
      roastDate: batch.roastDate || "",
      openedDate: batch.openedDate || "",
      basket: batch.basket || "",
    },
    equipment: shot.equipment || null,
    shot: compactShot(shot),
    history: batch.shots
      .filter(
        (s) =>
          !s.archivedAt &&
          s.dose > 0 &&
          s.yield > 0 &&
          s.id !== shot.id &&
          (s.created || 0) <= (shot.created || 0),
      )
      .slice(-6)
      .map(compactShot),
    reference: reference
      ? {
          settings: reference.settings,
          target: reference.target,
          sensory: reference.sensory,
          note: reference.note,
          equipment: reference.equipment,
        }
      : null,
  };
}
