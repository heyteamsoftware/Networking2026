/* Networking 2026 — CIFP Tony Gallardo
   El tangram se monta al cargar y, con el scroll, se desmonta en las cuatro mesas
   y después en el archipiélago (siete piezas, siete islas). */
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
  var titleArch = document.getElementById("stageTitleArch");
  var hint = document.getElementById("scrollHint");
  var islasBox = document.getElementById("islas");
  var polys = Array.prototype.slice.call(document.querySelectorAll(".grupo polygon"));
  var foto = document.getElementById("portadaFoto");
  // Desde dónde llega cada pieza en el montaje (--dx, --dy del HTML, en unidades de la retícula)
  var MONTAJE = polys.map(function (el) {
    return [parseFloat(el.style.getPropertyValue("--dx")) || 0, parseFloat(el.style.getPropertyValue("--dy")) || 0];
  });

  // Caja de cada mesa dentro del tangram (retícula 400×400): x, y, ancho, alto
  var BBOX = [[0, 0, 400, 200], [0, 0, 200, 400], [100, 0, 300, 300], [0, 200, 400, 200]];

  // Siete piezas, siete islas (mismo orden que los polígonos del HTML).
  // c = centro de la pieza en la retícula; x, y, r = posición y giro en el mapa de 1300×640
  // (identidad/generar.js); lx, ly = dónde va el nombre de la isla.
  var ISLAS = [
    { isla: "Tenerife",      valor: "Ideas",      c: [200, 66.7],    x: 473,  y: 367, r: -45, lx: 392,  ly: 290 },
    { isla: "Fuerteventura", valor: "Proyectos",  c: [66.7, 200],    x: 1102, y: 331, r: 45,  lx: 1060, ly: 478 },
    { isla: "La Gomera",     valor: "Territorio", c: [366.7, 100],   x: 319,  y: 412, r: 15,  lx: 300,  ly: 492 },
    { isla: "Gran Canaria",  valor: "Conexiones", c: [300, 200],     x: 717,  y: 453, r: 0,   lx: 717,  ly: 548 },
    { isla: "El Hierro",     valor: "Personas",   c: [200, 266.7],   x: 131,  y: 517, r: -20, lx: 140,  ly: 594 },
    { isla: "Lanzarote",     valor: "Futuro",     c: [150, 350],     x: 1196, y: 160, r: -40, lx: 1060, ly: 132 },
    { isla: "La Palma",      valor: "Empresa",    c: [333.3, 333.3], x: 165,  y: 256, r: 45,  lx: 165,  ly: 350 }
  ];
  var GRACIOSA = { x: 1260, y: 70 };
  var ESCALA_ISLAS = 0.5;
  // Zona del mapa que se encuadra (x, y, ancho, alto), con sitio para los nombres
  var MAPA = [40, 40, 1240, 580];

  // Nombres de las islas y el punto de La Graciosa
  var ilabels = ISLAS.map(function (d) {
    var e = document.createElement("div");
    e.className = "ilabel";
    e.innerHTML = "<b></b><span></span>";
    e.firstChild.textContent = d.isla;
    e.lastChild.textContent = d.valor;
    islasBox.appendChild(e);
    return e;
  });
  var graciosa = document.createElement("div");
  graciosa.className = "graciosa";
  graciosa.title = "La Graciosa";
  islasBox.appendChild(graciosa);

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
      hero.style.left = Math.max(32, W * 0.07) + "px";
      hero.style.top = (TOPBAR + (H - TOPBAR - hh) / 2) + "px";
      S = Math.round(Math.min(H * 0.6, W * 0.4));
    } else {
      hero.style.left = "16px";
      hero.style.top = (TOPBAR + 28) + "px";
      S = Math.round(Math.min(W - 64, H * 0.55));
    }
    // El tangram se monta en el centro de la escena cuando la foto de portada se funde
    tx = Math.round((W - S) / 2);
    ty = Math.round(TOPBAR + (H - TOPBAR - S) / 2);
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
      return {
        bcx: bcx, bcy: bcy,
        start: { x: tx + bcx, y: ty + bcy },
        // apoyada en la base de su celda, justo encima del nombre
        end: { x: slots[k].x, y: slots[k].y + cs / 2 - (b[3] * u * endScale) / 2 - cs * 0.04 }
      };
    });

    // --- Archipiélago: el mapa encuadrado bajo su título ---
    var mTop = TOPBAR + (wide ? 120 : 100), mH = H - mTop - 16;
    var km = Math.min((W - 32) / MAPA[2], mH / MAPA[3]);
    var ox = (W - MAPA[2] * km) / 2 - MAPA[0] * km;
    var oy = mTop + (mH - MAPA[3] * km) / 2 - MAPA[1] * km;
    // Posición de cada pieza en coordenadas locales del tangram (unidades de la retícula)
    var A = ISLAS.map(function (d) {
      return { x: (ox + d.x * km - tx) / u, y: (oy + d.y * km - ty) / u, r: d.r, s: ESCALA_ISLAS * km / u };
    });
    islasBox.classList.toggle("compacto", km < 0.55);
    ilabels.forEach(function (e, n) {
      e.style.left = (ox + ISLAS[n].lx * km) + "px";
      e.style.top = (oy + ISLAS[n].ly * km) + "px";
    });
    var gr = Math.max(5, 16 * km);
    graciosa.style.width = graciosa.style.height = gr + "px";
    graciosa.style.left = (ox + GRACIOSA.x * km - gr / 2) + "px";
    graciosa.style.top = (oy + GRACIOSA.y * km - gr / 2) + "px";

    labels.forEach(function (lb, n) {
      var w = cs + gap - 4;
      lb.style.width = w + "px";
      lb.style.left = (slots[n].x - w / 2) + "px";
      lb.style.top = (slots[n].y + cs / 2 + 10) + "px";
    });

    L = { M: M, A: A, endScale: endScale };
  }

  function progress() {
    var run = wrap.offsetHeight - stage.clientHeight;
    return run > 0 ? clamp(-wrap.getBoundingClientRect().top / run) : 1;
  }

  function render() {
    if (!L) return;
    var p = progress();
    var H0 = ease(clamp(p / 0.1));                 // la foto de portada y el título se funden
    var J = ease(clamp((p - 0.2) / 0.24));         // el cuadrado se desmonta en las cuatro mesas
    var I = ease(clamp((p - 0.6) / 0.26));         // y las mesas se deshacen en las siete islas
    var T = clamp((p - 0.38) / 0.07) * (1 - clamp((p - 0.56) / 0.05)); // nombres de las mesas
    var TI = clamp((p - 0.84) / 0.07);             // nombres de las islas

    // Las mesas (grupos) van a su sitio; al pasar a islas vuelven a su posición original,
    // que es desde donde se calculan las islas
    var g = J * (1 - I);
    L.M.forEach(function (m, i) {
      var x = lerp(m.start.x, m.end.x, g), y = lerp(m.start.y, m.end.y, g), sc = lerp(1, L.endScale, g);
      grupos[i].style.transform = "translate(" + x + "px," + y + "px) scale(" + sc + ") translate(" + (-m.bcx) + "px," + (-m.bcy) + "px)";
    });
    // Cada pieza: primero llega girando y encaja en el cuadrado (montaje, escalonado),
    // y al final, dentro de su mesa, viaja a su isla
    var k = I;
    polys.forEach(function (el, n) {
      var d = ISLAS[n];
      if (k > 0) {
        var a = L.A[n];
        el.style.opacity = 1;
        el.style.transform = "translate(" + lerp(d.c[0], a.x, k) + "px," + lerp(d.c[1], a.y, k) + "px) rotate(" + (a.r * k) + "deg) scale(" + lerp(1, a.s, k) + ") translate(" + (-d.c[0]) + "px," + (-d.c[1]) + "px)";
        return;
      }
      var mo = reduceMotion ? clamp((p - 0.03) / 0.1) : ease(clamp((p - 0.03 - n * 0.012) / 0.09));
      el.style.opacity = mo;
      if (mo >= 1 || reduceMotion) { el.style.transform = ""; return; }
      var f = 1 - mo;
      el.style.transform = "translate(" + (d.c[0] + MONTAJE[n][0] * f) + "px," + (d.c[1] + MONTAJE[n][1] * f) + "px) rotate(" + (-135 * f) + "deg) scale(" + lerp(1, 0.6, f) + ") translate(" + (-d.c[0]) + "px," + (-d.c[1]) + "px)";
    });

    foto.style.opacity = 1 - H0;
    hero.style.opacity = 1 - H0;
    hero.style.transform = "translateY(" + (-40 * H0) + "px)";
    islasBox.style.opacity = TI;
    graciosa.style.opacity = k;
    titleArch.style.opacity = TI;
    titleArch.style.transform = "translateY(" + ((1 - TI) * -12) + "px)";
    labels.forEach(function (lb) {
      lb.style.opacity = T;
      lb.style.transform = "translateY(" + ((1 - T) * 12) + "px)";
    });
    title.style.opacity = T;
    title.style.transform = "translateY(" + ((1 - T) * -12) + "px)";
    hint.style.opacity = clamp(1 - p * 8);
    tangram.classList.toggle("abierto", p > 0.4);
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
      if (progress() < 0.4) {
        var run = wrap.offsetHeight - stage.clientHeight;
        window.scrollTo({ top: wrap.offsetTop + run * 0.5, behavior: behavior });
      } else {
        document.getElementById(g.getAttribute("data-target")).scrollIntoView({ behavior: behavior });
      }
    });
  });

  function start() { layout(); render(); }
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

  /* ---------- Empresas participantes (empresas.json) ----------
     Cada empresa: { "nombre": "…", "logo": "img/empresas/archivo.png", "web": "https://…", "mesas": [1, 3] }
     Solo "nombre" es obligatorio. Mientras la lista esté vacía se muestra el aviso. */
  var empGrid = document.getElementById("empGrid"), empVacio = document.getElementById("empVacio");
  var COLOR_MESA = ["", "var(--mesa-1)", "var(--mesa-2)", "var(--mesa-3)", "var(--mesa-4)"];
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  fetch("empresas.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (lista) {
      if (!Array.isArray(lista) || !lista.length) return;
      lista.forEach(function (emp) {
        if (!emp || !emp.nombre) return;
        var li = el("li");
        var card = emp.web ? el("a", "emp-card") : el("div", "emp-card");
        if (emp.web) { card.href = emp.web; card.target = "_blank"; card.rel = "noopener"; }
        if (emp.logo) { var img = el("img"); img.src = emp.logo; img.alt = ""; img.loading = "lazy"; card.appendChild(img); }
        card.appendChild(el("span", "emp-nombre", emp.nombre));
        li.appendChild(card);
        if (Array.isArray(emp.mesas) && emp.mesas.length) {
          var m = el("span", "emp-mesas");
          m.setAttribute("aria-label", "Mesas: " + emp.mesas.join(", "));
          emp.mesas.forEach(function (n) { if (COLOR_MESA[n]) { var t = el("i"); t.style.background = COLOR_MESA[n]; m.appendChild(t); } });
          li.appendChild(m);
        }
        empGrid.appendChild(li);
      });
      if (empGrid.children.length) { empGrid.hidden = false; empVacio.hidden = true; }
    })
    .catch(function () {});

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
