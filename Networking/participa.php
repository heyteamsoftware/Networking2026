<?php
// Networking 2026 — recibe el formulario «Quiero participar como empresa».
// Guarda cada solicitud en un CSV privado, fuera de la carpeta pública de la web,
// que se abre directamente con Excel o LibreOffice (separador «;», UTF-8).

declare(strict_types=1);

const DATOS = '/var/www/networking_data';
const CSV = DATOS . '/solicitudes.csv';
const LIMITES = DATOS . '/limites.json';
const LOGOS = DATOS . '/logos'; // logos de empresa: privados, fuera de la web
const LOGO_MAX = 2 * 1024 * 1024; // 2 MB
const ESPERA = 30; // segundos mínimos entre dos envíos desde la misma conexión

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

// Campo trampa: si viene relleno, es un envío automático. Fingimos que todo ha ido bien.
if (trim((string)($_POST['web'] ?? '')) !== '') responder(true);

// Limpia un texto: sin caracteres de control, recortado y con longitud máxima
function limpiar(string $clave, int $max, bool $multilinea = false): string {
  $v = (string)($_POST[$clave] ?? '');
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

// Logo opcional. Se valida y se vuelve a codificar como PNG (así no viaja nada que no sea imagen),
// y se guarda con un nombre aleatorio fuera de la web. Solo se guarda si la empresa autoriza su uso.
function guardarLogo(bool $autoriza): string {
  $f = $_FILES['logo'] ?? null;
  if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return '';
  $error = 'El logo debe ser una imagen PNG, JPG o WEBP de menos de 2 MB.';
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
  if (!is_dir(LOGOS) && !mkdir(LOGOS, 0750, true)) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);
  $nombre = date('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.png';
  imagesavealpha($imagen, true);
  $ok = imagepng($imagen, LOGOS . '/' . $nombre);
  imagedestroy($imagen);
  if (!$ok) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);
  return $nombre;
}
$logo = guardarLogo($autorizaLogo);

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
