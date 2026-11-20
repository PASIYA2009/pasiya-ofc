/* PASIYA FX: (1) every card / button / heading animates when it scrolls into view  (2) auto-typing terminal */
(function () {
  'use strict';
  var D = document, reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ===================== 1. SCROLL REVEAL ===================== */
  var SPEC = [
    ['.profile .photo-wrap', 'zoom'], ['.profile .status-pill'], ['.profile h1'], ['.profile .typing-line'], ['.profile .intro'], ['.profile .scroll-hint', 'pop'],
    ['.section-heading'], ['.section-subtitle'],
    ['.link-grid .link-card', 'side'], ['.skills .skill', 'pop'],
    ['.about-card', 'zoom'], ['.ps-terminal', 'zoom'], ['.comment-box', 'zoom'], ['.comments-list .comment', 'none'],
    ['.ps-footer .brand'], ['.ps-footer > p'], ['.ps-footer .ps-info > *'], ['.ps-footer .ps-social a', 'pop'], ['.ps-footer .ps-copy']
  ];
  var io, pending = [], flushT;

  function flush() {
    flushT = 0;
    var batch = pending.splice(0).sort(function (a, b) { return (a.compareDocumentPosition(b) & 4) ? -1 : 1; });
    batch.forEach(function (el, i) { el.style.setProperty('--d', (batch.length > 1 ? Math.min(i * 0.09, 0.6) : 0).toFixed(2) + 's'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); });
  }
  function onHit(entries) {
    entries.forEach(function (en) {
      var el = en.target;
      if (en.isIntersecting) { if (!el.classList.contains('in') && pending.indexOf(el) < 0) pending.push(el); }
      else { var i = pending.indexOf(el); if (i > -1) pending.splice(i, 1); el.classList.remove('in'); } // fully out of view -> reset, so it animates again next time
    });
    if (pending.length && !flushT) flushT = setTimeout(flush, 16);
  }
  function prep() {
    var seen = 0;
    SPEC.forEach(function (s) {
      D.querySelectorAll(s[0]).forEach(function (el, i) {
        if (el.dataset.psFx || s[1] === 'none') return;
        el.dataset.psFx = '1'; el.classList.add('ps-anim');
        var v = s[1];
        if (v === 'side') { el.classList.add(el.classList.contains('wide') ? 'zoom' : (i % 2 ? 'from-r' : 'from-l')); }
        else if (v) el.classList.add(v);
        io.observe(el); seen++;
      });
    });
  }
  function initReveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    try {
      io = new IntersectionObserver(onHit, { threshold: [0, 0.12], rootMargin: '0px 0px -4% 0px' });
      prep();
      addEventListener('load', prep);           // footer / late elements
      setTimeout(prep, 1200);
      addEventListener('error', function () { D.querySelectorAll('.ps-anim').forEach(function (e) { e.classList.add('in'); }); }, { once: true });
    } catch (e) { D.querySelectorAll('.ps-anim').forEach(function (e2) { e2.classList.add('in'); }); }
  }
  // hero animates only after the big loading screen is gone
  (function waitLoader() {
    var l = D.getElementById('ps-loader');
    if (!l || l.classList.contains('ps-hide') || reduce) return initReveal();
    var done = false, go = function () { if (done) return; done = true; mo.disconnect(); setTimeout(initReveal, 120); };
    var mo = new MutationObserver(function () { if (l.classList.contains('ps-hide')) go(); });
    mo.observe(l, { attributes: true, attributeFilter: ['class'] });
    setTimeout(go, 8000);
  })();

  /* ===================== 2. TERMINAL ===================== */
  var root = D.getElementById('terminal');
  if (!root) return;
  var log = D.getElementById('psTermLog'), typed = D.getElementById('psTermTyped'), chips = root.querySelectorAll('.ps-term-chip');
  var PROMPT = 'pasidu@pasiya:~$';
  var input = { set value(v) { typed.textContent = v; }, get value() { return typed.textContent; }, readOnly: true, placeholder: '' };
  var busy = false, skip = false, userTook = false, hist = [], hi = 0, started = false;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toEnd() { log.scrollTop = log.scrollHeight; }
  function link(href, text) { return '<a class="ps-term-link" href="' + href + '">' + text + '</a>'; }
  function kv(k, d) { return '<span class="k">' + k + '</span><span class="d">' + d + '</span>'; }

  /* type the TEXT of an html string, keeping its tags (so <strong> / links stay intact) */
  function typeInto(el, html, delay) {
    return new Promise(function (res) {
      el.innerHTML = html;
      if (reduce || skip) { res(); return; }
      var w = D.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
      while ((n = w.nextNode())) { nodes.push([n, n.nodeValue]); n.nodeValue = ''; }
      var ni = 0, ci = 0;
      (function step() {
        if (skip) { nodes.forEach(function (p) { p[0].nodeValue = p[1]; }); toEnd(); res(); return; }
        for (var k = 0; k < 2 && ni < nodes.length; k++) { var p = nodes[ni]; ci++; p[0].nodeValue = p[1].slice(0, ci); if (ci >= p[1].length) { ni++; ci = 0; } }
        toEnd();
        if (ni >= nodes.length) res(); else setTimeout(step, delay);
      })();
    });
  }
  /* type a command into the prompt, key by key */
  async function typeCmd(str, isDemo) {
    input.readOnly = true; input.value = '';
    for (var i = 0; i < str.length; i++) {
      if (isDemo && userTook) { input.value = ''; input.readOnly = false; return; }
      if (skip || reduce) { input.value = str; break; }
      input.value = str.slice(0, i + 1);
      await sleep(48 + Math.random() * 55);
    }
    await sleep(reduce ? 0 : 260);
  }

  var LINKS = { api: ['/api', 'PASIYA API'], ai: ['/ai', 'PASIYA AI'], qr: ['/qr', 'QR Editor'], bot: ['/bot', 'WhatsApp Bot'], papers: ['https://pastpaper-pro.vercel.app', 'Past Papers'], pastpapers: ['https://pastpaper-pro.vercel.app', 'Past Papers'] };

  var CMD = {
    help: function () { return [
      'Available commands:',
      kv('<strong>whoami</strong>', 'who is behind PASIYA'),
      kv('<strong>about</strong>', 'a short story'),
      kv('<strong>projects</strong>', 'the digital ecosystem'),
      kv('<strong>skills</strong>', 'development toolkit'),
      kv('<strong>stack</strong>', 'how this site is built'),
      kv('<strong>neofetch</strong>', 'system info'),
      kv('<strong>status</strong>', 'live health check'),
      kv('<strong>contact</strong>', 'say hello'),
      kv('<strong>open</strong> &lt;name&gt;', 'api · ai · qr · bot · papers'),
      kv('<strong>ls</strong> · <strong>pwd</strong> · <strong>date</strong> · <strong>echo</strong>', 'the usual'),
      kv('<strong>clear</strong>', 'wipe the screen'),
      '<span class="d">tap any command below · tap the terminal to skip the typing</span>'
    ]; },
    whoami: function () { return ['Creator: <strong>Pasidu Eshan</strong>', 'Alias: Pasidu OFC · PASIYA Official', 'Workspace: PASIYA Digital Ecosystem', 'Location: Sri Lanka \uD83C\uDDF1\uD83C\uDDF0', 'Mode: <em>Creative development</em>']; },
    about: function () { return ['I build websites, software projects and digital experiences.', 'Free APIs, an AI assistant, a QR editor, a WhatsApp bot and past papers', 'all live under one domain with <strong>one login</strong> and <strong>one theme</strong>.', '<span class="d">Code. Create. Learn. Build.</span>']; },
    projects: function () { return ['<strong>PROJECT MODULES</strong>',
      '01 \u00B7 ' + link('/api', 'PASIYA API') + ' <span class="d">free developer platform</span>',
      '02 \u00B7 ' + link('/ai', 'PASIYA AI') + ' <span class="d">chat &amp; code assistant</span>',
      '03 \u00B7 ' + link('/qr', 'QR Editor') + ' <span class="d">design &amp; export QR codes</span>',
      '04 \u00B7 ' + link('/bot', 'WhatsApp Bot') + ' <span class="d">pair web</span>',
      '05 \u00B7 ' + link('https://pastpaper-pro.vercel.app', 'Past Papers') + ' <span class="d">education</span>']; },
    skills: function () { return ['<strong>TOOLKIT</strong>',
      kv('HTML', 'structure'), kv('CSS', 'design'), kv('JavaScript', 'interaction'), kv('Python', 'programming'), kv('PHP', 'backend'), kv('MySQL', 'database')]; },
    stack: function () { return ['<strong>THIS SITE</strong>', kv('Front-end', 'HTML \u00B7 CSS \u00B7 vanilla JS'), kv('Hosting', 'Vercel (static + serverless)'), kv('Auth', 'Firebase (one login for every site)'), kv('AI', 'Gemini via /api/ai-chat'), kv('Theme', '8 accent colours, shared everywhere')]; },
    neofetch: function () { var acc = D.documentElement.dataset.accent || 'blue'; return [
      { t: '   ____    \n  |  _ \\   \n  | |_) |  \n  |  __/   \n  |_|      ', c: 'art' },
      '<strong>pasidu</strong>@<strong>pasiya</strong>', '<span class="d">---------------</span>',
      kv('OS', 'PASIYA OFC'), kv('Host', location.host || 'localhost'), kv('Shell', 'pasiya-sh (demo)'), kv('Theme', acc + ' accent'),
      kv('Modules', '5 projects'), kv('Language', 'Sinhala \u00B7 English'), kv('Location', 'Sri Lanka')]; },
    contact: function () { return ['Let\u2019s build something:', kv('WhatsApp', link('https://wa.me/94741500792', 'wa.me/94741500792')), kv('Website', location.host || 'localhost')]; },
    date: function () { try { return [new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'full', timeStyle: 'medium' }) + ' <span class="d">(Sri Lanka)</span>']; } catch (e) { return [new Date().toString()]; } },
    pwd: function () { return ['/home/pasidu/pasiya-ofc']; },
    ls: function () { return ['<strong>api/</strong>  <strong>ai/</strong>  <strong>qr/</strong>  <strong>bot/</strong>  <strong>pastpapers/</strong>  about.txt  skills.txt']; },
    status: async function () {
      var out = ['Sri Lanka time: <em>' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo' }) + '</em>'], ok = false;
      try { var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 3000), r = await fetch('/api/health', { cache: 'no-store', signal: c.signal }); clearTimeout(t); var j = await r.json(); ok = !!(j && j.ok); } catch (e) {}
      out.push(ok ? 'PASIYA API ........ <em>online \u2713</em>' : { t: 'PASIYA API ........ unreachable from here', c: 'warn' });
      return out;
    }
  };

  async function respond(raw) {
    var parts = raw.trim().split(/\s+/), name = parts[0].toLowerCase(), arg = parts.slice(1).join(' ');
    if (name === 'clear' || name === 'cls') return '__clear__';
    if (name === 'echo') return [esc(arg)];
    if (name === 'open' || name === 'cd') {
      var t = LINKS[arg.toLowerCase().replace(/\/$/, '')];
      if (!t) return [{ t: 'usage: open &lt;api | ai | qr | bot | papers&gt;', c: 'warn' }];
      setTimeout(function () { if (window.PSNav) window.PSNav.show(t[1]); location.href = t[0]; }, 700);
      return ['Opening <em>' + t[1] + '</em> \u2026'];
    }
    if (name === 'sudo') return /hire/i.test(arg) ? [{ t: 'Permission granted \u2713', c: 'ok' }, 'Say hi on ' + link('https://wa.me/94741500792', 'WhatsApp') + ' \uD83D\uDE04'] : [{ t: 'pasidu is not in the sudoers file. This incident will be reported. \uD83D\uDE04', c: 'warn' }];
    if (name === 'hello' || name === 'hi') return ['Hey! Try <strong>help</strong> or <strong>projects</strong>.'];
    if (CMD[name]) return await CMD[name](arg);
    return [{ t: esc(name) + ': command not found. Type <strong>help</strong>.', c: 'warn' }];
  }

  async function exec(raw) {
    busy = true; input.readOnly = true; root.classList.add('is-typing');
    var cmd = raw.trim();
    if (cmd) { hist.push(cmd); hi = hist.length; }
    var echo = D.createElement('div'); echo.className = 'ps-term-row ps-term-echo';
    echo.innerHTML = '<span class="ps-term-prompt">' + PROMPT + '</span><span class="ps-term-command"></span>';
    echo.lastChild.textContent = cmd; log.appendChild(echo);
    input.value = ''; toEnd();
    if (cmd) {
      var out = await respond(cmd);
      if (out === '__clear__') { log.innerHTML = ''; }
      else for (var i = 0; i < out.length; i++) {
        var o = out[i], row = D.createElement('div'); row.className = 'ps-term-row out';
        if (o && o.c) { row.className += ' ' + o.c; if (o.c === 'art') row.className = 'ps-term-row art'; o = o.t; }
        log.appendChild(row); await typeInto(row, o, 11);
      }
    }
    skip = false; busy = false; input.readOnly = false; root.classList.remove('is-typing'); toEnd();
  }

  var running = false;
  async function demo() {
    running = true;
    var seq = ['whoami', 'projects', 'skills', 'neofetch'];
    for (var i = 0; i < seq.length && !userTook; i++) {
      await typeCmd(seq[i], true); if (userTook) { input.value = ''; break; }
      await exec(seq[i]);
      if (i < seq.length - 1) await sleep(reduce ? 0 : 900);
    }
    input.value = ''; running = false;
  }
  function start() { started = true; log.innerHTML = ''; demo(); }

  /* user takes over: stop the demo, let them type */
  function takeOver() { if (userTook) return; userTook = true; skip = busy; }
  root.addEventListener('pointerdown', function (e) { if (e.target.closest('.ps-term-chip')) return; if (busy) skip = true; });

  chips.forEach(function (b) {
    b.addEventListener('click', async function () {
      takeOver(); skip = true; while (busy) await sleep(30); skip = false;
      var c = b.dataset.cmd; await typeCmd(c); await exec(c); input.readOnly = false;
    });
  });

  /* plays when the terminal scrolls into view, and again every time it comes back (until someone taps a command) */
  if ('IntersectionObserver' in window) {
    var inView = false, tio = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (x.isIntersecting && x.intersectionRatio >= 0.35) { if (!inView) { inView = true; if (!userTook && !running && !busy) setTimeout(start, 350); } }
        else if (!x.isIntersecting) inView = false;
      });
    }, { threshold: [0, 0.35] });
    tio.observe(root);
  } else start();
})();
