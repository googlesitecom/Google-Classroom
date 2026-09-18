/* ============================================================
 *  Mod: MANDO DE XBOX  (JEFFCRAFT)
 * ------------------------------------------------------------
 *  Soporte completo de control de Xbox (Gamepad API) con todos
 *  los controles esenciales ya asignados:
 *
 *  JUGANDO:
 *    Palanca izq.   -> moverse (WASD)
 *    Palanca der.   -> mirar (camara)
 *    Gatillo der.   -> atacar / picar (click izq.)
 *    Gatillo izq.   -> usar / colocar (click der.)
 *    A              -> saltar
 *    B              -> agacharse (on/off)
 *    X              -> inventario
 *    Y              -> soltar objeto
 *    LB / RB        -> ranura anterior / siguiente
 *    Click pal.izq. -> correr (mantener)
 *    Click pal.der. -> cambiar vista (F5)
 *    View (atras)   -> chat
 *    Menu (start)   -> pausa
 *    Cruceta arriba -> ayuda del mando
 *    Cruceta abajo  -> copiar bloque (click central)
 *    Cruceta der.   -> tecla R (disparar mods)
 *    Cruceta izq.   -> tecla G (recargar mods)
 *
 *  EN MENUS (inventario, opciones...):
 *    Palanca izq.   -> mover el cursor
 *    A              -> clic
 *    B              -> cerrar / atras
 *    LB / RB        -> subir / bajar listas
 *
 *  Chat: al abrirlo aparece un cuadro de texto real (en Xbox
 *  sale el teclado en pantalla). Enter envia, Esc cancela.
 *
 *  Comandos: /mando ayuda · /mando sensibilidad 1-4 ·
 *            /mando invertir · /mando on|off · /mando vibrar
 * ============================================================ */
