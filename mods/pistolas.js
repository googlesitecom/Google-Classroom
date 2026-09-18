/* ============================================================
 *  Mod: PISTOLAS  (tienda de mods de JEFFCRAFT)
 * ------------------------------------------------------------
 *  Convierte tu mundo en un campo de tiro.
 *    /pistola        -> activa o desactiva el modo pistola
 *    R               -> disparar (mientras el modo esta activo)
 *    G               -> recargar (24 balas por cargador)
 *    /pistolas ayuda -> ver la ayuda
 *
 *  Las balas son flechas reales del juego: vuelan, se clavan y
 *  danan a los mobs que tocan. Sonido de disparo y HUD con
 *  la municion incluidos.
 * ============================================================ */
(function () {
  "use strict";

  var MODO = false;
  var BALAS = 24;
  var MAX_BALAS = 24;
  var RECARGANDO = 0;      // tics restantes de recarga
  var ENFRIAMIENTO = 0;    // tics entre disparos
  var DISPAROS = 0;
  var YA_CARGADO = false;  // el evento load puede dispararse mas de una vez

  var TECLA_R = 19;  // disparar (codigo de tecla Eagler/LWJGL)
  var TECLA_G = 34;  // recargar

  // ---------------- utilidades ----------------

  function enMundo() {
    try { return !!(window.Minecraft && Minecraft.$theWorld); } catch (e) { return false; }
  }

  function cmd(c) {
    try {
      if (ModAPI.network && ModAPI.network.sendPacketChatMessage) {
        ModAPI.network.sendPacketChatMessage({ messageIn: c });
      }
    } catch (e) {}
  }

  function mira() {
    // vector de vision calculado desde yaw/pitch del jugador
    try {
      var p = ModAPI.player;
      if (!p) return null;
      var yaw = (p.yaw || 0) * Math.PI / 180;
      var pitch = (p.pitch || 0) * Math.PI / 180;
      var cp = Math.cos(pitch);
      return { x: -Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
    } catch (e) { return null; }
  }

  function nombreJugador() {
    try {
      var p = ModAPI.player;
      if (p && typeof p.getName === "function") return p.getName();
    } catch (e) {}
    return "@p"; // respaldo (el selector falla en algunos mundos)
  }

  function num(n) {
    // numero con punto decimal y 2 decimales, seguro para NBT
    var s = (Math.round(n * 100) / 100).toString();
    if (s.indexOf(".") === -1) s += ".0";
    return s;
  }

  function toast(mensaje, segundos) {
    try {
      var t = document.createElement("div");
      t.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:99999;" +
        "max-width:360px;padding:10px 14px;color:#fff;" +
        "background:rgba(20,26,34,0.9);border:2px solid #eeb13e;border-radius:6px;" +
        "font:14px sans-serif;text-shadow:1px 1px 2px #000;" +
        "box-shadow:0 4px 12px rgba(0,0,0,0.5);pointer-events:none;user-select:none;";
      t.textContent = mensaje;
      document.body.appendChild(t);
      setTimeout(function () {
        t.style.transition = "opacity 0.6s ease";
        t.style.opacity = "0";
        setTimeout(function () { t.remove(); }, 700);
      }, (segundos || 5) * 1000);
    } catch (e) {}
  }

  // ---------------- HUD ----------------

  var hud = null;
  function hudVisible(v) {
    if (hud) hud.style.display = v ? "block" : "none";
  }
  function pintaHUD() {
    if (!hud) return;
    var texto;
    if (RECARGANDO > 0) {
      var pct = Math.round(100 - (RECARGANDO / 30) * 100);
      texto = "PISTOLA \u25CF RECARGANDO " + pct + "%";
    } else if (BALAS <= 0) {
      texto = "PISTOLA \u25CF SIN BALAS (pulsa G)";
    } else {
      texto = "PISTOLA \u25CF " + BALAS + "/" + MAX_BALAS;
    }
    hud.textContent = texto;
    hud.style.color = RECARGANDO > 0 ? "#eeb13e" : (BALAS <= 0 ? "#ff6a6a" : "#eaf2ff");
  }

  function crearHUD() {
    if (hud) return;
    hud = document.createElement("div");
    hud.id = "mod-pistolas-hud";
    hud.style.cssText =
      "position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:99998;" +
      "padding:5px 14px;color:#eaf2ff;font:bold 15px monospace;" +
      "text-shadow:2px 2px 0 #000;background:rgba(10,14,20,0.55);" +
      "border:1px solid rgba(238,177,62,0.55);border-radius:4px;" +
      "pointer-events:none;user-select:none;letter-spacing:1px;";
    document.body.appendChild(hud);
    hudVisible(false);
  }

  // ---------------- acciones ----------------

  function disparar() {
    if (RECARGANDO > 0 || ENFRIAMIENTO > 0) return;
    if (BALAS <= 0) {
      cmd("/playsound random.click " + nombreJugador() + " 1 0.5");
      toast("Sin balas. Pulsa G para recargar.", 2);
      return;
    }
    var p = ModAPI.player;
    var l = mira();
    if (!p || !l) return;
    BALAS--;
    DISPAROS++;
    ENFRIAMIENTO = 5; // 0.25 s entre disparos
    // bala: flecha desde los ojos con la direccion de la mirada
    var ox = p.x, oy = (p.y || 0) + 1.4, oz = p.z;
    var vx = l.x * 3.2, vy = l.y * 3.2, vz = l.z * 3.2;
    cmd("/summon Arrow " + num(ox) + " " + num(oy) + " " + num(oz) +
        " {Motion:[" + num(vx) + "," + num(vy) + "," + num(vz) + "],pickup:0b}");
    // sonido de disparo (arco grave + golpe)
    var j = nombreJugador();
    cmd("/playsound random.bow " + j + " ~ ~ ~ 2 0.3");
    cmd("/playsound random.explode " + j + " ~ ~ ~ 0.4 1.6");
    pintaHUD();
    if (DISPAROS === 1) toast("Bala disparada. Las flechas son tus balas.", 3);
  }

  function recargar() {
    if (BALAS >= MAX_BALAS || RECARGANDO > 0) return;
    RECARGANDO = 30; // 1.5 s
    cmd("/playsound random.click " + nombreJugador() + " ~ ~ ~ 1 0.6");
    pintaHUD();
  }

  function activar(on) {
    MODO = on;
    hudVisible(on);
    if (on) {
      cmd("/give " + nombreJugador() + " minecraft:iron_hoe 1 0 {display:{Name:\"Pistola JEFF\"}}");
      toast("Modo PISTOLA activado. R = disparar \u00b7 G = recargar \u00b7 /pistola para apagar.", 6);
      pintaHUD();
    } else {
      toast("Modo PISTOLA desactivado.", 3);
    }
  }

  function ayuda() {
    toast("/pistola activa el modo. R dispara, G recarga (24 balas).", 6);
  }

  // ---------------- comandos ----------------

  function manejarComando(partes) {
    var sub = (partes[0] || "").toLowerCase();
    if (sub === "ayuda" || sub === "help") { ayuda(); return; }
    if (sub === "balas") { BALAS = MAX_BALAS; RECARGANDO = 0; pintaHUD(); toast("Cargador lleno.", 2); return; }
    activar(!MODO);
  }

  // ---------------- arranque ----------------

  var avisoPermisos = false;
  function vigilarPermisos() {
    try {
      ModAPI.addEventListener("packetchat", function (ev) {
        if (avisoPermisos) return;
        var t = String((ev && (ev.chat || ev.message)) || "");
        if (t.indexOf("permission") !== -1 || t.indexOf("permiso") !== -1) {
          avisoPermisos = true;
          toast("Este mundo se creo sin trucos: crea uno nuevo con \"Permitir trucos: Si\" para que la pistola dispare de verdad.", 10);
        }
      });
    } catch (e) {}
  }

  try {
    if (!window.ModAPI || typeof ModAPI.addEventListener !== "function") return;
    vigilarPermisos();

    ModAPI.addEventListener("load", function () {
      if (YA_CARGADO) return;
      YA_CARGADO = true;
      try { ModAPI.require("player"); } catch (e) {}
      try { ModAPI.require("network"); } catch (e) {}
      crearHUD();
      toast("Mod PISTOLAS listo. Escribe /pistola para armarte.", 6);
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        if (msg === "/pistola" || msg === "/pistolas" ||
            msg.indexOf("/pistola ") === 0 || msg.indexOf("/pistolas ") === 0) {
          ev.preventDefault = true;
          manejarComando(msg.slice(1).split(/\s+/).slice(1));
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("key", function (ev) {
      try {
        if (!MODO || !enMundo()) return;
        var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
        k = String(k);
        if (k === String(TECLA_R)) {
          disparar();
        } else if (k === String(TECLA_G)) {
          recargar();
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("update", function () {
      try {
        if (ENFRIAMIENTO > 0) ENFRIAMIENTO--;
        if (RECARGANDO > 0) {
          RECARGANDO--;
          if (RECARGANDO === 0) {
            BALAS = MAX_BALAS;
            cmd("/playsound random.click " + nombreJugador() + " ~ ~ ~ 1 1.4");
            pintaHUD();
          }
        }
        // si sales al menu, ocultar el HUD
        if (MODO && !enMundo()) hudVisible(false);
        else if (MODO && hud && hud.style.display === "none") hudVisible(true);
      } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:pistolas] error:", e);
  }
})();
