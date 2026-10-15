// Genera los logotipos y recursos SVG de la identidad Networking 2026.
// Uso: node identidad/generar.js
// El tangram se dibuja sobre una retícula de 400×400 (4×4 unidades de 100).
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_LOGOS = path.join(ROOT, "project", "assets", "Logos");
const OUT_MESAS = path.join(ROOT, "project", "assets", "Mesas");
const OUT_WEB = path.join(ROOT, "..", "Networking", "img");

// ---------- Paleta ----------
// Cada color se llama como el paisaje canario del que sale.
const C = {
  noche: "#14213d",
  arena: "#f5efe4",
  naranja: "#c8452b",   // Mesa 1 · rojo Timanfaya (la lava de Lanzarote)
  volcan: "#2e7d4f",    // Mesa 2 · verde laurisilva (el bosque de Garajonay)
  atlantico: "#2370c4", // Mesa 3 · azul Atlántico
  sol: "#ffcc00",       // Mesa 4 · amarillo canario (el amarillo de la bandera de Canarias)
};
const MESA_COLOR = [C.naranja, C.volcan, C.atlantico, C.sol];

// ---------- Las 7 piezas ----------
// mesa: a qué mesa pertenece (0..3). Cada mesa suma 4 de las 16 unidades de área.
const PIEZAS = [
  { id: "ideas",      mesa: 0, pts: [[0, 0], [400, 0], [200, 200]] },                 // triángulo grande
  { id: "proyectos",  mesa: 1, pts: [[0, 0], [200, 200], [0, 400]] },                 // triángulo grande
  { id: "territorio", mesa: 2, pts: [[400, 0], [400, 200], [300, 100]] },             // triángulo pequeño
  { id: "conexiones", mesa: 2, pts: [[200, 200], [300, 100], [400, 200], [300, 300]] }, // cuadrado
  { id: "personas",   mesa: 2, pts: [[200, 200], [300, 300], [100, 300]] },           // triángulo pequeño
  { id: "futuro",     mesa: 3, pts: [[0, 400], [100, 300], [300, 300], [200, 400]] }, // paralelogramo
  { id: "empresa",    mesa: 3, pts: [[400, 200], [400, 400], [200, 400]] },           // triángulo mediano
];
// Desplazamiento de cada mesa en la versión despiezada
const DESPIECE = [[0, -42], [-42, 0], [38, -14], [0, 42]];

// ---------- Siete piezas, siete islas ----------
// Cada pieza es también una isla, de tamaño parecido al real. Posición en un lienzo de 1300×640
// a partir de la longitud y latitud reales (≈2,5 px por km); r = giro en grados; las piezas van al 50 %.
const ISLAS = {
  ideas:      { isla: "Tenerife",      km: 2034, x: 473,  y: 367, r: -45 },
  proyectos:  { isla: "Fuerteventura", km: 1660, x: 1102, y: 331, r: 45 },
  territorio: { isla: "La Gomera",     km: 370,  x: 319,  y: 412, r: 15 },
  conexiones: { isla: "Gran Canaria",  km: 1560, x: 717,  y: 453, r: 0 },
  personas:   { isla: "El Hierro",     km: 269,  x: 131,  y: 517, r: -20 },
  futuro:     { isla: "Lanzarote",     km: 846,  x: 1196, y: 160, r: -40 },
  empresa:    { isla: "La Palma",      km: 708,  x: 165,  y: 256, r: 45 },
};
const GRACIOSA = { x: 1260, y: 70, r: 8 }; // la octava isla, como un punto junto a Lanzarote
const ESCALA_ISLAS = 0.5;
function centroide(p) { return p.reduce((a, [x, y]) => [a[0] + x / p.length, a[1] + y / p.length], [0, 0]); }

