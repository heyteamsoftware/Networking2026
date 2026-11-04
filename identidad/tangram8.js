// TANGRAM 8 · un tangram de 8 piezas para construir, de forma simbólica, 15 figuras.
// Uso: cd identidad && node tangram8.js [--revisar]
//   --revisar  solo comprueba las figuras y genera las vistas PNG (sin PDF)
// Salida en ../tangram8/: PDF de instrucciones, piezas recortables, fichas de retos y soluciones.
//
// Las 8 piezas (1 unidad = 3,5 cm al imprimir):
//   A, B  triángulos grandes (catetos 2)      C, D  triángulos pequeños (catetos 1)
//   E     cuadrado (1 × 1)                    F     barra (2 × 1)
//   G, H  semicírculos (diámetro 2; juntos forman un círculo)
// Todas son simétricas: da igual por qué cara se pongan.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");
const G = require("./generar.js");
const P = require("./piezas.js");

const OUT = path.join(__dirname, "..", "tangram8");
const REVISAR = process.argv.includes("--revisar");
const MM = 35; // milímetros por unidad en las piezas recortables

// ---------- Piezas ----------
const PIEZA = {
  A: { n: 1, nombre: "Triángulo grande", color: "#e63946", medida: "catetos de 7 cm" },
  B: { n: 2, nombre: "Triángulo grande", color: "#f4a261", medida: "catetos de 7 cm" },
  C: { n: 3, nombre: "Triángulo pequeño", color: "#f6c90e", medida: "catetos de 3,5 cm" },
  D: { n: 4, nombre: "Triángulo pequeño", color: "#8ac926", medida: "catetos de 3,5 cm" },
  E: { n: 5, nombre: "Cuadrado", color: "#2a9d8f", medida: "lado de 3,5 cm" },
  F: { n: 6, nombre: "Barra", color: "#3a86ff", medida: "7 × 3,5 cm" },
  G: { n: 7, nombre: "Semicírculo", color: "#8338ec", medida: "diámetro de 7 cm" },
  H: { n: 8, nombre: "Semicírculo", color: "#ff5d8f", medida: "diámetro de 7 cm" },
};
const IDS = Object.keys(PIEZA);
const SEMI = new Set(["G", "H"]);
const TINTA = "#1d2433", PAPEL = "#fffaf0", GRIS = "#6b7080";

// ---------- Ayudas de geometría (unidades; y hacia abajo) ----------
const R = Math.SQRT1_2;
const tri = (p, d1, d2, l) => [p, [p[0] + d1[0] * l, p[1] + d1[1] * l], [p[0] + d2[0] * l, p[1] + d2[1] * l]];
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const rombo = (cx, cy, lado) => { const h = lado * R; return [[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]]; };
const semi = (cx, cy, dir) => ({ c: [cx, cy], dir });
// Pieza canónica girada alrededor de su centro y colocada con el centro en (cx, cy)
const CANON = { grande: [[0, 0], [2, 0], [0, 2]], pequeno: [[0, 0], [1, 0], [0, 1]], cuadrado: rect(0, 0, 1, 1), barra: rect(0, 0, 2, 1) };
function colocar(tipo, cx, cy, grados) {
  const pts = CANON[tipo], c = G.centroide(pts), a = (grados * Math.PI) / 180;
  return pts.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]; });
}
// Gira un grupo de piezas alrededor de un punto
function girar(piezas, ox, oy, grados) {
  const a = (grados * Math.PI) / 180, rot = ([x, y]) => [ox + (x - ox) * Math.cos(a) - (y - oy) * Math.sin(a), oy + (x - ox) * Math.sin(a) + (y - oy) * Math.cos(a)];
  const out = {};
  for (const [k, v] of Object.entries(piezas)) out[k] = Array.isArray(v) ? v.map(rot) : { c: rot(v.c), dir: v.dir + grados };
  return out;
}
// Semicírculo como polígono (para medir y comprobar solapes)
function semiPoly(s, n = 64) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = ((s.dir - 90 + (180 * i) / n) * Math.PI) / 180; pts.push([s.c[0] + Math.cos(a), s.c[1] + Math.sin(a)]); }
  return pts;
}
// Semicírculo como trazo SVG exacto
function semiPath(s, k = 1, ox = 0, oy = 0) {
  const a1 = ((s.dir - 90) * Math.PI) / 180, a2 = ((s.dir + 90) * Math.PI) / 180;
  const p = (a) => [ox + (s.c[0] + Math.cos(a)) * k, oy + (s.c[1] + Math.sin(a)) * k];
  const [x1, y1] = p(a1), [x2, y2] = p(a2);
  return `M${x1.toFixed(3)} ${y1.toFixed(3)}A${k} ${k} 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)}Z`;
}
const polyPath = (pts, k = 1, ox = 0, oy = 0) => "M" + pts.map(([x, y]) => `${(ox + x * k).toFixed(3)} ${(oy + y * k).toFixed(3)}`).join("L") + "Z";
const forma = (id, v) => (SEMI.has(id) ? semiPoly(v) : v);

