// PASIYA OFC - QR Editor upload -> catbox.moe
// POST /api/qr-upload  (multipart: file)  ->  { url: "https://files.catbox.moe/xxxx.png" }
// Browser eken catbox ekata directly upload karanna bari nisa (CORS), meka passe catbox ekata yawanawa.

export const config = { runtime: "edge" };

const MAX_BYTES = 3.5 * 1024 * 1024; // Vercel request body limit (~4MB) ekata yatathin
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  // same-site requests withrai
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return json({ error: "Forbidden" }, 403);
    } catch {
      return json({ error: "Forbidden" }, 403);
    }
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid upload" }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "No file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "File is too big (max 3.5 MB)" }, 413);

  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("fileToUpload", file, file.name || "upload.bin");

  try {
    const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: fd });
    const text = (await r.text()).trim();
    if (r.ok && /^https:\/\/files\.catbox\.moe\/\S+$/.test(text)) return json({ url: text });
    return json({ error: text.slice(0, 200) || "catbox.moe rejected the upload" }, 502);
  } catch (e) {
    return json({ error: "Could not reach catbox.moe" }, 502);
  }
}
