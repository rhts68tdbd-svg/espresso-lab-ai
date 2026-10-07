import OpenAI from "openai";
import { DataError } from "./domain.mjs";
export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export async function readJson(req, maxBytes = 80000) {
  if (Number(req.headers.get("content-length")) > maxBytes)
    throw new InputError("Die Anfrage ist zu groß.", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new InputError("Anfragedaten fehlen.");
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new InputError("Die Anfrage ist zu groß.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InputError("Die Anfrage enthält kein lesbares JSON.");
  }
}
export function aiClient() {
  if (!process.env.OPENAI_API_KEY)
    throw new InputError(
      "KI ist hier noch nicht eingerichtet. Manuell weiterarbeiten oder später erneut versuchen.",
      503,
    );
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000,
    maxRetries: 0,
  });
}
// Preserve existing deployment configuration; do not guess a new model during redesign.
export const aiModel = () => process.env.OPENAI_MODEL || "gpt-5.6-terra";
export function apiError(e) {
  if (e instanceof InputError || e instanceof DataError)
    return Response.json({ error: e.message }, { status: e.status || 400 });
  const timeout =
    e?.name === "APIConnectionTimeoutError" || e?.name === "AbortError";
  // No raw provider response, API key, image or personal note is logged/returned.
  console.error("Espresso Lab AI request failed", {
    name: e?.name || "Error",
    status: e?.status || null,
  });
  return Response.json(
    {
      error: timeout
        ? "Die KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen."
        : e?.status === 429
          ? "KI ist gerade ausgelastet. Bitte später erneut versuchen."
          : "KI ist gerade nicht verfügbar oder nicht passend konfiguriert. Bitte später erneut versuchen.",
    },
    { status: timeout ? 504 : 503 },
  );
}
