# Plan de escritura en el libro maestro (`whyhumanoid/workbook-plan@1`)

Decisión de Javier (26/11/2026): las noticias de cada newsletter se incorporan sin que Javier copie celdas ni pase planes de mano en mano. Claude investiga y planifica en la nube, con acceso de solo lectura al libro. Codex escribe y relee con el conector nativo de Google Sheets. Claude publica cuando recibe el recibo de Codex. Herramienta: `tools/workbook-plan.mjs` (pruebas en `tools/test-workbook-plan.mjs`, en CI).

## Fases y responsables

| Fase | Quién y cuándo | Entrega |
|---|---|---|
| 1. Investigación y plan | Claude, tarea programada de los miércoles a las 14:00 (Europe/Madrid), en la nube, con lectura del libro | Plan público en Git, carga privada fuera de Git y cierre |
| 2. Escritura y relectura | Codex, automatización «Incorporar newsletters a Why Humanoid?» (diaria, 15:00 Europe/Madrid), conector nativo de Google Sheets | Recibo de escritura y relectura |
| 3. Publicación | Claude, en la sesión de Code que coordina Codex, solo después del recibo | Web, una importación a producción, verificación y cierre |

Reglas comunes:

- Solo se procesa la sección de noticias de cada edición (Javier, 18/11/2026).
- Que la fase 1 no pueda escribir en el libro no es un bloqueo: su resultado es un plan completo y verificable. Nunca se pide a Javier que copie celdas. Tampoco se proponen como paso rutinario cambios de permisos, identidades o credenciales de Google ni de la tarea programada.
- La escritura es celda a celda y solo en las celdas del plan. Nunca se sustituye el libro ni una pestaña entera. Una celda que ya tiene el valor propuesto no se vuelve a escribir, así que una escritura interrumpida se reanuda sin repetir nada.
- Ninguna fase cambia precios, acceso, cobro, credenciales ni el flujo de importación.
- Lo que la fuente no sostiene no se planifica: queda en el plan como `pending_verification` o `pending_decision`, con su motivo, y sigue en `known_pending` hasta resolverse.

## Plan público (`ops/weekly-update/plans/<plan_id>.json`)

Es inmutable una vez escrito en el libro. Lo valida `node tools/workbook-plan.mjs check` (también en CI).

- `contract`: `whyhumanoid/workbook-plan@1`.
- `plan_id`: `WP-AAAAMMDD-fuente-slug`, con la fecha de la edición (o de la primera edición del lote).
- `created_at`, `created_by`. `basis.workbook_modified_time`: la hora de modificación del libro que se leyó para planificar.
- `editions[]`: identidad estable de cada edición: `edition_id` (`integrarobot:AAAA-MM-DD:slug`), `url`, `title`, `published`, `section` (el título literal de la sección de noticias) e `item_count`.
- `items[]`: todas las noticias de la sección, numeradas en su orden, sin dobles cuentas. Cada una lleva `title`, `link`, `new_information`, `outcome` y su `reason` si no es `planned`. Los valores de `outcome` son `planned`, `already_incorporated`, `out_of_scope`, `pending_verification` y `pending_decision`. `entity.exists` y `entity.where` dicen si la empresa o el producto ya estaba en el catálogo, algo distinto de si la afirmación nueva está incorporada. Una noticia con alta prevista nombra sus `ops`. Si parte de ella ya estaba incorporada, se dice en `entity.where`.
- `operations[]`: una por registro escrito:
  - `op_id` (`op-NNN`), `item_id` y `kind`. Los tipos son tres:
    - `append_row`: fila nueva de una tabla. Las celdas no listadas quedan vacías.
    - `fill_list_slot`: hueco libre de una lista que comparte filas con otra, como Software A:C o Other Robots A:C. Las celdas vecinas no se tocan.
    - `update_cells`: cambio en un registro existente.
  - Destino: `sheet` (título de la pestaña), `row` (fila de la hoja) y `header_row` (por defecto 1).
  - `record.key`: columna, cabecera y valor que identifican el registro, por ejemplo `DATASET_ID`, `METRIC_ID`, `record_id` o el nombre de una lista. `record.unique` es opcional, por ejemplo la URL de una lista. Con `append_row` y `fill_list_slot`, la clave no puede existir ya en otra fila. Con `update_cells`, la fila tiene que seguir siendo la del registro.
  - `group_expected` es obligatorio en las listas con encabezados de sección revisados (Software: «Software for Unitree», «Simulators»). Una fila pertenece al grupo del encabezado que tiene encima, así que se escribe dentro de su bloque. `null` es el primer bloque, sin grupo.
  - `cells[]`: `column` (letras), `header` (cabecera exacta en esa columna), `expected_previous` (`""` para celdas vacías) y `proposed`.
  - `sources[]`: `url`, `publisher`, `published` y `reviewed`.
- `private_payload`: `sha256` de la carga privada, número de `cells` privadas y `delivery`.

