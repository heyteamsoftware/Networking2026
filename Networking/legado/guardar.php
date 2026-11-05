<?php
// Networking 2026 — recibe el formulario «El legado · Del encuentro a la acción».
// Guarda cada compromiso en un CSV privado, fuera de la carpeta pública de la web
// (separador «;», UTF-8), que el equipo del centro ve en el panel, sección Legado.

declare(strict_types=1);

const DATOS = '/var/www/networking_data';
const CSV = DATOS . '/legado.csv';
const LIMITES = DATOS . '/limites-legado.json';
// El día del encuentro muchos equipos envían a la vez desde la misma wifi:
// el límite es por ráfagas, no un envío cada 30 s como en «Quiero participar».
const RAFAGA = 20;          // envíos como máximo…
const VENTANA = 10 * 60;    // …en 10 minutos desde la misma conexión
const ESPERA = 3;           // y al menos 3 s entre dos envíos
const CABECERA = ['Fecha', 'Empresa', 'Sector', 'Persona de contacto', 'Cargo', 'Correo', 'Teléfono',
  'Necesidad o interés compartido', 'Acción en los próximos 30 días', 'Contacto por la empresa',
  'Contacto por la otra parte', 'Fecha de revisión'];

$quiereJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function responder(bool $ok, string $error = '', int $codigo = 200): never {
  global $quiereJson;
  if ($quiereJson) {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
  } else {
    // Sin JavaScript: volvemos a la página del legado
    header('Location: ./' . ($ok ? '?enviado=1' : '?error=1') . '#formLegado', true, 303);
  }
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Location: ./', true, 303);
  exit;
}

// Campo trampa: si viene relleno, es un envío automático. Fingimos que todo ha ido bien.
if (trim((string)($_POST['web'] ?? '')) !== '') responder(true);

// Limpia un texto: sin caracteres de control, recortado y con longitud máxima
function limpiar(string $clave, int $max, bool $multilinea = false): string {
  $v = (string)($_POST[$clave] ?? '');
  if (!mb_check_encoding($v, 'UTF-8')) $v = mb_convert_encoding($v, 'UTF-8', 'Windows-1252');
  $v = $multilinea ? preg_replace('/[^\P{C}\n]/u', '', $v) : preg_replace('/\p{C}/u', '', $v);
  $v = trim((string)$v);
  return mb_substr($v, 0, $max);
}

$empresa   = limpiar('empresa', 120);
$sector    = limpiar('sector', 80);
$persona   = limpiar('persona', 100);
$cargo     = limpiar('cargo', 80);
$email     = limpiar('email', 120);
$telefono  = limpiar('telefono', 30);
$necesidad = limpiar('necesidad', 800, true);
$accion    = limpiar('accion', 800, true);
$contactoEmpresa = limpiar('contacto_empresa', 120);
$contactoOtra    = limpiar('contacto_otra', 160);
$revision  = limpiar('revision', 10);
$acepto    = ($_POST['acepto'] ?? '') === 'si';

// La fecha llega como AAAA-MM-DD (campo de fecha del navegador) y debe ser un día real y razonable
$fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $revision);
$fechaOk = $fecha && $fecha->format('Y-m-d') === $revision && $revision >= '2026-11-01' && $revision <= '2028-12-31';

if ($empresa === '') responder(false, 'Escribe el nombre de la empresa u organización.', 422);
if ($persona === '') responder(false, 'Escribe el nombre de la persona de contacto.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responder(false, 'Escribe un correo electrónico válido para poder hacer el seguimiento.', 422);
if ($necesidad === '') responder(false, 'Cuéntanos la necesidad o el interés que compartís.', 422);
if ($accion === '') responder(false, 'Escribe una acción que podáis empezar en los próximos 30 días.', 422);
if ($contactoEmpresa === '' || $contactoOtra === '') responder(false, 'Indica una persona de contacto por cada parte.', 422);
if (!$fechaOk) responder(false, 'Elige una fecha válida para revisar los avances.', 422);
if (!$acepto) responder(false, 'Para registrar el legado necesitamos que aceptes el uso de estos datos para el seguimiento.', 422);

if (!is_dir(DATOS) || !is_writable(DATOS)) responder(false, 'No hemos podido guardar el legado. Inténtalo más tarde.', 500);

// Límite de envíos: guardamos solo una huella de la conexión, nunca la IP
$huella = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|networking2026-legado');
$ahora = time();
$fl = fopen(LIMITES, 'c+');
if ($fl && flock($fl, LOCK_EX)) {
  $lim = json_decode((string)stream_get_contents($fl), true) ?: [];
  foreach ($lim as $h => $marcas) {
    $lim[$h] = array_values(array_filter((array)$marcas, fn($t) => $ahora - (int)$t < VENTANA));
    if (!$lim[$h]) unset($lim[$h]);
  }
  $mias = $lim[$huella] ?? [];
  if (count($mias) >= RAFAGA || ($mias && $ahora - (int)end($mias) < ESPERA)) {
    flock($fl, LOCK_UN); fclose($fl);
    responder(false, 'Estamos recibiendo muchos envíos desde aquí. Espera unos segundos y vuelve a intentarlo.', 429);
  }
  $mias[] = $ahora;
  $lim[$huella] = $mias;
  ftruncate($fl, 0); rewind($fl); fwrite($fl, json_encode($lim));
  flock($fl, LOCK_UN); fclose($fl);
}

// Evita que una celda se interprete como fórmula al abrir el CSV en una hoja de cálculo
function celda(string $v): string {
  return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
}

$fila = array_map('celda', [
  date('Y-m-d H:i'),
  $empresa, $sector, $persona, $cargo, $email, $telefono,
  $necesidad, $accion, $contactoEmpresa, $contactoOtra, $revision,
]);

$nuevo = !file_exists(CSV);
$f = fopen(CSV, 'a');
if (!$f || !flock($f, LOCK_EX)) responder(false, 'No hemos podido guardar el legado. Inténtalo más tarde.', 500);
if ($nuevo) {
  fwrite($f, "\xEF\xBB\xBF"); // BOM para que Excel lea bien los acentos
  fputcsv($f, CABECERA, ';', '"', '');
}
fputcsv($f, $fila, ';', '"', '');
fflush($f);
flock($f, LOCK_UN);
fclose($f);

responder(true);
