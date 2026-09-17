# Minecraft 1.8.8 con soporte de Mods (EaglercraftX + EaglerForge)

Minecraft Java Edition 1.8.8 jugable en Chromebook, Mac y Windows, ahora con
**soporte de mods en JavaScript**, igual que se le instalan mods al Java normal.

El multijugador fue posible gracias a lax1dude y ayunami2000.
El sistema de mods (EaglerForge) fue creado por ZXMushroom63, radmanplays y la
comunidad de EaglerForge.

## Como jugar

Sube esta carpeta a cualquier hosting estatico (GitHub Pages, un servidor web,
etc.) y abre `index.html` mediante HTTP. No funciona abriendo el archivo
directamente desde el disco.

## Como meterle mods (como en el Java normal)

1. Abre el juego y pulsa el boton **"Mods"** (aparece en el menu principal y
   tambien en el menu de pausa dentro de una partida).
2. Se abrira el **Gestor de Mods**, donde puedes:
   - **Subir archivo...** -> elegir un archivo `.js` de tu computadora (equivale
     a meter un `.jar` en la carpeta `mods` del Java normal).
   - **Anadir nuevo (URL)** -> instalar un mod desde una direccion web.
   - **[X]** -> eliminar un mod de la lista.
   - **Actualizar lista** -> refrescar el estado (CARGADO / FALLO).
3. Los mods instalados se guardan en tu navegador y se cargan solos cada vez
   que abras el juego. Para quitar por completo un mod eliminado, recarga la
   pagina.

Este repo ya incluye 2 mods de ejemplo (se instalan automaticamente la primera
vez que entras, y los puedes borrar desde el Gestor de Mods):

| Mod | Que hace |
| --- | --- |
| `mods/fps.js` | Contador de FPS en la esquina (pulsa **F6** para ocultarlo) |
| `mods/bienvenida.js` | Avisos al cargar los mods y bienvenida al entrar a un mundo |

## Como escribir tus propios mods

Un mod es simplemente un archivo `.js` que usa la `ModAPI` de EaglerForge.
Ejemplo minimo (`mi-mod.js`):

```js
// se ejecuta en cada tic del juego
ModAPI.addEventListener("update", function () {
  // tu codigo aqui
});

// se ejecuta al terminar de cargar todos los mods
ModAPI.addEventListener("load", function () {
  console.log("Mi mod esta listo!");
});

// reacciona a las teclas que pulses en el juego
ModAPI.addEventListener("key", function (ev) {
  console.log("Tecla:", ev.key);
});
```

Eventos disponibles (los mas utiles): `load`, `update`, `frame`, `drawhud`,
`key`, `gui`, `sendchatmessage`, `motionupdate`, `premotionupdate`,
`postmotionupdate`, `packetchat`, y eventos `sendpacket*` para inspeccionar
paquetes salientes.

Objetos utiles:
- `window.Minecraft` -> instancia del juego (por ejemplo
  `Minecraft.$thePlayer`, `Minecraft.$theWorld`).
- `ModAPI.mcinstance` -> lo mismo, dentro de la ModAPI.
- `ModAPI.events.callEvent(nombre, datos)` -> para disparar tus propios
  eventos entre mods.

Documentacion completa de la API (en ingles):
<https://eaglerforge.github.io/>

## Estructura del repo

```
index.html     Pagina principal (carga el juego y preinstala los mods de ejemplo)
classes.js     El juego (EaglercraftX 1.8.8 + EaglerForge v1.3.2 inyectado)
ModAPI.js      Nucleo de la API de mods (eventos)
ModLoader.js   Cargador de mods (URLs y archivos subidos)
ModGUI.js      Gestor de Mods (interfaz en espanol)
assets.epk     Recursos del juego (texturas, sonidos)
lang/          Traducciones del juego (incluye es_MX, es_ES, es_AR, etc.)
mods/          Mods de ejemplo incluidos
```

## Notas

- La version anterior de este repo (cliente unico en un solo index.html,
  EaglercraftX u39 "ultimate") sigue disponible en el historial de Git por si
  la necesitas.
- Los mods tienen control total sobre el juego: solo instala mods en los que
  confies.
- Para multiplayer usa los relays de lax1dude ya configurados, o conectate a
  servidores compatibles con Eaglercraft.
