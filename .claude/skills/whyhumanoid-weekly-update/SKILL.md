---
name: whyhumanoid-weekly-update
description: Actualización de Why Humanoid? desde la newsletter de Integrarobot y cierre obligatorio de cualquier entrega del proyecto. Procesa solo la sección de noticias de cada edición nueva, contrasta con fuentes primarias, prepara el plan de escritura en el libro maestro (lo escribe Codex con su conector nativo de Google Sheets) y, tras su recibo, publica whyhumanoid.com e importa a producción por el flujo probado. Úsala en la tarea programada de los miércoles, cuando Javier o Codex pidan la actualización o la publicación de un lote escrito, y al terminar, bloquear o cerrar sin novedades cualquier trabajo de Why Humanoid?, para registrar y presentar su cierre.
---

# Actualización semanal de Why Humanoid?

Ejecuta Claude; coordina Codex; decide Javier. Todo el informe final, en español de España.

La sección «Cierre obligatorio de cada entrega» se aplica a TODO trabajo de Why Humanoid?, no solo a esta actualización: encargos de Javier o de Codex, correcciones de la web, cambios de datos o de código y cualquier tarea programada.

## Reglas que no se negocian

- Acceso (oferta de dos vías, 24/11/2026; sustituye el muro de pago d-0008): Humanoids y las demás categorías son gratis; la suscripción de datos (US$100 al año, sin prueba) abre Deployments y Components completos. La web y Git llevan todas las filas de Deployments y Components solo con sus campos públicos (`server/src/access/fields.js`, en `data/preview/`), y las pestañas gratuitas enteras; las relaciones de evidencia y las pestañas fuera de la oferta solo se cuentan. Las filas completas van SOLO a producción con el workflow «Import private workbook» (target `production`). Nunca escribas filas completas en el repositorio ni en un JSON público; si `tools/check-public.mjs` falla por eso, no lo sortees. No toques la configuración de cobro de Stripe.
- No inventes. Sin ediciones nuevas o sin hechos con fuente, no hay cambios: informa «sin novedades».
- Nunca pongas en Git ni en la web credenciales, enlaces al libro maestro o a Drive, contactos personales ni notas internas. El identificador y la URL del libro van solo en el prompt de la tarea programada.
- Anuncio, piloto y operación son estados distintos. Una demo, un contrato o una nota de prensa del fabricante no son operación real.
- Solo se marca algo como procesado cuando el libro está actualizado y la web publicada y verificada.
- Tres fases con su responsable (Javier, 26/11/2026; contrato en `ops/weekly-update/plan-contract.md`): Claude investiga y planifica en la nube con lectura del libro; Codex escribe y relee con el conector nativo de Google Sheets; Claude publica e importa solo tras el recibo de Codex. Que esta ejecución no pueda escribir en el libro no es un bloqueo: el resultado es un plan completo. Nunca pidas a Javier que copie celdas ni propongas cambios de permisos, identidades o credenciales como paso rutinario.
- Solo la sección de noticias de cada edición (Javier, 18/11/2026; sustituye a la lectura completa de d-0005).
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

- Los suscriptores reciben TODO: cada fila, cada columna y cada valor no vacío de la hoja Deployments, íntegro, sin resumir ni recortar textos largos, tareas, ubicaciones, métricas, cantidades, fechas, evidencias, fuentes ni notas. La web pública muestra todas las filas con sus campos públicos; el detalle es de pago.
- No se eliminan filas por parecer duplicadas: distintas afirmaciones o evidencias sobre un mismo despliegue son filas distintas y se conservan. Fuera solo credenciales o datos personales internos, si los hubiera, con exclusión explícita y documentada.
- La tabla resume (estado, organización y robot, tarea, lugar, resultado o métrica, fuente) y cada fila tiene el botón «View all data», que abre la ficha con todos los campos y los enlaces completos. Un campo nuevo en la hoja que no esté en los grupos de la ficha aparece en «Other fields»; añádelo a su grupo (`GROUPS_DEP` en `index.html` y en `server/public/premium.js`) y a la cabecera del importador (`server/src/datasets.js`), que rechaza cabeceras distintas.
- Contar 119 entradas, o las que haya, no basta. Antes de publicar, y otra vez sobre lo publicado:
  1. `node tools/audit-deployments.mjs --from <export>`: hoja contra lo que sirve la importación del backend (todas las filas) y contra la vista previa de la web (todas las filas, solo con los campos públicos y ningún otro), celda por celda. Debe dar 0 diferencias.
  2. `cd tools && node verify-site.mjs`: abre la ficha de cada fila de la vista previa de cada pestaña y comprueba campos, valores y enlaces, y que la página no pide nada fuera de `data/preview/`.
  3. Tras la importación a producción: el recuento de Deployments del backend coincide con la hoja, y en la aplicación de suscriptores las fichas de la primera y la última fila y de las de textos más largos están completas a 390, 768 y 1440 px (con una sesión de suscriptor existente, nunca con un pago nuevo).
