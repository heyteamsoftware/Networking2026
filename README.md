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

La web es HTML/CSS/JS estático, sin compilación, más un único archivo PHP (`participa.php`) que recibe el formulario.

## Solicitudes de participación

El formulario «Quiero participar como empresa» guarda cada solicitud en un CSV privado del servidor, fuera de la carpeta pública (no se puede descargar desde la web):

```
/var/www/networking_data/solicitudes.csv
```

Se abre directamente con Excel (separador `;`, UTF-8). Para descargarlo:

```bash
ssh -i <ruta>/servidor-apps.key ubuntu@129.151.249.242 "sudo cat /var/www/networking_data/solicitudes.csv" > solicitudes.csv
```

El servidor no envía correos: hay que revisar el CSV. Las fórmulas que alguien escriba en el formulario se guardan como texto, para que Excel no las ejecute.

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
