---
name: whyhumanoid-weekly-update
description: Actualización semanal de Why Humanoid? desde la newsletter de Integrarobot y cierre obligatorio de cualquier entrega del proyecto. Lee completas las ediciones nuevas, contrasta con fuentes primarias, actualiza el libro maestro sin duplicados y publica whyhumanoid.com por el flujo probado. Úsala en la tarea programada de los miércoles, cuando Javier o Codex pidan la actualización semanal y al terminar, bloquear o cerrar sin novedades cualquier trabajo de Why Humanoid?, para registrar y presentar su cierre.
---

# Actualización semanal de Why Humanoid?

Ejecuta Claude; coordina Codex; decide Javier. Todo el informe final, en español de España.

La sección «Cierre obligatorio de cada entrega» se aplica a TODO trabajo de Why Humanoid?, no solo a esta actualización: encargos de Javier o de Codex, correcciones de la web, cambios de datos o de código y cualquier tarea programada.

## Reglas que no se negocian

- Muro de pago (d-0008, 16/11/2026): Humanoids gratis; las otras 12 pestañas son premium (100 € al año, sin prueba). La web y Git solo llevan Humanoids y las 10 primeras filas de cada pestaña premium (`data/preview/`). Las filas completas van SOLO a producción con el workflow «Import private workbook» (target `production`). Nunca escribas filas completas en el repositorio ni en un JSON público; si `tools/check-public.mjs` falla por eso, no lo sortees. No toques la configuración de cobro de Stripe.
- No inventes. Sin ediciones nuevas o sin hechos con fuente, no hay cambios: informa «sin novedades».
- Nunca pongas en Git ni en la web credenciales, enlaces al libro maestro o a Drive, contactos personales ni notas internas. El identificador y la URL del libro van solo en el prompt de la tarea programada.
- Anuncio, piloto y operación son estados distintos. Una demo, un contrato o una nota de prensa del fabricante no son operación real.
- Solo se marca algo como procesado cuando el libro está actualizado y la web publicada y verificada.
- Ningún trabajo termina sin su cierre registrado y presentado en el chat (sección siguiente).
- Deployments es la sección más importante de la web (Javier, 16/11/2026). Ver «Deployments: criterio de publicación».

## Cierre obligatorio de cada entrega

Decisión d-0006 (16/11/2026). Protocolo completo y referencia de campos: `ops/entregas/README.md`.

**Cuándo.** Cada vez que un trabajo de Why Humanoid? termina (`completado`), se queda bloqueado (`bloqueado`) o es una revisión sin cambios (`sin_novedades`). Un cierre por trabajo. Si una petición incluye varios trabajos independientes, un cierre por cada uno.

**Qué lleva**, en español de España, sin rayas largas ni la palabra «crucial»:

- ID estable y único `WH-AAAAMMDD-HHMM-slug`, fecha y hora de Europe/Madrid (los pone la herramienta);
- tarea y origen (quién lo pidió o qué lo lanzó);
- estado;
- cambios hechos;
- URLs (web, PR, commit, fichero de la ejecución, skill);
- evidencia de despliegue (PR fusionado, commit, CI, Pages, comprobación en producción) o «No aplica» con su motivo;
- verificaciones hechas y su resultado;
- pendientes;
- siguiente acción concreta y quién la hace.

**Cómo.**

1. Escribe el borrador fuera de Git (`/tmp/cierre.json`) con esos campos y un `slug` corto. No pongas `id`, `fecha`, `zona` ni nada sobre avisos o entregas.
2. `node tools/entregas.mjs nuevo --desde /tmp/cierre.json`. Crea `ops/entregas/cierres/<ID>.json` e imprime el informe.
3. `node tools/entregas.mjs --check` y guárdalo en `main` por el flujo de siempre (rama `entregas/<ID>`, PR, CI en verde, fusión). Si el trabajo se despliega, registra el cierre después de verificar producción, para que la evidencia sea la final.
4. Presenta en el chat, al terminar, el informe de `node tools/entregas.mjs informe <ID>` tal cual. Es el informe final de la sesión; en ejecuciones sin nadie mirando, envíalo también como mensaje.

**Lo que no se hace.**

- No marcar «avisado por Codex» ni «entregado a Javier»: lo confirman ellos en `ops/entregas/confirmaciones/`. La herramienta rechaza confirmaciones firmadas por Claude.
- No prometer avisos instantáneos: Codex revisa el registro cada hora y avisa a Javier de los cierres nuevos.
- No editar un cierre ya fusionado: se corrige con un cierre nuevo con `corrige: <ID>`. CI rechaza cambios o borrados.
- No crear tareas programadas nuevas para avisar: la del miércoles es la única.
- Si no puedes escribir en el repositorio, presenta el cierre completo en el chat con su ID, di que el registro queda pendiente y guárdalo en la siguiente sesión con acceso.

