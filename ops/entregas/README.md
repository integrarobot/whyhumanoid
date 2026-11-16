# Registro de entregas de Why Humanoid?

Cola persistente de cierres de trabajo. Está fuera de la web: `ops/` lo excluye `_config.yml` y lo vigila `tools/check-public.mjs`.

Decide Javier; ejecuta Claude; coordina Codex. Regla vigente desde el 16/11/2026 (decisión d-0006): todo trabajo de Why Humanoid? que termina, se bloquea o acaba sin novedades deja un cierre aquí, se guarda en `main` y se presenta en el chat. Vale para encargos de Javier o de Codex, correcciones, la actualización semanal y cualquier tarea programada.

## Estructura

```
ops/entregas/cierres/<ID>.json                  un cierre por trabajo; inmutable una vez en main
ops/entregas/confirmaciones/<ID>.<tipo>.json    confirmación de aviso o entrega; solo la escriben Codex o Javier
```

ID estable y único: `WH-AAAAMMDD-HHMM-slug`, con fecha y hora de Madrid del cierre (por ejemplo `WH-20261116-1540-deployments-status`). Si coinciden minuto y slug, la herramienta añade `-2`, `-3`.

Campos del cierre, en español:

| Campo | Contenido |
|---|---|
| `id`, `fecha`, `zona` | Los asigna la herramienta: hora de Madrid con su desfase (`+01:00` en invierno, `+02:00` en verano) |
| `tarea` | Qué se pidió, en una línea |
| `origen` | Quién lo pidió o qué lo lanzó (Javier, Codex, tarea programada) |
| `estado` | `completado`, `bloqueado` o `sin_novedades` |
| `ejecuta` | Agente y modelo, por ejemplo `claude/opus-5.5` |
| `cambios` | Lista de cambios hechos (obligatoria si está completado) |
| `urls` | Lista de `{ etiqueta, url }` https: web, PR, commit, skill, fichero de la ejecución |
| `despliegue` | Evidencia de despliegue: PR, commit, CI, Pages, comprobación en producción. Si no hubo despliegue, `No aplica: <motivo>` |
| `verificaciones` | Qué se comprobó y con qué resultado |
| `pendientes` | Lo que queda (obligatorio si está bloqueado) |
| `siguiente_accion` | La acción concreta siguiente y quién la hace |
| `corrige` | Opcional: id del cierre que este corrige |

Los cierres no llevan campos de aviso ni de entrega. Ese estado vive solo en `confirmaciones/`.

## Para Claude (o el agente que ejecuta)

1. Al terminar, bloquearse o acabar sin novedades, escribe un borrador fuera de Git (por ejemplo `/tmp/cierre.json`) con los campos de la tabla menos `id`, `fecha` y `zona`, más un `slug` corto.
2. `node tools/entregas.mjs nuevo --desde /tmp/cierre.json` crea el cierre y lo imprime.
3. `node tools/entregas.mjs --check` y commit en `main` por el flujo de siempre (rama, PR, CI, fusión). Si el trabajo se despliega, el cierre va después de verificar producción, en su propio PR, para que lleve la evidencia final.
4. Presenta en el chat el informe que imprime `node tools/entregas.mjs informe <ID>`, tal cual.
5. Nunca crees confirmaciones en nombre de Codex o de Javier, ni digas que Javier está avisado. La herramienta rechaza confirmaciones firmadas por Claude.
6. Si algo sale mal después, no edites el cierre: crea otro con `corrige`.
7. Si no puedes guardar en el repositorio, presenta igualmente el cierre completo en el chat con su ID, di que el registro está pendiente y guárdalo en cuanto puedas.

## Para Codex

- Cierres nuevos sin avisar: `node tools/entregas.mjs pendientes --tipo aviso-codex --json` sobre `main` actualizado. Cada ID se avisa una vez.
- Tras avisar a Javier: `node tools/entregas.mjs confirmar <ID> --tipo aviso-codex --por codex --evidencia "<canal y hora del aviso>"`, y commit en `main`. Con eso el ID deja de salir como pendiente.
- Cuando Javier confirme que lo ha recibido: `--tipo entrega-usuario --por human:javier`.
- Informe legible de un cierre: `node tools/entregas.mjs informe <ID>`.

El seguimiento de Codex es periódico (cada hora), así que el aviso no es instantáneo.

## Validación

`node tools/entregas.mjs --check` valida esquema, IDs únicos, fecha de Madrid, ausencia de enlaces al libro, correos y credenciales, y confirmaciones bien formadas. En CI se ejecuta con `--base`, que además rechaza modificar o borrar cierres o confirmaciones ya fusionados. Pruebas: `node --test tools/test-entregas.mjs`.
