/* PASIYA link loader: the same orb loading screen, shown on EVERY link click (all sites that load shell.js).
   It wipes in from the tapped point, types "Opening <name>", fills a progress bar and stays until the new page takes over. */
(function () {
  if (window.__psNav) return; window.__psNav = 1;
  var D = document, reduce = false, el, sub, bar, pct, top, timer, typer, hideT, prog = 0, shown = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var NAMES = { '/': 'Home', '/api': 'PASIYA API', '/ai': 'PASIYA AI', '/qr': 'QR Editor', '/bot': 'WhatsApp Bot', '/pastpapers': 'Past Papers', '/music-admin': 'Music Admin' };

  function css() {
    if (D.querySelector('link[href*="loader.css"]')) return;
    var l = D.createElement('link'); l.rel = 'stylesheet'; l.href = '/_pasiya/loader.css'; D.head.appendChild(l);
  }
  function build() {
    if (el) return;
    css();
    top = D.createElement('div'); top.className = 'ps-navtop'; top.setAttribute('aria-hidden', 'true');
    el = D.createElement('div'); el.id = 'psNav'; el.className = 'ps-loader ps-nav'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="ps-orb"><i></i><i></i><i></i><b>P</b></div><div class="ps-brand">PASIYA OFC</div><div class="ps-sub"><span></span><i></i></div><div class="ps-bar"><span></span></div><div class="ps-pct">0%</div>';
    sub = el.querySelector('.ps-sub span'); bar = el.querySelector('.ps-bar span'); pct = el.querySelector('.ps-pct');
    D.body.appendChild(top); D.body.appendChild(el);
  }
  function typeText(t) {
    clearInterval(typer); sub.textContent = '';
    if (reduce) { sub.textContent = t; return; }
    var i = 0; typer = setInterval(function () { sub.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(typer); }, 32);
  }
  function setP(p) { prog = p; bar.parentNode.style.setProperty('--p', (p / 100).toFixed(3)); bar.style.setProperty('--p', (p / 100).toFixed(3)); pct.textContent = Math.round(p) + '%'; }

  function show(name, x, y) {
    if (shown) return; shown = true;
    build();
    var w = innerWidth, h = innerHeight;
    if (!(x > 0 || y > 0)) { x = w / 2; y = h / 2; }
    el.style.setProperty('--cx', x + 'px'); el.style.setProperty('--cy', y + 'px');
    setP(0); typeText('Opening ' + (name || 'page'));
    void el.offsetWidth;
    el.classList.add('ps-on'); top.classList.add('ps-on');
    clearInterval(timer);
    timer = setInterval(function () { setP(prog + Math.max(0.4, (92 - prog) * 0.07)); }, 120);
    clearTimeout(hideT); hideT = setTimeout(hide, 9000); // safety: download / blocked navigation
  }
  function hide() {
    shown = false; clearInterval(timer); clearInterval(typer); clearTimeout(hideT);
    if (!el) return;
    el.classList.remove('ps-on'); top.classList.remove('ps-on');
  }

  function nameOf(a, u) {
    if (a.getAttribute('data-ps-name')) return a.getAttribute('data-ps-name');
    if (u.origin === location.origin) {
      var p = u.pathname.replace(/\/+$/, '') || '/';
      if (NAMES[p]) return NAMES[p];
    } else if (/pastpaper/i.test(u.hostname)) return 'Past Papers';
    var c = a.cloneNode(true), junk = c.querySelectorAll('small,b,i,svg,.arrow,.badge'); for (var k = 0; k < junk.length; k++) junk[k].remove();
    var t = (c.textContent || '').replace(/\s+/g, ' ').trim();
    if (t && t.length <= 28) return t;
    return u.hostname.replace(/^www\./, '');
  }

  D.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.closest('[data-no-loader]')) return;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) === '#' || /^(javascript|mailto|tel|sms|blob|data):/i.test(h)) return;
    var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search) return;
    var x = e.clientX, y = e.clientY;
    setTimeout(function () { if (!e.defaultPrevented) show(nameOf(a, u), x, y); }, 0); // after other click handlers had their say
  });
  addEventListener('pageshow', function (e) { if (e.persisted) hide(); }); // back button
  window.PSNav = { show: show, hide: hide };
})();
