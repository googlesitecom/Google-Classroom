/* ============================================================
 *  Mod: TERROR v2  (tienda de mods de JEFFCRAFT)
 * ------------------------------------------------------------
 *  El modo terror de verdad:
 *   - Noche perpetua y tormenta electrica
 *   - Niebla que va y viene (pulsos de ceguera)
 *   - Zombis y esqueletos con texturas propias de terror
 *     (piel palida, sangre, ojos que brillan - integrados)
 *   - Latido del corazon cuando te hacen dano
 *   - Velos de sangre en pantalla al ser herido
 *   - Susurros, drone ambiental y gritos sintetizados
 *   - SUSTOS: una cara aparece de golpe cuando un zombi se
 *     te acerca demasiado (o al azar)
 *   - Mensajes inquietantes en el chat
 *
 *    /terror        -> activar o desactivar
 *    /terror susto  -> probar un susto
 *    /terror ayuda  -> ayuda
 * ============================================================ */
(function () {
  "use strict";

  var activo = false;
  var YA_CARGADO = false;
  var TECLA_V = 47;      // activar con V (codigo Eagler)

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
    try { if (ModAPI.player) return ModAPI.player; } catch (e) {}
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
        "background:rgba(20,26,34,0.92);border:2px solid " + (color || "#b06ae8") +
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

  // ---------------- sonidos sintetizados ----------------
  var ctxAudio = null;
  function audio() {
    if (!ctxAudio) {
      try { ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (ctxAudio.state === "suspended") { try { ctxAudio.resume(); } catch (e) {} }
    return ctxAudio;
  }
  function ruidoFiltro(dur, vol, tipo, frec, t0) {
    var ctx = audio();
    if (!ctx) return null;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = tipo; f.frequency.value = frec; f.Q.value = 6;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
    return { src: src, g: g };
  }
  // drone ambiental continuo
  var drone = null;
  function iniciarDrone() {
    try {
      var ctx = audio(); if (!ctx) return;
      detenerDrone();
      var g = ctx.createGain();
      g.gain.value = 0.0;
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 3);
      var oscs = [];
      [52, 52.6, 78.2].forEach(function (f, i) {
        var o = ctx.createOscillator();
        o.type = i === 2 ? "triangle" : "sawtooth";
        o.frequency.value = f;
        var og = ctx.createGain();
        og.gain.value = i === 2 ? 0.25 : 0.5;
        var filtro = ctx.createBiquadFilter();
        filtro.type = "lowpass"; filtro.frequency.value = 190;
        o.connect(og); og.connect(filtro); filtro.connect(g);
        o.start();
        oscs.push(o);
      });
      // respiracion lenta del drone
      var lfo = ctx.createOscillator();
      var lfoG = ctx.createGain();
      lfo.frequency.value = 0.09;
      lfoG.gain.value = 0.05;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      lfo.start();
      oscs.push(lfo);
      g.connect(ctx.destination);
      drone = { nodos: oscs, gain: g };
    } catch (e) {}
  }
  function detenerDrone() {
    try {
      if (drone) {
        var ctx = ctxAudio;
        if (ctx) {
          drone.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        }
        var nodos = drone.nodos;
        setTimeout(function () {
          nodos.forEach(function (o) { try { o.stop(); } catch (e) {} });
        }, 1400);
        drone = null;
      }
    } catch (e) {}
  }
  function susurro() {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      // tres golpes de ruido con filtro variable = "voz" ininteligible
      for (var i = 0; i < 3; i++) {
        ruidoFiltro(0.22, 0.16, "bandpass", 900 + Math.random() * 1600, t + i * 0.3);
      }
    } catch (e) {}
  }
  function latido() {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      [0, 0.18].forEach(function (desfase, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(72, t + desfase);
        o.frequency.exponentialRampToValueAtTime(38, t + desfase + 0.12);
        g.gain.setValueAtTime(i === 0 ? 0.5 : 0.34, t + desfase);
        g.gain.exponentialRampToValueAtTime(0.001, t + desfase + 0.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + desfase); o.stop(t + desfase + 0.2);
      });
    } catch (e) {}
  }
  function grito() {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(340, t);
      o.frequency.exponentialRampToValueAtTime(1150, t + 0.16);
      o.frequency.exponentialRampToValueAtTime(430, t + 0.5);
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.6);
      ruidoFiltro(0.5, 0.3, "highpass", 2200, t);
    } catch (e) {}
  }
  function stinger(on) {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sawtooth";
      if (on) {
        o.frequency.setValueAtTime(190, t);
        o.frequency.linearRampToValueAtTime(52, t + 1.1);
        g.gain.setValueAtTime(0.32, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      } else {
        o.frequency.setValueAtTime(60, t);
        o.frequency.linearRampToValueAtTime(220, t + 0.8);
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      }
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 1.3);
    } catch (e) {}
  }

  // ---------------- overlays ----------------
  var veloSangre = null;
  var hudChip = null;
  var CARA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAE7ElEQVR4nO3dIY8VVxiA4aFBNRUV9TXVzSZrNmiSWgKa/1C5WYFAEERFRf8BGoJtgiZrNtlU19RXVDRY+g9mlh6GmTvv89jJvTt7Wd6c5Dtz7jQBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAx72tb4AxP3/9zce560/fv5t9/asHD2evj77+1w//+hvbsa+2vgFgOwIAYQIAYQIAYQIAYQIAYQIAYfe3voG6m9vr2Tn+qLXn/Euvnx48HNqncH52YR/BiqwAIEwAIEwAIEwAIEwAIEwAIEwAIMyMdWVrz/lHvX7zdvb6k8ePvsh9/F/2CYyxAoAwAYAwAYAwAYAwAYAwAYAwAYAwM9RBe5/z19knMM8KAMIEAMIEAMIEAMIEAMIEAMIEAMLMSBdsPec/9ef1l2z9+9X3CVgBQJgAQJgAQJgAQJgAQJgAQJgAQFh6BnoXS/sAzs8u1v75q77/6Bx+6fUvnr/8tBv6RKOfj30AQJYAQJgAQJgAQJgAQJgAQJgAQFh6BjpN28/5R109u5y9/gWep1/1/UeNfj5H3ydgBQBhAgBhAgBhAgBhAgBhAgBhAgBh97e+gbqP3307e/3e3//MXt/79wKM/n6j9v75bM0KAMIEAMIEAMIEAMIEAMIEAMIEAMLsA9jY2nPwrR399zt1VgAQJgAQJgAQJgAQJgAQJgAQJgAQdvh9AFfPLmfP/V+y9P3za5+Lv/TzX795O/T+o8/L7/3zYZ4VAIQJAIQJAIQJAIQJAIQJAIQJAIQd+rvPp2mabm6vh/YBrG1pju9c+22dn10c+v+IFQCECQCECQCECQCECQCECQCECQCEHf48gLUtzfE//PLb7PWn7999xrs5Pa8ePJy9vvbnM3qewqmzAoAwAYAwAYAwAYAwAYAwAYAwAYCwQz/rPE3j3wsw+jz+6Jz71M8LOPV9Es4DAA5LACBMACBMACBMACBMACBMACDs8OcBjM7JR+fwS3PsvT8Pv/Y+g71/PkdnBQBhAgBhAgBhAgBhAgBhAgBhAgBhh98HMGppDn7q58rv/TyBUVvvc9g7KwAIEwAIEwAIEwAIEwAIEwAIEwAIO/SZ59M0TTe310PfC1A3Okc/9Tm87wUADksAIEwAIEwAIEwAIEwAIEwAIOzQM867WNonsDTHfvH85ez1v/68nr3+/Q8XXj/g5nb+/UfZBwAclgBAmABAmABAmABAmABAmABA2KFnnHcxel7A+dnYHJsx9gGMsQKAMAGAMAGAMAGAMAGAMAGAMAGAsPtb38DeLZ0HwGmr//taAUCYAECYAECYAECYAECYAECYAEDYoZ91/hyWzgtwHsC2Rs8DOPrz/kusACBMACBMACBMACBMACBMACBMACDMeQCctKXn+Z88fvRF7uNUWQFAmABAmABAmABAmABAmABAmABAmH0AC+7wvPjseQFsq/68/xIrAAgTAAgTAAgTAAgTAAgTAAgTAAgzIx03tA/gj5vfZ6//eP7ToV//GfgbHmAFAGECAGECAGECAGECAGECAGECAGFmqBu7enY5u49g6Vz7o5+L73n+dVkBQJgAQJgAQJgAQJgAQJgAQJgAQJgZ64m7ub3e9fcSmOPvmxUAhAkAhAkAhAkAhAkAhAkAhAkAAAAAAAAAAAAAAAAAAAAAAOzIfyw678+e/A2WAAAAAElFTkSuQmCC";
  var ICONO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABBUlEQVR4nO2YMQrCQBBFo3gGFZIqeINYWFnaprLzeHZWtpZWFuYGkipC9BLaLVPswI4zsnyYV4Vlh8znfzJDisJxHCcnE03xfFF+LJp4v54/9zG1aCAn8AJUEaL0wxji9OiHcL6qq+j9ulqavBveAXgBYhtpVCgpseGgtbvtWtQTvAPwAmaaYqvYSGsp8A7ACxBHiFp/2LfRO7eui55vmkZ0PwV4B+AFiCOk+dr8A3gH4AWoBhmH1ZBKAd4BeAG+TucGXoDZOs3tRRzH0zk8+zqNjGqd1lhvNeDgHYAXoPq9d7new1DjIsFFTjO8KPAOwAsw+ztNodHSxCMFeAfgBTiO4+TlC6MyS7H/HOC8AAAAAElFTkSuQmCC";

  function crearOverlays() {
    if (!veloSangre) {
      veloSangre = document.createElement("div");
      veloSangre.style.cssText =
        "position:fixed;left:0;top:0;width:100%;height:100%;z-index:99997;" +
        "pointer-events:none;opacity:0;transition:opacity 0.35s ease-out;" +
        "background:radial-gradient(ellipse at center, rgba(120,0,0,0) 34%," +
        " rgba(140,4,4,0.55) 78%, rgba(90,0,0,0.85) 100%);";
      document.body.appendChild(veloSangre);
    }
    if (!hudChip) {
      hudChip = document.createElement("div");
      hudChip.style.cssText =
        "position:fixed;left:10px;bottom:56px;z-index:99998;display:none;" +
        "align-items:center;gap:8px;padding:5px 10px;" +
        "background:rgba(12,10,16,0.8);border:2px solid #7a2f8a;border-radius:6px;" +
        "font:bold 11px monospace;color:#d9a8ff;letter-spacing:2px;" +
        "text-shadow:1px 1px 2px #000;pointer-events:none;user-select:none;" +
        "animation:jcTerrorPulso 2.6s ease-in-out infinite;";
      var img = document.createElement("img");
      img.src = ICONO; img.width = 22; img.height = 22;
      img.style.cssText = "image-rendering:pixelated;";
      hudChip.appendChild(img);
      var s = document.createElement("span");
      s.textContent = "MODO TERROR";
      hudChip.appendChild(s);
      var st = document.createElement("style");
      st.textContent = "@keyframes jcTerrorPulso{0%,100%{opacity:1}50%{opacity:0.45}}";
      hudChip.appendChild(st);
      document.body.appendChild(hudChip);
    }
  }

  var sustoDiv = null;
  function susto(conGrito) {
    try {
      if (sustoDiv) sustoDiv.remove();
      sustoDiv = document.createElement("div");
      sustoDiv.style.cssText =
        "position:fixed;left:0;top:0;width:100%;height:100%;z-index:100000;" +
        "background:rgba(30,0,0,0.82);display:flex;align-items:center;" +
        "justify-content:center;pointer-events:none;";
      var img = document.createElement("img");
      img.src = CARA;
      img.style.cssText =
        "width:min(64vh,80vw);image-rendering:pixelated;" +
        "filter:contrast(1.5) brightness(1.1);" +
        "animation:jcSusto .42s cubic-bezier(.2,2.2,.4,1) forwards;";
      sustoDiv.appendChild(img);
      var st = document.createElement("style");
      st.textContent = "@keyframes jcSusto{0%{transform:scale(0.25) rotate(-6deg);" +
        "opacity:0}45%{transform:scale(1.18) rotate(3deg);opacity:1}" +
        "100%{transform:scale(1) rotate(0);opacity:0}}";
      sustoDiv.appendChild(st);
      document.body.appendChild(sustoDiv);
      if (conGrito !== false) grito();
      // sacudida del canvas
      var c = document.querySelector("#game_frame canvas") ||
              document.querySelector("body > canvas");
      if (c) {
        c.style.transition = "none";
        c.style.transform = "translate(7px,-4px)";
        setTimeout(function () {
          c.style.transition = "transform 120ms ease-out";
          c.style.transform = "translate(-5px,3px)";
          setTimeout(function () { c.style.transform = "translate(0,0)"; }, 120);
        }, 50);
      }
      if (window.JCMando && window.JCMando.conectado()) {
        try { window.JCMando.vibrar(600, 1); } catch (e) {}
      }
      setTimeout(function () { if (sustoDiv) { sustoDiv.remove(); sustoDiv = null; } }, 480);
    } catch (e) {}
  }

  // ---------------- mensajes inquietantes ----------------
  var MENSAJES = [
    "Algo se mueve entre las sombras...",
    "No estas solo.",
    "Lo oyes respirar detras de ti...",
    "JEFF lo ve todo.",
    "Corre.",
    "Las paredes tienen ojos.",
    "No deberias haber encendido el modo terror...",
    "Te esta buscando. Ya cerro la puerta.",
    "Cada paso tuyo suena mas fuerte que el anterior.",
    "El que te sigue tambien juega JEFFCRAFT."
  ];
  function mensajeTerror() {
    var txt = MENSAJES[Math.floor(Math.random() * MENSAJES.length)];
    cmd("/tellraw " + nombreJugador() +
        " {\"text\":\"" + txt + "\",\"color\":\"dark_red\",\"italic\":true}");
  }

  // ---------------- zombis del mod ----------------
  function zombisMios() {
    var n = 0;
    try {
      var lista = Minecraft.$theWorld.$loadedEntityList;
      var datos = lista && lista.$array1 && lista.$array1.data;
      if (!datos) return 0;
      for (var i = 0; i < datos.length; i++) {
        var e = datos[i];
        if (e && typeof e.$conversionTime !== "undefined" &&
            e.__jcTerror) n++;
      }
    } catch (e) {}
    return n;
  }
  function invocarZombiDetras() {
    var p = jugador();
    if (!p) return;
    try {
      var yaw = (p.yaw || 0) * Math.PI / 180;
      var detras = yaw + Math.PI;
      var dist = 9 + Math.random() * 4;
      var x = p.x - Math.sin(detras) * dist;
      var z = p.z + Math.cos(detras) * dist;
      var y = (p.y || 64) + 1;
      cmd("/summon Zombie " + num(x) + " " + num(y) + " " + num(z) +
          " {CustomName:\"El Huesped\",CustomNameVisible:0b}");
      // marcarlo como nuestro escaneando despues; el escaneo lo hace
      // vigilanciaZombis() al verlo cerca
      susurro();
    } catch (e) {}
  }
  function marcarZombis() {
    try {
      var lista = Minecraft.$theWorld.$loadedEntityList;
      var datos = lista && lista.$array1 && lista.$array1.data;
      if (!datos) return;
      var p = jugador();
      if (!p) return;
      for (var i = 0; i < datos.length; i++) {
        var e = datos[i];
        if (!e || typeof e.$conversionTime === "undefined") continue;
        if (!e.__jcTerror) e.__jcTerror = true;   // todos cuentan como del modo
        // susto por proximidad
        if (!e.__jcSustoHecho) {
          var dx = e.$posX - p.x, dy = e.$posY - (p.y || 0), dz = e.$posZ - p.z;
          if (dx * dx + dy * dy + dz * dz < 16) {   // a menos de 4 bloques
            e.__jcSustoHecho = true;
            susto(true);
          }
        }
      }
    } catch (e) {}
  }

  // ---------------- activar / desactivar ----------------
  function activar() {
    if (activo) return;
    activo = true;
    crearOverlays();
    hudChip.style.display = "flex";
    stinger(true);
    iniciarDrone();
    cmd("/time set 18000");
    cmd("/weather thunder");
    cmd("/playsound ambient.weather.thunder " + nombreJugador() + " ~ ~ ~ 2 0.7");
    toast("MODO TERROR ACTIVADO. Sobrevive si puedes. /terror para apagarlo.", 7, "#b06ae8");
    setTimeout(mensajeTerror, 4000);
    if (window.JCMando && window.JCMando.conectado()) {
      try { window.JCMando.vibrar(400, 0.7); } catch (e) {}
    }
  }
  function desactivar() {
    if (!activo) return;
    activo = false;
    if (hudChip) hudChip.style.display = "none";
    detenerDrone();
    stinger(false);
    cmd("/weather clear");
    cmd("/time set 6000");
    cmd("/effect " + nombreJugador() + " clear");
    toast("El terror se retira... por ahora. Tus mundos siguen intactos.", 5, "#7fe07f");
  }

  function ayuda() {
    toast("/terror enciende o apaga el modo \u00b7 /terror susto prueba un susto \u00b7 tecla V tambien lo enciende.", 8, "#b06ae8");
  }
  function manejarComando(partes) {
    var sub = (partes[0] || "").toLowerCase();
    if (sub === "ayuda" || sub === "help") { ayuda(); return; }
    if (sub === "susto" || sub === "test") { susto(true); return; }
    if (sub === "on") { activar(); return; }
    if (sub === "off") { desactivar(); return; }
    if (activo) desactivar(); else activar();
  }

  // ---------------- bucle ----------------
  var tics = 0;
  var proximoSusto = 0;
  var proximoMensaje = 0;
  var proximoZombi = 0;
  var proximoSusurro = 0;
  var heridoAntes = false;
  function reiniciarTemporizadores() {
    var ahora = Date.now();
    proximoSusto = ahora + 35000 + Math.random() * 70000;
    proximoMensaje = ahora + 15000 + Math.random() * 30000;
    proximoZombi = ahora + 12000 + Math.random() * 18000;
    proximoSusurro = ahora + 8000 + Math.random() * 14000;
  }

  function bucle() {
    if (!activo || !enMundo()) return;
    tics++;
    var ahora = Date.now();

    // pulsos de niebla (ceguera casi continua)
    if (tics % 70 === 0) {
      cmd("/effect " + nombreJugador() + " blindness 6 0 true");
    }
    // tormenta se mantiene
    if (tics % 600 === 0) {
      cmd("/weather thunder");
    }
    // latido lento de fondo
    if (tics % 90 === 0) latido();
    // susurros
    if (ahora > proximoSusurro) {
      susurro();
      proximoSusurro = ahora + 9000 + Math.random() * 16000;
    }
    // mensajes
    if (ahora > proximoMensaje) {
      mensajeTerror();
      proximoMensaje = ahora + 35000 + Math.random() * 45000;
    }
    // susto aleatorio
    if (ahora > proximoSusto) {
      susto(true);
      proximoSusto = ahora + 50000 + Math.random() * 90000;
    }
    // zombis que aparecen detras (maximo 5 del mod)
    if (ahora > proximoZombi) {
      if (zombisMios() < 5) invocarZombiDetras();
      proximoZombi = ahora + 20000 + Math.random() * 25000;
    }
    // vigilancia de zombis cercanos (susto por proximidad)
    if (tics % 10 === 0) marcarZombis();

    // dano del jugador -> velo de sangre + latidos
    try {
      var tp = Minecraft.$thePlayer;
      var herido = tp && tp.$hurtTime > 0;
      if (herido && !heridoAntes) {
        latido();
        setTimeout(latido, 300);
        if (veloSangre) {
          veloSangre.style.opacity = "1";
          setTimeout(function () { if (veloSangre) veloSangre.style.opacity = "0"; }, 900);
        }
        if (window.JCMando && window.JCMando.conectado()) {
          try { window.JCMando.vibrar(250, 1); } catch (e) {}
        }
      }
      heridoAntes = !!herido;
    } catch (e) {}
  }

  // ---------------- arranque ----------------
  var avisoPermisos = false;
  var silencioAplicado = false;
  function silenciarFeedback() {
    // los pulsos y efectos llenarian el chat de avisos: una vez por mundo
    if (silencioAplicado || !enMundo()) return;
    silencioAplicado = true;
    cmd("/gamerule sendCommandFeedback false");
    cmd("/gamerule commandBlockOutput false");
  }
  try {
    if (!window.ModAPI || typeof ModAPI.addEventListener !== "function") return;

    ModAPI.addEventListener("packetchat", function (ev) {
      try {
        if (avisoPermisos) return;
        var t = String((ev && (ev.chat || ev.message)) || "");
        if (t.indexOf("permission") !== -1 || t.indexOf("permiso") !== -1) {
          avisoPermisos = true;
          toast("Este mundo se creo sin trucos: crea uno nuevo (Permitir trucos: Si) para el modo terror.", 10, "#ff6a6a");
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("load", function () {
      if (YA_CARGADO) return;
      YA_CARGADO = true;
      try { ModAPI.require("player"); } catch (e) {}
      try { ModAPI.require("network"); } catch (e) {}
      crearOverlays();
      reiniciarTemporizadores();
      toast("Mod TERROR v2 listo. /terror para encender la pesadilla (o tecla V).", 8, "#b06ae8");
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        if (msg === "/terror" || msg.indexOf("/terror ") === 0) {
          ev.preventDefault = true;
          manejarComando(msg.slice(1).split(/\s+/).slice(1));
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("key", function (ev) {
      try {
        if (!enMundo()) return;
        var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
        if (String(k) === String(TECLA_V)) {
          if (activo) desactivar(); else activar();
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("update", function () {
      try { silenciarFeedback(); bucle(); } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:terror] error:", e);
  }
})();
