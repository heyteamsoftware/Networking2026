<?php
// Networking 2026 — crea o cambia la contraseña del panel de solicitudes.
// Solo funciona desde la consola del servidor (la web lo bloquea en .htaccess):
//   sudo -u www-data php /var/www/html/Networking/panel/cambiar-clave.php
// Guarda únicamente el hash de la contraseña en /var/www/networking_data/panel-clave.txt.

declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$datos = getenv('NETWORKING_DATA') ?: '/var/www/networking_data';
$archivo = $datos . '/panel-clave.txt';

function pedir(string $texto): string {
  fwrite(STDOUT, $texto);
  $oculto = stream_isatty(STDIN);
  if ($oculto) shell_exec('stty -echo');
  $v = rtrim((string)fgets(STDIN), "\r\n");
  if ($oculto) { shell_exec('stty echo'); fwrite(STDOUT, PHP_EOL); }
  return $v;
}

$clave = pedir('Nueva contraseña del panel (mínimo 10 caracteres): ');
if (mb_strlen($clave) < 10) { fwrite(STDERR, "Demasiado corta: usa al menos 10 caracteres.\n"); exit(1); }
if (stream_isatty(STDIN) && pedir('Repítela: ') !== $clave) { fwrite(STDERR, "No coinciden. No se ha cambiado nada.\n"); exit(1); }

if (file_put_contents($archivo, password_hash($clave, PASSWORD_DEFAULT) . PHP_EOL, LOCK_EX) === false) {
  fwrite(STDERR, "No se ha podido escribir $archivo. ¿Lo has lanzado con sudo -u www-data?\n");
  exit(1);
}
chmod($archivo, 0600);
fwrite(STDOUT, "Contraseña guardada. Las sesiones abiertas siguen activas hasta que salgan o caduquen.\n");
