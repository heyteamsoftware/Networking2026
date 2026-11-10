<?php
// Networking 2026 — Análisis DAFO del encuentro: mesas y respuestas cerradas.
// Lo usan el formulario de las mesas (dafo/index.php y dafo/guardar.php) y el panel (sección Análisis DAFO).
// Para cambiar una frase basta con editarla aquí: los códigos (F1, D2…) son los que se guardan,
// así que no conviene cambiar el significado de una opción cuando ya hay respuestas.

// 10 mesas numeradas (por si cambia la organización final; las que no se usen, simplemente no tendrán respuestas)
const DAFO_MESAS = [1 => 'Mesa 1', 2 => 'Mesa 2', 3 => 'Mesa 3', 4 => 'Mesa 4', 5 => 'Mesa 5',
  6 => 'Mesa 6', 7 => 'Mesa 7', 8 => 'Mesa 8', 9 => 'Mesa 9', 10 => 'Mesa 10'];

/** Color de cada mesa: los cuatro de la identidad, repetidos en orden (mesa 5 = color 1, …). */
function dafoColor(int $mesa): int {
  return ($mesa - 1) % 4 + 1;
}

const DAFO_MAX = 3; // cada equipo marca entre 1 y 3 opciones de cada bloque

// Orden de la matriz: arriba lo interno (fortalezas, debilidades), abajo lo externo (oportunidades, amenazas)
const DAFO_BLOQUES = [
  'F' => [
    'titulo' => 'Fortalezas',
    'pregunta' => '¿Qué es lo mejor del encuentro?',
    'origen' => 'Interno · positivo',
    'opciones' => [
      'F1' => 'Conexión real entre empresas, centro y alumnado',
      'F2' => 'Formato dinámico y participativo: retos y mesas',
      'F3' => 'Talento y proyectos del alumnado a la vista',
      'F4' => 'Organización y acogida del centro',
      'F5' => 'Variedad de sectores y entidades',
      'F6' => 'Identidad canaria y vínculo con el territorio',
    ],
  ],
  'D' => [
    'titulo' => 'Debilidades',
    'pregunta' => '¿Qué hay que mejorar del encuentro?',
    'origen' => 'Interno · negativo',
    'opciones' => [
      'D1' => 'Poco tiempo para profundizar en cada conversación',
      'D2' => 'Faltan sectores o empresas clave',
      'D3' => 'Poca participación directa del alumnado',
      'D4' => 'Objetivos de las mesas poco claros',
      'D5' => 'Poca difusión antes del encuentro',
      'D6' => 'Falta un plan de seguimiento después',
    ],
  ],
  'O' => [
    'titulo' => 'Oportunidades',
    'pregunta' => '¿Qué puede salir de aquí?',
    'origen' => 'Externo · positivo',
    'opciones' => [
      'O1' => 'Prácticas y FP Dual con nuevas empresas',
      'O2' => 'Proyectos conjuntos e innovación aplicada',
      'O3' => 'Internacionalización y programas Erasmus+',
      'O4' => 'Empleo y emprendimiento del alumnado',
      'O5' => 'Formación del profesorado en la empresa',
      'O6' => 'Una red estable entre empresas y FP en Canarias',
    ],
  ],
  'A' => [
    'titulo' => 'Amenazas',
    'pregunta' => '¿Qué puede frenar la colaboración?',
    'origen' => 'Externo · negativo',
    'opciones' => [
      'A1' => 'Falta de tiempo de las empresas',
      'A2' => 'Burocracia para formalizar acuerdos',
      'A3' => 'Calendario escolar y cambios normativos',
      'A4' => 'Falta de financiación y recursos',
      'A5' => 'Muchas otras iniciativas compitiendo por atención',
      'A6' => 'Que las ideas se queden solo en ideas',
    ],
  ],
];
