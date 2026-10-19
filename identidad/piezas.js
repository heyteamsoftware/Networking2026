// Genera las piezas impresas de Networking 2026: cartel A3, flyer A5 (dos caras) y roll-up 85 × 200 cm.
// Uso: cd identidad && npm install && npm run piezas
// Todo se dibuja en milímetros, con sangrado, y los textos van convertidos a contornos.
// Salida en ../piezas/: SVG de trabajo, PDF de imprenta (vía Edge o Chrome sin ventana) y vistas PNG.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const QR = require("qrcode");
const sharp = require("sharp");
const G = require("./generar.js"); // geometría, paleta y fuentes de la identidad (también regenera los logos)

const OUT = path.join(__dirname, "..", "piezas");
const URL_WEB = "https://myappsserver.duckdns.org/Networking/";
const URL_TXT = "myappsserver.duckdns.org/Networking";

const C = G.C;
const SUAVE = "#b4b8c8";
const TINTA_SUAVE = "#555c72";
const MESA_TEXTO_OSCURO = ["#ff8a6b", "#f3a35a", "#7fb2f0", "#ffcc00"]; // sobre noche
const MESA_TEXTO_CLARO = ["#a8361f", "#9c4f12", "#1e64b4", "#875800"];   // sobre arena

const MESAS = [
  { n: 1, corto: "El aula como laboratorio de ideas", detalle: "5 mesas redondas",
    items: ["Las necesidades del alumnado, del entorno y el currículo como base del diseño",
      "Las profesiones de una Escuela Azul como eje transversal de un proyecto para la ciudadanía",
      "Profesiones que reivindican una identidad",
      "Internacionalización e innovación al servicio del alumnado",
      "Alumnado competente y emprendimiento como oportunidad"] },
  { n: 2, corto: "Proyectos en acción", detalle: "8 mesas técnicas",
    items: ["Isleta Azul · Seguridad y Medioambiente", "Isleta Azul · Tecnología y Digitalización",
      "Isleta Azul · Brújula Social Azul I", "Isleta Azul · Brújula Social Azul II",
      "Identidad I · Madera", "Identidad II · Juegos y Deportes", "Internacionalización", "Redes"] },
  { n: 3, corto: "Radio Atlante conecta", detalle: "4 experiencias",
    items: ["CIFP Las Indias · Embajadores Erasmus", "CIFP Felo Monzón · Internacionalización e Innovación",
      "PLOCAN · Escuelas Azules", "Identidad a través del deporte y los juegos tradicionales"] },
  { n: 4, corto: "TG Lab", detalle: "4 ejes",
    items: ["Innovación", "Emprendimiento", "Orientación", "Calidad"] },
];
const TITULO_MESA = ["El aula como laboratorio de ideas", "Proyectos en acción: mesas técnicas de trabajo",
  "Radio Atlante conecta con experiencias de impacto", "TG Lab: Innovación, Emprendimiento, Orientación y Calidad"];

// ---------- Texto ----------
const CAP = 0.7; // altura de mayúscula de Bebas y Outfit, en em
function txt(f, s, x, y, size, fill, { tracking = 0, anchor = "start" } = {}) {
  if (anchor === "end") { x -= G.medir(f, s, size, tracking); anchor = "start"; }
  return G.linea(f, [{ t: s, fill }], x, y, size, { tracking, anchor });
}
function tramos(f, partes, x, y, size, { tracking = 0, anchor = "start" } = {}) {
  return G.linea(f, partes, x, y, size, { tracking, anchor });
}
// Ajusta el tamaño para que el texto mida `ancho`
const tamPara = (f, s, ancho, tracking = 0) => ancho / G.medir(f, s, 1, tracking);
// Párrafo con saltos de línea automáticos; devuelve { svg, alto }
function parrafo(f, s, x, y, size, maxW, fill, { lh = 1.35, anchor = "start" } = {}) {
  const palabras = s.split(" "), lineas = [];
  let act = "";
  for (const p of palabras) {
    const prueba = act ? act + " " + p : p;
    if (act && G.medir(f, prueba, size) > maxW) { lineas.push(act); act = p; } else act = prueba;
  }
  if (act) lineas.push(act);
  const svg = lineas.map((l, i) => txt(f, l, x, y + i * size * lh, size, fill, { anchor })).join("\n");
  return { svg, alto: (lineas.length - 1) * size * lh, lineas: lineas.length };
}

