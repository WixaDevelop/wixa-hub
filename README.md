# WiXa — Hub de descargas

Sitio público (GitHub Pages) que lista las aplicaciones de **WiXa** y sus versiones
descargables. El código fuente de cada app vive en su propio repositorio (privado);
aquí solo se publican los **instaladores** como Releases y la web que los presenta.

- **Web:** https://wixadevelop.github.io/wixa-hub/
- **Apps y secciones:** se configuran en [`apps.json`](apps.json).
- **Releases:** se etiquetan por app: `watuy-vX.Y.Z`, `<otra-app>-vX.Y.Z`. La web los
  agrupa por `tagPrefix`.

## Agregar una versión
Publica un Release en este repo con el tag `<app>-vX.Y.Z` y adjunta los instaladores
(`.exe`, `.msi`) y sus `.sha256`. La web se actualiza sola (lee la API pública de GitHub).

## Agregar una app nueva
Añade una entrada en `apps.json` con su `id`, `name`, `tagline` y `tagPrefix`.

© 2026 WiXa.
