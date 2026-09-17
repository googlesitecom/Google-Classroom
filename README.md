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

1. La **primera vez que entras al sitio** te aparecera un panel de **"Mods
   requeridos"**: todos los jugadores nuevos deben descargar los mods del sitio
   antes de poder jugar (se descargan una sola vez y se guardan en tu
   navegador).
2. Dentro del juego, pulsa el boton **"Mods"** (aparece en el menu principal y
   tambien en el menu de pausa dentro de una partida).
3. Se abrira el **Gestor de Mods**, donde puedes:
   - **Subir archivo (.js o .jar)...** -> elegir un archivo `.js` o `.jar` de tu
     computadora (equivale a meter un `.jar` en la carpeta `mods` del Java
     normal).
   - **Anadir nuevo (URL o .jar)** -> instalar un mod desde una direccion web
     (si la URL termina en `.jar` se descarga y se extrae el mod de dentro).
   - **[X]** -> eliminar un mod de la lista.
   - **Actualizar lista** -> refrescar el estado (CARGADO / FALLO).
4. Los mods instalados se guardan en tu navegador y se cargan solos cada vez
   que abras el juego. Para quitar por completo un mod eliminado, recarga la
   pagina.

### Sobre los mods .jar

- Los `.jar` son archivos ZIP: el gestor abre el `.jar`, busca el mod `.js` que
  lleva dentro (con preferencia a `mod.js`) y lo instala.
- Los `.jar` de **Java real** (los de Forge, que contienen archivos `.class`)
  **NO funcionan** en la version del navegador, porque el juego esta compilado
  a JavaScript y no hay maquina virtual de Java. Si intentas subir uno, el
  gestor te avisara con un mensaje claro.
- Para convertir un mod de Java real tendrias que reescribirlo en JavaScript
  usando la ModAPI (ver mas abajo).

### Paquete de mods obligatorio (para todos los jugadores)

Los archivos del paquete que debe descargar todo jugador nuevo estan en
`mods/mods.json`:

```json
{
  "version": 1,
  "nombre": "Paquete de mods del sitio",
  "mods": [
    { "archivo": "fps.js", "nombre": "Contador de FPS" },
    { "archivo": "bienvenida.js", "nombre": "Mensajes de bienvenida" }
  ]
}
```

Para agregar un mod al paquete de todos los jugadores:

1. Sube el archivo `.js` (o un `.jar` con el `.js` dentro) a la carpeta `mods/`.
2. Agrega su entrada en `mods/mods.json`.
3. **Sube el numero `version`** (por ejemplo de `1` a `2`): asi los jugadores que
   ya entraron antes veran de nuevo el panel y descargaran la actualizacion.

Este repo ya incluye 2 mods de ejemplo en el paquete (los puedes borrar de
`mods/mods.json` si no los quieres obligatorios):

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
index.html     Pagina principal (carga el juego y exige el paquete de mods)
classes.js     El juego (EaglercraftX 1.8.8 + EaglerForge v1.3.2 inyectado)
ModAPI.js      Nucleo de la API de mods (eventos)
ModLoader.js   Cargador de mods (URLs, archivos subidos y mods guardados)
ModGUI.js      Gestor de Mods (interfaz en espanol, sube .js y .jar)
modpack.js     Paquete obligatorio + almacen de mods + lector de .jar
assets.epk     Recursos del juego (texturas, sonidos)
lang/          Traducciones del juego (incluye es_MX, es_ES, es_AR, etc.)
mods/          Mods del paquete + mods.json (manifiesto)
```

## Notas

- La version anterior de este repo (cliente unico en un solo index.html,
  EaglercraftX u39 "ultimate") sigue disponible en el historial de Git por si
  la necesitas.
- Los mods tienen control total sobre el juego: solo instala mods en los que
  confies.
- Para multiplayer usa los relays de lax1dude ya configurados, o conectate a
  servidores compatibles con Eaglercraft. El panel de mods obligatorio aplica
  al entrar al **sitio**; en multijugador, cada jugador debe haber entrado al
  sitio para tener los mods instalados (no se pueden forzar mods desde un
  servidor estatico).
