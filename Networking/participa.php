<?php
// Networking 2026 — recibe el formulario «Quiero participar como empresa».
// Guarda cada solicitud en un CSV privado, fuera de la carpeta pública de la web,
// que se abre directamente con Excel o LibreOffice (separador «;», UTF-8).

declare(strict_types=1);

ini_set('memory_limit', '768M'); // abrir logos grandes necesita memoria

const DATOS = '/var/www/networking_data';
const CSV = DATOS . '/solicitudes.csv';
const LIMITES = DATOS . '/limites.json';
const LOGOS = DATOS . '/logos'; // logos de empresa: privados, fuera de la web
const LOGO_MAX = 100 * 1024 * 1024; // 100 MB (el navegador ya lo reduce antes de enviarlo)
const LOGO_W = 600, LOGO_H = 300;     // todos los logos se guardan en un lienzo de este tamaño
const ESPERA = 30; // segundos mínimos entre dos envíos desde la misma conexión
// Inscripciones cerradas el 11/11/2026 por una situación sobrevenida. Para reabrirlas, poner true
// (y volver a mostrar el formulario en index.html).
const INSCRIPCIONES_ABIERTAS = false;

$quiereJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function responder(bool $ok, string $error = '', int $codigo = 200): never {
  global $quiereJson;
  if ($quiereJson) {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
  } else {
    // Sin JavaScript: volvemos a la web, a la sección del formulario
    header('Location: ./' . ($ok ? '?enviado=1' : '?error=1') . '#participa', true, 303);
  }
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Location: ./#participa', true, 303);
  exit;
}

// Inscripciones cerradas: no se guarda nada, llegue como llegue el envío
if (!INSCRIPCIONES_ABIERTAS) responder(false, 'Se cancelan las inscripciones por situación sobrevenida.', 403);

// Si el envío supera el máximo, PHP descarta todos los campos (llegarían vacíos): avisamos del motivo real
if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
  responder(false, 'El logo pesa demasiado: el máximo es 100 MB. Prueba con una versión más ligera.', 413);
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
$modalidad = limpiar('modalidad', 20);
$propuesta = limpiar('propuesta', 1000, true);
$acepto    = ($_POST['acepto'] ?? '') === 'si';
$autorizaLogo = ($_POST['autoriza_logo'] ?? '') === 'si';

$mesas = array_values(array_intersect(['1', '2', '3', '4'], array_map('strval', (array)($_POST['mesas'] ?? []))));
$modalidades = ['participante' => 'Participante', 'colaboradora' => 'Colaboradora', 'impulsora' => 'Impulsora', 'sin-decidir' => 'Sin decidir'];

if ($empresa === '') responder(false, 'Escribe el nombre de tu empresa u organización.', 422);
if ($persona === '') responder(false, 'Escribe el nombre de la persona de contacto.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responder(false, 'Escribe un correo electrónico válido para poder contactarte.', 422);
if (!isset($modalidades[$modalidad])) responder(false, 'Elige cómo quieres participar.', 422);
if (!$acepto) responder(false, 'Para enviar la solicitud necesitamos que aceptes el uso de tus datos para contactarte.', 422);

if (!is_dir(DATOS) || !is_writable(DATOS)) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);

// Todos los logos se guardan igual: centrados en un lienzo transparente de LOGO_W × LOGO_H,
// con un pequeño margen y sin deformarlos (así se ven homogéneos en el panel y en la web)
function reducirLogo($imagen) {
  $w = imagesx($imagen);
  $h = imagesy($imagen);
  $margen = 20;
  $k = min((LOGO_W - 2 * $margen) / $w, (LOGO_H - 2 * $margen) / $h);
  $nw = max(1, (int)round($w * $k));
  $nh = max(1, (int)round($h * $k));
  $lienzo = imagecreatetruecolor(LOGO_W, LOGO_H);
  imagealphablending($lienzo, false);
  imagesavealpha($lienzo, true);
  imagefill($lienzo, 0, 0, imagecolorallocatealpha($lienzo, 0, 0, 0, 127));
  imagealphablending($lienzo, true);
  imagecopyresampled($lienzo, $imagen, (int)((LOGO_W - $nw) / 2), (int)((LOGO_H - $nh) / 2), 0, 0, $nw, $nh, $w, $h);
  imagealphablending($lienzo, false);
  imagedestroy($imagen);
  return $lienzo;
}