## Deployments: criterio de publicación

Prioridad máxima de Javier (16/11/2026). Se aplica a cualquier trabajo que toque esa pestaña o la web, no solo a la actualización semanal.

- Los suscriptores reciben TODO: cada fila, cada columna y cada valor no vacío de la hoja Deployments, íntegro, sin resumir ni recortar textos largos, tareas, ubicaciones, métricas, cantidades, fechas, evidencias, fuentes ni notas. La web pública muestra las 10 primeras filas con su ficha completa.
- No se eliminan filas por parecer duplicadas: distintas afirmaciones o evidencias sobre un mismo despliegue son filas distintas y se conservan. Fuera solo credenciales o datos personales internos, si los hubiera, con exclusión explícita y documentada.
- La tabla resume (estado, organización y robot, tarea, lugar, resultado o métrica, fuente) y cada fila tiene el botón «View all data», que abre la ficha con todos los campos y los enlaces completos. Un campo nuevo en la hoja que no esté en los grupos de la ficha aparece en «Other fields»; añádelo a su grupo (`GROUPS_DEP` en `index.html` y en `server/public/premium.js`) y a la cabecera del importador (`server/src/datasets.js`), que rechaza cabeceras distintas.
- Contar 119 entradas, o las que haya, no basta. Antes de publicar, y otra vez sobre lo publicado:
  1. `node tools/audit-deployments.mjs --from <export>`: hoja contra lo que sirve la importación del backend (todas las filas) y contra la vista previa de la web (10 primeras filas), celda por celda. Debe dar 0 diferencias.
  2. `cd tools && node verify-site.mjs`: abre la ficha de cada fila de la vista previa de cada pestaña y comprueba campos, valores y enlaces, y que la página no pide nada fuera de `data/preview/`.
  3. Tras la importación a producción: el recuento de Deployments del backend coincide con la hoja, y en la aplicación de suscriptores las fichas de la primera y la última fila y de las de textos más largos están completas a 390, 768 y 1440 px (con una sesión de suscriptor existente, nunca con un pago nuevo).
- El cierre lleva filas, columnas, valores no vacíos y diferencias (0 o la lista exacta justificada).

## Relaciones de Deployments con robots y empresas

Orden de Javier (17/11/2026): desde cada robot se ve dónde trabaja, haciendo qué y con qué evidencia; cada registro enlaza a su robot, fabricante y organización; cada empresa lista sus robots y registros por rol. Las relaciones no se editan a mano:

- Las genera el servidor en cada importación (`server/src/relations/graph.js`), a partir de las filas importadas y de la configuración revisada que el workflow «Import private workbook» envía desde `main` (`node tools/relations.mjs --config`): alias de `tools/relations-aliases.json` y el índice público del catálogo. Así nunca quedan desfasadas respecto a los datos.
- Identidad: `organization_id` de la hoja para organizaciones; número del catálogo público para robots; id de Entities o id fijo del alias para fabricantes. Nombres solo por igualdad exacta normalizada con el catálogo o con un alias revisado; nunca por subcadenas. Un registro que solo da el fabricante, o un modelo distinto del de la ficha, se queda en el fabricante (`model_not_disclosed`, `model_not_in_catalogue`): jamás se atribuye a un robot. Nivel `model` (nombra el modelo de la ficha) o `family` (misma línea, otra versión o sin versión). Fabricante, operador o cliente, cliente e inversor, y socio tecnológico o integrador son roles distintos.
- `tools/relations-aliases.json` es público: solo nombres de fabricantes y de modelos del catálogo y sus variantes de producto. Nunca organizaciones, lugares, tareas, fuentes ni registros premium.
- Los visitantes solo ven relaciones de las 10 filas de vista previa (`/v1/relations/preview` y la sección «Deployments» de cada robot en la web); las completas, con suscripción comprobada en el servidor (`/v1/relations`).

En cada actualización, antes de publicar:

1. `node tools/relations.mjs --from <export>` (solo en pantalla, nunca en Git): cobertura y combinaciones fabricante | modelo | versión con su resultado. Revisa las nuevas en «Makers outside the catalogue» y en `model_not_in_catalogue`: si un nombre es una variante real de un fabricante o modelo del catálogo, añade el alias (solo nombres públicos) y razónalo en el PR; si es ambiguo (como «Star Era»), no lo enlaces y anótalo en el cierre como pendiente.
2. `node tools/relations.mjs --check` (también en CI): los alias coinciden con el catálogo y la página solo enlaza filas de la vista previa. Si cambian la vista previa o el catálogo, `node tools/build-site.mjs`.
3. Tras importar a producción, el registro del job muestra `relations.ok: true` y la cobertura (solo recuentos). Comprueba en la aplicación un robot con registros, uno sin ellos y una empresa, como visitante y con una sesión de suscriptor existente.
4. El cierre lleva la cobertura exacta (registros enlazados a robot por nivel, solo fabricante, sin fabricante, organizaciones enlazadas) y los nombres ambiguos o no enlazados.

