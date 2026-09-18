/* ============================================================
 *  Mod: DRAGONES  (tienda de mods de JEFFCRAFT)
 * ------------------------------------------------------------
 *  Invoca dragones de Ender reales que vuelan sobre tu mundo.
 *    /dragon          -> invoca un dragon (o varios: /dragon 3)
 *    /dragon matar    -> elimina todos los dragones
 *    B                -> aliento de dragon (bola de fuego)
 *    /dragones ayuda  -> ver la ayuda
 *
 *  El dragon es el jefe real del juego: vuela, aletea y rugen
 *  sus sonidos. La barra de jefe aparece cuando le haces dano.
 * ============================================================ */
(function () {
  "use strict";

  var DRAGONES = 0;         // invocados por nosotros (contador)
  var ENFRIAMIENTO = 0;     // tics entre alientos
  var TECLA_B = 48;         // aliento de dragon (codigo Eagler/LWJGL)
  var YA_CARGADO = false;

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

  function nombreJugador() {
    try {
      var p = ModAPI.player;
      if (p && typeof p.getName === "function") return p.getName();
    } catch (e) {}
    return "@p";
  }

  function num(n) {
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
        "background:rgba(20,26,34,0.9);border:2px solid #b06ae8;border-radius:6px;" +
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

  // ---------------- acciones ----------------

  function invocar(cantidad) {
    var p = ModAPI.player;
    if (!p) { toast("Entra a un mundo para invocar dragones.", 3); return; }
    cantidad = Math.max(1, Math.min(6, cantidad || 1));
    for (var i = 0; i < cantidad; i++) {
      // cada dragon nace alto, con un pequeno desfase lateral
      var dx = (i - (cantidad - 1) / 2) * 18;
      cmd("/summon EnderDragon ~" + (dx ? num(dx) : "") + " ~55 ~" +
          " {CustomName:\"Drakon " + (DRAGONES + 1) + "\"}");
      DRAGONES++;
    }
    cmd("/playsound mob.enderdragon.growl " + nombreJugador() + " ~ ~ ~ 2 1");
    toast((cantidad === 1 ? "Un dragon" : cantidad + " dragones") +
          " invocados sobre ti. Cuidado con el aliento (tecla B).", 6);
  }

  function matarDragones() {
    cmd("/kill @e[type=EnderDragon]");
    DRAGONES = 0;
    toast("Dragones eliminados.", 3);
  }

  function aliento() {
    var p = ModAPI.player;
    var l = mira();
    if (!p || !l) return;
    if (ENFRIAMIENTO > 0) return;
    ENFRIAMIENTO = 10; // 0.5 s
    var ox = p.x, oy = (p.y || 0) + 1.6, oz = p.z;
    var mx = l.x * 1.1, my = l.y * 1.1, mz = l.z * 1.1;
    // bola de fuego de ghast: vuela recta y explota al impactar
    cmd("/summon Fireball " + num(ox) + " " + num(oy) + " " + num(oz) +
        " {Motion:[" + num(mx) + "," + num(my) + "," + num(mz) + "],ExplosionPower:1b}");
    cmd("/playsound mob.ghast.fireball " + nombreJugador() + " ~ ~ ~ 2 1");
  }

  function ayuda() {
    toast("/dragon [1-6] invoca dragones \u00b7 /dragon matar los elimina \u00b7 B = aliento de fuego.", 7);
  }

  function manejarComando(partes) {
    var sub = (partes[0] || "").toLowerCase();
    if (sub === "ayuda" || sub === "help") { ayuda(); return; }
    if (sub === "matar" || sub === "kill" || sub === "quitar") { matarDragones(); return; }
    var n = parseInt(sub, 10);
    invocar(isNaN(n) ? 1 : n);
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
          toast("Este mundo se creo sin trucos: crea uno nuevo con \"Permitir trucos: Si\" para poder invocar dragones.", 10);
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
      toast("Mod DRAGONES listo. Escribe /dragon para invocar.", 6);
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        if (msg === "/dragon" || msg.indexOf("/dragones ") === 0 || msg.indexOf("/dragon ") === 0) {
          ev.preventDefault = true;
          manejarComando(msg.slice(1).split(/\s+/).slice(1));
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("key", function (ev) {
      try {
        if (!enMundo() || DRAGONES <= 0) return;
        var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
        if (String(k) === String(TECLA_B)) aliento();
      } catch (e) {}
    });

    ModAPI.addEventListener("update", function () {
      try {
        if (ENFRIAMIENTO > 0) ENFRIAMIENTO--;
      } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:dragones] error:", e);
  }
})();
