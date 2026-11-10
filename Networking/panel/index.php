<?php
// Networking 2026 — panel privado de solicitudes «Quiero participar como empresa».
// Muestra, edita y descarga las solicitudes que guarda participa.php, y en la sección Legado
// los compromisos «Del encuentro a la acción» que guarda legado/guardar.php, y en Análisis DAFO
// la matriz DAFO del encuentro, en directo, con las respuestas de las mesas (dafo/guardar.php). Lo que se borra
// va a una papelera (papelera.csv) desde la que se puede restaurar. Solo con contraseña:
// su hash vive en el servidor (panel-clave.txt), nunca en el repositorio.

declare(strict_types=1);

$datos = getenv('NETWORKING_DATA') ?: '/var/www/networking_data';
define('CSV', $datos . '/solicitudes.csv');
define('PAPELERA', $datos . '/papelera.csv');
define('CLAVE', $datos . '/panel-clave.txt');
define('INTENTOS', $datos . '/panel-intentos.json');
define('LOGOS', $datos . '/logos');
define('COPIAS', $datos . '/copias');        // copia del CSV antes de cada cambio
define('CERROJO', $datos . '/panel.lock');   // se bloquea mientras se edita o se mueve una solicitud
const CABECERA = ['Fecha', 'Empresa', 'Sector', 'Persona de contacto', 'Cargo', 'Correo', 'Teléfono', 'Modalidad', 'Mesas', 'Propuesta', 'Logo (archivo privado)'];
const CABECERA_PAPELERA = ['Fecha', 'Empresa', 'Sector', 'Persona de contacto', 'Cargo', 'Correo', 'Teléfono', 'Modalidad', 'Mesas', 'Propuesta', 'Logo (archivo privado)', 'Borrada el'];
const CLAVES = ['fecha', 'empresa', 'sector', 'persona', 'cargo', 'correo', 'telefono', 'modalidad', 'mesas', 'propuesta', 'logo'];
const CLAVES_PAPELERA = ['fecha', 'empresa', 'sector', 'persona', 'cargo', 'correo', 'telefono', 'modalidad', 'mesas', 'propuesta', 'logo', 'borrada'];
define('LEGADO', $datos . '/legado.csv');
define('LEGADO_PAPELERA', $datos . '/legado-papelera.csv'); // lo borrado del legado se guarda aquí, por si acaso
define('DAFO', $datos . '/dafo.csv');
require __DIR__ . '/../dafo/opciones.php'; // mesas y respuestas cerradas del DAFO
const CABECERA_LEGADO = ['Fecha', 'Empresa', 'Sector', 'Persona de contacto', 'Cargo', 'Correo', 'Teléfono',
  'Necesidad o interés compartido', 'Acción en los próximos 30 días', 'Contacto por la empresa', 'Contacto por la otra parte'];
const CABECERA_LEGADO_PAPELERA = [...CABECERA_LEGADO, 'Borrada el'];
const CLAVES_LEGADO = ['fecha', 'empresa', 'sector', 'persona', 'cargo', 'correo', 'telefono', 'necesidad', 'accion', 'contacto_empresa', 'contacto_otra'];
// Columnas de cada Excel: [título, clave, ancho]
const COLUMNAS_SOLICITUDES = [
  ['Fecha', 'fecha', 17], ['Empresa', 'empresa', 32], ['Sector', 'sector', 22], ['Persona de contacto', 'persona', 24],
  ['Cargo', 'cargo', 24], ['Correo', 'correo', 30], ['Teléfono', 'telefono', 16], ['Modalidad', 'modalidad', 14],
  ['Mesas', 'mesas', 18], ['Propuesta', 'propuesta', 70],
];
const COLUMNAS_LEGADO = [
  ['Fecha', 'fecha', 17], ['Empresa', 'empresa', 32], ['Sector', 'sector', 22], ['Persona de contacto', 'persona', 24],
  ['Cargo', 'cargo', 24], ['Correo', 'correo', 30], ['Teléfono', 'telefono', 16], ['Necesidad o interés compartido', 'necesidad', 60],
  ['Acción en los próximos 30 días', 'accion', 60], ['Contacto por la empresa', 'contacto_empresa', 28],
  ['Contacto por la otra parte', 'contacto_otra', 32],
];
const MODALIDADES = ['Participante', 'Colaboradora', 'Impulsora', 'Sin decidir'];
const MAX_FALLOS = 5;          // fallos seguidos permitidos desde una misma conexión…
const BLOQUEO = 15 * 60;       // …antes de tener que esperar 15 minutos
const INACTIVIDAD = 20 * 60;   // la sesión caduca tras 20 minutos sin uso (el servidor borra las de más de 24)

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");

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

  if (in_array($accion, ['guardar', 'borrar', 'restaurar', 'borrar-legado'], true) && $dentro) gestionarSolicitud($accion);
  if ($accion === 'vaciar-dafo' && $dentro) vaciarDafo();
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

// ---------- Con sesión: sección Análisis DAFO ----------
if (isset($_GET['dafo'])) {
  if (isset($_GET['descargar'])) {
    if (!is_readable(DAFO)) volver('?dafo=1');
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="dafo-networking2026-' . date('Y-m-d') . '.csv"');
    header('Content-Length: ' . filesize(DAFO));
    readfile(DAFO);
    exit;
  }
  pintarDafo();
  exit;
}

// ---------- Con sesión: sección Legado ----------
if (isset($_GET['legado'])) {
  if (isset($_GET['descargar'])) {
    if (!is_readable(LEGADO)) volver('?legado=1');
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="legado-networking2026-' . date('Y-m-d') . '.csv"');
    header('Content-Length: ' . filesize(LEGADO));
    readfile(LEGADO);
    exit;
  }
  pintarLegado();
  exit;
}

