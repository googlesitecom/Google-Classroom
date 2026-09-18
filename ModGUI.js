function displayGui() {
  // Un articulo de la tienda cuenta como instalado si su ref (local:clave o
  // mods/archivo) esta en la lista de mods.
  window.estaInstaladoModTienda = function (articulo) {
    var lista;
    try {
      lista = JSON.parse(localStorage.getItem("ml::Mods") || "[]");
    } catch (e) {
      lista = [];
    }
    var clave = (articulo.clave || window.ModStore.sanitize(articulo.archivo));
    var ref = "local:" + clave;
    for (var i = 0; i < lista.length; i++) {
      var x = lista[i];
      if (x === ref) return true;
      if (typeof x === "string" && x.indexOf("mods/" + articulo.archivo) !== -1) return true;
    }
    return false;
  };

  function gui() {
    if (document.querySelector("#eaglerpl_gui")) {
      document.querySelector("#eaglerpl_gui").remove();
    }
    localStorage.setItem(
      "ml::Mods",
      localStorage.getItem("ml::Mods") || "[]"
    );
    try {
      localStorage.setItem(
        "ml::Mods",
        JSON.stringify(JSON.parse(localStorage.getItem("ml::Mods")))
      );
    } catch (error) {
      localStorage.setItem("ml::Mods", "[]");
    }
    var Mods = JSON.parse(localStorage.getItem("ml::Mods"));
    var container = document.createElement("div");
    container.id = "eaglerpl_gui";
    container.style = `width:100%; height: 100%; position: fixed; top: 0; left: 0; z-index: 10; color: white; font-family: Minecraftia, sans-serif; overflow-y: scroll; overflow-x: hidden; background-image: url(data:image/png;base64,UklGRhoBAABXRUJQVlA4TA0BAAAvn8AnAIWjtpEECdnA2N0DsTROy7xUqfrWw0jbyLkJKTz0+I20jTT/Bo89e1YR/Wfktm0Y+wNKLobT7QP/n/B7Z/naW26QHoTpHB7LFouyKHlzeHxfCStSuj9KdbC8z1IJ5iWiyQed48vtYJ+lUu0t4VwranS1XMIutSiLYlbb8G54uf2p3VPSfRZtSrlsPFjOzZZrd/us3B3uK+HcHJQql+xbLMrS/WqNpm6DeZ/VIPVYaN/KzUbp91nd9xl5pYu50dU2W417nbdTj5l2Ne92uM9qXNpyf6+oXkabHKXaZ1HS4Iaqpim+1KIJ+0M49/LjNbTGP5mrrMZEuc7Uzcb1ViOJ6TuOt4NGJs+zDgA=); background-color: rgb(16,23,32); background-blend-mode: multiply; background-size: 64px;`;
    var title = document.createElement("h1");
    title.style = "text-shadow: 0px 0px 4px; border-bottom: 2px solid #2a3a4d; padding-bottom: 0.6rem;";
    title.innerHTML = "<span style='color:#4fc058'>JEFF</span><span style='color:#eeb13e'>CRAFT</span> <span style='color:#7d8fa3;font-size:0.55em'>&middot; Gestor de Mods</span>";
    var closeButton = document.createElement("a");
    closeButton.style = `margin-left: 2rem; color: red;`;
    closeButton.href = "javascript:void(0)";
    closeButton.addEventListener("click", () => {
      document.querySelector("#eaglerpl_gui").remove();
    });
    closeButton.innerHTML = "[X]";
    title.appendChild(closeButton);
    container.appendChild(title);

    // ================= TIENDA DE MODS =================
    var tiendaBox = document.createElement("div");
    tiendaBox.id = "jc_tienda";
    tiendaBox.style =
      "margin: 10px 0 18px 0; padding: 12px 14px; background: rgba(16,23,32,0.75);" +
      "border: 2px solid #2a3a4d; border-radius: 6px;";
    var tiendaTitulo = document.createElement("h2");
    tiendaTitulo.style =
      "margin: 0 0 4px 0; font-size: 1.05rem; color: #eeb13e; text-shadow: 0 0 4px #000;";
    tiendaTitulo.innerHTML =
      "\ud83d\uded2 Tienda de Mods <span style='color:#7d8fa3;font-size:0.6em'>\u00b7 hechos para JEFFCRAFT</span>";
    tiendaBox.appendChild(tiendaTitulo);
    var tiendaSub = document.createElement("p");
    tiendaSub.style = "margin: 2px 0 10px 0; font-size: 0.78rem; color: #9fb0c4;";
    tiendaSub.textContent =
      "Elige cuales instalar. Se descargan una vez y quedan guardados en tu navegador.";
    tiendaBox.appendChild(tiendaSub);
    var tiendaCargando = document.createElement("p");
    tiendaCargando.style = "font-size: 0.8rem; color: #7d8fa3;";
    tiendaCargando.textContent = "Cargando la tienda...";
    tiendaBox.appendChild(tiendaCargando);
    container.appendChild(tiendaBox);

    // catalogo de la tienda
    (function cargarTienda() {
      fetch("mods/tienda.json", { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (cat) {
          tiendaCargando.remove();
          (cat.mods || []).forEach(function (articulo) {
            var instalado = window.estaInstaladoModTienda
              ? window.estaInstaladoModTienda(articulo)
              : false;
            var tarjeta = document.createElement("div");
            tarjeta.style =
              "display: flex; align-items: center; gap: 10px; margin: 8px 0;" +
              "padding: 10px 12px; background: rgba(22,32,44,0.9);" +
              "border: 1px solid #2a3a4d; border-radius: 5px;";
            var icono = document.createElement("div");
            icono.style =
              "font-size: 1.6rem; width: 44px; text-align: center; flex: 0 0 auto;";
            icono.textContent = articulo.emoji || "\ud83d\udce6";
            tarjeta.appendChild(icono);
            var info = document.createElement("div");
            info.style = "flex: 1 1 auto; min-width: 0;";
            var nombreFila = document.createElement("div");
            nombreFila.style = "font-size: 0.95rem;";
            nombreFila.innerHTML =
              "<b style='color:#4fc058'>" + (articulo.nombre || articulo.archivo) + "</b>" +
              " <span style='color:#7d8fa3;font-size:0.7em'>\u00b7 " + (articulo.categoria || "Mod") + "</span>";
            info.appendChild(nombreFila);
            var desc = document.createElement("div");
            desc.style =
              "font-size: 0.75rem; color: #b7c5d4; line-height: 1.35; margin-top: 2px;";
            desc.textContent = articulo.desc || "";
            info.appendChild(desc);
            tarjeta.appendChild(info);
            var boton = document.createElement("button");
            if (instalado) {
              boton.innerHTML = "\u2713 Instalado";
              boton.disabled = true;
              boton.style =
                "flex: 0 0 auto; padding: 8px 12px; cursor: default; font-family: 'Minecraftia', sans-serif;" +
                "font-size: 0.85rem; color: #9fe8a6; background: #1d5526; border: 2px solid #0c2412;" +
                "box-shadow: inset 2px 2px 0 #2d7a38, inset -2px -2px 0 #123f18; text-shadow: 1px 1px 0 #000;";
            } else {
              boton.innerHTML = "Instalar";
              boton.style =
                "flex: 0 0 auto; padding: 8px 12px; cursor: pointer; font-family: 'Minecraftia', sans-serif;" +
                "font-size: 0.85rem; color: #eafff0; background: #2d7a38; border: 2px solid #0c2412;" +
                "box-shadow: inset 2px 2px 0 #4fc058, inset -2px -2px 0 #1d5526; text-shadow: 1px 1px 0 #000;";
              boton.addEventListener("mouseenter", function () { boton.style.background = "#37913f"; });
              boton.addEventListener("mouseleave", function () { boton.style.background = "#2d7a38"; });
              boton.addEventListener("click", function () {
                boton.disabled = true;
                boton.innerHTML = "Descargando...";
                fetch("mods/" + articulo.archivo, { cache: "no-store" })
                  .then(function (r) {
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.arrayBuffer();
                  })
                  .then(function (buf) {
                    return window.instalarArchivo(
                      articulo.archivo, buf, articulo.nombre || null);
                  })
                  .then(function (ref) {
                    var lista = JSON.parse(localStorage.getItem("ml::Mods") || "[]");
                    if (lista.indexOf(ref) === -1) lista.push(ref);
                    localStorage.setItem("ml::Mods", JSON.stringify(lista));
                    if (window.ModLoader) {
                      ModLoader([ref]);
                    }
                    gui(); // refrescar todo el gestor
                  })
                  .catch(function (e) {
                    boton.disabled = false;
                    boton.innerHTML = "Reintentar";
                    window.alert("No se pudo instalar " + (articulo.nombre || articulo.archivo) +
                      ": " + (e && e.message ? e.message : e));
                  });
              });
            }
            tarjeta.appendChild(boton);
            tiendaBox.appendChild(tarjeta);
          });
          if (!(cat.mods || []).length) {
            var vacio = document.createElement("p");
            vacio.style = "font-size: 0.8rem; color: #7d8fa3;";
            vacio.textContent = "La tienda esta vacia por ahora.";
            tiendaBox.appendChild(vacio);
          }
        })
        .catch(function (e) {
          tiendaCargando.textContent =
            "No se pudo cargar la tienda (" + (e && e.message ? e.message : e) + ").";
          tiendaCargando.style.color = "#ff6a6a";
        });
    })();

    var warningPoster = document.createElement("p");
    warningPoster.style = "font-size: 0.8rem; color: orangered;";
    warningPoster.innerHTML =
      "Aviso: al instalar un mod le das control total sobre el juego. Ten cuidado con los mods que instalas.<br>Los mods que elimines seguiran ejecutandose hasta que recargues la pagina.";
    container.appendChild(warningPoster);

    var tipPoster = document.createElement("p");
    tipPoster.style = "font-size: 0.8rem; color: #eeb13e;";
    tipPoster.innerHTML =
      "Consejo: si un mod dice que fallo al cargar, prueba a actualizar la lista.<br>" +
      "Los .jar de Forge/Fabric de Java real no funcionan en el navegador; los .jar" +
      " compilados con TeaVM (como el mod Java Real) si.";
    container.appendChild(tipPoster);

    var table = document.createElement("table");
    table.style = "table-layout: fixed; width: 100%";
    var headerRow = document.createElement("tr");
    headerRow.style = "background: rgb(22,32,44);";
    var urlBox = document.createElement("th");
    urlBox.style = "text-align: center;";
    urlBox.innerHTML = "Mod (URL o archivo)";
    headerRow.appendChild(urlBox);
    var statusBox = document.createElement("th");
    statusBox.style = "text-align: center; width: 15%;";
    statusBox.innerHTML = "Estado";
    headerRow.appendChild(statusBox);
    table.appendChild(headerRow);

    Mods.forEach((url) => {
      var row = document.createElement("tr");
      row.style = `box-shadow: 0px 2px 0px grey;`;
      var urlBox = document.createElement("td");
      urlBox.style = "user-select: text;";
      var textWrapper = document.createElement("div");
      textWrapper.style = `max-width: 100%; overflow-wrap: anywhere; max-height: 3rem; overflow-y: scroll;`;
      // Nombre legible para los mods instalados (local: o URLs de ejemplo)
      var prettyUrl = url;
      if (typeof url === "string" && url.indexOf("mods/fps.js") !== -1 && url.indexOf("local:") !== 0) {
        prettyUrl = "mods/fps.js  (Contador de FPS)";
      } else if (typeof url === "string" && url.indexOf("mods/bienvenida.js") !== -1 && url.indexOf("local:") !== 0) {
        prettyUrl = "mods/bienvenida.js  (Mensajes de bienvenida)";
      } else if (typeof url === "string" && url.indexOf("local:") === 0 && window.ModStore) {
        var v = window.ModStore.get(url);
        if (v) {
          prettyUrl = v.n + (v.t === "java" ? "  (Mod Java real, TeaVM)" : v.t === "jar" ? "  (Mod .jar instalado)" : "  (Mod .js instalado)");
        } else {
          prettyUrl = url + "  (ya no esta guardado)";
        }
      } else if (typeof url === "string" && url.startsWith("data:text/javascript")) {
        prettyUrl = "(Mod subido desde un archivo .js)";
      } else if (typeof url === "string" && url.indexOf(";base64") !== -1) {
        prettyUrl = "(Mod subido desde un archivo .js)";
      }
      textWrapper.innerText = prettyUrl;
      urlBox.append(textWrapper);
      row.appendChild(urlBox);
      var statusBox = document.createElement("td");
      statusBox.innerHTML = ((curl) => {
        // Un mod local cuenta como cargado si su script data: esta en la pagina
        var candidatos = [curl];
        if (window.ModStore && typeof curl === "string" && curl.indexOf("local:") === 0) {
          var r = window.ModStore.resolve(curl);
          if (r) candidatos.push(r);
        }
        var targs = document.querySelectorAll("script[data-Mod]");
        for (let i = 0; i < targs.length; i++) {
          const elem = targs[i];
          if (candidatos.indexOf(elem.getAttribute("data-Mod")) !== -1) {
            return "CARGADO";
          }
        }
        return "FALLO";
      })(url);
      switch (statusBox.innerHTML) {
        case "CARGADO":
          statusBox.style = "background-color: #2d7a38; text-align: center;";
          break;
        case "FALLO":
          statusBox.style = "background-color: #3a3f47; text-align: center;";
          break;
        default:
          break;
      }
      var binBtn = document.createElement("button");
      binBtn.style =
        "background: transparent; text-align: center; color: #eeb13e; cursor: pointer; font-family: 'Minecraftia', sans-serif; text-decoration: underline; border: 0; margin-left: 1rem; font-size: 1rem;";
      binBtn.innerHTML = "[X]";
      binBtn.addEventListener("click", () => {
        if (!window.confirm("Eliminar este mod?") || Mods.indexOf(url) === -1) {
          return;
        }
        Mods.splice(Mods.indexOf(url), 1);
        localStorage.setItem("ml::Mods", JSON.stringify(Mods));
        if (window.ModStore && typeof url === "string" && url.indexOf("local:") === 0) {
          window.ModStore.remove(url);
        }
        gui();
      });
      statusBox.appendChild(binBtn);
      row.appendChild(statusBox);
      table.appendChild(row);
    });

    var addBtn = document.createElement("button");
    addBtn.style =
      "background: transparent; text-align: center; color: #eeb13e; cursor: pointer; font-family: 'Minecraftia', sans-serif; text-decoration: underline; border: 0; margin-right: 1rem;  font-size: 1rem;";
    addBtn.innerHTML = "Anadir nuevo (URL o .jar)";
    addBtn.addEventListener("click", () => {
      var newMod = window.prompt("URL del mod (.js o .jar):", "https://ejemplo.com/mi-mod.js");
      if (!newMod) {
        return; // El usuario cancelo
      }
      if (/\.(jar|zip)(\?|$)/i.test(newMod)) {
        // URL de un .jar: se descarga y se extrae el .js de dentro
        fetch(newMod)
          .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.arrayBuffer();
          })
          .then(function (buf) {
            return window.instalarArchivo(newMod.split("/").pop() || "mod.jar", buf);
          })
          .then(function (ref) {
            Mods.push(ref);
            localStorage.setItem("ml::Mods", JSON.stringify(Mods));
            if (window.ModLoader) {
              ModLoader([ref]);
            }
            gui();
          })
          .catch(function (e) {
            if (e && e.modJava && window.mostrarDialogoModJava) {
              window.mostrarDialogoModJava(e.modJava);
            } else {
              window.alert("No se pudo instalar el .jar: " + (e && e.message ? e.message : e));
            }
          });
        return;
      }
      Mods.push(
        newMod
      );
      localStorage.setItem("ml::Mods", JSON.stringify(Mods));
      if(window.ModLoader){
        ModLoader([newMod]);
      }
      gui();
    });

    var uploadBtn = document.createElement("button");
    uploadBtn.style =
      "background: transparent; text-align: center; color: #eeb13e; cursor: pointer; font-family: 'Minecraftia', sans-serif; text-decoration: underline; border: 0;  font-size: 1rem;";
    uploadBtn.innerHTML = "Subir archivo (.js o .jar)...";
    uploadBtn.addEventListener("click", function uploadBtnListener() {
      var filePicker = document.createElement("input");
      filePicker.type = "file";
      filePicker.accept = ".js,.jar";
      filePicker.addEventListener("input", function onInput() {
        if (filePicker.files[0]) {
          var archivo = filePicker.files[0];
          archivo.arrayBuffer().then(function (buf) {
            return window.instalarArchivo(archivo.name, buf);
          }).then(function (ref) {
            Mods.push(ref);
            localStorage.setItem("ml::Mods", JSON.stringify(Mods));
            if (window.ModLoader) {
              ModLoader([ref]);
            }
            gui();
          }).catch(function (e) {
            if (e && e.modJava && window.mostrarDialogoModJava) {
              window.mostrarDialogoModJava(e.modJava);
            } else {
              window.alert("No se pudo instalar el mod: " + (e && e.message ? e.message : e));
            }
            console.error(e);
          });
        }
      });
      filePicker.click();
    });

    container.appendChild(table);
    container.appendChild(addBtn);
    container.appendChild(uploadBtn);

    var notice = document.createElement("a");
    notice.innerHTML = "Actualizar lista";
    notice.href = "javascript:void(0)";
    notice.addEventListener("click", function reloadListener() {
      setTimeout(gui, 500);
      this.remove();
    });
    notice.style =
      "color: #eeb13e; display: block; margin-top: 2rem; width: 0; white-space: nowrap;";
    container.appendChild(notice);
    ModAPI.events.callEvent("gui", {});
    document.body.appendChild(container);
  }
  gui();
}
