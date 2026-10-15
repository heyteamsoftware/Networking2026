# Networking 2026 — CIFP Tony Gallardo

Landing page e identidad visual del evento **Networking 2026 · Juntos somos mejores** (20 de noviembre de 2026).
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

La web es HTML/CSS/JS estático, sin compilación.

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