// Las solicitudes se identifican por su contenido (ver idsFilas), así que las dos listas se leen en crudo
$solicitudes = parsear(leerTexto(CSV), count(CLAVES));
$idsSolicitudes = idsFilas($solicitudes);
$borradas = parsear(leerTexto(PAPELERA), count(CLAVES_PAPELERA));
$idsBorradas = idsFilas($borradas);

$filas = [];
foreach ($solicitudes as $i => $c) $filas[] = presentar($c, CLAVES) + ['id' => $idsSolicitudes[$i]];
$filas = array_reverse($filas); // más recientes primero
$papelera = [];
foreach ($borradas as $i => $c) $papelera[] = presentar($c, CLAVES_PAPELERA) + ['id' => $idsBorradas[$i]];
$papelera = array_reverse($papelera);

$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

$modalidades = MODALIDADES;
$mesas = [1 => 'El aula como laboratorio de ideas', 2 => 'Proyectos en acción', 3 => 'Radio Atlante conecta', 4 => 'TG Lab'];
$numMesas = fn(array $fila) => array_map('intval', preg_match_all('/Mesa (\d)/', $fila['mesas'], $m) ? $m[1] : []);

$enPapelera = isset($_GET['papelera']);
$editar = null;
if (isset($_GET['editar'])) {
  foreach ($filas as $r) if ($r['id'] === $_GET['editar']) $editar = $r;
}

$fMod = in_array($_GET['modalidad'] ?? '', $modalidades, true) ? $_GET['modalidad'] : '';
$fMesa = (int)($_GET['mesa'] ?? 0);
if (!isset($mesas[$fMesa])) $fMesa = 0;
$vistas = array_values(array_filter($filas, fn($r) =>
  ($fMod === '' || $r['modalidad'] === $fMod) && ($fMesa === 0 || in_array($fMesa, $numMesas($r), true))));

// Excel e impresión usan los mismos filtros que la tabla
$enlaceXlsx = '?' . http_build_query(array_filter(['exportar' => 'xlsx', 'modalidad' => $fMod, 'mesa' => $fMesa ?: ''], fn($v) => $v !== ''));
$partesFiltro = array_filter([$fMod !== '' ? "Modalidad: $fMod" : '', $fMesa ? "Mesa $fMesa" : '']);
$etiquetaFiltro = $partesFiltro ? implode(' · ', $partesFiltro) : 'Todas las solicitudes';
if (($_GET['exportar'] ?? '') === 'xlsx') descargarXlsx($vistas, 'solicitudes-networking2026-' . date('Y-m-d') . '.xlsx', COLUMNAS_SOLICITUDES, 'Solicitudes');

$porModalidad = array_fill_keys($modalidades, 0);
$porMesa = array_fill_keys(array_keys($mesas), 0);
foreach ($filas as $r) {
  if (isset($porModalidad[$r['modalidad']])) $porModalidad[$r['modalidad']]++;
  foreach ($numMesas($r) as $n) if (isset($porMesa[$n])) $porMesa[$n]++;
}

// Los mismos colores que las fichas de modalidad de la web
$claseMod = ['Participante' => 'mod-3', 'Colaboradora' => 'mod-2', 'Impulsora' => 'mod-1', 'Sin decidir' => 'mod-0'];

