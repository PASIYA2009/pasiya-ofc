// PASIYA OFC - Vercel Edge Function (portfolio + hidden project proxies)
// yourdomain.com             -> portfolio  (public/index.html)
// yourdomain.com/api         -> PASIYA API
// yourdomain.com/pastpapers  -> Past Papers
// yourdomain.com/bot         -> WhatsApp Bot
// yourdomain.com/qr          -> QR Editor
//
// Aluth project ekak danna one nam APPS walata line ekak add karanna.
// (vercel.json eke rewrite eka hamathissema meka wetama enawa, aluth deyak oni na)

export const config = { runtime: "edge" };

const APPS = {
  api: {
    prefix: "/api",
    origin: "https://pasiya-api-server-2.eshandinujaya86.workers.dev",
    keepPath: true, // origin eke thiyena /api/... endpoints same widiyata yanawa
    theme: true, // portfolio theme eka inject karanawa
  },
  pastpapers: {
    prefix: "/pastpapers",
    origin: "https://pastpaper-pro.eshandinujaya86.workers.dev",
  },
  bot: {
    prefix: "/bot",
    origin: "https://pasiya-md-mini-production.up.railway.app",
  },
  qr: {
    prefix: "/qr",
    origin: "https://qr-code-editor.lumi.ing",
  },
};

const PHOTO_URL = "https://files.catbox.moe/8w0kfb.png";
const ICON = "/_pasiya/photo.png";
const COOKIE = "ps_app";
const isText = (t) =>
  /(text\/|javascript|json|xml|svg)/i.test(t) && !/event-stream/i.test(t);

export default async function handler(request) {
  const url = new URL(request.url);
  // vercel.json rewrite eken real path eka __p kiyala enawa
  const p = url.searchParams.get("__p") || url.pathname;
  url.searchParams.delete("__p");
  const search = url.search;

  // /api/ -> /api
  for (const a of Object.values(APPS)) {
    if (p === a.prefix + "/") {
      const to = new URL(request.url);
      to.pathname = a.prefix;
      to.search = search;
      return Response.redirect(to.toString(), 301);
    }
  }

  // 1) /project-name (entry point)
  const hit = matchPrefix(p);
  if (hit) return proxy(request, url, search, hit.name, hit.path, true);

  // 2) photo / favicon
  if (p === ICON || p === "/favicon.ico") {
    const img = await fetch(PHOTO_URL);
    return new Response(img.body, {
      status: img.status,
      headers: {
        "Content-Type": img.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // 3) project ekak athule wena requests (/login, /static/app.js ...)
  const name = appFromReferer(request, url) || appFromCookie(request);
  if (name) return proxy(request, url, search, name, p, false);

  return new Response("Not found", { status: 404 });
}

function matchPrefix(p) {
  for (const [name, a] of Object.entries(APPS)) {
    if (p === a.prefix) return { name, path: "/" };
    if (p.startsWith(a.prefix + "/"))
      return { name, path: a.keepPath ? p : p.slice(a.prefix.length) };
  }
  return null;
}
function appFromReferer(request, url) {
  try {
    const r = new URL(request.headers.get("Referer") || "");
    if (r.host !== url.host) return null;
    return matchPrefix(r.pathname)?.name || null;
  } catch {
    return null;
  }
}
function appFromCookie(request) {
  const m = (request.headers.get("Cookie") || "").match(
    new RegExp(COOKIE + "=([a-z0-9_-]+)")
  );
  return m && APPS[m[1]] ? m[1] : null;
}

async function proxy(request, inUrl, search, name, path, entry) {
  const app = APPS[name];
  const ORIGIN = app.origin;
  const ORIGIN_HOST = new URL(ORIGIN).host;
  const target = ORIGIN + path + search;

  const h = new Headers(request.headers);
  h.delete("host");
  for (const k of [...h.keys()]) if (k.startsWith("x-vercel-")) h.delete(k);
  h.set("X-Forwarded-Host", inUrl.host);
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  if (ip) h.set("X-Forwarded-For", ip);
  if (h.has("Origin")) h.set("Origin", ORIGIN);
  if (h.has("Referer"))
    h.set("Referer", h.get("Referer").split(inUrl.origin).join(ORIGIN));

  if (h.has("Cookie")) {
    const c = h
      .get("Cookie")
      .replace(new RegExp(COOKIE + "=[^;]*;?\\s*"), "")
      .trim();
    c ? h.set("Cookie", c) : h.delete("Cookie");
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  let res;
  try {
    res = await fetch(target, {
      method: request.method,
      headers: h,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    });
  } catch (e) {
    return new Response("Bad gateway: " + ORIGIN_HOST + " ekata connect wenna bari una", { status: 502 });
  }

  const out = new Headers(res.headers);
  out.delete("Content-Encoding");
  out.delete("Content-Length");
  out.delete("Transfer-Encoding");

  const loc = out.get("Location");
  if (loc) out.set("Location", loc.split(ORIGIN).join(inUrl.origin));

  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  out.delete("Set-Cookie");
  for (const c of cookies) out.append("Set-Cookie", c.replace(/;\s*Domain=[^;]*/gi, ""));
  if (entry)
    out.append("Set-Cookie", `${COOKIE}=${name}; Path=/; Max-Age=86400; SameSite=Lax; Secure`);

  if (out.get("Access-Control-Allow-Origin") === ORIGIN)
    out.set("Access-Control-Allow-Origin", inUrl.origin);

  const type = out.get("Content-Type") || "";
  if (request.method === "HEAD" || [204, 304].includes(res.status) || !isText(type)) {
    return new Response(res.body, { status: res.status, headers: out });
  }

  let body = await res.text();
  body = body.split(ORIGIN).join(inUrl.origin).split(ORIGIN_HOST).join(inUrl.host);
  if (/text\/html/i.test(type)) body = inject(body, app.theme);
  out.delete("ETag");
  return new Response(body, { status: res.status, headers: out });
}

// back button (hama project ekakatama) + theme (theme:true walata withrai)
function inject(html, theme) {
  html = html.replace(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi, "");
  const css =
    `<link rel="icon" type="image/png" href="${ICON}"><link rel="apple-touch-icon" href="${ICON}">` +
    '<link rel="stylesheet" href="/_pasiya/pill.css">' +
    (theme ? '<link rel="stylesheet" href="/_pasiya/theme.css">' : "");
  const bar =
    '<a class="ps-home" href="/" aria-label="Back to portfolio"><span>←</span> Pasidu Eshan</a>';
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => css + "</head>") : css + html;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => bar + "</body>") : html + bar;
  return html;
}
