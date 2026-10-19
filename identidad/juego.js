// Genera el material físico del juego «10 minutos para conectar» de Networking 2026.
// Uso: cd identidad && npm install && npm run juego
// Salida en ../piezas/juego/: PDF de imprenta (con sangrado, textos en contornos) y vistas PNG.
//
// Las piezas son las siete del tangram de la identidad (cada una, una isla) más La Graciosa,
// la octava: un triángulo pequeño en blanco donde cada empresa escribe su nombre.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");
const G = require("./generar.js");
const P = require("./piezas.js");
const { txt, parrafo, qr, img, lienzo, CAP } = P;

const OUT = path.join(__dirname, "..", "piezas", "juego");
const C = G.C;
const TINTA = C.noche, GRIS = "#6b7085", LINEA = "#d9cfbd";
const MESA_TEXTO = P.MESA_TEXTO_CLARO;

// ---------- Las ocho piezas, las ocho islas ----------
// n: orden del documento de la dirección; valor: lo que aporta cada isla al juego (propuesta creativa).
const ISLA = {
  ideas:      { n: "01", isla: "Tenerife",      valor: ["Talento y", "conocimiento"] },
  conexiones: { n: "02", isla: "Gran Canaria",  valor: ["Conexión y", "oportunidades"] },
  futuro:     { n: "03", isla: "Lanzarote",     valor: ["Creatividad", "e innovación"] },
  proyectos:  { n: "04", isla: "Fuerteventura", valor: ["Sostenibilidad", "y recursos"] },
  empresa:    { n: "05", isla: "La Palma",      valor: ["Investigación", "y aprendizaje"] },
  territorio: { n: "06", isla: "La Gomera",     valor: ["Colaboración", "y comunidad"] },
  personas:   { n: "07", isla: "El Hierro",     valor: ["Resiliencia y", "transición verde"] },
  graciosa:   { n: "08", isla: "La Graciosa",   valor: ["Equilibrio y", "futuro compartido"] },
};
const ORDEN = ["ideas", "conexiones", "futuro", "proyectos", "empresa", "territorio", "personas", "graciosa"];
const PIEZA = Object.fromEntries(G.PIEZAS.map((p) => [p.id, p]));
// La Graciosa tiene la forma del triángulo pequeño
const GRACIOSA_PTS = [[0, 0], [200, 0], [100, 100]];
const colorDe = (id) => (id === "graciosa" ? "#ffffff" : G.MESA_COLOR[PIEZA[id].mesa]);
const tintaDe = (id) => (id === "graciosa" || PIEZA[id].mesa === 3 ? TINTA : "#ffffff");

// Rótulo de cada pieza en la retícula 400 × 400: centro, tamaño del nombre y giro
const ROTULO = {
  ideas:      { x: 200, y: 78,  s: 34 },
  proyectos:  { x: 74,  y: 200, s: 25, rot: -90 },
  territorio: { x: 362, y: 100, s: 17, rot: -90 },
  conexiones: { x: 300, y: 200, s: 19 },
  personas:   { x: 200, y: 268, s: 17 },
  futuro:     { x: 162, y: 348, s: 22 },
  empresa:    { x: 328, y: 352, s: 24 },
};

// Polígono → path con esquinas ligeramente redondeadas (más amable al recortar y al tacto)
const polyPath = (p) => "M" + p.map(([x, y]) => G.fmt(x) + " " + G.fmt(y)).join("L") + "Z";

// Rótulo de una pieza: número, isla y valor, centrados en (x, y) y en unidades de la retícula
function rotulo(id, x, y, s, color, rot = 0) {
  const i = ISLA[id];
  let t = txt(G.OUTFIT_SB, i.n, x, y - s * 1.05, s * 0.42, color, { anchor: "middle", tracking: s * 0.04 });
  t += txt(G.BEBAS, i.isla.toUpperCase(), x, y + s * CAP / 2, s, color, { anchor: "middle", tracking: s * 0.02 });
  t += txt(G.OUTFIT, i.valor.join(" "), x, y + s * 1.05, s * 0.34, color, { anchor: "middle" });
  return rot ? `<g transform="rotate(${rot} ${x} ${y})">${t}</g>` : t;
}

// =========================================================================================
// 1 · LÁMINA DE PIEZAS RECORTABLES · A3 vertical
// =========================================================================================
// El tangram mide 180 mm de lado. Imprimir a una cara y pegar sobre cartón pluma de 5 mm.
const LADO = 180, K = LADO / 400;

