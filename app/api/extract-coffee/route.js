import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../../../lib/prompt";
import { getKnowledgeBase } from "../../../lib/knowledge";

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
    uncertain_fields: { type: "array", items: { type: "string" } },
    uncertainty_note: { type: "string" },
    cover_image_index: { type: "integer", minimum: 0, maximum: 3 }
  },
  required: [
    "roaster","coffee_name","origin","variety","process","roast_level",
    "roast_date","tasting_notes","roaster_recipe","target_profile",
    "uncertain_fields","uncertainty_note","cover_image_index"
  ]
};

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY fehlt in Vercel." }, { status: 500 });
    }

    const { images = [], description = "" } = await req.json();
    if (!images.length && !description) {
      return Response.json({ error: "Bitte mindestens ein Foto oder eine Beschreibung angeben." }, { status: 400 });
    }
    if (images.length > 4) {
      return Response.json({ error: "Maximal 4 Fotos pro Analyse." }, { status: 400 });
    }
    for (const image of images) {
      if (!/^data:image\/(jpeg|png);base64,/.test(image)) {
        return Response.json({ error: "Fotos müssen als JPEG oder PNG verarbeitet werden." }, { status: 400 });
      }
      if (image.length > 3_500_000) {
        return Response.json({ error: "Mindestens ein Foto ist trotz Komprimierung zu groß." }, { status: 413 });
      }
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
    const knowledge = getKnowledgeBase();

    const content = [{
      type: "input_text",
      text: `KNOWLEDGE BASE:\n${knowledge}\n\nAUFGABE:\nAnalysiere alle Bilder gemeinsam. Extrahiere nur sicher erkennbare Angaben zur Kaffeepackung. Unklare Felder leer lassen und zusätzlich in uncertain_fields nennen. Tasting Notes niemals erfinden. Leite nur aus sicher erkennbaren Tasting Notes und Röstgrad ein kurzes sensorisches Zielprofil ab. Wähle außerdem cover_image_index als Index des Fotos, das am ehesten die Vorderseite/Hauptverpackung zeigt und sich als Titelbild eignet. Nutzerbeschreibung: ${description}`
    }];
    for (const image of images) {
      content.push({ type: "input_image", image_url: image, detail: "high" });
    }

    const response = await client.responses.create({
      model,
      instructions: SYSTEM_PROMPT,
      input: [{ role: "user", content }],
      reasoning: { effort: "medium" },
      text: {
        format: {
          type: "json_schema",
          name: "coffee_extraction",
          schema,
          strict: true
        }
      }
    });

    return Response.json(JSON.parse(response.output_text));
  } catch (e) {
    console.error(e);
    return Response.json({ error: e?.message || "Fotoanalyse fehlgeschlagen." }, { status: 500 });
  }
}
