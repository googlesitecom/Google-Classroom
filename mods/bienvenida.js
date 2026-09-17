/* ============================================================
 *  Mod: Mensajes de bienvenida  (ejemplo incluido)
 * ------------------------------------------------------------
 *  - Avisa cuando el sistema de mods termina de cargar.
 *  - Da la bienvenida cada vez que entras a un mundo
 *    (un mundo nuevo o un servidor).
 *  - Muestra un recordatorio de donde esta el boton "Mods".
 *
 *  Ejemplo de uso de la ModAPI de EaglerForge:
 *    - ModAPI.addEventListener("load", ...)   -> al cargar los mods
 *    - ModAPI.addEventListener("update", ...) -> cada tic del juego
 * ============================================================ */
(function () {
  "use strict";

  var TOAST_STYLE =
    "position:fixed;right:12px;bottom:12px;z-index:99999;" +
    "max-width:340px;padding:10px 14px;margin-top:8px;" +
    "color:#FFFFFF;background:rgba(20,20,20,0.85);" +
    "border:2px solid #55FF55;border-radius:6px;" +
    "font:14px sans-serif;text-shadow:1px 1px 2px #000;" +
    "box-shadow:0 4px 12px rgba(0,0,0,0.5);" +
    "pointer-events:none;user-select:none;";

  function toast(mensaje, segundos) {
    try {
      var t = document.createElement("div");
      t.style.cssText = TOAST_STYLE;
      t.textContent = mensaje;
      document.body.appendChild(t);
      // desvanecimiento suave
      setTimeout(function () {
        t.style.transition = "opacity 0.6s ease";
        t.style.opacity = "0";
        setTimeout(function () {
          t.remove();
        }, 700);
      }, (segundos || 6) * 1000);
    } catch (e) {}
  }

  var avisoModsMostrado = false;

  try {
    if (window.ModAPI && typeof ModAPI.addEventListener === "function") {
      // 1) Aviso cuando todos los mods terminaron de cargar
      ModAPI.addEventListener("load", function () {
        if (avisoModsMostrado) return;
        avisoModsMostrado = true;
        var total = document.querySelectorAll("script[data-isMod]").length;
        toast("Sistema de mods de JEFFCRAFT listo (" + total + " mods cargados). " +
              "Usa el boton Mods del menu para anadir mas.", 8);
      });

      // 2) Bienvenida al entrar a un mundo / servidor
      var dentroDeMundo = false;
      ModAPI.addEventListener("update", function () {
        try {
          var mc = window.Minecraft || (window.ModAPI && ModAPI.mcinstance);
          if (!mc) return;
          var hayMundo = !!mc.$theWorld;
          if (hayMundo && !dentroDeMundo) {
            dentroDeMundo = true;
            toast("Bienvenido a JEFFCRAFT! Que disfrutes tu partida.", 5);
          } else if (!hayMundo && dentroDeMundo) {
            dentroDeMundo = false; // saliste al menu principal
          }
        } catch (e) {}
      });
    } else {
      console.warn("[mod:bienvenida] ModAPI no disponible todavia.");
    }
  } catch (e) {
    console.error("[mod:bienvenida] error:", e);
  }
})();
