<?php
// Networking 2026 — Análisis DAFO del encuentro. Cada mesa tiene su propio QR (dafo/?mesa=1…10):
// la mesa llega con el QR y se guarda sola, sin que nadie tenga que elegirla.
// Respuestas cerradas y anónimas: no se pide ningún dato personal.
declare(strict_types=1);
require __DIR__ . '/opciones.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex, nofollow');

$e = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$mesa = (int)($_GET['mesa'] ?? 0);
if (!isset(DAFO_MESAS[$mesa])) $mesa = 0;
$enviado = isset($_GET['enviado']);
$error = isset($_GET['error']);
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $mesa ? 'Mesa ' . $mesa . ' · ' : '' ?>Análisis DAFO — Networking 2026</title>
  <meta name="description" content="Networking 2026 · Análisis DAFO del encuentro: fortalezas, debilidades, oportunidades y amenazas, mesa a mesa.">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#14213d">
  <link rel="icon" href="../img/isotipo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../styles.css?v=20261111a">
</head>
<body class="pagina-legado pagina-dafo">

  <header class="lg-barra">
    <a class="brand" href="../" aria-label="Networking 2026, volver a la web">
      <img src="../img/isotipo.svg" alt="" width="30" height="30">
      <span>Networking <b>2026</b></span>
    </a>
    <?php if ($mesa): ?><span class="df-mesa-chip" style="--c: var(--mesa-<?= dafoColor($mesa) ?>)">Mesa <?= $mesa ?></span><?php endif; ?>
  </header>

  <main>
    <section class="lg-hero df-hero">
      <div class="wrap">
        <p class="etiqueta">Análisis DAFO del encuentro</p>
        <h1><?= $mesa ? 'Mesa <em>' . $mesa . '</em>' : 'Análisis <em>DAFO</em>' ?></h1>
        <?php if ($mesa): ?>
          <p class="entradilla">Entre todo el equipo, marcad <strong>hasta <?= DAFO_MAX ?> opciones</strong> en cada bloque. Las respuestas son anónimas y se suman al momento al análisis del encuentro.</p>
        <?php else: ?>
          <p class="entradilla">Este formulario se abre con el <strong>código QR de vuestra mesa</strong>. Escanead el que tenéis en la mesa y las respuestas se guardarán con vuestro número de mesa.</p>
        <?php endif; ?>
      </div>
    </section>

    <?php if ($mesa): ?>
    <section class="lg-registro">
      <div class="wrap">
        <form class="form lg-form df-form" id="formDafo" action="guardar.php" method="post" novalidate>
          <!-- La mesa viene en el QR: no se elige -->
          <input type="hidden" name="mesa" value="<?= $mesa ?>">

          <?php $i = 0; foreach (DAFO_BLOQUES as $letra => $b): $i++; ?>
            <fieldset class="lg-bloque df-bloque df-<?= strtolower($letra) ?>" data-bloque="<?= $letra ?>" data-titulo="<?= $e(mb_strtolower($b['titulo'])) ?>">
              <legend><b><?= $letra ?></b> <?= $e($b['titulo']) ?> <span class="df-cuenta" aria-live="polite">0/<?= DAFO_MAX ?></span></legend>
              <p class="df-pregunta"><?= $e($b['pregunta']) ?> <span><?= $e($b['origen']) ?></span></p>
              <div class="df-opciones">
                <?php foreach ($b['opciones'] as $codigo => $texto): ?>
                  <label class="df-op">
                    <input type="checkbox" name="<?= $letra ?>[]" value="<?= $codigo ?>">
                    <span><?= $e($texto) ?></span>
                  </label>
                <?php endforeach; ?>
              </div>
            </fieldset>
          <?php endforeach; ?>

          <!-- Campo trampa contra envíos automáticos: las personas no lo ven -->
          <div class="trampa" aria-hidden="true">
            <label for="d-web">No rellenes este campo</label>
            <input id="d-web" name="web" type="text" tabindex="-1" autocomplete="off">
          </div>
          <p class="f-ayuda">Respuestas anónimas: no guardamos nombres, correos ni ningún dato personal.</p>
          <p class="form-error" id="dafoError" role="alert" <?= $error ? '' : 'hidden' ?>><?= $error ? 'Marca al menos una opción en cada bloque (como máximo ' . DAFO_MAX . ').' : '' ?></p>
          <button class="btn btn-primario" type="submit" id="dafoEnviar">Enviar el DAFO de la mesa</button>
        </form>
      </div>
    </section>

    <dialog class="ok-dialog" id="dafoOk" aria-labelledby="dfOkTitulo" <?= $enviado ? 'data-abrir' : '' ?>>
      <div class="form-ok">
        <svg viewBox="0 0 400 400" aria-hidden="true">
          <polygon class="m1" points="12.07,5 387.93,5 200,192.93"/>
          <polygon class="m2" points="5,12.07 192.93,200 5,387.93"/>
          <polygon class="m3" points="395,12.07 395,187.93 307.07,100"/>
          <polygon class="m3" points="207.07,200 300,107.07 392.93,200 300,292.93"/>
          <polygon class="m3" points="200,207.07 287.93,295 112.07,295"/>
          <polygon class="m4" points="12.07,395 102.07,305 287.93,305 197.93,395"/>
          <polygon class="m4" points="395,212.07 395,395 212.07,395"/>
        </svg>
        <h3 id="dfOkTitulo">¡DAFO enviado!</h3>
        <p>Gracias. Vuestras respuestas ya forman parte del análisis del encuentro.</p>
        <button type="button" class="btn btn-primario ok-cerrar" data-cerrar>Enviar otra respuesta</button>
      </div>
    </dialog>
    <?php endif; ?>
  </main>

  <?php if ($mesa): ?><script src="dafo.js"></script><?php endif; ?>
</body>
</html>
