#!/usr/bin/env python3
"""Empaqueta tu mod Java compilado como .jar listo para el juego.

Antes de correr esto, compila el mod con:
    mvn package

(Esto genera target/teavm/classes.js a partir de tu codigo Java,
usando javac + TeaVM. Necesitas Python 3 para este paso final.)
"""
import os
import zipfile

BASE = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(BASE, "target", "teavm", "classes.js")
DESTINO = os.path.join(BASE, "mi-mod-java.jar")

if not os.path.exists(ORIGEN):
    print("No encontre", ORIGEN)
    print("Primero compila el mod:  mvn package")
    raise SystemExit(1)

with open(ORIGEN, "r", encoding="utf-8") as f:
    teavm = f.read()

# Envoltura: expone el modulo UMD de TeaVM en un objeto local (para no
# sobrescribir window.main del juego) y llama a main() al cargar.
#
# IMPORTANTE: la linea "Mod-Type: java-teavm" es el marcador que el juego
# usa para reconocer este .jar como "mod Java real". No la borres.
mod_js = """/* Mod Java compilado con javac + TeaVM
 * Mod-Type: java-teavm
 * Escrito en Java de verdad y convertido a JavaScript para el navegador.
 */
(function () {
  "use strict";
  var exports = {};
%%TEAVM%%
  try {
    if (typeof exports.main === "function") {
      exports.main([]);
    } else {
      console.warn("[javamod] el modulo Java no expuso main()");
    }
  } catch (e) {
    console.error("[javamod] error al iniciar el mod Java:", e);
  }
})();
""".replace("%%TEAVM%%", teavm)

manifest = """Manifest-Version: 1.0
Created-By: javac + TeaVM
Mod-Type: eaglercraft-teavm
Mod-Entry: mod.js
"""

with zipfile.ZipFile(DESTINO, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("mod.js", mod_js)
    z.writestr("META-INF/MANIFEST.MF", manifest)

print("Creado:", DESTINO, os.path.getsize(DESTINO), "bytes")
print("Ya puedes subirlo al juego con el boton 'Subir archivo (.js o .jar)'.")
