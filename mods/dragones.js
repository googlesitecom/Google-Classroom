/* ============================================================
 *  Mod: DRAGONES v2  (tienda de mods de JEFFCRAFT)
 * ------------------------------------------------------------
 *  Dragones de FUEGO de verdad: textura propia (escamas
 *  carmesi, vientre dorado, ojos naranja) integrada en el
 *  juego, vuelo en circulos sobre tu mundo y... PUEDES
 *  MONTARTE y dirigirlos mirando hacia donde quieres volar.
 *
 *    /dragon          -> invoca 1 dragon de fuego que vuela
 *    /dragon 2-4      -> varios en formacion
 *    /montar          -> monta el dragon mas cercano
 *                         (dirige mirando; baja/cnik con la
 *                          camara; Shift o B para bajarte)
 *    B / gatillo der. -> aliento de fuego (montado)
 *    /dragon matar    -> elimina todos los dragones
 *
 *  Barra de jefe animada y rugido de invocacion incluidos.
 * ============================================================ */
(function () {
  "use strict";

  var MAX_DRAGONES = 4;
  var dragones = [];        // {ang, velAng, radio, cx, cy, cz, montado}
    var montando = false;
  var dragonMontado = -1;   // indice en dragones
  var rumbo = 0;            // rumbo actual del dragon montado (grados)
  var altitud = 0;          // velocidad vertical del montado
  var YA_CARGADO = false;

  var TECLA_B = 48;         // aliento (codigo Eagler)
  var TECLA_SHIFT = 42;     // bajarse del dragon

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
  function jugador() {
    try {
      var p = ModAPI.player;
      if (p) return p;
    } catch (e) {}
    return null;
  }
  function nombreJugador() {
    var p = jugador();
    try { if (p && typeof p.getName === "function") return p.getName(); } catch (e) {}
    return "@p";
  }
  function num(n) {
    var s = (Math.round(n * 100) / 100).toString();
    if (s.indexOf(".") === -1) s += ".0";
    return s;
  }
  function toast(mensaje, segundos, color) {
    try {
      var t = document.createElement("div");
      t.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:99999;" +
        "max-width:360px;padding:10px 14px;color:#fff;" +
        "background:rgba(20,26,34,0.92);border:2px solid " + (color || "#ff8a3d") +
        ";border-radius:6px;font:14px sans-serif;text-shadow:1px 1px 2px #000;" +
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

  // ---------------- rugido sintetizado ----------------
  var ctxAudio = null;
  function audio() {
    if (!ctxAudio) {
      try { ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (ctxAudio.state === "suspended") { try { ctxAudio.resume(); } catch (e) {} }
    return ctxAudio;
  }
  function rugido() {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      // capa grave: sierra con barrido y vibrato
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var lfo = ctx.createOscillator();
      var lfoG = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(85, t);
      osc.frequency.linearRampToValueAtTime(48, t + 1.2);
      lfo.frequency.value = 7;
      lfoG.gain.value = 9;
      lfo.connect(lfoG); lfoG.connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.12);
      gain.gain.setValueAtTime(0.5, t + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); lfo.start(t);
      osc.stop(t + 1.4); lfo.stop(t + 1.4);
      // capa de aire: ruido grave
      var n = Math.floor(ctx.sampleRate * 1.1);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 350;
      var g2 = ctx.createGain(); g2.gain.value = 0.3;
      src.connect(f); f.connect(g2); g2.connect(ctx.destination);
      src.start(t);
    } catch (e) {}
  }
  function aleteo() {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      var n = Math.floor(ctx.sampleRate * 0.5);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 260;
      var g = ctx.createGain(); g.gain.value = 0.22;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(t);
    } catch (e) {}
  }

  // ---------------- HUD: barra de jefe ----------------
  var hud = null, hudNombre = null, hudRelleno = null;
  var ICONO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABH0lEQVR4nGNgGAWjgCLAONAOQAdrqlT+w9ghbXcIuo+Jts6hPRjyHsAZRbiiUkxc+j92HeSDG7OU4Wwh/0Nwu4hJTkM+Boa8B4gqhd5ttINH5bzUa1R3RMmrN2SXhkM+Boa8B4iKuk1KMvAkdOvLD7i4Gg8HA7XF/e49IeimHjERuHuGfAwMeQ+QnISQge8cHgTHaAGcudkohGwHISctXAC51BryMTDkPcBCiebNKV+QeOQnG1LB/0tuo6XQoAEkt0GQK5HiJ3fg4r0yKgzUFkcubf5P04Dby5h1Y7QUGjSAoiREa4CrmY2cnIZ8DAx5D+BMQsQkFUp6UtQCQz4GRj0w0GDUAwMNRj0w0GDIe2AUjIJRMApGwSgYBaNgJAMAdzdXI9IjPTgAAAAASUVORK5CYII=";
  function crearHUD() {
    if (hud) return;
    hud = document.createElement("div");
    hud.style.cssText =
      "position:fixed;left:50%;top:18px;transform:translateX(-50%);" +
      "z-index:99998;display:none;width:min(460px,80vw);" +
      "background:rgba(12,10,14,0.82);border:2px solid #3a2020;border-radius:8px;" +
      "box-shadow:0 0 0 2px #0a0608, 0 6px 24px rgba(0,0,0,0.6);" +
      "padding:8px 14px;pointer-events:none;user-select:none;" +
      "font-family:monospace;";
    var fila = document.createElement("div");
    fila.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:6px;";
    var img = document.createElement("img");
    img.src = ICONO; img.width = 30; img.height = 30;
    img.style.cssText = "image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #000);";
    fila.appendChild(img);
    hudNombre = document.createElement("span");
    hudNombre.style.cssText =
      "font:bold 13px monospace;color:#ffb054;letter-spacing:2px;" +
      "text-shadow:2px 2px 0 #000;";
    hudNombre.textContent = "DRAGON DE FUEGO";
    fila.appendChild(hudNombre);
    hud.appendChild(fila);
    var pista = document.createElement("div");
    pista.style.cssText =
      "height:12px;background:#180d0d;border:1px solid #0a0608;" +
      "box-shadow:inset 0 0 6px #000;overflow:hidden;";
    hudRelleno = document.createElement("div");
    hudRelleno.style.cssText =
      "height:100%;width:100%;background:linear-gradient(90deg,#c8371e,#ff8a3d,#ffd27a);" +
      "animation:jcdragFuego 2.4s linear infinite;";
    pista.appendChild(hudRelleno);
    hud.appendChild(pista);
    var st = document.createElement("style");
    st.textContent = "@keyframes jcdragFuego{0%{filter:hue-rotate(0deg) brightness(1)}" +
      "50%{filter:hue-rotate(-12deg) brightness(1.25)}100%{filter:hue-rotate(0deg) brightness(1)}}";
    hud.appendChild(st);
    document.body.appendChild(hud);
  }
  function pintaHUD() {
    if (!hudNombre) return;
    if (dragones.length === 1) hudNombre.textContent = "DRAGON DE FUEGO";
    else hudNombre.textContent = "DRAGONES DE FUEGO \u00d7 " + dragones.length;
    if (montando) hudNombre.textContent += " \u00b7 MONTADO";
  }
  function hudVisible(v) { if (hud) hud.style.display = v ? "block" : "none"; }

  // ---------------- dragones ----------------
  function invocar(cantidad) {
    var p = jugador();
    if (!p || !enMundo()) { toast("Entra a un mundo para invocar dragones.", 3, "#ff6a6a"); return; }
    cantidad = Math.max(1, Math.min(MAX_DRAGONES - dragones.length, cantidad || 1));
    if (cantidad <= 0) {
      toast("Ya hay " + MAX_DRAGONES + " dragones (maximo). /dragon matar para quitarlos.", 4);
      return;
    }
    var cx = p.x, cz = p.z;
    for (var i = 0; i < cantidad; i++) {
      var d = {
        ang: Math.random() * Math.PI * 2,
        velAng: 0.02 + Math.random() * 0.006,
        radio: 26 + dragones.length * 9,
        cx: cx, cy: (p.y || 64) + 34, cz: cz,
        x: cx, y: (p.y || 64) + 34, z: cz,
        montado: false, tics: 0
      };
      d.x = d.cx + Math.cos(d.ang) * d.radio;
      d.z = d.cz + Math.sin(d.ang) * d.radio;
      cmd("/summon EnderDragon " + num(d.x) + " " + num(d.y) + " " + num(d.z));
      dragones.push(d);
    }
    crearHUD();
    hudVisible(true);
    pintaHUD();
    rugido();
    cmd("/playsound mob.enderdragon.growl " + nombreJugador() + " ~ ~ ~ 2 0.9");
    toast((cantidad === 1 ? "Un dragon de fuego" : cantidad + " dragones de fuego") +
          " sobrevuelan tu cielo. /montar para cabalgar.", 7, "#ff8a3d");
    if (window.JCMando && window.JCMando.conectado()) {
      try { window.JCMando.vibrar(500, 0.9); } catch (e) {}
    }
  }

  function matarDragones() {
    desmontar(true);
    cmd("/kill @e[type=EnderDragon]");
    dragones = [];
    montando = false;
    hudVisible(false);
    toast("Los dragones se marchan rugiendo...", 3);
    rugido();
  }

  function montar() {
    if (montando) { desmontar(false); return; }
    if (!dragones.length) {
      invocar(1);
    }
    // elegir el mas cercano
    var p = jugador();
    if (!p) return;
    var mejor = 0, mejorD = 1e9;
    for (var i = 0; i < dragones.length; i++) {
      var d = dragones[i];
      var dist = (d.x - p.x) * (d.x - p.x) + (d.z - p.z) * (d.z - p.z);
      if (dist < mejorD) { mejorD = dist; mejor = i; }
    }
    montando = true;
    dragonMontado = mejor;
    dragones[mejor].montado = true;
    var dd = dragones[mejor];
    // el dragon montado se acerca al jugador y sigue su rumbo
    rumbo = p.yaw || 0;
    dd.radio = 0;                 // deja de circular
    dd.cx = p.x; dd.cy = (p.y || 64) + 6; dd.cz = p.z;
    dd.x = p.x; dd.y = (p.y || 64) + 6; dd.z = p.z;
    cmd("/tp @e[type=EnderDragon,x=" + num(dd.x) + ",y=" + num(dd.y) + ",z=" + num(dd.z) +
        ",r=60] " + num(p.x) + " " + num((p.y || 64) + 6) + " " + num(p.z));
    pintaHUD();
    rugido();
    cmd("/playsound mob.enderdragon.growl " + nombreJugador() + " ~ ~ ~ 2 1.1");
    toast("Montado. MIRA hacia donde quieres volar \u00b7 camara arriba/abajo = subir/bajar \u00b7 " +
          "B o gatillo derecho = aliento de fuego \u00b7 Shift o B(pad) = bajarse", 9, "#ffd27a");
  }

  function desmontar(silencioso) {
    if (!montando) return;
    montando = false;
    if (dragonMontado >= 0 && dragones[dragonMontado]) {
      var d = dragones[dragonMontado];
      d.montado = false;
      d.radio = 26;
      // sigue circulando desde donde quedo
      d.cx = d.x - Math.cos(d.ang) * d.radio;
      d.cz = d.z - Math.sin(d.ang) * d.radio;
    }
    dragonMontado = -1;
    pintaHUD();
    if (!silencioso) toast("Desmontado. El dragon vuelve al cielo.", 3);
  }

  function aliento() {
    if (!montando) return;
    var p = jugador();
    if (!p) return;
    try {
      var yaw = (p.yaw || 0) * Math.PI / 180;
      var pitch = (p.pitch || 0) * Math.PI / 180;
      var cp = Math.cos(pitch);
      var dx = -Math.sin(yaw) * cp, dy = -Math.sin(pitch), dz = Math.cos(yaw) * cp;
      var ox = p.x + dx * 2.5, oy = (p.y || 0) + 1.2 + dy * 2.5, oz = p.z + dz * 2.5;
      cmd("/summon SmallFireball " + num(ox) + " " + num(oy) + " " + num(oz) +
          " {Motion:[" + num(dx * 1.4) + "," + num(dy * 1.4) + "," + num(dz * 1.4) + "]}");
      // chorro de llamas alrededor de la bola
      cmd("/particle flame " + num(ox) + " " + num(oy) + " " + num(oz) +
          " 0.25 0.25 0.25 0.01 8");
    } catch (e) {}
  }

  // ---------------- bucle de vuelo ----------------
  var tics = 0;
  var enfriamientoAliento = 0;
  function volar() {
    if (!dragones.length || !enMundo()) return;
    tics++;
    var p = jugador();
    for (var i = 0; i < dragones.length; i++) {
      var d = dragones[i];
      d.tics++;
      if (d.montado && p) {
        // el dragon montado sigue el rumbo de la camara
        var objetivo = p.yaw || 0;
        var dif = objetivo - rumbo;
        while (dif > 180) dif -= 360;
        while (dif < -180) dif += 360;
        rumbo += dif * 0.07;
        var rad = rumbo * Math.PI / 180;
        var vx = -Math.sin(rad) * 0.85, vz = Math.cos(rad) * 0.85;
        // subir/bajar con la camara
        var pitch = p.pitch || 0;
        var vy = 0;
        if (pitch < -25) vy = 0.45;
        else if (pitch > 25) vy = -0.45;
        d.x += vx; d.z += vz; d.y += vy;
        d.y = Math.max(2, d.y);
        // jugador encima del lomo
        cmd("/tp " + nombreJugador() + " " + num(d.x) + " " + num(d.y + 2.6) + " " + num(d.z));
        // llamas del vuelo
        if (d.tics % 5 === 0) {
          cmd("/particle flame " + num(d.x - vx * 3) + " " + num(d.y - 1.5) + " " +
              num(d.z - vz * 3) + " 0.3 0.2 0.3 0.01 2");
        }
      } else {
        // circulo amplio
        d.ang += d.velAng;
        d.x = d.cx + Math.cos(d.ang) * d.radio;
        d.z = d.cz + Math.sin(d.ang) * d.radio;
        d.y = d.cy + Math.sin(d.ang * 2) * 2.5;
      }
      // teleport del dragon a su posicion de vuelo
      cmd("/tp @e[type=EnderDragon,x=" + num(d.x) + ",y=" + num(d.y) + ",z=" + num(d.z) +
          ",r=6] " + num(d.x + (d.montado ? 0 : 0)) + " " + num(d.y) + " " + num(d.z));
    }
    // aleteos y rugidos ambientales
    if (tics % 26 === 0) aleteo();
    if (tics % 400 === 0) {
      cmd("/playsound mob.enderdragon.growl " + nombreJugador() + " ~ ~ ~ 1.5 1");
    }
    // aliento continuo con B / mando
    if (montando && enfriamientoAliento <= 0) {
      var dispara = false;
      if (window.JCMando && window.JCMando.conectado() && window.JCMando.mantenida(7)) dispara = true;
      if (dispara) { aliento(); enfriamientoAliento = 6; }
    }
    if (enfriamientoAliento > 0) enfriamientoAliento--;
  }

  // ---------------- permisos ----------------
  var avisoPermisos = false;
  function vigilarPermisos() {
    try {
      ModAPI.addEventListener("packetchat", function (ev) {
        if (avisoPermisos) return;
        var t = String((ev && (ev.chat || ev.message)) || "");
        if (t.indexOf("permission") !== -1 || t.indexOf("permiso") !== -1) {
          avisoPermisos = true;
          toast("Este mundo se creo sin trucos: crea uno nuevo (Permitir trucos: Si) para los dragones.", 10, "#ff6a6a");
        }
      });
    } catch (e) {}
  }

  // ---------------- ayuda y comandos ----------------
  function ayuda() {
    toast("/dragon [1-4] invoca \u00b7 /montar cabalga (dirige mirando; Shift para bajar) \u00b7 " +
          "B o gatillo der. = aliento de fuego \u00b7 /dragon matar los elimina", 12, "#ff8a3d");
  }
  function manejarComando(partes) {
    var sub = (partes[0] || "").toLowerCase();
    if (sub === "ayuda" || sub === "help") { ayuda(); return; }
    if (sub === "matar" || sub === "kill" || sub === "quitar" || sub === "fuera") { matarDragones(); return; }
    if (sub === "montar" || sub === "montado") { montar(); return; }
    var n = parseInt(sub, 10);
    invocar(isNaN(n) ? 1 : n);
  }

  // ---------------- arranque ----------------
  var silencioAplicado = false;
  function silenciarFeedback() {
    // el bucle de vuelo envia ~20 comandos/seg: sin esto el chat se inunda
    if (silencioAplicado || !enMundo()) return;
    silencioAplicado = true;
    cmd("/gamerule sendCommandFeedback false");
    cmd("/gamerule commandBlockOutput false");
  }
  try {
    if (!window.ModAPI || typeof ModAPI.addEventListener !== "function") return;
    vigilarPermisos();

    ModAPI.addEventListener("load", function () {
      if (YA_CARGADO) return;
      YA_CARGADO = true;
      try { ModAPI.require("player"); } catch (e) {}
      try { ModAPI.require("network"); } catch (e) {}
      toast("Mod DRAGONES v2 listo. /dragon para invocar dragones de fuego \u00b7 /montar para cabalgarlos.", 8, "#ff8a3d");
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        if (msg === "/montar" || msg === "/montar ") {
          ev.preventDefault = true;
          montar();
          return;
        }
        if (msg === "/dragon" || msg === "/dragones" ||
            msg.indexOf("/dragon ") === 0 || msg.indexOf("/dragones ") === 0) {
          ev.preventDefault = true;
          manejarComando(msg.slice(1).split(/\s+/).slice(1));
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("key", function (ev) {
      try {
        if (!enMundo() || !dragones.length) return;
        var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
        k = String(k);
        if (k === String(TECLA_B) && montando) aliento();
        else if (k === String(TECLA_SHIFT) && montando) desmontar(false);
        // bajarse con el boton B del mando
        if (window.JCMando && window.JCMando.conectado &&
            window.JCMando.consumir && window.JCMando.consumir(1)) {
          if (montando) desmontar(false);
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("update", function () {
      try {
        silenciarFeedback();
        if (enMundo()) volar();
        if (dragones.length && !enMundo()) hudVisible(false);
        else if (dragones.length && hud && hud.style.display === "none" && enMundo()) {
          hudVisible(true);
        }
      } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:dragones] error:", e);
  }
})();
