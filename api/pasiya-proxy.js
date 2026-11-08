// PASIYA OFC - Vercel Edge Function (portfolio + hidden project proxies)
// yourdomain.com             -> portfolio  (public/index.html)
// yourdomain.com/api         -> PASIYA API
// yourdomain.com/pastpapers  -> Past Papers
// yourdomain.com/bot         -> WhatsApp Bot
// yourdomain.com/qr          -> QR Editor (own page: public/qr, not proxied)
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
    autoTheme: true, // site eke colours automatically portfolio theme ekata maru karanawa
    theme: true, // project eka kharab wenawa nam false karanna
  },
  bot: {
    prefix: "/bot",
    origin: "https://pasiya-md-mini-production.up.railway.app",
    title: "WhatsApp Bot",
    autoTheme: true,
    theme: true,
  },
};

const FALLBACK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff"/><stop offset="1" stop-color="#4db8ff"/></linearGradient></defs><path d="M32 4.5 55.5 18v28L32 59.5 8.5 46V18z" fill="#061218" stroke="url(#g)" stroke-width="4.5" stroke-linejoin="round"/><path d="M26.5 44.5v-25h8.5a7.6 7.6 0 0 1 0 15.2h-8.5" fill="none" stroke="url(#g)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
  if (hit && url.searchParams.has("__debug")) return debugInfo(request, hit);
  if (hit) return proxy(request, url, search, hit.name, hit.path, true);

  // 2) favicon.ico: project eke icon eka thiyenawa nam eka, nathnam portfolio eke "P" icon eka
  if (p === "/favicon.ico" || p === ICON) {
    const n = appFromReferer(request, url) || appFromCookie(request);
    if (n && APPS[n].keepIcon) {
      const r = await proxy(request, url, search, n, "/favicon.ico", false);
      if (r.status < 400) return r;
    }
    return new Response(FALLBACK_ICON, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
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
  if (/text\/html/i.test(type)) {
    out.delete("Content-Security-Policy");
    out.delete("Content-Security-Policy-Report-Only");
  }
  // static files (js/css/img/font) CDN eke cache karanawa -> ilaga parak wegayen. (prefix path walata withrai)
  if (
    entry && request.method === "GET" && res.status === 200 && !cookies.length &&
    /\.(js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf)$/i.test(path) &&
    !/no-store|private/i.test(out.get("Cache-Control") || "")
  ) {
    out.set("Cache-Control", "public, max-age=120, s-maxage=3600, stale-while-revalidate=86400");
  }
  if (request.method === "HEAD" || [204, 304].includes(res.status) || !isText(type)) {
    return new Response(res.body, { status: res.status, headers: out });
  }

  let body = await res.text();
  body = swap(body, ORIGIN, inUrl.origin).split(ORIGIN_HOST).join(inUrl.host);
  if (/text\/html/i.test(type)) body = inject(body, app.theme, app.home, app.title, app.keepIcon, app.autoTheme);
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
function inject(html, theme, home, title, keepIcon, autoTheme) {
  if (!keepIcon) html = html.replace(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi, "");
  const css =
    (keepIcon ? "" : '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">') +
    '<link rel="stylesheet" href="/_pasiya/pill.css"><link rel="stylesheet" href="/_pasiya/loader.css">' +
    (theme ? '<link rel="stylesheet" href="/_pasiya/theme.css">' : "") +
    (home ? homeGuard(home) : "") +
    (autoTheme ? '<script defer src="/_pasiya/autotheme.js"></script>' : "");
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
    '<div class="ps-loader ps-auto" id="ps-loader"><div class="ps-orb"><i></i><i></i><i></i><b>P</b></div>' +
    '<div class="ps-brand">PASIYA OFC</div><div class="ps-sub">Opening ' + (title || "page") + '</div>' +
    '<div class="ps-bar"><span></span></div></div>' +
    "<script>(function(){var l=document.getElementById('ps-loader'),t=Date.now(),d=0;" +
    "function h(){if(d||!l)return;d=1;var e=l,w=Math.max(0,350-(Date.now()-t));" +
    "setTimeout(function(){e.classList.add('ps-hide');setTimeout(function(){e.remove()},700)},w)}" +
    "if(document.readyState==='complete')h();else addEventListener('load',h);setTimeout(h,4000)})();</script>"
  );
}

// /qr?__debug  ->  origin site eka Vercel eken baladdi mokakda wenne kiyala text widiyata penawa
async function debugInfo(request, hit) {
  const app = APPS[hit.name];
  const target = app.origin + hit.path;
  const lines = ["target: " + target];
  try {
    const r = await fetch(target, { headers: { "User-Agent": request.headers.get("User-Agent") || "" }, redirect: "manual" });
    const body = await r.text();
    lines.push("status: " + r.status);
    for (const k of ["content-type", "content-length", "content-encoding", "location", "server", "cf-ray", "content-security-policy", "x-frame-options"]) {
      if (r.headers.get(k)) lines.push(k + ": " + r.headers.get(k).slice(0, 200));
    }
    lines.push("body length: " + body.length, "", body.slice(0, 700));
  } catch (e) {
    lines.push("fetch error: " + (e && e.message));
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
