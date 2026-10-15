Networking 2026 es un encuentro entre empresas y profesorado en el CIFP Tony Gallardo, el 20 de noviembre de 2026, con el lema **Juntos somos FP**. La identidad es un tangram: siete piezas que juntas forman un cuadrado, que se agrupan en las cuatro mesas de trabajo y que son también las islas de Canarias, más una octava pieza, la que falta. Montar el cuadrado, desmontarlo en mesas y abrirlo en el archipiélago es la idea de todo el sistema.

## El concepto: un tangram de cuatro mesas

El cuadrado completo es el evento. Cada pieza lleva uno de los siete valores del cartel original, y las piezas se agrupan por color en las cuatro mesas. **Cada mesa ocupa exactamente un cuarto del cuadrado** (4 de las 16 unidades de área): ninguna mesa pesa más que otra.

El lema, **Juntos somos FP**, dice lo mismo con palabras: la Formación Profesional no la hace solo el aula. Centros, profesorado, alumnado y empresas son piezas distintas del mismo tangram, y la figura solo aparece cuando encajan. Úsalo así:
- Debajo de «NETWORKING 2026» en el logotipo, en `etiqueta` (Outfit 600, mayúsculas, espaciado amplio). No lo pongas en Bebas ni más grande que el nombre del evento.
- En texto corrido se escribe «Juntos somos FP», con «FP» siempre en mayúsculas y sin punto final.
- Acompaña al tangram montado o al archipiélago, nunca a las mesas separadas: las mesas hablan del programa; el lema, de lo que forman juntas.

## Ocho piezas, ocho islas

Canarias tiene ocho islas habitadas. Las siete del tangram son las siete islas mayores, cada una con un tamaño parecido al real (las dos más grandes son los triángulos grandes, las dos más pequeñas los triángulos pequeños). **La octava, La Graciosa, es la pieza que falta**: una pieza pequeña que solo se dibuja con su contorno, porque la completa quien se suma. Es la misma idea del aviso «Falta tu pieza» de las empresas participantes. **Separadas son islas; juntas forman la figura.**

| Pieza | Forma | Isla | Valor | Mesa | Color |
| --- | --- | --- | --- | --- | --- |
| 1 | Triángulo grande (arriba) | Tenerife | Ideas | Mesa 1 · El aula como laboratorio de ideas | `mesa-1` rojo Timanfaya |
| 2 | Triángulo grande (izquierda) | Fuerteventura | Proyectos | Mesa 2 · Proyectos en acción | `mesa-2` naranja atardecer |
| 3 | Triángulo pequeño (derecha) | La Gomera | Territorio | Mesa 3 · Radio Atlante conecta | `mesa-3` azul Atlántico |
| 4 | Cuadrado | Gran Canaria | Conexiones | Mesa 3 · Radio Atlante conecta | `mesa-3` azul Atlántico |
| 5 | Triángulo pequeño (centro) | El Hierro | Personas | Mesa 3 · Radio Atlante conecta | `mesa-3` azul Atlántico |
| 6 | Paralelogramo | Lanzarote | Futuro | Mesa 4 · TG Lab | `mesa-4` amarillo canario |
| 7 | Triángulo mediano | La Palma | Empresa | Mesa 4 · TG Lab | `mesa-4` amarillo canario |

El **archipiélago** (`isotipo-archipielago.svg`) es la composición con las siete piezas en el lugar de su isla, de El Hierro a Lanzarote, calculado a partir de la longitud y latitud reales. Las piezas van al 50 % del tamaño del cuadrado y cada una con su giro.
- **La Graciosa** va siempre al norte de Lanzarote como un triángulo pequeño, sin relleno y con contorno discontinuo (`#9aa0b4` en los archivos, `marca-arena` sobre azul noche). No lleva color de mesa; su rótulo es «La Graciosa · La pieza que falta».
- Úsalo para hablar del territorio: cartel, redes, presentaciones y como paso intermedio de la animación. No sustituye al isotipo como firma.
- Cuando se rotulen las islas, el nombre va en `cuerpo` 600 y el valor debajo en `nota`, en `tinta-suave`.

Geometría: el tangram se dibuja sobre una retícula de 4 × 4 unidades. Todos los cortes van a 0°, 45° o 90°. Entre pieza y pieza hay siempre una **junta** del 2,5 % del lado (`junta`), que deja ver el fondo. El archivo `identidad/generar.js` del repositorio genera todos los SVG a partir de esas coordenadas y de las posiciones de las islas: cambia la geometría, las islas o los colores ahí, nunca a mano en un SVG.

## Palabras en las piezas