// =========================================================================================
// Las 15 figuras. Cada una usa solo las piezas que necesita, sin montarlas unas sobre otras.
// =========================================================================================
const FIGURAS = [
  { id: "canarias", nombre: "Canarias", nivel: 3, pista: "Cada pieza es una isla. Los dos semicírculos son las islas redondas: Gran Canaria y La Gomera.",
    piezas: {
      C: colocar("pequeno", 1.7, 2.5, 225),      // La Palma
      E: colocar("cuadrado", 1.2, 5.3, 45),      // El Hierro
      H: semi(3.3, 4.6, -90),                    // La Gomera
      A: colocar("grande", 5.3, 3.9, 225),       // Tenerife
      G: semi(7.9, 4.5, 90),                     // Gran Canaria
      B: colocar("grande", 11.3, 3.6, 135),      // Fuerteventura
      F: colocar("barra", 12.6, 1.4, -55),       // Lanzarote
      D: colocar("pequeno", 13.6, -0.3, 45),     // La Graciosa
    } },
  { id: "casa", nombre: "Casa", nivel: 1, pista: "Los dos triángulos grandes forman las paredes; los dos pequeños, el tejado.",
    piezas: {
      A: tri([0, 0], [1, 0], [0, 1], 2), B: tri([2, 2], [-1, 0], [0, -1], 2),
      C: tri([1, 0], [-1, 0], [0, -1], 1), D: tri([1, 0], [1, 0], [0, -1], 1),
    } },
  { id: "sol", nombre: "Sol", nivel: 1, pista: "Un amanecer: el semicírculo sale sobre la barra y tres piezas pequeñas son los rayos.",
    piezas: {
      F: rect(-1, 0, 2, 1), G: semi(0, 0, -90),
      E: rombo(0, -1.85, 1), C: tri([-1.55, -1.55], [1, 0], [0, 1], 1), D: tri([1.55, -1.55], [-1, 0], [0, 1], 1),
    } },
  { id: "llave", nombre: "Llave", nivel: 2, pista: "El círculo es el ojo de la llave; la barra y el cuadrado, la caña; los triángulos pequeños, los dientes.",
    piezas: {
      G: semi(0, 0, 180), H: semi(0, 0, 0),
      F: rect(1.05, -0.5, 2, 1), E: rect(3.05, -0.5, 1, 1),
      C: tri([3.05, 0.5], [1, 0], [0, 1], 1), D: tri([2.05, 0.5], [1, 0], [0, 1], 1),
    } },
  { id: "barco", nombre: "Barco", nivel: 1, pista: "Las velas son los triángulos grandes; el casco, la barra con un triángulo pequeño a cada lado.",
    piezas: {
      F: rect(-1, 2, 2, 1), C: tri([-1, 2], [-1, 0], [0, 1], 1), D: tri([1, 2], [1, 0], [0, 1], 1),
      A: tri([0.05, 1.95], [0, -1], [1, 0], 2), B: tri([-0.05, 1.95], [0, -1], [-1, 0], 2),
    } },
  { id: "bombilla", nombre: "Bombilla", nivel: 1, pista: "El círculo es el cristal; el cuadrado, el casquillo; un triángulo pequeño, la punta.",
    piezas: {
      G: semi(0, 0, -90), H: semi(0, 0, 90),
      E: rect(-0.5, 1, 1, 1), C: tri([0, 2.707], [R, -R], [-R, -R], 1),
    } },
  { id: "semaforo", nombre: "Semáforo", nivel: 2, pista: "Arriba y abajo, los semicírculos; en medio, el cuadrado que forman los dos triángulos grandes.",
    piezas: {
      G: semi(0, 0, -90), A: tri([-1, 0], [1, 0], [0, 1], 2), B: tri([1, 2], [-1, 0], [0, -1], 2), H: semi(0, 2, 90),
      F: rect(-0.5, 3, 1, 2), E: rect(-0.5, 5, 1, 1),
      C: tri([0, 7], [-1, 0], [0, -1], 1), D: tri([0, 7], [1, 0], [0, -1], 1),
    } },
  { id: "arbol", nombre: "Árbol", nivel: 1, pista: "La copa es el círculo; el tronco, la barra; las raíces, los triángulos pequeños.",
    piezas: {
      G: semi(0, 0, -90), H: semi(0, 0, 90), F: rect(-0.5, 1, 1, 2),
      C: tri([-0.5, 3], [-1, 0], [0, -1], 1), D: tri([0.5, 3], [1, 0], [0, -1], 1),
    } },
  { id: "hoja", nombre: "Hoja", nivel: 2, pista: "El semicírculo es la base redondeada; el triángulo grande, la punta; un triángulo pequeño, el rabito.",
    piezas: girar({ G: semi(1, 0, -90), A: tri([0, 0], [1, 0], [0, 1], 2), C: tri([1, -1.75], [R, R], [-R, R], 1) }, 0.8, 0.4, 210) },
  { id: "pez", nombre: "Pez", nivel: 2, pista: "El cuerpo es el rombo de los triángulos grandes; la cola, los dos pequeños; la aleta, el cuadrado.",
    piezas: {
      A: tri([0, -1.414], [R, R], [-R, R], 2), B: tri([0, 1.414], [R, -R], [-R, -R], 2),
      C: tri([-2.414, 0], [1, 0], [0, -1], 1), D: tri([-2.414, 0], [1, 0], [0, 1], 1),
      E: [[-0.707, -0.707], [0, -1.414], [-0.707, -2.121], [-1.414, -1.414]],
    } },
  { id: "flor", nombre: "Flor", nivel: 2, pista: "Un tulipán: el semicírculo es la copa y tres piezas pequeñas, los pétalos; la barra, el tallo; un triángulo grande, la hoja.",
    piezas: {
      G: semi(0, 0, 90), C: tri([-1, 0], [1, 0], [0, -1], 1), E: rombo(0, -0.707, 1), D: tri([1, 0], [-1, 0], [0, -1], 1),
      F: rect(-0.5, 1, 1, 2), A: tri([-0.5, 3], [-1, 0], [0, -1], 2),
    } },
  { id: "avion", nombre: "Avión", nivel: 2, pista: "La barra y el cuadrado son el fuselaje; los triángulos grandes, las alas; los pequeños, el morro y la cola.",
    piezas: {
      F: rect(-0.5, -1, 1, 2), E: rect(-0.5, 1, 1, 1), C: tri([0, -1.707], [R, R], [-R, R], 1),
      A: tri([-0.5, 1.2], [0, -1], [-1, 0], 2), B: tri([0.5, 1.2], [0, -1], [1, 0], 2),
      D: tri([0, 2], [R, R], [-R, R], 1),
    } },
  { id: "cohete", nombre: "Cohete", nivel: 2, pista: "Los triángulos grandes y la barra forman el cuerpo; el semicírculo, la punta; los pequeños, las aletas; el cuadrado, la llama.",
    piezas: {
      G: semi(0, 0, -90), A: tri([-1, 0], [1, 0], [0, 1], 2), B: tri([1, 2], [-1, 0], [0, -1], 2), F: rect(-1, 2, 2, 1),
      C: tri([-1, 3], [0, -1], [-1, 0], 1), D: tri([1, 3], [0, -1], [1, 0], 1), E: rombo(0, 3.85, 1),
    } },
  { id: "globo", nombre: "Globo", nivel: 1, pista: "Un semicírculo encima de los dos triángulos pequeños forma el globo; el cuadrado es la cesta.",
    piezas: {
      G: semi(0, 0, -90), C: tri([0, 0], [-1, 0], [0, 1], 1), D: tri([0, 0], [1, 0], [0, 1], 1),
      E: rect(-0.5, 1.5, 1, 1),
    } },
  { id: "pintadera", nombre: "Pintadera", nivel: 2, pista: "El sello visto de lado: el semicírculo es el asa; la barra, la placa; los triángulos pequeños, el dibujo en relieve.",
    piezas: {
      G: semi(0, 0, -90), F: rect(-1, 0, 2, 1),
      C: tri([-1, 1], [1, 0], [0, 1], 1), D: tri([0, 1], [1, 0], [0, 1], 1),
    } },
];