Valores privados. Solo van en claro las pestañas gratuitas (las de `access: 'free'` en `server/src/datasets.js`). Aun en ellas, nunca van en claro las columnas internas: `RELATED_BENCHMARK_URL`, `CLASSIFICATION_NOTE` y `ATTACHMENT_REF` de Datasets. Las demás pestañas van siempre cifradas en el plan, aunque un campo sea público en la web: Deployments, Components, Clean Entities, Evidence Relations, Product - Container Handling, Data Space, Reports y cualquier pestaña nueva. En el plan solo aparece su HMAC (`proposed_hmac`, `expected_previous_hmac`, `value_hmac`) y `private: true`. El plan público nunca lleva enlaces de Google Docs, Sheets o Drive, correos ni identificadores de registros de pago.

## Carga privada (fuera de Git)

`{ "contract": "whyhumanoid/workbook-plan-private@1", "plan_id", "salt", "values": { "<op_id>:<columna>:<proposed|previous|key|unique>": "<valor>" } }`. El HMAC es SHA-256 con la sal de la carga, sobre `plan_id`, `op_id`, columna, tipo y valor, separados por saltos de línea. El plan guarda el SHA-256 del fichero, así que la carga no se puede cambiar sin que se note.

Canal de traspaso privado:

1. Fichero en la unidad «Mi unidad» de Google Drive de Javier, con el título exacto `whyhumanoid-private-handoff-<plan_id>.json`. Lo crea la fase 1 con el conector de Google Drive, sin compartirlo, y Codex lo lee con su conector. Probado el 26/11/2026: creación, descarga y SHA-256 idénticos. Ni el identificador ni el enlace del fichero van a Git.
2. Si no se puede crear, el fichero se adjunta en la conversación de la fase 1 y su SHA-256 va en el cierre.
3. Si un plan tiene celdas privadas y no hay forma de entregar la carga, la fase 1 se cierra `bloqueado` con el motivo exacto. Las operaciones públicas pueden ir en un plan aparte.

Comandos de la fase 1: escribe un borrador con todos los valores en claro, fuera de Git, y ejecuta `node tools/workbook-plan.mjs split <borrador> --public ops/weekly-update/plans/<plan_id>.json --private <carga fuera de Git>`. Después ejecuta `check --private <carga>`, `preflight <plan> --from <exportación> --private <carga>` y `summary <plan>`.

## Recibo de la fase 2 (Codex)

Antes de escribir, Codex comprueba que el plan de `main` y la carga coinciden con sus SHA-256. Comprueba en la hoja viva las cabeceras, que cada celda tenga el valor previo esperado (o ya el propuesto), que no haya duplicados de la clave y el grupo de las listas. Si algo no cuadra, para y lo dice; no hay escrituras parciales sin avisar.

Después escribe solo las celdas pendientes y relee las celdas escritas y las vecinas. El recibo, en el chat de coordinación, lleva:

- `plan_id`, el commit de `main` y el SHA-256 del plan;
- el SHA-256 de la carga;
- las celdas escritas, las que ya estaban escritas, los conflictos (0) y las diferencias de la relectura (0);
- las celdas vecinas comprobadas sin cambios;
- los rangos de las tablas nativas;
- la hora de modificación del libro tras escribir;
- la constancia de que no se han cambiado credenciales, permisos ni identidades.

## Fase 3 (Claude, solo tras el recibo)

1. Descarga nueva del libro y `python3 -I tools/workbook-xlsx-to-json.py <libro.xlsx> <export.json> --compare <exportación de la base>`. Solo deben cambiar las filas del plan y los valores de mercado en vivo.
2. `node tools/workbook-plan.mjs readback <plan> --from <export> --private <carga> --previous <exportación de la base>`: 0 diferencias y 0 cambios en celdas vecinas. El recibo propio se guarda en `state.json`.
3. Publicación por el flujo del skill, en un solo PR por lote. El atlas de una pestaña que no ha cambiado se deja como está. Benchmarks lo exige, porque su prueba fija la hora de exportación.
4. Una importación a producción por lote («Import private workbook», `main`, `production`), sin importación de prueba previa: la cuota diaria de filas escritas de D1 es de la cuenta. Antes se comprueba el margen del día, que Codex lee en el panel de Cloudflare en UTC. Una importación completa escribe unas 12.000 filas, como mucho unas 32.000 contando índices. No se importa si el libro no ha cambiado desde la última importación.
5. Verificación en producción (API o MCP): recuentos y cada registro del plan con su instantánea.
6. `state.json`: el traspaso pasa a `published`. La edición pasa a `last_processed_edition` con sus casos sin resolver, que siguen en `known_pending`. Después se registra el cierre.

## Estado del traspaso (`ops/weekly-update/state.json`, `handoffs`)

Cada plan tiene una entrada: `plan_id`, `plan`, `editions`, `status` (`awaiting_write`, `written` o `published`), `private_payload` (`sha256` y canal, sin enlace), `write_receipt` (resumen del recibo de Codex, sin rutas locales), `independent_readback`, `publication` (PR, commit, run de Pages, run de importación e instantánea de producción) y los defectos pendientes, si los hay.
