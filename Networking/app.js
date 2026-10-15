/* Networking 2026 — CIFP Tony Gallardo
   El tangram se monta al cargar y, con el scroll, se despieza en las cuatro mesas. */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var TOPBAR = 60;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var wrap = document.getElementById("inicio");
  var stage = document.getElementById("stage");
  var hero = document.getElementById("hero");
  var tangram = document.getElementById("tangram");
  var grupos = Array.prototype.slice.call(document.querySelectorAll(".grupo"));
  var labels = Array.prototype.slice.call(document.querySelectorAll(".plabel"));
  var title = document.getElementById("stageTitle");
  var hint = document.getElementById("scrollHint");

  // Caja de cada mesa dentro del tangram (retícula 400×400): x, y, ancho, alto
  var BBOX = [[0, 0, 400, 200], [0, 0, 200, 400], [100, 0, 300, 300], [0, 200, 400, 200]];
  // Hacia dónde se separa cada mesa y cuánto gira
  var DIR = [[0, -1], [-1, 0], [0.94, -0.35], [0, 1]];
  var ROT = [-6, 5, 7, -5];
  var L = null;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function labelHeight(width) {
    var m = 0;
    labels.forEach(function (lb) { lb.style.width = width + "px"; m = Math.max(m, lb.offsetHeight); });
    return m + 16;
  }

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight;
    var wide = W >= 900 && W / H >= 1.15;

    // --- Estado inicial: texto + tangram montado ---
    var S, tx, ty;
    hero.style.maxWidth = wide ? Math.min(W * 0.5, 640) + "px" : (W - 32) + "px";
    var hh = hero.offsetHeight, hw = hero.offsetWidth;
    if (wide) {
      S = Math.round(Math.min(H * 0.62, W * 0.36));
      tx = Math.round(W * 0.72 - S / 2);
      ty = Math.round(TOPBAR + (H - TOPBAR - S) / 2);
      hero.style.left = Math.max(32, W * 0.07) + "px";
      hero.style.top = (TOPBAR + (H - TOPBAR - hh) / 2) + "px";
    } else {
      var top = TOPBAR + 28;
      S = Math.round(Math.min(W - 64, H - top - hh - 110));
      S = Math.max(S, 140);
      hero.style.left = "16px";
      hero.style.top = top + "px";
      tx = Math.round((W - S) / 2);
      ty = Math.round(top + hh + Math.max(24, (H - top - hh - 70 - S) / 2));
    }
    var u = S / 400;
    grupos.forEach(function (g) { g.style.width = S + "px"; g.style.height = S + "px"; });

    // --- Estado final: las cuatro mesas colocadas ---
    var areaTop = TOPBAR + (wide ? 130 : 108);
    var cs, gap, labelH, slots = [];
    if (wide) {
      gap = 36;
      var rowMax = Math.min(W, 1320) - 64;
      cs = (rowMax - 3 * gap) / 4;
      labelH = labelHeight(cs + gap - 4);
      cs = Math.min(cs, H - areaTop - labelH - 30);
      var xs = (W - (4 * cs + 3 * gap)) / 2;
      var yc = areaTop + (H - areaTop - labelH - 10 - cs) / 2 + cs / 2;
      for (var i = 0; i < 4; i++) slots.push({ x: xs + i * (cs + gap) + cs / 2, y: yc });
    } else {
      gap = 18;
      var avail = H - areaTop - 16;
      cs = (W - 32 - gap) / 2;
      for (var pass = 0; pass < 2; pass++) {
        labelH = labelHeight(cs + gap - 4);
        cs = Math.min((W - 32 - gap) / 2, (avail - 2 * labelH - gap) / 2);
      }
      var gx = (W - (2 * cs + gap)) / 2;
      var gy = areaTop + (avail - (2 * cs + 2 * labelH + gap)) / 2;
      for (var j = 0; j < 4; j++) {
        var c = j % 2, r = Math.floor(j / 2);
        slots.push({ x: gx + c * (cs + gap) + cs / 2, y: gy + r * (cs + labelH + gap) + cs / 2 });
      }
    }
    // Todas las mesas a la misma escala: el lado del tangram ocupa el 92 % de la celda
    var endScale = (cs * 0.92) / S;

    var M = BBOX.map(function (b, k) {
      var bcx = (b[0] + b[2] / 2) * u, bcy = (b[1] + b[3] / 2) * u;
      var start = { x: tx + bcx, y: ty + bcy };
      var d = S * 0.13;
      return {
        bcx: bcx, bcy: bcy, start: start,
        exp: { x: start.x + DIR[k][0] * d, y: start.y + DIR[k][1] * d },
        // apoyada en la base de su celda, justo encima del nombre
        end: { x: slots[k].x, y: slots[k].y + cs / 2 - (b[3] * u * endScale) / 2 - cs * 0.04 }
      };
    });

    labels.forEach(function (lb, n) {
      var w = cs + gap - 4;
      lb.style.width = w + "px";
      lb.style.left = (slots[n].x - w / 2) + "px";
      lb.style.top = (slots[n].y + cs / 2 + 10) + "px";
    });

    L = { M: M, endScale: endScale };
  }

  function progress() {
    var run = wrap.offsetHeight - stage.clientHeight;
    return run > 0 ? clamp(-wrap.getBoundingClientRect().top / run) : 1;
  }

  function render() {
    if (!L) return;
    var p = progress();
    var A = ease(clamp(p / 0.24));            // el cuadrado se abre
    var B = ease(clamp((p - 0.24) / 0.5));    // las mesas van a su sitio
    var T = clamp((p - 0.66) / 0.18);         // aparecen los nombres

    L.M.forEach(function (m, i) {
      var pos = B > 0
        ? { x: lerp(m.exp.x, m.end.x, B), y: lerp(m.exp.y, m.end.y, B) }
        : { x: lerp(m.start.x, m.exp.x, A), y: lerp(m.start.y, m.exp.y, A) };
      var rot = ROT[i] * A * (1 - B);
      var sc = lerp(1, L.endScale, B);
      grupos[i].style.transform = "translate(" + pos.x + "px," + pos.y + "px) rotate(" + rot + "deg) scale(" + sc + ") translate(" + (-m.bcx) + "px," + (-m.bcy) + "px)";
    });

    hero.style.opacity = 1 - clamp(A * 1.4);
    hero.style.transform = "translateY(" + (-40 * A) + "px)";
    labels.forEach(function (lb) {
      lb.style.opacity = T;
      lb.style.transform = "translateY(" + ((1 - T) * 12) + "px)";
    });
    title.style.opacity = T;
    title.style.transform = "translateY(" + ((1 - T) * -12) + "px)";
    hint.style.opacity = clamp(1 - p * 8);
    tangram.classList.toggle("abierto", p > 0.8);
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(); });
  }, { passive: true });
  window.addEventListener("resize", function () { layout(); render(); });

  // Pulsar una mesa: si el tangram está cerrado, lo abre; si está abierto, va a la mesa
  grupos.forEach(function (g) {
    g.addEventListener("click", function () {
      var behavior = reduceMotion ? "auto" : "smooth";
      if (progress() < 0.8) {
        var run = wrap.offsetHeight - stage.clientHeight;
        window.scrollTo({ top: wrap.offsetTop + run * 0.9, behavior: behavior });
      } else {
        document.getElementById(g.getAttribute("data-target")).scrollIntoView({ behavior: behavior });
      }
    });
  });

  function start() {
    layout();
    render();
    if (!reduceMotion && progress() < 0.05) tangram.classList.add("montando");
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  layout(); render();

  /* ---------- Aparición de contenidos ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
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