// ---------- Tangram, mesas y archipiélago ----------
// El tangram montado; con `palabras`, cada pieza lleva su palabra clave (en contornos)
function tangram(x, y, lado, { palabras = false } = {}) {
  const k = lado / 400;
  let s = `<g transform="translate(${x} ${y}) scale(${k})">` + G.PIEZAS.map((p) =>
    `<polygon points="${G.pts(G.inset(p.pts, G.JUNTA))}" fill="${G.MESA_COLOR[p.mesa]}"/>`).join("");
  if (palabras) {
    for (const p of G.PIEZAS) {
      const w = G.PALABRAS[p.id], palabra = G.ISLAS[p.id].palabra;
      const color = w.oscura ? C.noche : "#ffffff";
      // la línea base queda media altura de mayúscula por debajo del centro
      const t = txt(G.BEBAS, palabra, w.x, w.y + w.size * CAP / 2, w.size, color, { anchor: "middle", tracking: w.size * 0.02 });
      s += w.rot ? `<g transform="rotate(${w.rot} ${w.x} ${w.y})">${t}</g>` : t;
    }
  }
  return s + `</g>`;
}
const BBOX = [[0, 0, 400, 200], [0, 0, 200, 400], [100, 0, 300, 300], [0, 200, 400, 200]];
// Símbolo de la mesa m (0..3): `lado` es el lado del tangram completo, así todas van a la misma escala.
// (x, y) es la esquina superior izquierda de su caja.
function simbolo(m, x, y, lado) {
  const k = lado / 400, b = BBOX[m];
  return `<g transform="translate(${x - b[0] * k} ${y - b[1] * k}) scale(${k})">` + G.PIEZAS.filter((p) => p.mesa === m).map((p) =>
    `<polygon points="${G.pts(G.inset(p.pts, G.JUNTA))}" fill="${G.MESA_COLOR[p.mesa]}"/>`).join("") + `</g>`;
}
const simboloTam = (m, lado) => [BBOX[m][2] * lado / 400, BBOX[m][3] * lado / 400];
// Archipiélago encuadrado en un ancho dado; (x, y) arriba a la izquierda del encuadre 40,40,1240,560
function archipielago(x, y, ancho, { rotulos = false, colorRotulo = C.arena, colorValor = SUAVE } = {}) {
  const k = ancho / 1240, ox = x - 40 * k, oy = y - 15 * k;
  let s = `<g transform="translate(${ox} ${oy}) scale(${k})">`;
  for (const p of G.PIEZAS) {
    const i = G.ISLAS[p.id], [cx, cy] = G.centroide(p.pts);
    s += `<polygon points="${G.pts(G.inset(p.pts, G.JUNTA))}" fill="${G.MESA_COLOR[p.mesa]}" transform="translate(${i.x} ${i.y}) rotate(${i.r}) scale(${G.ESCALA_ISLAS}) translate(${-cx} ${-cy})"/>`;
  }
  s += G.graciosaSVG("#9aa0b4") + `</g>`;
  if (rotulos) {
    // Nombres de isla (mismas posiciones que la web)
    const R = { ideas: [392, 290], proyectos: [1060, 478], territorio: [300, 492], conexiones: [717, 548], personas: [140, 594], futuro: [1060, 132], empresa: [165, 350] };
    const VAL = { ideas: "Ideas", proyectos: "Proyectos", territorio: "Territorio", conexiones: "Conexiones", personas: "Personas", futuro: "Futuro", empresa: "Empresa" };
    const t = 22 * k;
    for (const p of G.PIEZAS) {
      const [rx, ry] = R[p.id];
      s += txt(G.OUTFIT_SB, G.ISLAS[p.id].isla, ox + rx * k, oy + ry * k, t, colorRotulo, { anchor: "middle" });
      s += txt(G.OUTFIT, VAL[p.id], ox + rx * k, oy + ry * k + t * 1.2, t * 0.82, colorValor, { anchor: "middle" });
    }
  }
  return s;
}

