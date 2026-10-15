# Retro Arcade 🕹️

Página web para jugar juegos retro en el navegador (celular o PC).

## Consolas
NES · Super Nintendo · Game Boy / Color · Game Boy Advance · Nintendo 64 · Nintendo DS ·
PlayStation 1 · Mega Drive · Master System · Game Gear · Atari 2600 · **PlayStation 2 (experimental)**

### Sobre la PS2
EmulatorJS no tiene núcleo de PS2, así que la sección PS2 abre **Play!** (https://playjs.purei.org),
un emulador de PS2 de código abierto compilado a WebAssembly. Ahí se carga el .iso/.chd del juego.
Es experimental: la PS2 es muy pesada para un navegador, muchos juegos van lentos o no arrancan.
Para jugar PS2 de forma fluida se usa una app nativa (por ejemplo NetherSX2 en Android o PCSX2 en PC).

## Cómo funciona
- **index.html**: estructura de la página.
- **style.css**: diseño (tema arcade oscuro, adaptable a celular).
- **app.js**: la lógica:
  - Detecta la consola por la extensión del archivo (.nes, .gba, .n64, …). Si es .zip/.bin/.iso, pregunta.
  - Guarda los juegos en **IndexedDB** (base de datos del navegador), así siguen ahí al volver.
  - Biblioteca con filtro por consola, buscador, ordenada por "jugado recientemente".
  - Al tocar un juego carga **EmulatorJS** (emuladores libretro compilados a WebAssembly)
    con el núcleo de esa consola. Trae controles táctiles, soporte de mando y partidas guardadas.

## Publicarla gratis (GitHub Pages)
1. Crea un repositorio en GitHub y sube `index.html`, `style.css` y `app.js`.
2. Settings → Pages → Source: "Deploy from a branch" → rama `main`, carpeta `/ (root)` → Save.
3. En 1–2 minutos te da un link tipo `https://tuusuario.github.io/tu-repo/`.

> No funciona bien abriendo el archivo con doble clic (file://). Ábrela desde GitHub Pages
> o con un servidor local: `npx serve` dentro de la carpeta.

## Juegos para probar (legales)
Usa copias de juegos que tengas, o juegos **homebrew** gratis y legales, por ejemplo
en itch.io (busca "NES homebrew" o "GBA homebrew").