// Logo opcional. Se valida y se vuelve a codificar como PNG (así no viaja nada que no sea imagen),
// y se guarda con un nombre aleatorio fuera de la web. Solo se guarda si la empresa autoriza su uso.
// Primero se valida y se prepara (sin escribir nada): así un logo que no vale no cuenta como envío.
function prepararLogo(bool $autoriza) {
  $f = $_FILES['logo'] ?? null;
  if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
  $error = 'El logo debe ser una imagen PNG, JPG o WEBP de hasta 100 MB.';
  if (($f['error'] ?? 1) !== UPLOAD_ERR_OK || $f['size'] > LOGO_MAX) responder(false, $error, 422);
  if (!$autoriza) responder(false, 'Para usar tu logo en la web necesitamos que autorices su publicación.', 422);
  $tipo = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
  $imagen = match ($tipo) {
    'image/png' => @imagecreatefrompng($f['tmp_name']),
    'image/jpeg' => @imagecreatefromjpeg($f['tmp_name']),
    'image/webp' => @imagecreatefromwebp($f['tmp_name']),
    default => false,
  };
  if (!$imagen) responder(false, $error, 422);
  return reducirLogo($imagen);
}

// Después, ya superado el límite de envíos, se escribe en disco
function guardarLogo($imagen): string {
  if (!$imagen) return '';
  if (!is_dir(LOGOS) && !mkdir(LOGOS, 0750, true)) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);
  $nombre = date('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.png';
  imagesavealpha($imagen, true);
  $ok = imagepng($imagen, LOGOS . '/' . $nombre);
  imagedestroy($imagen);
  if (!$ok) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);
  return $nombre;
}

$imagenLogo = prepararLogo($autorizaLogo);

// Límite de envíos: guardamos solo una huella de la conexión, nunca la IP
$huella = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|networking2026');
$ahora = time();
$fl = fopen(LIMITES, 'c+');
if ($fl && flock($fl, LOCK_EX)) {
  $lim = json_decode((string)stream_get_contents($fl), true) ?: [];
  $lim = array_filter($lim, fn($t) => $ahora - (int)$t < 3600);
  if (isset($lim[$huella]) && $ahora - (int)$lim[$huella] < ESPERA) {
    flock($fl, LOCK_UN); fclose($fl);
    responder(false, 'Acabamos de recibir una solicitud desde aquí. Espera unos segundos antes de enviar otra.', 429);
  }
  $lim[$huella] = $ahora;
  ftruncate($fl, 0); rewind($fl); fwrite($fl, json_encode($lim));
  flock($fl, LOCK_UN); fclose($fl);
}

// El logo se guarda después del límite de envíos: así un envío rechazado no deja un logo huérfano
$logo = guardarLogo($imagenLogo);

// Evita que una celda se interprete como fórmula al abrir el CSV en una hoja de cálculo
function celda(string $v): string {
  return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
}

$fila = array_map('celda', [
  date('Y-m-d H:i'),
  $empresa, $sector, $persona, $cargo, $email, $telefono,
  $modalidades[$modalidad],
  implode(', ', array_map(fn($m) => 'Mesa ' . $m, $mesas)),
  $propuesta,
  $logo,
]);

$nuevo = !file_exists(CSV);
$f = fopen(CSV, 'a');
if (!$f || !flock($f, LOCK_EX)) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);
if ($nuevo) {
  fwrite($f, "\xEF\xBB\xBF"); // BOM para que Excel lea bien los acentos
  fputcsv($f, ['Fecha', 'Empresa', 'Sector', 'Persona de contacto', 'Cargo', 'Correo', 'Teléfono', 'Modalidad', 'Mesas', 'Propuesta', 'Logo (archivo privado)'], ';', '"', '');
}
fputcsv($f, $fila, ';', '"', '');
fflush($f);
flock($f, LOCK_UN);
fclose($f);

responder(true);
