/* PASIYA OFC - shared comments.
   Everyone reads the same list (GET /api/comments). Only signed-in users can write (the name comes from their account).
   The admin (ADMIN_EMAIL) gets a Delete button on every comment; the server checks that again (POST /api/comments/delete). */
(function () {
  'use strict';
  var D = document, $ = function (s) { return D.querySelector(s); };
  var list = $('#commentsList'), box = $('#commentBox'), as = $('#commentAs'), txt = $('#commentText'), btn = $('#commentBtn'), cnt = $('#charCount'), msg = $('#commentMsg');
  if (!list || !box) return;
  var items = [], loaded = false, failed = false, busy = false, msgTimer;

  function say(t, cls) { msg.textContent = t || ''; msg.className = 'comment-msg' + (cls ? ' ' + cls : ''); clearTimeout(msgTimer); if (t && cls === 'good') msgTimer = setTimeout(function () { say(''); }, 3500); }
  function PS() { return window.PS || {}; }
  function signedIn() { return !!PS().user; }
  function isAdmin() { return !!(PS().me && PS().me.role === 'admin'); }
  function myName() { var P = PS(); return (P.me && P.me.username) || (P.user && (P.user.displayName || (P.user.email || '').split('@')[0])) || 'you'; }
  function token() {
    var P = PS(); if (!P.auth || !P.auth.currentUser) return Promise.reject(new Error('Please sign in first.'));
    return P.auth.currentUser.getIdToken();
  }
  function api(path, opts) {
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ')'); return d; });
    });
  }
  function authed(path, body) {
    return token().then(function (t) { return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) }); });
  }
  function loginHref() { return '/api/login?next=' + encodeURIComponent('/#comments'); }

  // ---- the write box: sign-in prompt / "commenting as" ----
  function renderBox() {
    var P = PS();
    if (!P.authReady) { as.textContent = 'Loading…'; box.classList.add('locked'); return; }
    if (!signedIn()) {
      box.classList.add('locked');
      as.innerHTML = '<span>Sign in to join the conversation.</span> <a class="comment-login" data-ps-login="login" href="' + loginHref() + '">Sign in</a> <a class="comment-login alt" data-ps-login="register" href="/api/register?next=' + encodeURIComponent('/#comments') + '">Register</a>';
      return;
    }
    box.classList.remove('locked');
    as.textContent = 'Commenting as ' + myName() + (isAdmin() ? ' (admin)' : '');
  }

  // ---- the list ----
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(); }
  function card(c) {
    var a = D.createElement('article'); a.className = 'comment'; a.dataset.id = c.id;
    var top = D.createElement('div'); top.className = 'comment-top';
    var n = D.createElement('div'); n.className = 'comment-name'; n.textContent = c.name;
    if (c.admin) { var b = D.createElement('span'); b.className = 'comment-badge'; b.textContent = 'ADMIN'; n.appendChild(b); }
    top.appendChild(n);
    if (isAdmin()) {
      var x = D.createElement('button'); x.type = 'button'; x.className = 'comment-del'; x.title = 'Delete this comment'; x.setAttribute('aria-label', 'Delete comment');
      x.innerHTML = '<i class="fa-solid fa-trash"></i> Delete'; x.dataset.del = c.id; top.appendChild(x);
    }
    var t = D.createElement('div'); t.className = 'comment-text'; t.textContent = c.text;
    var d = D.createElement('div'); d.className = 'comment-date'; d.textContent = when(c.createdAt);
    a.append(top, t, d); return a;
  }
  function renderList() {
    list.textContent = '';
    if (!loaded) { list.innerHTML = '<div class="comment-empty">Loading comments…</div>'; return; }
    if (failed && !items.length) { list.innerHTML = '<div class="comment-empty">Could not load comments. <a href="#comments" id="commentRetry">Try again</a></div>'; return; }
    if (!items.length) { list.innerHTML = '<div class="comment-empty">No comments yet. Be the first!</div>'; return; }
    var f = D.createDocumentFragment(); items.forEach(function (c) { f.appendChild(card(c)); }); list.appendChild(f);
  }
  function load() {
    return api('/api/comments?limit=50').then(function (d) { items = d.comments || []; failed = false; }).catch(function () { failed = true; })
      .then(function () { loaded = true; renderList(); });
  }

  // ---- post ----
  function counter() { cnt.textContent = txt.value.length + ' / 250'; }
  txt.addEventListener('input', counter); counter();
  btn.addEventListener('click', function () {
    if (busy) return;
    var text = txt.value.trim();
    if (!signedIn()) return say('Please sign in to comment.', 'bad');
    if (!text) return say('Write a comment first.', 'bad');
    busy = true; btn.disabled = true; say('Posting…');
    authed('/api/comments', { text: text }).then(function (d) {
      items.unshift(d.comment); txt.value = ''; counter(); say('Comment posted ✓', 'good'); renderList();
    }).catch(function (e) { say(e.message, 'bad'); }).then(function () { busy = false; btn.disabled = false; });
  });

  // ---- admin delete ----
  list.addEventListener('click', function (e) {
    var r = e.target.closest && e.target.closest('#commentRetry'); if (r) { e.preventDefault(); loaded = false; renderList(); load(); return; }
    var b = e.target.closest && e.target.closest('[data-del]'); if (!b || !isAdmin()) return;
    if (!confirm('Delete this comment for everyone?')) return;
    var id = b.dataset.del; b.disabled = true;
    authed('/api/comments/delete', { id: id }).then(function () {
      items = items.filter(function (c) { return c.id !== id; }); renderList(); say('Comment deleted.', 'good');
    }).catch(function (er) { b.disabled = false; say(er.message, 'bad'); });
  });

  // ---- keep in sync with the shared login (shell.js fires these) ----
  var shownAdmin = false; // ps:me repeats every few seconds: only redraw the list when the admin state really changed
  function sync() { renderBox(); if (isAdmin() !== shownAdmin) { shownAdmin = isAdmin(); renderList(); } }
  D.addEventListener('ps:user', function () { shownAdmin = null; sync(); });
  D.addEventListener('ps:me', sync);
  D.addEventListener('visibilitychange', function () { if (!D.hidden) load(); });
  setInterval(function () { if (!D.hidden && !busy) load(); }, 60000);
  renderBox(); renderList(); load();
  // shell.js may finish its auth check before or after this file: poll briefly so the box never stays on "Loading…"
  var n = 0, t = setInterval(function () { sync(); if (PS().authReady || ++n > 40) clearInterval(t); }, 250);
})();
