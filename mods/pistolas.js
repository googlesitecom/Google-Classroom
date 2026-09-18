/* ============================================================
 *  Mod: PISTOLAS v2  (tienda de mods de JEFFCRAFT)
 * ------------------------------------------------------------
 *  Cuatro armas de verdad, cada una con su propia textura
 *  (integrada en el juego) y su manera de disparar:
 *
 *    /pistola      -> PISTOLA     semiautomatica, 12 balas
 *    /rifle        -> RIFLE       potente y preciso, 5 balas
 *    /escopeta     -> ESCOPETA    6 perdigones, 2 cartuchos
 *    /metralleta   -> METRALLETA  automatica, 30 balas
 *    /armas        -> lista de armas y ayuda
 *
 *  Controles:
 *    R          -> disparar (con mando: gatillo derecho o cruceta derecha)
 *    G          -> recargar (con mando: cruceta izquierda)
 *
 *  Las balas son flechas veloces con estela de fuego, los
 *  sonidos de disparo son sintetizados a medida y el HUD
 *  muestra el arma equipada con su icono y su municion.
 * ============================================================ */
(function () {
  "use strict";

  // ---------------- definicion de armas ----------------
  // item: la textura del arma reemplaza a ese item del juego
  var ARMAS = {
    pistola: {
      nombre: "PISTOLA", item: "minecraft:iron_hoe", icono: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABn0lEQVR4nO2XMUsDQRSEPU1haRFjIVhoI9jZiFeIpAhIRLATKwkpQn6ChYW/QkIQSxuxskkhYnFiZxkFJQgWif4AO618mYN93K7ZDTeQqabY3dthPu7dRVM5UGlh8efPD/ofkcua6bBXCy/6AMa6QgkxQHVu78XvVXeMe997L8a70jdAH6AQ+gEaNpXqvvjk4fHf59M3QB8gyFvIBps4jjPPadYP5X6TQZZXeUPIFzaaECcUfQP0AUYaZKGxiTc3jM+avIXyJGeEXLE5mD8Tf/nZyDwfsamUtzLX0zdAH8BqkPnCpvR2In6wfDrca4GN9rNP3wB9ABWhcQ4pV2xQ9A3QB0hV5IrNxXlb/FGtnvkwX9ig6BugDxBp2OyuzYiPV4viW09z4nuvz+K7rRXxOLxCYIOib4A+QAohDRtNx1d98YiBhiVqFGxQ9A3QB4hq5SWp2wYbTXffwwHXubk2rvGFDYq+AfoABQ2bpPsl3gatcWKDom+APkCq3nZz3TiANJxwkKFCY4Oib4A+QOpbCP+8tmcT44Y8YIOib4A+wC9otIjxQxYUJwAAAABJRU5ErkJggg==",
      balas: 12, enfriamiento: 5, recarga: 26, velocidad: 3.2, dano: "6.0",
      perdigones: 1, dispersion: 0.0, sonido: "pistola"
    },
    rifle: {
      nombre: "RIFLE", item: "minecraft:wood_hoe", icono: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABnElEQVR4nNWYP0sDQRTEs2oRSWMhXhEQC5HgH5BgdaW1nZ2lBAsbq4CoRRpFMLWFBPELaGXjF7AUQQUVA0G44sTCwkIE0crnBN56t+TWc6Yalsdyw/zY2ztTINRIUP789n15PkgWog9gstoIa02jxvbej9+sqzPFwZK6/ti5l+emb4A+wICPTREP36JvgD6AF4RQR4etxJl4piw+uIrEr281xNtOKvoG6AN4R6jTvkucCXrYn74B+gD/+i6Eeooj9VnpG6AP4AWhhal+Wb9+Gxc/UZkUH4ahug/iZMMGRd8AfYCeELJhY9Pc0q667ooNir4B+gDOCLliE1aG1fWN41i8KzYo+gboA6SqzoZNc21MnT85e1XXs8IGRd8AfQBjw+P05qOQtI7aWdS/q3xgg6JvgD6AWZ4fVb+k8AV0cDkkfrr4oM6gfGODom+APkDXfyEbEiuzL+Lfq3AlvmiK/UtsUPQN0AcwrdWq0/8cVF7YoOgboA/QdQqd3z6Lt51IKLz/1PajXyb9ib4B+gDWF1kanPAUykv0DdAH+AKYq2/Nto268wAAAABJRU5ErkJggg==",
      balas: 5, enfriamiento: 16, recarga: 46, velocidad: 5.0, dano: "9.0",
      perdigones: 1, dispersion: 0.0, sonido: "rifle"
    },
    escopeta: {
      nombre: "ESCOPETA", item: "minecraft:stone_hoe", icono: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABhklEQVR4nO2ZvUoDURCF75o8gIUkohIEQwjaW6RMbWdnKal8AgkWqfIEIUWKVLZa2fgCliFFAsFKRMWIpSHbiFYOZ2WHvcvu5u6BnGq47M8czsfc/fEMoUrl3Z+/esNlI2mI3oDnuoH/Om40BY/3t5fQY56fHqVv+gToDRRdN2CMMZX9mmBTqx/KuoYQij4BegPOphBis72zJ+saNpdXHakvWmfrKZQbrRQhDRuUhpC/XEj9MX9dI5QbZY6QDTYo3Miuh73I/ugToDeQCCF8M8LJkDU2KPoE6A3ERgixQZ0cFaSe+NXI6yTBBkWfAL0Bq+hssGnUt0LPHYw3pU4LGxR9AvQG1Bg1bFCzwYHUt/dfkTdr9UepP3vRJ0BvIBCpzbS5m35L3T0tR96gfTMPXcdnpySiT4DegHferAg2iIfNJqUpa2xQ9AnQGwh8nbaZKppWiQ2KPgF6A8W4EwblChsUfQL0BgJT6GH2KbWGVh6wQdEnQG8g9m9W3OyyeMOKK/oE6A38AovaZq7MbrouAAAAAElFTkSuQmCC",
      balas: 2, enfriamiento: 22, recarga: 40, velocidad: 2.6, dano: "4.0",
      perdigones: 6, dispersion: 0.09, sonido: "escopeta"
    },
    metralleta: {
      nombre: "METRALLETA", item: "minecraft:gold_hoe", icono: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABl0lEQVR4nGNkGIJATFz6P4zNNJAOoQYY8h5gHGgHMDCgJomG1m64eEdLA1b1jx7cgrt7yMfAkPfAgCUh5GSjoKyOVc2LZ0+wio8mocEE6JqEiEk2ahpacLaVlRVWNVkpUaNJaNAAFmoZhJw8cAFKkk1DdSlW8SEfA0PeAxSVQriSzbRkTji764AcVr2kJptXL59ideuQj4Eh7wGSkxAxycbJXAqr3ryNenA2JckGGQz5GBjyHiAqCVGSbHCBFa8z4GxSkw0yGPIxMOQ9gDO6aJFscAGNtLtw9mgSGmoApTk9UMmGEjDkY2DIewBnj4zUZLNu5xc4+9iNN3B2T74CnI0r2ZBa8iCDIR8DQ94DOJMQck/KyfwPQYOC3HmwitMi2SCDIR8DQ94DjMQM9z24exPOdvMOhLNv3biGVQ0uQK1kgwyGfAwMeQ+wEDPcR0zywAVokWyQwZCPgSHvAZZTx/bBozgmKQdeIiGP2+zaup4kQ2mdbJDBkI+BIe8BlLbQknlT4FFvZWWFtXdGanKiNRjyMTDkPQAA4/Z0ahUokO8AAAAASUVORK5CYII=",
      balas: 30, enfriamiento: 2, recarga: 60, velocidad: 2.9, dano: "4.5",
      perdigones: 1, dispersion: 0.035, sonido: "metralleta"
    }
  };

  var armaActual = null;     // clave de ARMAS
  var activo = false;
  var balas = 0;
  var recargando = 0;
  var enfriamiento = 0;
  var disparos = 0;
  var YA_CARGADO = false;

  var TECLA_R = 19;   // disparar (codigo Eagler)
  var TECLA_G = 34;   // recargar

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
    try {
      var p = ModAPI.player;
      if (!p) return null;
      var yaw = (p.yaw || 0) * Math.PI / 180;
      var pitch = (p.pitch || 0) * Math.PI / 180;
      var cp = Math.cos(pitch);
      return { x: -Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
    } catch (e) { return null; }
  }
  function posJugador() {
    try {
      var p = ModAPI.player;
      if (p) return { x: p.x, y: (p.y || 0) + 1.4, z: p.z };
    } catch (e) {}
    return null;
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
  function toast(mensaje, segundos, color) {
    try {
      var t = document.createElement("div");
      t.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:99999;" +
        "max-width:360px;padding:10px 14px;color:#fff;" +
        "background:rgba(20,26,34,0.92);border:2px solid " + (color || "#eeb13e") +
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
  function ruido(dur, vol, frecCorte, t0) {
    // amortiguacion de ruido blanco con filtro paso-bajo = cuerpo del disparo
    var ctx = audio();
    if (!ctx) return;
    var n = Math.floor(ctx.sampleRate * dur);
    var bufer = ctx.createBuffer(1, n, ctx.sampleRate);
    var datos = bufer.getChannelData(0);
    for (var i = 0; i < n; i++) {
      datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    }
    var src = ctx.createBufferSource();
    src.buffer = bufer;
    var filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = frecCorte;
    var gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filtro); filtro.connect(gain); gain.connect(ctx.destination);
    src.start(t0 || ctx.currentTime);
  }
  function golpe(freq, dur, vol, t0) {
    var ctx = audio();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 || ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.3),
      (t0 || ctx.currentTime) + dur);
    gain.gain.setValueAtTime(vol, t0 || ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, (t0 || ctx.currentTime) + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0 || ctx.currentTime);
    osc.stop((t0 || ctx.currentTime) + dur + 0.02);
  }
  function sonidoDisparo(tipo) {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      if (tipo === "pistola") {
        ruido(0.10, 0.5, 2400, t);
        golpe(160, 0.10, 0.35, t);
      } else if (tipo === "rifle") {
        ruido(0.28, 0.7, 1500, t);
        golpe(90, 0.30, 0.5, t);
        ruido(0.12, 0.25, 5000, t + 0.02);   // chasquido agudo
      } else if (tipo === "escopeta") {
        ruido(0.34, 0.85, 1100, t);
        golpe(70, 0.34, 0.55, t);
        ruido(0.20, 0.4, 900, t + 0.09);     // segundo canon
        golpe(60, 0.2, 0.35, t + 0.09);
      } else if (tipo === "metralleta") {
        ruido(0.06, 0.38, 2800, t);
        golpe(190, 0.05, 0.22, t);
      }
    } catch (e) {}
  }
  function sonidoRecarga(paso) {
    try {
      var ctx = audio(); if (!ctx) return;
      var t = ctx.currentTime;
      ruido(0.03, 0.22, 3600, t);
      golpe(700 + paso * 160, 0.03, 0.14, t);
    } catch (e) {}
  }

  // retroceso visual: sacudida breve del canvas
  function sacudir(px) {
    try {
      var c = document.querySelector("#game_frame canvas") ||
              document.querySelector("body > canvas");
      if (!c) return;
      c.style.transition = "none";
      c.style.transform = "translate(" + px + "px," + (-px / 2) + "px)";
      setTimeout(function () {
        c.style.transition = "transform 90ms ease-out";
        c.style.transform = "translate(0,0)";
      }, 40);
    } catch (e) {}
  }

  // ---------------- estelas de bala (flechas rastreadas) ----------------
  var flechasRastreadas = [];   // { ent, tics }
  var disparosSinAsignar = [];  // { x,y,z, t }
  var MAX_RASTREADAS = 5;

  function escanearFlechas() {
    try {
      var w = Minecraft.$theWorld;
      var lista = w && w.$loadedEntityList;
      var datos = lista && lista.$array1 && lista.$array1.data;
      if (!datos || !datos.length) return;
      var ahora = Date.now();
      // limpiar muertas/viejas
      for (var i = flechasRastreadas.length - 1; i >= 0; i--) {
        var f = flechasRastreadas[i];
        f.tics++;
        var viva = (datos.indexOf(f.ent) !== -1) && !f.ent.$isDead;
        var clavada = !!f.ent.$inGround0;
        if (clavada && f.tics > 2) {
          impacto(f.ent);
          flechasRastreadas.splice(i, 1);
        } else if (!viva || f.tics > 200) {
          flechasRastreadas.splice(i, 1);
        } else {
          estela(f.ent);
        }
      }
      // asignar disparos recientes a flechas nuevas
      for (var d = disparosSinAsignar.length - 1; d >= 0; d--) {
        var s = disparosSinAsignar[d];
        if (ahora - s.t > 2500) { disparosSinAsignar.splice(d, 1); continue; }
        for (var j = 0; j < datos.length; j++) {
          var e = datos[j];
          if (!e || typeof e.$inGround0 === "undefined" ||
              typeof e.$arrowShake === "undefined") continue;
          var ya = false;
          for (var k = 0; k < flechasRastreadas.length; k++) {
            if (flechasRastreadas[k].ent === e) { ya = true; break; }
          }
          if (ya) continue;
          var dx = e.$posX - s.x, dy = e.$posY - s.y, dz = e.$posZ - s.z;
          if (dx * dx + dy * dy + dz * dz < 9) {   // a menos de 3 bloques del canon
            if (flechasRastreadas.length >= MAX_RASTREADAS) {
              flechasRastreadas.shift();
            }
            flechasRastreadas.push({ ent: e, tics: 0 });
            disparosSinAsignar.splice(d, 1);
            break;
          }
        }
      }
    } catch (e) {}
  }
  function estela(ent) {
    cmd("/particle flame " + num(ent.$posX) + " " + num(ent.$posY) + " " +
        num(ent.$posZ) + " 0 0 0 0 1");
  }
  function impacto(ent) {
    cmd("/particle smoke " + num(ent.$posX) + " " + num(ent.$posY) + " " +
        num(ent.$posZ) + " 0.05 0.05 0.05 0.05 4");
    cmd("/particle crit " + num(ent.$posX) + " " + num(ent.$posY) + " " +
        num(ent.$posZ) + " 0.1 0.1 0.1 0.1 3");
  }

  // ---------------- HUD ----------------
  var hud = null, hudIcono = null, hudNombre = null, hudBarra = null, hudTxt = null;
  function crearHUD() {
    if (hud) return;
    hud = document.createElement("div");
    hud.style.cssText =
      "position:fixed;right:14px;bottom:14px;z-index:99998;display:none;" +
      "align-items:center;gap:12px;padding:8px 14px 8px 10px;" +
      "background:rgba(10,14,20,0.82);border:2px solid #2a3a4d;border-radius:8px;" +
      "box-shadow:0 0 0 2px #060a0e, inset 0 0 8px rgba(0,0,0,0.7);" +
      "pointer-events:none;user-select:none;";
    hudIcono = document.createElement("img");
    hudIcono.width = 44; hudIcono.height = 44;
    hudIcono.style.cssText = "image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #000);";
    hud.appendChild(hudIcono);
    var col = document.createElement("div");
    hudNombre = document.createElement("div");
    hudNombre.style.cssText =
      "font:bold 13px monospace;color:#eeb13e;letter-spacing:2px;" +
      "text-shadow:2px 2px 0 #000;margin-bottom:4px;";
    col.appendChild(hudNombre);
    var fila = document.createElement("div");
    fila.style.cssText = "display:flex;align-items:center;gap:8px;";
    hudBarra = document.createElement("div");
    hudBarra.style.cssText =
      "width:150px;height:10px;background:#141c26;border:1px solid #060a0e;" +
      "box-shadow:inset 0 0 4px #000;position:relative;overflow:hidden;";
    var relleno = document.createElement("div");
    relleno.id = "jcpist_relleno";
    relleno.style.cssText =
      "position:absolute;left:0;top:0;height:100%;width:100%;" +
      "background:linear-gradient(90deg,#eeb13e,#f6d27a);";
    hudBarra.appendChild(relleno);
    hudTxt = document.createElement("span");
    hudTxt.style.cssText =
      "font:bold 12px monospace;color:#eaf2ff;text-shadow:1px 1px 0 #000;";
    fila.appendChild(hudBarra); fila.appendChild(hudTxt);
    col.appendChild(fila);
    hud.appendChild(col);
    document.body.appendChild(hud);
  }
  function pintaHUD() {
    if (!hud || !armaActual) return;
    var a = ARMAS[armaActual];
    hudIcono.src = a.icono;
    hudNombre.textContent = a.nombre;
    var relleno = document.getElementById("jcpist_relleno");
    if (recargando > 0) {
      var pct = 100 - Math.round((recargando / a.recarga) * 100);
      if (relleno) { relleno.style.width = pct + "%"; relleno.style.background = "#7d8fa3"; }
      hudTxt.textContent = "RECARGANDO " + pct + "%";
    } else if (balas <= 0) {
      if (relleno) { relleno.style.width = "0%"; }
      hudTxt.textContent = "VACIA \u00b7 pulsa G";
      hudTxt.style.color = "#ff6a6a";
      return;
    } else {
      if (relleno) {
        relleno.style.width = Math.round((balas / a.balas) * 100) + "%";
        relleno.style.background = "linear-gradient(90deg,#eeb13e,#f6d27a)";
      }
      hudTxt.textContent = balas + "/" + a.balas;
    }
    hudTxt.style.color = "#eaf2ff";
  }
  function hudVisible(v) { if (hud) hud.style.display = v ? "flex" : "none"; }

  // ---------------- disparo ----------------
  function disparar() {
    if (!activo || !armaActual || recargando > 0 || enfriamiento > 0) return;
    var a = ARMAS[armaActual];
    if (balas <= 0) {
      sonidoRecarga(0);
      toast("Cargador vacio. Pulsa G para recargar.", 2, "#ff6a6a");
      return;
    }
    var o = posJugador(), l = mira();
    if (!o || !l) return;
    balas--;
    disparos++;
    enfriamiento = a.enfriamiento;
    sonidoDisparo(a.sonido);
    if (a.sonido === "rifle" || a.sonido === "escopeta") sacudir(3);
    else sacudir(1.5);
    if (window.JCMando && window.JCMando.conectado()) {
      try { window.JCMando.vibrar(a.sonido === "rifle" ? 160 : 70, 0.8); } catch (e) {}
    }
    for (var p = 0; p < a.perdigones; p++) {
      var vx = l.x * a.velocidad, vy = l.y * a.velocidad, vz = l.z * a.velocidad;
      if (a.dispersion > 0) {
        vx += (Math.random() - 0.5) * a.dispersion * a.velocidad * 2;
        vy += (Math.random() - 0.5) * a.dispersion * a.velocidad * 2;
        vz += (Math.random() - 0.5) * a.dispersion * a.velocidad * 2;
      }
      var ox = o.x + l.x * 0.8, oy = o.y + l.y * 0.8, oz = o.z + l.z * 0.8;
      cmd("/summon Arrow " + num(ox) + " " + num(oy) + " " + num(oz) +
          " {Motion:[" + num(vx) + "," + num(vy) + "," + num(vz) + "]" +
          ",damage:" + a.dano + ",pickup:0b}");
      disparosSinAsignar.push({ x: ox, y: oy, z: oz, t: Date.now() });
    }
    // fogonazo del canon
    cmd("/particle flame " + num(o.x + l.x * 1.2) + " " + num(o.y + l.y * 1.2) +
        " " + num(o.z + l.z * 1.2) + " 0 0 0 0.02 2");
    pintaHUD();
    if (balas === 0 && disparos > 1) {
      toast("Cargador vacio.", 2, "#ff6a6a");
    }
  }

  function recargar() {
    if (!activo || !armaActual || recargando > 0) return;
    var a = ARMAS[armaActual];
    if (balas >= a.balas) return;
    recargando = a.recarga;
    sonidoRecarga(0);
    setTimeout(function () { sonidoRecarga(1); }, 350);
    setTimeout(function () { sonidoRecarga(2); }, 700);
    pintaHUD();
  }

  function equipar(clave) {
    var a = ARMAS[clave];
    if (!a) return;
    armaActual = clave;
    activo = true;
    balas = a.balas;
    recargando = 0;
    crearHUD();
    hudVisible(true);
    pintaHUD();
    cmd("/give " + nombreJugador() + " " + a.item + " 1 0 {display:{Name:\"" +
        a.nombre + " JEFF\"}}");
    toast(a.nombre + " equipada \u00b7 R o gatillo derecho = disparar \u00b7 G = recargar", 6, "#4fc058");
  }

  function desactivar() {
    activo = false;
    armaActual = null;
    hudVisible(false);
    toast("Armas guardadas.", 3);
  }

  function ayuda() {
    toast("/pistola \u00b7 /rifle \u00b7 /escopeta \u00b7 /metralleta = elegir arma \u00b7 R dispara \u00b7 G recarga \u00b7 /armas off guarda las armas", 10);
  }

  function manejarComando(raiz, partes) {
    var sub = (partes[0] || "").toLowerCase();
    if (sub === "ayuda" || sub === "help") { ayuda(); return; }
    if (sub === "off" || sub === "guardar") { desactivar(); return; }
    if (sub === "balas") {
      if (armaActual) { balas = ARMAS[armaActual].balas; recargando = 0; pintaHUD(); }
      return;
    }
    equipar(raiz);
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
          toast("Este mundo se creo sin trucos: crea uno nuevo (Permitir trucos: Si) para que las armas disparen.", 10, "#ff6a6a");
        }
      });
    } catch (e) {}
  }

  // ---------------- arranque ----------------
  var silencioAplicado = false;
  function silenciarFeedback() {
    // las estelas y efectos llenarian el chat de avisos de comandos:
    // una vez por mundo apagamos el feedback (practica estandar)
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
      toast("Mod PISTOLAS v2 listo. /pistola /rifle /escopeta /metralleta para armarte.", 8, "#eeb13e");
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        var comandos = ["/pistola", "/rifle", "/escopeta", "/metralleta", "/armas"];
        for (var i = 0; i < comandos.length; i++) {
          var c = comandos[i];
          if (msg === c || msg.indexOf(c + " ") === 0) {
            ev.preventDefault = true;
            manejarComando(c.slice(1), msg.slice(1).split(/\s+/).slice(1));
            return;
          }
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("key", function (ev) {
      try {
        if (!activo || !enMundo()) return;
        var k = ev && (ev.key !== undefined ? ev.key : (ev.keyCode || ev.which));
        k = String(k);
        if (k === String(TECLA_R)) disparar();
        else if (k === String(TECLA_G)) recargar();
      } catch (e) {}
    });

    ModAPI.addEventListener("update", function () {
      try {
        silenciarFeedback();
        if (enfriamiento > 0) enfriamiento--;
        if (recargando > 0) {
          recargando--;
          if (recargando === 0 && armaActual) {
            balas = ARMAS[armaActual].balas;
            sonidoRecarga(3);
            pintaHUD();
          } else if (recargando % 10 === 0) {
            pintaHUD();
          }
        }
        // disparo con el gatillo derecho del mando (mantener = automatica)
        if (activo && armaActual && window.JCMando && window.JCMando.conectado()) {
          if (window.JCMando.mantenida(7)) disparar();
        }
        // estelas de bala
        if (activo && enMundo()) escanearFlechas();
        // ocultar HUD al salir del mundo
        if (activo && !enMundo()) hudVisible(false);
        else if (activo && hud && hud.style.display === "none") hudVisible(true);
      } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:pistolas] error:", e);
  }
})();
