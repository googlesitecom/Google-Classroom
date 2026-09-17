package modjava;

import org.teavm.jso.JSBody;
import org.teavm.jso.JSFunctor;
import org.teavm.jso.JSObject;

/**
 * Mod Java REAL para el EaglercraftX del sitio.
 *
 * Este archivo es Java de verdad: se compila con javac y luego TeaVM lo
 * convierte a JavaScript para que corra dentro del navegador (el mismo
 * mecanismo que usa EaglerForge). La comunicacion con el juego se hace
 * a traves de la ModAPI de JavaScript usando anotaciones @JSBody.
 */
public final class ModJavaReal {

    /** Interfaz puente: permite que el juego (JavaScript) llame a codigo Java. */
    @JSFunctor
    public interface Escucha extends JSObject {
        void llamar(String dato);
    }

    /** Registra un oyente de la ModAPI del juego. */
    @JSBody(params = { "evento", "escucha" }, script =
        "ModAPI.addEventListener(evento, function(d){" +
        " escucha(d && d.key !== undefined ? String(d.key) : '');" +
        "});")
    private static native void escucharEvento(String evento, Escucha escucha);

    /** Muestra un aviso (toast) en la pantalla del juego. */
    @JSBody(params = { "mensaje", "segundos" }, script =
        "var t=document.createElement('div');" +
        "t.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;" +
        "max-width:360px;padding:10px 14px;color:#fff;" +
        "background:rgba(20,20,20,0.85);border:2px solid #ffb84d;border-radius:6px;" +
        "font:14px sans-serif;text-shadow:1px 1px 2px #000;" +
        "box-shadow:0 4px 12px rgba(0,0,0,0.5);pointer-events:none;user-select:none;';" +
        "t.textContent=mensaje;" +
        "document.body.appendChild(t);" +
        "setTimeout(function(){t.style.transition='opacity 0.6s ease';t.style.opacity='0';" +
        " setTimeout(function(){t.remove();},700);},(segundos||6)*1000);")
    private static native void avisar(String mensaje, int segundos);

    // ------------------------------------------------------------------
    // Logica del mod: todo lo de abajo es Java normal (de JVM).
    // ------------------------------------------------------------------

    private int tics;
    private int avisos;
    private final long inicio;

    private ModJavaReal() {
        this.tics = 0;
        this.avisos = 0;
        this.inicio = System.currentTimeMillis();
    }

    /** Punto de entrada: TeaVM ejecuta main() al cargar el script. */
    public static void main(String[] args) {
        new ModJavaReal().iniciar();
    }

    private void iniciar() {
        avisos++;
        avisar("[Java] Mod cargado: escrito y compilado 100% en Java "
                + "(javac + TeaVM). Pulsa F8 para ver su estado.", 9);
        escucharEvento("update", new Escucha() {
            @Override
            public void llamar(String dato) {
                contar();
            }
        });
        escucharEvento("key", new Escucha() {
            @Override
            public void llamar(String dato) {
                tecla(dato);
            }
        });
    }

    private void contar() {
        tics++;
        if (tics % 1200 == 0) { // cada ~60 segundos de juego
            avisos++;
            avisar(estado(), 7);
        }
    }

    private void tecla(String dato) {
        if ("119".equals(dato)) { // F8
            avisos++;
            avisar(estado(), 7);
        }
    }

    private String estado() {
        long segundos = (System.currentTimeMillis() - inicio) / 1000L;
        return "[Java] Activo hace " + segundos + " s | tics: " + tics
                + " | avisos: " + avisos + " | JVM: TeaVM";
    }
}
