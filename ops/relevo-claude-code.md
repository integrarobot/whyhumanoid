# Relevo a Claude Code: muro de pago de Why Humanoid?

Actualizado: 17/11/2026, 14:20 (Europe/Madrid). Escribe: sesión de Claude en claude.ai. Coordina: Codex. Decide: Javier.

## Quién escribe

El 16/11 por la noche y el 17/11 la sesión de claude.ai volvió a ser la ejecutora con la aprobación de Javier, porque Claude Code no llegó a iniciarse. Sigue siéndolo hasta que este apartado diga lo contrario. Si Claude Code toma el relevo, la sesión de claude.ai deja de escribir antes y lo anota aquí. Claude Code empieza desde `main` (`git pull`). Nunca dos sesiones escribiendo a la vez.

## Estado

| Pieza | Estado real |
|---|---|
| whyhumanoid.com | PR #18 (`f4bd2db`): Humanoids completo y 10 primeras filas de cada pestaña premium (`data/preview/`). Las 13 URLs `/data/database/*.json` dan 404. Hecho. |
| Trabajo en curso y siguiente | Hecho: prueba real de actualización con Darwin Robotics (cierre WH-20261117-1427-darwin-actualizacion-completa; ejemplo en `ops/weekly-update/ejemplo-darwin.md`) y corrección de atribución del cierre 1359 (cierre WH-20261117-1426-correccion-origen-altura). Hecho después: buscador global y etiquetas comunes (PR #34, #35 y #36; cierre WH-20261117-1456-buscador-global-etiquetas). Cola autorizada después (17/11/2026, tarde): 3) Boston Dynamics y GlobalFoundries y 4) Howl de NC State (Unitree G1), hechas (PR #40 y #42; cierre WH-20261117-2212-bd-globalfoundries-ncstate-howl); 5) URL permanente por robot y empresa con contenido legible sin JavaScript, hecha (PR #44; cierre WH-20261117-2227-urls-permanentes-robots-empresas); 6) propuesta de reparto público/premium que revisa el modelo de diez filas gratis, entregada (cierre WH-20261117-2237-propuesta-reparto-publico-pago; `ops/access-model-proposal.md`); pendiente de que Javier decida antes de cambiar acceso, permisos o precios; alcance y cautelas en `ops/backlog.md`, «Cola autorizada». Sin compra de créditos. |
| Relaciones Deployments-robots-empresas | Desde el 17/11 (PR #26 y #27). Las genera el servidor en cada importación con la configuración que envía el workflow (`tools/relations.mjs --config`); tablas D1 `relation_graphs` y `relation_config`. Cobertura: 69 de 119 registros enlazados a un robot del catálogo (46 por modelo, 23 por línea de modelo), 41 solo al fabricante, 9 sin fabricante resoluble; 113 organizaciones enlazadas. Criterio en el skill, sección «Relaciones de Deployments». |
| Aplicación premium | Desde el 17/11 en `https://whyhumanoid.com/app/` (PR #24, `48d4214`): página estática generada desde `server/public` con `tools/build-app.mjs`, servida por GitHub Pages; la API sigue en `whyhumanoid-premium.javier-198.workers.dev` por CORS. `ALLOWED_ORIGINS` incluye whyhumanoid.com y, durante la transición, el origen antiguo; `PREMIUM_URL` es la nueva URL (enlace de acceso, retornos de Checkout y portal). Worker versión `7e8d9e1c`: la página antigua redirige con 302 a `/app/` conservando el `#fragmento`; `/v1/*` no se redirige (webhook intacto). Las sesiones van por origen: cada suscriptor inicia sesión una vez más en la nueva URL. DNS y correo sin tocar. |
| Worker de producción `whyhumanoid-premium` | Código del muro con la redirección de la página antigua y las relaciones, versión `d231b0f5` (17/11, 13:18). Secretos `WORKBOOK_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `RESEND_API_KEY` (los tres últimos los puso Javier el 17/11). `checkout_available: true`: el pago live está abierto. |
| Worker de pruebas `whyhumanoid-premium-test` | Mismo código, versión `7912c960`, datos de staging del 13/11, `checkout_available: true` (claves de prueba). |
| Importación a producción | Hecha el 16/11 a las 21:39 (run 43951964181, HTTP 200): Humanoids 133 (y 2 internas), Deployments 119, Integrators 7, Evidence links 15, Task evaluations 4, Container handling 22, Entities 24, Stocks 276, Software 144, Datasets 28, Hardware 11, Other robots 547, Data space 30. D1 de producción coincide con la importación de la exportación auditada (filas, campos, valores no vacíos y caracteres por pestaña); la hoja no ha cambiado desde el 13/11 18:33 UTC. Google: condición del proveedor y Workload Identity User del principal de producción, hechos el 16/11 con la llave de acceso de Javier. |
| Stripe live | Webhook `we_1UbOuzAcMngkWs5CyMeDbKN3` activo con sus 4 eventos (`checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`). Precio `price_1UbOtjAcMngkWs5CR8qXNPGn`: 100 € al año, sin prueba. Portal por defecto `bpc_1UcVsIAcMngkWs5C9X4Xkwf0`. Clave restringida `whyhumanoid-premium-production` creada por Javier. Firma del webhook con el secreto real: comprobada el 17/11 sin cargos (2 entregas firmadas live, HTTP 200, `ignored_type`). Compra completa: comprobada el 17/11 a las 08:24 con una compra real hecha por una persona, no por el agente: pago de 100 € y acceso desbloqueado; en D1, una autorización premium de Stripe y los eventos `checkout.session.completed` y `customer.subscription.created` procesados. Esa suscripción no se cancela ni se reembolsa (datos de la cuenta retirados el 23/11/2026: ningún dato de cuentas de clientes en el repositorio). |
| Resend | Dominio `whyhumanoid.com` Verified. Clave `whyhumanoid-premium-production` (solo envío, solo este dominio). Correo de acceso comprobado el 17/11: enviado desde `premium@whyhumanoid.com` y entregado. |
| Libro maestro y copia «para Codex» | Legibles por cualquiera con el enlace. Decisión pendiente de Javier. |
| Repositorio | Público; el historial entre el PR #4 y el PR #18 contiene las filas completas. Decisión pendiente de Javier. |

## Pendiente, en orden

Nada de esto lo puede hacer un agente sin la aprobación concreta de Javier: crea o amplía credenciales o permisos, y los secretos se escriben solo en el panel de cada servicio o con `wrangler secret put`, nunca en chat, Git ni registros.

1. **Hecho el 16/11.** **Google (Javier con su llave de acceso, o Codex con gcloud).** Permiso: el entorno `production` de GitHub (solo rama `main`) de este repositorio recibe el mismo token de solo lectura de Sheets que ya tiene el entorno `test`. Comandos exactos en DEPLOYMENT.md 4.1: nueva condición del proveedor `github-actions` y `roles/iam.workloadIdentityUser` sobre `whyhumanoid-importer` para el principal de producción. Antes de conceder, comprueba en el proveedor que la asignación de `google.subject` produce ese principal.
2. **Hecho el 16/11 (run 43951964181); repetir cuando cambie la hoja.** **Importar** (cualquier sesión, sin secretos):
   ```sh
   gh workflow run "Import private workbook" --ref main -f target=production
   gh run list --workflow "Import private workbook" --limit 1
   gh run view <id> --log | grep -E "HTTP|rows|warnings"
   ```
   Esperado: HTTP 200 y las 13 pestañas con filas (referencia de staging: Deployments 119, Other robots 547, Stocks 276, Software 144, Humanoids 133).
3. **Hecho (16 y 17/11).** **Resend (Javier).** Permiso: autoriza a Resend (Amazon SES, eu-west-1) a enviar correo como `@whyhumanoid.com`; el MX y el SPF de la raíz no cambian. En Resend, Domains, whyhumanoid.com, «Auto configure» y aprobar en IONOS (TXT `resend._domainkey`, MX `send` a `feedback-smtp.eu-west-1.amazonses.com` prioridad 10, TXT `send` `v=spf1 include:amazonses.com ~all`), luego «Verify DNS records». Después, API keys, clave con permiso «Sending access» solo para `whyhumanoid.com`, como secreto `RESEND_API_KEY` en `whyhumanoid-premium`.
4. **Hecho el 17/11.** **Stripe live (Javier).** Clave restringida `whyhumanoid-premium-production` con escritura en Checkout Sessions y Customer portal y lectura en Prices (son las únicas llamadas del servidor), como secreto `STRIPE_SECRET_KEY`. Secreto de firma del webhook `we_1UbOuz…` como secreto `STRIPE_WEBHOOK_SECRET`. Panel de Cloudflare (Workers, whyhumanoid-premium, Settings, Variables and secrets, Add, tipo Secret) o, desde `server/` con la sesión de Wrangler de Javier:
   ```sh
   npx wrangler secret put STRIPE_SECRET_KEY --env production
   npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
   npx wrangler secret put RESEND_API_KEY --env production
   ```
5. **Hecho el 17/11; firma del webhook comprobada; compra completa comprobada con una compra real hecha por una persona.** **Comprobar producción sin cargos**:
   ```sh
   B=https://whyhumanoid-premium.javier-198.workers.dev
   curl -s $B/v1/billing/plan            # checkout_available: true
   curl -s $B/v1/datasets/deployments/preview | head -c 300   # total_rows 119, 10 filas
   curl -s -o /dev/null -w "%{http_code}\n" "$B/v1/datasets/deployments?limit=5"   # 401
   ```
   Luego: correo de inicio de sesión desde `premium@whyhumanoid.com` canjeado; con esa cuenta sin pago, 403 en filas completas; una sesión de Checkout live creada y abandonada sin introducir tarjeta; `node tools/audit-deployments.mjs --from <export>` con 0 diferencias. El acceso de suscriptor en producción quedó comprobado con una compra real hecha por una persona; un agente nunca introduce datos de pago.
6. **Decisiones de Javier** (consecuencias en el cierre `relevo-muro-de-pago` de `ops/entregas/cierres/`): restringir el libro maestro y su copia; repositorio privado con la web en un repositorio público aparte.
7. **Limpieza:** borrar en GitHub la rama `deploy/worker-bundle-f4bd2db` (el proxy del agente no deja borrar ramas; ahora guarda también el commit `4a075ee` del paquete de la versión `7e8d9e1c`).
8. **Fase 2, decisión de Javier:** API bajo `whyhumanoid.com/v1/*` con cabeceras de seguridad reales. Exige pasar los nameservers de whyhumanoid.com a Cloudflare (registrador y correo siguen en IONOS) copiando antes todos los registros. Plan exacto e inventario en DEPLOYMENT.md, sección 0, «Proposal, phase 2». No se ejecuta sin su aprobación.

## Notas para Claude Code

- Reglas: AGENTS.md. Nunca filas completas en Git ni en la web (`data/database/` prohibido; `node tools/check-public.mjs`). Sin cargos ni datos de pago. Cada trabajo termina con un cierre: `node tools/entregas.mjs nuevo --desde <borrador>`, `--check`, PR a `main`, `informe <ID>`.
- Desplegar el Worker: `cd server && npx wrangler deploy --env production` con la sesión de Wrangler de Javier. Esta sesión no tenía token y usó el editor del panel (`node server/scripts/build-dashboard.mjs`, ver DEPLOYMENT.md).
- La exportación privada del libro usada aquí no está en el repositorio ni es accesible desde Code. Para auditar, saca una exportación nueva según el paso 6 del skill y guárdala fuera de Git.
- La tarea programada de los miércoles (14:00, Madrid) ya aplica el muro de pago; no crees otra.
