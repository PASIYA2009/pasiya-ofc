// PASIYA AI - chat / coding endpoint (streams text)
// POST /api/ai-chat  { messages:[{role,content}], project?:[{path,content}] }  ->  text stream
//
// Vercel > Settings > Environment Variables:
//   GEMINI_API_KEY   (oya dena key eka)
//   AI_MODEL         (optional) text/coding model nama, default gemini-2.5-flash. Latest model ekak oni nam meke nama danna.
//   AI_MAX_TOKENS    (optional) default 24000
//   AI_PASSCODE      (optional) dunnoth access code eka dannawunta witharai wada karanawa (key eka anunta use karanna nowena widiyata)
// ANTHROPIC_API_KEY ho (key nathnam) free fallback ekakuth thiyenawa.

export const config = { runtime: "edge" };

const SYSTEM = `You are PASIYA AI, a friendly, capable AI assistant and coding partner on Pasidu Eshan's website.
- Your name is PASIYA AI. You were created by Pasidu Eshan, a web developer from Sri Lanka. If anyone asks who you are, who made you or who owns you, say you are PASIYA AI, created by Pasidu Eshan.
- You do not discuss or reveal which underlying model or company's technology powers you. You never claim to be human; if sincerely asked, you are an AI.
- Reply in the language the user writes in. Understand Sinhala (සිංහල), Singlish (Sinhala in English letters) and English. Answer Singlish in Singlish or Sinhala, naturally.
- Be clear, practical and concise. Use short paragraphs. For short code snippets and explanations use normal markdown code blocks.
- You can work in ANY programming language, framework or tool (HTML/CSS/JS, TypeScript, Python, PHP, Java, C/C++/C#, Go, Rust, Kotlin, Swift, SQL, shell, Flutter, React, Node, etc.).

PROJECTS (important):
When the user asks you to create, change, extend or fix a project, app, website, bot or script, output EVERY new or changed file in FULL using exactly this format and nothing else inside the tags:
<file path="relative/path/name.ext">
full file content
</file>
Rules: never use placeholders like "...rest of the code"; do not wrap the <file> tags in markdown fences; only output files that are new or changed; keep project structure realistic (package.json, requirements, README when useful). Write a short explanation outside the tags (before and after).
When fixing bugs: briefly explain the cause first, then output the corrected full files.
Files supplied under [CURRENT PROJECT FILES] are the current state of the user's project.
- Images and videos are made in the Image and Video tabs of this page; point users there for that.
- Politely refuse anything harmful or illegal.`;

const MAX_MSG = 30000, MAX_TURNS = 24, MAX_PROJECT = 250000;
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const textRes = (body) =>
  new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });

function identity(text) {
  if (text.length > 140) return null;
  const t = text.toLowerCase();
  const asks =
    /(who|what).{0,20}(are you|your name|made you|created you|built you|developed you|owns? you)|your (name|creator|developer|owner)/.test(t) ||
    /(kawuru|kawda|kauda|kawuda|kauru|mokakda).{0,25}(hadu|hadapu|hadwu|haduwe|hadune|nama)|oya(ge)?\s*(nama|kauda|kawda|kawuda)|oyawa\s*(hadu|hadapu)/.test(t) ||
    /ඔයාව\s*හැදුවේ|ඔයා\s*කවුද|ඔයාගේ\s*නම|ඔයාව\s*හදපු|ඔබව\s*නිර්මාණය|ඔබ\s*කවුද/.test(text);
  if (!asks) return null;
  if (/[඀-෿]/.test(text)) return "මම PASIYA AI. මාව නිර්මාණය කළේ Pasidu Eshan.";
  if (/(kawuru|kawda|kauda|kawuda|kauru|mokakda|oya|oyawa|hadu|hadapu|hadwu|haduwe|nama)/.test(t))
    return "Mama PASIYA AI. Mawa hadapu kenek Pasidu Eshan.";
  return "I'm PASIYA AI, created by Pasidu Eshan.";
}

