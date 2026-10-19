<?php
// Networking 2026 — recibe el formulario «Quiero participar como empresa».
// Guarda cada solicitud en un CSV privado, fuera de la carpeta pública de la web,
// que se abre directamente con Excel o LibreOffice (separador «;», UTF-8).

declare(strict_types=1);

const DATOS = '/var/www/networking_data';
const CSV = DATOS . '/solicitudes.csv';
const LIMITES = DATOS . '/limites.json';
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

$mesas = array_values(array_intersect(['1', '2', '3', '4'], array_map('strval', (array)($_POST['mesas'] ?? []))));
$modalidades = ['participante' => 'Participante', 'colaboradora' => 'Colaboradora', 'impulsora' => 'Impulsora', 'sin-decidir' => 'Sin decidir'];

if ($empresa === '') responder(false, 'Escribe el nombre de tu empresa u organización.', 422);
if ($persona === '') responder(false, 'Escribe el nombre de la persona de contacto.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responder(false, 'Escribe un correo electrónico válido para poder contactarte.', 422);
if (!isset($modalidades[$modalidad])) responder(false, 'Elige cómo quieres participar.', 422);
if (!$acepto) responder(false, 'Para enviar la solicitud necesitamos que aceptes el uso de tus datos para contactarte.', 422);

if (!is_dir(DATOS) || !is_writable(DATOS)) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);

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
]);

$nuevo = !file_exists(CSV);
$f = fopen(CSV, 'a');
if (!$f || !flock($f, LOCK_EX)) responder(false, 'No hemos podido guardar la solicitud. Inténtalo más tarde.', 500);
if ($nuevo) {
  fwrite($f, "\xEF\xBB\xBF"); // BOM para que Excel lea bien los acentos
  fputcsv($f, ['Fecha', 'Empresa', 'Sector', 'Persona de contacto', 'Cargo', 'Correo', 'Teléfono', 'Modalidad', 'Mesas', 'Propuesta'], ';', '"', '');
}
fputcsv($f, $fila, ';', '"', '');
fflush($f);
flock($f, LOCK_UN);
fclose($f);

responder(true);
