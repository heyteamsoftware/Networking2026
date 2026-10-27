// Monta el vídeo promocional de Networking 2026: las imágenes del encuentro, la locución
// y una capa animada con la identidad (el tangram, las piezas que son islas y La Graciosa, la pieza que falta).
//
// Uso:
//   node video.js <video.mp4> <locucion.mp3> <salida.mp4>
//   node video.js <video.mp4> <locucion.mp3> <salida.mp4> --musica <musica.mp3>   (música por debajo de la voz)
//   node video.js <video.mp4> <locucion.mp3> <carpeta> --muestras 2,5,11   (fotogramas de prueba en PNG)
//
// Necesita ffmpeg en el PATH. La capa animada se dibuja en SVG fotograma a fotograma (textos en contornos,
// con las fuentes de la identidad) y se pasa en crudo a ffmpeg, que la superpone al montaje de las imágenes.
const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const sharp = require("sharp");
const G = require("./generar.js");
const P = require("./piezas.js");

const W = 1920, H = 1080, FPS = 25, DISENO = 77; // duración del guion de diseño, en segundos
const C = G.C, NOCHE2 = "#1c2b4d", SUAVE = "#b4b8c8";
const MESA = G.MESA_COLOR; // rojo, naranja, azul, amarillo
const CAP = 0.7;

// ---------- Montaje de las imágenes: [inicio en el vídeo final, fin, segundo de origen] ----------
const TRAMOS = [
  [0, 9.7, 5.0],     // pasillo, público, manos arriba (se ve a través de las piezas)
  [9.7, 13.4, 0.0],  // cartel del CIFP y letras de madera
  [13.4, 17.9, 47.0], // «Centro Integrado de Formación Profesional»
  [17.9, 22.4, 29.0], // la sala llena
  [22.4, 25.1, 17.0], // ponente
  [25.1, 29.8, 53.0], // conversaciones en mesa
  [29.8, 35.1, 40.0], // documento Networking y mesas
  [35.1, 41.6, 80.0], // post-its, trofeo, corazones
  [41.6, 49.6, 62.0], // mesas de trabajo
  [49.6, 53.5, 74.5], // micrófono: Radio Atlante
  [53.5, 61.3, 20.0], // (oculto por el mapa)
  [61.3, 67.1, 90.0], // sonrisas y trofeos TG
  [67.1, 77.0, 86.0], // (oculto por el cierre)
];
const BARRIDOS = [9.7, 41.6, 61.3]; // cambios de capítulo con barrido de piezas

// ---------- Sincronía con la locución ----------
// Todas las animaciones y tramos están escritos sobre un guion de diseño (la primera locución).
// Cada par [diseño, locución] dice cuándo empieza la misma frase en la locución que se usa ahora
// (medido con silencedetect); entre pares, el tiempo se estira o encoge en línea recta.
const ANCLAS = [[0, 0], [1.76, 1.91], [3.49, 3.48], [9.73, 9.29], [11.2, 10.81], [13.43, 13.81], [17.95, 17.81], [20.49, 20.47],
  [22.48, 22.83], [25.16, 25.07], [27.55, 27.16], [29.89, 29.45], [31.8, 31.62], [35.18, 34.94], [36.95, 36.67], [38.57, 38.48],
  [41.71, 41.73], [43.75, 43.82], [44.93, 45.31], [46.7, 47.28], [49.73, 50.18], [53.4, 53.94], [55.46, 55.89], [57.45, 58.05],
  [58.57, 59.51], [59.71, 60.59], [61.45, 62.59], [63.29, 64.33], [64.86, 66.08], [66.99, 67.99], [69.45, 70.87], [70.96, 72.42],
  [73.37, 74.81], [75.21, 75.83]];
function interpolar(x, de, a) {
  const n = ANCLAS.length;
  if (x <= ANCLAS[0][de]) return ANCLAS[0][a] + (x - ANCLAS[0][de]);
  if (x >= ANCLAS[n - 1][de]) return ANCLAS[n - 1][a] + (x - ANCLAS[n - 1][de]);
  let i = 0;
  while (ANCLAS[i + 1][de] < x) i++;
  const [p, q] = [ANCLAS[i], ANCLAS[i + 1]];
  return p[a] + ((x - p[de]) / (q[de] - p[de])) * (q[a] - p[a]);
}
const diseno = (t) => interpolar(t, 1, 0); // instante de la locución → instante del guion
const real = (t) => interpolar(t, 0, 1);   // instante del guion → instante de la locución
const TOTAL = +real(DISENO).toFixed(2);
const TRAMOS_REALES = TRAMOS.map(([a, b, o]) => [real(a), real(b), o]);
const MUSICA_DESDE = 75.4; // segundo de la música en el que empieza: así su final natural coincide con el del vídeo

