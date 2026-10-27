<?php
// Networking 2026 — panel privado de solicitudes «Quiero participar como empresa».
// Muestra y deja descargar el CSV que guarda participa.php. Solo con contraseña:
// su hash vive en el servidor (panel-clave.txt), nunca en el repositorio.

declare(strict_types=1);

$datos = getenv('NETWORKING_DATA') ?: '/var/www/networking_data';
define('CSV', $datos . '/solicitudes.csv');
define('CLAVE', $datos . '/panel-clave.txt');
define('INTENTOS', $datos . '/panel-intentos.json');
define('LOGOS', $datos . '/logos');
const MAX_FALLOS = 5;          // fallos seguidos permitidos desde una misma conexión…
const BLOQUEO = 15 * 60;       // …antes de tener que esperar 15 minutos
const INACTIVIDAD = 20 * 60;   // la sesión caduca tras 20 minutos sin uso (el servidor borra las de más de 24)

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");

$https = ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off';
define('RUTA', rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/'); // /Networking/panel/
session_name('ng26panel');
session_set_cookie_params(['lifetime' => 0, 'path' => RUTA, 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
ini_set('session.use_strict_mode', '1');
session_start();

function e(string $v): string {
  return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function volver(string $query = ''): never {
  header('Location: ' . RUTA . $query, true, 303);
  exit;
}

// ---------- Freno a la fuerza bruta ----------
// Guardamos solo una huella de la conexión, nunca la IP.
function huella(): string {
  return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|networking2026-panel');
}

/** Lee o modifica los intentos fallidos con el archivo bloqueado. Devuelve el resultado de $cambio. */
function conIntentos(callable $cambio): mixed {
  $f = fopen(INTENTOS, 'c+');
  if (!$f || !flock($f, LOCK_EX)) return $cambio([])[1] ?? null;
  $lista = json_decode((string)stream_get_contents($f), true) ?: [];
  $ahora = time();
  $lista = array_filter($lista, fn($r) => $ahora - (int)($r['ultimo'] ?? 0) < BLOQUEO);
  [$lista, $resultado] = $cambio($lista);
  ftruncate($f, 0); rewind($f); fwrite($f, json_encode($lista));
  flock($f, LOCK_UN); fclose($f);
  return $resultado;
}

/** Segundos que faltan para poder volver a intentarlo (0 si no hay bloqueo). */
function esperaRestante(): int {
  $h = huella();
  return conIntentos(function (array $lista) use ($h) {
    $r = $lista[$h] ?? null;
    $espera = ($r && $r['fallos'] >= MAX_FALLOS) ? BLOQUEO - (time() - $r['ultimo']) : 0;
    return [$lista, max(0, $espera)];
  });
}

function anotarFallo(): void {
  $h = huella();
  conIntentos(function (array $lista) use ($h) {
    $lista[$h] = ['fallos' => ($lista[$h]['fallos'] ?? 0) + 1, 'ultimo' => time()];
    return [$lista, null];
  });
}

function borrarFallos(): void {
  $h = huella();
  conIntentos(function (array $lista) use ($h) { unset($lista[$h]); return [$lista, null]; });
}

// ---------- Sesión ----------
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$dentro = !empty($_SESSION['dentro']) && time() - (int)($_SESSION['visto'] ?? 0) < INACTIVIDAD;
if (!$dentro && !empty($_SESSION['dentro'])) { $_SESSION = ['csrf' => bin2hex(random_bytes(32))]; session_regenerate_id(true); }
if ($dentro) $_SESSION['visto'] = time();

$csrfOk = fn() => hash_equals($_SESSION['csrf'], (string)($_POST['csrf'] ?? ''));
$accion = $_POST['accion'] ?? '';
$aviso = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  if (!$csrfOk()) volver();

  if ($accion === 'salir') {
    $_SESSION = [];
    session_regenerate_id(true);
    volver('?salida=1');
  }

  if ($accion === 'entrar') {
    $espera = esperaRestante();
    $hash = is_readable(CLAVE) ? trim((string)file_get_contents(CLAVE)) : '';
    if ($espera > 0) {
      $_SESSION['aviso'] = 'bloqueo';
    } elseif ($hash !== '' && password_verify((string)($_POST['clave'] ?? ''), $hash)) {
      borrarFallos();
      session_regenerate_id(true);
      $_SESSION['dentro'] = true;
      $_SESSION['visto'] = time();
      $_SESSION['csrf'] = bin2hex(random_bytes(32));
      volver();
    } else {
      anotarFallo();
      sleep(1); // cada fallo cuesta un segundo más
      $_SESSION['aviso'] = esperaRestante() > 0 ? 'bloqueo' : 'fallo';
    }
    volver();
  }
  volver();
}

// ---------- Sin sesión: solo el formulario de acceso ----------
if (!$dentro) {
  $aviso = $_SESSION['aviso'] ?? (isset($_GET['salida']) ? 'salida' : '');
  unset($_SESSION['aviso']);
  $espera = esperaRestante();
  if ($espera > 0) $aviso = 'bloqueo';
  $sinClave = !is_readable(CLAVE) || trim((string)file_get_contents(CLAVE)) === '';
  $mensajes = [
    'fallo' => 'Contraseña incorrecta.',
    'bloqueo' => 'Demasiados intentos fallidos. Vuelve a probar dentro de ' . max(1, (int)ceil($espera / 60)) . ' min.',
    'salida' => 'Has salido del panel.',
  ];
  pintarCabecera('Acceso al panel', 'acceso');
  ?>
  <main class="acceso">
    <form class="acceso-caja" method="post" action="./">
      <img src="../img/isotipo.svg" alt="" width="64" height="64">
      <p class="etiqueta">Networking 2026 · Equipo del centro</p>
      <h1>Panel de solicitudes</h1>
      <?php if ($sinClave): ?>
        <p class="aviso aviso-error" role="alert">El panel aún no tiene contraseña. Hay que crearla en el servidor (ver README).</p>
      <?php elseif ($aviso !== ''): ?>
        <p class="aviso <?= $aviso === 'salida' ? '' : 'aviso-error' ?>" role="alert"><?= e($mensajes[$aviso]) ?></p>
      <?php endif; ?>
      <label for="clave">Contraseña</label>
      <input id="clave" name="clave" type="password" autocomplete="current-password" required autofocus <?= $espera > 0 || $sinClave ? 'disabled' : '' ?>>
      <input type="hidden" name="accion" value="entrar">
      <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
      <button class="btn btn-primario" type="submit" <?= $espera > 0 || $sinClave ? 'disabled' : '' ?>>Entrar</button>
      <p class="nota"><a href="../">Volver a la web</a></p>
    </form>
  </main>
  </body></html>
  <?php
  exit;
}

// ---------- Con sesión: logo de una empresa ----------
// Los logos viven fuera de la web: solo se sirven desde aquí, con sesión y con un nombre con el formato que genera participa.php.
if (isset($_GET['logo'])) {
  $nombre = (string)$_GET['logo'];
  $ruta = LOGOS . '/' . $nombre;
  if (!preg_match('/^\d{8}-\d{6}-[0-9a-f]{12}\.png$/', $nombre) || !is_file($ruta)) { http_response_code(404); exit; }
  header('Content-Type: image/png');
  header('Content-Length: ' . filesize($ruta));
  readfile($ruta);
  exit;
}

// ---------- Con sesión: leer el CSV ----------
if (isset($_GET['descargar'])) {
  if (!is_readable(CSV)) volver();
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="solicitudes-networking2026-' . date('Y-m-d') . '.csv"');
  header('Content-Length: ' . filesize(CSV));
  readfile(CSV);
  exit;
}

$columnas = ['fecha', 'empresa', 'sector', 'persona', 'cargo', 'correo', 'telefono', 'modalidad', 'mesas', 'propuesta', 'logo'];
$filas = [];
if (is_readable(CSV) && ($f = fopen(CSV, 'r'))) {
  flock($f, LOCK_SH);
  $cabecera = true;
  while (($c = fgetcsv($f, 0, ';', '"', '')) !== false) {
    if ($cabecera) { $cabecera = false; continue; }
    if ($c === [null]) continue;
    $c = array_pad(array_slice($c, 0, 11), 11, ''); // 11 columnas: la última es el logo (las solicitudes anteriores no lo tienen)
    // participa.php antepone «'» a lo que empieza por = + - @ para que Excel no lo tome por fórmula
    $c = array_map(fn($v) => preg_match("/^'[=+\-@\t\r]/", (string)$v) ? substr((string)$v, 1) : (string)$v, $c);
    $filas[] = array_combine($columnas, $c);
  }
  flock($f, LOCK_UN);
  fclose($f);
}
$filas = array_reverse($filas); // más recientes primero

$modalidades = ['Participante', 'Colaboradora', 'Impulsora', 'Sin decidir'];
$mesas = [1 => 'El aula como laboratorio de ideas', 2 => 'Proyectos en acción', 3 => 'Radio Atlante conecta', 4 => 'TG Lab'];
$numMesas = fn(array $fila) => array_map('intval', preg_match_all('/Mesa (\d)/', $fila['mesas'], $m) ? $m[1] : []);

$fMod = in_array($_GET['modalidad'] ?? '', $modalidades, true) ? $_GET['modalidad'] : '';
$fMesa = (int)($_GET['mesa'] ?? 0);
if (!isset($mesas[$fMesa])) $fMesa = 0;
$vistas = array_values(array_filter($filas, fn($r) =>
  ($fMod === '' || $r['modalidad'] === $fMod) && ($fMesa === 0 || in_array($fMesa, $numMesas($r), true))));

// Excel e impresión usan los mismos filtros que la tabla
$enlaceXlsx = '?' . http_build_query(array_filter(['exportar' => 'xlsx', 'modalidad' => $fMod, 'mesa' => $fMesa ?: ''], fn($v) => $v !== ''));
$partesFiltro = array_filter([$fMod !== '' ? "Modalidad: $fMod" : '', $fMesa ? "Mesa $fMesa" : '']);
$etiquetaFiltro = $partesFiltro ? implode(' · ', $partesFiltro) : 'Todas las solicitudes';
if (($_GET['exportar'] ?? '') === 'xlsx') descargarXlsx($vistas, 'solicitudes-networking2026-' . date('Y-m-d') . '.xlsx');

$porModalidad = array_fill_keys($modalidades, 0);
$porMesa = array_fill_keys(array_keys($mesas), 0);
foreach ($filas as $r) {
  if (isset($porModalidad[$r['modalidad']])) $porModalidad[$r['modalidad']]++;
  foreach ($numMesas($r) as $n) if (isset($porMesa[$n])) $porMesa[$n]++;
}

// Los mismos colores que las fichas de modalidad de la web
$claseMod = ['Participante' => 'mod-3', 'Colaboradora' => 'mod-2', 'Impulsora' => 'mod-1', 'Sin decidir' => 'mod-0'];

pintarCabecera('Solicitudes', 'panel');
?>
  <header class="barra">
    <a class="marca" href="./"><img src="../img/isotipo.svg" alt="" width="30" height="30"><span>Networking <b>2026</b></span></a>
    <span class="barra-titulo">Panel de solicitudes</span>
    <form method="post" action="./" class="salir">
      <input type="hidden" name="accion" value="salir">
      <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
      <button type="submit" class="btn-salir">Salir</button>
    </form>
  </header>

  <main class="wrap">
    <p class="solo-imprimir">Networking 2026 · Solicitudes de empresas · <?= e($etiquetaFiltro) ?> · <?= date('d/m/Y') ?></p>
    <section class="cabeza">
      <div>
        <p class="etiqueta">Quiero participar como empresa</p>
        <h1><?= count($filas) ?> <?= count($filas) === 1 ? 'solicitud' : 'solicitudes' ?></h1>
      </div>
      <?php if ($filas): ?>
        <div class="acciones">
          <button type="button" class="btn btn-borde" data-imprimir>Imprimir / PDF</button>
          <a class="btn btn-borde" href="<?= e($enlaceXlsx) ?>" download>Descargar Excel</a>
          <a class="btn btn-primario" href="?descargar=1" download>Descargar CSV completo</a>
        </div>
      <?php endif; ?>
    </section>

    <?php if ($filas): ?>
    <section class="resumen" aria-label="Resumen">
      <?php foreach ($porModalidad as $nombre => $n): ?>
        <div class="dato <?= e($claseMod[$nombre]) ?>"><b><?= $n ?></b><span><?= e($nombre) ?></span></div>
      <?php endforeach; ?>
      <?php foreach ($porMesa as $n => $total): ?>
        <div class="dato mesa-<?= $n ?>"><b><?= $total ?></b><span>Mesa <?= $n ?></span></div>
      <?php endforeach; ?>
    </section>

    <form class="filtros" method="get" action="./">
      <label>Modalidad
        <select name="modalidad">
          <option value="">Todas</option>
          <?php foreach ($modalidades as $m): ?>
            <option value="<?= e($m) ?>" <?= $fMod === $m ? 'selected' : '' ?>><?= e($m) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Mesa
        <select name="mesa">
          <option value="0">Todas</option>
          <?php foreach ($mesas as $n => $titulo): ?>
            <option value="<?= $n ?>" <?= $fMesa === $n ? 'selected' : '' ?>>Mesa <?= $n ?> · <?= e($titulo) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <button type="submit" class="btn btn-borde">Filtrar</button>
      <?php if ($fMod !== '' || $fMesa): ?><a class="quitar" href="./">Quitar filtros</a><?php endif; ?>
    </form>

    <p class="cuenta" role="status">
      <?= $fMod !== '' || $fMesa ? 'Mostrando ' . count($vistas) . ' de ' . count($filas) . '.' : 'Las más recientes, primero.' ?>
    </p>

    <?php if ($vistas): ?>
    <div class="tabla-caja">
      <table class="tabla">
        <thead>
          <tr><th>Fecha</th><th>Empresa</th><th>Contacto</th><th>Modalidad</th><th>Mesas</th><th>Propuesta</th><th>Logo</th></tr>
        </thead>
        <tbody>
        <?php foreach ($vistas as $r): $tel = preg_replace('/[^0-9+]/', '', $r['telefono']); ?>
          <tr>
            <td data-col="Fecha" class="fecha"><?= e($r['fecha']) ?></td>
            <td data-col="Empresa"><strong><?= e($r['empresa']) ?></strong><?php if ($r['sector'] !== ''): ?><span class="sub"><?= e($r['sector']) ?></span><?php endif; ?></td>
            <td data-col="Contacto">
              <?= e($r['persona']) ?><?php if ($r['cargo'] !== ''): ?><span class="sub"><?= e($r['cargo']) ?></span><?php endif; ?>
              <?php if ($r['correo'] !== ''): ?><a class="sub" href="mailto:<?= e(rawurlencode($r['correo'])) ?>"><?= e($r['correo']) ?></a><?php endif; ?>
              <?php if ($r['telefono'] !== ''): ?><a class="sub" href="tel:<?= e($tel) ?>"><?= e($r['telefono']) ?></a><?php endif; ?>
            </td>
            <td data-col="Modalidad"><span class="pildora <?= e($claseMod[$r['modalidad']] ?? 'mod-0') ?>"><?= e($r['modalidad']) ?></span></td>
            <td data-col="Mesas">
              <?php $ns = $numMesas($r); if ($ns): foreach ($ns as $n): ?>
                <span class="mesa-chip mesa-<?= $n ?>" title="<?= e($mesas[$n] ?? '') ?>"><?= $n ?></span>
              <?php endforeach; else: ?><span class="sub">—</span><?php endif; ?>
            </td>
            <td data-col="Propuesta" class="propuesta"><?= $r['propuesta'] !== '' ? nl2br(e($r['propuesta'])) : '<span class="sub">—</span>' ?></td>
            <td data-col="Logo" class="logo"><?php if ($r['logo'] !== ''): ?><a href="?logo=<?= e(rawurlencode($r['logo'])) ?>" target="_blank" rel="noopener"><img src="?logo=<?= e(rawurlencode($r['logo'])) ?>" alt="Logo de <?= e($r['empresa']) ?>" loading="lazy"></a><?php else: ?><span class="sub">Sin logo</span><?php endif; ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <p class="vacio">Ninguna solicitud cumple estos filtros.</p>
    <?php endif; ?>

    <?php else: ?>
      <p class="vacio">Todavía no ha llegado ninguna solicitud. Aparecerán aquí en cuanto una empresa rellene el formulario de la web.</p>
    <?php endif; ?>
  </main>
  <script src="panel.js"></script>
</body></html>
<?php

/**
 * Descarga las solicitudes como .xlsx. Sin librerías externas: un .xlsx es un zip de XML
 * y PHP trae ZipArchive. Las celdas son texto (inlineStr), así que Excel no ejecuta fórmulas.
 */
function descargarXlsx(array $filas, string $nombre): never {
  $columnas = [ // [título, clave en $filas, ancho]
    ['Fecha', 'fecha', 17], ['Empresa', 'empresa', 32], ['Sector', 'sector', 22], ['Persona de contacto', 'persona', 24],
    ['Cargo', 'cargo', 24], ['Correo', 'correo', 30], ['Teléfono', 'telefono', 16], ['Modalidad', 'modalidad', 14],
    ['Mesas', 'mesas', 18], ['Propuesta', 'propuesta', 70],
  ];
  $celda = fn(string $ref, string $texto, int $estilo = 0) => sprintf(
    '<c r="%s" s="%d" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>',
    $ref, $estilo, htmlspecialchars($texto, ENT_QUOTES | ENT_XML1, 'UTF-8'));

  $filasXml = '<row r="1">';
  foreach ($columnas as $i => [$titulo]) $filasXml .= $celda(chr(65 + $i) . '1', $titulo, 1);
  $filasXml .= '</row>';
  foreach (array_values($filas) as $n => $r) {
    $fila = $n + 2;
    $filasXml .= "<row r=\"$fila\">";
    foreach ($columnas as $i => [, $clave]) $filasXml .= $celda(chr(65 + $i) . $fila, (string)$r[$clave]);
    $filasXml .= '</row>';
  }

  $anchos = '';
  foreach ($columnas as $i => [, , $ancho]) $anchos .= sprintf('<col min="%d" max="%d" width="%d" customWidth="1"/>', $i + 1, $i + 1, $ancho);

  $cabeceraXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  $partes = [
    '[Content_Types].xml' => $cabeceraXml
      . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      . '<Default Extension="xml" ContentType="application/xml"/>'
      . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      . '</Types>',
    '_rels/.rels' => $cabeceraXml
      . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      . '</Relationships>',
    'xl/workbook.xml' => $cabeceraXml
      . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      . '<sheets><sheet name="Solicitudes" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels' => $cabeceraXml
      . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      . '</Relationships>',
    'xl/styles.xml' => $cabeceraXml
      . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFF5EFE4"/><name val="Calibri"/></font></fonts>'
      . '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
      . '<fill><patternFill patternType="solid"><fgColor rgb="FF14213D"/><bgColor indexed="64"/></patternFill></fill></fills>'
      . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      . '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      . '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
      . '</styleSheet>',
    'xl/worksheets/sheet1.xml' => $cabeceraXml
      . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      . "<cols>$anchos</cols><sheetData>$filasXml</sheetData></worksheet>",
  ];

  $tmp = tempnam(sys_get_temp_dir(), 'ng26');
  $zip = new ZipArchive();
  if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) { http_response_code(500); exit('No se ha podido crear el Excel.'); }
  foreach ($partes as $ruta => $contenido) $zip->addFromString($ruta, $contenido);
  $zip->close();

  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  header('Content-Disposition: attachment; filename="' . $nombre . '"');
  header('Content-Length: ' . filesize($tmp));
  readfile($tmp);
  unlink($tmp);
  exit;
}

function pintarCabecera(string $titulo, string $clase): void { ?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= e($titulo) ?> — Networking 2026</title>
  <meta name="theme-color" content="#14213d">
  <link rel="icon" href="../img/isotipo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="panel.css">
</head>
<body class="<?= e($clase) ?>">
<?php }