- El cierre lleva filas, columnas, valores no vacíos y diferencias (0 o la lista exacta justificada).

## Relaciones de Deployments con robots y empresas

Orden de Javier (17/11/2026): desde cada robot se ve dónde trabaja, haciendo qué y con qué evidencia; cada registro enlaza a su robot, fabricante y organización; cada empresa lista sus robots y registros por rol. Las relaciones no se editan a mano:

- Las genera el servidor en cada importación (`server/src/relations/graph.js`), a partir de las filas importadas y de la configuración revisada que el workflow «Import private workbook» envía desde `main` (`node tools/relations.mjs --config`): alias de `tools/relations-aliases.json` y el índice público del catálogo. Así nunca quedan desfasadas respecto a los datos.
- Identidad: `organization_id` de la hoja para organizaciones; número del catálogo público para robots; id de Entities o id fijo del alias para fabricantes. Nombres solo por igualdad exacta normalizada con el catálogo o con un alias revisado; nunca por subcadenas. Un registro que solo da el fabricante, o un modelo distinto del de la ficha, se queda en el fabricante (`model_not_disclosed`, `model_not_in_catalogue`): jamás se atribuye a un robot. Nivel `model` (nombra el modelo de la ficha) o `family` (misma línea, otra versión o sin versión). Fabricante, operador o cliente, cliente e inversor, y socio tecnológico o integrador son roles distintos.
- `tools/relations-aliases.json` es público: solo nombres de fabricantes y de modelos del catálogo y sus variantes de producto. Nunca organizaciones, lugares, tareas, fuentes ni registros premium.
- Los visitantes ven el grafo público, construido solo con los campos públicos de todas las filas (`/v1/relations/preview` y la sección «Deployments» de cada robot en la web); las completas, con suscripción comprobada en el servidor (`/v1/relations`).

En cada actualización, antes de publicar:

1. `node tools/relations.mjs --from <export>` (solo en pantalla, nunca en Git): cobertura y combinaciones fabricante | modelo | versión con su resultado. Revisa las nuevas en «Makers outside the catalogue» y en `model_not_in_catalogue`: si un nombre es una variante real de un fabricante o modelo del catálogo, añade el alias (solo nombres públicos) y razónalo en el PR; si es ambiguo (como «Star Era»), no lo enlaces y anótalo en el cierre como pendiente.
2. `node tools/relations.mjs --check` (también en CI): los alias coinciden con el catálogo y la página solo enlaza filas de la vista previa. Si cambian la vista previa o el catálogo, `node tools/build-site.mjs`.
3. Tras importar a producción, el registro del job muestra `relations.ok: true` y la cobertura (solo recuentos). Comprueba en la aplicación un robot con registros, uno sin ellos y una empresa, como visitante y con una sesión de suscriptor existente.
4. El cierre lleva la cobertura exacta (registros enlazados a robot por nivel, solo fabricante, sin fabricante, organizaciones enlazadas) y los nombres ambiguos o no enlazados.

## Buscador global y etiquetas

Desde el 17/11/2026 (Javier) la aplicación tiene un buscador sobre las 13 categorías (`/app/#search`, también desde la portada) con etiquetas comunes: sector, tarea, país de despliegue, país de la empresa, tipo o rol, estado del despliegue, nivel de evidencia y plataforma del robot.

