/** Unknown historical context must never become a guessed measurement. */
export const knownTimeBasis = (value) =>
  ["first-drop", "pump"].includes(value) ? value : "unknown";
export const timeBasisLabel = (value) =>
  ({ "first-drop": "ab erstem Tropfen", pump: "ab Pumpenstart" })[value] ||
  "Messbeginn unbekannt";
const name = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("de-DE");
export const sameGrinder = (before, after) =>
  !!name(before?.grinder) && name(before.grinder) === name(after?.grinder);
export const sameSetup = (before, after, basket) =>
  sameGrinder(before, after) &&
  !!name(before?.machine) &&
  name(before.machine) === name(after?.machine) &&
  !!name(before?.basket) &&
  name(before.basket) === name(basket);
