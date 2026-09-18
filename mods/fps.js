/* ============================================================
 *  Mod: Contador de FPS  (ejemplo incluido)
 * ------------------------------------------------------------
 *  Muestra los FPS actuales en la esquina superior izquierda.
 *  Pulsa F6 dentro del juego para mostrarlo u ocultarlo.
 *
 *  Este mod es un ejemplo de como usar la ModAPI de EaglerForge:
 *    - ModAPI.addEventListener("frame", ...)  -> cada fotograma
 *    - ModAPI.addEventListener("key", ...)    -> pulsaciones de tecla
 * ============================================================ */
(function () {
  "use strict";

  var div = document.createElement("div");
  div.id = "mod-fps-counter";
  div.style.cssText =
    "position:fixed;top:8px;left:8px;z-index:99998;" +
    "color:#FFFFFF;font:bold 14px monospace;" +
    "text-shadow:1px 1px 2px #000000;" +
    "background:rgba(0,0,0,0.35);padding:4px 8px;" +
    "border-radius:4px;pointer-events:none;" +
    "user-select:none;";
  div.textContent = "FPS: ...";
  div.title = "Contador de FPS (F6 para ocultar)";
  document.body.appendChild(div);

  var frames = 0;
  var last = Date.now();
  var visible = true;

  // Actualiza el contador una vez por segundo
  setInterval(function () {
    var now = Date.now();
    var elapsed = now - last;
    if (elapsed > 0) {
      var fps = Math.round((frames * 1000) / elapsed);
      div.textContent = "FPS: " + fps;
    }
    frames = 0;
    last = now;
  }, 1000);

  // Cuenta cada fotograma renderizado por el juego
  try {
    if (window.ModAPI && typeof ModAPI.addEventListener === "function") {
      ModAPI.addEventListener("frame", function () {
        frames++;
      });

      // F6 muestra/oculta el contador (codigo de tecla Eagler/LWJGL: 64)
      ModAPI.addEventListener("key", function (ev) {
        try {
          var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
          if (String(k) === "64" || k === 64) {
            visible = !visible;
            div.style.display = visible ? "block" : "none";
          }
        } catch (e) {}
      });
    } else {
      // Sin ModAPI (no deberia ocurrir): usa requestAnimationFrame
      var rafCount = function () {
        frames++;
        window.requestAnimationFrame(rafCount);
      };
      window.requestAnimationFrame(rafCount);
    }
  } catch (e) {
    console.error("[mod:fps] error:", e);
  }
})();
