(function () {
  'use strict';

  // Mencegah double-inject jika frame ter-reload
  if (window.__IRIL_CORE_LOADED__) return;
  window.__IRIL_CORE_LOADED__ = true;

  var VERSION = 'V1';
  var loaderBridge = window.__IRIL_LOADER__ || {
    isPatched: function () { return false; },
    restore: function () {}
  };

  var CFG_KEY = 'sp_cfg_esp_v1';
  var DEF = { esp: true, box: true, name: true, hp: true, dist: true, tracer: false, maxDist: 200 };
  var cfg = {};
  try { cfg = Object.assign({}, DEF, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { cfg = Object.assign({}, DEF); }
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }

  var FA_LINK = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
  var CSS = [
    '#spesp-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font:11px/1.4 "Segoe UI",Tahoma,sans-serif}',
    '#spesp-world{position:absolute;inset:0;overflow:hidden}',
    '.spesp-box{position:absolute;left:0;top:0;box-sizing:border-box;border:1px solid #ff3b3b;transform-origin:0 0;will-change:transform,width,height}',
    '.spesp-name{position:absolute;left:50%;bottom:100%;transform:translate(-50%,-2px);white-space:nowrap;font:600 10px/1.2 "Segoe UI",Tahoma;color:#fff;background:rgba(0,0,0,.55);padding:0 4px;border-radius:2px}',
    '.spesp-hp{position:absolute;left:0;right:0;bottom:-4px;height:2px;background:rgba(0,0,0,.55);overflow:hidden}',
    '.spesp-hp i{display:block;height:100%;background:#4ade80}',
    '.spesp-dist{position:absolute;left:50%;top:100%;transform:translate(-50%,2px);font:600 9px/1 "Segoe UI",Tahoma;color:#fbbf24;white-space:nowrap}',
    '.spesp-tracer{position:absolute;left:0;top:0;height:1.5px;transform-origin:0 50%;pointer-events:none;will-change:transform,width;background:linear-gradient(90deg,rgba(255,59,59,0),rgba(255,59,59,.8))}',
    '#spesp-panel{position:fixed;left:10px;top:10px;z-index:2147483002;background:rgba(12,12,14,.94);border:1px solid #2c2c31;border-radius:5px;color:#d7d7dc;font:11px/1.45 "Segoe UI",Tahoma;pointer-events:auto;width:212px;box-shadow:0 4px 18px rgba(0,0,0,.55)}',
    '#spesp-head{display:flex;align-items:center;justify-content:space-between;padding:7px 9px;cursor:move;user-select:none;border-bottom:1px solid #26262b;background:linear-gradient(90deg,#101013,#18181c)}',
    '#spesp-head b{color:#4ade80;font-size:11px;letter-spacing:.4px;white-space:nowrap}',
    '#spesp-head .spesp-btns{display:flex;gap:4px}',
    '.spesp-ibtn{background:#202024;border:1px solid #38383e;color:#c9c9cf;width:17px;height:17px;font-size:9px;border-radius:3px;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center}',
    '.spesp-ibtn:hover{background:#2c2c33;color:#4ade80}',
    '#spesp-body{padding:6px 8px 8px;max-height:min(52dvh,380px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;-webkit-overflow-scrolling:touch}',
    '#spesp-panel.spesp-min #spesp-body{display:none}',
    '#spesp-panel.spesp-min{width:auto}',
    '.spesp-sec{padding:4px 0 6px;border-bottom:1px solid #1f1f24}',
    '.spesp-sec:last-child{border-bottom:0}',
    '.spesp-sect{display:flex;align-items:center;gap:5px;font:700 9.5px "Segoe UI",Tahoma;color:#4ade80;letter-spacing:.6px;margin-bottom:3px}',
    '.spesp-sect i{font-size:9px}',
    '.spesp-row{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:2.5px 0;cursor:pointer}',
    '.spesp-row span{flex:1;font-size:10.5px}',
    '.spesp-row i{color:#8f8f98;width:13px;margin-right:2px;font-size:9px}',
    '.spesp-row input[type=checkbox]{appearance:none;-webkit-appearance:none;width:26px;height:15px;border-radius:8px;background:#26262b;position:relative;outline:none;transition:.15s;flex:0 0 auto;margin:0;cursor:pointer}',
    '.spesp-row input[type=checkbox]:checked{background:#4ade80}',
    '.spesp-row input[type=checkbox]:before{content:"";position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#9a9aa2;transition:.15s}',
    '.spesp-row input[type=checkbox]:checked:before{left:13px;background:#fff}',
    '.spesp-slider{display:flex;align-items:center;gap:6px;padding:2.5px 0}',
    '.spesp-slider span{flex:0 0 52px;font-size:10.5px;color:#c2c2c9}',
    '.spesp-slider input{flex:1;accent-color:#4ade80;margin:0;height:3px}',
    '.spesp-slider b{width:26px;text-align:right;color:#4ade80;font-weight:600;font-size:9.5px}'
  ].join('\n');

  var espMap = new Map(), tracerMap = new Map();
  var root, world, panel;

  function row(label, key, icon) {
    return '<label class="spesp-row"><span>' + (icon ? '<i class="fa-solid ' + icon + '"></i>' : '') + label + '</span>' +
      '<input type="checkbox" data-k="' + key + '"></label>';
  }
  function slider(label, key, min, max, step) {
    return '<div class="spesp-slider"><span>' + label + '</span><input type="range" data-k="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '"><b>0</b></div>';
  }

  function buildUI() {
    if (document.getElementById('spesp-root')) return;
    var fa = document.createElement('link');
    fa.rel = 'stylesheet'; fa.href = FA_LINK;
    (document.head || document.documentElement).appendChild(fa);
    var st = document.createElement('style');
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);

    root = document.createElement('div');
    root.id = 'spesp-root';
    world = document.createElement('div');
    world.id = 'spesp-world';
    root.appendChild(world);
    document.body.appendChild(root);

    panel = document.createElement('div');
    panel.id = 'spesp-panel';
    var h = '<div id="spesp-head"><b><i class="fa-solid fa-bolt" style="color:#4ade80;margin-right:5px"></i>IRILMODZ <span style="color:#9a9aa2;font-weight:600">' + VERSION + '</span></b>' +
      '<div class="spesp-btns"><button type="button" class="spesp-ibtn" id="spesp-min">–</button></div></div>';
    h += '<div id="spesp-body">';
    h += '<div class="spesp-sec"><div class="spesp-sect"><i class="fa-solid fa-eye"></i> ESP</div>';
    h += row('Master', 'esp', 'fa-eye') + row('Box', 'box', 'fa-vector-square') + row('Name', 'name', 'fa-tag') + row('Health', 'hp', 'fa-heart') + row('Distance', 'dist', 'fa-ruler') + row('Tracer', 'tracer', 'fa-arrow-trend-up');
    h += slider('Max dist', 'maxDist', 20, 500, 10);
    h += '</div>';
    h += '<div class="spesp-sec"><div class="spesp-sect"><i class="fa-solid fa-circle-info"></i> INFO</div>';
    h += '<div id="spesp-info" style="color:#a1a1aa;font-size:9.5px;line-height:1.6;white-space:pre-wrap">IRILMODZ ' + VERSION + '\nmenunggu engine…</div>';
    h += '</div>';
    h += '</div>';
    panel.innerHTML = h;
    document.body.appendChild(panel);

    panel.querySelectorAll('input[type=checkbox]').forEach(function (inp) {
      var k = inp.dataset.k;
      inp.checked = !!cfg[k];
      inp.addEventListener('change', function () { cfg[k] = inp.checked; saveCfg(); });
    });
    panel.querySelectorAll('input[type=range]').forEach(function (inp) {
      var k = inp.dataset.k;
      var out = inp.parentNode.querySelector('b');
      inp.value = cfg[k]; out.textContent = inp.value;
      inp.addEventListener('input', function () { cfg[k] = +inp.value; out.textContent = inp.value; saveCfg(); });
    });
    panel.querySelector('#spesp-min').addEventListener('click', function (ev) {
      ev.stopPropagation();
      panel.classList.toggle('spesp-min');
      this.textContent = panel.classList.contains('spesp-min') ? '+' : '–';
    });

    // drag (mouse + touch)
    (function () {
      var head = panel.querySelector('#spesp-head');
      var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      function move(x, y) {
        if (!dragging) return;
        panel.style.left = Math.max(0, Math.min(innerWidth - 60, ox + (x - sx))) + 'px';
        panel.style.top = Math.max(0, Math.min(innerHeight - 24, oy + (y - sy))) + 'px';
      }
      head.addEventListener('pointerdown', function (ev) {
        if (ev.target.closest('.spesp-ibtn')) return;
        dragging = true; sx = ev.clientX; sy = ev.clientY;
        var r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
        head.setPointerCapture && head.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      });
      head.addEventListener('pointermove', function (ev) { move(ev.clientX, ev.clientY); });
      head.addEventListener('pointerup', function () { dragging = false; });
      head.addEventListener('pointercancel', function () { dragging = false; });
      head.addEventListener('touchstart', function (ev) {
        if (ev.target.closest('.spesp-ibtn')) return;
        var t = ev.touches[0];
        dragging = true; sx = t.clientX; sy = t.clientY;
        var r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
      }, { passive: true });
      head.addEventListener('touchmove', function (ev) {
        if (!dragging) return;
        var t = ev.touches[0]; move(t.clientX, t.clientY);
      }, { passive: true });
      head.addEventListener('touchend', function () { dragging = false; }, { passive: true });
      ['pointerdown', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(function (t) {
        panel.addEventListener(t, function (ev) { ev.stopPropagation(); }, { passive: false });
      });
    })();

    lastStatus = '';
  }

  function setStatus(txt, off) {
    var info = document.getElementById('spesp-info');
    if (info && info.textContent !== txt) {
      info.textContent = txt;
      info.style.color = off ? '#ef4444' : '#a1a1aa';
    }
  }

  function getCanvas() {
    try { return (window.__pbR && window.__pbR.domElement) || null; } catch (e) { return null; }
  }
  function getVec3(E) {
    try { return new E.camera.position.constructor(); } catch (e) { return null; }
  }
  function actorPos(a, v3) {
    var feet = null;
    try { if (typeof a.feet === 'function') { a.feet(v3); feet = v3.clone(); } } catch (e) {}
    if (!feet) try { if (a.player && typeof a.player.getFeet === 'function') { feet = a.player.getFeet(); if (feet) feet = feet.clone(); } } catch (e) {}
    if (!feet) try { if (a.pos) feet = v3.set(a.pos[0], a.pos[1], a.pos[2]).clone(); } catch (e) {}
    return feet;
  }
  function actorHead(a, feet) {
    var h = 1.7;
    try { if (typeof a.isCrouching === 'function' && a.isCrouching()) h = 1.0; } catch (e) {}
    var v = feet.clone(); v.y += h;
    return v;
  }
  function isEnemy(a, me) {
    if (!a || !me) return false;
    if (me.team == null || a.team == null) return true;
    return a.team !== me.team;
  }

  function ensureBox(id) {
    var o = espMap.get(id);
    if (o) return o;
    var box = document.createElement('div'); box.className = 'spesp-box';
    var name = document.createElement('div'); name.className = 'spesp-name';
    var hp = document.createElement('div'); hp.className = 'spesp-hp';
    var fill = document.createElement('i'); hp.appendChild(fill);
    var dist = document.createElement('div'); dist.className = 'spesp-dist';
    box.appendChild(name); box.appendChild(hp); box.appendChild(dist);
    world.appendChild(box);
    o = { box: box, name: name, fill: fill, dist: dist };
    espMap.set(id, o);
    return o;
  }
  function hideBox(o) { o.box.style.display = 'none'; }

  function espTick(E) {
    var cam = E.camera;
    if (!cam) { espMap.forEach(hideBox); return; }
    var v3 = getVec3(E);
    if (!v3) { espMap.forEach(hideBox); return; }
    var me = E.me;
    var canvas = getCanvas();
    if (!canvas) { espMap.forEach(hideBox); return; }
    var r = canvas.getBoundingClientRect();
    var cw = r.width, ch = r.height, cx0 = r.left, cy0 = r.top;
    cam.updateMatrixWorld && cam.updateMatrixWorld();

    var actors = [];
    try { (E.bots || []).forEach(function (b) { if (b) actors.push(b); }); } catch (e) {}
    try { if (E.remotes) E.remotes.forEach(function (x) { if (x) actors.push(x); }); } catch (e) {}

    var seen = new Set();
    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      if (!a || a === me || a.alive === false || a.networkVisible === false) continue;
      if (!isEnemy(a, me)) continue;
      var feet = actorPos(a, v3);
      if (!feet) continue;
      var head = actorHead(a, feet);
      var ph = head.project(cam), pf = feet.project(cam);
      if (!isFinite(ph.x) || !isFinite(pf.x) || ph.z > 1 || ph.z < -1) continue;

      var yTop = cy0 + (-ph.y * 0.5 + 0.5) * ch;
      var yBot = cy0 + (-pf.y * 0.5 + 0.5) * ch;
      var hgt = yBot - yTop;
      if (hgt < 6 || hgt > 1600) continue;
      var xc = cx0 + ((ph.x + pf.x) * 0.25 + 0.5) * cw;
      var wid = Math.max(4, hgt * 0.52);
      var x = xc - wid * 0.5;
      var dist = cam.position.distanceTo(feet);
      if (dist > cfg.maxDist) continue;

      var id = a.id != null ? 'a' + a.id : 'i' + i;
      seen.add(id);
      var o = ensureBox(id);
      o.box.style.display = 'block';
      o.box.style.borderColor = cfg.box ? '#ff3b3b' : 'transparent';
      o.box.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yTop.toFixed(1) + 'px,0)';
      o.box.style.width = wid.toFixed(1) + 'px';
      o.box.style.height = hgt.toFixed(1) + 'px';

      o.name.style.display = cfg.name ? 'block' : 'none';
      o.name.textContent = String(a.name || a.nick || a.id || '?').slice(0, 16);
      o.fill.parentNode.style.display = cfg.hp ? 'block' : 'none';
      var maxHp = +a.maxHp || 100, hp = +a.hp;
      if (!isFinite(hp)) hp = maxHp;
      var pct = Math.max(0, Math.min(1, hp / maxHp)) * 100;
      o.fill.style.width = pct.toFixed(1) + '%';
      o.fill.style.background = pct > 55 ? '#4ade80' : pct > 25 ? '#fbbf24' : '#ff3b3b';
      o.dist.style.display = cfg.dist ? 'block' : 'none';
      o.dist.textContent = Math.round(dist) + 'm';
    }
    espMap.forEach(function (o, id) { if (!seen.has(id)) hideBox(o); });
  }

  function ensureTracer(id) {
    var t = tracerMap.get(id);
    if (t) return t;
    var line = document.createElement('div');
    line.className = 'spesp-tracer';
    world.appendChild(line);
    t = { line: line };
    tracerMap.set(id, t);
    return t;
  }
  function hideTracer(t) { if (t && t.line) t.line.style.display = 'none'; }

  function tracerTick(E) {
    var cam = E.camera;
    if (!cfg.esp || !cfg.tracer || !cam) { tracerMap.forEach(hideTracer); return; }
    var canvas = getCanvas();
    if (!canvas) { tracerMap.forEach(hideTracer); return; }
    var r = canvas.getBoundingClientRect();
    var ox = r.left + r.width / 2, oy = r.top;
    var me = E.me;
    var v3 = getVec3(E);
    if (!v3) return;
    var seen = new Set();
    function addT(a, id) {
      if (!a || a === me || a.alive === false || a.networkVisible === false) return;
      if (!isEnemy(a, me)) return;
      var feet = actorPos(a, v3);
      if (!feet) return;
      var head = feet.clone(); head.y += 1.35;
      var p = head.project(cam);
      if (!isFinite(p.x) || p.z > 1 || p.z < -1) return;
      var px = (p.x * 0.5 + 0.5) * r.width + r.left;
      var py = (-p.y * 0.5 + 0.5) * r.height + r.top;
      var dx = px - ox, dy = py - oy;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 8 || len > 3000) return;
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      seen.add(id);
      var t = ensureTracer(id);
      t.line.style.display = 'block';
      t.line.style.transform = 'translate3d(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px,0) rotate(' + ang.toFixed(2) + 'deg)';
      t.line.style.width = len.toFixed(1) + 'px';
    }
    try { (E.bots || []).forEach(function (b, i) { addT(b, 'b' + i); }); } catch (e) {}
    try { if (E.remotes) { var j = 0; E.remotes.forEach(function (rr) { addT(rr, 'r' + (j++)); }); } } catch (e) {}
    tracerMap.forEach(function (t, id) { if (!seen.has(id)) hideTracer(t); });
  }

  var lastStatus = '';
  var handleSeen = false;
  var hookedR = null;

  function hookRenderer(R) {
    if (!R || hookedR === R) return false;
    try {
      var nativeRender = R.render.bind(R);
      R.render = function (scene, cam) {
        try {
          var E = window.__pb;
          if (E && E.camera) {
            if (cfg.esp) espTick(E); else espMap.forEach(hideBox);
            tracerTick(E);
          } else {
            espMap.forEach(hideBox);
            tracerMap.forEach(hideTracer);
          }
        } catch (e) {}
        return nativeRender(scene, cam);
      };
      hookedR = R;
      return true;
    } catch (e) { return false; }
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!document.body) return;
    if (!root) buildUI();

    var E = window.__pb;
    if (E && E.camera && !handleSeen) {
      handleSeen = true;
      loaderBridge.restore();
      hookRenderer(window.__pbR);
    }
    if (!hookedR) hookRenderer(window.__pbR);

    var botCount = 0, remCount = 0;
    if (E) {
      try { botCount = (E.bots || []).length; } catch (e) {}
      try { remCount = E.remotes ? E.remotes.size : 0; } catch (e) {}
    }
    var msg = E && E.camera
      ? 'IRILMODZ ' + VERSION + ' · ACTIVE · bots:' + botCount + ' remote:' + remCount
      : 'IRILMODZ ' + VERSION + ' · menunggu engine… (patch:' + (loaderBridge.isPatched() ? 'OK' : 'FAIL') + ')';
    if (msg !== lastStatus) { setStatus(msg, !(E && E.camera)); lastStatus = msg; }

    if (!hookedR && E && E.camera) {
      if (cfg.esp) espTick(E); else espMap.forEach(hideBox);
      tracerTick(E);
    }
  }

  function boot() {
    if (!document.body) { setTimeout(boot, 60); return; }
    buildUI();
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