// ---------- Utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = (x) => 1 - Math.pow(1 - x, 3);
const eback = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const f2 = (n) => +n.toFixed(2);
// Visibilidad con entrada y salida suaves
const vis = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));
const txt = (f, s, x, y, size, fill, o = {}) => P.txt(f, s, x, y, size, fill, o);
const ancho = (f, s, size, tr = 0) => G.medir(f, s, size, tr);
const grupo = (op, contenido, tr = "") => (op <= 0.001 ? "" : `<g opacity="${f2(op)}"${tr ? ` transform="${tr}"` : ""}>${contenido}</g>`);

const PIEZAS = G.PIEZAS.map((p) => ({ ...p, ins: G.inset(p.pts, G.JUNTA), c: G.centroide(p.pts) }));
const poly = (pts) => G.pts(pts);

// Tarjeta azul noche con la esquina doblada del color de su mesa (como en la web)
function tarjeta(x, y, w, h, color, cs = 40, fondo = C.noche) {
  return `<path d="M${x} ${y}H${x + w - cs}L${x + w} ${y + cs}V${y + h}H${x}Z" fill="${fondo}"/>` +
    `<path d="M${x + w - cs} ${y}L${x + w} ${y + cs}H${x + w - cs}Z" fill="${color}"/>`;
}
// Barrido de cambio de capítulo: una banda diagonal de cuatro piezas de color que cruza la pantalla
function barrido(t, c) {
  const p = prog(t, c - 0.45, c + 0.45);
  if (p <= 0 || p >= 1) return "";
  const w = 1200, x0 = 3000 - 7800 * p;
  return MESA.map((col, i) => {
    const a = x0 + i * w;
    return `<polygon points="${a},0 ${a + w + 2},0 ${a + w + 2 - H},${H} ${a - H},${H}" fill="${col}"/>`;
  }).join("");
}

// Archipiélago: transformaciones de cada pieza en el mapa (mismas posiciones que la web)
const MAPA = { k: 1.3 };
MAPA.ox = (W - 1240 * MAPA.k) / 2 - 40 * MAPA.k;
MAPA.oy = 130 - 15 * MAPA.k;
const enMapa = (x, y) => [MAPA.ox + x * MAPA.k, MAPA.oy + y * MAPA.k];
const ROTULOS = { ideas: [392, 290], proyectos: [1060, 478], territorio: [300, 492], conexiones: [717, 548], personas: [140, 594], futuro: [1060, 132], empresa: [165, 350] };

// Pieza colocada con centroide en (x, y), giro r y escala s (sobre la retícula 400×400)
const pieza = (p, x, y, r, s, attrs) =>
  `<polygon points="${poly(p.ins)}" transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(r)}) scale(${f2(s)}) translate(${f2(-p.c[0])} ${f2(-p.c[1])})" ${attrs}/>`;

// La Graciosa: triángulo pequeño; dibujada centrada en (x, y) con lado l
function graciosa(x, y, l, attrs, r = 15) {
  return `<polygon points="0,0 ${l},0 0,${l}" transform="translate(${f2(x)} ${f2(y)}) rotate(${r}) translate(${f2(-l / 3)} ${f2(-l / 3)})" ${attrs}/>`;
}

// Logo del CIFP (se carga una vez)
let LOGO_CIFP = "";

