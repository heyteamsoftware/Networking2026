# Networking 2026 — CIFP Tony Gallardo

Landing page e identidad visual del evento **Networking 2026 · Juntos somos FP** (20 de noviembre de 2026).
Un espacio de encuentro, diálogo y crecimiento entre empresas y profesorado.

Publicada en: https://myappsserver.duckdns.org/Networking/

## Identidad: un tangram de cuatro mesas

El cuadrado del tangram es el evento. Sus siete piezas son los siete valores del cartel (Ideas, Proyectos, Territorio, Conexiones, Personas, Futuro, Empresa) y se agrupan por color en las cuatro mesas. Cada mesa ocupa exactamente un cuarto del cuadrado.

El manual completo (concepto, logotipo, color, tipografía, movimiento y tono) está en [identidad/project/README.md](identidad/project/README.md).

## Estructura

```
Networking/                 # la web que se publica
├── index.html              # contenido (mesas y textos)
├── styles.css              # estilos con los colores y fuentes de la identidad
├── app.js                  # montaje del tangram, despiece con el scroll, cuenta atrás
├── participa.php           # recibe el formulario «Quiero participar como empresa»
├── panel/                  # panel privado de solicitudes (con contraseña)
└── img/                    # isotipo, logo en negativo, símbolos de mesa (generados) y logo del CIFP

identidad/
├── generar.js              # genera todos los SVG a partir de la geometría del tangram
├── fuentes/                # Bebas Neue y Outfit (OFL), TTF y WOFF2
└── project/                # manual de identidad
    ├── README.md           # el manual
    ├── tokens.json         # colores, tipografía, espaciado y radios
    ├── assets/Logos/       # logotipos horizontal, vertical, isotipos
    ├── assets/Mesas/       # símbolos de las cuatro mesas
    └── components/         # fichas de ejemplo (tangram animado, ficha de mesa, portada)
```

La web es HTML/CSS/JS estático, sin compilación, más `participa.php`, que recibe el formulario, y el panel privado `panel/`.

## Solicitudes de participación

El formulario «Quiero participar como empresa» guarda cada solicitud en un CSV privado del servidor, fuera de la carpeta pública (no se puede descargar desde la web):

```
/var/www/networking_data/solicitudes.csv
```

Se abre directamente con Excel (separador `;`, UTF-8). El servidor no envía correos: hay que revisar las solicitudes en el panel. Las fórmulas que alguien escriba en el formulario se guardan como texto, para que Excel no las ejecute.

### Panel de solicitudes (equipo del centro)

https://myappsserver.duckdns.org/Networking/panel/

Con la contraseña del equipo se ven todas las solicitudes (las más recientes primero) y se pueden:

- filtrar por modalidad (participante, colaboradora, impulsora, sin decidir) y por mesa;
- descargar una hoja de Excel (**Descargar Excel**) con las solicitudes que se ven según los filtros;
- imprimir esas mismas solicitudes o guardarlas en PDF (**Imprimir / PDF**: en el diálogo de impresión, elegir «Guardar como PDF»; en A4 horizontal);
- descargar el CSV completo, sin filtros, con **Descargar CSV completo**;
- consultar el resumen de cuántas hay por modalidad y por mesa.

Sin contraseña no se ve nada: el CSV solo se descarga con la sesión abierta. Seguridad:

- La contraseña no está en el repositorio. En el servidor solo se guarda su hash, en `/var/www/networking_data/panel-clave.txt`.
- Tras 5 intentos fallidos seguidos desde la misma conexión hay que esperar 15 minutos. Ojo: en el centro todos salen por la misma IP, así que el bloqueo afecta a todo el que esté en esa red.
- La sesión caduca tras 20 minutos sin uso. Para cerrarla antes, botón **Salir**.
- Todo lo que llega del formulario se muestra escapado y la página no se indexa ni se puede incrustar en otra web.

**Cambiar la contraseña** (mínimo 10 caracteres; la pide dos veces sin mostrarla):

```bash
ssh -i <ruta>/servidor-apps.key -t ubuntu@129.151.249.242 "sudo -u www-data php /var/www/html/Networking/panel/cambiar-clave.php"
```

Las sesiones que ya estén abiertas siguen activas hasta que salgan o caduquen. `cambiar-clave.php` solo funciona desde la consola: la web lo bloquea.

Para descargar el CSV sin el panel, por SSH:

```bash
ssh -i <ruta>/servidor-apps.key ubuntu@129.151.249.242 "sudo cat /var/www/networking_data/solicitudes.csv" > solicitudes.csv
```

