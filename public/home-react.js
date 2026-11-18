/* PASIYA API Explorer - React 18 (UMD from cdnjs, no build step). Progressive enhancement:
   the static fallback inside #explorer stays if React / the API is unavailable. */
(function () {
  var root = document.getElementById('explorer-root');
  if (!root) return;
  var tries = 0;
  (function wait() {
    if (window.React && window.ReactDOM) return mount();
    if (++tries < 60) setTimeout(wait, 250);
  })();

  function mount() {
    var h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo;
    var ORIGIN = location.origin;
    var SAMPLE = [
      { path: '/api/youtube', category: 'Downloads', name: 'YouTube', desc: 'Video and audio links.' },
      { path: '/api/ai', category: 'AI', name: 'AI Chat', desc: 'Ask free AI models.' },
      { path: '/api/news', category: 'News', name: 'News', desc: 'Sri Lanka news feeds.' },
      { path: '/api/weather', category: 'Utility', name: 'Weather', desc: 'Current weather.' }
    ];

    function Explorer() {
      var _a = useState(SAMPLE), apis = _a[0], setApis = _a[1];
      var _b = useState('All'), cat = _b[0], setCat = _b[1];
      var _c = useState(''), q = _c[0], setQ = _c[1];
      var _d = useState(null), live = _d[0], setLive = _d[1];
      var _e = useState(null), sel = _e[0], setSel = _e[1];

      useEffect(function () {
        fetch('/api/catalog', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.apis && j.apis.length) { setApis(j.apis); setSel(j.apis[0]); setLive(true); } else setLive(false);
        }).catch(function () { setLive(false); setSel(SAMPLE[0]); });
      }, []);

      var cats = useMemo(function () { var s = {}; apis.forEach(function (a) { s[a.category || 'Other'] = 1; }); return ['All'].concat(Object.keys(s)); }, [apis]);
      var list = useMemo(function () {
        var t = q.trim().toLowerCase();
        return apis.filter(function (a) { return (cat === 'All' || a.category === cat) && (!t || (a.name + ' ' + a.path + ' ' + (a.desc || '')).toLowerCase().indexOf(t) >= 0); });
      }, [apis, cat, q]);
      var cur = sel || list[0];
      var curl = cur ? 'curl "' + ORIGIN + cur.path + '?apikey=YOUR_KEY"' : '';

      return h('div', { className: 'xp' },
        h('div', { className: 'xp-bar' },
          h('span', { className: 'xp-live' + (live ? ' on' : '') }, live === null ? 'connecting…' : live ? 'live · ' + apis.length + ' APIs' : 'preview'),
          h('input', { className: 'xp-q', value: q, placeholder: 'Search APIs…', 'aria-label': 'Search APIs', onChange: function (e) { setQ(e.target.value); } })),
        h('div', { className: 'xp-chips' }, cats.slice(0, 9).map(function (c) {
          return h('button', { key: c, type: 'button', className: 'xp-chip' + (c === cat ? ' on' : ''), onClick: function () { setCat(c); } }, c);
        })),
        h('div', { className: 'xp-grid' },
          h('div', { className: 'xp-list', role: 'list' }, list.length ? list.slice(0, 60).map(function (a) {
            return h('button', { key: a.path, type: 'button', role: 'listitem', className: 'xp-item' + (cur && cur.path === a.path ? ' on' : ''), onClick: function () { setSel(a); } },
              h('b', null, a.name || a.path), h('code', null, 'GET ' + a.path));
          }) : h('p', { className: 'xp-empty' }, 'No API matches.')),
          h('div', { className: 'xp-detail' }, cur ? [
            h('small', { key: 's', className: 'ps-kicker' }, cur.category || 'API'),
            h('h3', { key: 'h' }, cur.name || cur.path),
            h('p', { key: 'p' }, cur.desc || 'Part of the free PASIYA API.'),
            h('pre', { key: 'c' }, h('code', null, curl)),
            h('div', { key: 'b', className: 'xp-actions' },
              h('button', { type: 'button', className: 'btn primary', 'data-copy': curl }, 'Copy curl'),
              h('a', { className: 'btn', href: '/api' }, 'Open docs ↗'))
          ] : null)));
      }

    ReactDOM.createRoot(root).render(h(Explorer));
    root.setAttribute('data-ready', '1');
  }
})();