pintarCabecera($enPapelera ? 'Papelera' : ($editar ? 'Editar solicitud' : 'Solicitudes'), 'panel');
?>
  <?php pintarBarra('solicitudes'); ?>

  <main class="wrap">
    <?php if ($flash): ?>
      <p class="aviso <?= $flash['tipo'] === 'error' ? 'aviso-error' : '' ?>" role="status"><?= e($flash['texto']) ?></p>
    <?php endif; ?>

    <?php if ($editar): ?>
    <section class="editar">
      <p class="etiqueta">Editar solicitud · <?= e($editar['fecha']) ?></p>
      <h1><?= e($editar['empresa']) ?></h1>
      <form class="form-editar" method="post" action="./">
        <input type="hidden" name="accion" value="guardar">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
        <input type="hidden" name="id" value="<?= e($editar['id']) ?>">
        <label>Empresa u organización <input name="empresa" required maxlength="120" value="<?= e($editar['empresa']) ?>"></label>
        <label>Sector <input name="sector" maxlength="80" value="<?= e($editar['sector']) ?>"></label>
        <label>Persona de contacto <input name="persona" required maxlength="100" value="<?= e($editar['persona']) ?>"></label>
        <label>Cargo <input name="cargo" maxlength="80" value="<?= e($editar['cargo']) ?>"></label>
        <label>Correo <input name="correo" type="email" required maxlength="120" value="<?= e($editar['correo']) ?>"></label>
        <label>Teléfono <input name="telefono" maxlength="30" value="<?= e($editar['telefono']) ?>"></label>
        <label>Modalidad
          <select name="modalidad" required>
            <?php foreach ($modalidades as $m): ?>
              <option value="<?= e($m) ?>" <?= $editar['modalidad'] === $m ? 'selected' : '' ?>><?= e($m) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <fieldset>
          <legend>Mesas</legend>
          <?php foreach ($mesas as $n => $titulo): ?>
            <label><input type="checkbox" name="mesas[]" value="<?= $n ?>" <?= in_array($n, $numMesas($editar), true) ? 'checked' : '' ?>> Mesa <?= $n ?> · <?= e($titulo) ?></label>
          <?php endforeach; ?>
        </fieldset>
        <label>Propuesta <textarea name="propuesta" rows="5" maxlength="1000"><?= e($editar['propuesta']) ?></textarea></label>
        <div class="acciones">
          <button class="btn btn-primario" type="submit">Guardar cambios</button>
          <a class="btn btn-borde" href="./">Cancelar</a>
        </div>
      </form>
      <p class="nota">El logo y la fecha de envío no se cambian desde aquí.</p>
    </section>

    <?php elseif ($enPapelera): ?>
    <section class="cabeza">
      <div>
        <p class="etiqueta">Papelera</p>
        <h1><?= count($papelera) ?> <?= count($papelera) === 1 ? 'borrada' : 'borradas' ?></h1>
        <p class="nota">Las solicitudes borradas se guardan aquí hasta que las restaures.</p>
      </div>
      <a class="btn btn-borde" href="./">Volver a solicitudes</a>
    </section>

    <?php if ($papelera): ?>
    <div class="tabla-caja">
      <table class="tabla">
        <thead>
          <tr><th>Fecha</th><th>Empresa</th><th>Contacto</th><th>Propuesta</th><th>Borrada el</th><th>Acciones</th></tr>
        </thead>
        <tbody>
        <?php foreach ($papelera as $r): ?>
          <tr>
            <td data-col="Fecha" class="fecha"><?= e($r['fecha']) ?></td>
            <td data-col="Empresa"><strong><?= e($r['empresa']) ?></strong></td>
            <td data-col="Contacto"><?= e($r['persona']) ?><?php if ($r['correo'] !== ''): ?><span class="sub"><?= e($r['correo']) ?></span><?php endif; ?></td>
            <td data-col="Propuesta" class="propuesta"><?= $r['propuesta'] !== '' ? nl2br(e($r['propuesta'])) : '<span class="sub">—</span>' ?></td>
            <td data-col="Borrada el" class="fecha"><?= e($r['borrada']) ?></td>
            <td data-col="Acciones" class="acciones-fila">
              <form method="post" action="./" class="en-linea">
                <input type="hidden" name="accion" value="restaurar">
                <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
                <input type="hidden" name="id" value="<?= e($r['id']) ?>">
                <button class="btn btn-borde btn-pequeno" type="submit">Restaurar</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <p class="vacio">La papelera está vacía.</p>
    <?php endif; ?>

    <?php else: ?>
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
    <p class="enlace-papelera"><a href="?papelera=1">Ver la papelera (<?= count($papelera) ?>)</a></p>

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
          <tr><th>Fecha</th><th>Empresa</th><th>Contacto</th><th>Propuesta</th><th>Logo</th><th>Acciones</th></tr>
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
            <td data-col="Propuesta" class="propuesta"><?= $r['propuesta'] !== '' ? nl2br(e($r['propuesta'])) : '<span class="sub">—</span>' ?></td>
            <td data-col="Logo" class="logo"><?php if ($r['logo'] !== ''): ?><a href="?logo=<?= e(rawurlencode($r['logo'])) ?>" target="_blank" rel="noopener"><img src="?logo=<?= e(rawurlencode($r['logo'])) ?>" alt="Logo de <?= e($r['empresa']) ?>" loading="lazy"></a><?php else: ?><span class="sub">Sin logo</span><?php endif; ?></td>
            <td data-col="Acciones" class="acciones-fila">
              <a class="btn btn-borde btn-pequeno" href="?editar=<?= e(rawurlencode($r['id'])) ?>">Editar</a>
              <form method="post" action="./" class="en-linea" data-confirmar="<?= e('¿Mover a la papelera la solicitud de ' . $r['empresa'] . '? Podrás restaurarla desde la papelera.') ?>">
                <input type="hidden" name="accion" value="borrar">
                <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
                <input type="hidden" name="id" value="<?= e($r['id']) ?>">
                <button class="btn-peligro btn-pequeno" type="submit">Borrar</button>
              </form>
            </td>
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
    <?php endif; ?>
  </main>
  <script src="panel.js"></script>
</body></html>
<?php

// ---------- Cambios sobre las solicitudes ----------

/** Aplica una acción de los formularios (editar, borrar o restaurar) y vuelve a la lista con un aviso. */
function gestionarSolicitud(string $accion): never {
  $id = (string)($_POST['id'] ?? '');
  $destino = '';
  $error = null;
  $ok = '';

  if (!preg_match('/^[0-9a-f]{64}-\d+$/', $id)) {
    $error = 'La solicitud no es válida.';
  } elseif ($accion === 'guardar') {
    $destino = '?editar=' . rawurlencode($id);
    [$datos, $error] = datosDelFormulario();
    if (!$error) $error = conCerrojo(fn() => editarFila($id, $datos));
    if (!$error) { $ok = 'Solicitud actualizada.'; $destino = ''; }
  } elseif ($accion === 'borrar') {
    $error = conCerrojo(fn() => moverFila(CSV, CABECERA, PAPELERA, CABECERA_PAPELERA, $id,
      fn(array $fila) => [...$fila, date('Y-m-d H:i')]));
    $ok = 'Solicitud movida a la papelera. Puedes restaurarla desde la papelera.';
  } elseif ($accion === 'borrar-legado') {
    $destino = '?legado=1';
    $error = conCerrojo(fn() => moverFila(LEGADO, CABECERA_LEGADO, LEGADO_PAPELERA, CABECERA_LEGADO_PAPELERA, $id,
      fn(array $fila) => [...$fila, date('Y-m-d H:i')]));
    $ok = 'Compromiso borrado. Queda una copia en el servidor (legado-papelera.csv).';
  } else { // restaurar
    $destino = '?papelera=1';
    $error = conCerrojo(fn() => moverFila(PAPELERA, CABECERA_PAPELERA, CSV, CABECERA, $id,
      fn(array $fila) => array_slice($fila, 0, count(CABECERA))));
    $ok = 'Solicitud restaurada.';
  }

  $_SESSION['flash'] = $error ? ['tipo' => 'error', 'texto' => $error] : ['tipo' => 'ok', 'texto' => $ok];
  volver($destino);
}