En las piezas grandes (la portada de la web, carteles, flyers y roll-ups) cada pieza lleva escrita su palabra clave: IDEAS, PROYECTOS, TERRITORIO, CONEXIONES, PERSONAS, FUTURO y EMPRESA.
- Bebas Neue, en mayúsculas y centrada en la pieza; TERRITORIO va en vertical, a lo largo del cateto del triángulo pequeño.
- Blanco sobre rojo y azul; `marca-noche` sobre naranja y amarillo.
- Posición y tamaño de cada palabra en `identidad/generar.js` (`PALABRAS`), en unidades de la retícula. No las cambies a mano.
- En el isotipo, los símbolos de mesa y cualquier tangram de menos de 120 px no se ponen palabras: no se leerían. Tampoco en el archipiélago, donde mandan los nombres de las islas.

## Logotipo

- **Logo horizontal** (`logo-horizontal.svg`, sobre fondos claros; `logo-horizontal-negativo.svg`, sobre `marca-noche` o fotos oscuras): la versión principal. Úsalo en cabeceras, web, presentaciones y firmas.
- **Logo vertical** (`logo-vertical.svg` y `logo-vertical-negativo.svg`): carteles, roll-ups, portadas y redes sociales con formato cuadrado o vertical.
- **Isotipo** (`isotipo.svg`): el tangram solo. Avatar de redes, favicon, sellos y cuando el nombre ya aparece cerca.
- **Isotipo despiezado** (`isotipo-despiezado.svg`): las cuatro mesas separadas. Úsalo para hablar del programa o de las mesas, nunca como firma del evento.
- **Archipiélago** (`isotipo-archipielago.svg`): las siete piezas como las islas. Para hablar del territorio.
- **Isotipo a una tinta** (`isotipo-noche.svg`, `isotipo-arena.svg`): impresión a un color, grabado, sellos y fondos donde los cuatro colores no funcionan.

Reglas:
- Área de respeto: deja libre alrededor del logotipo al menos una unidad del tangram, es decir, un cuarto del lado del isotipo.
- Tamaño mínimo: isotipo de 24 px (8 mm impreso); logo horizontal de 180 px de ancho (45 mm).
- En positivo el «2026» va en `mesa-1`; en negativo, en `mesa-4`.
- No cierres las juntas, no cambies el color de una pieza a otro que no sea el de su mesa, no gires piezas sueltas en la versión montada, no añadas sombras, contornos ni degradados, y no recompongas el texto con otra fuente: los textos del logotipo ya están convertidos a contornos.

## Color

La paleta es el paisaje de las islas. Los cuatro colores de mesa se llaman como el lugar del que salen: **rojo Timanfaya** (`mesa-1`), el de la lava de Lanzarote; **naranja atardecer** (`mesa-2`), la luz del sol poniéndose sobre el Atlántico, como en la foto de la portada; **azul Atlántico** (`mesa-3`), el del mar que une las islas; y **amarillo canario** (`mesa-4`), el de la bandera de Canarias. Los fondos completan el paisaje: **arena** de las dunas de Maspalomas y **azul noche** del cielo de La Palma. Llámalos así en textos, presentaciones y encargos de imprenta.
- Usa `fondo` y `tinta` para casi todo. Los cuatro colores de mesa son la marca: guárdalos para las piezas, los bloques de color y lo que pertenece a una mesa concreta.
- Una sección de mesa usa solo su color: el símbolo y los bloques en `mesa-N`, sus antetítulos y chips en `mesa-N-texto`. No mezcles dos mesas en el mismo bloque, salvo en el tangram completo y en el archipiélago.
- Texto sobre los colores de mesa: blanco sobre `mesa-1` y `mesa-3`; `marca-noche` sobre `mesa-2` y `mesa-4`.
- Ningún color de mesa sirve como texto pequeño sobre `fondo` claro (rojo 4,2:1, naranja 2,3:1, amarillo 1,3:1). Para texto usa siempre la variante `mesa-N-texto`. El amarillo sobre fondos claros apenas se separa del fondo: ahí úsalo en bloques grandes o acompañado de otras piezas, no en formas sueltas pequeñas.
- El azul de la bandera no se usa: sobre `marca-noche` se queda en 2,7:1 y se perdería; `mesa-3` da 3,2:1.
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

## Fondos y calado canario

**Los fondos son planos**: `fondo` en su color, sin texturas, para que el tangram y los colores de mesa sean lo único que destaque. Así va la web.

El patrón inspirado en el **calado**, el bordado geométrico tradicional de las islas (retícula cuadrada, hilos a 45° como los cortes del tangram, un rombo central y la «araña»), queda como recurso opcional, no como fondo por defecto.
- Archivos: `calado-arena.svg` (hilos claros, para fondos `marca-noche`) y `calado-noche.svg` (hilos oscuros, para fondos claros), en el grupo Patrones. Es un módulo de 48 × 48 px que se repite.
- Úsalo solo en piezas puntuales que pidan un guiño artesanal (un photocall, una lona, una bolsa o una acreditación), y siempre muy suave: entre el 6 % y el 10 % de opacidad.
- Nunca en la web, detrás de texto corrido ni dentro de las piezas.

