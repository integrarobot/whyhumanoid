# Instrucciones del proyecto para agentes

Why Humanoid? (whyhumanoid.com), de Integrarobot. Decide Javier; ejecuta Claude; coordina Codex. Los informes, en español de España, con tuteo, sin rayas largas y sin la palabra «crucial».

## Reglas vigentes

- Base de datos abierta: las 13 pestañas, todos sus registros y campos de contenido, sin pago ni registro (d-0004). Stripe desactivado. No volver a vistas previas de 10 filas.
- Nunca en Git ni en la web: credenciales, enlaces o identificadores del libro maestro o de Drive, contactos personales, cuentas de usuario ni notas internas.
- Cambios por rama, PR contra `main`, CI en verde, fusión y verificación en producción (README). La web la sirve GitHub Pages desde `main`.
- Actualización semanal y su procedimiento: `.claude/skills/whyhumanoid-weekly-update/SKILL.md` (tarea programada de los miércoles a las 14:00, Europe/Madrid; no se duplica).

## Cierre obligatorio de cada entrega

Aplica a TODO trabajo de Why Humanoid?, no solo a la actualización semanal: encargos de Javier o de Codex, correcciones de la web, cambios de datos o de código y tareas programadas (d-0006, 16/11/2026).

Cada trabajo que termina, se bloquea o acaba sin novedades:

1. Registra su cierre con `node tools/entregas.mjs nuevo --desde <borrador.json>`: ID estable `WH-AAAAMMDD-HHMM-slug`, tarea, origen, fecha y hora de Europe/Madrid, estado (`completado`, `bloqueado` o `sin_novedades`), cambios, URLs, evidencia de despliegue, verificaciones, pendientes y siguiente acción.
2. Valida con `node tools/entregas.mjs --check` y guárdalo en `main` (PR). Si hubo despliegue, después de verificar producción.
3. Presenta en el chat el informe de `node tools/entregas.mjs informe <ID>`.
4. No marques el aviso de Codex ni la entrega a Javier: los confirman ellos en `ops/entregas/confirmaciones/`. No prometas avisos instantáneos: Codex revisa el registro cada hora.

Detalle, campos y comandos para Codex: `ops/entregas/README.md`. Procedimiento en el skill, sección «Cierre obligatorio de cada entrega».
