# Como escribir mods Java REALES para este sitio (con TeaVM)

Si sabes Java (o quieres aprenderlo), puedes escribir mods **en Java de
verdad** y usarlos en la version del navegador del juego. Es el mismo
mecanismo que usa el proyecto EaglerForge: el codigo Java se compila con
`javac` y **TeaVM** lo convierte a JavaScript para que corra en el
navegador.

> El sitio ya trae un ejemplo funcionando: el mod **"Java Real (TeaVM)"**
> (pulsa **F8** dentro del juego). Fue generado exactamente con esta
> plantilla.

## Que SI y que NO se puede

| Tipo de .jar | Funciona en el juego? |
| --- | --- |
| .jar compilado con esta plantilla (Java + TeaVM) | SI, al 100% |
| .jar que trae un mod `.js` dentro | SI |
| .jar de Forge / CurseForge / Fabric (con `.class`) | NO (imposible en cualquier navegador) |

Los mods de Forge vienen compilados para la maquina virtual de Java (JVM)
del Minecraft de escritorio, y el navegador no tiene una JVM. Ninguna
version de Eaglercraft puede correrlos: no es una limitacion de este
sitio, es un limite fisico de los navegadores.

## Requisitos (una sola vez)

1. **JDK 17 o superior** (javac). Descargalo de
   <https://adoptium.net/temurin/releases/> (elige "JDK" y tu sistema
   operativo).
2. **Maven 3.8 o superior**. Descargalo de <https://maven.apache.org/download.cgi>.
3. **Python 3** (solo para el paso final de empaquetar).

Comprueba que esten instalados:

```
javac -version      debe decir 17 o mas
mvn -version
python3 --version
```

## Pasos

1. Edita tu mod: `src/main/java/modjava/ModJavaReal.java`
   (puedes renombrar la clase; si lo haces, actualiza `mainClass` en
   `pom.xml`).

2. Compila y convierte a JavaScript:

   ```
   mvn package
   ```

   Esto crea `target/teavm/classes.js`: tu Java ya convertido a
   JavaScript (primero lo compila `javac`, luego TeaVM lo traduce).

3. Empaqueta el `.jar`:

   ```
   python3 empaquetar.py
   ```

   Esto crea `mi-mod-java.jar` con todo adentro.

4. Instalalo en el juego: boton **Mods** -> **Subir archivo (.js o .jar)...**

   O si quieres que TODOS los jugadores del sitio lo tengan: copia el
   `.jar` a la carpeta `mods/`, agregalo a `mods/mods.json` y **sube el
   numero `version`** (los jugadores veran el panel de descarga otra
   vez). Mira el README principal del repo para mas detalles.

## Como se comunica Java con el juego

El juego expone la `ModAPI` de JavaScript. Desde Java la usas con las
anotaciones de TeaVM:

```java
// Declarar un "puente" hacia JavaScript:
@JSFunctor
public interface Escucha extends JSObject {
    void llamar(String dato);
}

// Llamar a la ModAPI del juego desde Java:
@JSBody(params = { "evento", "escucha" }, script =
    "ModAPI.addEventListener(evento, function(d){" +
    " escucha(d && d.key !== undefined ? String(d.key) : '');" +
    "});")
private static native void escucharEvento(String evento, Escucha escucha);
```

El `script` es JavaScript y se ejecuta en el juego; el resto de tu clase
es Java normal (`int`, `StringBuilder`, `System.currentTimeMillis`, tus
propios metodos y campos...).

Eventos utiles de la ModAPI: `load`, `update` (cada tic), `frame`
(cada fotograma), `key` (teclas), `sendchatmessage`, y mas (ver el
README principal).

## Estructura de la plantilla

```
plantilla-mod-java/
  pom.xml                                   Configuracion de Maven + TeaVM
  empaquetar.py                             Crea el .jar final
  src/main/java/modjava/ModJavaReal.java    El mod de ejemplo (Java)
```

## Preguntas frecuentes

- **Puedo compilar un mod de Forge que ya existe?** No. Los mods de Forge
  usan las clases de Forge, que solo existen en el Minecraft de escritorio.
  Tienes que escribir el mod tu mismo con esta plantilla (o portarlo).
- **Funciona con Gradle en lugar de Maven?** Si, configurando el plugin
  `org.teavm:teavm-maven-plugin` equivalente, pero esta plantilla usa
  Maven porque es lo que se probo.
- **Donde esta el ejemplo compilado?** En `mods/java-real.jar` del repo:
  es exactamente lo que produce esta plantilla.
