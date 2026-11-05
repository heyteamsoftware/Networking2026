// EL LEGADO · QR de acceso rápido y cartel A4 para las mesas.
// Uso: cd identidad && node legado.js
// Salida: ../Networking/img/qr-legado.svg (para la web) y ../Networking/legado/legado-qr.pdf (cartel para imprimir).
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const P = require("./piezas.js");

const WEB = path.join(__dirname, "..", "Networking");
const URL_LEGADO = "https://myappsserver.duckdns.org/Networking/legado/";
const URL_TXT = "myappsserver.duckdns.org/Networking/legado";
const archivo = (r) => "file:///" + path.join(WEB, r).split(path.sep).join("/");

// ---------- QR (SVG limpio, sin margen: el margen blanco lo pone quien lo coloca) ----------
const qr = (color = "#14213d") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="crispEdges">${P.qr(URL_LEGADO, 0, 0, 100, { color, margen: 0 })}</svg>`;
fs.writeFileSync(path.join(WEB, "img", "qr-legado.svg"), qr() + "\n");
console.log("✓ img/qr-legado.svg");

// ---------- Cartel A4 ----------
const pasos = [
  ["mesa-1", "#c8452b", "Una necesidad o interés compartido."],
  ["mesa-2", "#e8862a", "Una acción que pueda iniciarse en los próximos 30 días."],
  ["mesa-3", "#2370c4", "Una persona de contacto por cada parte."],
  ["mesa-4", "#ffcc00", "Una fecha para revisar los avances."],
];
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>El legado · Cartel con QR — Networking 2026</title><style>
@font-face { font-family: "Bebas Neue"; src: url("${archivo("fonts/BebasNeue-Regular.woff2")}") format("woff2"); }
@font-face { font-family: "Outfit"; font-weight: 100 900; src: url("${archivo("fonts/Outfit-Variable.woff2")}") format("woff2"); }
@page { size: 210mm 297mm; margin: 0 }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; }
html, body { height: 297mm; overflow: hidden; }
body { width: 210mm; background: #14213d; color: #f5efe4; font-family: Outfit, sans-serif; }
.hoja { position: relative; height: 297mm; padding: 16mm 16mm 0; display: flex; flex-direction: column; }
.hoja::after { content: ""; position: absolute; right: 0; top: 0; width: 26mm; height: 26mm; background: #ffcc00; clip-path: polygon(0 0, 100% 0, 100% 100%); }
.marca { display: flex; align-items: center; gap: 3mm; font-family: "Bebas Neue"; font-size: 9mm; letter-spacing: .03em; line-height: 1; }
.marca img { width: 10mm; height: 10mm; }
.marca b { color: #ffcc00; font-weight: 400; }
.etiqueta { margin: 10mm 0 3mm; font-size: 4.2mm; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #ffcc00; }
h1 { margin: 0; font-family: "Bebas Neue"; font-weight: 400; font-size: 25mm; line-height: .86; }
h1 em { display: block; font-style: normal; color: #ffcc00; }
.intro { margin: 7mm 0 6mm; max-width: 160mm; font-size: 5mm; line-height: 1.45; color: #c9ccd8; }
ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
li { display: flex; align-items: center; gap: 3.5mm; padding: 4mm 4.5mm; background: #1c2b4d; border-left: 2mm solid var(--c); font-size: 4.2mm; font-weight: 500; line-height: 1.3; }
li img { flex: none; width: 9mm; height: 9mm; }
.acceso { margin-top: 8mm; display: flex; align-items: center; gap: 9mm; }
.qr { flex: none; width: 70mm; height: 70mm; padding: 5mm; background: #fff; }
.qr svg { display: block; width: 100%; height: 100%; }
.acceso h2 { margin: 0 0 3mm; font-family: "Bebas Neue"; font-weight: 400; font-size: 13mm; line-height: .95; }
.acceso p { margin: 0 0 2mm; font-size: 4.4mm; line-height: 1.4; color: #c9ccd8; }
.acceso .url { margin-top: 4mm; font-weight: 600; color: #f5efe4; font-size: 4.2mm; }
.lema { margin: auto 0 0; padding: 6mm 0 7mm; font-family: "Bebas Neue"; font-size: 12mm; line-height: 1; }
.lema em { font-style: normal; color: #ffcc00; }
.pie { margin: 0 -16mm; padding: 6mm 16mm; background: #0f1a33; display: flex; align-items: center; justify-content: space-between; }
.pie img { height: 15mm; }
.pie span { font-size: 3.6mm; color: #b4b8c8; }
</style></head><body><div class="hoja">
  <div class="marca"><img src="${archivo("img/isotipo.svg")}" alt=""><span>Networking <b>2026</b></span></div>
  <p class="etiqueta">El legado</p>
  <h1>Del encuentro <em>a la acción</em></h1>
  <p class="intro">El networking busca que las conversaciones se conviertan en colaboraciones con continuidad. Por ello, se invita a cada equipo a identificar:</p>
  <ol>${pasos.map(([icono, c, t]) => `<li style="--c:${c}"><img src="${archivo("img/" + icono + ".svg")}" alt=""><span>${t}</span></li>`).join("")}</ol>
  <div class="acceso">
    <div class="qr">${qr()}</div>
    <div>
      <h2>Registrad vuestro legado</h2>
      <p>Escanead el código con el móvil y dejad por escrito vuestro compromiso.</p>
      <p>Dos minutos: datos de la empresa, contacto y los cuatro puntos.</p>
    </div>
  </div>
  <p class="lema">El éxito no es reunirnos. <em>Es lo que construimos después.</em></p>
  <div class="pie"><img src="${archivo("img/logo-horizontal-negativo.svg")}" alt=""><span>20 de noviembre de 2026 · CIFP Tony Gallardo</span></div>
</div></body></html>`;

(async () => {
  const tmp = path.join(os.tmpdir(), "legado-pdf");
  fs.mkdirSync(tmp, { recursive: true });
  const htmlPath = path.join(tmp, "legado-qr.html"), salida = path.join(WEB, "legado", "legado-qr.pdf");
  fs.writeFileSync(htmlPath, html);
  if (fs.existsSync(salida)) fs.unlinkSync(salida);
  // Edge actual solo exporta con «--headless» y un perfil propio, y acaba de escribir el PDF después de cerrarse
  execFileSync(P.navegador(), ["--headless", "--disable-gpu", "--no-first-run", "--user-data-dir=" + path.join(tmp, "perfil"), "--no-pdf-header-footer",
    "--allow-file-access-from-files", "--print-to-pdf=" + salida, "file:///" + htmlPath.split(path.sep).join("/")], { stdio: "ignore", timeout: 180000 });
  let antes = -1;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const t = fs.existsSync(salida) ? fs.statSync(salida).size : -1;
    if (t > 0 && t === antes) break;
    antes = t;
  }
  if (!fs.existsSync(salida)) throw new Error("No se ha creado legado-qr.pdf");
  console.log("✓ legado/legado-qr.pdf");
})();
