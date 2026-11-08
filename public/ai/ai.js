/* PASIYA AI - chat + code projects + image + video */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "pasiya_ai_chat", PKEY = "pasiya_ai_project", CKEY = "pasiya_ai_code";
  var chat = $("chat"), input = $("input"), send = $("send"), welcome = $("welcome");
  var history = [], project = {}, busy = false;
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

  /* ---------- modes ---------- */
  $("modes").addEventListener("click", function (e) {
    var b = e.target.closest(".mode"); if (!b) return;
    document.querySelectorAll(".mode").forEach(function (x) { x.classList.toggle("active", x === b); });
    ["chat", "image", "video"].forEach(function (m) { $("view-" + m).classList.toggle("active", m === b.dataset.mode); });
    $("clear").style.visibility = b.dataset.mode === "chat" ? "visible" : "hidden";
  });

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
  function projectSave() { try { var s = JSON.stringify(project); if (s.length < 3e6) lset(PKEY, s); } catch (e) {} }
  function projectList() {
    var out = [], left = MAX_CTX;
    Object.keys(project).forEach(function (p) { var n = project[p].length + p.length + 30; if (n <= left) { out.push({ path: p, content: project[p] }); left -= n; } });
    return out;
  }
  function projectUi() {
    var n = Object.keys(project).length, kb = Math.round(Object.keys(project).reduce(function (a, p) { return a + project[p].length; }, 0) / 1024);
    $("pinfo").textContent = n ? "Project: " + n + " file" + (n > 1 ? "s" : "") + " · " + kb + " KB. Ask me to change or fix it." : "No project yet. Ask me to build one, or import yours to fix bugs.";
    ["pFiles", "pZip", "pClear"].forEach(function (id) { $(id).hidden = !n; });
  }

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
        pre.appendChild(c); pre.appendChild(b); container.appendChild(pre);
      } else if (part.trim()) { var p = el("p"); inline(p, part.trim()); container.appendChild(p); }
    });
  }
  function renderAssistant(bubble, text) {
    bubble.textContent = "";
    var files = null;
    parse(text).forEach(function (s) {
      if (s.t === "text") { md(bubble, s.s); return; }
      if (!files) { files = el("div", "files"); bubble.appendChild(files); }
      var lines = s.content ? s.content.split("\n").length : 0;
      var b = el("button", "chip-file" + (s.done ? "" : " live"), "📄 " + s.path + (s.done ? " · " + lines + " lines" : " · writing..."));
      b.type = "button"; b.onclick = function () { var p = cleanPath(s.path); if (project[p] != null) openDlg(p); };
      files.appendChild(b);
    });
  }
  function add(role, text) {
    welcome.hidden = true;
    var row = el("div", "msg " + (role === "user" ? "user" : "bot")), b = el("div", "bubble");
    if (role === "user") b.textContent = text; else renderAssistant(b, text);
    row.appendChild(b); chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
    return b;
  }

  /* ---------- chat ---------- */
  function histSave() { try { lset(KEY, JSON.stringify(history.slice(-40))); } catch (e) {} }
  function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true;
    add("user", text); history.push({ role: "user", content: text }); histSave();
    input.value = ""; resize();
    var wait = add("bot", ""); wait.appendChild(el("span", "typing")); for (var k = 0; k < 3; k++) wait.firstChild.appendChild(el("i"));
    var full = "", raf = 0;
    function paint() { raf = 0; renderAssistant(wait, full.replace("[[PASIYA_ERROR]]", "")); chat.scrollTop = chat.scrollHeight; }
    api("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-24), project: projectList() }) })
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
        if (n) { var note = el("p", "", n + " file" + (n > 1 ? "s" : "") + " saved to your project. Use Download ZIP below."); wait.appendChild(note); }
        if (broke) wait.appendChild(el("p", "", "(The answer was cut off. Say \"continue\" to get the rest.)"));
        history.push({ role: "assistant", content: plain(full) || full }); histSave();
      })
      .catch(function (e) { wait.className = "bubble err"; wait.textContent = e.message || "Something went wrong."; history.pop(); histSave(); })
      .then(function () { busy = false; send.disabled = false; chat.scrollTop = chat.scrollHeight; input.focus(); });
  }
  function resize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 150) + "px"; }
  input.addEventListener("input", resize);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  $("chips").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) ask(b.textContent); });
  $("clear").addEventListener("click", function () {
    if (busy) return;
    history = []; histSave();
    [].slice.call(chat.querySelectorAll(".msg")).forEach(function (n) { n.remove(); });
    welcome.hidden = false;
  });

  /* ---------- project: files dialog, zip, import ---------- */
  var cur = "";
  function openDlg(path) {
    var names = Object.keys(project).sort();
    if (!names.length) return;
    cur = path && project[path] != null ? path : names[0];
    var ul = $("dlgList"); ul.textContent = "";
    names.forEach(function (n) {
      var li = el("li", n === cur ? "on" : "", n);
      li.onclick = function () { openDlg(n); };
      ul.appendChild(li);
    });
    $("dlgCode").value = project[cur];
    $("dlgTitle").textContent = cur;
    $("dlg").hidden = false;
  }
  $("dlgCode").addEventListener("input", function () { if (cur) { project[cur] = $("dlgCode").value; projectSave(); projectUi(); } });
  $("dlgClose").onclick = function () { $("dlg").hidden = true; };
  $("dlgCopy").onclick = function () { copyText($("dlgCode").value, $("dlgCopy")); };
  $("dlg").addEventListener("click", function (e) { if (e.target === $("dlg")) $("dlg").hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("dlg").hidden = true; });
  $("pFiles").onclick = function () { openDlg(); };
  $("pZip").onclick = function () {
    var files = Object.keys(project).sort().map(function (p) { return { path: p, content: project[p] }; });
    if (files.length) save(PZip.create(files), "pasiya-project.zip");
  };
  $("pClear").onclick = function () { if (window.confirm("Remove the project from this page?")) { project = {}; projectSave(); projectUi(); } };
  $("pImport").onclick = function () { $("pFile").click(); };

  var SKIP_DIR = /(^|\/)(node_modules|\.git|dist|build|__pycache__|\.next|\.venv|venv|\.idea|\.vscode)\//;
  var SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|gz|rar|7z|mp4|mov|mp3|wav|woff2?|ttf|otf|eot|exe|dll|so|class|jar|bin|apk|lock)$|(^|\/)package-lock\.json$/i;
  function importEntries(entries) {
    var skipped = 0, total = 0, out = {};
    var tops = entries.map(function (e) { return e.path.split("/")[0]; });
    var strip = entries.length > 1 && entries.every(function (e) { return e.path.indexOf("/") > 0; }) && tops.every(function (t) { return t === tops[0]; });
    entries.forEach(function (e) {
      var p = cleanPath(strip ? e.path.slice(e.path.indexOf("/") + 1) : e.path);
      if (!p || SKIP_DIR.test(p) || SKIP_EXT.test(p) || e.bytes.length > 200000) { skipped++; return; }
      var s = PZip.decode(e.bytes);
      if (s.indexOf("\u0000") >= 0) { skipped++; return; }
      if (total + s.length > MAX_CTX) { skipped++; return; }
      out[p] = s; total += s.length;
    });
    return { files: out, skipped: skipped };
  }
  $("pFile").addEventListener("change", function (ev) {
    var list = [].slice.call(ev.target.files); ev.target.value = ""; if (!list.length) return;
    var entries = [];
    Promise.all(list.map(function (f) {
      if (/\.zip$/i.test(f.name)) return PZip.read(f).then(function (r) { entries = entries.concat(r); });
      return f.arrayBuffer().then(function (b) { entries.push({ path: f.webkitRelativePath || f.name, bytes: new Uint8Array(b) }); });
    })).then(function () {
      var r = importEntries(entries), n = Object.keys(r.files).length;
      if (!n) throw new Error("No readable code files found in that import.");
      if (Object.keys(project).length && !window.confirm("Replace the current project with the " + n + " imported files?")) return;
      project = r.files; projectSave(); projectUi();
      welcome.hidden = true;
      var b = add("bot", ""); b.textContent = "Imported " + n + " file" + (n > 1 ? "s" : "") + (r.skipped ? " (" + r.skipped + " skipped: binary, too big or build folders)" : "") + ". Tell me what to fix or change.";
      if (!input.value) input.value = "Find and fix the bugs in this project.";
      resize(); input.focus();
    }).catch(function (e) { window.alert(e.message || "Could not read that file."); });
  });

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
  var imgSrc = bindSrc("imgFile", "imgThumb", "imgThumbX"), vidSrc = bindSrc("vidFile", "vidThumb", "vidThumbX");
  function goMode(m) { document.querySelector('.mode[data-mode="' + m + '"]').click(); }

  /* ---------- image ---------- */
  $("imgGo").onclick = function () {
    var prompt = $("imgPrompt").value.trim(), st = $("imgStatus");
    if (!prompt) { status(st, "err", "Describe the image first."); return; }
    $("imgGo").disabled = true;
    status(st, "", imgSrc.data ? "Editing your image..." : "Creating your image...", true);
    api("/api/ai-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt, image: imgSrc.data || undefined }) })
      .then(jsonOrThrow)
      .then(function (j) {
        st.hidden = true;
        var card = el("div", "res"), im = el("img"), acts = el("div", "acts");
        im.src = j.image; im.alt = prompt; card.appendChild(im);
        if (j.text) card.appendChild(el("p", "", j.text));
        var dl = el("a", "btn primary", "Download"); dl.href = j.image; dl.download = "pasiya-ai-image.png";
        var ed = el("button", "btn", "Edit this"); ed.type = "button";
        ed.onclick = function () { fitImage(dataToBlob(j.image), 1280).then(function (d) { imgSrc.set(d); $("imgPrompt").focus(); window.scrollTo(0, 0); }); };
        var vd = el("button", "btn", "Make a video"); vd.type = "button";
        vd.onclick = function () { fitImage(dataToBlob(j.image), 1280).then(function (d) { vidSrc.set(d); goMode("video"); }); };
        acts.appendChild(dl); acts.appendChild(ed); acts.appendChild(vd); card.appendChild(acts);
        $("imgResults").insertBefore(card, $("imgResults").firstChild);
      })
      .catch(function (e) { status(st, "err", e.message); })
      .then(function () { $("imgGo").disabled = false; });
  };

  /* ---------- video ---------- */
  $("vidGo").onclick = function () {
    var prompt = $("vidPrompt").value.trim(), st = $("vidStatus"), t0 = Date.now(), fails = 0;
    if (!prompt) { status(st, "err", "Describe the video first."); return; }
    $("vidGo").disabled = true;
    status(st, "", "Starting...", true);
    function done() { $("vidGo").disabled = false; }
    api("/api/ai-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt, image: vidSrc.data || undefined, aspect: $("vidAspect").value }) })
      .then(jsonOrThrow)
      .then(function (j) {
        (function poll() {
          var s = Math.round((Date.now() - t0) / 1000);
          if (s > 600) { status(st, "err", "This is taking too long. Please try again."); done(); return; }
          status(st, "", "Making your video... " + Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2), true);
          setTimeout(function () {
            api("/api/ai-video?op=" + encodeURIComponent(j.op)).then(jsonOrThrow).then(function (p) {
              fails = 0;
              if (!p.done) return poll();
              if (p.error) throw new Error(p.error);
              status(st, "", "Downloading video...", true);
              return api("/api/ai-video?op=" + encodeURIComponent(j.op) + "&download=1").then(function (r) {
                if (!r.ok) return r.json().catch(function () { return {}; }).then(function (x) { throw new Error(x.error || "Could not download the video."); });
                return r.blob();
              }).then(function (blob) {
                st.hidden = true;
                var u = URL.createObjectURL(blob), card = el("div", "res"), v = el("video"), acts = el("div", "acts");
                v.src = u; v.controls = true; v.playsInline = true; card.appendChild(v); card.appendChild(el("p", "", prompt));
                var dl = el("a", "btn primary", "Download"); dl.href = u; dl.download = "pasiya-ai-video.mp4"; acts.appendChild(dl); card.appendChild(acts);
                $("vidResults").insertBefore(card, $("vidResults").firstChild);
                done();
              });
            }).catch(function (e) {
              if (++fails < 3 && !/^(Video|Too many|No video)/.test(e.message)) return poll();
              status(st, "err", e.message); done();
            });
          }, s < 2 ? 1000 : 8000);
        })();
      })
      .catch(function (e) { status(st, "err", e.message); done(); });
  };

  /* ---------- start ---------- */
  try { history = JSON.parse(lget(KEY)) || []; } catch (e) { history = []; }
  try { project = JSON.parse(lget(PKEY)) || {}; } catch (e) { project = {}; }
  history.forEach(function (m) { add(m.role, m.content); });
  projectUi();
})();