## Escaparate de empresas participantes

La sección «Empresas participantes» se rellena desde `Networking/empresas.json`. Mientras esté vacío (`[]`) la web muestra la convocatoria «Estamos construyendo las conexiones de esta edición. ¿Te sumas?». Cada empresa:

```json
[
  { "nombre": "Nombre de la empresa", "logo": "img/empresas/nombre.png", "sector": "Energía",
    "motivo": "Por qué participa, en una frase", "web": "https://…", "mesas": [1, 3] }
]
```

Solo `nombre` es obligatorio. Publicad solo logos autorizados por cada empresa; van en `Networking/img/empresas/`. `mesas` pinta un triangulito del color de cada mesa en la que participa. Basta con subir `empresas.json` (y los logos) al servidor: no hay que tocar el HTML.

## Colaboraciones posteriores

La sección «Lo que nace del encuentro» se rellena desde `Networking/colaboraciones.json`, igual que el escaparate. Mientras esté vacío muestra un aviso. Cada colaboración:

```json
[
  { "tipo": "Proyecto", "titulo": "…", "empresa": "…", "fecha": "Enero 2027",
    "descripcion": "…", "imagen": "img/colaboraciones/foto.jpg" }
]
```

`tipo` es Proyecto, Visita, Reto o Actividad (cada uno con el color de una mesa). Solo `titulo` es obligatorio.

## Piezas impresas

En `piezas/` están el cartel A3, el flyer A5 (frente y dorso) y el roll-up de 85 × 200 cm, en PDF para imprenta, con vista previa en PNG y el SVG de trabajo. Todas llevan el QR a la web y los logos del CIFP Tony Gallardo y del Gobierno de Canarias.

- Cartel y flyer: 3 mm de sangrado por cada lado. Roll-up: 5 mm, y los últimos 15 cm quedan sin contenido porque los tapa la base.
- Los textos van convertidos a contornos: la imprenta no necesita las fuentes.
- En `piezas/referencias-ia/` están las imágenes de referencia (tangram, mesas, archipiélago, paleta y cartel) para adjuntar a las IA generadoras de imagen, junto con la hoja de estilo para IA.
- Para regenerarlas tras un cambio de identidad o de textos: `cd identidad && npm install && npm run piezas` (necesita Edge o Chrome instalado para crear los PDF).

## Juego «10 minutos para conectar»

Material físico para las mesas, en `piezas/juego/` (PDF de imprenta con sangrado y vistas PNG), a partir de la propuesta de la dirección:

- **01 · Piezas recortables (A3).** Las siete piezas del tangram, cada una con su isla, su número y su valor, más La Graciosa en blanco para que la empresa escriba su nombre. Se imprime a una cara, se pega sobre cartón pluma de 5 mm y se recorta. El cuadrado mide 18 × 18 cm. Una lámina por mesa.
- **02 · Tablero (A2).** El archipiélago con el hueco de cada pieza a tamaño real (reto 1) y las tres preguntas del territorio.
- **03 · Cartas (A6, frente y dorso).** Tres retos, uno por capa (identidad, territorio, oportunidad), y cuatro figuras con las ocho piezas (Sinergia, Sostenibilidad, Innovación, Emprendimiento): silueta delante y solución detrás. El generador comprueba que cada figura usa las ocho piezas con su forma real y sin dar la vuelta al paralelogramo.
- **04 · Reglas (A4).** Minuto a minuto, roles del equipo y la regla de oro: ninguna figura está terminada sin La Graciosa.
- **05 · Tarjeta «Reto superado» (A6 horizontal).** Se la lleva la empresa: el reto, la colaboración propuesta y el primer paso.
- **campana/.** Publicaciones 1080 × 1080 y una historia 1080 × 1920 para «La pieza que nos falta eres tú»: mapa incompleto, plantilla «nueva pieza» y mapa completo.

Para regenerarlo: `cd identidad && npm run juego`.

## Regenerar los logotipos

Si cambian los colores o la geometría, se edita `identidad/generar.js` y se ejecuta:

```bash
cd identidad && npm install && npm run generar
```

Escribe los SVG en `identidad/project/assets/` y copia los que usa la web en `Networking/img/`.

## Despliegue

Se sube la carpeta `Networking/` a `/var/www/html/Networking/` del servidor:

```bash
scp -i <ruta>/servidor-apps.key -r Networking/* ubuntu@129.151.249.242:/var/www/html/Networking/
```
