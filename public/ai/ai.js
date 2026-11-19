/* PASIYA AI - chat + code projects + image + video */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "pasiya_ai_chat", PKEY = "pasiya_ai_project", CKEY = "pasiya_ai_code", CK = "pasiya_ai_convs_", SK = "pasiya_ai_side";
  var chat = $("chat"), input = $("input"), send = $("send"), welcome = $("welcome");
  var history = [], project = {}, busy = false;
  var uid = "", me = null, authKnown = false, CONVS = [], curId = "";
  var MAX_CTX = 240000;

  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* every request carries the optional access code; asks for it once if the server wants it */
  function api(url, opts) {
    opts = opts || {}; opts.headers = Object.assign({}, opts.headers);
    var c = lget(CKEY); if (c) opts.headers["x-pasiya-code"] = c;
    return fetch(url, opts).then(function (r) {
      if (r.status === 401 && !opts._retried) {
        var c2 = window.prompt("Enter the access code for PASIYA AI");
        if (c2) { lset(CKEY, c2); opts._retried = true; return api(url, opts); }
      }
      return r;
    });
  }
  function jsonOrThrow(r) {
    return r.json().catch(function () { throw new Error("The AI service is not available right now."); }).then(function (j) {
      if (!r.ok) throw new Error(j.error || "Something went wrong.");
      return j;
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function copyText(t, btn) {
    var ok = function () { var o = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = o; }, 1200); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () {}); 
  }
  function save(blob, name) {
    var a = el("a"), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  /* ---------- project files ---------- */
  function cleanPath(p) {
    p = String(p).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\s+$/, "");
    if (!p || p.length > 200 || p.split("/").some(function (s) { return s === ".." || s === ""; })) return "";
    return p;
  }
  function cleanContent(c) {
    var s = c.replace(/\r\n/g, "\n"), m = s.match(/^\s*```[\w+.-]*\n([\s\S]*?)\n```\s*$/);
    if (m) s = m[1];
    return s.replace(/\n$/, "");
  }
  function projectSave() {
    if (uid) { var c = convCur(); if (c) { c.project = project; convsSave(); } return; }
    try { var s = JSON.stringify(project); if (s.length < 3e6) lset(PKEY, s); } catch (e) {}
  }
  function projectList() {
    var out = [], left = MAX_CTX;
    Object.keys(project).forEach(function (p) { var n = project[p].length + p.length + 30; if (n <= left) { out.push({ path: p, content: project[p] }); left -= n; } });
    return out;
  }
  function projectUi() {} /* the project bar was removed; project state still lives in the background for context */

  /* assistant text -> segments (text / file) */
  function parse(text) {
    var segs = [], pos = 0, OPEN = '<file path="';
    while (pos < text.length) {
      var i = text.indexOf(OPEN, pos);
      if (i < 0) { segs.push({ t: "text", s: text.slice(pos) }); break; }
      if (i > pos) segs.push({ t: "text", s: text.slice(pos, i) });
      var q = text.indexOf('"', i + OPEN.length), gt = q < 0 ? -1 : text.indexOf(">", q);
      if (q < 0 || gt < 0) { segs.push({ t: "file", path: text.slice(i + OPEN.length).trim() || "...", content: "", done: false }); break; }
      var path = text.slice(i + OPEN.length, q).trim(), cs = gt + 1;
      if (text[cs] === "\r") cs++; if (text[cs] === "\n") cs++;
      var e = text.indexOf("</file>", cs);
      if (e < 0) { segs.push({ t: "file", path: path, content: text.slice(cs), done: false }); break; }
      segs.push({ t: "file", path: path, content: text.slice(cs, e), done: true });
      pos = e + 7;
    }
    return segs;
  }
  function applyFiles(segs) {
    var n = 0;
    segs.forEach(function (s) {
      if (s.t !== "file") return;
      var p = cleanPath(s.path); if (!p) return;
      project[p] = cleanContent(s.content); n++;
    });
    if (n) { projectSave(); projectUi(); }
    return n;
  }
  function plain(text) {
    return parse(text).map(function (s) { return s.t === "text" ? s.s : "[wrote file: " + s.path + "]"; }).join("").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------- rendering (DOM only, no innerHTML) ---------- */
  function inline(parent, text) {
    var re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var t = m[0], e = el(t[0] === "`" ? "code" : "strong", "", t[0] === "`" ? t.slice(1, -1) : t.slice(2, -2));
      parent.appendChild(e); last = m.index + t.length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function md(container, text) {
    text.split(/```/).forEach(function (part, i) {
      if (i % 2) {
        var code = part.replace(/^[^\n]*\n/, "") || part, pre = el("pre"), c = el("code", "", code.replace(/\n$/, "")), b = el("button", "copy", "Copy");
        b.type = "button"; b.onclick = function () { copyText(c.textContent, b); };
        pre.appendChild(c); pre.appendChild(b);
        var lang = (part.match(/^([^\n]*)\n/) || [])[1] || "";
        if (/^\s*html\s*$/i.test(lang) || /^\s*(<!doctype html|<html)/i.test(code)) {
          var pv = el("button", "copy prev", "Preview"); pv.type = "button";
          pv.onclick = function () { openPreview(c.textContent, "index.html", {}); };
          pre.appendChild(pv);
        }
        container.appendChild(pre);
      } else if (part.trim()) { var p = el("p"); inline(p, part.trim()); container.appendChild(p); }
    });
  }
  function renderAssistant(bubble, text) {
    bubble.textContent = "";
    var files = null, segs = parse(text), msgFiles = {};
    segs.forEach(function (s) { if (s.t === "file" && s.done) { var q = cleanPath(s.path); if (q) msgFiles[q] = cleanContent(s.content); } });
    segs.forEach(function (s) {
      if (s.t === "text") { md(bubble, s.s); return; }
      if (!files) { files = el("div", "files"); bubble.appendChild(files); }
      var p = cleanPath(s.path), lines = s.content ? s.content.split("\n").length : 0;
      var b = el("button", "chip-file" + (s.done ? "" : " live"), (s.done ? "\u2B07 " : "\uD83D\uDCC4 ") + s.path + (s.done ? " \u00B7 " + lines + " lines" : " \u00B7 writing..."));
      b.type = "button"; if (s.done) b.title = "Click to download";
      b.onclick = function () { if (s.done && p) save(new Blob([msgFiles[p]], { type: "text/plain;charset=utf-8" }), p.split("/").pop()); };
      files.appendChild(b);
      if (s.done && p && /\.html?$/i.test(p)) {
        var v = el("button", "chip-file prev", "\u25B6 Preview"); v.type = "button";
        v.onclick = function () { openPreview(msgFiles[p], p, msgFiles); };
        files.appendChild(v);
      }
    });
  }
  function actions(b) {
    var col = b.parentNode; if (!col || col.querySelector(".mact")) return;
    var d = el("div", "mact"), c = el("button", "", "Copy"); c.type = "button";
    c.onclick = function () { copyText(b.innerText || b.textContent, c); };
    d.appendChild(c); col.appendChild(d);
  }
  function add(role, text) {
    welcome.hidden = true;
    var row = el("div", "msg " + (role === "user" ? "user" : "bot")), b = el("div", "bubble");
    if (role === "user") { b.textContent = text; row.appendChild(b); }
    else {
      var col = el("div", "col"); renderAssistant(b, text); col.appendChild(b);
      row.appendChild(el("div", "av", "P")); row.appendChild(col);
      if (text) actions(b);
    }
    chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
    return b;
  }

  /* ---------- chat ---------- */
  function histSave() {
    if (uid) { var c = convCur(); if (c) { c.messages = history.slice(-200); c.updated = Date.now(); convsSave(); sideRender(); } return; }
    try { lset(KEY, JSON.stringify(history.slice(-40))); } catch (e) {}
  }
  function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true; micStop();
    ensureConv(text);
    add("user", text); history.push({ role: "user", content: text }); histSave();
    input.value = ""; resize();
    var wait = add("bot", ""); wait.appendChild(el("span", "typing")); for (var k = 0; k < 3; k++) wait.firstChild.appendChild(el("i"));
    var full = "", raf = 0;
    function paint() { raf = 0; renderAssistant(wait, full.replace("[[PASIYA_ERROR]]", "")); chat.scrollTop = chat.scrollHeight; }
    api("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-24).map(function (m) { return { role: m.role, content: m.content }; }), project: projectList() }) })
      .then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || "Something went wrong."); });
        if (!r.body || !r.body.getReader) return r.text().then(function (t) { full = t; });
        var reader = r.body.getReader(), dec = new TextDecoder();
        return (function pump() {
          return reader.read().then(function (x) {
            if (x.done) { full += dec.decode(); return; }
            full += dec.decode(x.value, { stream: true });
            if (!raf) raf = requestAnimationFrame(paint);
            return pump();
          });
        })();
      })
      .then(function () {
        var broke = full.indexOf("[[PASIYA_ERROR]]") >= 0;
        full = full.replace("[[PASIYA_ERROR]]", "").trim();
        if (!full) throw new Error("No answer came back. Please try again.");
        renderAssistant(wait, full);
        var n = applyFiles(parse(full));
        if (n) { var note = el("p", "", n + " file" + (n > 1 ? "s" : "") + " ready. Click a file above to download it."); wait.appendChild(note); }
        if (broke) wait.appendChild(el("p", "", "(The answer was cut off. Say \"continue\" to get the rest.)"));
        history.push({ role: "assistant", content: plain(full) || full, raw: full }); histSave(); actions(wait);
      })
      .catch(function (e) { wait.className = "bubble err"; wait.textContent = e.message || "Something went wrong."; history.pop(); histSave(); })
      .then(function () { busy = false; send.disabled = false; chat.scrollTop = chat.scrollHeight; input.focus(); });
  }
  function resize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 150) + "px"; }
  input.addEventListener("input", resize);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  $("chips").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) ask(b.textContent); });
  /* ---------- HTML preview ---------- */
  var frame = $("dlgFrame");
  function closePreview() { $("dlg").hidden = true; frame.srcdoc = ""; }
  function resolveRef(base, ref) {
    ref = String(ref).split(/[?#]/)[0];
    if (!ref || /^([a-z]+:)?\/\//i.test(ref) || /^(data|blob|javascript):/i.test(ref)) return "";
    var parts = ref.charAt(0) === "/" ? [] : base.split("/").slice(0, -1), out = [];
    parts.concat(ref.split("/")).forEach(function (x) { if (x === "..") out.pop(); else if (x && x !== ".") out.push(x); });
    return out.join("/");
  }
  function buildPreview(html, base, files) {
    var find = function (r) { var p = resolveRef(base, r); if (!p) return null; return files[p] != null ? files[p] : (project[p] != null ? project[p] : null); };
    html = html.replace(/<link\b[^>]*>/gi, function (tag) {
      if (!/rel=["']?stylesheet/i.test(tag)) return tag;
      var m = tag.match(/href=["']([^"']+)["']/i), c = m && find(m[1]);
      return c != null ? "<style>" + c.replace(/<\/style/gi, "<\\/style") + "</style>" : tag;
    });
    html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, function (all, a1, src, a2) {
      var c = find(src);
      return c != null ? "<script" + a1 + a2 + ">" + c.replace(/<\/script/gi, "<\\/script") + "</scr" + "ipt>" : all;
    });
    return html;
  }
  function openPreview(html, base, files) { frame.srcdoc = buildPreview(html, base || "index.html", files || {}); $("dlg").hidden = false; }
  $("dlgClose").onclick = closePreview;
  $("dlg").addEventListener("click", function (e) { if (e.target === $("dlg")) closePreview(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("dlg").hidden) closePreview(); });

  /* ---------- microphone (speech to text) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $("mic"), micLang = $("micLang"), LK = "pasiya_ai_vlang";
  var rec = null, listening = false, vlang = lget(LK) === "en-US" ? "en-US" : "si-LK";
  function micStop() { listening = false; mic.classList.remove("rec"); if (rec) { try { rec.abort(); } catch (e) {} rec = null; } }
  function micLabel() { micLang.textContent = vlang === "si-LK" ? "\u0DC3\u0DD2\u0D82" : "EN"; }
  if (!SR) { mic.hidden = true; micLang.hidden = true; }
  else {
    micLabel();
    micLang.onclick = function () { vlang = vlang === "si-LK" ? "en-US" : "si-LK"; lset(LK, vlang); micLabel(); if (listening) { micStop(); mic.click(); } };
    mic.onclick = function () {
      if (listening) { micStop(); return; }
      if (busy) return;
      var base = input.value, r = new SR();
      rec = r; r.lang = vlang; r.continuous = true; r.interimResults = true;
      r.onresult = function (ev) {
        if (!listening || rec !== r) return;
        var t = "";
        for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        input.value = base + (base && t && !/\s$/.test(base) ? " " : "") + t; resize();
      };
      r.onerror = function (ev) {
        if (rec !== r) return;
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") window.alert("Microphone is blocked. Allow microphone access for this site in your browser settings.");
        else if (ev.error === "language-not-supported") window.alert("This browser does not support that voice language. Switch the language button (si / EN).");
        micStop();
      };
      r.onend = function () { if (rec === r) micStop(); };
      listening = true; mic.classList.add("rec");
      try { r.start(); } catch (e) { micStop(); }
    };
  }

  /* ---------- images / video helpers ---------- */
  function fitImage(file, max) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height)), cv = el("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(u); resolve(cv.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error("Could not read that image.")); };
      img.src = u;
    });
  }
  function dataToBlob(d) {
    var m = d.match(/^data:([^;]+);base64,(.*)$/), bin = atob(m[2]), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: m[1] });
  }
  function status(box, kind, text, spin) {
    box.hidden = false; box.className = "status" + (kind ? " " + kind : ""); box.textContent = "";
    if (spin) box.appendChild(el("span", "spin")); box.appendChild(document.createTextNode(text));
  }
  function bindSrc(fileId, thumbId, xId) {
    var o = { data: "" };
    function show() { var t = $(thumbId); t.hidden = !o.data; if (o.data) t.querySelector("img").src = o.data; }
    $(fileId).addEventListener("change", function (e) {
      var f = e.target.files[0]; e.target.value = ""; if (!f) return;
      fitImage(f, 1280).then(function (d) { o.data = d; show(); }, function () {});
    });
    $(xId).onclick = function () { o.data = ""; show(); };
    o.set = function (d) { o.data = d; show(); };
    return o;
  }
  function goMode() {}

  /* ---------- conversations (per account) + sidebar ---------- */
  var layout = $("layout"), convsEl = $("convs"), mq = window.matchMedia ? window.matchMedia("(max-width: 900px)") : { matches: false };
  function convCur() { for (var i = 0; i < CONVS.length; i++) if (CONVS[i].id === curId) return CONVS[i]; return null; }
  function convsSave() {
    if (!uid) return;
    var list = CONVS.slice().sort(function (a, b) { return b.updated - a.updated; }).slice(0, 60);
    for (var n = 0; n < 8; n++) {
      try { localStorage.setItem(CK + uid, JSON.stringify(list)); return; } catch (e) { list = list.slice(0, Math.max(1, list.length - 6)); }
    }
  }
  function titleOf(t) { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 48 ? t.slice(0, 47) + "\u2026" : (t || "New chat"); }
  function newId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function ensureConv(first) {
    if (!uid || curId) return;
    var c = { id: newId(), title: titleOf(first), updated: Date.now(), messages: [], project: project };
    CONVS.unshift(c); curId = c.id;
  }
  function clearView() { [].slice.call(chat.querySelectorAll(".msg")).forEach(function (n) { n.remove(); }); }
  function openConv(id) {
    if (busy) return;
    var c = null; CONVS.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return;
    curId = c.id; history = c.messages.slice(); project = c.project || {};
    clearView(); welcome.hidden = history.length > 0;
    history.forEach(function (m) { add(m.role, m.raw || m.content); });
    projectUi(); goMode("chat"); sideRender(); sideClose();
    chat.scrollTop = chat.scrollHeight;
  }
  function newChat() {
    if (busy) return;
    curId = ""; history = [];
    project = {}; projectSave(); if (!uid) histSave();
    clearView(); welcome.hidden = false; projectUi(); sideRender(); sideClose(); goMode("chat"); input.focus();
  }
  function delConv(id) {
    if (busy && id === curId) return;
    if (!window.confirm("Delete this chat?")) return;
    CONVS = CONVS.filter(function (c) { return c.id !== id; }); convsSave();
    if (id === curId) { newChat(); } else sideRender();
  }
  function group(ts) {
    var d0 = new Date(); d0.setHours(0, 0, 0, 0); var day = 864e5, t = d0.getTime();
    return ts >= t ? "Today" : ts >= t - day ? "Yesterday" : ts >= t - 7 * day ? "Previous 7 days" : "Older";
  }
  function nameOf() { return (me && (me.displayName || (me.email || "").split("@")[0])) || "Account"; }
  function sideFoot() {
    var f = $("sideFoot"); f.textContent = "";
    if (!authKnown) return;
    if (uid) {
      var w = el("div", "me"), av = el("div", "me-av"), t = el("div", "me-t");
      var pn = (window.PS && window.PS.me && window.PS.me.username) || nameOf();
      if (me && me.photoURL) { var im = el("img"); im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = me.photoURL; av.appendChild(im); } else av.textContent = pn.charAt(0).toUpperCase();
      t.appendChild(el("b", "", pn)); t.appendChild(el("small", "", "Chats are saved on this device"));
      w.appendChild(av); w.appendChild(t); f.appendChild(w);
    } else {
      var card = el("div", "login-card"), row = el("div", "row"), nx = encodeURIComponent(location.pathname + location.search);
      card.appendChild(el("p", "", "Log in to save your chats and see your history here."));
      var l1 = el("a", "btn primary", "Log in"); l1.href = "/api/login?next=" + nx;
      var l2 = el("a", "btn", "Register"); l2.href = "/api/register?next=" + nx;
      row.appendChild(l1); row.appendChild(l2); card.appendChild(row); f.appendChild(card);
    }
  }
  function sideRender() {
    var q = ($("convSearch").value || "").trim().toLowerCase();
    convsEl.textContent = "";
    $("convSearch").parentNode.style.display = uid ? "" : "none";
    if (!uid) {
      if (authKnown) convsEl.appendChild(el("div", "empty", "Your past chats will show up here once you log in."));
      sideFoot(); return;
    }
    var list = CONVS.slice().sort(function (a, b) { return b.updated - a.updated; }).filter(function (c) {
      return !q || c.title.toLowerCase().indexOf(q) >= 0 || c.messages.some(function (m) { return m.content.toLowerCase().indexOf(q) >= 0; });
    });
    if (!list.length) convsEl.appendChild(el("div", "empty", q ? "No chats match your search." : "No chats yet. Start a conversation and it will be saved here."));
    var last = "";
    list.forEach(function (c) {
      var g = group(c.updated);
      if (g !== last) { convsEl.appendChild(el("div", "cgrp", g)); last = g; }
      var row = el("div", "conv" + (c.id === curId ? " on" : "")), t = el("span", "", c.title), x = el("button", "del");
      row.tabIndex = 0; row.setAttribute("role", "button"); row.title = c.title;
      x.type = "button"; x.setAttribute("aria-label", "Delete chat");
      x.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      x.onclick = function (e) { e.stopPropagation(); delConv(c.id); };
      row.onclick = function () { openConv(c.id); };
      row.onkeydown = function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === row) { e.preventDefault(); openConv(c.id); } };
      row.appendChild(t); row.appendChild(x); convsEl.appendChild(row);
    });
    sideFoot();
  }
  function setUser(u) {
    authKnown = true;
    var nu = u && u.uid ? u.uid : "";
    me = u || null;
    if (nu === uid) { sideRender(); return; }
    if (nu) {
      var guestHist = !uid && history.length ? history.slice() : null;
      uid = nu;
      try { CONVS = JSON.parse(lget(CK + uid)) || []; } catch (e) { CONVS = []; }
      curId = "";
      if (guestHist) { // the chat that was open before the login becomes the first saved chat
        var first = ""; guestHist.forEach(function (m) { if (!first && m.role === "user") first = m.content; });
        var c = { id: newId(), title: titleOf(first), updated: Date.now(), messages: guestHist, project: project };
        CONVS.unshift(c); curId = c.id; convsSave(); lset(KEY, "[]"); lset(PKEY, "{}");
      }
    } else { // signed out
      uid = ""; CONVS = []; curId = ""; history = []; project = {}; clearView(); welcome.hidden = false; projectUi();
    }
    sideRender();
  }
  function sideClose() { layout.classList.remove("side-open"); $("sideBtn").setAttribute("aria-expanded", mq.matches ? "false" : String(!layout.classList.contains("side-off"))); }
  $("sideBtn").onclick = function () {
    if (mq.matches) { var o = layout.classList.toggle("side-open"); $("sideBtn").setAttribute("aria-expanded", String(o)); }
    else { var off = layout.classList.toggle("side-off"); lset(SK, off ? "off" : "on"); $("sideBtn").setAttribute("aria-expanded", String(!off)); }
  };
  $("sideClose").onclick = sideClose; $("sideBack").onclick = sideClose;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") sideClose(); });
  if (lget(SK) === "off") layout.classList.add("side-off");
  $("newChat").onclick = newChat; $("clear").onclick = newChat;
  $("convSearch").addEventListener("input", sideRender);
  document.addEventListener("ps:user", function (e) { setUser(e.detail); });
  document.addEventListener("ps:me", function () { if (uid) sideFoot(); });
  setTimeout(function () { if (!authKnown) { authKnown = true; sideRender(); } }, 6000); // login service did not answer: treat as signed out

  /* ---------- start ---------- */
  try { history = JSON.parse(lget(KEY)) || []; } catch (e) { history = []; }
  try { project = JSON.parse(lget(PKEY)) || {}; } catch (e) { project = {}; }
  history.forEach(function (m) { add(m.role, m.raw || m.content); });
  projectUi();
  sideRender();
  if (window.PS && window.PS.user) setUser(window.PS.user);
})();