## Movimiento

La animación cuenta el concepto en tres tiempos:
1. **Montaje** al cargar, encima de la foto de portada: las siete piezas llegan desde fuera girando y encajan en el cuadrado, con unos 80 ms de diferencia entre pieza y pieza (unos 1,5 s en total, curva de salida suave). Por las juntas se ve la foto.
2. **Mesas** al empezar el scroll: el cuadrado se desmonta en las cuatro mesas, que se colocan una junto a otra con su nombre debajo bajo el título «Elige tu mesa». Al pulsar una mesa se va a su sección.
3. **Archipiélago** al seguir: las mesas se deshacen y cada pieza viaja a su isla, gira y se reduce. Aparece la pieza de La Graciosa, el título «Ocho piezas, ocho islas» y el nombre de cada isla con su valor. Es el final de la escena: del evento al programa, y del programa al territorio.

Respeta `prefers-reduced-motion`: sin montaje y con los pasos sustituidos por estados fijos.

## Voz y tono

- Frases cortas y en positivo. Habla de personas y de proyectos, no de «sinergias» ni de «ecosistemas».
- Trata de tú a una persona y de **ustedes** a un grupo, como se habla en Canarias: «¿Ya eligieron mesa?», nunca «¿Ya habéis elegido mesa?».
- Los nombres de mesa se escriben tal cual en el programa: «El aula como laboratorio de ideas», «Proyectos en acción: mesas técnicas de trabajo», «Radio Atlante conecta con experiencias de impacto», «TG Lab: Innovación, Emprendimiento, Orientación y Calidad».
- Las islas se nombran con su nombre completo y artículo cuando lo llevan: La Palma, La Gomera, El Hierro, La Graciosa.
- La fecha se escribe «20 de noviembre de 2026» en texto y «20 NOV 2026» en piezas gráficas.
- El lema es «Juntos somos FP». En piezas gráficas va en mayúsculas: «JUNTOS SOMOS FP».
- Sin emojis.

## Iconografía

No hay una familia de iconos. Los únicos símbolos de la marca son las cuatro mesas (`mesa-1.svg` a `mesa-4.svg`), recortadas del propio tangram. Úsalos para señalizar las mesas en la web, en los carteles de sala y en las acreditaciones. Si hiciera falta un icono funcional (flecha, menú), usa un trazo simple de 2 px en `tinta`.

## El centro organizador

El CIFP Tony Gallardo organiza el evento, así que su logo aparece siempre en la portada de cada soporte (web, cartel, presentación, acreditación), con la palabra «Organiza» en `etiqueta` y el nombre «CIFP Tony Gallardo» al lado.
- Ponlo sobre un círculo blanco, ya que el logo es redondo, y nunca dentro del tangram ni pegado a él.
- En la web, la portada es la foto del atardecer sobre el mar, con Tenerife y el Teide al fondo. Encima van, a la izquierda (arriba en móvil), el logo del CIFP con «Organiza · CIFP Tony Gallardo», el nombre y el lema sobre un velo `marca-noche`; y a la derecha (debajo en móvil), el tangram montado. Al hacer scroll la foto se funde con el azul noche. Es la única imagen fotográfica de la web.
- Respeta el logo tal cual: no lo recolorees ni lo recortes.

## Franja de instituciones

Al final de cada soporte, antes del pie, va una franja blanca con los logos institucionales: `cifp-tony-gallardo.png` y `gobierno-canarias.png` (grupo Instituciones).
- Fondo blanco siempre: el logo del Gobierno de Canarias lleva texto negro y no funciona sobre `marca-noche`.
- Mismo peso visual: el CIFP a 104 px de alto y el de la Consejería a 250 px de ancho, centrados y separados por un filete vertical en `linea`. En móvil, uno debajo del otro, sin filete.
- Usa el archivo recortado del grupo Instituciones; no estires ni recolorees los logos y no los mezcles con el tangram.
- Si se suma otra institución (por ejemplo FP Dual Canarias), entra en esta misma franja, a la misma altura y según su propio manual.

## Empresas participantes

Las empresas tienen su propia sección, antes de la franja de instituciones, con el antetítulo «Juntos somos FP».
- Cada empresa es una ficha en `superficie` con su logo (máximo 60 px de alto), su nombre en `cuerpo` 600 y, si se conocen, unos triángulos pequeños con el color de las mesas en las que participa.
- Mientras no haya empresas confirmadas se muestra el aviso «Falta tu pieza»: el tangram con la última pieza vacía y en trazo discontinuo.
- En la web la lista sale de `Networking/empresas.json`: cada empresa es `{"nombre", "logo", "web", "mesas"}` y solo `nombre` es obligatorio. Los logos se guardan en `Networking/img/empresas/`.
