Networking 2026 es un encuentro entre empresas y profesorado en el CIFP Tony Gallardo, el 20 de noviembre de 2026, con el lema **Juntos somos FP**. La identidad es un tangram: siete piezas que juntas forman un cuadrado y que se separan en las cuatro mesas de trabajo. Montar y desmontar el cuadrado es la idea de todo el sistema.

## El concepto: un tangram de cuatro mesas

El cuadrado completo es el evento. Cada pieza lleva uno de los siete valores del cartel original, y las piezas se agrupan por color en las cuatro mesas. **Cada mesa ocupa exactamente un cuarto del cuadrado** (4 de las 16 unidades de área): ninguna mesa pesa más que otra.

El lema, **Juntos somos FP**, dice lo mismo con palabras: la Formación Profesional no la hace solo el aula. Centros, profesorado, alumnado y empresas son piezas distintas del mismo tangram, y la figura solo aparece cuando encajan. Úsalo así:
- Debajo de «NETWORKING 2026» en el logotipo, en `etiqueta` (Outfit 600, mayúsculas, espaciado amplio). No lo pongas en Bebas ni más grande que el nombre del evento.
- En texto corrido se escribe «Juntos somos FP», con «FP» siempre en mayúsculas y sin punto final.
- Acompaña al tangram montado, nunca al despiezado: el despiece habla de las mesas; el lema, de lo que forman juntas.

| Pieza | Forma | Valor | Mesa | Color |
| --- | --- | --- | --- | --- |
| 1 | Triángulo grande (arriba) | Ideas | Mesa 1 · El aula como laboratorio de ideas | `mesa-1` naranja atardecer |
| 2 | Triángulo grande (izquierda) | Proyectos | Mesa 2 · Proyectos en acción | `mesa-2` rojo volcán |
| 3 | Triángulo pequeño (derecha) | Territorio | Mesa 3 · Radio Atlante conecta | `mesa-3` azul atlántico |
| 4 | Cuadrado | Conexiones | Mesa 3 · Radio Atlante conecta | `mesa-3` azul atlántico |
| 5 | Triángulo pequeño (centro) | Personas | Mesa 3 · Radio Atlante conecta | `mesa-3` azul atlántico |
| 6 | Paralelogramo | Futuro | Mesa 4 · TG Lab | `mesa-4` amarillo sol |
| 7 | Triángulo mediano | Empresa | Mesa 4 · TG Lab | `mesa-4` amarillo sol |

Geometría: el tangram se dibuja sobre una retícula de 4 × 4 unidades. Todos los cortes van a 0°, 45° o 90°. Entre pieza y pieza hay siempre una **junta** del 2,5 % del lado (`junta`), que deja ver el fondo. El archivo `identidad/generar.js` del repositorio genera todos los SVG a partir de esas coordenadas: cambia la geometría o los colores ahí, nunca a mano en un SVG.

## Logotipo

- **Logo horizontal** (`logo-horizontal.svg`, sobre fondos claros; `logo-horizontal-negativo.svg`, sobre `marca-noche` o fotos oscuras): la versión principal. Úsalo en cabeceras, web, presentaciones y firmas.
- **Logo vertical** (`logo-vertical.svg` y `logo-vertical-negativo.svg`): carteles, roll-ups, portadas y redes sociales con formato cuadrado o vertical.
- **Isotipo** (`isotipo.svg`): el tangram solo. Avatar de redes, favicon, sellos y cuando el nombre ya aparece cerca.
- **Isotipo despiezado** (`isotipo-despiezado.svg`): las cuatro mesas separadas. Úsalo para hablar del programa o de las mesas, nunca como firma del evento.
- **Isotipo a una tinta** (`isotipo-noche.svg`, `isotipo-arena.svg`): impresión a un color, grabado, sellos y fondos donde los cuatro colores no funcionan.

Reglas:
- Área de respeto: deja libre alrededor del logotipo al menos una unidad del tangram, es decir, un cuarto del lado del isotipo.
- Tamaño mínimo: isotipo de 24 px (8 mm impreso); logo horizontal de 180 px de ancho (45 mm).
- En positivo el «2026» va en `mesa-2`; en negativo, en `mesa-4`.
- No cierres las juntas, no cambies el color de una pieza a otro que no sea el de su mesa, no gires piezas sueltas en la versión montada, no añadas sombras, contornos ni degradados, y no recompongas el texto con otra fuente: los textos del logotipo ya están convertidos a contornos.

## Color

- Usa `fondo` y `tinta` para casi todo. Los cuatro colores de mesa son la marca: guárdalos para las piezas, los bloques de color y lo que pertenece a una mesa concreta.
- Una sección de mesa usa solo su color: el símbolo y los bloques en `mesa-N`, sus antetítulos y chips en `mesa-N-texto`. No mezcles dos mesas en el mismo bloque, salvo en el tangram completo.
- Texto sobre los colores de mesa: `marca-noche` sobre `mesa-1` y `mesa-4`; blanco sobre `mesa-3`; sobre `mesa-2`, blanco solo a partir de 19 px en negrita.
- `mesa-1` y `mesa-4` no sirven como color de texto sobre `fondo` claro (2,4:1 y 1,7:1). Para texto usa siempre la variante `mesa-N-texto`.
- El tema Noche (`fondo` = azul noche) es para la portada, la escena del tangram y el pie; el tema Arena, para leer.
- El foco de teclado es un anillo sólido de 3 px en `foco`, separado 3 px del elemento.

