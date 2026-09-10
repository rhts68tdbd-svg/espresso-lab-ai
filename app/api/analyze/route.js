import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../../../lib/prompt";
import { getKnowledgeBase } from "../../../lib/knowledge";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    diagnosis: { type: "string" },
    next_change: { type: "string" },
    keep_constant: { type: "string" },
    tasting_focus: { type: "string" },
    rationale: { type: "string" },
    trend_summary: { type: "string" },
    confidence: { type: "string", enum: ["hoch","mittel","niedrig"] },
    channeling_suspected: { type: "boolean" },
    ready_to_finalize: { type: "boolean" },
    recommend_confirmation_shot: { type: "boolean" }
  },
  required: [
    "diagnosis","next_change","keep_constant","tasting_focus","rationale",
    "trend_summary","confidence","channeling_suspected","ready_to_finalize",
    "recommend_confirmation_shot"
  ]
};

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY fehlt in Vercel." }, { status: 500 });
    }

    const body = await req.json();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
    const knowledge = getKnowledgeBase();

    const input = `
KNOWLEDGE BASE:
${knowledge}

EQUIPMENT:
${JSON.stringify(body.equipment || {}, null, 2)}

KAFFEE:
${JSON.stringify(body.coffee || {}, null, 2)}

CHARGE:
${JSON.stringify(body.batch || {}, null, 2)}

BISHERIGE SHOTS:
${JSON.stringify(body.history || [], null, 2)}

AKTUELLER SHOT:
${JSON.stringify(body.shot || {}, null, 2)}

AUFGABE:
Bewerte den aktuellen Shot relativ zu Rösterprofil, Zielprofil, Equipment und Verlauf.
Gib genau eine bevorzugte nächste Veränderung an.
Wenn nichts geändert werden sollte, sage klar "Nichts ändern".
Brühtemperatur/PID darf nicht als Änderung empfohlen werden.
Wenn der aktuelle Shot bereits sehr gut ist, entscheide, ob ein unveränderter Bestätigungs-Shot zur Reproduzierbarkeit sinnvoll ist.
`;

    const response = await client.responses.create({
      model,
      instructions: SYSTEM_PROMPT,
      input,
      reasoning: { effort: "medium" },
      text: {
        format: {
          type: "json_schema",
          name: "espresso_dial_in",
          schema,
          strict: true
        }
      }
    });

    return Response.json(JSON.parse(response.output_text));
  } catch (e) {
    console.error(e);
    return Response.json({ error: e?.message || "Analyse fehlgeschlagen." }, { status: 500 });
  }
}
