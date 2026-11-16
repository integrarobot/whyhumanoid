---
name: whyhumanoid-weekly-update
description: Actualización semanal de Why Humanoid? desde la newsletter de Integrarobot. Lee completas las ediciones nuevas, contrasta con fuentes primarias, actualiza el libro maestro sin duplicados y publica whyhumanoid.com por el flujo probado. Úsala en la tarea programada de los miércoles o cuando Javier o Codex pidan la actualización semanal.
---

# Actualización semanal de Why Humanoid?

Ejecuta Claude; coordina Codex; decide Javier. Todo el informe final, en español de España.

## Reglas que no se negocian

- La base de datos está abierta (decisión d-0004, 16 nov 2026): no vuelvas a vistas previas de 10 filas ni actives el muro de pago. Stripe sigue desactivado.
- No inventes. Sin ediciones nuevas o sin hechos con fuente, no hay cambios: informa «sin novedades».
- Nunca pongas en Git ni en la web credenciales, enlaces al libro maestro o a Drive, contactos personales ni notas internas. El identificador y la URL del libro van solo en el prompt de la tarea programada.
- Anuncio, piloto y operación son estados distintos. Una demo, un contrato o una nota de prensa del fabricante no son operación real.
- Solo se marca algo como procesado cuando el libro está actualizado y la web publicada y verificada.

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
   - Si falla Sheets o la lectura no cuadra: marca la ejecución `pending_sheets`, mueve los cambios a `known_pending`, no exportes ni publiques, no declares sincronización e informa del bloqueo exacto.

9. **Exporta y publica por el flujo probado** (README, «Refresh»):
   1. Exporta el libro actualizado a un fichero privado fuera de Git (pestaña → filas, cabecera primero).
   2. `node --no-warnings tools/export-database.mjs --from <export> --snapshot <fecha ISO>`
   3. Humanoids: genera la vista con el código de importación (ver cabecera de `tools/sync-humanoids.mjs`) y ejecuta `tools/sync-humanoids.mjs`, `tools/export-humanoids.mjs` y `tools/build-site.mjs`.
   4. Comprueba: `node tools/check-public.mjs`, `node tools/export-database.mjs --check`, `cd server && npm test`, `cd tools && node verify-site.mjs`.
   5. Rama `weekly-update/<fecha>`, PR contra `main`, CI en verde, fusión, espera al despliegue de Pages.

10. **Verifica producción** en https://whyhumanoid.com/: recuentos por categoría iguales a la exportación, los registros nuevos o cambiados visibles con su fuente y fecha, sin enlaces privados, base abierta y cobro desactivado.

11. **Registra como procesado** solo ahora: actualiza `last_processed_edition`, vacía de `known_pending` lo publicado y añade la línea en `runs`. Commit por el mismo flujo.

## Informe de cada ejecución

En español, breve:
- ediciones leídas (URL y fecha);
- añadidos, actualizados, descartados (con motivo) y pendientes, cada uno con su fuente;
- recuentos por categoría antes y después;
- URLs: web, PR y fichero de la ejecución;
- bloqueos y la siguiente acción concreta.
