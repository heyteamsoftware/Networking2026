/* Networking 2026 — CIFP Tony Gallardo
   Portada: el tangram se monta encima de la foto del horizonte. Con el scroll la foto se funde,
   el cuadrado se desmonta en las cuatro mesas y después en el archipiélago:
   ocho piezas, ocho islas (La Graciosa es la pieza que falta). */
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
  var piezas = Array.prototype.slice.call(document.querySelectorAll(".grupo .pieza"));
  var foto = document.getElementById("portadaFoto");
  // Desde dónde llega cada pieza en el montaje (--dx, --dy del HTML, en unidades de la retícula)
  var MONTAJE = piezas.map(function (el) {
    return [parseFloat(el.style.getPropertyValue("--dx")) || 0, parseFloat(el.style.getPropertyValue("--dy")) || 0];
  });

  // Caja de cada mesa dentro del tangram (retícula 400×400): x, y, ancho, alto
  var BBOX = [[0, 0, 400, 200], [0, 0, 200, 400], [100, 0, 300, 300], [0, 200, 400, 200]];

  // Ocho piezas, ocho islas (mismo orden que las piezas del HTML; La Graciosa va aparte).
  // c = centro de la pieza en la retícula; x, y, r = posición y giro en un mapa de 1300×640
  // calculado con la longitud y latitud reales; lx, ly = dónde va el nombre de la isla.
  var ISLAS = [
    { isla: "Tenerife",      valor: "Ideas",      c: [200, 66.7],    x: 467,  y: 365, r: -45, lx: 392,  ly: 290 },
    { isla: "Fuerteventura", valor: "Proyectos",  c: [66.7, 200],    x: 1092, y: 334, r: 45,  lx: 1040, ly: 480 },
    { isla: "La Gomera",     valor: "Territorio", c: [366.7, 100],   x: 311,  y: 412, r: 15,  lx: 296,  ly: 492 },
    { isla: "Gran Canaria",  valor: "Conexiones", c: [300, 200],     x: 709,  y: 453, r: 0,   lx: 709,  ly: 548 },
    { isla: "El Hierro",     valor: "Personas",   c: [200, 266.7],   x: 120,  y: 515, r: -20, lx: 132,  ly: 594 },
    { isla: "Lanzarote",     valor: "Futuro",     c: [150, 350],     x: 1180, y: 165, r: -40, lx: 1050, ly: 140 },
    { isla: "La Palma",      valor: "Empresa",    c: [333.3, 333.3], x: 158,  y: 259, r: 45,  lx: 158,  ly: 352 }
  ];
  // La octava isla: una pieza pequeña, solo con el contorno, que queda por completar
  var GRACIOSA = { isla: "La Graciosa", valor: "La pieza que falta", x: 1262, y: 48, r: 15, lado: 52, lx: 1130, ly: 30 };
  var ESCALA_ISLAS = 0.5;
  // Zona del mapa que se encuadra (x, y, ancho, alto), con sitio para los nombres
  var MAPA = [40, 10, 1240, 610];

  // Nombres de las islas
  function rotulo(d) {
    var e = document.createElement("div");
    e.className = "ilabel";
    e.innerHTML = "<b></b><span></span>";
    e.firstChild.textContent = d.isla;
    e.lastChild.textContent = d.valor;
    islasBox.appendChild(e);
    return e;
  }
  var ilabels = ISLAS.map(rotulo);
  var glabel = rotulo(GRACIOSA);
  glabel.classList.add("ilabel-graciosa");
  // La pieza de La Graciosa
  var graciosa = document.createElement("div");
  graciosa.className = "graciosa";
  graciosa.setAttribute("aria-hidden", "true");
  graciosa.innerHTML = '<svg viewBox="-6 -6 112 112"><polygon points="0,0 100,0 0,100"/></svg>';
  stage.insertBefore(graciosa, islasBox);

  var L = null;
  var intro = (reduceMotion ? 99 : 0); // segundos transcurridos del montaje inicial

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

    // --- Portada: texto a la izquierda (arriba en móvil) y el tangram encima de la foto ---
    var S, tx, ty;
    hero.style.maxWidth = wide ? Math.min(W * 0.5, 640) + "px" : (W - 32) + "px";
    var hh = hero.offsetHeight;
    if (wide) {
      hero.style.left = Math.max(32, W * 0.07) + "px";
      hero.style.top = (TOPBAR + (H - TOPBAR - hh) / 2) + "px";
      S = Math.round(Math.min(H * 0.56, W * 0.34));
      tx = Math.round(W * 0.72 - S / 2);
      // La base del tangram queda a la altura de la línea del lema («Juntos somos FP»)
      var lr = document.querySelector(".lema").getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var lemaY = lr.top - sr.top + lr.height / 2;
      ty = Math.round(Math.max(TOPBAR + 8, lemaY - S));
    } else {
      var top = TOPBAR + 28;
      hero.style.left = "16px";
      hero.style.top = top + "px";
      S = Math.max(140, Math.round(Math.min(W - 64, H - top - hh - 110)));
      tx = Math.round((W - S) / 2);
      ty = Math.round(top + hh + Math.max(24, (H - top - hh - 70 - S) / 2));
    }
    var u = S / 400;
    grupos.forEach(function (g) { g.style.width = S + "px"; g.style.height = S + "px"; });

    // --- Las cuatro mesas colocadas ---
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
    // Posición de cada pieza en coordenadas locales de su mesa (unidades de la retícula):
    // las mesas vuelven a su sitio de portada antes de abrirse en islas
    var A = ISLAS.map(function (d) {
      return { x: (ox + d.x * km - tx) / u, y: (oy + d.y * km - ty) / u, r: d.r, s: ESCALA_ISLAS * km / u };
    });
    var compacto = km < 0.55;
    islasBox.classList.toggle("compacto", compacto);
    ilabels.concat([glabel]).forEach(function (e, n) {
      var d = n < ISLAS.length ? ISLAS[n] : GRACIOSA;
      e.style.left = (ox + d.lx * km) + "px";
      e.style.top = (oy + d.ly * km) + "px";
    });
    // La pieza de La Graciosa: más grande en móvil para que se vea
    var gl = GRACIOSA.lado * km * (compacto ? 1.4 : 1);
    graciosa.style.width = graciosa.style.height = gl + "px";
    graciosa.style.left = (ox + GRACIOSA.x * km - gl / 2) + "px";
    graciosa.style.top = (oy + GRACIOSA.y * km - gl / 2) + "px";
    graciosa.style.setProperty("--r", GRACIOSA.r + "deg");

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
    var H0 = ease(clamp(p / 0.12));                // la foto de portada y el título se funden
    var J = ease(clamp((p - 0.14) / 0.24));        // el cuadrado se desmonta en las cuatro mesas
    var I = ease(clamp((p - 0.58) / 0.26));        // y las mesas se deshacen en las ocho islas
    var T = clamp((p - 0.32) / 0.08) * (1 - clamp((p - 0.52) / 0.05)); // nombres de las mesas
    var TI = clamp((p - 0.82) / 0.08);             // nombres de las islas

    // Las mesas (grupos) van a su sitio; al pasar a islas vuelven a su posición de portada,
    // que es desde donde se calculan las islas
    var g = J * (1 - I);
    L.M.forEach(function (m, i) {
      var x = lerp(m.start.x, m.end.x, g), y = lerp(m.start.y, m.end.y, g), sc = lerp(1, L.endScale, g);
      grupos[i].style.transform = "translate(" + x + "px," + y + "px) scale(" + sc + ") translate(" + (-m.bcx) + "px," + (-m.bcy) + "px)";
    });
    // Cada pieza: al cargar llega girando y encaja (montaje escalonado);
    // al final, dentro de su mesa, viaja a su isla
    piezas.forEach(function (el, n) {
      var d = ISLAS[n];
      if (I > 0) {
        var a = L.A[n];
        el.style.opacity = 1;
        el.style.transform = "translate(" + lerp(d.c[0], a.x, I) + "px," + lerp(d.c[1], a.y, I) + "px) rotate(" + (a.r * I) + "deg) scale(" + lerp(1, a.s, I) + ") translate(" + (-d.c[0]) + "px," + (-d.c[1]) + "px)";
        return;
      }
      var mo = ease(clamp((intro - 0.15 - n * 0.08) / 0.9));
      el.style.opacity = mo;
      if (mo >= 1) { el.style.transform = ""; return; }
      var f = 1 - mo;
      el.style.transform = "translate(" + (d.c[0] + MONTAJE[n][0] * f) + "px," + (d.c[1] + MONTAJE[n][1] * f) + "px) rotate(" + (-135 * f) + "deg) scale(" + lerp(1, 0.6, f) + ") translate(" + (-d.c[0]) + "px," + (-d.c[1]) + "px)";
    });
    // Las palabras se ven en el cuadrado y en las mesas; en las islas mandan los nombres
    tangram.style.setProperty("--pal", 1 - clamp(I * 2));

    foto.style.opacity = 1 - H0;
    hero.style.opacity = 1 - H0;
    hero.style.transform = "translateY(" + (-40 * H0) + "px)";
    islasBox.style.opacity = TI;
    graciosa.style.opacity = clamp((I - 0.6) / 0.4);
    titleArch.style.opacity = TI;
    titleArch.style.transform = "translateY(" + ((1 - TI) * -12) + "px)";
    labels.forEach(function (lb) {
      lb.style.opacity = T;
      lb.style.transform = "translateY(" + ((1 - T) * 12) + "px)";
    });
    title.style.opacity = T;
    title.style.transform = "translateY(" + ((1 - T) * -12) + "px)";
    hint.style.opacity = clamp(1 - p * 8) * clamp(intro - 1);
    tangram.classList.toggle("abierto", p > 0.36);
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(); });
  }, { passive: true });
  window.addEventListener("resize", function () { layout(); render(); });

  // Pulsar una mesa: si el tangram está cerrado, lo abre en mesas; si está abierto, va a la mesa
  grupos.forEach(function (g) {
    g.addEventListener("click", function () {
      var behavior = reduceMotion ? "auto" : "smooth";
      if (progress() < 0.36) {
        var run = wrap.offsetHeight - stage.clientHeight;
        window.scrollTo({ top: wrap.offsetTop + run * 0.46, behavior: behavior });
      } else {
        var destino = document.getElementById(g.getAttribute("data-target"));
        if (destino) destino.scrollIntoView({ behavior: behavior });
      }
    });
  });

  // Montaje inicial encima de la foto (2 s); sin animación si el sistema pide menos movimiento
  function arrancarMontaje() {
    if (intro >= 2) { render(); return; }
    var t0 = null, hecho = false;
    function paso(ts) {
      if (hecho) return;
      if (t0 === null) t0 = ts;
      intro = (ts - t0) / 1000;
      if (intro >= 2) hecho = true;
      render();
      if (!hecho) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
    // Respaldo: si el navegador pausa la animación (pestaña en segundo plano), el tangram queda montado igual
    setTimeout(function () { if (!hecho) { hecho = true; intro = 99; render(); } }, 2600);
  }
  function start() { layout(); arrancarMontaje(); }
  layout(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();

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

  var COLOR_MESA = ["", "var(--mesa-1)", "var(--mesa-2)", "var(--mesa-3)", "var(--mesa-4)"];
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function cargar(url, pintar) {
    fetch(url, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (lista) { if (Array.isArray(lista) && lista.length) pintar(lista); })
      .catch(function () {});
  }

  /* ---------- Escaparate de empresas (empresas.json) ----------
     Cada empresa: { "nombre": "…", "logo": "img/empresas/archivo.png", "sector": "…",
     "motivo": "Por qué participa, en una frase", "web": "https://…", "mesas": [1, 3] }
     Solo "nombre" es obligatorio. Publicad solo logos autorizados por cada empresa.
     Mientras la lista esté vacía se muestra la convocatoria «¿Te sumas?». */
  var empGrid = document.getElementById("empGrid"), empVacio = document.getElementById("empVacio");
  cargar("empresas.json", function (lista) {
    lista.forEach(function (emp) {
      if (!emp || !emp.nombre) return;
      var li = el("li");
      var card = emp.web ? el("a", "emp-card") : el("div", "emp-card");
      if (emp.web) { card.href = emp.web; card.target = "_blank"; card.rel = "noopener"; }
      if (emp.logo) { var img = el("img"); img.src = emp.logo; img.alt = ""; img.loading = "lazy"; card.appendChild(img); }
      card.appendChild(el("span", "emp-nombre", emp.nombre));
      if (emp.sector) card.appendChild(el("span", "emp-sector", emp.sector));
      if (emp.motivo) card.appendChild(el("p", "emp-motivo", "«" + emp.motivo + "»"));
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
  });

  /* ---------- Colaboraciones posteriores (colaboraciones.json) ----------
     Cada una: { "tipo": "Proyecto" | "Visita" | "Reto" | "Actividad", "titulo": "…",
     "empresa": "…", "fecha": "2027-01", "descripcion": "…", "imagen": "img/colaboraciones/archivo.jpg" }
     Solo "titulo" es obligatorio. */
  var COLOR_TIPO = { proyecto: "var(--mesa-1)", visita: "var(--mesa-2)", reto: "var(--mesa-3)", actividad: "var(--mesa-4)" };
  var colGrid = document.getElementById("colGrid"), colVacio = document.getElementById("colVacio");
  cargar("colaboraciones.json", function (lista) {
    lista.forEach(function (c) {
      if (!c || !c.titulo) return;
      var li = el("li");
      if (c.imagen) { var img = el("img"); img.src = c.imagen; img.alt = ""; img.loading = "lazy"; li.appendChild(img); }
      var cuerpo = el("div", "col-cuerpo");
      if (c.tipo) {
        var t = el("span", "col-tipo", c.tipo);
        var col = COLOR_TIPO[String(c.tipo).toLowerCase()];
        if (col) t.style.setProperty("--c", col);
        cuerpo.appendChild(t);
      }
      cuerpo.appendChild(el("h3", "", c.titulo));
      var meta = [c.empresa, c.fecha].filter(Boolean).join(" · ");
      if (meta) cuerpo.appendChild(el("p", "col-meta", meta));
      if (c.descripcion) cuerpo.appendChild(el("p", "", c.descripcion));
      li.appendChild(cuerpo);
      colGrid.appendChild(li);
    });
    if (colGrid.children.length) { colGrid.hidden = false; colVacio.hidden = true; }
  });

  /* ---------- Media (media.json) ----------
     Cada contenido: { "tipo": "Vídeo", "titulo": "…", "descripcion": "…", "fecha": "…", "duracion": "1:18",
     "video": "media/archivo.mp4", "portada": "media/archivo.webp" }
     Solo "titulo" y "video" son obligatorios. El primero se muestra en grande; el resto, en una lista
     debajo que, al pulsarlos, pasan al reproductor. Mientras la lista esté vacía, la sección no se ve. */
  var mediaSec = document.getElementById("media");
  var mediaDest = document.getElementById("mediaDestacado"), mediaLista = document.getElementById("mediaLista");
  function pintarDestacado(m) {
    mediaDest.textContent = "";
    var fig = el("figure", "media-player");
    if (!m.video) {
      // Imagen (cartel, foto) o documento PDF: se ve su imagen y, al pulsarla, se abre a tamaño completo
      var enlace = el("a", "media-imagen" + (m.pdf ? " es-pdf" : ""));
      enlace.href = m.pdf || m.imagen;
      enlace.target = "_blank";
      enlace.rel = "noopener";
      enlace.setAttribute("aria-label", (m.pdf ? "Abrir el PDF: " : "Ver a tamaño completo: ") + m.titulo);
      var foto = el("img");
      foto.src = m.pdf ? (m.portada || "") : m.imagen;
      foto.alt = m.titulo;
      foto.loading = "lazy";
      enlace.appendChild(foto);
      fig.appendChild(enlace);
    } else {
    var marco = el("div", "media-marco");
    var v = el("video");
    v.src = m.video;
    v.preload = "none";
    v.setAttribute("playsinline", "");
    if (m.portada) v.poster = m.portada;
    v.setAttribute("aria-label", m.titulo);
    var play = el("button", "media-play");
    play.type = "button";
    play.setAttribute("aria-label", "Reproducir: " + m.titulo);
    play.appendChild(el("span"));
    play.addEventListener("click", function () {
      v.controls = true;
      play.hidden = true;
      v.play();
    });
    marco.appendChild(v);
    marco.appendChild(play);
    fig.appendChild(marco);
    }
    var pie = el("figcaption", "media-pie");
    var datos = [m.tipo, m.duracion].filter(Boolean).join(" · ");
    if (datos) pie.appendChild(el("span", "media-tipo", datos));
    pie.appendChild(el("h3", "", m.titulo));
    if (m.descripcion) pie.appendChild(el("p", "", m.descripcion));
    if (m.fecha) pie.appendChild(el("p", "media-fecha", m.fecha));
    if (m.pdf) {
      var acciones = el("p", "media-acciones");
      var ver = el("a", "btn btn-primario", "Ver el PDF");
      ver.href = m.pdf; ver.target = "_blank"; ver.rel = "noopener";
      var bajar = el("a", "btn btn-secundario", "Descargar" + (m.peso ? " (" + m.peso + ")" : ""));
      bajar.href = m.pdf; bajar.setAttribute("download", "");
      acciones.appendChild(ver);
      acciones.appendChild(bajar);
      pie.appendChild(acciones);
    }
    fig.appendChild(pie);
    mediaDest.appendChild(fig);
  }
  cargar("media.json", function (lista) {
    lista = lista.filter(function (m) { return m && m.titulo && (m.video || m.imagen || m.pdf); });
    if (!lista.length) return;
    pintarDestacado(lista[0]);
    // Con más de un contenido, la lista los muestra todos y marca el que se está viendo
    if (lista.length > 1) lista.forEach(function (m, i) {
      var li = el("li");
      var b = el("button", "media-item");
      b.type = "button";
      var miniatura = m.portada || m.imagen;
      if (miniatura) { var img = el("img"); img.src = miniatura; img.alt = ""; img.loading = "lazy"; b.appendChild(img); }
      b.appendChild(el("span", "media-item-titulo", m.titulo));
      if (m.tipo || m.duracion) b.appendChild(el("span", "media-tipo", [m.tipo, m.duracion].filter(Boolean).join(" · ")));
      if (i === 0) b.classList.add("activo");
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(mediaLista.querySelectorAll(".media-item"), function (x) { x.classList.toggle("activo", x === b); });
        pintarDestacado(m);
        mediaDest.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      li.appendChild(b);
      mediaLista.appendChild(li);
    });
    mediaLista.hidden = !mediaLista.children.length;
    mediaSec.hidden = false;
  });

  /* ---------- Formulario «Quiero participar» ---------- */
  var form = document.getElementById("formParticipa");
  var formOk = document.getElementById("formOk");
  var formError = document.getElementById("formError");
  var formEnviar = document.getElementById("formEnviar");
  var selModalidad = document.getElementById("f-modalidad");

  // Los botones de modalidad y de mesa dejan el formulario ya preparado
  Array.prototype.forEach.call(document.querySelectorAll("[data-modalidad]"), function (a) {
    a.addEventListener("click", function () { selModalidad.value = a.getAttribute("data-modalidad"); });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".btn-mesa[data-mesa]"), function (a) {
    a.addEventListener("click", function () {
      var cb = document.getElementById("f-mesa-" + a.getAttribute("data-mesa"));
      if (cb) cb.checked = true;
    });
  });

  // Confirmación en una ventana emergente; el formulario se vacía para la siguiente persona
  function mostrarOk() {
    form.reset();
    formError.hidden = true;
    if (typeof formOk.showModal === "function") formOk.showModal();
    else formOk.setAttribute("open", "");
  }
  formOk.addEventListener("click", function (e) {
    if (e.target === formOk || e.target.hasAttribute("data-cerrar")) formOk.close();
  });
  // Sin JavaScript el formulario vuelve con ?enviado=1
  if (/[?&]enviado=1/.test(location.search)) mostrarOk();

  function error(msg, campo) {
    formError.textContent = msg;
    formError.hidden = false;
    if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
  }
  form.addEventListener("input", function (e) { e.target.removeAttribute("aria-invalid"); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.hidden = true;
    var req = [["f-empresa", "Escribe el nombre de tu empresa u organización."],
               ["f-persona", "Escribe el nombre de la persona de contacto."],
               ["f-email", "Escribe un correo electrónico válido para poder contactarte."]];
    for (var i = 0; i < req.length; i++) {
      var c = document.getElementById(req[i][0]);
      if (!c.value.trim() || (c.type === "email" && !c.checkValidity())) { error(req[i][1], c); return; }
    }
    var acepto = document.getElementById("f-acepto");
    if (!acepto.checked) { error("Para enviar la solicitud necesitamos que aceptes el uso de tus datos para contactarte.", acepto); return; }

    // Mientras se envía: tres piezas que saltan dentro del botón y el formulario se atenúa
    formEnviar.disabled = true;
    formEnviar.innerHTML = '<span class="cargando" aria-hidden="true"><i></i><i></i><i></i></span>Enviando…';
    form.classList.add("enviando");
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (res && res.ok) { mostrarOk(); return; }
        error((res && res.error) || "No hemos podido guardar la solicitud. Inténtalo de nuevo en unos minutos.");
      })
      .catch(function () { error("No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo."); })
      .then(function () {
        formEnviar.disabled = false;
        formEnviar.textContent = "Enviar solicitud";
        form.classList.remove("enviando");
      });
  });

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