- Seguridad: el servidor decide el alcance antes de buscar. Visitantes y cuentas sin suscripción buscan en las pestañas gratuitas enteras y en todas las filas de Deployments y Components con sus campos públicos: resultados, fragmentos, etiquetas y recuentos salen de ese conjunto. Los suscriptores buscan en todo.
- El índice y las etiquetas se regeneran en cada importación (tabla `search_docs`). No hay ningún índice en la web ni en Git.
- Las etiquetas salen solo de campos de la hoja y del vocabulario controlado (`server/src/search/vocabulary.js`): país de sede separado del país de despliegue, estado del despliegue separado de la madurez del producto (que la hoja no recoge, así que no hay etiqueta de madurez). Un valor desconocido no se etiqueta.
- En cada actualización: `node --no-warnings tools/search-tags.mjs --from <export>` (solo en pantalla, nunca en Git) muestra la cobertura y los valores que el vocabulario no conoce. Si uno es un sinónimo real de un término existente (por ejemplo, otra forma de escribir un país), añádelo al vocabulario y explícalo en el PR; si no, se queda sin etiqueta y se anota en el cierre.
- Tras importar a producción, el registro del job muestra `search` (documentos por alcance y valores desconocidos, solo recuentos). Comprueba en producción una búsqueda como visitante y otra como suscriptor (sesión existente, solo lectura).

## Integrators: catálogo de proveedores

Gratis entero (AGENTS.md, regla «Integrators»). Cuando cambie la pestaña Integrators del maestro:

1. `node --no-warnings tools/export-database.mjs --from <export> --only integrators --snapshot <ISO>`. Si falla, la hoja tiene una incoherencia (cabecera, ID, estado de catálogo, URL o fecha): se informa y no se publica.
2. `node tools/export-integrators.mjs`. Si falla porque un extracto citado ya no está en su celda, se actualiza `tools/integrators-review.json` para citar el texto vigente. Nunca se cambia el maestro para encajar en la web. Un proveedor nuevo necesita su grupo de evidencia revisado.
3. `node tools/build-pages.mjs`, `node --no-warnings --test tools/test-integrators.mjs` y, con el sitio servido, `node tools/verify-integrators.mjs --base <url>`.
4. Tras la importación de producción, `node tools/verify-integrators.mjs --base https://whyhumanoid.com --api <worker>` comprueba que la API sirve los mismos proveedores.

## Gráficos de evolución

Siete gráficos, uno por sección (Humanoids, Deployments, Components, Integrators, Datasets, Benchmarks, Reports), y el carrusel de la portada (AGENTS.md, regla «Gráficos de evolución»). Salen de las instantáneas públicas y de `tools/evolution-review.json`:

0. Las fechas de Datasets y Benchmarks están en el maestro, columnas `PUBLIC_DATE` (contrato en `server/src/public-dates.js`): cuando cambia una de esas pestañas, su atlas se regenera con `export-datasets` o `export-benchmarks` desde la exportación actual, nunca desde una anterior. El atlas de una pestaña sin cambios se deja como está (la prueba de Benchmarks fija su hora de exportación).
1. Después de regenerar cualquier instantánea pública (catálogo, `data/preview/`, atlas), `node tools/export-evolution.mjs`. Si falla porque un extracto citado ya no está en su celda, o porque un producto nuevo de Components no tiene decisión de fecha, se actualiza `tools/evolution-review.json` con el texto vigente. Nunca se inventa una fecha ni se usa la de revisión o la de la instantánea como historia.
2. `node tools/build-pages.mjs`, `node tools/build-site.mjs` y `node --no-warnings --test tools/test-evolution.mjs`.
3. Con Playwright, `node tools/verify-evolution.mjs` (local; `--quick` acorta la rotación) y, tras publicar, `node tools/verify-evolution.mjs --base https://whyhumanoid.com`.

## Estado

`ops/weekly-update/state.json` en el repositorio `integrarobot/whyhumanoid`:

- `last_processed_edition`: URL y fecha de la última edición publicada y verificada, con sus casos sin resolver (`unresolved`), que siguen en `known_pending`.
- `known_pending`: hechos pendientes de escritura, de verificación o de decisión, cada uno con su fuente y su plan. Revísalos siempre.
- `handoffs`: un traspaso por plan, con su estado (`awaiting_write`, `written` o `published`), el resumen del recibo de Codex, la relectura propia y la publicación (contrato, sección «Estado del traspaso»).
- `runs`: una línea por ejecución (fecha, ediciones, resultado y cierre).

Cada ejecución deja su detalle en `ops/weekly-update/runs/<AAAA-MM-DD>.json` y cada plan en `ops/weekly-update/plans/<plan_id>.json`.

## Pasos

### Fase 1: investigación y plan (Claude, en la nube, con lectura del libro)

1. **Prepara.** Clona el repositorio con permiso de escritura y lee AGENTS.md, el estado, este skill y `ops/weekly-update/plan-contract.md`. Comprueba el conector de Google Drive (descarga del libro y fichero privado de traspaso). No pidas ni manejes secretos.

