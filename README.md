# Networking 2026 — CIFP Tony Gallardo

Landing page del evento **Networking 2026 · Del aula a la realidad** (20 de noviembre de 2026).
Un espacio de encuentro, diálogo y crecimiento entre empresas y profesorado.

Publicada en: https://myappsserver.duckdns.org/Networking/

## Estructura

```
Networking/
├── index.html      # contenido (mesas y textos)
├── styles.css      # estilos
├── app.js          # despiece del cartel con el scroll, fondo de red, cuenta atrás
└── img/
    ├── cartel.webp             # cartel; se recorta en 4 trozos (uno por mesa)
    └── logo-tony-gallardo.webp
```

Es HTML/CSS/JS estático, sin dependencias ni compilación.

## Despliegue

Se sube la carpeta `Networking/` a `/var/www/html/Networking/` del servidor:

```bash
scp -i <ruta>/servidor-apps.key -r Networking/* ubuntu@129.151.249.242:/var/www/html/Networking/
```