// ---------- QR ----------
function qr(texto, x, y, lado, { color = C.noche, fondo = "#ffffff", margen = 0.1 } = {}) {
  const m = QR.create(texto, { errorCorrectionLevel: "M" }).modules;
  const n = m.size, pad = lado * margen, u = (lado - 2 * pad) / n;
  let d = "";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (m.get(r, c)) {
        let e = c; while (e < n && m.get(r, e)) e++;
        d += `M${(x + pad + c * u).toFixed(3)} ${(y + pad + r * u).toFixed(3)}h${((e - c) * u).toFixed(3)}v${u.toFixed(3)}h${(-(e - c) * u).toFixed(3)}z`;
        c = e;
      } else c++;
    }
  }
  return `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" fill="${fondo}"/><path d="${d}" fill="${color}"/>`;
}

// ---------- Logos institucionales ----------
let LOGO_CIFP, LOGO_GOB, GOB_RATIO;
async function cargarLogos() {
  const cifp = await sharp(path.join(__dirname, "project", "assets", "Instituciones", "cifp-tony-gallardo.png")).resize(900).png().toBuffer();
  LOGO_CIFP = "data:image/png;base64," + cifp.toString("base64");
  const gobPath = path.join(__dirname, "project", "assets", "Instituciones", "gobierno-canarias.png");
  const meta = await sharp(gobPath).metadata();
  GOB_RATIO = meta.width / meta.height;
  LOGO_GOB = "data:image/png;base64," + fs.readFileSync(gobPath).toString("base64");
}
const img = (src, x, y, w, h) => `<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
// Logo del CIFP en su círculo blanco
const cifpCirculo = (cx, cy, d) => `<circle cx="${cx}" cy="${cy}" r="${d / 2 - 0.2}" fill="#ffffff"/>` + img(LOGO_CIFP, cx - d / 2, cy - d / 2, d, d);
// Franja blanca con los dos logos, centrada; devuelve el svg
function franjaLogos(x, y, ancho, alto, bleedAbajo = 0) {
  const h = alto * 0.62, gh = h * 1.2, gob = gh * GOB_RATIO, gap = alto * 0.45;
  const total = h + gap + gob, x0 = x + (ancho - total) / 2, cy = y + alto / 2;
  return `<rect x="${x - 10}" y="${y}" width="${ancho + 20}" height="${alto + bleedAbajo}" fill="#ffffff"/>` +
    img(LOGO_CIFP, x0, cy - h / 2, h, h) +
    `<rect x="${x0 + h + gap / 2 - 0.15}" y="${cy - h * 0.4}" width="0.3" height="${h * 0.8}" fill="#d9cfbd"/>` +
    img(LOGO_GOB, x0 + h + gap, cy - gh / 2, gob, gh);
}

// ---------- Lienzo ----------
function lienzo(W, H, b, cuerpo, fondo = C.noche, titulo = "Networking 2026") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * b}mm" height="${H + 2 * b}mm" viewBox="0 0 ${W + 2 * b} ${H + 2 * b}">
<title>${titulo}</title>
<rect width="${W + 2 * b}" height="${H + 2 * b}" fill="${fondo}"/>
<g transform="translate(${b} ${b})">
${cuerpo}
</g>
</svg>
`;
}

// Cabecera «Organiza · CIFP Tony Gallardo»
function organiza(x, y, d, color = C.arena, colorEtiqueta = SUAVE) {
  return cifpCirculo(x + d / 2, y + d / 2, d) +
    txt(G.OUTFIT_SB, "ORGANIZA", x + d * 1.25, y + d * 0.42, d * 0.16, colorEtiqueta, { tracking: d * 0.03 }) +
    txt(G.OUTFIT_SB, "CIFP Tony Gallardo", x + d * 1.25, y + d * 0.74, d * 0.25, color);
}

