// PASIYA AI - video generation (Gemini Veo). Async: start -> poll -> download
// POST /api/ai-video { prompt, image?, aspect? }      -> { op }
// GET  /api/ai-video?op=models/.../operations/xxx      -> { done, error? }
// GET  /api/ai-video?op=...&download=1                 -> video/mp4
// Env: GEMINI_API_KEY, VIDEO_MODEL (default veo-3.0-generate-001), AI_PASSCODE (optional)
// Veo ekata Google eke paid/billing plan ekak oni wenna puluwan.

export const config = { runtime: "edge" };

const BASE = "https://generativelanguage.googleapis.com/v1beta/";
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export default async function handler(request) {
  const env = (typeof process !== "undefined" && process.env) || {};
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin) {
    try { if (new URL(origin).host !== url.host) return json({ error: "Forbidden" }, 403); }
    catch { return json({ error: "Forbidden" }, 403); }
  }
  if (env.AI_PASSCODE && request.headers.get("x-pasiya-code") !== env.AI_PASSCODE) return json({ error: "Access code needed" }, 401);
  if (!env.GEMINI_API_KEY) return json({ error: "Video generation needs GEMINI_API_KEY on the server." }, 503);
  const key = env.GEMINI_API_KEY;

  if (request.method === "POST") {
    let b;
    try { b = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
    const prompt = typeof b.prompt === "string" ? b.prompt.trim().slice(0, 2000) : "";
    if (!prompt) return json({ error: "Describe the video first" }, 400);
    const inst = { prompt };
    if (typeof b.image === "string") {
      const m = b.image.match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return json({ error: "Unsupported image" }, 400);
      inst.image = { bytesBase64Encoded: m[2], mimeType: m[1] };
    }
    const model = env.VIDEO_MODEL || "veo-3.0-generate-001";
    try {
      const r = await fetch(BASE + "models/" + encodeURIComponent(model) + ":predictLongRunning", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ instances: [inst], parameters: { aspectRatio: b.aspect === "9:16" ? "9:16" : "16:9" } }),
      });
      const j = await r.json();
      if (!r.ok || !j.name) {
        const m = (j && j.error && j.error.message) || "";
        return json({ error: r.status === 429 ? "Too many requests right now. Try again later." : "Video request failed: " + m.slice(0, 180) }, 502);
      }
      return json({ op: j.name });
    } catch {
      return json({ error: "Could not reach the video service." }, 502);
    }
  }

  if (request.method === "GET") {
    const op = url.searchParams.get("op") || "";
    if (!/^models\/[\w.-]+\/operations\/[\w-]+$/.test(op)) return json({ error: "Bad operation" }, 400);
    let j;
    try {
      const r = await fetch(BASE + op, { headers: { "x-goog-api-key": key } });
      j = await r.json();
      if (!r.ok) return json({ error: "Could not check the video status." }, 502);
    } catch {
      return json({ error: "Could not reach the video service." }, 502);
    }
    if (!j.done) return json({ done: false });
    if (j.error) return json({ done: true, error: String(j.error.message || "Video failed").slice(0, 200) });
    const samples = (j.response && j.response.generateVideoResponse && j.response.generateVideoResponse.generatedSamples) || [];
    const uri = samples[0] && samples[0].video && samples[0].video.uri;
    if (!uri) {
      const why = j.response && j.response.generateVideoResponse && j.response.generateVideoResponse.raiMediaFilteredReasons;
      return json({ done: true, error: (why && why[0]) || "No video was returned. Try a different prompt." });
    }
    if (url.searchParams.get("download") !== "1") return json({ done: true });
    if (!uri.startsWith(BASE)) return json({ error: "Unexpected video location" }, 502);
    const v = await fetch(uri, { headers: { "x-goog-api-key": key } });
    if (!v.ok) return json({ error: "Could not download the video." }, 502);
    return new Response(v.body, { headers: { "Content-Type": "video/mp4", "Cache-Control": "no-store" } });
  }
  return json({ error: "Method not allowed" }, 405);
}