(function () {
  "use strict";

  // ---------------- configuracion ----------------
  var CFG = {
    activo: true,
    sensibilidad: 11,      // px de camara por frame a tope
    invertirY: false,
    zonaMuerta: 0.20,
    cursorVel: 13
  };
  try {
    var guardado = JSON.parse(localStorage.getItem("jc::mando") || "{}");
    for (var k in guardado) if (k in CFG) CFG[k] = guardado[k];
  } catch (e) {}
  function guardarCFG() {
    try { localStorage.setItem("jc::mando", JSON.stringify(CFG)); } catch (e) {}
  }

  // ---------------- utilidades ----------------
  function enGUI() {
    try {
      if (window.ModAPI && typeof ModAPI.currentScreen === "function") {
        var s = ModAPI.currentScreen();
        return !!s && s !== "null";
      }
    } catch (e) {}
    return false;
  }
  function enMundo() {
    try { return !!(window.Minecraft && Minecraft.$theWorld); } catch (e) { return false; }
  }
  function canvasJuego() {
    try {
      var c = document.querySelector("#game_frame canvas") ||
              document.querySelector("body > canvas");
      if (c) return c;
      var todos = document.querySelectorAll("canvas");
      for (var i = 0; i < todos.length; i++) if (todos[i].width > 300) return todos[i];
    } catch (e) {}
    return null;
  }
  function toast(mensaje, segundos, color) {
    try {
      var t = document.createElement("div");
      t.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:99999;" +
        "max-width:360px;padding:10px 14px;color:#fff;" +
        "background:rgba(20,26,34,0.92);border:2px solid " + (color || "#4fc058") +
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

  // ---------------- inyeccion de eventos ----------------
  // El cliente lee: keydown -> event.which ; mousemove ->
  // event.movementX/Y + offsetX/Y ; mousedown -> event.button ;
  // wheel -> event.deltaY. Se inyectan con defineProperty.

  var teclasMantenidas = {};

  // nombre de tecla estandar (para que el juego lea el caracter en chat/GUIs)
  var NOMBRE_TECLA = {
    65: "a", 66: "b", 67: "c", 68: "d", 69: "e", 70: "f", 71: "g", 72: "h",
    73: "i", 74: "j", 75: "k", 76: "l", 77: "m", 78: "n", 79: "o", 80: "p",
    81: "q", 82: "r", 83: "s", 84: "t", 85: "u", 86: "v", 87: "w", 88: "x",
    89: "y", 90: "z", 32: " ", 13: "Enter", 27: "Escape", 16: "Shift",
    17: "Control", 116: "F5", 48: "0", 49: "1", 50: "2", 51: "3", 52: "4",
    53: "5", 54: "6", 55: "7", 56: "8", 57: "9"
  };

  function tecla(tipo, codigo) {
    try {
      var ev = new KeyboardEvent(tipo, {
        bubbles: true, cancelable: true,
        key: NOMBRE_TECLA[codigo] || ""
      });
      Object.defineProperty(ev, "which", { get: function () { return codigo; } });
      Object.defineProperty(ev, "keyCode", { get: function () { return codigo; } });
      Object.defineProperty(ev, "charCode", { get: function () { return 0; } });
      window.dispatchEvent(ev);
      if (tipo === "keydown") teclasMantenidas[codigo] = true;
      else delete teclasMantenidas[codigo];
    } catch (e) {}
  }
  function mantenerTecla(codigo, mantenida) {
    if (mantenida && !teclasMantenidas[codigo]) tecla("keydown", codigo);
    else if (!mantenida && teclasMantenidas[codigo]) tecla("keyup", codigo);
  }
  function soltarTodasTeclas() {
    for (var c in teclasMantenidas) tecla("keyup", parseInt(c, 10));
  }

  // posicion virtual del cursor (se sincroniza con el raton real)
  var cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  try {
    window.addEventListener("mousemove", function (ev) {
      if (ev.isTrusted === false) return; // ignorar eventos sinteticos
      cursor.x = ev.clientX; cursor.y = ev.clientY;
    }, true);
  } catch (e) {}

  function moverRaton(dx, dy) {
    var c = canvasJuego();
    if (!c) return;
    var rect = c.getBoundingClientRect();
    cursor.x = Math.max(0, Math.min(window.innerWidth - 1, cursor.x + dx));
    cursor.y = Math.max(0, Math.min(window.innerHeight - 1, cursor.y + dy));
    try {
      var ev = new MouseEvent("mousemove", {
        bubbles: true, cancelable: true,
        clientX: cursor.x, clientY: cursor.y, view: window
      });
      Object.defineProperty(ev, "movementX", { get: function () { return dx; } });
      Object.defineProperty(ev, "movementY", { get: function () { return dy; } });
      Object.defineProperty(ev, "offsetX", { get: function () { return cursor.x - rect.left; } });
      Object.defineProperty(ev, "offsetY", { get: function () { return cursor.y - rect.top; } });
      c.dispatchEvent(ev);
    } catch (e) {}
  }

  var botonesRaton = { 0: false, 1: false, 2: false };
  function clickRaton(tipo, boton) { // boton browser: 0 izq, 1 medio, 2 der
    var c = canvasJuego();
    if (!c) return;
    var rect = c.getBoundingClientRect();
    try {
      var ev = new MouseEvent(tipo, {
        bubbles: true, cancelable: true,
        button: boton,
        clientX: cursor.x, clientY: cursor.y, view: window
      });
      Object.defineProperty(ev, "offsetX", { get: function () { return cursor.x - rect.left; } });
      Object.defineProperty(ev, "offsetY", { get: function () { return cursor.y - rect.top; } });
      c.dispatchEvent(ev);
      if (tipo === "mousedown") botonesRaton[boton] = true;
      else botonesRaton[boton] = false;
    } catch (e) {}
  }
  function mantenerClick(boton, mantenida) {
    if (mantenida && !botonesRaton[boton]) clickRaton("mousedown", boton);
    else if (!mantenida && botonesRaton[boton]) clickRaton("mouseup", boton);
  }
  function soltarTodoRaton() {
    for (var b in botonesRaton) if (botonesRaton[b]) clickRaton("mouseup", parseInt(b, 10));
  }

  function rueda(delta) {
    var c = canvasJuego();
    if (!c) return;
    try {
      var ev = new WheelEvent("wheel", {
        bubbles: true, cancelable: true, deltaY: delta
      });
      c.dispatchEvent(ev);
    } catch (e) {}
  }

  // ---------------- estado del mando ----------------
  var mando = null;            // objeto Gamepad activo
  var conectado = false;
  var vistoUltimaVez = 0;
  var prev = [];               // estado anterior de botones
  var mantenido = [];          // estado actual (para otros mods)
  var pulsado = [];            // latch: true hasta que se consuma

  function leerMando() {
    try {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        if (pads[i]) { return pads[i]; }
      }
    } catch (e) {}
    return null;
  }

  function vibrar(ms, fuerza) {
    try {
      if (mando && mando.vibrationActuator && mando.vibrationActuator.playEffect) {
        mando.vibrationActuator.playEffect("dual-rumble", {
          duration: ms || 120,
          strongMagnitude: fuerza || 0.75,
          weakMagnitude: (fuerza || 0.75) * 0.5
        });
      }
    } catch (e) {}
  }

  // API publica para otros mods (pistolas, dragones...)
  window.JCMando = {
    version: 1,
    conectado: function () { return conectado && CFG.activo; },
    mantenida: function (i) { return !!mantenido[i]; },       // boton presionado ahora
    consumir: function (i) {                                   // fue pulsado? (se consume)
      if (pulsado[i]) { pulsado[i] = false; return true; }
      return false;
    },
    valor: function (i) {                                      // valor analogico (gatillos)
      try { return mando && mando.buttons[i] ? (mando.buttons[i].value || 0) : 0; }
      catch (e) { return 0; }
    },
    eje: function (a) {
      try { return mando ? (mando.axes[a] || 0) : 0; } catch (e) { return 0; }
    },
    vibrar: vibrar,
    mirarCamara: function (dx, dy) { moverRaton(dx, dy); }     // para mods que muevan la camara
  };

  // ---------------- HUD del mando ----------------
  var ICONO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABS0lEQVR4nGNgGAWjYBSMglEwCoYwYCRGkZi49H8YOyW3Gi4+Z3IrVRyBy8xXL58SdB8TVVwwgGDIewBnFCEnGztXf7i4moYOnH3rxhWCFlCinpjkNORjYMh7gAWXBHKUqWnowJMTtZLNnLI7cHbXpgCs6kdLoaEAcCYhZIAcrU5ODgTV79t3AKv4H4M2OLtr0zI4u+wQgp0ipkeMk+BgyMfAkPcAUUkIFzh14gScbWZhQVC91g9EUjnktwvOvnWDtGSDDIZ8DAx5D1CUhIhJNrgqNYkbUgTVEwOGfAwMeQ+gJCHkJjRaWwiuBlclhQxo0eTG5bYhHwND3gNE9ciIadbSAhDjhiEfA0PeAySPC9E6OZFq15CPgSHvAZKTAy2SEyVmDvkYGPIeoCgJhMRkwaN+zZJpJJlFiV5kMORjYMh7YBSMglEwCgYWAABo1nOqWZi6ogAAAABJRU5ErkJggg==";

  var hud = null;
  function crearHUD() {
    if (hud) return;
    hud = document.createElement("div");
    hud.style.cssText =
      "position:fixed;left:10px;bottom:10px;z-index:99998;display:none;" +
      "align-items:center;gap:8px;padding:6px 10px;" +
      "background:rgba(12,16,22,0.78);border:2px solid #2a3a4d;border-radius:6px;" +
      "font:bold 12px monospace;color:#cfe2ff;letter-spacing:1px;" +
      "text-shadow:1px 1px 2px #000;pointer-events:none;user-select:none;";
    var img = document.createElement("img");
    img.src = ICONO;
    img.width = 28; img.height = 28;
    img.style.cssText = "image-rendering:pixelated;";
    hud.appendChild(img);
    var txt = document.createElement("span");
    txt.id = "jcmando_txt";
    txt.textContent = "MANDO";
    hud.appendChild(txt);
    document.body.appendChild(hud);
  }
  function hudTexto(t) {
    var el = document.getElementById("jcmando_txt");
    if (el) el.textContent = t;
  }
  function hudVisible(v) { if (hud) hud.style.display = v ? "flex" : "none"; }

  // ---------------- ayuda (cruceta arriba) ----------------
  var ayudaAbierta = false;
  var panelAyuda = null;
  function toggleAyuda() {
    ayudaAbierta = !ayudaAbierta;
    if (!ayudaAbierta) {
      if (panelAyuda) panelAyuda.remove();
      panelAyuda = null;
      return;
    }
    panelAyuda = document.createElement("div");
    panelAyuda.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);" +
      "z-index:99999;background:rgba(10,14,20,0.94);border:2px solid #eeb13e;" +
      "border-radius:8px;padding:16px 22px;color:#eaf2ff;" +
      "font:13px monospace;line-height:1.7;text-shadow:1px 1px 2px #000;" +
      "pointer-events:none;user-select:none;box-shadow:0 12px 40px rgba(0,0,0,0.6);";
    var html =
      "<div style='color:#eeb13e;font-weight:bold;font-size:15px;margin-bottom:8px;" +
      "letter-spacing:1px;'>MANDO DE XBOX \u00b7 CONTROLES</div>" +
      "<table style='border-collapse:collapse'>" +
      "<tr><td style='color:#7fe07f;padding-right:14px'>Palancas</td><td>moverte \u00b7 mirar</td></tr>" +
      "<tr><td style='color:#7fe07f'>Gatillo der. (RT)</td><td>atacar / picar</td></tr>" +
      "<tr><td style='color:#7fe07f'>Gatillo izq. (LT)</td><td>usar / colocar</td></tr>" +
      "<tr><td style='color:#7fe07f'>A</td><td>saltar \u00b7 (en menus: clic)</td></tr>" +
      "<tr><td style='color:#7fe07f'>B</td><td>agacharse \u00b7 (en menus: atras)</td></tr>" +
      "<tr><td style='color:#7fe07f'>X</td><td>inventario</td></tr>" +
      "<tr><td style='color:#7fe07f'>Y</td><td>soltar objeto</td></tr>" +
      "<tr><td style='color:#7fe07f'>LB / RB</td><td>ranura anterior / siguiente</td></tr>" +
      "<tr><td style='color:#7fe07f'>Click pal. izq.</td><td>correr</td></tr>" +
      "<tr><td style='color:#7fe07f'>Click pal. der.</td><td>cambiar vista</td></tr>" +
      "<tr><td style='color:#7fe07f'>View (\u23ea)</td><td>chat</td></tr>" +
      "<tr><td style='color:#7fe07f'>Menu (\u229e)</td><td>pausa</td></tr>" +
      "<tr><td style='color:#7fe07f'>Cruceta \u2191</td><td>esta ayuda</td></tr>" +
      "<tr><td style='color:#7fe07f'>Cruceta \u2193</td><td>copiar bloque</td></tr>" +
      "<tr><td style='color:#7fe07f'>Cruceta \u2192 / \u2190</td><td>teclas R / G (mods)</td></tr>" +
      "</table>" +
      "<div style='color:#7d8fa3;margin-top:8px;font-size:11px'>/mando sensibilidad 1-4 \u00b7 /mando invertir</div>";
    panelAyuda.innerHTML = html;
    document.body.appendChild(panelAyuda);
  }

  // ---------------- chat con teclado en pantalla ----------------
  var chatAbierto = false;
  var chatBox = null;
  function abrirChat() {
    if (chatAbierto) return;
    chatAbierto = true;
    chatBox = document.createElement("div");
    chatBox.style.cssText =
      "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);" +
      "z-index:99999;width:min(640px,86vw);";
    var input = document.createElement("input");
    input.id = "jcmando_chat";
    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = "Escribe y pulsa Enter para enviar...";
    input.style.cssText =
      "width:100%;box-sizing:border-box;padding:10px 12px;" +
      "background:rgba(0,0,0,0.72);border:2px solid #2a3a4d;outline:none;" +
      "color:#fff;font:14px monospace;";
    chatBox.appendChild(input);
    var pista = document.createElement("div");
    pista.style.cssText =
      "color:#9fb0c4;font:11px monospace;margin-top:4px;text-shadow:1px 1px 2px #000;" +
      "text-align:right;";
    pista.textContent = "Enter: enviar \u00b7 Esc: cancelar";
    chatBox.appendChild(pista);
    document.body.appendChild(chatBox);
    input.focus();

    // evitar que el juego reciba las teclas escritas
    function frenar(ev) { ev.stopPropagation(); }
    input.addEventListener("keydown", frenar);
    input.addEventListener("keyup", frenar);
    input.addEventListener("keypress", frenar);

    input.addEventListener("keydown", function (ev) {
      ev.stopPropagation();
      if (ev.key === "Enter") {
        var texto = input.value.trim();
        cerrarChat();
        if (texto && window.ModAPI && ModAPI.network &&
            ModAPI.network.sendPacketChatMessage) {
          try { ModAPI.network.sendPacketChatMessage({ messageIn: texto }); } catch (e) {}
        }
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cerrarChat();
      }
    });
  }
  function cerrarChat() {
    chatAbierto = false;
    if (chatBox) { chatBox.remove(); chatBox = null; }
  }

  // ---------------- bucle principal ----------------
  var agachado = false;
  var ultimoModoGUI = false;

  function procesarBotones(g, gui) {
    var B = g.buttons;
    function pulso(i) { return B[i] && B[i].pressed; }

    // deteccion de flancos
    for (var i = 0; i < B.length; i++) {
      var ahora = !!(B[i] && B[i].pressed);
      if (ahora && !prev[i]) pulsado[i] = true;   // acaba de pulsarse
      mantenido[i] = ahora;
      prev[i] = ahora;
    }

    if (!CFG.activo) return;

    // --- comunes ---
    if (pulso(12)) toggleAyuda();                          // cruceta arriba
    if (pulso(9)) tecla("keydown", 27), setTimeout(function(){tecla("keyup",27);},30); // Menu -> pausa

    if (gui) {
      // ----- modo menus: cursor virtual -----
      mantenerTecla(87, false); mantenerTecla(65, false);
      mantenerTecla(83, false); mantenerTecla(68, false);
      mantenerClick(0, false); mantenerClick(2, false); mantenerClick(1, false);

      if (pulso(0)) { clickRaton("mousedown", 0); clickRaton("mouseup", 0); }   // A = clic
      if (pulso(1)) { tecla("keydown", 27); setTimeout(function(){tecla("keyup",27);},30); } // B = atras
      if (pulso(4)) rueda(-120);                          // LB = subir lista
      if (pulso(5)) rueda(120);                           // RB = bajar lista
      if (pulso(2)) { tecla("keydown", 69); setTimeout(function(){tecla("keyup",69);},30); } // X = inventario
    } else {
      // ----- modo jugando -----
      // A = saltar (mantener)
      mantenerTecla(32, !!pulso(0));
      // B = agacharse (conmutado)
      if (pulso(1)) {
        agachado = !agachado;
        hudTexto(agachado ? "MANDO \u00b7 AGACHADO" : "MANDO");
      }
      mantenerTecla(16, agachado);
      // X = inventario
      if (pulso(2)) { tecla("keydown", 69); setTimeout(function(){tecla("keyup",69);},30); }
      // Y = soltar objeto
      if (pulso(3)) { tecla("keydown", 81); setTimeout(function(){tecla("keyup",81);},30); }
      // LB / RB = ranura anterior / siguiente
      if (pulso(4)) rueda(120);
      if (pulso(5)) rueda(-120);
      // gatillos analogicos -> clic mantenido
      var rt = B[7] ? (B[7].value || (B[7].pressed ? 1 : 0)) : 0;
      var lt = B[6] ? (B[6].value || (B[6].pressed ? 1 : 0)) : 0;
      mantenerClick(0, rt > 0.35);   // RT -> atacar
      mantenerClick(2, lt > 0.35);   // LT -> usar
      // click palanca izq. = correr
      mantenerTecla(17, !!pulso(10));
      // click palanca der. = vista
      if (pulso(11)) { tecla("keydown", 116); setTimeout(function(){tecla("keyup",116);},30); }
      // cruceta abajo = copiar bloque (click central)
      if (pulso(13)) { clickRaton("mousedown", 1); clickRaton("mouseup", 1); }
      // cruceta derecha = R (disparar en mods)
      if (pulso(15)) { tecla("keydown", 82); setTimeout(function(){tecla("keyup",82);},30); }
      // cruceta izquierda = G (recargar en mods)
      if (pulso(14)) { tecla("keydown", 71); setTimeout(function(){tecla("keyup",71);},30); }
      // View = chat
      if (pulso(8)) abrirChat();
    }
  }

  function procesarEjes(g, gui) {
    if (!CFG.activo) return;
    var dz = CFG.zonaMuerta;
    var ax = g.axes[0] || 0, ay = g.axes[1] || 0;   // palanca izq.
    var rx = g.axes[2] || 0, ry = g.axes[3] || 0;   // palanca der.

    if (gui) {
      // mover cursor virtual
      if (Math.abs(ax) > dz || Math.abs(ay) > dz) {
        moverRaton(ax * CFG.cursorVel, ay * CFG.cursorVel);
      }
    } else {
      // WASD
      mantenerTecla(87, ay < -dz);  // W
      mantenerTecla(83, ay > dz);   // S
      mantenerTecla(65, ax < -dz);  // A
      mantenerTecla(68, ax > dz);   // D
      // camara con la palanca derecha
      if (Math.abs(rx) > dz || Math.abs(ry) > dz) {
        var dx = rx * CFG.sensibilidad;
        var dy = (CFG.invertirY ? -ry : ry) * CFG.sensibilidad;
        moverRaton(dx, dy);
      }
    }
  }

  var tSinMando = 0;
  function tickMando() {
    var g = leerMando();
    var ahora = Date.now();
    if (g) {
      tSinMando = 0;
      if (!conectado) {
        conectado = true;
        crearHUD();
        hudVisible(true);
        hudTexto("MANDO CONECTADO");
        toast("Mando de Xbox conectado. Cruceta arriba = controles.", 5, "#4fc058");
        vibrar(180, 0.5);
        setTimeout(function () { if (conectado && !agachado) hudTexto("MANDO"); }, 4000);
      }
      mando = g;
      var gui = enGUI() || chatAbierto;
      if (gui && !ultimoModoGUI) {
        // al entrar en menu: soltar teclas de movimiento y clics
        soltarTodasTeclas(); soltarTodoRaton();
        mantenerTecla(16, false);
      }
      if (!gui && ultimoModoGUI && agachado) mantenerTecla(16, true);
      ultimoModoGUI = gui;
      procesarEjes(g, gui);
      procesarBotones(g, gui);
      vistoUltimaVez = ahora;
    } else {
      mando = null;
      if (conectado) {
        if (!tSinMando) tSinMando = ahora;
        if (ahora - tSinMando > 1500) {
          conectado = false;
          soltarTodasTeclas(); soltarTodoRaton();
          mantenerTecla(16, false);
          agachado = false;
          hudVisible(false);
          if (ayudaAbierta) toggleAyuda();
          cerrarChat();
          toast("Mando desconectado.", 3, "#eeb13e");
        }
      }
    }
  }

  // seguridad: al perder el foco, soltar todo
  try {
    window.addEventListener("blur", function () {
      soltarTodasTeclas(); soltarTodoRaton();
    });
  } catch (e) {}

  // ---------------- comandos ----------------
  function ayudaCmd() {
    toast("Mando: palancas = moverte/mirar \u00b7 RT atacar \u00b7 LT usar \u00b7 A saltar \u00b7 B agacharse \u00b7 " +
          "X inventario \u00b7 Y soltar \u00b7 LB/RB ranuras \u00b7 View chat \u00b7 Menu pausa \u00b7 " +
          "cruceta arriba = tabla completa.", 12, "#4fc058");
  }
  function manejarComando(partes) {
    var sub = (partes[0] || "").toLowerCase();
    if (sub === "ayuda" || sub === "help") { ayudaCmd(); return; }
    if (sub === "on") { CFG.activo = true; guardarCFG(); toast("Mando activado.", 3); return; }
    if (sub === "off") {
      CFG.activo = false; guardarCFG();
      soltarTodasTeclas(); soltarTodoRaton();
      toast("Mando desactivado (los botones ya no hacen nada). /mando on para volver.", 5, "#eeb13e");
      return;
    }
    if (sub === "invertir") {
      CFG.invertirY = !CFG.invertirY; guardarCFG();
      toast("Eje Y de la camara " + (CFG.invertirY ? "INVERTIDO" : "normal") + ".", 4);
      return;
    }
    if (sub === "vibrar" || sub === "vibracion") { vibrar(300, 1); toast("Asi vibra el mando.", 3); return; }
    if (sub === "sensibilidad" || sub === "sens") {
      var n = parseFloat(partes[1]);
      if (isNaN(n) || n < 0.5 || n > 4) { toast("Uso: /mando sensibilidad 0.5 a 4 (actual: " + CFG.sensibilidad + ")", 5); return; }
      CFG.sensibilidad = Math.round(11 * n); guardarCFG();
      toast("Sensibilidad de camara: " + n + "x", 4);
      return;
    }
    ayudaCmd();
  }

  // ---------------- arranque ----------------
  try {
    if (!window.ModAPI || typeof ModAPI.addEventListener !== "function") return;

    ModAPI.addEventListener("load", function () {
      crearHUD();
      try {
        window.addEventListener("gamepadconnected", function (ev) {
          // el bucle lo detectara en el siguiente frame
        });
      } catch (e) {}
      toast("Mod MANDO DE XBOX listo. Conecta el mando por USB o Bluetooth y pulsa un boton.", 8, "#4fc058");
    });

    ModAPI.addEventListener("sendchatmessage", function (ev) {
      try {
        if (!ev || typeof ev.message !== "string") return;
        var msg = ev.message.trim().toLowerCase();
        if (msg === "/mando" || msg.indexOf("/mando ") === 0) {
          ev.preventDefault = true;
          manejarComando(msg.slice(1).split(/\s+/).slice(1));
        }
      } catch (e) {}
    });

    ModAPI.addEventListener("frame", function () {
      try { tickMando(); } catch (e) {}
    });
  } catch (e) {
    console.error("[mod:mando] error:", e);
  }
})();