## Buscador global y etiquetas

Desde el 17/11/2026 (Javier) la aplicación tiene un buscador sobre las 13 categorías (`/app/#search`, también desde la portada) con etiquetas comunes: sector, tarea, país de despliegue, país de la empresa, tipo o rol, estado del despliegue, nivel de evidencia y plataforma del robot.

- Seguridad: el servidor decide el alcance antes de buscar. Visitantes y cuentas sin suscripción solo buscan en Humanoids y en las 10 filas de vista previa de cada pestaña (valores públicos): resultados, fragmentos, etiquetas y recuentos salen de ese conjunto. Los suscriptores buscan en todo.
- El índice y las etiquetas se regeneran en cada importación (tabla `search_docs`). No hay ningún índice en la web ni en Git.
- Las etiquetas salen solo de campos de la hoja y del vocabulario controlado (`server/src/search/vocabulary.js`): país de sede separado del país de despliegue, estado del despliegue separado de la madurez del producto (que la hoja no recoge, así que no hay etiqueta de madurez). Un valor desconocido no se etiqueta.
- En cada actualización: `node --no-warnings tools/search-tags.mjs --from <export>` (solo en pantalla, nunca en Git) muestra la cobertura y los valores que el vocabulario no conoce. Si uno es un sinónimo real de un término existente (por ejemplo, otra forma de escribir un país), añádelo al vocabulario y explícalo en el PR; si no, se queda sin etiqueta y se anota en el cierre.
- Tras importar a producción, el registro del job muestra `search` (documentos por alcance y valores desconocidos, solo recuentos). Comprueba en producción una búsqueda como visitante y otra como suscriptor (sesión existente, solo lectura).

## Estado

`ops/weekly-update/state.json` en el repositorio `integrarobot/whyhumanoid`:

- `last_processed_edition`: URL y fecha de la última edición procesada con éxito. Si es `null` (primera ejecución), procesa la última edición publicada.
- `known_pending`: hechos encontrados en ejecuciones anteriores que aún no se publicaron (por ejemplo, porque falló Sheets). Revísalos siempre.
- `runs`: una línea por ejecución (fecha, ediciones, resultado).

Cada ejecución deja su detalle en `ops/weekly-update/runs/<AAAA-MM-DD>.json`.

## Pasos

1. **Prepara.** Clona el repositorio con permiso de escritura, lee el estado y este skill. Comprueba qué tienes disponible: navegador de Javier (Claude in Chrome), conector de Google Drive, Autosheet. No pidas ni manejes secretos.

2. **Localiza las ediciones nuevas** en https://www.integrarobot.com/ (archivo de la newsletter): todas las publicadas después de `last_processed_edition`. En la primera ejecución, la última edición y los `known_pending`.

3. **Lee cada edición completa**, no solo «Más noticias»: artículo principal, análisis, breves, enlaces y notas. Haz una lista de candidatos: robots y versiones nuevas, software y modelos (incluidos world models y VLA), datasets, hardware y componentes, despliegues (empresa, robot, lugar, fase) y empresas.

4. **Contrasta con fuentes primarias**: web o nota del fabricante, del cliente o del operador, paper, repositorio, registro oficial. Guarda URL, título, editor, fecha de publicación y fecha de tu revisión. Si solo hay fuente secundaria, regístralo con evidencia baja; si no hay fuente, déjalo en pendientes.

5. **Clasifica según el esquema existente**, sin crear columnas:
   - Humanoids, Other Robots, Software (lista software o world_model), Datasets, Hardware, Deployments, Stocks, Integrators, Entidades limpias y Relaciones evidencia, según corresponda.
   - Deployments: `operational_status` solo con lo que la fuente sostiene: `planned` (anunciado), `pilot` o `testing` (piloto o prueba), `operational` (operación confirmada por cliente u operador), `vendor_claimed_operational` (el fabricante dice que opera, sin confirmar) o `unresolved`. Rellena `claim_type`, `verification_status`, `evidence_level`, `source_*`, `publication_date` y `observed_start` cuando la fuente lo diga.

6. **Compara con el libro y con la web.** Obtén una exportación completa del libro (las 13 pestañas): conector de Google Drive (descarga como hoja de cálculo) o, si no, el navegador de Javier. Compara también con `data/` del repositorio. Detecta duplicados por nombre normalizado, fabricante, URL y alias. Decide: fila nueva, actualización de una fila existente (solo los campos que cambian, con fuente nueva) o descarte (duplicado, sin fuente, fuera de alcance). Respeta los identificadores: los existentes no se tocan; los nuevos siguen el patrón de la pestaña (por ejemplo `rec_`, `clm_`, `org_`) y no repiten ninguno.