function laminaPiezas() {
  const W = 297, H = 420, b = 3, m = 18;
  let s = "";
  s += `<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${H + 2 * b}" fill="#ffffff"/>`;
  s += txt(G.OUTFIT_SB, "NETWORKING 2026 · JUEGO «10 MINUTOS PARA CONECTAR»", m, m + 4, 4.2, GRIS, { tracking: 0.5 });
  s += txt(G.BEBAS, "LAS OCHO PIEZAS DEL ARCHIPIÉLAGO", m, m + 22, 17, TINTA, { tracking: 0.3 });
  s += parrafo(G.OUTFIT, "Una lámina por mesa. Imprime a una cara, pega la hoja sobre cartón pluma de 5 mm y recorta por la línea de corte. Las piezas encajan en un cuadrado: es el evento entero.",
    m, m + 32, 5, W - 2 * m, GRIS).svg;

  // Tangram despiezado: cada pieza separada para que la cuchilla pase entre ellas
  const ox = (W - LADO) / 2 - 6, oy = 70, sep = 1.2;
  s += `<g transform="translate(${ox} ${oy}) scale(${K})">`;
  for (const p of G.PIEZAS) {
    const [cx, cy] = G.centroide(p.pts);
    const dx = (cx - 200) * sep * 0.03 / K, dy = (cy - 200) * sep * 0.03 / K;
    const pts = p.pts.map(([x, y]) => [x + dx, y + dy]);
    s += piezaRecortable(p.id, pts);
  }
  s += `</g>`;

  // La Graciosa: la pieza blanca, para escribir
  const gy = oy + LADO + 36, gk = K, gw = 200 * gk;
  const gx = W / 2 - gw / 2;
  s += `<g transform="translate(${gx} ${gy}) scale(${gk})">${piezaRecortable("graciosa", GRACIOSA_PTS)}</g>`;
  s += txt(G.BEBAS, "08 · LA GRACIOSA, LA PIEZA QUE FALTA", W / 2, gy + 100 * gk + 14, 9, TINTA, { anchor: "middle", tracking: 0.2 });
  s += parrafo(G.OUTFIT, "Se reparte en blanco. Al terminar el reto, la empresa escribe su nombre en ella y la lleva al mural «La pieza que nos falta eres tú».",
    W / 2 - 80, gy + 100 * gk + 22, 4.6, 160, GRIS).svg.replace(/<path/g, "<path") ;

  // Pie: leyenda de corte y logos
  const py = H - 40;
  s += `<line x1="${m}" y1="${py}" x2="${m + 12}" y2="${py}" stroke="${TINTA}" stroke-width="0.25" stroke-dasharray="1.2 0.8"/>`;
  s += txt(G.OUTFIT, "Línea de corte", m + 15, py + 1.5, 4.2, GRIS);
  s += txt(G.OUTFIT, "Tamaño real: el cuadrado montado mide 18 × 18 cm.", m + 50, py + 1.5, 4.2, GRIS);
  s += P.franjaLogos(0, H - 26, W, 26, b);
  return lienzo(W, H, b, s, "#ffffff", "Networking 2026 · Piezas recortables");
}
// Pieza con su color, el rótulo y la línea de corte un poco por fuera
function piezaRecortable(id, pts) {
  const fill = colorDe(id), ink = tintaDe(id);
  const [cx, cy] = G.centroide(pts);
  let s = `<path d="${polyPath(pts)}" fill="none" stroke="${TINTA}" stroke-width="${0.25 / K}" stroke-dasharray="${1.2 / K} ${0.8 / K}"/>`;
  const dentro = G.inset(pts, 2.4 / K);
  if (id === "graciosa") {
    s += `<path d="${polyPath(dentro)}" fill="#ffffff" stroke="${TINTA}" stroke-width="${0.5 / K}" stroke-dasharray="${2 / K} ${1.3 / K}"/>`;
    s += txt(G.OUTFIT_SB, "08", cx, cy - 16, 9, TINTA, { anchor: "middle", tracking: 1 });
    s += txt(G.OUTFIT, "Escribe aquí tu empresa", cx, cy + 2, 9, GRIS, { anchor: "middle" });
    s += `<line x1="${cx - 45}" y1="${cy + 14}" x2="${cx + 45}" y2="${cy + 14}" stroke="${LINEA}" stroke-width="${0.3 / K}"/>`;
    return s;
  }
  s += `<path d="${polyPath(dentro)}" fill="${fill}"/>`;
  // el rótulo se coloca respecto a la pieza montada y se desplaza con ella
  const p0 = PIEZA[id].pts, [c0x, c0y] = G.centroide(p0), r = ROTULO[id];
  s += rotulo(id, r.x + (cx - c0x), r.y + (cy - c0y), r.s, ink, r.rot);
  return s;
}

// =========================================================================================
// 2 · TABLERO · A2 horizontal (594 × 420): el mapa de Canarias con el hueco de cada pieza
// =========================================================================================
// Posición de cada isla en el tablero, en mm, con las piezas a tamaño real.
// Sigue la geografía (oeste → este) apretando las distancias para que quepa en la mesa.
const TABLERO_ISLAS = {
  empresa:    { x: 92,  y: 150, r: 45 },   // La Palma
  personas:   { x: 62,  y: 300, r: -20 },  // El Hierro
  territorio: { x: 150, y: 290, r: 15 },   // La Gomera
  ideas:      { x: 268, y: 214, r: -45 },  // Tenerife
  conexiones: { x: 352, y: 290, r: 0 },    // Gran Canaria
  proyectos:  { x: 478, y: 238, r: 45 },   // Fuerteventura
  futuro:     { x: 540, y: 100, r: -40 },  // Lanzarote
  graciosa:   { x: 462, y: 50,  r: 15 },   // La Graciosa
};
function colocada(id, x, y, r) {
  const pts = id === "graciosa" ? GRACIOSA_PTS : PIEZA[id].pts;
  const [cx, cy] = G.centroide(pts);
  return `translate(${x} ${y}) rotate(${r}) scale(${K}) translate(${-cx} ${-cy})`;
}
function tablero() {
  const W = 594, H = 420, b = 3;
  let s = "";
  // mar: el azul de la noche con un leve degradado
  s += `<defs><radialGradient id="mar" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#1c2d52"/><stop offset="1" stop-color="${C.noche}"/></radialGradient></defs>`;
  s += `<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${H + 2 * b}" fill="url(#mar)"/>`;
  // retícula de corrientes: líneas finas a 45°, como las juntas del tangram
  let lin = "";
  for (let i = -H; i < W; i += 14) lin += `M${i} 0L${i + H} ${H}`;
  s += `<path d="${lin}" stroke="#ffffff" stroke-opacity="0.035" stroke-width="0.4"/>`;
  s += txt(G.OUTFIT_SB, "RETO 1 · NUESTRO TERRITORIO", 24, 30, 6, P.MESA_TEXTO_OSCURO[3], { tracking: 1 });
  s += txt(G.BEBAS, "CONSTRUID EL ARCHIPIÉLAGO", 24, 58, 26, C.arena, { tracking: 0.4 });
  s += parrafo(G.OUTFIT, "Cada pieza tiene su hueco. Colocadla y, al hacerlo, decid en voz alta qué aporta esa isla a la FP.", 24, 70, 6, 150, "#b4b8c8").svg;

  for (const id of ORDEN) {
    const t = TABLERO_ISLAS[id];
    const pts = id === "graciosa" ? GRACIOSA_PTS : PIEZA[id].pts;
    const tr = colocada(id, t.x, t.y, t.r);
    const col = id === "graciosa" ? "#ffffff" : G.MESA_COLOR[PIEZA[id].mesa];
    // hueco: relleno muy tenue del color y contorno discontinuo
    s += `<path transform="${tr}" d="${polyPath(pts)}" fill="${col}" fill-opacity="0.13" stroke="${col}" stroke-width="${0.6 / K}" stroke-dasharray="${2.4 / K} ${1.6 / K}" stroke-linejoin="round"/>`;
    // nombre y valor de la isla dentro del hueco (sin girar, para leer desde cualquier lado de la mesa)
    const i = ISLA[id];
    const ts = id === "graciosa" ? 5 : 8;
    s += txt(G.BEBAS, i.isla.toUpperCase(), t.x, t.y + ts * CAP / 2 - 2, ts, C.arena, { anchor: "middle", tracking: 0.3 });
    s += txt(G.OUTFIT, i.valor.join(" "), t.x, t.y + ts * 0.9 + 1, ts * 0.4, "#b4b8c8", { anchor: "middle" });
  }
  // rosa de los vientos minimalista
  const rx = W - 46, ry = H - 118;
  s += `<path d="M${rx} ${ry - 16}L${rx + 4} ${ry}L${rx} ${ry + 16}L${rx - 4} ${ry}Z" fill="${C.sol}"/><path d="M${rx - 16} ${ry}L${rx} ${ry - 4}L${rx + 16} ${ry}L${rx} ${ry + 4}Z" fill="#ffffff" fill-opacity="0.35"/>`;
  s += txt(G.BEBAS, "N", rx, ry - 20, 7, C.arena, { anchor: "middle" });

  // Las tres preguntas del territorio, en una franja inferior
  const fy = H - 74;
  s += `<rect x="${-b}" y="${fy}" width="${W + 2 * b}" height="${74 + b}" fill="#0e1830"/>`;
  const Q = [["¿Qué sectores tiene vuestra isla?", "Nombrad tres empresas o actividades que la mueven."],
    ["¿Qué profesionales faltan?", "Los perfiles que os cuesta encontrar hoy."],
    ["¿Qué podemos aprender del entorno?", "Del mar, del volcán, del turismo, del campo."]];
  const cw = (W - 48) / 3;
  Q.forEach(([q, d], k) => {
    const x = 24 + k * cw;
    s += `<rect x="${x}" y="${fy + 16}" width="10" height="10" fill="${G.MESA_COLOR[k]}"/>`;
    s += txt(G.BEBAS, String(k + 1), x + 5, fy + 21 + 7 * CAP / 2, 7, k === 3 ? TINTA : "#ffffff", { anchor: "middle" });
    s += txt(G.OUTFIT_SB, q, x + 15, fy + 24, 6.4, C.arena);
    s += parrafo(G.OUTFIT, d, x + 15, fy + 34, 5, cw - 26, "#b4b8c8").svg;
  });
  s += txt(G.OUTFIT, "Networking 2026 · Juntos somos FP · CIFP Tony Gallardo", W / 2, H - 10, 4.6, "#7d849c", { anchor: "middle" });
  return lienzo(W, H, b, s, C.noche, "Networking 2026 · Tablero del archipiélago");
}