/** Valida los campos del formulario de edición. Devuelve [datos, error]. */
function datosDelFormulario(): array {
  $texto = function (string $clave, int $max, bool $multilinea = false): string {
    $v = (string)($_POST[$clave] ?? '');
    $v = $multilinea ? preg_replace('/[^\P{C}\n]/u', '', $v) : preg_replace('/\p{C}/u', '', $v);
    return mb_substr(trim((string)$v), 0, $max);
  };
  $datos = [
    'empresa' => $texto('empresa', 120), 'sector' => $texto('sector', 80), 'persona' => $texto('persona', 100),
    'cargo' => $texto('cargo', 80), 'correo' => $texto('correo', 120), 'telefono' => $texto('telefono', 30),
    'modalidad' => $texto('modalidad', 20), 'propuesta' => $texto('propuesta', 1000, true),
  ];
  $mesas = array_values(array_intersect(['1', '2', '3', '4'], array_map('strval', (array)($_POST['mesas'] ?? []))));
  $datos['mesas'] = implode(', ', array_map(fn($m) => "Mesa $m", $mesas));

  if ($datos['empresa'] === '') return [null, 'Escribe el nombre de la empresa.'];
  if ($datos['persona'] === '') return [null, 'Escribe el nombre de la persona de contacto.'];
  if (!filter_var($datos['correo'], FILTER_VALIDATE_EMAIL)) return [null, 'Escribe un correo electrónico válido.'];
  if (!in_array($datos['modalidad'], MODALIDADES, true)) return [null, 'Elige una modalidad.'];
  return [$datos, null];
}

/** Cambia los campos de una solicitud. La fecha y el logo se conservan tal cual. */
function editarFila(string $id, array $datos): ?string {
  $b = bloquearCsv(CSV, CABECERA);
  if (!$b) return 'No se ha podido abrir la lista de solicitudes.';
  $pos = array_search($id, idsFilas($b['filas']), true);
  if ($pos === false) { soltarCsv($b); return 'Esa solicitud ya no existe. Recarga la página.'; }

  $actual = $b['filas'][$pos];
  $b['filas'][$pos] = [
    $actual[0], celda($datos['empresa']), celda($datos['sector']), celda($datos['persona']),
    celda($datos['cargo']), celda($datos['correo']), celda($datos['telefono']), celda($datos['modalidad']),
    celda($datos['mesas']), celda($datos['propuesta']), $actual[10],
  ];
  guardarCsv($b, $b['filas']);
  soltarCsv($b);
  return null;
}

/** Mueve una fila de un CSV a otro (con $transformar para ajustar sus columnas). Primero escribe en destino y luego quita del origen. */
function moverFila(string $desde, array $cabeceraDesde, string $hasta, array $cabeceraHasta, string $id, callable $transformar): ?string {
  $origen = bloquearCsv($desde, $cabeceraDesde);
  if (!$origen) return 'No se ha podido abrir la lista de solicitudes.';
  $destino = bloquearCsv($hasta, $cabeceraHasta);
  if (!$destino) { soltarCsv($origen); return 'No se ha podido abrir la papelera.'; }

  $pos = array_search($id, idsFilas($origen['filas']), true);
  if ($pos === false) { soltarCsv($destino); soltarCsv($origen); return 'Esa solicitud ya no existe. Recarga la página.'; }

  $destino['filas'][] = $transformar($origen['filas'][$pos]);
  guardarCsv($destino, $destino['filas']);
  unset($origen['filas'][$pos]);
  guardarCsv($origen, array_values($origen['filas']));
  soltarCsv($destino);
  soltarCsv($origen);
  return null;
}

/** Bloquea el panel mientras se edita o se mueve una solicitud, para que dos cambios no se pisen. */
function conCerrojo(callable $trabajo): mixed {
  $cerrojo = fopen(CERROJO, 'c');
  flock($cerrojo, LOCK_EX);
  try {
    return $trabajo();
  } finally {
    flock($cerrojo, LOCK_UN);
    fclose($cerrojo);
  }
}

// ---------- CSV ----------

/** Contenido de un archivo compartido con participa.php, leído con bloqueo de lectura. */
function leerTexto(string $ruta): string {
  if (!is_readable($ruta)) return '';
  $f = fopen($ruta, 'r');
  if (!$f) return '';
  flock($f, LOCK_SH);
  $texto = (string)stream_get_contents($f);
  flock($f, LOCK_UN);
  fclose($f);
  return $texto;
}

/** Filas de un CSV sin cabecera ni BOM, cada una con exactamente $columnas campos. */
function parsear(string $texto, int $columnas): array {
  $texto = preg_replace('/^\xEF\xBB\xBF/', '', $texto);
  if (trim($texto) === '') return [];
  $m = fopen('php://memory', 'w+');
  fwrite($m, $texto);
  rewind($m);
  $filas = [];
  $primera = true;
  while (($c = fgetcsv($m, 0, ';', '"', '')) !== false) {
    if ($primera) { $primera = false; continue; }
    if ($c === [null]) continue;
    $filas[] = array_pad(array_slice($c, 0, $columnas), $columnas, '');
  }
  fclose($m);
  return $filas;
}

/**
 * Identificador de cada fila: su contenido y cuántas veces aparece igual antes.
 * Así una solicitud sigue encontrándose aunque se añadan otras, y no se confunde con una idéntica.
 */
function idsFilas(array $filas): array {
  $vistas = [];
  $ids = [];
  foreach ($filas as $i => $c) {
    $base = hash('sha256', json_encode($c, JSON_UNESCAPED_UNICODE));
    $vistas[$base] = ($vistas[$base] ?? -1) + 1;
    $ids[$i] = $base . '-' . $vistas[$base];
  }
  return $ids;
}

/** Texto para mostrar: quita la «'» que participa.php antepone a lo que empieza por = + - @ */
function presentar(array $c, array $claves): array {
  $c = array_map(fn($v) => preg_match("/^'[=+\-@\t\r]/", (string)$v) ? substr((string)$v, 1) : (string)$v, $c);
  return array_combine($claves, $c);
}

