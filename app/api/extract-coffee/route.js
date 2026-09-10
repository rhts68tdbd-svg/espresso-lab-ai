import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../../../lib/prompt";
import { KNOWLEDGE_BASE } from "../../../lib/knowledge";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    roaster: { type: "string" },
    coffee_name: { type: "string" },
    origin: { type: "string" },
    variety: { type: "string" },
    process: { type: "string" },
    roast_level: { type: "string" },
    roast_date: { type: "string" },
    tasting_notes: { type: "array", items: { type: "string" } },
    roaster_recipe: { type: "string" },
    target_profile: { type: "string" },
    uncertainty: { type: "string" }
  },
  required: ["roaster","coffee_name","origin","variety","process","roast_level","roast_date","tasting_notes","roaster_recipe","target_profile","uncertainty"]
};

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY fehlt in Vercel." }, { status: 500 });
    }
    const { image, description } = await req.json();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
    const content = [{
      type: "input_text",
      text: `KNOWLEDGE BASE:\n${KNOWLEDGE_BASE}\n\nAUFGABE:\nExtrahiere nur sicher erkennbare Angaben zur Kaffeepackung. Leere/unklare Felder als leere Strings zurückgeben. Tasting Notes nicht erfinden. Leite aus sicher erkennbaren Tasting Notes und Röstgrad ein kurzes sensorisches Zielprofil ab. Nutzerbeschreibung: ${description || ""}`
    }];
    if (image) content.push({ type: "input_image", image_url: image, detail: "high" });

    const response = await client.responses.create({
      model,
      instructions: SYSTEM_PROMPT,
      input: [{ role: "user", content }],
      reasoning: { effort: "medium" },
      text: { format: { type: "json_schema", name: "coffee_extraction", schema, strict: true } }
    });
    return Response.json(JSON.parse(response.output_text));
  } catch (e) {
    console.error(e);
    return Response.json({ error: e?.message || "Fotoanalyse fehlgeschlagen." }, { status: 500 });
  }
}