// ---------- Geometría ----------
function area(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}
// Encoge un polígono convexo `d` unidades hacia dentro (deja la junta entre piezas)
function inset(p, d) {
  const s = area(p) > 0 ? 1 : -1;
  const lines = p.map((a, i) => {
    const b = p[(i + 1) % p.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const nx = (-dy / len) * s, ny = (dx / len) * s; // normal hacia dentro
    return { x: a[0] + nx * d, y: a[1] + ny * d, dx, dy };
  });
  return lines.map((l1, i) => {
    const l0 = lines[(i - 1 + lines.length) % lines.length];
    const den = l0.dx * l1.dy - l0.dy * l1.dx;
    const t = ((l1.x - l0.x) * l1.dy - (l1.y - l0.y) * l1.dx) / den;
    return [l0.x + l0.dx * t, l0.y + l0.dy * t];
  });
}
const fmt = (n) => +n.toFixed(2);
const pts = (p) => p.map(([x, y]) => fmt(x) + "," + fmt(y)).join(" ");

const JUNTA = 5; // la junta entre piezas mide 2×5 = 10 unidades (2,5 % del lado)

function piezas({ colores, solo, mover, extraAttr = "" }) {
  return PIEZAS.filter((p) => solo == null || p.mesa === solo).map((p) => {
    const [ox, oy] = mover ? mover[p.mesa] : [0, 0];
    const poly = inset(p.pts, JUNTA).map(([x, y]) => [x + ox, y + oy]);
    const fill = typeof colores === "string" ? colores : colores[p.mesa];
    return `<polygon points="${pts(poly)}" fill="${fill}" data-pieza="${p.id}"${extraAttr}/>`;
  }).join("\n  ");
}

// ---------- Fuentes incrustadas (para que el texto se vea igual en cualquier sitio) ----------
// Los textos del logotipo se convierten a contornos: se ven igual en cualquier programa,
// aunque no tenga instaladas Bebas Neue ni Outfit.
const opentype = require("opentype.js");
const font = (f) => opentype.loadSync(path.join(ROOT, "fuentes", f));
const BEBAS = font("BebasNeue-Regular.ttf");
const OUTFIT = font("Outfit-Regular.ttf");
const OUTFIT_SB = font("Outfit-SemiBold.ttf");

// Ancho de un texto con su espaciado
function medir(f, str, size, tracking = 0) {
  const g = f.stringToGlyphs(str);
  let w = 0;
  g.forEach((gl, i) => {
    w += (gl.advanceWidth / f.unitsPerEm) * size;
    if (i < g.length - 1) w += (f.getKerningValue(gl, g[i + 1]) / f.unitsPerEm) * size + tracking;
  });
  return w;
}
// Tramos de texto [{t, fill}] en una línea → <path>; anchor "start" o "middle"
function linea(f, tramos, x, y, size, { tracking = 0, anchor = "start" } = {}) {
  const todo = tramos.map((s) => s.t).join("");
  let cx = anchor === "middle" ? x - medir(f, todo, size, tracking) / 2 : x;
  const out = [];
  let prev = null;
  for (const s of tramos) {
    let d = "";
    for (const gl of f.stringToGlyphs(s.t)) {
      if (prev) cx += (f.getKerningValue(prev, gl) / f.unitsPerEm) * size + tracking;
      d += gl.getPath(cx, y, size).toPathData(2);
      cx += (gl.advanceWidth / f.unitsPerEm) * size;
      prev = gl;
    }
    out.push(`<path fill="${s.fill}" d="${d}"/>`);
  }
  return out.join("\n");
}

const svg = (vb, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}">\n<title>${title}</title>\n${body}\n</svg>\n`;

// ---------- Piezas de la marca ----------
const files = {};

files["isotipo.svg"] = svg("0 0 400 400", `  ${piezas({ colores: MESA_COLOR })}`, "Networking 2026 — isotipo");
files["isotipo-despiezado.svg"] = svg("-60 -60 520 520", `  ${piezas({ colores: MESA_COLOR, mover: DESPIECE })}`, "Networking 2026 — isotipo despiezado");
files["isotipo-archipielago.svg"] = svg("40 40 1240 560", PIEZAS.map((p) => {
  const i = ISLAS[p.id], [cx, cy] = centroide(p.pts);
  return `  <polygon points="${pts(inset(p.pts, JUNTA))}" fill="${MESA_COLOR[p.mesa]}" data-isla="${i.isla}" transform="translate(${i.x} ${i.y}) rotate(${i.r}) scale(${ESCALA_ISLAS}) translate(${fmt(-cx)} ${fmt(-cy)})"/>`;
}).join("\n") + `\n  <circle cx="${GRACIOSA.x}" cy="${GRACIOSA.y}" r="${GRACIOSA.r}" fill="#9aa0b4" data-isla="La Graciosa"/>`, "Networking 2026 — siete piezas, siete islas");
files["isotipo-noche.svg"] = svg("0 0 400 400", `  ${piezas({ colores: C.noche })}`, "Networking 2026 — isotipo a una tinta (noche)");
files["isotipo-arena.svg"] = svg("0 0 400 400", `  ${piezas({ colores: C.arena })}`, "Networking 2026 — isotipo a una tinta (arena)");

function horizontal(tinta, acento, sub) {
  return svg("0 0 1150 300", `<g transform="translate(20 20) scale(0.65)">
  ${piezas({ colores: MESA_COLOR })}
</g>
${linea(BEBAS, [{ t: "NETWORKING ", fill: tinta }, { t: "2026", fill: acento }], 330, 150, 138)}
${linea(OUTFIT_SB, [{ t: "JUNTOS SOMOS FP", fill: tinta }], 334, 208, 33, { tracking: 7 })}
${linea(OUTFIT, [{ t: "CIFP TONY GALLARDO · 20 NOV 2026", fill: sub }], 334, 256, 25, { tracking: 3 })}`, "Networking 2026 — Juntos somos FP");
}
function vertical(tinta, acento, sub) {
  return svg("0 0 760 680", `<g transform="translate(220 30) scale(0.8)">
  ${piezas({ colores: MESA_COLOR })}
</g>
${linea(BEBAS, [{ t: "NETWORKING ", fill: tinta }, { t: "2026", fill: acento }], 380, 475, 112, { anchor: "middle" })}
${linea(OUTFIT_SB, [{ t: "JUNTOS SOMOS FP", fill: tinta }], 380, 536, 30, { tracking: 6, anchor: "middle" })}
${linea(OUTFIT, [{ t: "CIFP TONY GALLARDO · 20 NOV 2026", fill: sub }], 380, 584, 23, { tracking: 3, anchor: "middle" })}`, "Networking 2026 — Juntos somos FP");
}
files["logo-horizontal.svg"] = horizontal(C.noche, C.naranja, "#555c72");
files["logo-horizontal-negativo.svg"] = horizontal(C.arena, C.sol, "#b4b8c8");
files["logo-vertical.svg"] = vertical(C.noche, C.naranja, "#555c72");
files["logo-vertical-negativo.svg"] = vertical(C.arena, C.sol, "#b4b8c8");

// ---------- Símbolo de cada mesa ----------
const BBOX = [[0, 0, 400, 200], [0, 0, 200, 400], [100, 0, 300, 300], [0, 200, 400, 200]];
const mesas = {};
for (let m = 0; m < 4; m++) {
  const [x, y, w, h] = BBOX[m];
  mesas[`mesa-${m + 1}.svg`] = svg(`${x} ${y} ${w} ${h}`, `  ${piezas({ colores: MESA_COLOR, solo: m })}`, `Networking 2026 — Mesa ${m + 1}`);
}

// ---------- Calado canario ----------
// Patrón inspirado en el calado, el bordado geométrico tradicional: retícula cuadrada, hilos a 45°
// (el ángulo del tangram), un rombo central y la «araña» en el centro. Módulo de 48×48.
function calado(color, opacidad) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
<g fill="none" stroke="${color}" stroke-opacity="${opacidad}" stroke-width="1">
  <path d="M0 .5H48M.5 0V48"/>
  <path d="M0 0L15 15M48 0L33 15M0 48L15 33M48 48L33 33"/>
  <path d="M24 13L35 24L24 35L13 24Z"/>
  <circle cx="24" cy="24" r="4"/>
</g>
<circle cx="24" cy="24" r="1.4" fill="${color}" fill-opacity="${opacidad}"/>
</svg>
`;
}
const OUT_PATRONES = path.join(ROOT, "project", "assets", "Patrones");
const patrones = {
  "calado-arena.svg": calado(C.arena, 0.6),
  "calado-noche.svg": calado(C.noche, 0.6),
};

// ---------- Escribir ----------
for (const d of [OUT_LOGOS, OUT_MESAS, OUT_PATRONES, OUT_WEB]) fs.mkdirSync(d, { recursive: true });
for (const [n, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT_LOGOS, n), s);
for (const [n, s] of Object.entries(mesas)) fs.writeFileSync(path.join(OUT_MESAS, n), s);
for (const [n, s] of Object.entries(patrones)) fs.writeFileSync(path.join(OUT_PATRONES, n), s);
// La web usa el isotipo, los símbolos de mesa y el logo en negativo (su fondo es plano, sin calado)
for (const n of ["isotipo.svg", "logo-horizontal-negativo.svg"]) fs.writeFileSync(path.join(OUT_WEB, n), files[n]);
for (const [n, s] of Object.entries(mesas)) fs.writeFileSync(path.join(OUT_WEB, n), s);

// Comprobación: cada mesa ocupa un cuarto del tangram
const sum = [0, 0, 0, 0];
PIEZAS.forEach((p) => (sum[p.mesa] += Math.abs(area(p.pts)) / 10000));
console.log("Área por mesa (unidades):", sum.join(" / "));

// Contrastes de texto (WCAG)
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
const pares = process.argv.slice(2);
for (let i = 0; i + 1 < pares.length; i += 2) console.log(pares[i], "sobre", pares[i + 1], "→", ratio(pares[i], pares[i + 1]));

// Exporta la geometría para la web
module.exports = { PIEZAS, ISLAS, GRACIOSA, inset, JUNTA, C };
