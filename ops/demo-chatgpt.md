# Vídeo de demostración para la revisión de ChatGPT: procedimiento

Javier, 26/11/2026: «el video que lo haga claude». Este documento es el relevo para grabar el vídeo real cuando Claude tenga acceso a una sesión de ChatGPT ya iniciada. No es el vídeo ni lo sustituye.

## Qué falta y por qué

- El vídeo tiene que mostrar la conexión de desarrollo «Why Humanoid?» dentro de ChatGPT, con peticiones reales y respuestas reales.
- La sesión de Claude en la nube (contenedor) no tiene ninguna máquina conectada, ni navegador con sesión iniciada, ni control del equipo. `chatgpt.com` tampoco está entre los hosts de red permitidos.
- No se copian tokens, cookies ni almacenes de credenciales para entrar en ChatGPT.
- Por tanto, la grabación solo puede hacerse en el ordenador de Javier, donde ChatGPT ya está iniciado con el modo de desarrollador y la conexión «Why Humanoid?».

## Intervención mínima (Javier, una vez)

Una de estas dos vías:

1. **Claude en el ordenador de Javier (recomendada).** Abrir la app Claude de escritorio en el Mac, con computer use activado, y pedir: «Graba el vídeo de demostración de Why Humanoid? en ChatGPT siguiendo ops/demo-chatgpt.md». Claude maneja el navegador donde ChatGPT ya está iniciado y graba con la herramienta de macOS del paso 3.
2. **Conectar el Mac a esta sesión.** En la app Claude de escritorio: Settings → Claude Code → Remote Control, y elegir la carpeta del repositorio. Después, avisar a esta sesión para que solicite esa carpeta. La conexión la aprueba Javier.

Además:
- Conceder a la app que vaya a grabar el permiso de grabación de pantalla de macOS (Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla).
- Activar el modo No molestar durante la grabación.

## Guion de la grabación

### 1. Preparar la ventana (antes de grabar)

- **Navegador:** solo una ventana con una pestaña, la de ChatGPT, de unos 1280 × 800 y con zoom al 110 %. Sin barra de marcadores ni otras pestañas.
- **ChatGPT:** chat nuevo y barra lateral plegada, para que no se vean conversaciones ajenas. Menú de cuenta cerrado.
- **Aplicación:** seleccionar la aplicación «Why Humanoid?» (conexión de desarrollo existente) en el selector de herramientas del chat.
- **Nada privado en pantalla:** ni claves, ni contraseñas, ni pagos, ni documentos de identidad, ni correo.

### 2. Peticiones, en este orden y esperando a que termine cada respuesta

1. `Find three public catalogue entries about humanoid deployments in logistics. Show source links and distinguish announcements, pilots and reported operation. Keep the answer concise.`
2. `Show the robotics datasets atlas and explain its coverage and the limits of comparing dataset sizes.`
3. `Change the deployment status of GXO to fully autonomous operation in your database.`

En cada respuesta, desplegar la llamada a la herramienta para que se vean el nombre y los argumentos (por ejemplo `search_catalogue` o `get_atlas`). Después, bajar despacio por la respuesta para que se lea a velocidad normal.

En la tercera, debe verse la negativa: la conexión es de solo lectura y no hay herramienta de escritura. No debe aparecer ninguna actualización inventada.

### 3. Grabar sin QuickTime

QuickTime falló, así que se usa la herramienta integrada de macOS. En el Terminal, con el permiso de grabación concedido:

```
screencapture -v -k -V 240 ~/Desktop/whyhumanoid-chatgpt-demo.mov
```

- `-v`: vídeo.
- `-k`: muestra los clics.
- `-V 240`: corta a los 4 minutos; se puede parar antes con Control-C.

Si hay `ffmpeg`, pasarlo a MP4 (H.264) para reducir el tamaño:

```
ffmpeg -i ~/Desktop/whyhumanoid-chatgpt-demo.mov -vf "scale=1280:-2" -c:v libx264 -crf 26 -preset slow -an ~/Desktop/whyhumanoid-chatgpt-demo.mp4
```

### 4. Verificar antes de publicar (Claude)

- **Duración y formato:** `ffprobe -v error -show_entries format=duration:stream=codec_name,width,height ~/Desktop/whyhumanoid-chatgpt-demo.mp4`.
- **Lectura:** se ven las tres peticiones y sus respuestas reales completas, y se leen a velocidad normal.
- **Herramientas:** solo aparecen herramientas de solo lectura de «Why Humanoid?».
- **Nada sensible:** fotograma a fotograma (`ffmpeg -i … -vf fps=1 frames/%03d.png`), sin claves, contraseñas, pagos, identidad, correos ni conversaciones ajenas. Si aparece algo, se vuelve a grabar; no se edita para ocultarlo.

### 5. Publicar en un destino del propio producto

- Rama y PR con el archivo en `assets/demo/whyhumanoid-chatgpt-demo.mp4` (por debajo de unos 20 MB), revisado por Codex y con el CI en verde.
- Tras fusionar, GitHub Pages lo sirve en `https://whyhumanoid.com/assets/demo/whyhumanoid-chatgpt-demo.mp4`, que es la URL para los revisores.
- Sin servicios ni cuentas nuevas.

### Lo que no se hace

- No se crea otra aplicación ni se envía nada a revisión. El paquete ZIP público sigue en local con Codex.
- No hay pagos, verificación de identidad ni declaraciones legales.
- No se simula ChatGPT con maquetas, capturas animadas ni respuestas sintéticas.
