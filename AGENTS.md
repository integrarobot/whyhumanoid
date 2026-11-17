# Instrucciones del proyecto para agentes

Why Humanoid? (whyhumanoid.com), de Integrarobot. Decide Javier; ejecuta Claude; coordina Codex. Los informes, en español de España, con tuteo, sin rayas largas y sin la palabra «crucial».

## Reglas vigentes

- Muro de pago (d-0008, 16/11/2026; sustituye la apertura temporal de d-0004): Humanoids gratis; las otras 12 pestañas, 100 € al año con Stripe, sin prueba gratuita. La web solo publica las 10 primeras filas de cada pestaña premium (`data/preview/`); las filas completas viven solo en la base de datos del backend (Cloudflare D1) y se sirven tras comprobar la suscripción en el servidor. Nunca vuelvas a poner filas completas de una pestaña premium en Git, en la web ni en ningún JSON público (`data/database/` está prohibido; la guardia y CI lo bloquean).
- Nunca en Git ni en la web: credenciales, enlaces o identificadores del libro maestro o de Drive, contactos personales, cuentas de usuario ni notas internas.
- Cambios por rama, PR contra `main`, CI en verde, fusión y verificación en producción (README). La web la sirve GitHub Pages desde `main`.
- Deployments es la sección más importante (Javier, 16/11/2026): los suscriptores reciben todas las filas, columnas y valores de la hoja, íntegros; no se quitan filas por parecer duplicadas; cada fila tiene «View all data» con la ficha completa, en la web (vista previa) y en la aplicación de suscriptores. Antes de publicar, `node tools/audit-deployments.mjs --from <export>` con 0 diferencias y `node tools/verify-site.mjs` en verde. Criterio completo en el skill, sección «Deployments: criterio de publicación».
- Relaciones de Deployments con robots y empresas (Javier, 17/11/2026): las genera el servidor en cada importación, con IDs estables y alias revisados de `tools/relations-aliases.json` (solo nombres públicos de fabricantes y modelos); nunca por subcadenas ni atribuyendo un modelo por conocer solo el fabricante. Visitantes: solo las 10 filas de vista previa. Criterio y pasos en el skill, sección «Relaciones de Deployments».
- Buscador global y etiquetas comunes (Javier, 17/11/2026): `GET /v1/search` decide el alcance en el servidor antes de buscar, filtrar, contar o generar fragmentos: con suscripción activa, todas las filas; si no, solo Humanoids y las 10 filas de vista previa de cada pestaña, con sus valores públicos. El índice (`search_docs` en D1) se regenera en cada importación; las etiquetas salen solo de valores reales de la hoja con el vocabulario de `server/src/search/vocabulary.js`, y lo desconocido no se etiqueta. Revisión privada: `node --no-warnings tools/search-tags.mjs --from <export>`. Nunca un índice público con contenido premium. Criterio en el skill, sección «Buscador global y etiquetas».
- Actualización semanal y su procedimiento: `.claude/skills/whyhumanoid-weekly-update/SKILL.md` (tarea programada de los miércoles a las 14:00, Europe/Madrid; no se duplica).

## Cierre obligatorio de cada entrega

Aplica a TODO trabajo de Why Humanoid?, no solo a la actualización semanal: encargos de Javier o de Codex, correcciones de la web, cambios de datos o de código y tareas programadas (d-0006, 16/11/2026).

Cada trabajo que termina, se bloquea o acaba sin novedades:

1. Registra su cierre con `node tools/entregas.mjs nuevo --desde <borrador.json>`: ID estable `WH-AAAAMMDD-HHMM-slug`, tarea, origen, fecha y hora de Europe/Madrid, estado (`completado`, `bloqueado` o `sin_novedades`), cambios, URLs, evidencia de despliegue, verificaciones, pendientes y siguiente acción.
2. Valida con `node tools/entregas.mjs --check` y guárdalo en `main` (PR). Si hubo despliegue, después de verificar producción.
3. Presenta en el chat el informe de `node tools/entregas.mjs informe <ID>`.
4. No marques el aviso de Codex ni la entrega a Javier: los confirman ellos en `ops/entregas/confirmaciones/`. No prometas avisos instantáneos: Codex revisa el registro cada hora.

Detalle, campos y comandos para Codex: `ops/entregas/README.md`. Procedimiento en el skill, sección «Cierre obligatorio de cada entrega».
