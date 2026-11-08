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
    title: "PASIYA API",
    theme: true, // portfolio theme eka inject karanawa
    home: "/api", // project eka athule "/" kiyala yanawa nam, eka meka wenuwata /api ekata yawanawa
  },
  pastpapers: {
    prefix: "/pastpapers",
    origin: "https://pastpaper-pro.eshandinujaya86.workers.dev",
    title: "Past Papers",
    theme: true, // project eka kharab wenawa nam false karanna
  },
  bot: {
    prefix: "/bot",
    origin: "https://pasiya-md-mini-production.up.railway.app",
    title: "WhatsApp Bot",
    theme: true,
  },
  qr: {
    prefix: "/qr",
    origin: "https://qr-code-editor.lumi.ing",
    title: "QR Editor",
    theme: true,
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
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch (e) {
    return new Response("Bad gateway (" + ORIGIN_HOST + "): " + (e && e.message), { status: 502 });
  }

  const out = new Headers(res.headers);
  out.delete("Content-Encoding");
  out.delete("Content-Length");
  out.delete("Transfer-Encoding");

  const loc = out.get("Location");
  if (loc) {
    let l = swap(loc, ORIGIN, inUrl.origin);
    if (app.home) {
      // login/register passe origin eka "/" ekata redirect karanawa -> portfolio ekata nowa project ekatama
      if (l === "/") l = app.home;
      else if (l.startsWith("/?")) l = app.home + l.slice(1);
      else if (l === inUrl.origin + "/") l = inUrl.origin + app.home;
      else if (l.startsWith(inUrl.origin + "/?")) l = inUrl.origin + app.home + l.slice(inUrl.origin.length + 1);
    }
    out.set("Location", l);
  }

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
  body = swap(body, ORIGIN, inUrl.origin).split(ORIGIN_HOST).join(inUrl.host);
  if (/text\/html/i.test(type)) body = inject(body, app.theme, app.home, app.title);
  out.delete("ETag");
  return new Response(body, { status: res.status, headers: out });
}

// origin url eka (plain + url-encoded, oauth redirect_uri wage ewa walata) wenas karanawa
function swap(str, from, to) {
  return str
    .split(from).join(to)
    .split(encodeURIComponent(from)).join(encodeURIComponent(to));
}

// back button (hama project ekakatama) + theme (theme:true walata withrai)
function inject(html, theme, home, title) {
  html = html.replace(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi, "");
  const css =
    `<link rel="icon" type="image/png" href="${ICON}"><link rel="apple-touch-icon" href="${ICON}">` +
    '<link rel="stylesheet" href="/_pasiya/pill.css"><link rel="stylesheet" href="/_pasiya/loader.css">' +
    (theme ? '<link rel="stylesheet" href="/_pasiya/theme.css">' : "") +
    (home ? homeGuard(home) : "");
  const bar =
    '<a class="ps-home" href="/" aria-label="Back to portfolio"><span>←</span> Pasidu Eshan</a>';
  const loader = loaderHtml(title);
  html = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + loader) : html;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => css + "</head>") : css + html;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => bar + "</body>") : html + bar;
  return html;
}

// project eke JS eken location.href="/" kalama portfolio ekata yanna nathuwa project ekatama yawanna
// (back pill eka click karanawa nam withrai portfolio ekata yanne)
function homeGuard(home) {
  return (
    "<script>(function(){var H=" + JSON.stringify(home) + ",pill=false;" +
    'document.addEventListener("click",function(e){if(e.target.closest&&e.target.closest(".ps-home"))pill=true},true);' +
    "if(!window.navigation)return;" +
    'navigation.addEventListener("navigate",function(e){' +
    "if(!e.cancelable||e.hashChange||e.downloadRequest!==null||pill)return;" +
    "var u=new URL(e.destination.url);" +
    'if(u.origin===location.origin&&u.pathname==="/"){e.preventDefault();location.replace(H+u.search)}' +
    "})})();</script>"
  );
}

// loading animation (project eka load wela iwara wenakan penawa)
function loaderHtml(title) {
  return (
    '<div class="ps-loader" id="ps-loader"><div class="ps-orb"><i></i><i></i><i></i><b>P</b></div>' +
    '<div class="ps-brand">PASIYA OFC</div><div class="ps-sub">Opening ' + (title || "page") + '</div>' +
    '<div class="ps-bar"><span></span></div></div>' +
    "<script>(function(){var l=document.getElementById('ps-loader'),t=Date.now();" +
    "function h(){if(!l)return;var w=Math.max(0,650-(Date.now()-t));setTimeout(function(){l.classList.add('ps-hide');setTimeout(function(){l.remove()},700)},w);l=null}" +
    "if(document.readyState==='complete')h();else addEventListener('load',h);setTimeout(h,9000)})();</script>"
  );
}