// =========================================================================================
// 3 · CARTAS · A6 (105 × 148): tres retos (una por capa) y cuatro figuras
// =========================================================================================
const RETOS = [
  { capa: "Identidad", pregunta: "¿Quiénes somos?", n: 1, titulo: "Nuestro territorio", mesa: 0,
    pasos: ["Construid el mapa de Canarias con las ocho piezas, sobre el tablero.",
      "Al colocar cada isla, decid qué aporta: su sector, su talento, su reto.",
      "Elegid una isla y señalad una oportunidad que nadie está aprovechando."],
    salida: "Una oportunidad del territorio, con nombre propio." },
  { capa: "Territorio", pregunta: "¿Dónde estamos y qué nos hace únicos?", n: 2, titulo: "Conectar para crecer", mesa: 2,
    pasos: ["Construid un puente con las piezas: un lado es la empresa y el otro, el centro.",
      "Decid qué da la empresa al alumnado: prácticas, mentoría, retos reales.",
      "Decid qué da el centro a la empresa: talento, proyectos, formación a medida."],
    salida: "Lo que cruza el puente en cada dirección." },
  { capa: "Oportunidad", pregunta: "¿Qué podemos construir juntos?", n: 3, titulo: "Una oportunidad compartida", mesa: 1,
    pasos: ["Construid libremente una figura que represente el futuro que queréis.",
      "Explicad qué significa cada pieza en vuestra figura.",
      "Convertidla en una colaboración que se pueda empezar este curso."],
    salida: "Una propuesta concreta y su primer paso." },
];

const CW = 105, CH = 148, CB = 3;

// Dorso común de todas las cartas: el tangram con La Graciosa a su lado
function dorso() {
  let s = `<rect x="${-CB}" y="${-CB}" width="${CW + 2 * CB}" height="${CH + 2 * CB}" fill="${C.noche}"/>`;
  s += P.tangram(CW / 2 - 30, 38, 60);
  s += `<g transform="translate(${CW / 2 + 33} ${38}) scale(${60 / 400})"><path d="${polyPath(GRACIOSA_PTS.map(([x, y]) => [x * 0.9, y * 0.9]))}" transform="rotate(90 0 0) translate(0 -180)" fill="none" stroke="#9aa0b4" stroke-width="5" stroke-dasharray="12 8"/></g>`;
  s += txt(G.BEBAS, "10 MINUTOS PARA CONECTAR", CW / 2, 120, 11, C.arena, { anchor: "middle", tracking: 0.4 });
  s += txt(G.OUTFIT, "Networking 2026 · Juntos somos FP", CW / 2, 129, 4.4, "#b4b8c8", { anchor: "middle" });
  return lienzo(CW, CH, CB, s, C.noche, "Dorso");
}

