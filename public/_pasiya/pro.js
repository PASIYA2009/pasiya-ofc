/* PASIYA PRO v6 - shared behaviour for every page. Vanilla JS, no dependencies, safe to load twice. */
(function () {
  'use strict';
  if (window.__psPro) return; window.__psPro = 1;
  var D = document, fine = matchMedia('(hover:hover) and (pointer:fine)').matches, calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $$ = function (s, r) { return [].slice.call((r || D).querySelectorAll(s)); };
  var home = !!D.querySelector('.hero .stage'); // portfolio already ships its own progress / glow / tilt in pasiyaofc-pro.js

  function boot() {
    // ambient dot grid behind everything
    if (!D.querySelector('.ps-gridbg')) { var g = D.createElement('div'); g.className = 'ps-gridbg'; g.setAttribute('aria-hidden', 'true'); D.body.insertBefore(g, D.body.firstChild); }

    if (!home) {
      var bar = D.createElement('div'); bar.className = 'ps-progress'; D.body.appendChild(bar);
      var prog = function () { var m = D.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (m > 0 ? scrollY / m : 0) + ')'; };
      addEventListener('scroll', prog, { passive: true }); addEventListener('resize', prog); prog();

      if (fine && !calm) {
        var gl = D.createElement('div'); gl.className = 'ps-glow'; D.body.appendChild(gl);
        var gx = 0, gy = 0, tx = 0, ty = 0, run = false;
        addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; gl.classList.add('on'); if (!run) { run = true; loop(); } }, { passive: true });
        D.addEventListener('pointerleave', function () { gl.classList.remove('on'); });
        var loop = function () { gx += (tx - gx) * .14; gy += (ty - gy) * .14; gl.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)'; requestAnimationFrame(loop); };
      }
    }

    // spotlight follows the pointer inside cards (event delegation = also works for cards React/JS adds later)
    D.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.tile,.skill,.link-card,.card,.ps-fx'); if (!c) return;
      var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    // 3D tilt for anything marked data-tilt (keeps text readable: small angles only)
    if (fine && !calm) $$('[data-tilt]').forEach(function (el) {
      var max = +el.dataset.tilt || 6, raf = 0;
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { el.style.transform = 'perspective(900px) rotateX(' + ((.5 - py) * max) + 'deg) rotateY(' + ((px - .5) * max * 1.2) + 'deg) translateY(-3px)'; });
      });
      el.addEventListener('pointerleave', function () { cancelAnimationFrame(raf); el.style.transform = ''; });
    });

    // reveal-on-scroll for pages that mark sections with data-reveal
    var els = $$('[data-reveal]');
    if (els.length) {
      if (calm || !('IntersectionObserver' in window)) els.forEach(function (n) { n.classList.add('in'); });
      else { var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .12 }); els.forEach(function (n) { io.observe(n); }); }
    }

    // copy buttons: <button data-copy="text">
    D.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
      var t = b.getAttribute('data-copy'), old = b.innerHTML;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () { var a = D.createElement('textarea'); a.value = t; D.body.appendChild(a); a.select(); try { D.execCommand('copy'); } catch (x) {} a.remove(); }).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.innerHTML = old; }, 1200); });
    });
  }
  if (D.body) boot(); else D.addEventListener('DOMContentLoaded', boot);
})();
