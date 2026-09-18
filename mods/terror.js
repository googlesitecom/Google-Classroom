/* ============================================================
 *  Mod: TERROR  (tienda de mods de JEFFCRAFT)
 * ------------------------------------------------------------
 *  Convierte tu mundo en una pesadilla (por un rato).
 *    /terror      -> activa o desactiva el modo terror
 *    V            -> lo mismo sin abrir el chat
 *
 *  Que hace: noche perpetua con tormenta, ceguera que va y
 *  viene, sonidos de cuevas y susurros, mensajes inquietantes
 *  en el chat, apariciones de "JEFF" a tus espaldas y un velo
 *  oscuro que late como un corazon.
 * ============================================================ */
(function () {
  "use strict";

  var ACTIVO = false;
  var TICS = 0;
  var PROXIMO_SUSURRO = 0;    // tic del siguiente evento de sonido
  var PROXIMO_JEFF = 0;       // tic de la siguiente aparicion
  var PROXIMO_MENSAJE = 0;    // tic del siguiente mensaje de chat
  var TECLA_V = 47;  // codigo Eagler/LWJGL de la tecla V
  var YA_CARGADO = false;

  var SONIDOS = [
    "ambient.cave",
    "mob.endermen.idle",
    "mob.wolf.growl",
    "mob.ghast.scream",
    "random.wood_click",
    "mob.zombie.ambient",
    "mob.bat.takeoff"
  ];

  var MENSAJES = [
    "No estas solo...",
    "Algo te observa desde la oscuridad.",
    "Escuchaste eso?",
    "Las antorchas se apagan...",
    "JEFF estuvo aqui.",
    "No mires atras.",
    "El bosque susurra...",
    "Algo se mueve entre los arboles...",
    "Tu corazon late muy fuerte...",
    "Ya no se oyen los pasos..."
  ];

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
    try {
      var p = ModAPI.player;
      if (!p) return null;
      var yaw = (p.yaw || 0) * Math.PI / 180;
      var pitch = (p.pitch || 0) * Math.PI / 180;
      var cp = Math.cos(pitch);
      return { x: -Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
    } catch (e) { return null; }
  }

  function num(n) {
    var s = (Math.round(n * 100) / 100).toString();
    if (s.indexOf(".") === -1) s += ".0";
    return s;
  }

  function nombreJugador() {
    try {
      var p = ModAPI.player;
      if (p && typeof p.getName === "function") return p.getName();
    } catch (e) {}
    return "@p";
  }

  function azar(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function nombreJugador() {
    try {
      var p = ModAPI.player;
      if (p && typeof p.getName === "function") return p.getName();
    } catch (e) {}
    return "@p";
  }

  function toast(mensaje, segundos) {
    try {
      var t = document.createElement("div");
      t.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:99999;" +
        "max-width:360px;padding:10px 14px;color:#fff;" +
        "background:rgba(16,8,10,0.9);border:2px solid #8a1f1f;border-radius:6px;" +
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

  // ---------------- velo oscuro (latido) ----------------

  var velo = null;
  var latido = null;

  function crearVelo() {
    if (velo) return;
    velo = document.createElement("div");
    velo.id = "mod-terror-velo";
    velo.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;z-index:99990;" +
      "pointer-events:none;user-select:none;opacity:0;" +
      "background:radial-gradient(ellipse at center," +
      " rgba(0,0,0,0) 34%, rgba(8,2,4,0.55) 72%, rgba(4,0,2,0.92) 100%);" +
      "transition:opacity 0.8s ease;";
    document.body.appendChild(velo);
  }

  function veloOn(on) {
    if (!velo) return;
    velo.style.opacity = on ? "1" : "0";
    if (on && !latido) {
      // latido: el velo respira cada ~2.4 s
      var fuerte = false;
      latido = setInterval(function () {
        if (!ACTIVO || !velo) return;
        fuerte = !fuerte;
        velo.style.opacity = fuerte ? "1" : "0.72";
      }, 1200);
    } else if (!on && latido) {
      clearInterval(latido);
      latido = null;
    }
  }

  // ---------------- eventos de terror ----------------

  function susurro() {
    var s = SONIDOS[azar(0, SONIDOS.length - 1)];
    cmd("/playsound " + s + " " + nombreJugador() + " ~ ~ ~ " +
        num(azar(15, 30) / 10) + " " + num(azar(4, 9) / 10));
    PROXIMO_SUSURRO = TICS + azar(300, 900); // 15-45 s
  }

  function mensajeChat() {
    var m = MENSAJES[azar(0, MENSAJES.length - 1)].replace(/"/g, "");
    // mensaje real dentro del chat del juego (rojo oscuro)
    cmd("/tellraw " + nombreJugador() + " {\"text\":\"" + m + "\",\"color\":\"dark_red\"}");
    PROXIMO_MENSAJE = TICS + azar(600, 1600); // 30-80 s
  }

  function aparicionJeff() {
    var p = ModAPI.player;
    var l = mira();
    if (p && l) {
      // aparece DETRAS del jugador (contrario a la mirada), a 3 bloques
      var x = p.x - l.x * 3.2;
      var z = p.z - l.z * 3.2;
      var y = p.y || 0;
      cmd("/summon Zombie " + num(x) + " " + num(y) + " " + num(z) +
          " {CustomName:\"JEFF\",CustomNameVisible:1b}");
      cmd("/playsound mob.endermen.portal " + nombreJugador() + " ~ ~ ~ 3 0.5");
      cmd("/effect " + nombreJugador() + " 15 3 1"); // ceguera brevisima de susto
    }
    PROXIMO_JEFF = TICS + azar(1400, 2600); // 70-130 s
  }

  function pulsoCeguera() {
    // ceguera suave que va y viene cada ~12 s
    cmd("/effect " + nombreJugador() + " 15 12 0");
  }

  // ---------------- activar / desactivar ----------------

  function activar(on) {
    ACTIVO = on;
    crearVelo();
    veloOn(on);
    if (on) {
      TICS = 0;
      PROXIMO_SUSURRO = azar(60, 160);
      PROXIMO_MENSAJE = azar(100, 300);
      PROXIMO_JEFF = azar(400, 700);
      var j = nombreJugador();
      cmd("/time set 18000");       // noche profunda
      cmd("/weather thunder");      // tormenta
      cmd("/playsound mob.enderdragon.growl " + j + " ~ ~ ~ 3 0.4");
      cmd("/tellraw " + j + " {\"text\":\"El modo TERROR ha comenzado...\",\"color\":\"dark_red\",\"bold\":true}");
      toast("MODO TERROR ACTIVO. No mires atras. (/terror para terminar)", 6);
    } else {
      var j2 = nombreJugador();
      cmd("/effect " + j2 + " 15 0");       // quitar ceguera
      cmd("/effect " + j2 + " 9 0");
      cmd("/weather clear");
      cmd("/tellraw " + j2 + " {\"text\":\"La luz vuelve. Por ahora.\",\"color\":\"gray\"}");
      toast("Modo terror desactivado.", 4);
    }
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
          toast("Este mundo se creo sin trucos: crea uno nuevo con \"Permitir trucos: Si\" para el modo terror completo.", 10);
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
      crearVelo();
      toast("Mod TERROR listo. Escribe /terror si te atreves.", 6);
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        if (msg === "/terror" || msg === "/terror on" || msg === "/terror off") {
          ev.preventDefault = true;
          activar(msg.indexOf("off") !== -1 ? false : !ACTIVO);
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("key", function (ev) {
      try {
        if (!enMundo()) return;
        var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
        if (String(k) === String(TECLA_V)) activar(!ACTIVO);
      } catch (e) {}
    });

    ModAPI.addEventListener("update", function () {
      try {
        if (!ACTIVO || !enMundo()) return;
        TICS++;
        // mantener la atmosfera
        if (TICS % 240 === 0) { cmd("/time set 18000"); }         // que no amanezca
        if (TICS % 600 === 0) { cmd("/weather thunder"); }
        if (TICS % 240 === 120) { pulsoCeguera(); }
        // eventos aleatorios
        if (TICS >= PROXIMO_SUSURRO) susurro();
        if (TICS >= PROXIMO_MENSAJE) mensajeChat();
        if (TICS >= PROXIMO_JEFF) aparicionJeff();
      } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:terror] error:", e);
  }
})();
