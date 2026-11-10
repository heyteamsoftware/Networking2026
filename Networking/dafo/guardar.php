<?php
// Networking 2026 — recibe el DAFO de una mesa y lo guarda en un CSV privado, fuera de la web.
// Solo se guardan la fecha, la mesa y los códigos de las opciones (F1, D3…): ningún dato personal.
// El panel (sección Análisis DAFO) lo lee y monta la matriz al momento.

declare(strict_types=1);
require __DIR__ . '/opciones.php';

const DATOS = '/var/www/networking_data';
const CSV = DATOS . '/dafo.csv';
const LIMITES = DATOS . '/limites-dafo.json';
// Todas las mesas envían a la vez desde la misma wifi: límite holgado por ráfagas
const RAFAGA = 60;          // envíos como máximo…
const VENTANA = 10 * 60;    // …en 10 minutos desde la misma conexión
const ESPERA = 2;           // y al menos 2 s entre dos envíos

$quiereJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
$mesa = (int)($_POST['mesa'] ?? 0);

function responder(bool $ok, string $error = '', int $codigo = 200): never {
  global $quiereJson, $mesa;
  if ($quiereJson) {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
  } else {
    // Sin JavaScript: volvemos al formulario de la mesa
    $q = isset(DAFO_MESAS[$mesa]) ? ['mesa' => $mesa] : [];
    $q[$ok ? 'enviado' : 'error'] = 1;
    header('Location: ./?' . http_build_query($q), true, 303);
  }
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Location: ./', true, 303);
  exit;
}

// Campo trampa: si viene relleno, es un envío automático. Fingimos que todo ha ido bien.
if (trim((string)($_POST['web'] ?? '')) !== '') responder(true);

if (!isset(DAFO_MESAS[$mesa])) responder(false, 'Elige en qué mesa estáis.', 422);

// Cada bloque: entre 1 y DAFO_MAX códigos válidos y sin repetir
$respuestas = [];
foreach (DAFO_BLOQUES as $letra => $b) {
  $marcadas = array_values(array_unique(array_map('strval', (array)($_POST[$letra] ?? []))));
  $validas = array_values(array_intersect(array_keys($b['opciones']), $marcadas));
  if (!$validas || count($validas) !== count($marcadas) || count($validas) > DAFO_MAX) {
    responder(false, 'Marca entre 1 y ' . DAFO_MAX . ' opciones en ' . mb_strtolower($b['titulo']) . '.', 422);
  }
  $respuestas[] = implode(' ', $validas);
}

if (!is_dir(DATOS) || !is_writable(DATOS)) responder(false, 'No hemos podido guardar las respuestas. Inténtalo más tarde.', 500);

// Límite de envíos: guardamos solo una huella de la conexión, nunca la IP
$huella = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|networking2026-dafo');
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
    responder(false, 'Estamos recibiendo muchas respuestas a la vez. Espera unos segundos y vuelve a enviarlo.', 429);
  }
  $mias[] = $ahora;
  $lim[$huella] = $mias;
  ftruncate($fl, 0); rewind($fl); fwrite($fl, json_encode($lim));
  flock($fl, LOCK_UN); fclose($fl);
}

// Se abre en modo «c+» y con bloqueo: así la cabecera se escribe una sola vez aunque lleguen dos envíos a la vez
$f = fopen(CSV, 'c+');
if (!$f || !flock($f, LOCK_EX)) responder(false, 'No hemos podido guardar las respuestas. Inténtalo más tarde.', 500);
fseek($f, 0, SEEK_END);
if (ftell($f) === 0) {
  fwrite($f, "\xEF\xBB\xBF"); // BOM para que Excel lea bien los acentos
  fputcsv($f, ['Fecha', 'Mesa', ...array_column(DAFO_BLOQUES, 'titulo')], ';', '"', '');
}
fputcsv($f, [date('Y-m-d H:i:s'), (string)$mesa, ...$respuestas], ';', '"', '');
fflush($f);
flock($f, LOCK_UN);
fclose($f);

responder(true);