// =========================================================================================
// La capa animada en el instante t
// =========================================================================================
function capa(t) {
  let s = "";
  const defs = `<defs>
    <linearGradient id="abajo" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="${C.noche}" stop-opacity="0"/><stop offset="1" stop-color="${C.noche}" stop-opacity="0.92"/></linearGradient>
    <linearGradient id="izq" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.noche}" stop-opacity="0.9"/><stop offset="0.65" stop-color="${C.noche}" stop-opacity="0"/></linearGradient>
    <linearGradient id="der" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${C.noche}" stop-opacity="0.92"/><stop offset="0.6" stop-color="${C.noche}" stop-opacity="0"/></linearGradient>
  </defs>`;

  // ---------- 0–9,9 · Siete piezas que se montan y se abren como ventanas ----------
  if (t < 10.0) {
    let cx = 960, cy = 470, lado = 520;
    const m = eio(prog(t, 3.4, 4.3));
    cx = lerp(cx, 560, m); cy = lerp(cy, 540, m); lado = lerp(lado, 600, m);
    const e = eio(prog(t, 8.9, 9.9));
    cx = lerp(cx, 960, e); cy = lerp(cy, 540, e); lado = lerp(lado, 3800, e);
    const k = lado / 400, x0 = cx - lado / 2, y0 = cy - lado / 2;
    const abiertas = t >= 2.2;
    // Fondo noche; desde que las piezas están montadas, con huecos donde van las piezas (ventanas al vídeo)
    let d = `M0 0H${W}V${H}H0Z`;
    if (abiertas) for (const p of PIEZAS) d += "M" + p.ins.map(([x, y]) => `${f2(x0 + x * k)} ${f2(y0 + y * k)}`).join("L") + "Z";
    s += `<path d="${d}" fill="${C.noche}" fill-rule="evenodd"/>`;
    // Las piezas: llegan volando y, a partir de 3,9 s, se vuelven transparentes (queda su contorno)
    const relleno = 1 - prog(t, 3.9, 5.0);
    PIEZAS.forEach((p, i) => {
      const a = prog(t, 0.1 + i * 0.16, 0.9 + i * 0.16);
      const ea = eout(a);
      const dx = p.c[0] - 200, dy = p.c[1] - 200, n = Math.hypot(dx, dy) || 1;
      const px = x0 + p.c[0] * k + (dx / n) * 900 * (1 - ea), py = y0 + p.c[1] * k + (dy / n) * 900 * (1 - ea);
      const r = (i % 2 ? 1 : -1) * 140 * (1 - ea);
      if (a <= 0) return;
      if (relleno > 0) s += pieza(p, px, py, r, k, `fill="${MESA[p.mesa]}" opacity="${f2(relleno * clamp(a * 3))}"`);
      if (abiertas) s += pieza(p, px, py, r, k, `fill="none" stroke="${MESA[p.mesa]}" stroke-width="${f2(6 / k)}" stroke-linejoin="round"`);
    });
    // «Siete piezas · y una pregunta»
    s += grupo(vis(t, 0.3, 3.4) * (1 - m), txt(G.OUTFIT_SB, "SIETE PIEZAS", 960, 830, 34, C.sol, { anchor: "middle", tracking: 7 }));
    s += grupo(vis(t, 1.75, 3.4) * (1 - m), txt(G.OUTFIT_SB, "Y UNA PREGUNTA", 960, 885, 28, SUAVE, { anchor: "middle", tracking: 6 }));
    // La pregunta, línea a línea
    const LINEAS = [["¿QUÉ PASA CUANDO", 3.5, C.arena], ["LA FORMACIÓN PROFESIONAL", 4.53, C.arena], ["Y LAS EMPRESAS", 5.96, C.arena], ["SE SIENTAN A", 6.86, C.arena], ["CONSTRUIR JUNTAS?", 7.54, C.sol]];
    const salida = 1 - prog(t, 8.6, 9.0);
    LINEAS.forEach(([l, a, col], i) => {
      const v = eout(prog(t, a, a + 0.45)) * salida;
      s += grupo(v, txt(G.BEBAS, l, 1000 + (1 - v) * 60, 330 + i * 105, 96, col, { tracking: 1 }));
    });
  }

  // ---------- 9,7–17,9 · El 20 de noviembre · Networking 2026 ----------
  if (t >= 9.6 && t < 18.0) {
    s += grupo(vis(t, 9.7, 17.9, 0.4, 0.3), `<rect width="${W}" height="${H}" fill="url(#abajo)"/>`);
    // Tarjeta de la fecha, como la de la web
    const en = eout(prog(t, 9.9, 10.5)), sal = prog(t, 13.0, 13.4);
    if (en > 0 && sal < 1) {
      const x = 120 - (1 - en) * 760, y = 690 + eio(sal) * 60;
      let c = tarjeta(x, y, 600, 250, C.sol, 56);
      c += txt(G.BEBAS, "20", x + 40, y + 205, 200, C.sol);
      c += txt(G.BEBAS, "NOVIEMBRE", x + 250, y + 115, 84, C.arena, { tracking: 1 });
      c += txt(G.BEBAS, "2026", x + 250, y + 200, 84, C.arena, { tracking: 1 });
      s += grupo(1 - sal, c);
    }
    s += grupo(vis(t, 11.2, 13.4, 0.35, 0.3), txt(G.OUTFIT_SB, "EL CIFP TONY GALLARDO ABRE SUS PUERTAS", 120, 655, 34, C.arena, { tracking: 4 }));
    // Logotipo: el tangram se monta y aparece el nombre
    const vl = vis(t, 13.4, 17.9, 0.3, 0.35);
    if (vl > 0) s += grupo(vl, logotipo(t, 13.45, 960, 735, 1));
  }

  // ---------- 17,9–22,4 · Empresas, talento y Formación Profesional ----------
  if (t >= 17.8 && t < 22.5) {
    const v = vis(t, 17.9, 22.4, 0.3, 0.3);
    s += grupo(v, `<rect width="${W}" height="${H}" fill="url(#abajo)"/>`);
    s += grupo(v * prog(t, 17.95, 18.3), txt(G.OUTFIT_SB, "UN ENCUENTRO ENTRE", 120, 760, 34, C.sol, { tracking: 6 }));
    const CARTAS = [["EMPRESAS", 19.13, MESA[0]], ["TALENTO", 20.4, MESA[2]], ["FORMACIÓN PROFESIONAL", 21.0, MESA[1]]];
    let x = 120;
    for (const [w, a, col] of CARTAS) {
      const tw = ancho(G.BEBAS, w, 80, 1) + 100;
      const e = prog(t, a, a + 0.5);
      if (e > 0) s += grupo(v * clamp(e * 2), tarjeta(x, 800 + (1 - eback(e)) * 80, tw, 150, col, 40) + txt(G.BEBAS, w, x + 40, 800 + (1 - eback(e)) * 80 + 105, 80, C.arena, { tracking: 1 }));
      x += tw + 24;
    }
  }

  // ---------- 22,4–25,1 · No venimos a escuchar discursos ----------
  if (t >= 22.3 && t < 25.3) {
    const v = vis(t, 22.4, 25.15, 0.25, 0.3);
    s += grupo(v * 0.6, `<rect width="${W}" height="${H}" fill="${C.noche}"/>`);
    s += grupo(v, txt(G.BEBAS, "NO VENIMOS A", 960, 470, 120, C.arena, { anchor: "middle", tracking: 2 }));
    const l2 = "ESCUCHAR DISCURSOS", w2 = ancho(G.BEBAS, l2, 150, 2);
    s += grupo(v, txt(G.BEBAS, l2, 960, 630, 150, C.arena, { anchor: "middle", tracking: 2 }));
    const tach = eio(prog(t, 23.4, 24.0));
    if (tach > 0) s += grupo(v, `<rect x="${960 - w2 / 2 - 20}" y="566" width="${(w2 + 40) * tach}" height="22" fill="${MESA[0]}"/>`);
  }

  // ---------- 25,1–41,6 · Conectar · Descubrir · Activar ----------
  if (t >= 25.0 && t < 41.7) {
    s += grupo(vis(t, 25.1, 41.6, 0.3, 0.3), `<rect width="${W}" height="${H}" fill="url(#abajo)"/>`);
    s += verbo(t, 25.2, 29.75, "CONECTAR", MESA[2], "con el profesorado y con el talento que viene");
    s += verbo(t, 29.9, 35.05, "DESCUBRIR", MESA[1], "proyectos que ya están en marcha");
    s += verbo(t, 35.2, 41.4, "ACTIVAR", MESA[0], null, [["Retos compartidos", 36.95], ["Prácticas", 38.6], ["Colaboraciones reales", 39.56]]);
  }

  // ---------- 41,6–49,6 · Una mañana de retos en equipo ----------
  if (t >= 41.5 && t < 49.8) {
    const v = vis(t, 41.6, 49.65, 0.3, 0.35);
    s += grupo(v, `<rect width="${W}" height="${H}" fill="url(#der)"/>`);
    const x = 1150;
    s += grupo(v * prog(t, 41.75, 42.1), txt(G.OUTFIT_SB, "UNA MAÑANA DE", x, 250, 34, C.sol, { tracking: 6 }));
    s += grupo(v * eout(prog(t, 41.9, 42.4)), txt(G.BEBAS, "RETOS EN EQUIPO", x, 345, 110, C.arena, { tracking: 1 }));
    const RETOS = [["IDENTIDAD", "QUIÉNES SOMOS", 43.75, MESA[0]], ["TERRITORIO", "QUÉ NECESITA CANARIAS", 44.93, MESA[2]], ["OPORTUNIDAD", "DE LA IDEA A LA OPORTUNIDAD", 46.7, MESA[1]]];
    RETOS.forEach(([et, ti, a, col], i) => {
      const e = prog(t, a, a + 0.45);
      if (e <= 0) return;
      const y = 400 + i * 150, dx = (1 - eout(e)) * 140;
      let c = tarjeta(x + dx, y, 660, 128, col, 34);
      c += txt(G.OUTFIT_SB, et, x + dx + 32, y + 42, 22, col === MESA[3] ? C.sol : MESA_CLARO[MESA.indexOf(col)], { tracking: 5 });
      c += txt(G.BEBAS, ti, x + dx + 32, y + 100, 58, C.arena, { tracking: 1 });
      s += grupo(v * clamp(e * 2), c);
    });
  }

  // ---------- 49,6–53,5 · Radio Atlante, en directo ----------
  if (t >= 49.5 && t < 53.6) {
    const v = vis(t, 49.7, 53.45, 0.3, 0.3);
    s += grupo(v, `<rect width="${W}" height="${H}" fill="url(#abajo)"/>`);
    // Ondas que salen del punto rojo
    let ondas = "";
    for (let i = 0; i < 4; i++) {
      const q = ((t - 49.7) / 1.6 + i / 4) % 1;
      ondas += `<circle cx="150" cy="770" r="${f2(14 + q * 220)}" fill="none" stroke="#7fb2f0" stroke-width="3" opacity="${f2((1 - q) * 0.55)}"/>`;
    }
    const late = 0.55 + 0.45 * Math.abs(Math.sin((t - 49.7) * 4));
    let c = ondas + `<rect x="120" y="740" width="270" height="60" rx="30" fill="${NOCHE2}"/>` +
      `<circle cx="150" cy="770" r="11" fill="#ff5a3c" opacity="${f2(late)}"/>` +
      txt(G.OUTFIT_SB, "EN ANTENA", 176, 781, 28, "#ff8a6b", { tracking: 4 });
    c += grupo(prog(t, 51.65, 51.95), txt(G.BEBAS, "RADIO ATLANTE", 120 + (1 - eout(prog(t, 51.65, 52.1))) * -80, 935, 150, C.arena, { tracking: 2 })); // con la voz: «desde Radio Atlante»
    c += txt(G.OUTFIT, "Experiencias contadas en directo", 124, 995, 38, SUAVE);
    s += grupo(v, c);
  }

  // ---------- 53,5–61,3 · Cada pieza es una isla · Falta una ----------
  if (t >= 53.0 && t < 61.8) s += escenaMapa(t);

  // ---------- 61,3–67,1 · La promesa ----------
  if (t >= 61.2 && t < 67.2) {
    const v = vis(t, 61.3, 67.1, 0.3, 0.3);
    s += grupo(v, `<rect width="${W}" height="${H}" fill="url(#izq)"/>`);
    const L = [["EL TALENTO SE ENCUENTRA.", 61.45, C.arena, MESA[0]], ["LAS IDEAS SE CONECTAN.", 63.3, C.arena, MESA[2]], ["EL FUTURO SE CONSTRUYE.", 64.86, C.sol, MESA[3]]];
    L.forEach(([l, a, col, tri], i) => {
      const e = eout(prog(t, a, a + 0.5));
      if (e <= 0) return;
      const y = 600 + i * 125, x = 120 + (1 - e) * -120;
      s += grupo(v * e, `<polygon points="${x},${y - 78} ${x + 44},${y - 78} ${x},${y - 34}" fill="${tri}"/>` + txt(G.BEBAS, l, x + 70, y, 112, col, { tracking: 1 }));
    });
  }

  // ---------- 67,1–69,4 · La pieza que nos falta eres tú ----------
  if (t >= 66.7 && t < 70.4) s += escenaGraciosa(t);

  // ---------- 69,4–77 · Reserva tu plaza · Logotipo y CIFP Tony Gallardo ----------
  if (t >= 69.2) s += escenaCierre(t);

  // Barridos de cambio de capítulo
  for (const c of BARRIDOS) s += barrido(t, c);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${s}</svg>`;
}
const MESA_CLARO = ["#ff8a6b", "#f3a35a", "#7fb2f0", "#ffcc00"];

// Tarjeta de verbo: entra desde la izquierda como una pieza que se coloca
function verbo(t, a, b, palabra, color, sub, chips) {
  const v = vis(t, a, b, 0.01, 0.3);
  if (v <= 0) return "";
  const e = eout(prog(t, a, a + 0.55));
  const size = 190, tw = ancho(G.BEBAS, palabra, size, 2);
  const w = Math.max(tw + 120, 860), x = 120 - (1 - e) * (w + 200), y = 640, h = 330;
  let c = tarjeta(x, y, w, h, color, 64);
  c += txt(G.BEBAS, palabra, x + 50, y + 185, size, C.arena, { tracking: 2 });
  if (sub) c += grupo(prog(t, a + 0.4, a + 0.8), txt(G.OUTFIT, sub, x + 54, y + 262, 40, "#c9ccd8"));
  if (chips) {
    let cx = x + 54;
    for (const [l, ca] of chips) {
      const ce = prog(t, ca, ca + 0.35);
      const cw = ancho(G.OUTFIT_SB, l, 30) + 50;
      if (ce > 0) c += grupo(ce, `<rect x="${cx}" y="${y + 225 + (1 - eback(ce)) * 30}" width="${cw}" height="56" rx="28" fill="${NOCHE2}"/>` + txt(G.OUTFIT_SB, l, cx + 25, y + 264 + (1 - eback(ce)) * 30, 30, C.arena));
      cx += cw + 14;
    }
  }
  return grupo(v, c, `rotate(${f2((1 - e) * -4)} ${x} ${y + h})`);
}

// Logotipo animado: tangram que se monta + NETWORKING 2026 + JUNTOS SOMOS FP. (cx, cy) es el centro del conjunto.
function logotipo(t, a, cx, cy, escala, conTarjeta = true, juntos = 2.0) {
  const lado = 230 * escala, size = 170 * escala;
  const tw = ancho(G.BEBAS, "NETWORKING 2026", size, 2);
  const total = lado + 50 * escala + tw;
  const x0 = cx - total / 2, y0 = cy - lado / 2, k = lado / 400;
  let s = conTarjeta ? tarjeta(x0 - 60 * escala, y0 - 50 * escala, total + 120 * escala, lado + 100 * escala, C.sol, 44 * escala) : "";
  PIEZAS.forEach((p, i) => {
    const e = eout(prog(t, a + i * 0.06, a + 0.45 + i * 0.06));
    if (e <= 0) return;
    const dx = p.c[0] - 200, dy = p.c[1] - 200, n = Math.hypot(dx, dy) || 1;
    s += pieza(p, x0 + p.c[0] * k + (dx / n) * 160 * (1 - e), y0 + p.c[1] * k + (dy / n) * 160 * (1 - e), 0, k, `fill="${MESA[p.mesa]}" opacity="${f2(e)}"`);
  });
  const tx = x0 + lado + 50 * escala, et = eout(prog(t, a + 0.35, a + 0.85));
  s += grupo(et, txt(G.BEBAS, "NETWORKING", tx + (1 - et) * 40, y0 + lado * 0.62, size, C.arena, { tracking: 2 }) +
    txt(G.BEBAS, "2026", tx + ancho(G.BEBAS, "NETWORKING ", size, 2) + (1 - et) * 40, y0 + lado * 0.62, size, C.sol, { tracking: 2 }));
  const ej = prog(t, a + juntos, a + juntos + 0.4);
  s += grupo(ej, txt(G.OUTFIT_SB, "JUNTOS SOMOS FP", tx + 4, y0 + lado * 0.93, 40 * escala, SUAVE, { tracking: 12 * escala }));
  return s;
}

// El cuadrado se abre en el archipiélago y aparece el hueco de La Graciosa
function escenaMapa(t) {
  const fondo = prog(t, 53.15, 53.55);
  let s = `<rect width="${W}" height="${H}" fill="${C.noche}" opacity="${f2(fondo)}"/>`;
  if (fondo <= 0) return s;
  // Cámara: se acerca hacia La Graciosa cuando «falta una»
  const ez = eio(prog(t, 57.3, 61.3)), z = 1 + 0.55 * ez;
  const [gx, gy] = enMapa(G.GRACIOSA.x, G.GRACIOSA.y);
  const tx = lerp(gx, 1250, ez), ty = lerp(gy, 330, ez); // La Graciosa se acerca al centro
  let m = "";
  const lado = 440, sx = 960 - lado / 2, sy = 470 - lado / 2, ks = lado / 400;
  PIEZAS.forEach((p, i) => {
    const isla = G.ISLAS[p.id];
    const e = eio(prog(t, 53.75 + i * 0.07, 55.15 + i * 0.07));
    const [ix, iy] = enMapa(isla.x, isla.y);
    const x = lerp(sx + p.c[0] * ks, ix, e), y = lerp(sy + p.c[1] * ks, iy, e);
    const r = lerp(0, isla.r, e), sc = lerp(ks, G.ESCALA_ISLAS * MAPA.k, e);
    const entra = eout(prog(t, 53.3 + i * 0.04, 53.75 + i * 0.04));
    m += pieza(p, x, y + (1 - entra) * 40, r, sc, `fill="${MESA[p.mesa]}" opacity="${f2(entra)}"`);
  });
  // Nombres de las islas
  const vn = prog(t, 55.3, 55.8);
  if (vn > 0) {
    let n = "";
    for (const p of PIEZAS) {
      const [rx, ry] = enMapa(...ROTULOS[p.id]);
      n += txt(G.OUTFIT_SB, G.ISLAS[p.id].isla, rx, ry, 26, C.arena, { anchor: "middle" });
    }
    m += grupo(vn, n);
  }
  // La Graciosa: el hueco discontinuo que late
  const vg = prog(t, 57.4, 57.8);
  if (vg > 0) {
    const [px, py] = enMapa(G.GRACIOSA.x, G.GRACIOSA.y);
    const late = 1 + 0.12 * Math.sin((t - 57.4) * 5.5);
    const l = G.GRACIOSA.lado * MAPA.k * late;
    m += grupo(vg, graciosa(px, py, l, `fill="${C.sol}" fill-opacity="0.12" stroke="${C.sol}" stroke-width="4" stroke-dasharray="12 8" stroke-linejoin="round"`, G.GRACIOSA.r));
    m += grupo(prog(t, 58.6, 59.0), txt(G.OUTFIT_SB, "LA GRACIOSA", px - 50, py + 10, 24, C.sol, { anchor: "end", tracking: 4 }));
  }
  s += grupo(fondo, m, `translate(${f2(tx)} ${f2(ty)}) scale(${f2(z)}) translate(${f2(-gx)} ${f2(-gy)})`);
  // Franja para las frases, sin islas detrás
  s += grupo(fondo, `<rect y="880" width="${W}" height="200" fill="${C.noche}"/>`);
  // Frases
  const FR = [["CADA PIEZA ES UNA ISLA", 53.45, 55.3, C.arena], ["JUNTAS FORMAN ALGO MÁS GRANDE", 55.45, 57.3, C.arena],
    ["PERO FALTA UNA.", 57.45, 58.5, C.arena], ["LA OCTAVA.", 58.57, 59.6, C.sol], ["LA QUE COMPLETA EL MAPA.", 59.7, 61.5, C.sol]];
  for (const [l, a, b, col] of FR) s += grupo(vis(t, a, b, 0.25, 0.2), txt(G.BEBAS, l, 960, 985, 100, col, { anchor: "middle", tracking: 2 }));
  return s;
}

// La Graciosa llega y completa el mapa: la pieza que nos falta eres tú
function escenaGraciosa(t) {
  const fondo = prog(t, 66.75, 67.1) * (1 - prog(t, 69.6, 70.3));
  let s = `<rect width="${W}" height="${H}" fill="${C.noche}" opacity="${f2(prog(t, 66.75, 67.1))}"/>`;
  let m = "";
  for (const p of PIEZAS) {
    const isla = G.ISLAS[p.id], [ix, iy] = enMapa(isla.x, isla.y);
    m += pieza(p, ix, iy, isla.r, G.ESCALA_ISLAS * MAPA.k, `fill="${MESA[p.mesa]}"`);
  }
  const [px, py] = enMapa(G.GRACIOSA.x, G.GRACIOSA.y);
  const e = eback(prog(t, 67.05, 67.75));
  const l = G.GRACIOSA.lado * MAPA.k;
  // Llega desde abajo a la izquierda, girando, y encaja
  m += graciosa(lerp(560, px, e), lerp(1150, py, e), l * lerp(4, 1, e), `fill="${C.sol}"`, lerp(-180, G.GRACIOSA.r, e));
  const flash = prog(t, 67.75, 68.6);
  if (flash > 0 && flash < 1) m += `<circle cx="${f2(px)}" cy="${f2(py)}" r="${f2(20 + flash * 160)}" fill="none" stroke="${C.sol}" stroke-width="5" opacity="${f2(1 - flash)}"/>`;
  s += grupo(fondo, m, `translate(0 -40)`);
  const vt = vis(t, 67.0, 70.0, 0.35, 0.4);
  s += grupo(vt, txt(G.BEBAS, "LA PIEZA QUE NOS FALTA", 960, 900, 120, C.arena, { anchor: "middle", tracking: 2 }));
  s += grupo(vt * eout(prog(t, 67.8, 68.3)), txt(G.BEBAS, "ERES TÚ", 960, 1030, 130, C.sol, { anchor: "middle", tracking: 3 }));
  return s;
}

// Reserva tu plaza con un QR a la web, y cierre: el CIFP Tony Gallardo en grande y el logotipo de Networking debajo
function escenaCierre(t) {
  let s = `<rect width="${W}" height="${H}" fill="${C.noche}" opacity="${f2(prog(t, 69.2, 69.5))}"/>`;
  // Botón «Reserva tu plaza» y el QR (unos tres segundos en pantalla, para poder escanearlo)
  const vb = vis(t, 69.45, 72.5, 0.3, 0.4);
  if (vb > 0) {
    const e = eback(prog(t, 69.45, 69.9)), sc = lerp(0.6, 1, e);
    const b = `<rect x="-330" y="-62" width="660" height="124" rx="62" fill="${C.sol}"/>` + txt(G.OUTFIT_SB, "Reserva tu plaza", 0, 18, 54, C.noche, { anchor: "middle" });
    s += grupo(vb, b, `translate(960 250) scale(${f2(sc)})`);
    const eq = eout(prog(t, 69.75, 70.25)), lado = 400;
    const q = `<rect x="${-lado / 2 - 24}" y="${-lado / 2 - 24}" width="${lado + 48}" height="${lado + 48}" rx="16" fill="#ffffff"/>` + P.qr(P.URL_WEB, -lado / 2, -lado / 2, lado, { color: C.noche, fondo: "#ffffff", margen: 0.02 });
    s += grupo(vb * eq, q, `translate(960 ${f2(630 + (1 - eq) * 40)})`);
    s += grupo(vb * prog(t, 70.1, 70.5), txt(G.OUTFIT, "Escanea el código y apúntate", 960, 1000, 36, SUAVE, { anchor: "middle" }));
  }
  // Cierre: logo del CIFP en grande, su nombre debajo y el logotipo de Networking más pequeño
  if (t >= 72.2) {
    const e = eback(prog(t, 72.3, 72.9)), d = 400, cx = 960, cy = 330;
    const logo = `<circle cx="0" cy="0" r="${d / 2}" fill="#ffffff"/><image href="${LOGO_CIFP}" x="${-d / 2}" y="${-d / 2}" width="${d}" height="${d}"/>`;
    s += grupo(clamp(prog(t, 72.3, 72.6)), logo, `translate(${cx} ${cy}) scale(${f2(lerp(0.7, 1, e))})`);
    const en = eout(prog(t, 72.7, 73.1));
    s += grupo(en, txt(G.BEBAS, "CIFP TONY GALLARDO", 960, 640 + (1 - en) * 30, 110, C.arena, { anchor: "middle", tracking: 3 }));
    s += grupo(prog(t, 73.0, 73.3), `<rect x="900" y="690" width="120" height="4" fill="${C.sol}"/>`);
    s += logotipo(t, 73.2, 960, 850, 0.6, false, 0.3);
  }
  // Fundido final
  s += `<rect width="${W}" height="${H}" fill="#000" opacity="${f2(prog(t, 76.2, 77.0))}"/>`;
  return s;
}

// =========================================================================================
// Render
// =========================================================================================
const [, , VIDEO, AUDIO, SALIDA, ...resto] = process.argv;
const MUSICA = resto.includes("--musica") ? resto[resto.indexOf("--musica") + 1] : null;
if (!VIDEO || !AUDIO || !SALIDA) { console.log("Uso: node video.js <video.mp4> <locucion.mp3> <salida.mp4> [--muestras 2,5,11]"); process.exit(1); }

async function cargar() {
  const b = await sharp(path.join(__dirname, "project", "assets", "Instituciones", "cifp-tony-gallardo.png")).resize(400).png().toBuffer();
  LOGO_CIFP = "data:image/png;base64," + b.toString("base64");
}
const renderCapa = (t) => sharp(Buffer.from(capa(diseno(t)))).ensureAlpha().raw().toBuffer();
const origen = (t) => { const s = TRAMOS_REALES.find(([a, b]) => t >= a && t < b) || TRAMOS_REALES[TRAMOS_REALES.length - 1]; return s[2] + (t - s[0]); };

async function muestras(lista) {
  fs.mkdirSync(SALIDA, { recursive: true });
  for (const t of lista) {
    const fondo = execFileSync("ffmpeg", ["-v", "error", "-ss", String(origen(t)), "-i", VIDEO, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 64 << 20 });
    const capaPng = await sharp(Buffer.from(capa(diseno(t)))).png().toBuffer();
    await sharp(fondo).resize(W, H).composite([{ input: capaPng }]).jpeg({ quality: 80 }).toFile(path.join(SALIDA, `t${String(t).replace(".", "_")}.jpg`));
    process.stdout.write(t + " ");
  }
  console.log("\nmuestras en", SALIDA);
}

async function video() {
  const N = Math.round(TOTAL * FPS);
  // Montaje de las imágenes: cada tramo se recorta del original y se concatenan
  const trozos = TRAMOS_REALES.map(([a, b, o], i) => `[0:v]trim=start=${o}:end=${(o + b - a).toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H},setsar=1[v${i}]`);
  // Audio: la voz delante; la música, más baja y que se aparta (compresión lateral) cuando se habla
  const audio = MUSICA
    ? `[2:a]asplit=2[voz][llave];[3:a]atrim=start=${MUSICA_DESDE},asetpts=PTS-STARTPTS,volume=0.13,afade=t=in:d=1.5,afade=t=out:st=${(TOTAL - 2.5).toFixed(2)}:d=2.5[mus];` +
      `[mus][llave]sidechaincompress=threshold=0.015:ratio=8:attack=20:release=500[musb];[voz]apad[vozp];` +
      `[vozp][musb]amix=inputs=2:duration=longest:normalize=0,atrim=0:${TOTAL},loudnorm=I=-15:TP=-1.5:LRA=11[a]`
    : `[2:a]apad,atrim=0:${TOTAL}[a]`;
  const filtro = trozos.join(";") + ";" + TRAMOS_REALES.map((_, i) => `[v${i}]`).join("") + `concat=n=${TRAMOS_REALES.length}:v=1:a=0[base];` +
    `[1:v]format=rgba[capa];[base][capa]overlay=0:0:format=auto,format=yuv420p[out];` + audio;
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-i", VIDEO, "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-", "-i", AUDIO, ...(MUSICA ? ["-i", MUSICA] : []),
    "-filter_complex", filtro, "-map", "[out]", "-map", "[a]", "-t", String(TOTAL), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", SALIDA], { stdio: ["pipe", "inherit", "inherit"] });
  const cerrado = new Promise((ok, ko) => ff.on("close", (c) => (c === 0 ? ok() : ko(new Error("ffmpeg terminó con código " + c)))));
  const escribir = (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once("drain", ok)));
  const LOTE = 8, inicio = Date.now();
  for (let f = 0; f < N; f += LOTE) {
    const bufs = await Promise.all(Array.from({ length: Math.min(LOTE, N - f) }, (_, i) => renderCapa((f + i) / FPS)));
    for (const b of bufs) await escribir(b);
    if (f % 100 === 0) process.stdout.write(`\r${Math.round((f / N) * 100)} % · ${Math.round((Date.now() - inicio) / 1000)} s`);
  }
  ff.stdin.end();
  await cerrado;
  console.log(`\nvídeo listo: ${SALIDA}`);
}

(async () => {
  await cargar();
  const i = resto.indexOf("--muestras");
  if (i >= 0) await muestras(resto[i + 1].split(",").map(Number));
  else await video();
})().catch((e) => { console.error(e); process.exit(1); });