function cartaReto(r) {
  const col = G.MESA_COLOR[r.mesa], ink = r.mesa === 3 ? TINTA : "#ffffff";
  let s = `<rect x="${-CB}" y="${-CB}" width="${CW + 2 * CB}" height="${CH + 2 * CB}" fill="${C.arena}"/>`;
  // cabecera de color con la capa y su pregunta
  s += `<rect x="${-CB}" y="${-CB}" width="${CW + 2 * CB}" height="${52 + CB}" fill="${col}"/>`;
  s += txt(G.OUTFIT_SB, "CAPA " + r.n + " · " + r.capa.toUpperCase(), 9, 13, 4.2, ink, { tracking: 0.6 });
  s += parrafo(G.BEBAS, r.pregunta.toUpperCase(), 9, 27, 11, CW - 18, ink, { lh: 0.95 }).svg;
  // número grande del reto, recortado por el borde
  s += txt(G.BEBAS, String(r.n), CW - 6, 50, 46, ink === "#ffffff" ? "rgba(255,255,255,0.25)" : "rgba(20,33,61,0.18)", { anchor: "end" });
  s += txt(G.OUTFIT_SB, "RETO " + r.n, 9, 64, 4.4, MESA_TEXTO[r.mesa], { tracking: 0.6 });
  s += txt(G.BEBAS, r.titulo.toUpperCase(), 9, 76, 12, TINTA, { tracking: 0.2 });
  let y = 87;
  r.pasos.forEach((p, k) => {
    s += `<circle cx="12" cy="${y - 1.3}" r="3" fill="${col}"/>`;
    s += txt(G.OUTFIT_SB, String(k + 1), 12, y - 1.3 + 3.6 * CAP / 2, 3.6, ink, { anchor: "middle" });
    const pr = parrafo(G.OUTFIT, p, 18, y, 4, CW - 27, TINTA, { lh: 1.28 });
    s += pr.svg; y += pr.alto + 7.5;
  });
  s += `<line x1="9" y1="${CH - 24}" x2="${CW - 9}" y2="${CH - 24}" stroke="${LINEA}" stroke-width="0.3"/>`;
  s += txt(G.OUTFIT_SB, "Al terminar tenéis", 9, CH - 17, 3.8, GRIS);
  s += txt(G.OUTFIT_SB, r.salida, 9, CH - 10, 4.3, TINTA);
  return lienzo(CW, CH, CB, s, C.arena, "Reto " + r.n);
}

// ---------- Las cuatro figuras ----------
// Coordenadas en la retícula del tangram (100 unidades = 1 «h»): el triángulo pequeño tiene la hipotenusa de 2 h.
// Algunas piezas van giradas 45°, por eso aparecen valores con √2 (1,414…).
const R2 = Math.SQRT2;
const FIGURAS = [
  { nombre: "Sinergia", lema: "El cuadrado del encuentro, y la pieza que lo corona.", mesa: 2,
    pistas: "Es el cuadrado completo del evento. La Graciosa no entra dentro: va encima.",
    piezas: Object.assign(Object.fromEntries(G.PIEZAS.map((p) => [p.id, p.pts.map(([x, y]) => [x / 100, y / 100])])),
      { graciosa: [[1, 0], [3, 0], [2, -1]] }) },
  { nombre: "Sostenibilidad", lema: "Un árbol que crece desde la tierra de Fuerteventura y El Hierro.", mesa: 0,
    pistas: "La Graciosa es el brote de arriba. Fuerteventura, la maceta. La Gomera vuela.",
    piezas: {
      graciosa: [[1, 1], [3, 1], [2, 0]],
      empresa: [[2 - R2, 1 + R2], [2 + R2, 1 + R2], [2, 1]],
      ideas: [[0, 3 + R2], [4, 3 + R2], [2, 1 + R2]],
      conexiones: [[2 - R2 / 2, 3 + R2], [2 + R2 / 2, 3 + R2], [2 + R2 / 2, 3 + 2 * R2], [2 - R2 / 2, 3 + 2 * R2]],
      futuro: [[1, 3 + 2 * R2], [3, 3 + 2 * R2], [2, 4 + 2 * R2], [0, 4 + 2 * R2]],
      personas: [[2, 4 + 2 * R2], [3, 3 + 2 * R2], [4, 4 + 2 * R2]],
      proyectos: [[0, 4 + 2 * R2], [4, 4 + 2 * R2], [2, 6 + 2 * R2]],
      territorio: [[4.5, 1.2], [6.5, 1.2], [5.5, 2.2]],
    } },
  { nombre: "Innovación", lema: "Una bombilla que se enciende. Gran Canaria la conecta a la corriente.", mesa: 3,
    pistas: "El globo son los dos triángulos grandes. Gran Canaria es el casquillo; La Graciosa, la punta.",
    // esta figura se dibuja en «a» (lado del cuadrado = 1) y se pasa a «h» multiplicando por √2
    piezas: aH({
      ideas: [[0, 0], [2, 0], [0, 2]],
      proyectos: [[2, 0], [2, 2], [0, 2]],
      conexiones: [[0.5, 2], [1.5, 2], [1.5, 3], [0.5, 3]],
      graciosa: [[1 - R2 / 2, 3], [1 + R2 / 2, 3], [1, 3 + R2 / 2]],
      empresa: [[0, -0.35], [2, -0.35], [1, -1.35]],
      territorio: [[-0.35, 0.293], [-0.35, 1.707], [-1.057, 1]],
      personas: [[2.35, 0.293], [2.35, 1.707], [3.057, 1]],
      futuro: [[-0.35, -0.35], [-0.35 - R2 / 2, -0.35 - R2 / 2], [-0.35 - R2 / 2, -0.35 - R2 / 2 - R2], [-0.35, -0.35 - R2]],
    }) },
  { nombre: "Emprendimiento", lema: "Un cohete: Tenerife en la punta, La Palma y Lanzarote en las aletas.", mesa: 1,
    pistas: "La punta y el cuerpo son los dos triángulos grandes. La Graciosa sostiene el despegue.",
    piezas: {
      ideas: [[0, 2], [4, 2], [2, 0]],
      proyectos: [[0, 2], [4, 2], [2, 4]],
      empresa: [[0, 2], [0, 4], [2, 4]],
      personas: [[4, 2], [4, 4], [3, 3]],
      territorio: [[4, 4], [2, 4], [3, 3]],
      futuro: [[0, 4], [2, 4], [1, 5], [-1, 5]],
      conexiones: [[1, 5], [2, 4], [3, 5], [2, 6]],
      graciosa: [[2, 4], [4, 4], [3, 5]],
    } },
];
function aH(o) { for (const k in o) o[k] = o[k].map(([x, y]) => [x * R2, y * R2]); return o; }