// =========================================================================================
// CARTEL A3 · 297 × 420 mm
// =========================================================================================
function cartel() {
  const W = 297, H = 420, b = 3, m = 18, ancho = W - 2 * m;
  let s = "";
  s += organiza(m, m, 24);

  const lado = 168, ty = 54;
  s += tangram((W - lado) / 2, ty, lado, { palabras: true });

  const tTam = tamPara(G.BEBAS, "NETWORKING 2026", ancho);
  let y = ty + lado + 16 + tTam * CAP;
  s += tramos(G.BEBAS, [{ t: "NETWORKING ", fill: C.arena }, { t: "2026", fill: C.sol }], W / 2, y, tTam, { anchor: "middle" });
  y += 13;
  s += txt(G.OUTFIT_SB, "JUNTOS SOMOS FP", W / 2, y, 7.2, C.arena, { tracking: 2.2, anchor: "middle" });
  y += 9;
  s += txt(G.OUTFIT, "Un espacio de encuentro, diálogo y crecimiento entre empresas y profesorado.", W / 2, y, 4.4, SUAVE, { anchor: "middle" });

  // Las cuatro mesas
  y += 12;
  const colW = (ancho - 3 * 6) / 4;
  MESAS.forEach((me, i) => {
    const x = m + i * (colW + 6);
    s += `<polygon points="${x},${y} ${x + 6},${y} ${x},${y + 6}" fill="${G.MESA_COLOR[i]}"/>`;
    s += txt(G.OUTFIT_SB, "MESA " + me.n, x + 8.5, y + 4.6, 3.4, MESA_TEXTO_OSCURO[i], { tracking: 0.7 });
    s += parrafo(G.BEBAS, me.corto.toUpperCase(), x, y + 13, 6.4, colW, C.arena, { lh: 1.05 }).svg;
  });

  // Fecha y QR
  const bandaY = H - 34;
  const qrL = 36, qrX = W - m - qrL, qrY = bandaY - 10 - qrL;
  s += qr(URL_WEB, qrX, qrY, qrL);
  s += txt(G.OUTFIT_SB, "Programa y mesas", qrX - 6, qrY + 14, 4.4, C.arena, { anchor: "end" });
  s += txt(G.OUTFIT, URL_TXT, qrX - 6, qrY + 21, 3.5, SUAVE, { anchor: "end" });
  s += txt(G.OUTFIT, "Escanea el código", qrX - 6, qrY + 27, 3.5, SUAVE, { anchor: "end" });
  const dTam = 44, dY = qrY + qrL - 3;
  s += txt(G.BEBAS, "20", m, dY, dTam, C.sol);
  const dW = G.medir(G.BEBAS, "20", dTam) + 4;
  s += txt(G.BEBAS, "NOVIEMBRE", m + dW, dY - 15, 11.5, C.arena, { tracking: 0.4 });
  s += txt(G.BEBAS, "2026", m + dW, dY - 3, 11.5, C.arena, { tracking: 0.4 });
  s += txt(G.OUTFIT, "CIFP Tony Gallardo", m + dW + 1, dY + 6, 3.8, SUAVE);

  s += franjaLogos(0, bandaY, W, 34, b);
  return lienzo(W, H, b, s, C.noche, "Networking 2026 · Cartel A3");
}

// =========================================================================================
// FLYER A5 · 148 × 210 mm, dos caras
// =========================================================================================
function flyerFrente() {
  const W = 148, H = 210, b = 3, m = 10, ancho = W - 2 * m;
  let s = "";
  s += organiza(m, m, 14);
  const lado = 82, ty = 32;
  s += tangram((W - lado) / 2, ty, lado, { palabras: true });
  const tTam = tamPara(G.BEBAS, "NETWORKING 2026", ancho);
  let y = ty + lado + 9 + tTam * CAP;
  s += tramos(G.BEBAS, [{ t: "NETWORKING ", fill: C.arena }, { t: "2026", fill: C.sol }], W / 2, y, tTam, { anchor: "middle" });
  y += 7.5;
  s += txt(G.OUTFIT_SB, "JUNTOS SOMOS FP", W / 2, y, 4, C.arena, { tracking: 1.2, anchor: "middle" });
  y += 6.5;
  s += parrafo(G.OUTFIT, "Un espacio de encuentro, diálogo y crecimiento entre empresas y profesorado.", W / 2, y, 3, ancho - 16, SUAVE, { anchor: "middle" }).svg;

  const bandaY = H - 20;
  const qrL = 22, qrX = W - m - qrL, qrY = bandaY - 7 - qrL;
  s += qr(URL_WEB, qrX, qrY, qrL);
  s += txt(G.OUTFIT_SB, "Programa y mesas", qrX - 4, qrY + 9, 3, C.arena, { anchor: "end" });
  s += txt(G.OUTFIT, "Escanea el código", qrX - 4, qrY + 14, 2.6, SUAVE, { anchor: "end" });
  const dTam = 28, dY = qrY + qrL - 2;
  s += txt(G.BEBAS, "20", m, dY, dTam, C.sol);
  const dW = G.medir(G.BEBAS, "20", dTam) + 2.5;
  s += txt(G.BEBAS, "NOVIEMBRE", m + dW, dY - 9.5, 7.2, C.arena);
  s += txt(G.BEBAS, "2026", m + dW, dY - 2, 7.2, C.arena);
  s += franjaLogos(0, bandaY, W, 20, b);
  return lienzo(W, H, b, s, C.noche, "Networking 2026 · Flyer A5 · frente");
}

