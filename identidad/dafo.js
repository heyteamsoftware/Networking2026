// ANÁLISIS DAFO · un QR por mesa y un cartel A4 por mesa para imprimir.
// Uso: cd identidad && node dafo.js
// Salida: ../Networking/img/qr-dafo-1…10.svg (para el panel), un PDF por mesa en ../Networking/dafo/carteles/
// (dafo-mesa-01.pdf … dafo-mesa-10.pdf) y todos juntos en ../Networking/dafo/dafo-qr-mesas.pdf.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const P = require("./piezas.js");

const WEB = path.join(__dirname, "..", "Networking");
const URL_DAFO = "https://myappsserver.duckdns.org/Networking/dafo/?mesa=";
const archivo = (r) => "file:///" + path.join(WEB, r).split(path.sep).join("/");

// Mismas mesas que Networking/dafo/opciones.php: 10, con los cuatro colores repetidos en orden
const COLORES = [["#c8452b", "#ffffff"], ["#e8862a", "#14213d"], ["#2370c4", "#ffffff"], ["#ffcc00", "#14213d"]];
const MESAS = Array.from({ length: 10 }, (_, i) => [i + 1, ...COLORES[i % 4]]);
const BLOQUES = [["F", "Fortalezas", "#2370c4"], ["D", "Debilidades", "#e8862a"], ["O", "Oportunidades", "#ffcc00"], ["A", "Amenazas", "#c8452b"]];

const qr = (n) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="crispEdges">${P.qr(URL_DAFO + n, 0, 0, 100, { margen: 0 })}</svg>`;
for (const [n] of MESAS) fs.writeFileSync(path.join(WEB, "img", `qr-dafo-${n}.svg`), qr(n) + "\n");
console.log("✓ img/qr-dafo-1…10.svg");

const pagina = ([n, color, sobre]) => `<section class="hoja" style="--c:${color}; --s:${sobre}">
  <div class="marca"><img src="${archivo("img/isotipo.svg")}" alt=""><span>Networking <b>2026</b></span></div>
  <div class="mesa"><img src="${archivo(`img/mesa-${(n - 1) % 4 + 1}.svg`)}" alt=""><h2>Mesa ${n}</h2></div>
  <p class="etiqueta">Análisis DAFO del encuentro</p>
  <h1>¿Cómo ha ido <em>el encuentro?</em></h1>
  <ol>${BLOQUES.map(([l, t, c]) => `<li style="--b:${c}"><b>${l}</b>${t}</li>`).join("")}</ol>
  <div class="acceso">
    <div class="qr">${qr(n)}</div>
    <div>
      <h3>Escanead y responded</h3>
      <p>Un móvil por equipo. Marcad hasta 3 opciones en cada bloque: fortalezas, debilidades, oportunidades y amenazas.</p>
      <p>Es anónimo y tarda dos minutos. Los resultados salen en directo en la pantalla del encuentro.</p>
    </div>
  </div>
  <div class="pie"><img src="${archivo("img/logo-horizontal-negativo.svg")}" alt=""><span>20 de noviembre de 2026 · CIFP Tony Gallardo</span></div>