2. **Localiza las ediciones nuevas** de https://www.integrarobot.com/, todas las posteriores a `last_processed_edition`. Usa el feed (`/feed`), porque la página de archivo puede estar desfasada. Revisa también los traspasos en `awaiting_write` o `written` y los `known_pending`.

3. **Lee solo la sección de noticias** de cada edición. Su título cambia de una edición a otra («Más noticias sobre IA y robótica», «Más noticias de IA Física y robótica»…). Numera cada pieza en su orden, con su enlace. Candidatos: robots y versiones nuevas, software y modelos (incluidos world models y VLA), datasets, hardware y componentes, despliegues (empresa, robot, lugar, fase) y empresas.

4. **Contrasta con fuentes primarias**: web o nota del fabricante, del cliente o del operador, paper, repositorio, registro oficial. Guarda URL, editor, fecha de publicación y fecha de tu revisión. Si solo hay fuente secundaria, regístralo con evidencia baja; si no hay fuente, queda como `pending_verification`.

5. **Clasifica según el esquema existente**, sin crear columnas:
   - Humanoids, Other Robots, Software (lista software o world_model), Datasets, Components (antes Hardware), Deployments, Investment (antes Stocks), Integrators, Clean Entities (antes Entidades limpias) y Evidence Relations (antes Relaciones evidencia), según corresponda. Títulos de pestaña vigentes desde el 23/11/2026; antes de exportar, `node --no-warnings tools/check-workbook.mjs --from <export>` debe pasar.
   - Deployments: `operational_status` solo con lo que la fuente sostiene: `planned` (anunciado), `pilot` o `testing` (piloto o prueba), `operational` (operación confirmada por cliente u operador), `vendor_claimed_operational` (el fabricante dice que opera, sin confirmar) o `unresolved`. Rellena `claim_type`, `verification_status`, `evidence_level`, `source_*`, `publication_date` y `observed_start` cuando la fuente lo diga.
   - Spot y otros robots no humanoides pueden tener registros en Deployments (ya hay de Spot). Lo que decide es si la fuente nombra cliente, emplazamiento y fase. No confundas nombres parecidos: Orbit, el software de Boston Dynamics, no es Orbit Robotics, la empresa de robótica espacial reclasificada el 23/11/2026.

6. **Compara con el libro y con la web.** Descarga el libro completo con el conector de Google Drive y conviértelo con `tools/workbook-xlsx-to-json.py`. Compara también con `data/` del repositorio y con el catálogo MCP de producción. Detecta duplicados por nombre normalizado, fabricante, URL y alias. Distingue si la entidad ya existe de si la afirmación nueva ya está incorporada. Decide: fila nueva, actualización (solo los campos que cambian, con fuente nueva) o descarte (duplicado, sin fuente, fuera de alcance). Los identificadores existentes no se tocan; los nuevos siguen el patrón de la pestaña y no repiten ninguno. En las listas con encabezados de sección, la fila va dentro de su bloque (`group_expected`), no al final de la lista.

7. **Escribe el plan** según el contrato: un borrador fuera de Git y después `node tools/workbook-plan.mjs split <borrador> --public ops/weekly-update/plans/<plan_id>.json --private <carga fuera de Git>`. Sigue con `check --private`, `preflight --from <export> --private` (0 conflictos, 0 duplicados, grupos correctos) y `summary`. Prueba la publicación sobre una copia con `simulate`: `check-workbook`, `export-database`, los atlas que cambian, `relations --check`, `search-tags` y `check-public`, sin guardar nada.

8. **Entrega el traspaso**:
   - Crea la carga privada en Google Drive con el título exacto `whyhumanoid-private-handoff-<plan_id>.json`, sin compartirla, y comprueba su SHA-256 descargándola.
   - Guarda en `main` por PR el plan público, el fichero de la ejecución y `state.json`: traspaso `awaiting_write` y piezas en `known_pending` con su `op_id`.
   - Cierra la fase con `completado` («Fase 1 de 3: plan entregado; sin escribir ni publicar»). Si no hay ediciones ni hechos nuevos, `sin_novedades`. `bloqueado` solo si no puedes leer el libro o las fuentes, o si hay celdas privadas y no puedes entregar su carga.
   - La edición no se marca como procesada.

### Fase 2: escritura y relectura (Codex)