// ---------- Comprobaciones ----------
const lados = (p) => p.map((a, i) => Math.hypot(p[(i + 1) % p.length][0] - a[0], p[(i + 1) % p.length][1] - a[1])).map((l) => +l.toFixed(2)).sort((x, y) => x - y).join(",");
const ESPERADO = { A: "2,2,2.83", B: "2,2,2.83", C: "1,1,1.41", D: "1,1,1.41", E: "1,1,1,1", F: "1,1,2,2" };
const usadas = (fig) => IDS.filter((id) => fig.piezas[id]);
function caja(fig) {
  const todos = usadas(fig).flatMap((id) => forma(id, fig.piezas[id]));
  const xs = todos.map((p) => p[0]), ys = todos.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
async function comprobar(fig) {
  const err = [];
  if (usadas(fig).length < 3) err.push("usa menos de 3 piezas");
  for (const id of usadas(fig)) {
    const v = fig.piezas[id];
    if (SEMI.has(id)) { if (!v.c) err.push(id + " no es un semicírculo"); }
    else if (lados(v) !== ESPERADO[id]) err.push(`${id} no tiene su forma (${lados(v)})`);
  }
  if (err.length) return err;
  // Solapes: se dibuja cada pieza por separado y se cuentan los píxeles que caen dentro de dos piezas a la vez
  const k = 40, b = caja(fig), W = Math.ceil((b.x1 - b.x0) * k) + 4, H = Math.ceil((b.y1 - b.y0) * k) + 4;
  const ox = -b.x0 * k + 2, oy = -b.y0 * k + 2;
  const capas = [];
  for (const id of usadas(fig)) {
    const d = SEMI.has(id) ? semiPath(fig.piezas[id], k, ox, oy) : polyPath(fig.piezas[id], k, ox, oy);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}"/><path d="${d}" fill="#fff"/></svg>`;
    capas.push({ id, px: await sharp(Buffer.from(svg)).greyscale().raw().toBuffer() });
  }
  for (let i = 0; i < capas.length; i++) for (let j = i + 1; j < capas.length; j++) {
    let n = 0;
    const a = capas[i].px, c = capas[j].px;
    for (let p = 0; p < a.length; p++) if (a[p] > 250 && c[p] > 250) n++;
    if (n > 3) err.push(`${capas[i].id} y ${capas[j].id} se solapan (${n} px)`);
  }
  return err;
}

