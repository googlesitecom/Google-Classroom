"use strict";
// modpack.js - Sistema de paquete de mods para EaglerForge
// 1) ModStore: guarda el codigo de los mods en localStorage ("ml::ModData")
//    para que los mods instalados (de .js o .jar) duren entre sesiones.
// 2) extraerJsDeJar: abre archivos .jar (son ZIP) y extrae el mod .js de dentro.
//    Nota: los .jar de Java real (con .class) NO pueden ejecutarse en el
//    navegador; solo funcionan los .jar que traen un mod .js dentro.
// 3) ModPackGate: todos los jugadores nuevos deben descargar los mods del
//    sitio (mods/mods.json) antes de poder jugar.

(function () {

  // ------------------------------------------------------------------
  // ModStore: almacen de mods en localStorage
  // ml::ModData = { "<clave>": { n: nombre, t: "js"|"jar", c: codigo } }
  // ------------------------------------------------------------------

  function cargarDatos() {
    try {
      return JSON.parse(localStorage.getItem("ml::ModData") || "{}");
    } catch (e) {
      return {};
    }
  }

  function guardarDatos(d) {
    localStorage.setItem("ml::ModData", JSON.stringify(d));
  }

  window.ModStore = {
    // Guarda un mod y devuelve la referencia "local:<clave>"
    put: function (clave, nombre, codigo, tipo) {
      var d = cargarDatos();
      d[clave] = { n: nombre, t: tipo || "js", c: codigo };
      guardarDatos(d); // puede lanzar error si se llena localStorage
      return "local:" + clave;
    },

    get: function (ref) {
      if (typeof ref !== "string" || ref.indexOf("local:") !== 0) return null;
      var d = cargarDatos();
      return d[ref.slice(6)] || null;
    },

    // Convierte "local:clave" en una URL data: lista para ejecutar
    resolve: function (ref) {
      var v = this.get(ref);
      if (!v) return null;
      return "data:text/javascript," + encodeURIComponent(v.c);
    },

    remove: function (ref) {
      if (typeof ref !== "string" || ref.indexOf("local:") !== 0) return;
      var d = cargarDatos();
      delete d[ref.slice(6)];
      guardarDatos(d);
    },

    // Convierte "Mi Mod (1).jar" en una clave segura: "mi_mod_1"
    sanitize: function (nombreArchivo) {
      var s = String(nombreArchivo || "mod")
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+/, "")
        .replace(/_+$/, "");
      return s || "mod";
    }
  };

  // ------------------------------------------------------------------
  // Lector de .jar (formato ZIP)
  // ------------------------------------------------------------------

  function u16(d, o) { return d[o] | (d[o + 1] << 8); }
  function u32(d, o) { return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0; }

  async function inflateRaw(u8) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Este navegador no soporta descomprimir .jar (DecompressionStream).");
    }
    var stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    var buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  // Abre un .jar y extrae el mod .js que contiene.
  // Devuelve { ok:true, nombre, archivoInterno, codigo } o { ok:false, error }
  async function extraerJsDeJar(arrayBuffer, nombreJar) {
    var d = new Uint8Array(arrayBuffer);

    // 1) Buscar el fin del directorio central (EOCD)
    var eocd = -1;
    var desde = Math.max(0, d.length - 66000);
    for (var i = d.length - 22; i >= desde; i--) {
      if (d[i] === 0x50 && d[i + 1] === 0x4b && d[i + 2] === 0x05 && d[i + 3] === 0x06) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) {
      return { ok: false, error: "Ese archivo no es un .jar valido (ZIP corrupto o incompleto)." };
    }

    // 2) Recorrer el directorio central
    var nEntradas = u16(d, eocd + 10);
    var cdOff = u32(d, eocd + 16);
    var entradas = [];
    var p = cdOff;
    for (var e = 0; e < nEntradas; e++) {
      if (p + 46 > d.length || u32(d, p) !== 0x02014b50) break;
      var metodo = u16(d, p + 10);
      var cTam = u32(d, p + 20);
      var fnLen = u16(d, p + 28);
      var exLen = u16(d, p + 30);
      var cmLen = u16(d, p + 32);
      var lho = u32(d, p + 42);
      var nombre = "";
      for (var c = 0; c < fnLen; c++) nombre += String.fromCharCode(d[p + 46 + c]);
      entradas.push({ nombre: nombre, metodo: metodo, cTam: cTam, lho: lho });
      p += 46 + fnLen + exLen + cmLen;
    }
    if (!entradas.length) {
      return { ok: false, error: "El .jar esta vacio." };
    }

    // 3) Elegir el .js de dentro
    var hayClass = entradas.some(function (x) { return /\.class$/i.test(x.nombre); });
    var js = entradas.filter(function (x) {
      return /\.js$/i.test(x.nombre) && x.nombre.indexOf("__MACOSX") === -1;
    });
    if (!js.length) {
      if (hayClass) {
        return {
          ok: false,
          error: "Ese .jar es un mod de Java real (contiene archivos .class). " +
            "Los mods de Java no funcionan en la version del navegador. " +
            "Usa un mod .js o un .jar que traiga el mod .js dentro."
        };
      }
      return { ok: false, error: "El .jar no contiene ningun mod (.js) en su interior." };
    }
    js.sort(function (a, b) {
      function puntos(x) {
        var n = x.nombre.toLowerCase();
        if (n === "mod.js") return 0;
        if (n === "main.js") return 1;
        if (n.indexOf("/") === -1) return 2; // en la raiz
        return 3;
      }
      return puntos(a) - puntos(b);
    });
    var ent = js[0];

    // 4) Leer los datos desde el header local
    var lo = ent.lho;
    if (lo + 30 > d.length || u32(d, lo) !== 0x04034b50) {
      return { ok: false, error: "El .jar esta corrupto (entrada invalida)." };
    }
    var lfnLen = u16(d, lo + 26);
    var lexLen = u16(d, lo + 28);
    var ini = lo + 30 + lfnLen + lexLen;
    var datos = d.slice(ini, ini + ent.cTam);
    var texto;
    if (ent.metodo === 0) {
      texto = new TextDecoder().decode(datos);
    } else if (ent.metodo === 8) {
      var inflado = await inflateRaw(datos);
      texto = new TextDecoder().decode(inflado);
    } else {
      return { ok: false, error: "El .jar usa una compresion no soportada (metodo " + ent.metodo + ")." };
    }

    var mostrar = String(nombreJar || ent.nombre).replace(/\.(jar|zip)$/i, "");
    return { ok: true, nombre: mostrar, archivoInterno: ent.nombre, codigo: texto, tipo: "jar" };
  }
  window.extraerJsDeJar = extraerJsDeJar;

  // Instala un archivo (.js o .jar) desde su contenido ArrayBuffer.
  // Devuelve la referencia "local:clave" para la lista de mods.
  async function instalarArchivo(nombreArchivo, arrayBuffer, nombreMostrar) {
    var nombre = String(nombreArchivo || "mod");
    var codigo, tipo;
    if (/\.(jar|zip)$/i.test(nombre)) {
      var r = await extraerJsDeJar(arrayBuffer, nombre);
      if (!r.ok) throw new Error(r.error);
      codigo = r.codigo;
      tipo = "jar";
    } else {
      codigo = new TextDecoder().decode(arrayBuffer);
      tipo = "js";
    }
    var clave = window.ModStore.sanitize(nombre);
    var mostrar = nombreMostrar || nombre.replace(/\.[^.]+$/, "") || clave;
    return window.ModStore.put(clave, mostrar, codigo, tipo);
  }
  window.instalarArchivo = instalarArchivo;

  // ------------------------------------------------------------------
  // ModPackGate: descarga OBLIGATORIA de mods para cada jugador nuevo
  // ------------------------------------------------------------------

  var MANIFIESTO_URL = "mods/mods.json";
  var MANIFIESTO_POR_DEFECTO = {
    version: 1,
    nombre: "Paquete de mods del sitio",
    mods: [
      { archivo: "fps.js", nombre: "Contador de FPS" },
      { archivo: "bienvenida.js", nombre: "Mensajes de bienvenida" }
    ]
  };

  function obtenerLista() {
    try {
      return JSON.parse(localStorage.getItem("ml::Mods") || "[]");
    } catch (e) {
      return [];
    }
  }
  function guardarLista(l) {
    localStorage.setItem("ml::Mods", JSON.stringify(l));
  }

  async function descargarManifiesto() {
    try {
      var r = await fetch(MANIFIESTO_URL, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      var m = await r.json();
      if (m && typeof m.version !== "undefined" && Array.isArray(m.mods) && m.mods.length) {
        return m;
      }
    } catch (e) {
      console.warn("No se pudo leer mods/mods.json, usando el paquete por defecto:", e);
    }
    return MANIFIESTO_POR_DEFECTO;
  }

  function crearPanel() {
    var panel = document.createElement("div");
    panel.id = "modpack_panel";
    panel.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;z-index:1001;" +
      "background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;" +
      "font-family:sans-serif;color:#e0e0e0;";
    var caja = document.createElement("div");
    caja.style.cssText =
      "max-width:520px;width:90%;background:#2a2a2a;border:2px solid #555;" +
      "border-radius:6px;padding:24px 28px;box-shadow:0 0 30px #000;";
    panel.appendChild(caja);
    document.body.appendChild(panel);
    return { panel: panel, caja: caja };
  }

  function botonMC(texto) {
    var b = document.createElement("button");
    b.textContent = texto;
    b.style.cssText =
      "display:block;width:100%;margin-top:14px;padding:12px 10px;font-size:16px;" +
      "color:#e0e0e0;background:#6e6e6e;border:2px solid #000;" +
      "box-shadow:inset 2px 2px 0 #9c9c9c, inset -2px -2px 0 #4a4a4a;" +
      "cursor:pointer;text-shadow:2px 2px 0 #3f3f3f;";
    b.addEventListener("mouseenter", function () { b.style.background = "#7f8cff22"; b.style.background = "#8a8a8a"; });
    b.addEventListener("mouseleave", function () { b.style.background = "#6e6e6e"; });
    return b;
  }

  async function instalarPaquete(m, setProgreso) {
    var lista = obtenerLista();
    for (var i = 0; i < m.mods.length; i++) {
      var mod = m.mods[i];
      setProgreso("Descargando " + (i + 1) + "/" + m.mods.length + ": " + (mod.nombre || mod.archivo) + "...");
      var r = await fetch("mods/" + mod.archivo, { cache: "no-store" });
      if (!r.ok) {
        throw new Error("No se pudo descargar mods/" + mod.archivo + " (HTTP " + r.status + ")");
      }
      var buf = await r.arrayBuffer();
      var ref = await instalarArchivo(mod.archivo, buf, mod.nombre || null);
      // Quitar entradas viejas de este mismo mod (URL o local)
      var clave = ref.slice(6);
      lista = lista.filter(function (x) {
        if (x === ref) return false;
        if (typeof x === "string" && x.indexOf("mods/" + mod.archivo) !== -1) return false;
        if (typeof x === "string" && x.indexOf("local:") === 0 && x.slice(6) === clave) return false;
        return true;
      });
      lista.push(ref);
    }
    guardarLista(lista);
    try {
      localStorage.setItem("ml::ModPackVersion", String(m.version));
    } catch (e) { /* sin espacio; la lista ya quedo guardada */ }
  }

  window.ModPackGate = {
    // Devuelve true cuando el jugador ya tiene los mods (los descargo antes)
    // o cuando acaba de instalarlos. Muestra el panel obligatorio si faltan.
    ensure: async function () {
      var soportaLS = true;
      try {
        localStorage.setItem("ml::TestLS", "1");
        localStorage.removeItem("ml::TestLS");
      } catch (e) {
        soportaLS = false;
      }
      if (!soportaLS) return true; // sin localStorage no hay nada que hacer

      var m = await descargarManifiesto();

      var instalado = null;
      try {
        instalado = localStorage.getItem("ml::ModPackVersion");
      } catch (e) { /* ignorar */ }

      if (instalado === String(m.version)) return true; // ya los tiene

      return new Promise(function (resolver) {
        var ui = crearPanel();
        var caja = ui.caja;

        function pintar(intentando, mensaje) {
          caja.innerHTML = "";
          var titulo = document.createElement("h2");
          titulo.textContent = "Mods requeridos";
          titulo.style.cssText = "margin:0 0 6px 0;color:#fff;font-size:22px;text-shadow:0 0 6px #000;";
          caja.appendChild(titulo);

          var sub = document.createElement("p");
          sub.textContent = "Para jugar en este sitio debes descargar e instalar estos mods:";
          sub.style.cssText = "margin:4px 0 12px 0;font-size:14px;color:#bbb;";
          caja.appendChild(sub);

          var ul = document.createElement("ul");
          ul.style.cssText = "margin:0 0 12px 0;padding-left:22px;font-size:14px;";
          m.mods.forEach(function (mod) {
            var li = document.createElement("li");
            li.style.cssText = "margin:3px 0;";
            var b = document.createElement("b");
            b.textContent = mod.nombre || mod.archivo;
            b.style.color = "#7fe07f";
            li.appendChild(b);
            var s = document.createElement("span");
            s.textContent = "  (mods/" + mod.archivo + ")";
            s.style.color = "#888";
            s.style.fontSize = "12px";
            li.appendChild(s);
            ul.appendChild(li);
          });
          caja.appendChild(ul);

          var nota = document.createElement("p");
          nota.textContent = "Se descargan una sola vez y se guardan en tu navegador.";
          nota.style.cssText = "margin:0 0 4px 0;font-size:12px;color:#888;";
          caja.appendChild(nota);

          if (!intentando) {
            var btn = botonMC("Descargar e instalar");
            btn.addEventListener("click", function () {
              btn.disabled = true;
              btn.style.opacity = "0.5";
              intentarlo();
            });
            caja.appendChild(btn);
          } else {
            var prog = document.createElement("p");
            prog.textContent = mensaje || "Descargando mods...";
            prog.style.cssText = "margin:14px 0 0 0;font-size:14px;color:#ffd966;";
            caja.appendChild(prog);
          }
        }

        async function intentarlo() {
          pintar(true, "Descargando mods...");
          try {
            await instalarPaquete(m, function (msg) {
              var p = caja.querySelector("p:last-child");
              if (p) p.textContent = msg;
            });
            // Instalado: cerrar panel y dejar jugar
            ui.panel.style.transition = "opacity 0.3s ease";
            ui.panel.style.opacity = "0";
            setTimeout(function () {
              if (ui.panel.parentNode) ui.panel.parentNode.removeChild(ui.panel);
            }, 320);
            resolver(true);
          } catch (ex) {
            console.error("Error al instalar el paquete de mods:", ex);
            pintar(false);
            var err = document.createElement("p");
            err.textContent = "Error: " + (ex && ex.message ? ex.message : ex) +
              ". Revisa tu conexion.";
            err.style.cssText = "margin:12px 0 0 0;font-size:13px;color:#ff6a6a;";
            caja.appendChild(err);
          }
        }

        pintar(false);
      });
    }
  };

})();