/** Evita que una celda se interprete como fórmula al abrir el CSV en una hoja de cálculo (igual que participa.php). */
function celda(string $v): string {
  return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
}

/** Abre un CSV con bloqueo exclusivo para leerlo y reescribirlo. Devuelve null si no se puede. */
function bloquearCsv(string $ruta, array $cabecera): ?array {
  $f = fopen($ruta, 'c+');
  if (!$f) return null;
  if (!flock($f, LOCK_EX)) { fclose($f); return null; }
  $texto = (string)stream_get_contents($f);
  return ['f' => $f, 'ruta' => $ruta, 'texto' => $texto, 'cabecera' => $cabecera, 'filas' => parsear($texto, count($cabecera))];
}

/** Escribe las filas en el CSV bloqueado. Antes guarda una copia del contenido anterior en copias/. */
function guardarCsv(array $bloqueo, array $filas): void {
  if (trim($bloqueo['texto']) !== '') {
    if (!is_dir(COPIAS)) mkdir(COPIAS, 0750, true);
    $copia = COPIAS . '/' . basename($bloqueo['ruta'], '.csv') . '-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.csv';
    file_put_contents($copia, $bloqueo['texto']);
    chmod($copia, 0600);
  }
  $f = $bloqueo['f'];
  ftruncate($f, 0);
  rewind($f);
  fwrite($f, "\xEF\xBB\xBF");
  fputcsv($f, $bloqueo['cabecera'], ';', '"', '');
  foreach ($filas as $c) fputcsv($f, $c, ';', '"', '');
  fflush($f);
}

function soltarCsv(array $bloqueo): void {
  flock($bloqueo['f'], LOCK_UN);
  fclose($bloqueo['f']);
}

/**
 * Descarga las solicitudes como .xlsx. Sin librerías externas: un .xlsx es un zip de XML
 * y PHP trae ZipArchive. Las celdas son texto (inlineStr), así que Excel no ejecuta fórmulas.
 */