// ---------- Dibujo de una figura ----------
// Encaja la figura en la caja (x, y, w, h). modo: "silueta" | "solucion"
function dibujarFigura(fig, x, y, w, h, modo, { color = TINTA, numeros = true } = {}) {
  const b = caja(fig), k = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
  const ox = x + (w - (b.x1 - b.x0) * k) / 2 - b.x0 * k, oy = y + (h - (b.y1 - b.y0) * k) / 2 - b.y0 * k;
  let s = "";
  for (const id of usadas(fig)) {
    const v = fig.piezas[id];
    const d = SEMI.has(id) ? semiPath(v, k, ox, oy) : polyPath(v, k, ox, oy);
    if (modo === "silueta") s += `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="${(k * 0.02).toFixed(2)}" stroke-linejoin="round"/>`;
    else s += `<path d="${d}" fill="${PIEZA[id].color}" stroke="#ffffff" stroke-width="${(k * 0.05).toFixed(2)}" stroke-linejoin="round"/>`;
  }
  if (modo === "solucion" && numeros) {
    for (const id of usadas(fig)) {
      const pts = forma(id, fig.piezas[id]);
      const c = SEMI.has(id) ? [fig.piezas[id].c[0] + Math.cos((fig.piezas[id].dir * Math.PI) / 180) * 0.42, fig.piezas[id].c[1] + Math.sin((fig.piezas[id].dir * Math.PI) / 180) * 0.42] : G.centroide(pts);
      const cx = ox + c[0] * k, cy = oy + c[1] * k, r = Math.min(k * 0.19, 5.2);
      s += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="#ffffff"/>`;
      s += P.txt(G.OUTFIT_SB, String(PIEZA[id].n), cx, cy + r * 0.62 * 0.7 * 1.05, r * 1.25, TINTA, { anchor: "middle" });
    }
  }
  return s;
}

// =========================================================================================
// Páginas (en milímetros)
// =========================================================================================
const txt = (f, s, x, y, size, fill, o) => P.txt(f, s, x, y, size, fill, o);
const parrafo = (f, s, x, y, size, maxW, fill, o) => P.parrafo(f, s, x, y, size, maxW, fill, o);
const ancho = (f, s, size) => G.medir(f, s, size);
const pagina = (W, H, cuerpo, fondo = PAPEL) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${fondo}"/>${cuerpo}</svg>`;
// Estrellas de dificultad dibujadas (la fuente no tiene el símbolo ★). (x, y): esquina superior izquierda; t: tamaño
function estrellas(n, x, y, t, color = "#e9a400") {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const cx = x + t / 2 + i * t * 1.2, cy = y + t / 2, pts = [];
    for (let j = 0; j < 10; j++) { const r = j % 2 ? t * 0.22 : t * 0.5, a = -Math.PI / 2 + (j * Math.PI) / 5; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    s += `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ")}" fill="${i < n ? color : "none"}" stroke="${color}" stroke-width="${(t * 0.07).toFixed(2)}" stroke-linejoin="round"/>`;
  }
  return s;
}
const anchoEstrellas = (t) => t * 3.4;
const NIVEL = ["", "Fácil", "Medio", "Reto"];

// Una pieza suelta a escala real (mm), con su número; (x, y) arriba a la izquierda de su caja
function piezaSuelta(id, x, y, { contorno = false } = {}) {
  const k = MM, color = PIEZA[id].color;
  let d, c;
  if (SEMI.has(id)) { d = semiPath({ c: [1, 1], dir: -90 }, k, x, y); c = [x + k, y + k * 0.62]; }
  else {
    const pts = { A: CANON.grande, B: CANON.grande, C: CANON.pequeno, D: CANON.pequeno, E: CANON.cuadrado, F: CANON.barra }[id];
    d = polyPath(pts, k, x, y); const cc = G.centroide(pts); c = [x + cc[0] * k, y + cc[1] * k];
  }
  const borde = `<path d="${d}" fill="none" stroke="${TINTA}" stroke-width="0.3" stroke-dasharray="1.6 1.1"/>`;
  if (contorno) return borde + txt(G.OUTFIT_SB, String(PIEZA[id].n), c[0], c[1] + 2.6, 7, GRIS, { anchor: "middle" });
  return `<path d="${d}" fill="${color}"/>` + borde + `<circle cx="${c[0]}" cy="${c[1]}" r="4.6" fill="#ffffff"/>` +
    txt(G.OUTFIT_SB, String(PIEZA[id].n), c[0], c[1] + 2.3, 6.6, TINTA, { anchor: "middle" });
}
// Colocación de las 8 piezas en una hoja A4 (mm, esquina superior izquierda de cada pieza)
const DISPOSICION = { A: [16, 42], B: [104, 42], C: [16, 124], D: [55, 124], E: [94, 124], F: [133, 124], G: [16, 174], H: [104, 174] };

function hojaPiezas(contorno) {
  const W = 210, H = 297;
  let s = txt(G.OUTFIT_SB, "TANGRAM 8 · " + (contorno ? "PLANTILLA PARA CARTÓN" : "PIEZAS RECORTABLES"), 18, 20, 4.4, GRIS, { tracking: 0.6 });
  s += txt(G.BEBAS, contorno ? "CALCA, PEGA Y RECORTA" : "IMPRIME, PEGA Y RECORTA", 18, 32, 13, TINTA, { tracking: 0.3 });
  for (const id of IDS) s += piezaSuelta(id, DISPOSICION[id][0], DISPOSICION[id][1], { contorno });
  // Leyenda
  let y = 240;
  IDS.forEach((id, i) => {
    const x = 18 + (i % 4) * 46, yy = y + Math.floor(i / 4) * 12;
    s += `<rect x="${x}" y="${yy - 4}" width="5" height="5" rx="1" fill="${contorno ? "none" : PIEZA[id].color}" stroke="${TINTA}" stroke-width="0.25"/>`;
    s += txt(G.OUTFIT_SB, `${PIEZA[id].n} · ${PIEZA[id].nombre}`, x + 7, yy, 3.4, TINTA);
    s += txt(G.OUTFIT, PIEZA[id].medida, x + 7, yy + 4.2, 2.9, GRIS);
  });
  s += parrafo(G.OUTFIT, contorno
    ? "Usa esta hoja como plantilla: pégala sobre cartón grueso o goma EVA y recorta por la línea discontinua. Después pinta cada pieza de un color."
    : "Imprime al 100 % (sin ajustar a la página), pega la hoja sobre cartón de 2–3 mm o cartón pluma y recorta por la línea discontinua. Las piezas son simétricas: da igual por qué cara las uses.",
    18, 272, 3.4, 174, GRIS).svg;
  return pagina(W, H, s);
}

// ---------- Instrucciones (A4 vertical, 3 páginas) ----------
function portada() {
  const W = 210, H = 297;
  let s = `<rect width="${W}" height="120" fill="${TINTA}"/>`;
  s += txt(G.OUTFIT_SB, "UN TANGRAM DE 8 PIEZAS · 15 RETOS", 18, 26, 4.6, "#f6c90e", { tracking: 1 });
  s += txt(G.BEBAS, "TANGRAM 8", 16, 72, 46, PAPEL, { tracking: 1 });
  s += parrafo(G.OUTFIT, "Ocho piezas que se mueven, se giran y se combinan para construir Canarias, una casa, el sol, una pintadera… y todo lo que imagines.", 18, 90, 5, 170, "#d9dce6").svg;
  // Las 8 piezas, presentadas
  const k = 15;
  const muestra = { A: tri([0, 2], [0, -1], [1, 0], 2), B: tri([2.3, 0], [0, 1], [1, 0], 2), C: tri([4.7, 0.5], [1, 0], [0, 1], 1), D: tri([5.7, 2], [-1, 0], [0, -1], 1),
    E: rect(6.4, 1, 1, 1), F: rect(8.0, 1, 2, 1), G: semi(11.6, 2, -90), H: semi(11.6, 0, 90) };
  const fig = { piezas: muestra };
  s += dibujarFigura(fig, 18, 138, 174, 52, "solucion");
  s += txt(G.BEBAS, "LAS PIEZAS", 18, 214, 12, TINTA, { tracking: 0.3 });
  IDS.forEach((id, i) => {
    const x = 18 + (i % 2) * 88, y = 226 + Math.floor(i / 2) * 13;
    s += `<rect x="${x}" y="${y - 5}" width="7" height="7" rx="1.5" fill="${PIEZA[id].color}"/>`;
    s += txt(G.OUTFIT_SB, `${PIEZA[id].n}`, x + 3.5, y + 0.6, 3.6, "#ffffff", { anchor: "middle" });
    s += txt(G.OUTFIT_SB, PIEZA[id].nombre, x + 10, y - 0.6, 4, TINTA);
    s += txt(G.OUTFIT, PIEZA[id].medida, x + 10, y + 3.8, 3.2, GRIS);
  });
  s += txt(G.OUTFIT, "Unidad: 3,5 cm. Los dos triángulos grandes forman un cuadrado de 7 × 7 cm y los dos semicírculos, un círculo de 7 cm.", 18, 285, 3.2, GRIS);
  return pagina(W, H, s);
}
function reglas() {
  const W = 210, H = 297, m = 18;
  let s = txt(G.OUTFIT_SB, "TANGRAM 8 · CÓMO SE JUEGA", m, 22, 4.4, GRIS, { tracking: 0.6 });
  s += txt(G.BEBAS, "LAS REGLAS", m, 40, 22, TINTA, { tracking: 0.4 });
  const REGLAS = [
    ["Usa las piezas que necesites", "Cada ficha indica qué piezas forman la figura. Las demás se quedan en la caja."],
    ["Mueve, gira y da la vuelta", "Las piezas se pueden girar y voltear. Son simétricas, así que no importa por qué cara caigan."],
    ["Sin montar piezas", "Ninguna pieza puede quedar encima de otra. Se pueden tocar por un lado o solo por un punto."],
    ["Figuras simbólicas", "Con pocas piezas se construye una idea: lo importante es que la figura se reconozca."],
    ["Mira la silueta", "Cada ficha muestra la sombra de la figura, sin las líneas entre piezas: ese es el reto. La solución está aparte."],
  ];
  let y = 54;
  REGLAS.forEach(([t, d], i) => {
    s += `<circle cx="${m + 5}" cy="${y - 1.5}" r="5" fill="${PIEZA[IDS[i]].color}"/>`;
    s += txt(G.BEBAS, String(i + 1), m + 5, y + 1.3, 8, "#ffffff", { anchor: "middle" });
    s += txt(G.OUTFIT_SB, t, m + 14, y - 1, 4.6, TINTA);
    const p = parrafo(G.OUTFIT, d, m + 14, y + 5, 3.7, W - 2 * m - 14, GRIS);
    s += p.svg; y += 18 + p.alto;
  });
  s += txt(G.BEBAS, "FORMAS DE JUGAR", m, y + 8, 16, TINTA, { tracking: 0.3 });
  y += 18;
  const MODOS = [
    ["En solitario", "Elige una ficha y constrúyela. Empieza por las de nivel fácil (una estrella)."],
    ["En parejas", "Una persona describe la silueta sin enseñarla y la otra la construye."],
    ["Contrarreloj", "Equipos de 3 o 4: ¿cuántas figuras construís en 10 minutos?"],
    ["Inventa la tuya", "Crea una figura nueva, ponle nombre y dibuja su silueta para que otro equipo la resuelva. El gran reto: usar las 8 piezas."],
  ];
  MODOS.forEach(([t, d], i) => {
    const x = m + (i % 2) * 88, yy = y + Math.floor(i / 2) * 30;
    s += `<rect x="${x}" y="${yy}" width="84" height="26" rx="2.5" fill="#ffffff" stroke="#e4e0d6" stroke-width="0.3"/>`;
    s += `<rect x="${x}" y="${yy}" width="2" height="26" fill="${PIEZA[IDS[i + 4]].color}"/>`;
    s += txt(G.OUTFIT_SB, t, x + 6, yy + 7.5, 4.2, TINTA);
    s += parrafo(G.OUTFIT, d, x + 6, yy + 13, 3.3, 74, GRIS).svg;
  });
  y += 80;
  s += txt(G.BEBAS, "QUÉ NECESITAS", m, y, 16, TINTA, { tracking: 0.3 });
  s += parrafo(G.OUTFIT, "Un juego de piezas por persona o por equipo (hoja «Piezas recortables»), las fichas de retos y, para comprobar, las soluciones. Imprime las piezas al 100 % y pégalas sobre cartón antes de recortar.", m, y + 8, 3.7, W - 2 * m, GRIS).svg;
  return pagina(W, H, s);
}
function indice() {
  const W = 210, H = 297, m = 14;
  let s = txt(G.OUTFIT_SB, "TANGRAM 8 · LOS 15 RETOS", m + 4, 22, 4.4, GRIS, { tracking: 0.6 });
  s += txt(G.BEBAS, "¿QUÉ PUEDES CONSTRUIR?", m + 4, 43, 19, TINTA, { tracking: 0.4 });
  const cw = (W - 2 * m) / 3, ch = 47;
  FIGURAS.forEach((f, i) => {
    const x = m + (i % 3) * cw, y = 50 + Math.floor(i / 3) * ch;
    s += `<rect x="${x + 2}" y="${y}" width="${cw - 4}" height="${ch - 4}" rx="3" fill="#ffffff" stroke="#e4e0d6" stroke-width="0.3"/>`;
    s += txt(G.OUTFIT_SB, `${i + 1}. ${f.nombre}`, x + 6, y + ch - 8, 3.8, TINTA);
    s += estrellas(f.nivel, x + cw - 6 - anchoEstrellas(3.4), y + ch - 11, 3.4);
  });
  return pagina(W, H, s);
}

// ---------- Fichas de retos (A4 horizontal, una por página) ----------
function ficha(f, i) {
  const W = 297, H = 210, m = 16;
  let s = txt(G.OUTFIT_SB, `TANGRAM 8 · RETO ${i + 1} DE ${FIGURAS.length}`, m, 20, 4.2, GRIS, { tracking: 0.6 });
  s += txt(G.BEBAS, f.nombre.toUpperCase(), m, 40, 24, TINTA, { tracking: 0.5 });
  s += txt(G.OUTFIT_SB, NIVEL[f.nivel], W - m, 24, 5, "#e9a400", { anchor: "end" });
  s += estrellas(f.nivel, W - m - ancho(G.OUTFIT_SB, NIVEL[f.nivel], 5) - 4 - anchoEstrellas(5), 19.6, 5);
  s += dibujarFigura(f, m, 50, W - 2 * m, 120, "silueta");
  // Las 8 piezas que se usan
  const u = usadas(f);
  s += txt(G.OUTFIT_SB, `Piezas: ${u.length}`, m, 186, 3.6, TINTA);
  IDS.forEach((id, j) => {
    const x = m + 22 + j * 11, si = u.includes(id);
    s += `<rect x="${x}" y="${181}" width="7" height="7" rx="1.5" fill="${si ? PIEZA[id].color : "#e7e3d8"}"/>`;
    s += txt(G.OUTFIT_SB, String(PIEZA[id].n), x + 3.5, 186.2, 3.6, si ? "#ffffff" : "#b9b4a6", { anchor: "middle" });
  });
  // Pista, boca abajo para no leerla sin querer
  s += `<g transform="rotate(180 ${W - m - 60} 192)">${parrafo(G.OUTFIT, "Pista: " + f.pista, W - m - 120, 190, 3.2, 120, GRIS).svg}</g>`;
  return pagina(W, H, s);
}
// ---------- Soluciones (A4 horizontal, 4 por página) ----------
function soluciones(desde) {
  const W = 297, H = 210, m = 12;
  let s = txt(G.OUTFIT_SB, "TANGRAM 8 · SOLUCIONES", m + 2, 16, 4, GRIS, { tracking: 0.6 });
  const cw = (W - 2 * m) / 2, ch = (H - 26) / 2;
  FIGURAS.slice(desde, desde + 4).forEach((f, j) => {
    const x = m + (j % 2) * cw, y = 22 + Math.floor(j / 2) * ch;
    s += `<rect x="${x + 2}" y="${y}" width="${cw - 4}" height="${ch - 4}" rx="3" fill="#ffffff" stroke="#e4e0d6" stroke-width="0.3"/>`;
    s += txt(G.BEBAS, `${desde + j + 1}. ${f.nombre.toUpperCase()}`, x + 8, y + 11, 8, TINTA, { tracking: 0.3 });
    s += dibujarFigura(f, x + 8, y + 15, cw - 16, ch - 23, "solucion");
  });
  return pagina(W, H, s);
}

// =========================================================================================
// Exportar
// =========================================================================================
// Edge actual solo exporta con «--headless» y un perfil propio, y termina de escribir el PDF
// unos segundos después de cerrarse: se espera a que el archivo exista y deje de crecer.
async function pdf(nombre, paginas, Wmm, Hmm) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page { size: ${Wmm}mm ${Hmm}mm; margin: 0 } html, body { margin: 0 } svg { display: block; width: ${Wmm}mm; height: ${Hmm}mm; page-break-after: always } svg:last-child { page-break-after: auto }</style></head><body>${paginas.join("")}</body></html>`;
  const tmp = path.join(require("os").tmpdir(), "tangram8-pdf");
  fs.mkdirSync(tmp, { recursive: true });
  const htmlPath = path.join(tmp, nombre + ".html"), salida = path.join(OUT, nombre + ".pdf");
  fs.writeFileSync(htmlPath, html);
  if (fs.existsSync(salida)) fs.unlinkSync(salida);
  execFileSync(P.navegador(), ["--headless", "--disable-gpu", "--no-first-run", "--user-data-dir=" + path.join(tmp, "perfil"), "--no-pdf-header-footer",
    "--print-to-pdf=" + salida, "file:///" + htmlPath.split(path.sep).join("/")], { stdio: "ignore", timeout: 180000 });
  let antes = -1;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const t = fs.existsSync(salida) ? fs.statSync(salida).size : -1;
    if (t > 0 && t === antes) break;
    antes = t;
  }
  if (!fs.existsSync(salida)) throw new Error("No se ha creado " + nombre + ".pdf");
  fs.unlinkSync(htmlPath);
}
async function png(nombre, svg, ancho) {
  const w = parseFloat(svg.match(/width="([\d.]+)mm"/)[1]);
  await sharp(Buffer.from(svg), { density: ancho / (w / 25.4) }).png().toFile(path.join(OUT, "vistas", nombre + ".png"));
}

(async () => {
  fs.mkdirSync(path.join(OUT, "vistas"), { recursive: true });
  let fallos = 0;
  for (const f of FIGURAS) {
    const e = await comprobar(f);
    if (e.length) { fallos++; console.log("✗", f.nombre, "→", e.join("; ")); } else console.log("✓", f.nombre);
  }
  // Hoja de revisión: todas las soluciones juntas
  const rev = pagina(297, 420, FIGURAS.map((f, i) => {
    const x = 6 + (i % 3) * 95, y = 6 + Math.floor(i / 3) * 82;
    return `<rect x="${x}" y="${y}" width="91" height="78" fill="#fff" stroke="#ddd" stroke-width="0.3"/>` + txt(G.OUTFIT_SB, f.nombre, x + 3, y + 6, 4, TINTA) + dibujarFigura(f, x + 3, y + 9, 85, 66, "solucion");
  }).join(""));
  await png("revision-soluciones", rev, 2200);
  if (REVISAR || fallos) { console.log(fallos ? `${fallos} figura(s) con problemas` : "revisión hecha"); return; }

  const piezasCol = hojaPiezas(false), piezasCont = hojaPiezas(true);
  const instr = [portada(), reglas(), indice()];
  const fichas = FIGURAS.map(ficha);
  const sols = [0, 4, 8, 12].map(soluciones);
  await pdf("01-tangram8-instrucciones", instr, 210, 297);
  await pdf("02-tangram8-piezas-recortables", [piezasCol, piezasCont], 210, 297);
  await pdf("03-tangram8-fichas-de-retos", fichas, 297, 210);
  await pdf("04-tangram8-soluciones", sols, 297, 210);
  await png("01-portada", instr[0], 1100); await png("01-reglas", instr[1], 1100); await png("01-indice", instr[2], 1100);
  await png("02-piezas", piezasCol, 1100); await png("02-plantilla", piezasCont, 1100);
  for (let i = 0; i < fichas.length; i++) await png(`03-reto-${String(i + 1).padStart(2, "0")}-${FIGURAS[i].id}`, fichas[i], 1200);
  for (let i = 0; i < sols.length; i++) await png(`04-soluciones-${i + 1}`, sols[i], 1200);
  console.log("PDF listos en", OUT);
})();
