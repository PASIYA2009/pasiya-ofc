// PASIYA AI - image generate / edit (Gemini image model)
// POST /api/ai-image { prompt, image?: "data:image/jpeg;base64,..." }  ->  { image: "data:...", text }
// Env: GEMINI_API_KEY, IMAGE_MODEL (default gemini-2.5-flash-image), AI_PASSCODE (optional)

export const config = { runtime: "edge" };

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const env = (typeof process !== "undefined" && process.env) || {};
  const origin = request.headers.get("Origin");
  if (origin) {
    try { if (new URL(origin).host !== new URL(request.url).host) return json({ error: "Forbidden" }, 403); }
    catch { return json({ error: "Forbidden" }, 403); }
  }
  if (env.AI_PASSCODE && request.headers.get("x-pasiya-code") !== env.AI_PASSCODE) return json({ error: "Access code needed" }, 401);
  if (!env.GEMINI_API_KEY) return json({ error: "Image generation needs GEMINI_API_KEY on the server." }, 503);

  let b;
  try { b = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const prompt = typeof b.prompt === "string" ? b.prompt.trim().slice(0, 4000) : "";
  if (!prompt) return json({ error: "Describe the image first" }, 400);

  const parts = [{ text: prompt }];
  if (typeof b.image === "string") {
    const m = b.image.match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return json({ error: "Unsupported image" }, 400);
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }

  const model = env.IMAGE_MODEL || "gemini-2.5-flash-image";
  let r, j;
  try {
    r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
    });
    j = await r.json();
  } catch {
    return json({ error: "Could not reach the image service." }, 502);
  }
  if (!r.ok) {
    const m = (j && j.error && j.error.message) || "";
    return json({ error: r.status === 429 ? "Too many requests right now. Try again in a minute." : "Image request failed: " + m.slice(0, 160) }, 502);
  }
  const out = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  let img = "", text = "";
  for (const p of out) {
    const d = p.inlineData || p.inline_data;
    if (d && d.data && !img) img = "data:" + (d.mimeType || d.mime_type || "image/png") + ";base64," + d.data;
    else if (p.text) text += p.text;
  }
  if (!img) return json({ error: text.trim().slice(0, 200) || "No image was returned. Try a different prompt." }, 422);
  return json({ image: img, text: text.trim() });
}