function descargarXlsx(array $filas, string $nombre, array $columnas, string $hoja): never {
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
      . '<sheets><sheet name="' . e($hoja) . '" sheetId="1" r:id="rId1"/></sheets></workbook>',
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

// ---------- Análisis DAFO ----------

/** Respuestas del DAFO: [fecha, mesa, F, D, O, A] con los códigos separados por espacios. */
function leerDafo(): array {
  return parsear(leerTexto(DAFO), 2 + count(DAFO_BLOQUES));
}

/** Votos de cada opción y número de respuestas, para una mesa (o todas si $mesa es 0). */
function contarDafo(array $filas, int $mesa): array {
  $votos = [];
  foreach (DAFO_BLOQUES as $letra => $b) $votos[$letra] = array_fill_keys(array_keys($b['opciones']), 0);
  $n = 0;
  foreach ($filas as $c) {
    if ($mesa && (int)$c[1] !== $mesa) continue;
    $n++;
    foreach (array_keys(DAFO_BLOQUES) as $i => $letra) {
      foreach (preg_split('/\s+/', trim((string)$c[2 + $i])) ?: [] as $codigo) {
        if (isset($votos[$letra][$codigo])) $votos[$letra][$codigo]++;
      }
    }
  }
  // Cada bloque, de más a menos votada (a igualdad, en el orden de la lista)
  foreach ($votos as $letra => $v) {
    $orden = array_flip(array_keys($v));
    uksort($v, fn($a, $b) => [$votos[$letra][$b], $orden[$a]] <=> [$votos[$letra][$a], $orden[$b]]);
    $votos[$letra] = $v;
  }
  return [$votos, $n];
}

/** La opción más votada de un bloque (o null si nadie ha votado aún). */
function primeraDafo(array $votos, string $letra): ?string {
  $codigo = array_key_first($votos[$letra]);
  return $votos[$letra][$codigo] > 0 ? DAFO_BLOQUES[$letra]['opciones'][$codigo] : null;
}

/** Matriz 2 × 2: cada opción con su barra y el porcentaje de equipos que la han marcado. */
function pintarMatrizDafo(array $votos, int $n): void { ?>
    <div class="dafo-matriz">
      <?php foreach (DAFO_BLOQUES as $letra => $b): ?>
        <article class="cuadrante q-<?= strtolower($letra) ?>">
          <header>
            <b><?= $letra ?></b>
            <div><h2><?= e($b['titulo']) ?></h2><span><?= e($b['origen']) ?></span></div>
          </header>
          <ol>
            <?php $puesto = 0; foreach ($votos[$letra] as $codigo => $v): $puesto++; $pct = $n ? (int)round($v * 100 / $n) : 0; ?>
              <li class="<?= $v > 0 && $puesto <= 3 ? 'destacada' : '' ?>">
                <span class="op"><?= e($b['opciones'][$codigo]) ?></span>
                <progress max="100" value="<?= $pct ?>" aria-label="<?= $pct ?> %"></progress>
                <span class="pct"><?= $pct ?> %<small><?= $v ?></small></span>
              </li>
            <?php endforeach; ?>
          </ol>
        </article>
      <?php endforeach; ?>
    </div>
<?php }

/** Lectura cruzada lista para exponer: las opciones más votadas, combinadas como en una matriz CAME. */
function pintarLecturaDafo(array $votos, int $n): void {
  if (!$n) return;
  [$f, $d, $o, $a] = [primeraDafo($votos, 'F'), primeraDafo($votos, 'D'), primeraDafo($votos, 'O'), primeraDafo($votos, 'A')];
  $lineas = [
    ['Potenciar', 'q-f', "Apoyarnos en «{$f}» para aprovechar «{$o}»."],
    ['Mantener', 'q-o', "Usar «{$f}» para frenar «{$a}»."],
    ['Corregir', 'q-d', "Mejorar «{$d}» aprovechando «{$o}»."],
    ['Afrontar', 'q-a', "Evitar que «{$d}» se sume a «{$a}»."],
  ];
  ?>
    <section class="dafo-lectura" aria-label="Lectura para exponer">
      <h2>Lectura para exponer</h2>
      <ul>
        <?php foreach ($lineas as [$verbo, $clase, $texto]): ?>
          <li class="<?= $clase ?>"><b><?= $verbo ?></b><?= e($texto) ?></li>
        <?php endforeach; ?>
      </ul>
    </section>
<?php }

/** Lo que cambia con cada respuesta: recuento, filtro por mesa, matriz y lectura. */
function pintarVivoDafo(array $filas, int $mesa, bool $presentar): void {
  [$votos, $n] = contarDafo($filas, $mesa);
  $porMesa = array_fill_keys(array_keys(DAFO_MESAS), 0);
  foreach ($filas as $c) if (isset($porMesa[(int)$c[1]])) $porMesa[(int)$c[1]]++;
  $ambito = $mesa ? 'Mesa ' . $mesa : 'Todas las mesas';
  $respuestas = $n . ' ' . ($n === 1 ? 'respuesta' : 'respuestas');
  if ($presentar): ?>
    <p class="en-directo"><i aria-hidden="true"></i><?= $respuestas ?> · en directo · <?= date('H:i:s') ?></p>
  <?php else: ?>
    <p class="solo-imprimir">Networking 2026 · Análisis DAFO del encuentro · <?= e($ambito) ?> · <?= $respuestas ?> · <?= date('d/m/Y H:i') ?></p>
    <nav class="dafo-mesas" aria-label="Filtrar por mesa">
      <a href="?dafo=1" <?= !$mesa ? 'aria-current="page"' : '' ?>>Todas <b><?= count($filas) ?></b></a>
      <?php foreach (array_keys(DAFO_MESAS) as $m): ?>
        <a class="mesa-<?= dafoColor($m) ?>" href="?dafo=1&amp;mesa=<?= $m ?>" <?= $mesa === $m ? 'aria-current="page"' : '' ?>>Mesa <?= $m ?> <b><?= $porMesa[$m] ?></b></a>
      <?php endforeach; ?>
    </nav>
    <p class="cuenta"><span class="punto-directo" aria-hidden="true"></span><strong><?= $respuestas ?></strong> · en directo, se actualiza sola (última vez a las <?= date('H:i:s') ?>). El porcentaje es la parte de los equipos que ha marcado cada opción.</p>
  <?php endif;
  if ($n) {
    pintarMatrizDafo($votos, $n);
    pintarLecturaDafo($votos, $n);
  } else { ?>
    <p class="vacio"><?= $presentar ? 'Esperando las primeras respuestas de las mesas…' : 'Todavía no hay respuestas' . ($mesa ? ' de esta mesa' : '') . '. Cada mesa tiene su QR: al escanearlo, el equipo marca hasta ' . DAFO_MAX . ' opciones por bloque y la matriz aparece aquí al momento.' ?></p>
  <?php }
}

/** Sección Análisis DAFO: matriz en directo, por mesa o de todo el encuentro, y modo presentación. */
function pintarDafo(): void {
  $filas = leerDafo();
  $mesa = (int)($_GET['mesa'] ?? 0);
  if (!isset(DAFO_MESAS[$mesa])) $mesa = 0;
  $presentar = isset($_GET['presentar']);
  $q = fn(array $extra = []) => '?' . http_build_query(['dafo' => 1] + ($mesa ? ['mesa' => $mesa] : []) + $extra);

  if (($_GET['exportar'] ?? '') === 'xlsx') {
    $columnas = [['Fecha', 'fecha', 20], ['Mesa', 'mesa', 38]];
    foreach (DAFO_BLOQUES as $letra => $b) $columnas[] = [$b['titulo'], $letra, 70];
    $hoja = [];
    foreach (array_reverse($filas) as $c) {
      if ($mesa && (int)$c[1] !== $mesa) continue;
      $r = ['fecha' => $c[0], 'mesa' => 'Mesa ' . $c[1]];
      foreach (array_keys(DAFO_BLOQUES) as $i => $letra) {
        $r[$letra] = implode(' · ', array_map(fn($cod) => DAFO_BLOQUES[$letra]['opciones'][$cod] ?? $cod, preg_split('/\s+/', trim((string)$c[2 + $i])) ?: []));
      }
      $hoja[] = $r;
    }
    descargarXlsx($hoja, 'dafo-networking2026' . ($mesa ? '-mesa' . $mesa : '') . '-' . date('Y-m-d') . '.xlsx', $columnas, 'DAFO');
  }

  // Solo la parte que cambia: la pide panel.js cada pocos segundos, sin recargar la página
  // (así la pantalla completa no se pierde al actualizar)
  if (isset($_GET['fragmento'])) {
    header('X-Dafo-Vivo: 1');
    pintarVivoDafo($filas, $mesa, $presentar);
    exit;
  }
  $vivo = $q(['fragmento' => 1] + ($presentar ? ['presentar' => 1] : []));
  $ambito = $mesa ? 'Mesa ' . $mesa : 'Todas las mesas';
  $flash = $_SESSION['flash'] ?? null;
  unset($_SESSION['flash']);

  // ----- Modo presentación: pantalla completa, letra grande, se actualiza cada 5 s -----
  if ($presentar) {
    pintarCabecera('Análisis DAFO', 'panel presentar');
    ?>
  <main class="dafo-pantalla">
    <header class="dafo-pantalla-cabeza">
      <div>
        <p class="etiqueta">Networking 2026 · Análisis DAFO del encuentro</p>
        <h1><?= e($ambito) ?></h1>
      </div>
      <nav class="dafo-pantalla-nav" aria-label="Mesas">
        <a href="?dafo=1&amp;presentar=1" <?= !$mesa ? 'aria-current="page"' : '' ?>>Todas</a>
        <?php foreach (array_keys(DAFO_MESAS) as $m): ?>
          <a href="?dafo=1&amp;mesa=<?= $m ?>&amp;presentar=1" <?= $mesa === $m ? 'aria-current="page"' : '' ?>>Mesa <?= $m ?></a>
        <?php endforeach; ?>
        <button type="button" data-pantalla>Pantalla completa</button>
        <a href="<?= e($q()) ?>">Salir</a>
      </nav>
    </header>
    <div class="dafo-vivo" data-vivo="<?= e($vivo) ?>" data-cada="5"><?php pintarVivoDafo($filas, $mesa, true); ?></div>
  </main>
  <script src="panel.js"></script>
</body></html>
    <?php
    return;
  }

  // ----- Vista normal del panel (la matriz se actualiza sola cada 10 s) -----
  pintarCabecera('Análisis DAFO', 'panel');
  pintarBarra('dafo');
  ?>
  <main class="wrap">
    <?php if ($flash): ?>
      <p class="aviso <?= $flash['tipo'] === 'error' ? 'aviso-error' : '' ?>" role="status"><?= e($flash['texto']) ?></p>
    <?php endif; ?>
    <section class="cabeza">
      <div>
        <p class="etiqueta">Análisis DAFO del encuentro · <?= e($ambito) ?></p>
        <h1>Análisis DAFO</h1>
      </div>
      <div class="acciones">
        <a class="btn btn-primario" href="<?= e($q(['presentar' => 1])) ?>">Presentar en pantalla</a>
        <a class="btn btn-borde" href="../dafo/dafo-qr-mesas.pdf" target="_blank" rel="noopener">Todos los QR (PDF)</a>
        <?php if ($filas): ?>
          <button type="button" class="btn btn-borde" data-imprimir>Imprimir / PDF</button>
          <a class="btn btn-borde" href="<?= e($q(['exportar' => 'xlsx'])) ?>" download>Excel</a>
          <a class="btn btn-borde" href="?dafo=1&amp;descargar=1" download>CSV</a>
        <?php endif; ?>
      </div>
    </section>

    <div class="dafo-vivo" data-vivo="<?= e($vivo) ?>" data-cada="10"><?php pintarVivoDafo($filas, $mesa, false); ?></div>

    <section class="dafo-qr" aria-label="Código QR de cada mesa">
      <h2>QR de cada mesa</h2>
      <div class="dafo-qr-lista">
        <?php foreach (array_keys(DAFO_MESAS) as $m): ?>
          <div class="dafo-qr-mesa mesa-<?= dafoColor($m) ?>">
            <img src="../img/qr-dafo-<?= $m ?>.svg" alt="QR de la mesa <?= $m ?>" width="120" height="120">
            <span><b>Mesa <?= $m ?></b>
              <a href="../dafo/carteles/dafo-mesa-<?= sprintf('%02d', $m) ?>.pdf" target="_blank" rel="noopener">PDF de la mesa</a>
              <a href="../dafo/?mesa=<?= $m ?>" target="_blank" rel="noopener">Formulario</a>
            </span>
          </div>
        <?php endforeach; ?>
      </div>
    </section>

    <?php if ($filas): ?>
      <form method="post" action="./" class="dafo-vaciar" data-confirmar="¿Vaciar todas las respuestas del DAFO? Se guarda una copia en el servidor, pero la matriz empezará de cero.">
        <input type="hidden" name="accion" value="vaciar-dafo">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
        <button class="btn-peligro" type="submit">Vaciar respuestas (por ejemplo, tras un ensayo)</button>
      </form>
    <?php endif; ?>
  </main>
  <script src="panel.js"></script>
</body></html>
  <?php
}

/** Deja el DAFO a cero. Antes guarda una copia en copias/. Bloquea el archivo igual que dafo/guardar.php. */
function vaciarDafo(): never {
  $error = conCerrojo(function () {
    if (!is_file(DAFO)) return null;
    $f = fopen(DAFO, 'c+');
    if (!$f || !flock($f, LOCK_EX)) return 'No se ha podido abrir el archivo del DAFO.';
    $texto = (string)stream_get_contents($f);
    if (trim($texto) !== '') {
      if (!is_dir(COPIAS)) mkdir(COPIAS, 0750, true);
      $copia = COPIAS . '/dafo-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.csv';
      file_put_contents($copia, $texto);
      chmod($copia, 0600);
    }
    ftruncate($f, 0);
    flock($f, LOCK_UN);
    fclose($f);
    return null;
  });
  $_SESSION['flash'] = $error ? ['tipo' => 'error', 'texto' => $error] : ['tipo' => 'ok', 'texto' => 'Respuestas del DAFO vaciadas. Queda una copia en el servidor (carpeta copias).'];
  volver('?dafo=1');
}

/** Barra superior con las secciones del panel y el botón de salir. */
function pintarBarra(string $actual): void { ?>
  <header class="barra">
    <a class="marca" href="./"><img src="../img/isotipo.svg" alt="" width="30" height="30"><span>Networking <b>2026</b></span></a>
    <nav class="barra-nav" aria-label="Secciones del panel">
      <a href="./" <?= $actual === 'solicitudes' ? 'aria-current="page"' : '' ?>>Solicitudes</a>
      <a href="?legado=1" <?= $actual === 'legado' ? 'aria-current="page"' : '' ?>>Legado</a>
      <a href="?dafo=1" <?= $actual === 'dafo' ? 'aria-current="page"' : '' ?>><span class="largo">Análisis&nbsp;</span>DAFO</a>
    </nav>
    <form method="post" action="./" class="salir">
      <input type="hidden" name="accion" value="salir">
      <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
      <button type="submit" class="btn-salir">Salir</button>
    </form>
  </header>
<?php }

/** Sección Legado: los compromisos «Del encuentro a la acción» que llegan desde legado/. */
function pintarLegado(): void {
  $crudo = parsear(leerTexto(LEGADO), count(CLAVES_LEGADO));
  $ids = idsFilas($crudo);
  $filas = [];
  foreach ($crudo as $i => $c) $filas[] = presentar($c, CLAVES_LEGADO) + ['id' => $ids[$i]];
  $filas = array_reverse($filas); // más recientes primero
  if (($_GET['exportar'] ?? '') === 'xlsx') descargarXlsx($filas, 'legado-networking2026-' . date('Y-m-d') . '.xlsx', COLUMNAS_LEGADO, 'Legado');

  $flash = $_SESSION['flash'] ?? null;
  unset($_SESSION['flash']);
  $empresas = count(array_unique(array_map(fn($r) => mb_strtolower(trim($r['empresa'])), $filas)));

  pintarCabecera('Legado', 'panel');
  pintarBarra('legado');
  ?>
  <main class="wrap">
    <?php if ($flash): ?>
      <p class="aviso <?= $flash['tipo'] === 'error' ? 'aviso-error' : '' ?>" role="status"><?= e($flash['texto']) ?></p>
    <?php endif; ?>
    <p class="solo-imprimir">Networking 2026 · El legado · Del encuentro a la acción · <?= date('d/m/Y') ?></p>
    <section class="cabeza">
      <div>
        <p class="etiqueta">El legado · Del encuentro a la acción</p>
        <h1><?= count($filas) ?> <?= count($filas) === 1 ? 'compromiso' : 'compromisos' ?></h1>
      </div>
      <div class="acciones">
        <a class="btn btn-borde" href="../legado/legado-qr.pdf" target="_blank" rel="noopener">Cartel con QR</a>
        <a class="btn btn-borde" href="../legado/" target="_blank" rel="noopener">Abrir el formulario</a>
        <?php if ($filas): ?>
          <button type="button" class="btn btn-borde" data-imprimir>Imprimir / PDF</button>
          <a class="btn btn-borde" href="?legado=1&amp;exportar=xlsx" download>Descargar Excel</a>
          <a class="btn btn-primario" href="?legado=1&amp;descargar=1" download>Descargar CSV</a>
        <?php endif; ?>
      </div>
    </section>

    <?php if ($filas): ?>
    <section class="resumen resumen-legado" aria-label="Resumen">
      <div class="dato mesa-1"><b><?= count($filas) ?></b><span>Compromisos</span></div>
      <div class="dato mesa-2"><b><?= $empresas ?></b><span><?= $empresas === 1 ? 'Empresa' : 'Empresas' ?></span></div>
    </section>
    <p class="cuenta" role="status">Los más recientes, primero.</p>

    <div class="tabla-caja">
      <table class="tabla tabla-legado">
        <thead>
          <tr><th>Fecha</th><th>Empresa</th><th>Contacto</th><th>Necesidad compartida</th><th>Acción en 30 días</th><th>Contactos</th><th>Acciones</th></tr>
        </thead>
        <tbody>
        <?php foreach ($filas as $r): $tel = preg_replace('/[^0-9+]/', '', $r['telefono']); ?>
          <tr>
            <td data-col="Fecha" class="fecha"><?= e($r['fecha']) ?></td>
            <td data-col="Empresa"><strong><?= e($r['empresa']) ?></strong><?php if ($r['sector'] !== ''): ?><span class="sub"><?= e($r['sector']) ?></span><?php endif; ?></td>
            <td data-col="Contacto">
              <?= e($r['persona']) ?><?php if ($r['cargo'] !== ''): ?><span class="sub"><?= e($r['cargo']) ?></span><?php endif; ?>
              <?php if ($r['correo'] !== ''): ?><a class="sub" href="mailto:<?= e(rawurlencode($r['correo'])) ?>"><?= e($r['correo']) ?></a><?php endif; ?>
              <?php if ($r['telefono'] !== ''): ?><a class="sub" href="tel:<?= e($tel) ?>"><?= e($r['telefono']) ?></a><?php endif; ?>
            </td>
            <td data-col="Necesidad compartida" class="propuesta"><?= nl2br(e($r['necesidad'])) ?></td>
            <td data-col="Acción en 30 días" class="propuesta"><?= nl2br(e($r['accion'])) ?></td>
            <td data-col="Contactos" class="contactos">
              <span class="sub">Por la empresa</span><?= e($r['contacto_empresa']) ?>
              <span class="sub">Por la otra parte</span><?= e($r['contacto_otra']) ?>
            </td>
            <td data-col="Acciones" class="acciones-fila">
              <form method="post" action="./" class="en-linea" data-confirmar="<?= e('¿Borrar el compromiso de ' . $r['empresa'] . '? Quedará una copia en el servidor.') ?>">
                <input type="hidden" name="accion" value="borrar-legado">
                <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
                <input type="hidden" name="id" value="<?= e($r['id']) ?>">
                <button class="btn-peligro btn-pequeno" type="submit">Borrar</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <p class="vacio">Todavía no hay ningún compromiso. Aparecerán aquí en cuanto un equipo rellene el formulario del legado (en la web, sección «Legado», o con el QR del cartel).</p>
    <?php endif; ?>
  </main>
  <script src="panel.js"></script>
</body></html>
<?php
}

function pintarCabecera(string $titulo, string $clase, int $recarga = 0): void { ?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= e($titulo) ?> — Networking 2026</title>
  <?php if ($recarga > 0): ?><meta http-equiv="refresh" content="<?= $recarga ?>"><?php endif; ?>
  <meta name="theme-color" content="#14213d">
  <link rel="icon" href="../img/isotipo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="panel.css?v=20261110d">
</head>
<body class="<?= e($clase) ?>">
<?php }
