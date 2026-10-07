export { analysisContext, analysisPayload } from "./analysis-context.mjs";
export async function requestJson(
  url,
  payload,
  { signal, timeout = 55000 } = {},
) {
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(
        "Der KI-Dienst hat keine lesbare Antwort geliefert. Bitte später erneut versuchen.",
      );
    }
    if (!res.ok)
      throw new Error(
        data.error || "KI ist gerade nicht verfügbar. Bitte erneut versuchen.",
      );
    return data;
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error(
        "Die KI-Anfrage wurde unterbrochen oder hat zu lange gedauert. Dein gespeicherter Shot bleibt erhalten.",
      );
    if (e instanceof TypeError)
      throw new Error(
        "Keine Verbindung zur KI. Bitte Netzverbindung prüfen und erneut versuchen.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
