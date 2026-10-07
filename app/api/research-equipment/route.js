import {
  readJson,
  aiClient,
  aiModel,
  apiError,
  InputError,
} from "../../../lib/server-api";
export const maxDuration = 60;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    manufacturer: { type: "string" },
    model: { type: "string" },
    equipment_type: { type: "string" },
    adjustment_type: { type: "string" },
    finer_direction: { type: "string" },
    burrs: { type: "string" },
    brew_group: { type: "string" },
    pump: { type: "string" },
    boiler_system: { type: "string" },
    verified_summary: { type: "string" },
    relevant_notes: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
  },
  required: [
    "manufacturer",
    "model",
    "equipment_type",
    "adjustment_type",
    "finer_direction",
    "burrs",
    "brew_group",
    "pump",
    "boiler_system",
    "verified_summary",
    "relevant_notes",
    "confidence",
  ],
};

function collectSources(response) {
  const out = [];
  for (const item of response.output || []) {
    if (item?.type === "web_search_call") {
      for (const s of item?.action?.sources || []) {
        if (/^https?:\/\//.test(s?.url || ""))
          out.push({ title: s.title || s.url, url: s.url });
      }
    }
  }
  const seen = new Set();
  return out.filter((s) => !seen.has(s.url) && seen.add(s.url)).slice(0, 8);
}

export async function POST(req) {
  try {
    const { kind, query } = await readJson(req, 5000);
    if (
      !["machine", "grinder"].includes(kind) ||
      typeof query !== "string" ||
      !query.trim() ||
      query.length > 300
    ) {
      return Response.json(
        { error: "Equipment-Typ und Modellbezeichnung werden benötigt." },
        { status: 400 },
      );
    }

    const client = aiClient();
    const model = aiModel();

    const task =
      kind === "grinder"
        ? `Recherchiere die Espressomühle "${query}". Bevorzuge Hersteller-/Primärquellen. Verifiziere insbesondere Hersteller, exaktes Modell, Mahlwerk/Burrs, stufenlos oder gestuft, Art der Mahlgradverstellung und – nur wenn zuverlässig belegt – welche Drehrichtung bzw. Skalenrichtung feiner bedeutet. Erfinde keine Details. Nicht verifizierbare Felder leer lassen.`
        : `Recherchiere die Espressomaschine "${query}". Bevorzuge Hersteller-/Primärquellen. Verifiziere insbesondere Hersteller, exaktes Modell, Maschinentyp, Brühgruppe, Pumpentyp und Kessel-/Boilersystem. Erfinde keine Details. Nicht verifizierbare Felder leer lassen.`;

    const response = await client.responses.create(
      {
        model,
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        instructions:
          "Du recherchierst Espresso-Equipment sachlich. Primärquellen bevorzugen. Unsichere Angaben nicht als Fakten ausgeben. WICHTIG: Alle Felder des strukturierten JSON-Profils müssen reine kurze Sachwerte ohne URLs, Markdown-Links, Quellenklammern oder Zitationshinweise enthalten. Quellen werden separat über das Web-Search-Tool erfasst.",
        input: task,
        reasoning: { effort: "medium" },
        text: {
          format: {
            type: "json_schema",
            name: "equipment_profile",
            schema,
            strict: true,
          },
        },
      },
      { signal: req.signal },
    );

    return Response.json({
      profile: JSON.parse(response.output_text),
      sources: collectSources(response),
    });
  } catch (e) {
    return apiError(e);
  }
}