// Comprueba que cada figura usa exactamente las ocho piezas, con su forma real
function lados(p) { return p.map((a, i) => Math.hypot(p[(i + 1) % p.length][0] - a[0], p[(i + 1) % p.length][1] - a[1])).map((l) => +l.toFixed(2)).sort((x, y) => x - y).join(","); }
function comprobar() {
  const ref = Object.fromEntries(G.PIEZAS.map((p) => [p.id, lados(p.pts.map(([x, y]) => [x / 100, y / 100]))]));
  ref.graciosa = lados(GRACIOSA_PTS.map(([x, y]) => [x / 100, y / 100]));
  for (const f of FIGURAS) for (const id of ORDEN) {
    if (!f.piezas[id]) throw new Error(f.nombre + ": falta " + id);
    if (lados(f.piezas[id]) !== ref[id]) throw new Error(f.nombre + ": " + id + " no tiene su forma (" + lados(f.piezas[id]) + " ≠ " + ref[id] + ")");
  }
  // el paralelogramo solo está impreso por una cara: no se le puede dar la vuelta
  for (const f of FIGURAS) if (giro(f.piezas.futuro) !== giro(PIEZA.futuro.pts)) throw new Error(f.nombre + ": Lanzarote está volteada");
}
// En sentido antihorario, ¿el ángulo tras un lado largo es agudo (1) u obtuso (-1)?
function giro(p) {
  let a = 0;
  p.forEach((v, i) => { const q = p[(i + 1) % p.length]; a += v[0] * q[1] - q[0] * v[1]; });
  if (a < 0) p = [...p].reverse();
  for (let i = 0; i < 4; i++) {
    const [A, B, D] = [p[i], p[(i + 1) % 4], p[(i + 2) % 4]];
    const e1 = [B[0] - A[0], B[1] - A[1]], e2 = [D[0] - B[0], D[1] - B[1]];
    if (Math.hypot(...e1) > Math.hypot(...e2) + 0.01) return Math.sign(-(e1[0] * e2[0] + e1[1] * e2[1]));
  }
}

// Dibuja una figura encajada en la caja (x, y, w, h); silueta = todo en un color, si no, cada pieza en el suyo
function figura(f, x, y, w, h, { silueta = false, rotulos = false } = {}) {
  const todos = Object.values(f.piezas).flat();
  const x0 = Math.min(...todos.map((p) => p[0])), x1 = Math.max(...todos.map((p) => p[0]));
  const y0 = Math.min(...todos.map((p) => p[1])), y1 = Math.max(...todos.map((p) => p[1]));
  const k = Math.min(w / (x1 - x0), h / (y1 - y0));
  const ox = x + (w - (x1 - x0) * k) / 2 - x0 * k, oy = y + (h - (y1 - y0) * k) / 2 - y0 * k;
  const junta = 0.05;
  let s = "";
  for (const id of ORDEN) {
    const pts = G.inset(f.piezas[id].map(([px, py]) => [ox + px * k, oy + py * k]), silueta ? 0 : junta * k);
    if (silueta) s += `<path d="${polyPath(pts)}" fill="${TINTA}" stroke="${TINTA}" stroke-width="0.35" stroke-linejoin="round"/>`;
    else if (id === "graciosa") s += `<path d="${polyPath(pts)}" fill="#ffffff" stroke="${TINTA}" stroke-width="0.4" stroke-dasharray="1.2 0.8"/>`;
    else s += `<path d="${polyPath(pts)}" fill="${colorDe(id)}"/>`;
    if (rotulos) {
      const [cx, cy] = G.centroide(pts);
      s += txt(G.OUTFIT_SB, ISLA[id].n, cx, cy + 3 * CAP / 2, 3, tintaDe(id), { anchor: "middle" });
    }
  }
  return s;
}

function cartaFigura(f, i) {
  const col = G.MESA_COLOR[f.mesa];
  let s = `<rect x="${-CB}" y="${-CB}" width="${CW + 2 * CB}" height="${CH + 2 * CB}" fill="${C.arena}"/>`;
  s += `<rect x="${-CB}" y="${-CB}" width="${CW + 2 * CB}" height="${4 + CB}" fill="${col}"/>`;
  s += txt(G.OUTFIT_SB, "FIGURA " + (i + 1) + " DE 4 · CON LAS OCHO PIEZAS", 9, 14, 4, MESA_TEXTO[f.mesa], { tracking: 0.5 });
  s += txt(G.BEBAS, f.nombre.toUpperCase(), 9, 30, 17, TINTA, { tracking: 0.3 });
  s += figura(f, 14, 38, CW - 28, 74, { silueta: true });
  s += parrafo(G.OUTFIT, f.lema, 9, 124, 4.4, CW - 18, TINTA).svg;
  s += txt(G.OUTFIT, "La solución, en la otra cara. ¡No miréis antes!", 9, CH - 9, 3.6, GRIS);
  return lienzo(CW, CH, CB, s, C.arena, f.nombre);
}
function cartaSolucion(f, i) {
  let s = `<rect x="${-CB}" y="${-CB}" width="${CW + 2 * CB}" height="${CH + 2 * CB}" fill="#ffffff"/>`;
  s += txt(G.OUTFIT_SB, "SOLUCIÓN · " + f.nombre.toUpperCase(), 9, 14, 4, GRIS, { tracking: 0.5 });
  s += figura(f, 14, 22, CW - 28, 74, { rotulos: true });
  s += parrafo(G.OUTFIT, "Pista: " + f.pistas, 9, 105, 4, CW - 18, TINTA).svg;
  // leyenda compacta de números
  let y = CH - 26;
  ORDEN.forEach((id, k) => {
    const cx = 9 + (k % 2) * 46, cy = y + Math.floor(k / 2) * 5.2;
    s += `<rect x="${cx}" y="${cy - 2.6}" width="3" height="3" fill="${colorDe(id)}" stroke="${id === "graciosa" ? TINTA : "none"}" stroke-width="0.2"/>`;
    s += txt(G.OUTFIT, ISLA[id].n + " " + ISLA[id].isla, cx + 4.5, cy, 3, TINTA);
  });
  return lienzo(CW, CH, CB, s, "#ffffff", f.nombre + " · solución");
}