</section>`;

const documento = (mesas, titulo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo} — Networking 2026</title><style>
@font-face { font-family: "Bebas Neue"; src: url("${archivo("fonts/BebasNeue-Regular.woff2")}") format("woff2"); }
@font-face { font-family: "Outfit"; font-weight: 100 900; src: url("${archivo("fonts/Outfit-Variable.woff2")}") format("woff2"); }
@page { size: 210mm 297mm; margin: 0 }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; }
body { background: #14213d; color: #f5efe4; font-family: Outfit, sans-serif; }
.hoja { position: relative; width: 210mm; height: 297mm; overflow: hidden; padding: 16mm 16mm 0; display: flex; flex-direction: column; break-after: page; }
.hoja:last-child { break-after: auto; }
.hoja::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5mm; background: var(--c); }
.hoja::after { content: ""; position: absolute; right: 0; top: 0; width: 26mm; height: 26mm; background: var(--c); clip-path: polygon(0 0, 100% 0, 100% 100%); }
.marca { display: flex; align-items: center; gap: 3mm; font-family: "Bebas Neue"; font-size: 9mm; letter-spacing: .03em; line-height: 1; }
.marca img { width: 10mm; height: 10mm; }
.marca b { color: #ffcc00; font-weight: 400; }
.mesa { margin-top: 12mm; display: flex; align-items: center; gap: 5mm; padding: 5mm 6mm; background: var(--c); color: var(--s); }
.mesa img { width: 16mm; height: 16mm; padding: 2mm; background: #fff; }
.mesa p { margin: 0; font-size: 4.4mm; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.mesa h2 { margin: 0; padding-top: 1.5mm; font-family: "Bebas Neue"; font-weight: 400; font-size: 20mm; line-height: .9; }
.etiqueta { margin: 11mm 0 3mm; font-size: 4.2mm; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #ffcc00; }
h1 { margin: 0; font-family: "Bebas Neue"; font-weight: 400; font-size: 21mm; line-height: .88; }
h1 em { display: block; font-style: normal; color: #ffcc00; }
ol { list-style: none; margin: 8mm 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
li { display: flex; align-items: center; gap: 3.5mm; padding: 3.2mm 4mm; background: #1c2b4d; border-left: 2mm solid var(--b); font-size: 5mm; font-weight: 600; }
li b { display: grid; place-items: center; width: 9mm; height: 9mm; padding-top: .8mm; background: var(--b); color: #14213d; font-family: "Bebas Neue"; font-size: 7.5mm; font-weight: 400; }
.acceso { margin: auto 0 9mm; display: flex; align-items: center; gap: 9mm; }
.qr { flex: none; width: 72mm; height: 72mm; padding: 5mm; background: #fff; }
.qr svg { display: block; width: 100%; height: 100%; }
.acceso h3 { margin: 0 0 3mm; font-family: "Bebas Neue"; font-weight: 400; font-size: 12mm; line-height: .95; }
.acceso p { margin: 0 0 2.5mm; font-size: 4.3mm; line-height: 1.4; color: #c9ccd8; }
.pie { margin: 0 -16mm; padding: 6mm 16mm 6mm 21mm; background: #0f1a33; display: flex; align-items: center; justify-content: space-between; }
.pie img { height: 15mm; }
.pie span { font-size: 3.6mm; color: #b4b8c8; }
</style></head><body>${mesas.map(pagina).join("")}</body></html>`;

// Edge actual solo exporta con «--headless» y un perfil propio, y acaba de escribir el PDF después de cerrarse
const tmp = path.join(os.tmpdir(), "dafo-pdf");
async function exportar(html, salida) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const htmlPath = path.join(tmp, path.basename(salida, ".pdf") + ".html");
  fs.writeFileSync(htmlPath, html);
  if (fs.existsSync(salida)) fs.unlinkSync(salida);
  execFileSync(P.navegador(), ["--headless", "--disable-gpu", "--no-first-run", "--user-data-dir=" + path.join(tmp, "perfil"), "--no-pdf-header-footer",
    "--allow-file-access-from-files", "--print-to-pdf=" + salida, "file:///" + htmlPath.split(path.sep).join("/")], { stdio: "ignore", timeout: 180000 });
  let antes = -1;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const t = fs.existsSync(salida) ? fs.statSync(salida).size : -1;
    if (t > 0 && t === antes) break;
    antes = t;
  }
  if (!fs.existsSync(salida)) throw new Error("No se ha creado " + salida);
  fs.unlinkSync(htmlPath);
  console.log("✓", path.relative(WEB, salida).split(path.sep).join("/"));
}

(async () => {
  fs.mkdirSync(tmp, { recursive: true });
  // Un PDF independiente por mesa, cada uno con su propio QR
  for (const m of MESAS) {
    await exportar(documento([m], `Análisis DAFO · Mesa ${m[0]}`), path.join(WEB, "dafo", "carteles", `dafo-mesa-${String(m[0]).padStart(2, "0")}.pdf`));
  }
  // Y todas las mesas en un solo PDF, para imprimirlas de una vez
  await exportar(documento(MESAS, "Análisis DAFO · QR de las mesas"), path.join(WEB, "dafo", "dafo-qr-mesas.pdf"));
})();