## Tipografía

- **Bebas Neue** (familia `display`) para titulares, siempre en mayúsculas: `titular-xl` para el nombre del evento, `titular-l` para títulos de sección, `titular-m` para el nombre de cada mesa y `cifra` para fechas y números.
- **Outfit** (familia `texto`), una geométrica que comparte los ángulos del tangram, para todo lo demás: `entradilla`, `cuerpo`, `etiqueta` (en mayúsculas y con 0,16 em de espaciado) y `nota`.
- No uses Bebas en párrafos ni por debajo de 24 px. No pongas Outfit en mayúsculas salvo en `etiqueta`.
- Las líneas de texto corrido no pasan de 65 caracteres.

## Composición

- La retícula es la del tangram: cuatro columnas iguales. Las imágenes y bloques de color se cortan a 45° o en ángulo recto, nunca con curvas.
- Las piezas y los bloques de color van en ángulo vivo (`radio-0`); las tarjetas y botones, con `radio-s`; los chips, con `radio-pildora`.
- Separa las secciones con cambios de fondo (`fondo` / `fondo-2`), no con sombras.
- Márgenes: `esp-2` en móvil, `esp-4` en escritorio; `esp-11` arriba y abajo de cada sección.

## Movimiento

La animación cuenta el concepto en dos tiempos:
1. **Montaje** al cargar: las siete piezas llegan desde fuera girando y encajan en el cuadrado, con unos 80 ms de diferencia entre pieza y pieza (1,2 s en total, curva de salida suave).
2. **Despiece** al hacer scroll: el cuadrado se abre en las cuatro mesas, que se colocan una junto a otra con su nombre debajo. Al pulsar una mesa se va a su sección.

Respeta `prefers-reduced-motion`: sin montaje, y el despiece sustituido por las cuatro mesas ya colocadas.

## Voz y tono

- Frases cortas y en positivo. Habla de personas y de proyectos, no de «sinergias» ni de «ecosistemas».
- Trata de tú a una persona y de **ustedes** a un grupo, como se habla en Canarias: «¿Ya eligieron mesa?», nunca «¿Ya habéis elegido mesa?».
- Los nombres de mesa se escriben tal cual en el programa: «El aula como laboratorio de ideas», «Proyectos en acción: mesas técnicas de trabajo», «Radio Atlante conecta con experiencias de impacto», «TG Lab: Innovación, Emprendimiento, Orientación y Calidad».
- La fecha se escribe «20 de noviembre de 2026» en texto y «20 NOV 2026» en piezas gráficas.
- El lema es «Juntos somos FP». En piezas gráficas va en mayúsculas: «JUNTOS SOMOS FP».
- Sin emojis.

## Iconografía

No hay una familia de iconos. Los únicos símbolos de la marca son las cuatro mesas (`mesa-1.svg` a `mesa-4.svg`), recortadas del propio tangram. Úsalos para señalizar las mesas en la web, en los carteles de sala y en las acreditaciones. Si hiciera falta un icono funcional (flecha, menú), usa un trazo simple de 2 px en `tinta`.

## El centro organizador

El CIFP Tony Gallardo organiza el evento, así que su logo aparece siempre en la portada de cada soporte (web, cartel, presentación, acreditación), con la palabra «Organiza» en `etiqueta` y el nombre «CIFP Tony Gallardo» al lado.
- Ponlo sobre un círculo blanco, ya que el logo es redondo, y nunca dentro del tangram ni pegado a él.
- En la web va encima del nombre del evento: 96 px en escritorio y 56 px en móvil.
- Respeta el logo tal cual: no lo recolorees ni lo recortes.

## Franja de instituciones

Al final de cada soporte, antes del pie, va una franja blanca con los logos institucionales: `cifp-tony-gallardo.webp` y `gobierno-canarias.png` (grupo Instituciones).
- Fondo blanco siempre: el logo del Gobierno de Canarias lleva texto negro y no funciona sobre `marca-noche`.
- Mismo peso visual: el CIFP a 104 px de alto y el Gobierno de Canarias a 160 px de ancho, centrados y separados por un filete vertical en `linea`. En móvil, uno debajo del otro, sin filete.
- Usa el archivo recortado del grupo Instituciones; no estires ni recolorees los logos y no los mezcles con el tangram.
- Si se suma otra institución (por ejemplo FP Dual Canarias), entra en esta misma franja, a la misma altura y según su propio manual.

## Empresas participantes

Las empresas tienen su propia sección, antes de la franja de instituciones, con el antetítulo «Juntos somos FP».
- Cada empresa es una ficha en `superficie` con su logo (máximo 60 px de alto), su nombre en `cuerpo` 600 y, si se conocen, unos triángulos pequeños con el color de las mesas en las que participa.
- Mientras no haya empresas confirmadas se muestra el aviso «Falta tu pieza»: el tangram con la última pieza vacía y en trazo discontinuo.
- En la web la lista sale de `Networking/empresas.json`: cada empresa es `{"nombre", "logo", "web", "mesas"}` y solo `nombre` es obligatorio. Los logos se guardan en `Networking/img/empresas/`.