La hace Codex con la automatización «Incorporar newsletters a Why Humanoid?» (diaria, 15:00 Europe/Madrid), en su chat de coordinación, con el conector nativo de Google Sheets: preflight en la hoja viva, escritura celda a celda, relectura y recibo (contrato, «Recibo de la fase 2»). Claude no escribe en el libro, y no publica ni importa antes del recibo explícito de Codex.

### Fase 3: publicación (Claude, solo tras el recibo de Codex)

9. **Relee por tu cuenta**: descarga nueva, `tools/workbook-xlsx-to-json.py --compare` contra la exportación de la base y `node tools/workbook-plan.mjs readback <plan> --from <export> --private <carga> --previous <base>`. Solo deben cambiar las celdas del plan y los valores de mercado en vivo: 0 diferencias y 0 cambios en vecinas. Si algo no cuadra, no publiques y díselo a Codex con la celda exacta.

10. **Publica por el flujo probado** (README, «Refresh»), un PR por lote:
    1. `node --no-warnings tools/export-database.mjs --from <export> --snapshot <hora de modificación del libro>` (escribe solo las vistas previas en `data/preview/`).
    2. Humanoids: `node --no-warnings tools/sync-humanoids.mjs --from-export <export> --snapshot <ISO>` y `tools/export-humanoids.mjs`; después `node --no-warnings tools/export-public.mjs --from <export>`.
    3. Los atlas de las pestañas que cambian (Datasets, Benchmarks, Integrators, Components) y `node tools/export-evolution.mjs`; después `tools/build-pages.mjs`, `tools/build-site.mjs` y `tools/build-app.mjs`, en ese orden.
    4. Comprueba, como en CI: `node tools/audit-deployments.mjs --from <export>` (0 diferencias), `node tools/relations.mjs --from <export>` y `--check`, `node --no-warnings tools/search-tags.mjs --from <export>`, `node tools/check-public.mjs`, `node tools/workbook-plan.mjs check`, `node tools/export-database.mjs --check`, todos los `--check` de CI, `cd server && npm test`, `cd tools && node verify-site.mjs && node verify-premium-app.mjs && node verify-pages.mjs` (con `NODE_OPTIONS=--max-old-space-size=6144` si falta memoria) y `node --no-warnings tools/check-reserved.mjs --from <export>`.
    5. Rama `weekly-update/<fecha>-publicacion`, PR contra `main` y CI en verde. Codex revisa el head de forma independiente. Después, fusión y despliegue de Pages.

11. **Importa a producción una vez por lote**: Actions, «Import private workbook», `main`, target `production`, sin importación de prueba previa (la cuota diaria de filas escritas de D1 es de la cuenta). Antes, comprueba el margen del día: Codex lo lee en el panel de Cloudflare, y no hay otras importaciones ese día UTC. Una importación completa escribe unas 12.000 filas, como mucho unas 32.000 contando índices. No importes si el libro no ha cambiado desde la última importación. En el registro del job comprueba HTTP 200, los recuentos, `relations.ok: true` y `search`. Si falla, el cierre es `bloqueado` con el error exacto; la importación es atómica y la instantánea anterior sigue sirviendo.

12. **Verifica producción**: con el catálogo MCP o la API, la instantánea y cada registro del plan con sus campos públicos; recuentos por categoría iguales a la exportación; todas las filas de Deployments y Components con sus campos públicos; ningún JSON con filas completas en la web; en la aplicación de suscriptores, los recuentos del backend.

13. **Registra y cierra**: en `state.json`, el traspaso pasa a `published` con la publicación; la edición pasa a `last_processed_edition` con sus casos sin resolver, que siguen en `known_pending`; se añade la línea en `runs`. Commit por el mismo flujo y cierre según «Cierre obligatorio de cada entrega».

## Informe de cada ejecución

Es el cierre de la fase. Además de los campos comunes, en `cambios`, `verificaciones` y `pendientes` incluye:
- ediciones leídas (URL, fecha y título de la sección de noticias);
- las piezas en su orden, cada una con su resultado (alta prevista, ya incorporada, fuera de alcance, pendiente de verificación o de decisión), su fuente y si la entidad ya existía;
- el plan (`plan_id`, operaciones, celdas y celdas privadas) y el canal de la carga privada;
- recuentos por categoría antes y después;
- URLs: web, PR, plan y fichero de la ejecución;
- en la fase 3: recibo de Codex, relectura propia, run de Pages, run de importación e instantánea de producción;
- bloqueos y la siguiente acción concreta.