function flyerDorso() {
  const W = 148, H = 210, b = 3, m = 10, ancho = W - 2 * m;
  let s = "";
  s += txt(G.OUTFIT_SB, "JUNTOS SOMOS FP", m, m + 3, 2.8, MESA_TEXTO_CLARO[1], { tracking: 0.8 });
  s += txt(G.BEBAS, "CUATRO MESAS, UN MISMO CUADRADO", m, m + 13, tamPara(G.BEBAS, "CUATRO MESAS, UN MISMO CUADRADO", ancho * 0.92), C.noche);
  let y = m + 22;
  const txtX = m + 26, txtW = ancho - 26;
  MESAS.forEach((me, i) => {
    // todos los símbolos a la misma escala: el tangram completo mediría 20 mm
    const [sw] = simboloTam(i, 20);
    s += simbolo(i, m + (20 - sw) / 2, y + 1, 20);
    s += txt(G.OUTFIT_SB, ("MESA " + me.n + " · " + me.detalle).toUpperCase(), txtX, y + 2.6, 2.5, MESA_TEXTO_CLARO[i], { tracking: 0.5 });
    const t = parrafo(G.BEBAS, TITULO_MESA[i].toUpperCase(), txtX, y + 8.2, 5, txtW, C.noche, { lh: 1.02 });
    s += t.svg;
    let iy = y + 8.2 + t.alto + 5;
    if (me.n === 2) {
      // ocho mesas técnicas en dos columnas
      const cw = (txtW - 4) / 2;
      me.items.forEach((it, j) => {
        const cx = txtX + (j % 2) * (cw + 4), cy = iy + Math.floor(j / 2) * 4.6;
        s += txt(G.OUTFIT, "· " + it, cx, cy, 2.6, C.noche);
      });
      iy += Math.ceil(me.items.length / 2) * 4.6;
    } else if (me.n === 4) {
      s += txt(G.OUTFIT, me.items.join(" · "), txtX, iy, 2.6, C.noche);
      iy += 4;
    } else {
      me.items.forEach((it) => {
        const p = parrafo(G.OUTFIT, "· " + it, txtX, iy, 2.6, txtW, C.noche, { lh: 1.3 });
        s += p.svg; iy += p.alto + 4.6;
      });
    }
    y = Math.max(iy + 6, y + 24);
    if (i < 3) s += `<rect x="${m}" y="${y - 5}" width="${ancho}" height="0.25" fill="#d9cfbd"/>`;
  });

  const bandaY = H - 20;
  s += txt(G.OUTFIT_SB, "20 de noviembre de 2026 · CIFP Tony Gallardo", m, bandaY - 9, 3, C.noche);
  s += txt(G.OUTFIT, "Programa completo: " + URL_TXT, m, bandaY - 4.5, 2.7, TINTA_SUAVE);
  s += franjaLogos(0, bandaY, W, 20, b);
  return lienzo(W, H, b, s, C.arena, "Networking 2026 · Flyer A5 · dorso");
}

