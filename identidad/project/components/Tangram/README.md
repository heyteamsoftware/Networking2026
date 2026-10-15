# Tangram

El isotipo vivo: las siete piezas del tangram que se montan al cargar y se despiezan en las cuatro mesas. Es la pieza central de la web y de cualquier soporte animado (pantallas, vídeo, redes).

**Qué aporta quien lo usa:** un contenedor cuadrado (el tangram ocupa el 100 % de su ancho) y, si hay despiece, el valor de avance de 0 a 1 que lo controla (normalmente el scroll).

**Estructura:** un `<svg viewBox="0 0 400 400">` con un `<g>` por mesa (`data-mesa="1"` a `"4"`) y dentro sus piezas como `<polygon>`, ya encogidas por la `junta`. Las coordenadas salen de `identidad/generar.js`.

**Estados:**
- *Montado*: las cuatro mesas en su sitio. Es el estado en reposo y el que se usa sin animación.
- *Archipiélago*: cada pieza viaja al lugar de su isla, al 50 % y con su giro (posiciones en `identidad/generar.js`), con La Graciosa como la octava pieza, la que falta: un triángulo pequeño con contorno discontinuo al norte de Lanzarote.
- *Despiezado*: cada mesa se desplaza hacia fuera (Mesa 1 arriba, Mesa 2 a la izquierda, Mesa 3 a la derecha, Mesa 4 abajo) unos 42 de las 400 unidades.
- *Montaje*: cada pieza entra desde fuera, girada, con 80 ms de retraso respecto a la anterior.

**Úsalo así:**
- Sobre `fondo` en tema Noche para los momentos de impacto; en tema Arena funciona igual.
- Deja alrededor el área de respeto del logotipo: un cuarto del lado.
- Con `prefers-reduced-motion`, muéstralo montado y sin transiciones.

**No:** no cambies el orden ni el color de las piezas, no animes piezas sueltas fuera del montaje (en el despiece se mueven las mesas enteras) y no lo uses más pequeño de 24 px.