7. **Guarda el plan** en `ops/weekly-update/runs/<fecha>.json`: añadidos, actualizados (campo, valor anterior y nuevo), descartados con motivo y pendientes, cada uno con fuentes y fechas.

8. **Escribe en el libro maestro.** Preferencia: Autosheet, con instrucciones exactas por pestaña, fila y columna; si no, el navegador de Javier. Vuelve a leer las filas escritas y compáralas con el plan.
   - En el navegador: Humanoids es una tabla que termina en la última fila (inserta la fila nueva con «Insertar 1 fila debajo» de la última para que quede dentro); pega una tabla HTML con «pegar solo valores» (Cmd+Mayús+V), que conserva el formato y los saltos de línea; escribe como texto las fechas que la hoja guarda como texto (`'2026-11-17`). Caso completo: `ops/weekly-update/ejemplo-darwin.md`.
   - Si falla Sheets o la lectura no cuadra: marca la ejecución `pending_sheets`, mueve los cambios a `known_pending`, no exportes ni publiques, no declares sincronización e informa del bloqueo exacto.

9. **Exporta y publica por el flujo probado** (README, «Refresh»):
   1. Exporta el libro actualizado a un fichero privado fuera de Git (pestaña → filas, cabecera primero): descarga .xlsx con el conector de Google Drive y `python3 -I tools/workbook-xlsx-to-json.py <libro.xlsx> <export.json> --compare <exportación anterior>`. Solo deben aparecer tus filas y los valores en vivo de Valuation.
   2. `node --no-warnings tools/export-database.mjs --from <export> --snapshot <fecha ISO>` (escribe solo las vistas previas en `data/preview/`).
   3. Humanoids: genera la vista con el código de importación (ver cabecera de `tools/sync-humanoids.mjs`) y ejecuta `tools/sync-humanoids.mjs`, `tools/export-humanoids.mjs`, `tools/build-pages.mjs`, `tools/build-site.mjs` y `tools/build-app.mjs` (páginas permanentes de robots y empresas, sitemap y mapa de enlaces de la aplicación; si cambia un nombre, la dirección antigua pasa a redirigir sola gracias a `tools/permalinks.json`, que no se edita a mano).
   4. Comprueba: `node tools/audit-deployments.mjs --from <export>` (0 diferencias), `node tools/relations.mjs --from <export>` y `--check` (sección «Relaciones de Deployments»), `node --no-warnings tools/search-tags.mjs --from <export>` (sección «Buscador global y etiquetas»), `node tools/check-public.mjs`, `node tools/export-database.mjs --check`, `cd server && npm test`, `cd tools && node verify-site.mjs && node verify-pages.mjs`.
   5. Rama `weekly-update/<fecha>`, PR contra `main`, CI en verde, fusión, espera al despliegue de Pages.
   6. Datos completos a producción: Actions, «Import private workbook», Run workflow en `main`, target `production`. Comprueba en el registro del job HTTP 200, los recuentos de las 13 pestañas, `relations.ok: true` con su cobertura y `search` con sus documentos y valores desconocidos. Si falla (por ejemplo, identidad de Google), el cierre es `bloqueado` con el error exacto.

10. **Verifica producción** en https://whyhumanoid.com/: recuentos por categoría iguales a la exportación, los registros nuevos o cambiados visibles con su fuente y fecha, la vista previa de 10 filas por pestaña premium con su enlace a la base completa, ningún JSON con filas completas accesible en la web, la ficha «View all data» completa, y en la aplicación de suscriptores los recuentos del backend iguales a la exportación.

11. **Registra como procesado** solo ahora: actualiza `last_processed_edition`, vacía de `known_pending` lo publicado y añade la línea en `runs`. Commit por el mismo flujo.

12. **Cierra** según «Cierre obligatorio de cada entrega», siempre, también si la ejecución se bloquea (`bloqueado`, por ejemplo `pending_sheets`) o no hay ediciones ni hechos nuevos (`sin_novedades`). Añade el ID del cierre a la línea de `runs` del estado.

## Informe de cada ejecución

Es el cierre de la ejecución. Además de los campos comunes, en `cambios`, `verificaciones` y `pendientes` incluye:
- ediciones leídas (URL y fecha);
- añadidos, actualizados, descartados (con motivo) y pendientes, cada uno con su fuente;
- recuentos por categoría antes y después;
- URLs: web, PR y fichero de la ejecución;
- bloqueos y la siguiente acción concreta.