// =========================================================================================
// ROLL-UP · 850 × 2000 mm (los últimos 150 mm quedan ocultos por la base)
// =========================================================================================
function rollup() {
  const W = 850, H = 2000, b = 5, m = 60, ancho = W - 2 * m;
  let s = "";
  s += organiza(m, m, 110);

  // Título en dos líneas
  const t1 = Math.min(160, tamPara(G.BEBAS, "NETWORKING", ancho));
  let y = 250 + t1 * CAP;
  s += txt(G.BEBAS, "NETWORKING", W / 2, y, t1, C.arena, { anchor: "middle" });
  y += 25 + t1 * CAP;
  s += txt(G.BEBAS, "2026", W / 2, y, t1, C.sol, { anchor: "middle" });
  y += 60;
  s += txt(G.OUTFIT_SB, "JUNTOS SOMOS FP", W / 2, y, 36, C.arena, { tracking: 11, anchor: "middle" });

  // Tangram
  y += 45;
  const lado = 320;
  s += tangram((W - lado) / 2, y, lado, { palabras: true });
  y += lado + 50;

  // Fecha
  const fT = Math.min(74, tamPara(G.BEBAS, "20 DE NOVIEMBRE DE 2026", ancho));
  y += fT * CAP;
  s += txt(G.BEBAS, "20 DE NOVIEMBRE DE 2026", W / 2, y, fT, C.sol, { anchor: "middle" });
  y += 45;

  // Las cuatro mesas, todas a la misma escala (el tangram completo mediría 80 mm)
  MESAS.forEach((me, i) => {
    const [sw, sh] = simboloTam(i, 80);
    s += simbolo(i, m + (80 - sw) / 2, y + (80 - sh) / 2, 80);
    s += txt(G.OUTFIT_SB, "MESA " + me.n, m + 110, y + 24, 20, MESA_TEXTO_OSCURO[i], { tracking: 4 });
    s += parrafo(G.BEBAS, me.corto.toUpperCase(), m + 110, y + 66, 42, ancho - 110, C.arena, { lh: 1 }).svg;
    y += 92;
  });

  // QR
  y += 10;
  const qrL = 150;
  s += qr(URL_WEB, m, y, qrL);
  s += txt(G.OUTFIT_SB, "Programa y mesas", m + qrL + 30, y + 55, 32, C.arena);
  s += txt(G.OUTFIT, URL_TXT, m + qrL + 30, y + 92, 22, SUAVE);
  s += txt(G.OUTFIT, "Escanea el código", m + qrL + 30, y + 124, 22, SUAVE);

  // Franja de logos por encima de la zona que tapa la base
  s += franjaLogos(0, 1640, W, 190);
  return lienzo(W, H, b, s, C.noche, "Networking 2026 · Roll-up 85 × 200 cm");
}

// =========================================================================================
// Exportar
// =========================================================================================
function navegador() {
  const cands = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  return cands.find((c) => fs.existsSync(c));
}
function pdf(nombre, paginas, Wmm, Hmm) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${Wmm}mm ${Hmm}mm; margin: 0 }
html, body { margin: 0; padding: 0 }
svg { display: block; width: ${Wmm}mm; height: ${Hmm}mm; page-break-after: always }
svg:last-child { page-break-after: auto }
</style></head><body>${paginas.join("\n")}</body></html>`;
  const htmlPath = path.join(OUT, "." + nombre + ".html");
  fs.writeFileSync(htmlPath, html);
  const nav = navegador();
  if (!nav) { console.log("Sin Edge/Chrome: no se genera", nombre + ".pdf"); return; }
  execFileSync(nav, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--print-to-pdf=" + path.join(OUT, nombre + ".pdf"),
    "file:///" + htmlPath.replace(/\\/g, "/")], { stdio: "ignore", timeout: 180000 });
  fs.unlinkSync(htmlPath);
}
async function png(nombre, svg, altoPx) {
  const hmm = parseFloat(svg.match(/height="([\d.]+)mm"/)[1]);
  const density = (altoPx / (hmm / 25.4));
  await sharp(Buffer.from(svg), { density }).png().toFile(path.join(OUT, nombre + ".png"));
}

module.exports = { txt, tramos, tamPara, parrafo, tangram, qr, cargarLogos, img, cifpCirculo, franjaLogos, lienzo, organiza, navegador, png,
  logos: () => ({ LOGO_CIFP, LOGO_GOB, GOB_RATIO }), CAP, SUAVE, TINTA_SUAVE, MESA_TEXTO_CLARO, MESA_TEXTO_OSCURO, URL_WEB, URL_TXT };

if (require.main === module) (async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await cargarLogos();
  const piezas = {
    "cartel-a3": { svgs: [cartel()], w: 303, h: 426, px: 1600 },
    "flyer-a5": { svgs: [flyerFrente(), flyerDorso()], w: 154, h: 216, px: 1400 },
    "rollup-85x200": { svgs: [rollup()], w: 860, h: 2010, px: 2400 },
  };
  for (const [n, p] of Object.entries(piezas)) {
    p.svgs.forEach((s, i) => fs.writeFileSync(path.join(OUT, n + (p.svgs.length > 1 ? (i ? "-dorso" : "-frente") : "") + ".svg"), s));
    for (let i = 0; i < p.svgs.length; i++) await png(n + (p.svgs.length > 1 ? (i ? "-dorso" : "-frente") : ""), p.svgs[i], p.px);
    pdf(n, p.svgs, p.w, p.h);
    console.log("ok", n);
  }
})();