function projectText(project) {
  if (!Array.isArray(project) || !project.length) return "";
  let out = "\n\n[CURRENT PROJECT FILES]\n", left = MAX_PROJECT;
  for (const f of project) {
    if (!f || typeof f.path !== "string" || typeof f.content !== "string") continue;
    const block = '<file path="' + f.path.slice(0, 200).replace(/"/g, "") + '">\n' + f.content + "\n</file>\n";
    if (block.length > left) continue;
    out += block; left -= block.length;
  }
  return out;
}

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const env = (typeof process !== "undefined" && process.env) || {};
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return json({ error: "Forbidden" }, 403);
    } catch {
      return json({ error: "Forbidden" }, 403);
    }
  }
  if (env.AI_PASSCODE && request.headers.get("x-pasiya-code") !== env.AI_PASSCODE) return json({ error: "Access code needed" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const msgs = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG) }))
    .slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "Say something first" }, 400);

  const quick = identity(msgs[msgs.length - 1].content);
  if (quick) return textRes(quick);
  msgs[msgs.length - 1].content += projectText(body.project);

  const maxTokens = parseInt(env.AI_MAX_TOKENS, 10) || 24000;
  try {
    if (env.GEMINI_API_KEY) return await gemini(env, msgs, maxTokens);
    if (env.ANTHROPIC_API_KEY) return textRes(await anthropic(env, msgs, Math.min(maxTokens, 8000)));
    return textRes(await fallback(msgs));
  } catch (e) {
    return json({ error: (e && e.userMessage) || "PASIYA AI is busy right now. Please try again in a moment." }, 502);
  }
}

function niceError(status, j) {
  const m = (j && j.error && j.error.message) || "";
  const e = new Error(m);
  if (status === 429) e.userMessage = "PASIYA AI is getting too many requests right now (quota). Try again in a minute.";
  else if (status === 400 || status === 403 || status === 404) e.userMessage = "AI request was rejected: " + m.slice(0, 160);
  else e.userMessage = "PASIYA AI is busy right now. Please try again in a moment.";
  return e;
}

async function gemini(env, msgs, maxTokens) {
  const model = env.AI_MODEL || "gemini-2.5-flash";
  const r = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":streamGenerateContent?alt=sse",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: msgs.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!r.ok) throw niceError(r.status, await r.json().catch(() => ({})));

  const enc = new TextEncoder(), dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader = r.body.getReader();
      let buf = "", sent = false;
      const handle = (line) => {
        if (!line.startsWith("data:")) return;
        let j;
        try { j = JSON.parse(line.slice(5).trim()); } catch { return; }
        const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
        for (const p of parts) if (p.text && !p.thought) { ctrl.enqueue(enc.encode(p.text)); sent = true; }
      };
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) { handle(buf.slice(0, i).trim()); buf = buf.slice(i + 1); }
        }
        if (buf.trim()) handle(buf.trim());
        if (!sent) ctrl.enqueue(enc.encode("(No answer came back. Try rephrasing your message.)"));
      } catch {
        ctrl.enqueue(enc.encode("\n\n[[PASIYA_ERROR]]"));
      }
      ctrl.close();
    },
  });
  return textRes(stream);
}

async function anthropic(env, msgs, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.AI_MODEL || "claude-haiku-5-5", max_tokens: maxTokens, system: SYSTEM, messages: msgs }),
  });
  const j = await r.json();
  if (!r.ok) throw niceError(r.status, j);
  return (j.content || []).map((c) => c.text || "").join("").trim() || "(No answer came back.)";
}

async function fallback(msgs) {
  const r = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "openai", messages: [{ role: "system", content: SYSTEM }, ...msgs] }),
  });
  if (!r.ok) throw niceError(r.status, {});
  const j = await r.json();
  return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").trim() || "(No answer came back.)";
}