// =========================================================================================
// 4 · HOJA DE REGLAS · A4 vertical, una por mesa
// =========================================================================================
const FASES = [
  { min: "0–1", t: "Misión", d: "La persona que dinamiza reparte las piezas, el tablero y la carta de reto. Se lee en voz alta." },
  { min: "1–3", t: "Construid el territorio", d: "Montad el archipiélago o la figura del reto. Cada pieza que colocáis, una frase sobre lo que aporta." },
  { min: "3–6", t: "Descifrad el reto", d: "Responded a la pregunta de la carta. Primero ideas sueltas; luego elegid una." },
  { min: "6–9", t: "Cread una propuesta", d: "Una colaboración real entre la empresa y el centro: qué, quién, cuándo. Escribidla en la tarjeta." },
  { min: "9–10", t: "Presentadla", d: "Entre 30 y 60 segundos. Terminad diciendo el primer paso y quién lo da." },
];
function reglas() {
  const W = 210, H = 297, b = 3, m = 16;
  let s = `<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${H + 2 * b}" fill="${C.arena}"/>`;
  // cabecera noche con el reloj tangram
  s += `<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${72 + b}" fill="${C.noche}"/>`;
  s += txt(G.OUTFIT_SB, "NETWORKING 2026 · REGLAS DEL JUEGO", m, 18, 4.4, P.MESA_TEXTO_OSCURO[3], { tracking: 0.8 });
  s += txt(G.BEBAS, "10 MINUTOS", m, 40, 24, C.arena, { tracking: 0.4 });
  s += txt(G.BEBAS, "PARA CONECTAR", m, 61, 24, C.arena, { tracking: 0.4 });
  // reloj: el tiempo como un círculo dividido en las cinco fases, con su color
  const cx = W - 40, cy = 38, R = 24;
  const tramos = [[0, 1], [1, 3], [3, 6], [6, 9], [9, 10]], cols = [C.arena, C.naranja, C.volcan, C.atlantico, C.sol];
  tramos.forEach(([a, z], k) => {
    const a0 = (a / 10) * 2 * Math.PI - Math.PI / 2, a1 = (z / 10) * 2 * Math.PI - Math.PI / 2;
    const large = z - a > 5 ? 1 : 0;
    s += `<path d="M${cx} ${cy}L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)}A${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}Z" fill="${cols[k]}" stroke="${C.noche}" stroke-width="1.2"/>`;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.42}" fill="${C.noche}"/>`;
  s += txt(G.BEBAS, "10'", cx, cy + 12 * CAP / 2, 12, C.arena, { anchor: "middle" });

  // datos rápidos
  const dy = 92;
  const datos = [["4–6", "personas por equipo, mezclando empresa y profesorado"], ["8", "piezas, una por isla"], ["3", "retos, uno por capa"], ["1", "propuesta que se cumple"]];
  const dw = (W - 2 * m) / 4;
  datos.forEach(([n, t], k) => {
    const x = m + k * dw;
    s += txt(G.BEBAS, n, x, dy, 20, MESA_TEXTO[k], { tracking: 0.2 });
    s += parrafo(G.OUTFIT, t, x, dy + 7, 3.8, dw - 6, TINTA).svg;
  });

  // línea de tiempo
  let y = 126;
  s += txt(G.OUTFIT_SB, "MINUTO A MINUTO", m, y - 6, 4.2, GRIS, { tracking: 0.8 });
  FASES.forEach((f, k) => {
    const col = cols[k];
    s += `<rect x="${m}" y="${y}" width="24" height="16" rx="2" fill="${k === 0 ? C.noche : col}"/>`;
    s += txt(G.BEBAS, f.min, m + 12, y + 8 + 9 * CAP / 2, 9, k === 0 || k === 1 || k === 3 ? C.arena : TINTA, { anchor: "middle" });
    s += txt(G.BEBAS, f.t.toUpperCase(), m + 31, y + 6.5, 8.5, TINTA, { tracking: 0.2 });
    s += parrafo(G.OUTFIT, f.d, m + 31, y + 12.5, 3.9, W - 2 * m - 31, GRIS).svg;
    y += 21;
  });

  // roles
  y += 4;
  s += txt(G.OUTFIT_SB, "QUIÉN HACE QUÉ (ROLES PARA REPARTIR)", m, y, 4.2, GRIS, { tracking: 0.8 });
  const roles = [["Guardián del tiempo", "Avisa en los minutos 3, 6 y 9."], ["Constructor", "Coloca las piezas; nadie más las toca."],
    ["Escriba", "Rellena la tarjeta «Reto superado»."], ["Portavoz", "Presenta la propuesta al final."]];
  const rw = (W - 2 * m) / 4;
  roles.forEach(([r, d], k) => {
    const x = m + k * rw;
    s += `<rect x="${x}" y="${y + 5}" width="${rw - 4}" height="22" rx="2" fill="#ffffff"/>`;
    s += `<rect x="${x}" y="${y + 5}" width="2" height="22" fill="${G.MESA_COLOR[k]}"/>`;
    s += txt(G.OUTFIT_SB, r, x + 5, y + 12, 3.9, TINTA);
    s += parrafo(G.OUTFIT, d, x + 5, y + 18, 3.4, rw - 12, GRIS).svg;
  });
  y += 26;
  // regla de oro
  s += `<rect x="${m}" y="${y}" width="${W - 2 * m}" height="16" rx="2" fill="${C.noche}"/>`;
  s += `<g transform="translate(${m + 6} ${y + 2.5}) scale(${11 / 200})"><path d="${polyPath(GRACIOSA_PTS)}" transform="translate(0 30)" fill="none" stroke="${C.sol}" stroke-width="10" stroke-dasharray="22 14"/></g>`;
  s += txt(G.OUTFIT_SB, "La regla de oro: ninguna figura está terminada sin La Graciosa.", m + 24, y + 7, 4.1, C.arena);
  s += txt(G.OUTFIT, "La última pieza la pone siempre la empresa, con su nombre escrito. La pieza que nos falta eres tú.", m + 24, y + 12.3, 3.4, "#b4b8c8");
  s += P.franjaLogos(0, H - 18, W, 18, b);
  return lienzo(W, H, b, s, C.arena, "Networking 2026 · Reglas");
}

// =========================================================================================
// 5 · TARJETA «RETO SUPERADO» · A6 horizontal (148 × 105), dos caras. Se la lleva la empresa.
// =========================================================================================
function recuerdoFrente() {
  const W = 148, H = 105, b = 3;
  let s = `<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${H + 2 * b}" fill="${C.noche}"/>`;
  // el tangram completo con La Graciosa ya colocada, en blanco: la pieza de la empresa
  s += P.tangram(12, 18, 62);
  s += `<g transform="translate(${12 + 31} ${18 - 2}) scale(${62 / 400})"><path d="${polyPath([[-100, 0], [100, 0], [0, -100]])}" fill="#ffffff"/></g>`;
  s += txt(G.OUTFIT_SB, "RETO SUPERADO", 86, 26, 4.4, P.MESA_TEXTO_OSCURO[3], { tracking: 0.8 });
  s += txt(G.BEBAS, "LA PIEZA QUE", 86, 44, 15, C.arena, { tracking: 0.3 });
  s += txt(G.BEBAS, "NOS FALTABA", 86, 58, 15, C.arena, { tracking: 0.3 });
  s += txt(G.BEBAS, "ERAS TÚ", 86, 72, 15, C.sol, { tracking: 0.3 });
  s += parrafo(G.OUTFIT, "Gracias por construir con nosotros. Guarda esta tarjeta: es el compromiso de tu mesa.", 86, 81, 3.6, 52, "#b4b8c8").svg;
  s += txt(G.OUTFIT, "Networking 2026 · Juntos somos FP · 20 de noviembre de 2026", 12, H - 8, 3.4, "#7d849c");
  return lienzo(W, H, b, s, C.noche, "Reto superado · frente");
}
function recuerdoDorso() {
  const W = 148, H = 105, b = 3, m = 10;
  let s = `<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${H + 2 * b}" fill="#ffffff"/>`;
  s += txt(G.BEBAS, "NUESTRA COLABORACIÓN", m, 15, 11, TINTA, { tracking: 0.3 });
  // casillas de reto
  s += txt(G.OUTFIT_SB, "Reto superado:", m, 24, 3.6, GRIS);
  RETOS.forEach((r, k) => {
    const x = m + 27 + k * 31;
    s += `<rect x="${x}" y="${21.3}" width="3.2" height="3.2" rx="0.5" fill="none" stroke="${G.MESA_COLOR[r.mesa]}" stroke-width="0.5"/>`;
    s += txt(G.OUTFIT, r.n + " · " + r.capa, x + 4.6, 24, 3.4, TINTA);
  });
  const campos = [["Empresa", 1], ["Mesa y centro", 1], ["Lo que propusimos", 3], ["Primer paso · quién · cuándo", 2]];
  let y = 33;
  for (const [c, n] of campos) {
    s += txt(G.OUTFIT_SB, c, m, y, 3.4, MESA_TEXTO[2]);
    for (let i = 0; i < n; i++) s += `<line x1="${m}" y1="${y + 5 + i * 5.5}" x2="${W - m - 32}" y2="${y + 5 + i * 5.5}" stroke="${LINEA}" stroke-width="0.3"/>`;
    y += 7 + n * 5.5;
  }
  // QR a la web
  s += qr(P.URL_WEB, W - m - 26, 33, 26, { color: TINTA });
  s += parrafo(G.OUTFIT, "En la web publicaremos lo que nazca de cada mesa.", W - m - 26, 64, 3, 26, GRIS).svg;
  s += txt(G.OUTFIT, "Firma de la empresa", m, H - 7, 3.2, GRIS);
  s += txt(G.OUTFIT, "Firma del centro", W / 2, H - 7, 3.2, GRIS);
  return lienzo(W, H, b, s, "#ffffff", "Reto superado · dorso");
}

// =========================================================================================
// 6 · CAMPAÑA «LA PIEZA QUE NOS FALTA ERES TÚ» · publicaciones 1080 × 1080 y plantilla de historia
// =========================================================================================
// Se dibujan en «px» (1 unidad = 1 px). Fase 1: tangram incompleto. Fase 2: plantilla para cada empresa. Fase 3: completo.
function postBase(cuerpo, alto = 1080) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${alto}" viewBox="0 0 1080 ${alto}"><rect width="1080" height="${alto}" fill="${C.noche}"/>${cuerpo}</svg>`;
}
function archipielagoCampana(x, y, w, presentes) {
  const k = w / 1240, ox = x - 40 * k, oy = y - 15 * k;
  let s = `<g transform="translate(${ox} ${oy}) scale(${k})">`;
  for (const p of G.PIEZAS) {
    const i = G.ISLAS[p.id], [cx, cy] = G.centroide(p.pts);
    const tr = `translate(${i.x} ${i.y}) rotate(${i.r}) scale(${G.ESCALA_ISLAS}) translate(${-cx} ${-cy})`;
    const on = presentes.includes(p.id);
    s += on ? `<polygon points="${G.pts(G.inset(p.pts, G.JUNTA))}" fill="${G.MESA_COLOR[p.mesa]}" transform="${tr}"/>`
      : `<polygon points="${G.pts(G.inset(p.pts, G.JUNTA))}" fill="none" stroke="#5a6480" stroke-width="5" stroke-dasharray="14 10" transform="${tr}"/>`;
  }
  s += presentes.includes("graciosa") ? G.graciosaSVG(C.sol, 4).replace('fill="none"', `fill="${C.sol}"`) : G.graciosaSVG("#9aa0b4");
  return s + `</g>`;
}
function post1() {
  let s = archipielagoCampana(80, 300, 920, ["ideas", "conexiones", "proyectos", "futuro"]);
  s += txt(G.OUTFIT_SB, "NETWORKING 2026 · 20 DE NOVIEMBRE", 80, 120, 30, P.MESA_TEXTO_OSCURO[3], { tracking: 4 });
  s += txt(G.BEBAS, "A ESTE MAPA", 80, 210, 96, C.arena, { tracking: 2 });
  s += txt(G.BEBAS, "LE FALTAN PIEZAS", 80, 300, 96, C.arena, { tracking: 2 });
  s += txt(G.OUTFIT, "Cada empresa que se suma completa una isla. ¿Cuál será la tuya?", 80, 900, 34, "#b4b8c8");
  s += txt(G.OUTFIT_SB, "Apúntate: " + P.URL_TXT, 80, 970, 34, C.arena);
  return postBase(s);
}
function post2() {
  // plantilla: el nombre y el logo de la empresa se añaden en el hueco blanco
  let s = "";
  s += txt(G.OUTFIT_SB, "NUEVA PIEZA", 80, 120, 30, P.MESA_TEXTO_OSCURO[3], { tracking: 4 });
  s += txt(G.BEBAS, "LA PIEZA QUE NOS", 80, 210, 96, C.arena, { tracking: 2 });
  s += txt(G.BEBAS, "FALTABA ERAS TÚ", 80, 300, 96, C.sol, { tracking: 2 });
  s += `<g transform="translate(540 650)"><path d="M-330 -150 L330 -150 L0 180 Z" fill="#ffffff"/>`;
  s += `<path d="M-330 -150 L330 -150 L0 180 Z" fill="none" stroke="${C.sol}" stroke-width="6" stroke-dasharray="22 14" transform="scale(1.06)"/></g>`;
  s += txt(G.OUTFIT, "[ LOGO DE LA EMPRESA ]", 540, 580, 30, "#9aa0b4", { anchor: "middle" });
  s += txt(G.OUTFIT_SB, "[ Nombre de la empresa ] se suma a Networking 2026", 540, 960, 34, C.arena, { anchor: "middle" });
  s += txt(G.OUTFIT, "Juntos somos FP", 540, 1010, 30, "#b4b8c8", { anchor: "middle" });
  return postBase(s);
}
function post3() {
  let s = archipielagoCampana(80, 300, 920, [...G.PIEZAS.map((p) => p.id), "graciosa"]);
  s += txt(G.OUTFIT_SB, "NETWORKING 2026 · 20 DE NOVIEMBRE", 80, 120, 30, P.MESA_TEXTO_OSCURO[3], { tracking: 4 });
  s += txt(G.BEBAS, "EL MAPA ESTÁ", 80, 210, 96, C.arena, { tracking: 2 });
  s += txt(G.BEBAS, "COMPLETO", 80, 300, 96, C.sol, { tracking: 2 });
  s += txt(G.OUTFIT, "Gracias a todas las empresas que se han sumado. Ahora, a construir.", 80, 900, 34, "#b4b8c8");
  s += txt(G.OUTFIT_SB, "El programa y los proyectos, en " + P.URL_TXT, 80, 970, 34, C.arena);
  return postBase(s);
}
function historia() {
  let s = "";
  s += txt(G.OUTFIT_SB, "NETWORKING 2026", 540, 220, 34, P.MESA_TEXTO_OSCURO[3], { anchor: "middle", tracking: 5 });
  s += txt(G.BEBAS, "LA PIEZA QUE", 540, 360, 120, C.arena, { anchor: "middle", tracking: 2 });
  s += txt(G.BEBAS, "NOS FALTA", 540, 480, 120, C.arena, { anchor: "middle", tracking: 2 });
  s += txt(G.BEBAS, "ERES TÚ", 540, 600, 120, C.sol, { anchor: "middle", tracking: 2 });
  s += `<g transform="translate(540 1000)"><path d="M-300 -130 L300 -130 L0 170 Z" fill="none" stroke="${C.sol}" stroke-width="8" stroke-dasharray="26 16"/></g>`;
  s += txt(G.OUTFIT, "[ tu logo aquí ]", 540, 960, 34, "#9aa0b4", { anchor: "middle" });
  s += txt(G.OUTFIT_SB, "20 de noviembre · CIFP Tony Gallardo", 540, 1500, 40, C.arena, { anchor: "middle" });
  s += txt(G.OUTFIT, "Desliza hacia arriba y súmate", 540, 1700, 38, "#b4b8c8", { anchor: "middle" });
  return postBase(s, 1920);
}

