/* Networking 2026 — CIFP Tony Gallardo
   El cartel se despieza en 4 trozos al hacer scroll; cada trozo es una mesa. */
(function () {
  "use strict";

  var RATIO = 1055 / 1491;              // proporción del cartel
  var TOPBAR = 60;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var wrap = document.getElementById("inicio");
  var stage = document.getElementById("stage");
  var piecesBox = document.getElementById("pieces");
  var pieces = Array.prototype.slice.call(document.querySelectorAll(".piece"));
  var labels = Array.prototype.slice.call(document.querySelectorAll(".plabel"));
  var title = document.getElementById("stageTitle");
  var hint = document.getElementById("scrollHint");
  var topbar = document.getElementById("topbar");
  var glow = document.getElementById("glow");

  var ROT = [-8, 7, 6, -7];             // giro de cada trozo al separarse
  var L = null;                          // geometría calculada
  var intro = reduceMotion ? 0 : 1;      // 1 → trozos dispersos, 0 → cartel montado

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Alto real de los títulos de las mesas para un ancho dado
  function labelHeight(width) {
    var m = 0;
    labels.forEach(function (lb) { lb.style.width = width + "px"; m = Math.max(m, lb.offsetHeight); });
    return m + 16;
  }

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight;

    // Estado inicial: cartel completo centrado
    var ph = Math.min(H - TOPBAR - 90, (W - 32) / RATIO);
    ph = Math.floor(ph / 2) * 2;
    var pw = Math.round(ph * RATIO / 2) * 2;
    var w0 = pw / 2, h0 = ph / 2;
    var left = Math.round((W - pw) / 2);
    var top = Math.round(TOPBAR + (H - TOPBAR - 70 - ph) / 2);

    // Estado final: las 4 mesas
    var wide = W >= 900 && W / H >= 1.15;
    var titleH = wide ? 120 : 100;
    var areaTop = TOPBAR + titleH;
    var F = [], cw, ch, labelH, gap;
    if (wide) {
      gap = 28;
      var rowMax = Math.min(W, 1320) - 64;
      cw = (rowMax - 3 * gap) / 4;
      labelH = labelHeight(cw + gap - 4);
      ch = Math.min(H - areaTop - labelH - 30, cw / RATIO);
      cw = ch * RATIO;
      var xs = (W - (4 * cw + 3 * gap)) / 2;
      var yc = areaTop + (H - areaTop - labelH - 20 - ch) / 2 + ch / 2;
      for (var i = 0; i < 4; i++) F.push({ x: xs + i * (cw + gap) + cw / 2, y: yc });
    } else {
      gap = 16;
      var avail = H - areaTop - 20;
      // dos pasadas: el alto de los títulos depende del ancho de las cartas y viceversa
      cw = (W - 32 - gap) / 2;
      for (var pass = 0; pass < 2; pass++) {
        labelH = labelHeight(cw + gap - 4);
        ch = Math.min((avail - 2 * labelH - gap) / 2, (W - 32 - gap) / 2 / RATIO);
        cw = ch * RATIO;
      }
      var gx = (W - (2 * cw + gap)) / 2;
      var gy = areaTop + (avail - (2 * ch + 2 * labelH + gap)) / 2;
      for (var j = 0; j < 4; j++) {
        var c = j % 2, r = Math.floor(j / 2);
        F.push({ x: gx + c * (cw + gap) + cw / 2, y: gy + r * (ch + labelH + gap) + ch / 2 });
      }
    }

    var d = Math.min(W, H) * 0.11;
    var S = [], E = [], dir = [];
    for (var k = 0; k < 4; k++) {
      var col = k % 2, row = Math.floor(k / 2);
      var s = { x: left + (col + .5) * w0, y: top + (row + .5) * h0 };
      var dv = { x: col ? 1 : -1, y: row ? 1 : -1 };
      S.push(s); dir.push(dv);
      E.push({ x: s.x + dv.x * d, y: s.y + dv.y * d });
    }

    pieces.forEach(function (p) { p.style.width = w0 + "px"; p.style.height = h0 + "px"; });
    glow.style.left = left + "px"; glow.style.top = top + "px";
    glow.style.width = pw + "px"; glow.style.height = ph + "px";
    labels.forEach(function (lb, n) {
      lb.style.width = (cw + gap - 4) + "px";
      lb.style.left = (F[n].x - (cw + gap - 4) / 2) + "px";
      lb.style.top = (F[n].y + ch / 2 + 10) + "px";
    });

    L = { W: W, H: H, w0: w0, h0: h0, S: S, E: E, F: F, dir: dir, d: d, endScale: ch / h0 };
  }

  function progress() {
    var rect = wrap.getBoundingClientRect();
    var run = wrap.offsetHeight - stage.clientHeight;
    return run > 0 ? clamp(-rect.top / run) : 1;
  }

  function render() {
    if (!L) return;
    var p = progress();
    var A = ease(clamp(p / 0.28));            // se separan
    var B = ease(clamp((p - 0.28) / 0.47));   // se colocan como mesas
    var T = clamp((p - 0.68) / 0.17);         // aparecen títulos

    pieces.forEach(function (el, i) {
      var pos = B > 0
        ? { x: lerp(L.E[i].x, L.F[i].x, B), y: lerp(L.E[i].y, L.F[i].y, B) }
        : { x: lerp(L.S[i].x, L.E[i].x, A), y: lerp(L.S[i].y, L.E[i].y, A) };
      var rot = ROT[i] * A * (1 - B);
      var sc = lerp(lerp(1, 0.92, A), L.endScale, B);

      if (intro > 0) {                       // animación de montaje al cargar
        var k = ease(intro);
        pos.x += L.dir[i].x * L.d * 2.2 * k;
        pos.y += L.dir[i].y * L.d * 2.2 * k;
        rot += ROT[i] * 2 * k;
        sc *= 1 - 0.15 * k;
      }

      var sep = Math.max(A, intro);
      el.style.transform = "translate(" + (pos.x - L.w0 / 2) + "px," + (pos.y - L.h0 / 2) + "px) rotate(" + rot + "deg) scale(" + sc + ")";
      el.style.borderRadius = (14 * sep / sc) + "px";
      el.style.boxShadow = sep > 0
        ? "0 " + (22 * sep) + "px " + (55 * sep) + "px rgba(0,0,0," + (0.5 * sep) + "), 0 0 0 " + (3 * sep / sc) + "px rgba(255,255,255," + (0.9 * sep) + ")"
        : "none";   // sin sombra con el cartel montado, para que no se vea la junta
    });

    glow.style.opacity = 1 - Math.max(A, intro);
    labels.forEach(function (lb) {
      lb.style.opacity = T;
      lb.style.transform = "translateY(" + ((1 - T) * 12) + "px)";
    });
    title.style.opacity = T;
    title.style.transform = "translateY(" + ((1 - T) * -12) + "px)";
    hint.style.opacity = clamp(1 - p * 8) * (1 - intro);
    piecesBox.classList.toggle("open", p > 0.8);
    topbar.classList.toggle("solid", wrap.getBoundingClientRect().bottom < TOPBAR + 1);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(); });
  }

  // Clic en un trozo: si el cartel está cerrado lo abre; si está abierto, va a la mesa
  pieces.forEach(function (el) {
    el.addEventListener("click", function () {
      if (progress() < 0.8) {
        var run = wrap.offsetHeight - stage.clientHeight;
        window.scrollTo({ top: wrap.offsetTop + run * 0.9, behavior: reduceMotion ? "auto" : "smooth" });
      } else {
        document.getElementById(el.getAttribute("data-target")).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { layout(); render(); });

  function start() {
    layout();
    render();
    piecesBox.classList.add("ready");
    if (intro > 0) {
      var t0 = null, DUR = 1500;
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        intro = 1 - clamp((ts - t0) / DUR);
        render();
        if (intro > 0) requestAnimationFrame(step);
      };
      setTimeout(function () { requestAnimationFrame(step); }, 150);
    }
  }
  var img = new Image();
  img.onload = img.onerror = start;
  img.src = "img/cartel.webp";

  /* ---------- Fondo de red (nodos conectados) ---------- */
  var canvas = document.getElementById("net");
  var ctx = canvas.getContext("2d");
  var nodes = [], netOn = true, dpr = 1;
  var COLORS = ["224,164,60", "226,128,58", "255,255,255", "201,64,90"];

  function netSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = stage.clientWidth * dpr;
    canvas.height = stage.clientHeight * dpr;
    var n = stage.clientWidth < 700 ? 28 : 56;
    nodes = [];
    for (var i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - .5) * .35 * dpr, vy: (Math.random() - .5) * .35 * dpr,
        c: COLORS[i % COLORS.length], r: (Math.random() * 1.8 + 1.2) * dpr
      });
    }
  }
  function netDraw() {
    if (!netOn) return;
    var w = canvas.width, h = canvas.height, max = 150 * dpr;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (!reduceMotion) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < max) {
          ctx.strokeStyle = "rgba(224,164,60," + (0.28 * (1 - dist / max)) + ")";
          ctx.lineWidth = dpr;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(" + a.c + ",.75)";
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(netDraw);
  }
  netSize();
  window.addEventListener("resize", netSize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !netOn) { netOn = true; netDraw(); }
      netOn = vis;
    }).observe(stage);
  }
  netDraw();

  /* ---------- Aparición de contenidos ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Cuenta atrás (20 nov 2026, hora de Canarias = UTC+0) ---------- */
  var target = Date.UTC(2026, 10, 20, 0, 0, 0);
  var cdD = document.getElementById("cdD"), cdH = document.getElementById("cdH"), cdM = document.getElementById("cdM");
  function tick() {
    var ms = Math.max(0, target - Date.now());
    cdD.textContent = Math.floor(ms / 864e5);
    cdH.textContent = String(Math.floor(ms / 36e5) % 24).padStart(2, "0");
    cdM.textContent = String(Math.floor(ms / 6e4) % 60).padStart(2, "0");
  }
  tick();
  setInterval(tick, 30000);
})();
