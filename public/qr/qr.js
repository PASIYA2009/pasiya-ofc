/* PASIYA QR Editor - generator, styling, download and file upload */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var MAX_BYTES = 3.5 * 1024 * 1024;      /* through our server */
  var MAX_DIRECT = 200 * 1024 * 1024;     /* straight from the browser */
  var DIRECT_URL = "https://catbox.moe/user/api.php";
  var HIST_KEY = "pasiya_qr_uploads";
  var state = { type: "text", fileUrl: "", logo: "", svg: "", busy: false };

  /* ---------- content for each QR type ---------- */
  function escWifi(s) { return String(s).replace(/([\\;,:"])/g, "\\$1"); }
  function escV(s) { return String(s).replace(/([\\;,])/g, "\\$1").replace(/\r?\n/g, "\\n"); }
  function val(id) { return ($(id).value || "").trim(); }

  function content() {
    switch (state.type) {
      case "text": return val("f-text");
      case "file": return state.fileUrl;
      case "wifi": {
        var ssid = val("w-ssid"); if (!ssid) return "";
        var enc = $("w-enc").value, pass = $("w-pass").value;
        return "WIFI:T:" + enc + ";S:" + escWifi(ssid) + ";" +
          (enc !== "nopass" && pass ? "P:" + escWifi(pass) + ";" : "") +
          ($("w-hidden").checked ? "H:true;" : "") + ";";
      }
      case "vcard": {
        var f = val("v-first"), l = val("v-last"), tel = val("v-tel"), mail = val("v-mail"), org = val("v-org"), url = val("v-url");
        if (!f && !l && !tel && !mail && !org && !url) return "";
        var L = ["BEGIN:VCARD", "VERSION:3.0", "N:" + escV(l) + ";" + escV(f) + ";;;", "FN:" + escV((f + " " + l).trim())];
        if (org) L.push("ORG:" + escV(org));
        if (tel) L.push("TEL:" + escV(tel));
        if (mail) L.push("EMAIL:" + escV(mail));
        if (url) L.push("URL:" + url);
        L.push("END:VCARD");
        return L.join("\n");
      }
      case "whatsapp": {
        var num = val("a-num").replace(/\D/g, ""); if (!num) return "";
        var msg = val("a-msg");
        return "https://wa.me/" + num + (msg ? "?text=" + encodeURIComponent(msg) : "");
      }
      case "email": {
        var to = val("e-to"); if (!to) return "";
        var q = [];
        if (val("e-sub")) q.push("subject=" + encodeURIComponent(val("e-sub")));
        if (val("e-body")) q.push("body=" + encodeURIComponent(val("e-body")));
        return "mailto:" + to + (q.length ? "?" + q.join("&") : "");
      }
      case "sms": {
        var sn = val("s-num"); if (!sn) return "";
        return "SMSTO:" + sn.replace(/\s/g, "") + ":" + val("s-msg");
      }
      case "tel": {
        var tn = val("t-num").replace(/\s/g, ""); return tn ? "tel:" + tn : "";
      }
    }
    return "";
  }

  /* ---------- options ---------- */
  function opts() {
    var logo = !!state.logo;
    return {
      text: content(),
      fg: $("o-fg").value, bg: $("o-bg").value, eye: $("o-eye").value, grad: $("o-grad").value,
      gradOn: $("o-gradOn").checked, eyeOn: $("o-eyeOn").checked, transp: $("o-transp").checked,
      dot: $("o-dot").value, eyeShape: $("o-eyeShape").value,
      ecc: logo ? "H" : $("o-ecc").value,
      margin: +$("o-margin").value, size: +$("o-size").value,
      logo: state.logo, logoSize: +$("o-logoSize").value, logoRound: $("o-logoRound").checked
    };
  }

  /* ---------- SVG builder (one geometry for preview, SVG and PNG) ---------- */
  function f(n) { return +n.toFixed(3); }
  function rr(x, y, w, h, r) {
    if (r <= 0) return "M" + f(x) + " " + f(y) + "h" + f(w) + "v" + f(h) + "h" + f(-w) + "z";
    var a = "a" + f(r) + " " + f(r) + " 0 0 1 ";
    return "M" + f(x + r) + " " + f(y) + "h" + f(w - 2 * r) + a + f(r) + " " + f(r) + "v" + f(h - 2 * r) +
      a + f(-r) + " " + f(r) + "h" + f(-(w - 2 * r)) + a + f(-r) + " " + f(-r) + "v" + f(-(h - 2 * r)) +
      a + f(r) + " " + f(-r) + "z";
  }
  var EYE_R = { square: [0, 0, 0], rounded: [2, 1.2, 0.9], circle: [3.5, 2.5, 1.5] };

  function buildSvg(o, px) {
    var qr = window.PQR.make(o.text, window.PQR.ECC[o.ecc]);
    var n = qr.size, m = o.margin, W = n + 2 * m;
    var box = o.logo ? n * o.logoSize / 100 : 0;
    var lx = W / 2 - box / 2;
    var dataFill = o.gradOn ? "url(#pqg)" : o.fg;
    var eyeFill = o.eyeOn ? o.eye : dataFill;

    function finder(r, c) {
      return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    }
    function hidden(r, c) {
      if (!box) return false;
      var x = m + c, y = m + r;
      return x + 1 > lx && x < lx + box && y + 1 > lx && y < lx + box;
    }

    var d = "", barH = o.dot === "bars-h", barV = o.dot === "bars-v";
    function on(r, c) { return r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) && !finder(r, c) && !hidden(r, c); }
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!on(r, c)) continue;
        var x = m + c, y = m + r;
        if (barH) {
          if (on(r, c - 1)) continue;
          var len = 1; while (on(r, c + len)) len++;
          d += rr(x + 0.04, y + 0.08, len - 0.08, 0.84, 0.42);
        } else if (barV) {
          if (on(r - 1, c)) continue;
          var hh = 1; while (on(r + hh, c)) hh++;
          d += rr(x + 0.08, y + 0.04, 0.84, hh - 0.08, 0.42);
        } else if (o.dot === "square") d += "M" + x + " " + y + "h1v1h-1z";
        else if (o.dot === "rounded") d += rr(x + 0.03, y + 0.03, 0.94, 0.94, 0.3);
        else if (o.dot === "dots") d += rr(x + 0.04, y + 0.04, 0.92, 0.92, 0.46);
        else if (o.dot === "small") d += rr(x + 0.17, y + 0.17, 0.66, 0.66, 0.33);
        else if (o.dot === "classy") d += "M" + f(x + 0.5) + " " + y + "h0.5v0.5a0.5 0.5 0 0 1-0.5 0.5H" + x + "v-0.5a0.5 0.5 0 0 1 0.5-0.5z";
        else if (o.dot === "plus") d += "M" + f(x + 0.34) + " " + y + "h0.32v0.34h0.34v0.32h-0.34v0.34h-0.32v-0.34h-0.34v-0.32h0.34z";
        else d += "M" + f(x + 0.5) + " " + f(y - 0.08) + "l0.58 0.58-0.58 0.58-0.58-0.58z";
      }
    }

    var er = EYE_R[o.eyeShape] || EYE_R.square, e = "";
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
      var x = m + p[0], y = m + p[1];
      e += rr(x, y, 7, 7, er[0]) + rr(x + 1, y + 1, 5, 5, er[1]) + rr(x + 2, y + 2, 3, 3, er[2]);
    });

    var s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + f(W) + " " + f(W) + '"' +
      (px ? ' width="' + px + '" height="' + px + '"' : "") + ">";
    if (o.gradOn) s += '<defs><linearGradient id="pqg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + f(W) + '" y2="' + f(W) + '"><stop offset="0" stop-color="' + o.fg + '"/><stop offset="1" stop-color="' + o.grad + '"/></linearGradient></defs>';
    if (!o.transp) s += '<rect width="' + f(W) + '" height="' + f(W) + '" fill="' + o.bg + '"/>';
    s += '<path d="' + d + '" fill="' + dataFill + '"/>';
    s += '<path d="' + e + '" fill="' + eyeFill + '" fill-rule="evenodd"/>';
    if (box) {
      var plate = o.transp ? "#ffffff" : o.bg, pr = o.logoRound ? box / 2 : box * 0.18, pad = box * 0.1;
      s += '<rect x="' + f(lx) + '" y="' + f(lx) + '" width="' + f(box) + '" height="' + f(box) + '" rx="' + f(pr) + '" fill="' + plate + '"/>';
      s += '<clipPath id="pqc">' + (o.logoRound
        ? '<circle cx="' + f(W / 2) + '" cy="' + f(W / 2) + '" r="' + f(box / 2 - pad) + '"/>'
        : '<rect x="' + f(lx + pad) + '" y="' + f(lx + pad) + '" width="' + f(box - 2 * pad) + '" height="' + f(box - 2 * pad) + '" rx="' + f(pr * 0.6) + '"/>') + "</clipPath>";
      s += '<image clip-path="url(#pqc)" preserveAspectRatio="xMidYMid slice" x="' + f(lx + pad) + '" y="' + f(lx + pad) + '" width="' + f(box - 2 * pad) + '" height="' + f(box - 2 * pad) + '" href="' + o.logo + '" xlink:href="' + o.logo + '"/>';
    }
    return s + "</svg>";
  }

  /* ---------- contrast hints ---------- */
  function lum(hex) {
    var v = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  function hints(o) {
    var bg = o.transp ? "#ffffff" : o.bg, list = [o.fg];
    if (o.gradOn) list.push(o.grad);
    if (o.eyeOn) list.push(o.eye);
    var min = Math.min.apply(null, list.map(function (c) { return ratio(c, bg); }));
    var inverted = !o.transp && list.some(function (c) { return lum(c) > lum(bg); });
    if (min < 3) return { bad: true, msg: "Low contrast between the dots and the background. This QR may not scan." };
    if (inverted) return { bad: false, msg: "Light dots on a dark background: some scanner apps can't read inverted QR codes. Test it before printing." };
    if (o.transp) return { bad: false, msg: "Transparent background: place it on a light, plain surface so it stays readable." };
    return null;
  }

  /* ---------- render ---------- */
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); });
  }

  function setActions(on) {
    $("dlPng").disabled = !on; $("dlSvg").disabled = !on;
    $("upQr").disabled = !on || state.busy;
  }

  function render() {
    var o = opts(), pv = $("preview"), warn = $("warn");
    $("o-marginV").textContent = o.margin;
    $("o-sizeV").textContent = o.size;
    $("o-logoSizeV").textContent = o.logoSize;
    $("logoOpts").hidden = !state.logo;
    $("logoHint").hidden = !state.logo;
    $("logoClear").hidden = !state.logo;
    $("o-ecc").disabled = !!state.logo;
    warn.hidden = true;

    if (!o.text) {
      state.svg = "";
      pv.innerHTML = '<div class="empty">' + (state.type === "file" ? "Upload a file and your QR appears here." : "Type something on the left and your QR appears here.") + "</div>";
      setActions(false);
      return;
    }
    try {
      state.svg = buildSvg(o);
    } catch (err) {
      state.svg = "";
      pv.innerHTML = '<div class="empty">That is too much data for one QR code. Shorten it, lower the error correction, or use the File tab.</div>';
      setActions(false);
      return;
    }
    pv.innerHTML = state.svg;
    setActions(true);
    var h = hints(o);
    if (h) { warn.textContent = h.msg; warn.className = "warn" + (h.bad ? " bad" : ""); warn.hidden = false; }
  }

  /* ---------- export ---------- */
  function svgToPng(svg, px) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = cv.height = px;
        cv.getContext("2d").drawImage(img, 0, 0, px, px);
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error("PNG export failed")); }, "image/png");
      };
      img.onerror = function () { reject(new Error("PNG export failed")); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function save(blob, name) {
    var a = document.createElement("a"), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  /* ---------- catbox.moe upload (through /api/qr-upload) ---------- */
  var directOk = null; /* does the browser reach the storage service directly? */
  function probe() {
    if (directOk !== null) return Promise.resolve(directOk);
    var fd = new FormData(); fd.append("reqtype", "fileupload");
    return fetch(DIRECT_URL, { method: "POST", body: fd }).then(function () { return (directOk = true); }, function () { return (directOk = false); });
  }
  function viaServer(blob, name) {
    var fd = new FormData();
    fd.append("file", blob, name);
    return fetch("/api/qr-upload", { method: "POST", body: fd }).then(function (res) {
      return res.json().catch(function () { throw new Error("Upload service is not available."); }).then(function (j) {
        if (!res.ok || !j.url) throw new Error(j.error || "Upload failed.");
        return j.url;
      });
    });
  }
  function direct(blob, name) {
    var fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("fileToUpload", blob, name);
    return fetch(DIRECT_URL, { method: "POST", body: fd }).then(function (r) { return r.text(); }).then(function (t) {
      t = t.trim();
      if (!/^https:\/\/files\.catbox\.moe\/\S+$/.test(t)) throw new Error(t.slice(0, 150) || "Upload failed.");
      return t;
    });
  }
  function upload(blob, name) {
    if (blob.size > MAX_DIRECT) return Promise.reject(new Error("File is too big. The limit is 200 MB."));
    if (blob.size <= MAX_BYTES) return viaServer(blob, name);
    return probe().then(function (ok) {
      if (!ok) throw new Error("Files over 3.5 MB can't be uploaded from this browser. Try a smaller file.");
      return direct(blob, name);
    });
  }

  function say(el, kind, parts) {
    el.hidden = false;
    el.className = "status" + (kind ? " " + kind : "");
    el.textContent = "";
    [].concat(parts).forEach(function (p) { el.appendChild(typeof p === "string" ? document.createTextNode(p) : p); });
  }
  function spinner() { var s = document.createElement("span"); s.className = "spin"; return s; }
  function copy(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = t; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch (e) {} t.remove();
    }
  }
  function linkBox(el, label, url) {
    var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = url;
    var row = document.createElement("div"); row.className = "s-actions";
    var b1 = document.createElement("button"); b1.type = "button"; b1.textContent = "Copy link";
    b1.onclick = function () { copy(url, b1); };
    var b2 = document.createElement("button"); b2.type = "button"; b2.textContent = "Open";
    b2.onclick = function () { window.open(url, "_blank", "noopener"); };
    row.appendChild(b1); row.appendChild(b2);
    say(el, "ok", [label + " ", a, row]);
  }

  /* history (browser only) */
  function histGet() { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { return []; } }
  function histSet(a) { try { localStorage.setItem(HIST_KEY, JSON.stringify(a)); } catch (e) {} }
  function histAdd(url) { var a = histGet().filter(function (x) { return x !== url; }); a.unshift(url); histSet(a.slice(0, 8)); histDraw(); }
  function histDraw() {
    var a = histGet(), ul = $("history");
    $("historyCard").hidden = !a.length;
    ul.textContent = "";
    a.forEach(function (u) {
      var li = document.createElement("li"), l = document.createElement("a"), b = document.createElement("button");
      l.href = u; l.target = "_blank"; l.rel = "noopener"; l.textContent = u.replace("https://", "");
      b.type = "button"; b.textContent = "Copy"; b.onclick = function () { copy(u, b); };
      li.appendChild(l); li.appendChild(b); ul.appendChild(li);
    });
  }

  /* shrink big photos so they fit the upload limit */
  function fitImage(file) {
    if (file.size <= MAX_BYTES || !/^image\/(png|jpe?g|webp|bmp)$/i.test(file.type)) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 2400 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(u);
        cv.toBlob(function (b) {
          resolve(b ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file);
        }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(u); resolve(file); };
      img.src = u;
    });
  }

  function handleFile(file) {
    if (!file) return;
    var st = $("fileStatus");
    say(st, "", [spinner(), "Uploading " + file.name + "..."]);
    $("dropTitle").textContent = file.name;
    fitImage(file).then(function (ff) {
      return upload(ff, ff.name);
    }).then(function (url) {
      state.fileUrl = url;
      linkBox(st, "Uploaded:", url);
      histAdd(url);
      render();
    }).catch(function (err) {
      state.fileUrl = "";
      say(st, "err", err.message || "Upload failed.");
      render();
    });
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      state.type = t.dataset.type;
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === t); });
      document.querySelectorAll(".pane").forEach(function (p) { p.classList.toggle("active", p.dataset.pane === state.type); });
      render();
    });
  });

  document.querySelector(".controls").addEventListener("input", schedule);
  document.querySelector(".controls").addEventListener("change", schedule);

  $("presets").addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    $("o-fg").value = b.dataset.fg; $("o-eye").value = b.dataset.fg; $("o-bg").value = b.dataset.bg;
    $("o-eyeOn").checked = false; $("o-transp").checked = false;
    if (b.dataset.grad) { $("o-grad").value = b.dataset.grad; $("o-gradOn").checked = true; } else $("o-gradOn").checked = false;
    render();
  });

  $("f-file").addEventListener("change", function (e) { handleFile(e.target.files[0]); e.target.value = ""; });
  var dz = $("dropZone");
  ["dragenter", "dragover"].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.remove("over"); }); });
  dz.addEventListener("drop", function (e) { handleFile(e.dataTransfer.files[0]); });

  /* logo (stays in the browser, only drawn into the QR) */
  $("o-logo").addEventListener("change", function (e) {
    var file = e.target.files[0]; e.target.value = ""; if (!file) return;
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () {
      var s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
      var k = Math.max(s / img.width, s / img.height) || 1, w = img.width * k, h = img.height * k;
      cv.getContext("2d").drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
      URL.revokeObjectURL(u);
      state.logo = cv.toDataURL("image/png");
      render();
    };
    img.onerror = function () { URL.revokeObjectURL(u); say($("upStatus"), "err", "Could not read that logo image."); };
    img.src = u;
  });
  $("logoClear").addEventListener("click", function () { state.logo = ""; render(); });

  $("dlSvg").addEventListener("click", function () {
    try {
      var o = opts();
      save(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + buildSvg(o, o.size)], { type: "image/svg+xml" }), "pasiya-qr.svg");
    } catch (e) {}
  });
  $("dlPng").addEventListener("click", function () {
    var o = opts();
    svgToPng(buildSvg(o, o.size), o.size).then(function (b) { save(b, "pasiya-qr.png"); })
      .catch(function (e) { say($("upStatus"), "err", e.message); });
  });
  $("upQr").addEventListener("click", function () {
    var o = opts(), st = $("upStatus");
    state.busy = true; setActions(true);
    say(st, "", [spinner(), "Uploading QR..."]);
    svgToPng(buildSvg(o, o.size), o.size).then(function (b) {
      if (b.size <= MAX_BYTES) return b;
      var half = Math.max(512, Math.round(o.size / 2));
      return svgToPng(buildSvg(o, half), half);
    }).then(function (b) {
      return upload(b, "pasiya-qr-" + Date.now() + ".png");
    }).then(function (url) {
      linkBox(st, "QR uploaded:", url); histAdd(url);
    }).catch(function (e) {
      say(st, "err", e.message || "Upload failed.");
    }).then(function () { state.busy = false; setActions(!!state.svg); });
  });

  $("historyClear").addEventListener("click", function () { histSet([]); histDraw(); });

  histDraw();
  render();
})();
