/* PASIYA shared scroll animation: cards / panels / buttons animate every time they scroll into view (up or down).
   Loaded by shell.js on every site except the portfolio (which uses /pasiya-fx.js). */
(function () {
  'use strict';
  var D = document, ROLE = window.PS_ROLE || '';
  if (ROLE === 'ofc' || window.__psReveal) return; window.__psReveal = 1;
  var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce || !('IntersectionObserver' in window)) return;

  if (!D.querySelector('link[href*="reveal.css"]')) { var l = D.createElement('link'); l.rel = 'stylesheet'; l.href = '/_pasiya/reveal.css'; D.head.appendChild(l); }

  var FOOT = [['.ps-footer .brand'], ['.ps-footer > p'], ['.ps-footer .ps-info > *'], ['.ps-footer .ps-social a', 'pop'], ['.ps-footer .ps-copy']];
  var BY_ROLE = {
    qr:  [['.hero'], ['.layout .card', 'side'], ['.preview-col', 'zoom'], ['.history', 'zoom']],
    bot: [['.top'], ['.card', 'side'], ['.steps', 'zoom']],
    ai:  [['.welcome', 'zoom']],
    api: [], // the API dashboard has its own light reveal (fx.js); running both hid panels / left them blank while scrolling
    '':  [['.hero'], ['.card', 'side'], ['.panel', 'zoom']]
  };
  var SPEC = (BY_ROLE[ROLE] || BY_ROLE['']).concat(ROLE === 'ai' ? [] : FOOT);
  var io, pending = [], flushT;

  function flush() {
    flushT = 0;
    var b = pending.splice(0).sort(function (x, y) { return (x.compareDocumentPosition(y) & 4) ? -1 : 1; });
    b.forEach(function (el, i) { el.style.setProperty('--d', (b.length > 1 ? Math.min(i * 0.09, 0.6) : 0).toFixed(2) + 's'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); });
  }
  function onHit(es) {
    es.forEach(function (en) {
      var el = en.target;
      if (en.isIntersecting) { if (!el.classList.contains('in') && pending.indexOf(el) < 0) pending.push(el); }
      else { var i = pending.indexOf(el); if (i > -1) pending.splice(i, 1); }
    });
    if (pending.length && !flushT) flushT = setTimeout(flush, 16);
  }
  function prep() {
    SPEC.forEach(function (s) {
      D.querySelectorAll(s[0]).forEach(function (el, i) {
        if (el.dataset.psFx || el.closest('.psb,.psd,.ps-loader,#ytWrap')) return;
        el.dataset.psFx = '1'; el.classList.add('ps-anim');
        if (s[1] === 'side') el.classList.add(i % 2 ? 'from-r' : 'from-l'); else if (s[1]) el.classList.add(s[1]);
        io.observe(el);
      });
    });
  }
  function sweep() { // safety net: anything on or above the screen is shown, even if the observer missed it (fast scroll, tall elements, restored scroll position)
    var h = innerHeight; D.querySelectorAll('.ps-anim:not(.in)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < h * 1.05) { el.style.setProperty('--d', '0s'); el.classList.add('in'); } });
  }
  function init() {
    try {
      var sw; addEventListener('scroll', function () { clearTimeout(sw); sw = setTimeout(sweep, 160); }, { passive: true }); setTimeout(sweep, 1500); setInterval(sweep, 4000);
      io = new IntersectionObserver(onHit, { threshold: [0, 0.12], rootMargin: '0px 0px -4% 0px' });
      prep(); addEventListener('load', prep); setTimeout(prep, 1200); setTimeout(prep, 3500); // footer / late-built elements
      addEventListener('error', function () { D.querySelectorAll('.ps-anim').forEach(function (e) { e.classList.add('in'); }); }, { once: true });
    } catch (e) { D.querySelectorAll('.ps-anim').forEach(function (e2) { e2.classList.add('in'); }); }
  }
  // wait for the loading screen to leave, then animate
  var ld = D.getElementById('ps-loader');
  if (!ld || ld.classList.contains('ps-hide')) init();
  else { var done = false, go = function () { if (done) return; done = true; mo.disconnect(); setTimeout(init, 120); }, mo = new MutationObserver(function () { if (ld.classList.contains('ps-hide') || !D.body.contains(ld)) go(); }); mo.observe(ld, { attributes: true, attributeFilter: ['class'] }); setTimeout(go, 4000); }
})();