// =========================================================================================
// Exportar
// =========================================================================================
function pdf(nombre, paginas, Wmm, Hmm) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${Wmm}mm ${Hmm}mm; margin: 0 }
html, body { margin: 0; padding: 0 }
svg { display: block; width: ${Wmm}mm; height: ${Hmm}mm; page-break-after: always }
svg:last-child { page-break-after: auto }
</style></head><body>${paginas.join("\n")}</body></html>`;
  const htmlPath = path.join(OUT, "." + nombre + ".html");
  fs.writeFileSync(htmlPath, html);
  const nav = P.navegador();
  if (!nav) { console.log("Sin Edge/Chrome: no se genera", nombre + ".pdf"); return; }
  execFileSync(nav, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--print-to-pdf=" + path.join(OUT, nombre + ".pdf"),
    "file:///" + htmlPath.replace(/\\/g, "/")], { stdio: "ignore", timeout: 180000 });
  fs.unlinkSync(htmlPath);
}
async function png(archivo, svg, anchoPx) {
  const w = parseFloat(svg.match(/width="([\d.]+)(mm)?"/)[1]), mm = /width="[\d.]+mm"/.test(svg);
  const density = mm ? anchoPx / (w / 25.4) : 72 * anchoPx / w;
  await sharp(Buffer.from(svg), { density }).png().toFile(path.join(OUT, archivo + ".png"));
}

(async () => {
  comprobar();
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, "campana"), { recursive: true });
  await P.cargarLogos();

  const lamina = laminaPiezas(), tab = tablero(), reg = reglas();
  const d = dorso();
  const cartas = [];
  RETOS.forEach((r) => cartas.push(cartaReto(r), d));
  FIGURAS.forEach((f, i) => cartas.push(cartaFigura(f, i), cartaSolucion(f, i)));
  const rf = recuerdoFrente(), rd = recuerdoDorso();

  pdf("01-piezas-recortables-A3", [lamina], 303, 426);
  pdf("02-tablero-archipielago-A2", [tab], 600, 426);
  pdf("03-cartas-retos-y-figuras-A6", cartas, 111, 154);
  pdf("04-reglas-10-minutos-A4", [reg], 216, 303);
  pdf("05-tarjeta-reto-superado-A6", [rf, rd], 154, 111);

  await png("01-piezas-recortables", lamina, 1400);
  await png("02-tablero", tab, 2000);
  await png("04-reglas", reg, 1300);
  await png("05-reto-superado-frente", rf, 1200);
  await png("05-reto-superado-dorso", rd, 1200);
  for (let i = 0; i < cartas.length; i += 2) {
    const nombre = i < 6 ? "03-reto-" + (i / 2 + 1) : "03-figura-" + ((i - 6) / 2 + 1);
    await png(nombre, cartas[i], 700);
    if (i >= 6) await png(nombre + "-solucion", cartas[i + 1], 700);
  }
  await png("03-dorso", d, 700);

  const posts = { "1-mapa-incompleto": post1(), "2-plantilla-nueva-pieza": post2(), "3-mapa-completo": post3(), "historia-plantilla": historia() };
  for (const [n, s] of Object.entries(posts)) {
    fs.writeFileSync(path.join(OUT, "campana", n + ".svg"), s);
    await png(path.join("campana", n), s, 1080);
  }
  console.log("ok juego →", OUT);
})();
