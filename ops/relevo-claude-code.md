# Relevo a Claude Code: muro de pago de Why Humanoid?

Actualizado: 16/11/2026, 20:52 (Europe/Madrid). Escribe: sesión de Claude en claude.ai. Coordina: Codex. Decide: Javier.

## Quién escribe

Esta sesión deja de escribir en el repositorio y en los servicios en cuanto se fusiona el PR que añade este fichero. Claude Code continúa desde `main` en ese commit o después (`git pull` en `main`). Nunca dos sesiones escribiendo a la vez: si esta sesión tuviera que volver, primero lo anota aquí.

## Estado

| Pieza | Estado real |
|---|---|
| whyhumanoid.com | PR #18 (`f4bd2db`): Humanoids completo y 10 primeras filas de cada pestaña premium (`data/preview/`). Las 13 URLs `/data/database/*.json` dan 404. Hecho. |
| Worker de producción `whyhumanoid-premium` | Código del muro, versión `38f8d8ab`. `CHECKOUT_ENABLED=true` y `ALLOW_LIVE_CHECKOUT=true`. Único secreto: `WORKBOOK_ID`. D1 vacía. `checkout_available: false`. |
| Worker de pruebas `whyhumanoid-premium-test` | Mismo código, versión `7912c960`, datos de staging del 13/11, `checkout_available: true` (claves de prueba). |
| Importación a producción | Rechazada por Google: run 43943484249, «The given credential is rejected by the attribute condition». |
| Stripe live | Webhook `we_1UbOuzAcMngkWs5CyMeDbKN3` activo, URL `/v1/stripe/webhook`, 4 eventos (`checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`). Precio `price_1UbOtjAcMngkWs5CR8qXNPGn`: 100 € al año, sin prueba. Portal de clientes por defecto guardado el 16/11 (`bpc_1UcVsIAcMngkWs5C9X4Xkwf0`: cancelación al final del periodo, método de pago, facturas). No hay ninguna clave restringida. |
| Resend | Dominio `whyhumanoid.com` en «Not Started» (DNS sin configurar). Sin clave para producción. |
| Libro maestro y copia «para Codex» | Legibles por cualquiera con el enlace. Decisión pendiente de Javier. |
| Repositorio | Público; el historial entre el PR #4 y el PR #18 contiene las filas completas. Decisión pendiente de Javier. |

## Pendiente, en orden

Nada de esto lo puede hacer un agente sin la aprobación concreta de Javier: crea o amplía credenciales o permisos, y los secretos se escriben solo en el panel de cada servicio o con `wrangler secret put`, nunca en chat, Git ni registros.

1. **Google (Javier con su llave de acceso, o Codex con gcloud).** Permiso: el entorno `production` de GitHub (solo rama `main`) de este repositorio recibe el mismo token de solo lectura de Sheets que ya tiene el entorno `test`. Comandos exactos en DEPLOYMENT.md 4.1: nueva condición del proveedor `github-actions` y `roles/iam.workloadIdentityUser` sobre `whyhumanoid-importer` para el principal de producción. Antes de conceder, comprueba en el proveedor que la asignación de `google.subject` produce ese principal.
2. **Importar** (cualquier sesión, sin secretos):
   ```sh
   gh workflow run "Import private workbook" --ref main -f target=production
   gh run list --workflow "Import private workbook" --limit 1
   gh run view <id> --log | grep -E "HTTP|rows|warnings"
   ```
   Esperado: HTTP 200 y las 13 pestañas con filas (referencia de staging: Deployments 119, Other robots 547, Stocks 276, Software 144, Humanoids 133).
3. **Resend (Javier).** Permiso: autoriza a Resend (Amazon SES, eu-west-1) a enviar correo como `@whyhumanoid.com`; el MX y el SPF de la raíz no cambian. En Resend, Domains, whyhumanoid.com, «Auto configure» y aprobar en IONOS (TXT `resend._domainkey`, MX `send` a `feedback-smtp.eu-west-1.amazonses.com` prioridad 10, TXT `send` `v=spf1 include:amazonses.com ~all`), luego «Verify DNS records». Después, API keys, clave con permiso «Sending access» solo para `whyhumanoid.com`, como secreto `RESEND_API_KEY` en `whyhumanoid-premium`.
4. **Stripe live (Javier).** Clave restringida `whyhumanoid-premium-production` con escritura en Checkout Sessions y Customer portal y lectura en Prices (son las únicas llamadas del servidor), como secreto `STRIPE_SECRET_KEY`. Secreto de firma del webhook `we_1UbOuz…` como secreto `STRIPE_WEBHOOK_SECRET`. Panel de Cloudflare (Workers, whyhumanoid-premium, Settings, Variables and secrets, Add, tipo Secret) o, desde `server/` con la sesión de Wrangler de Javier:
   ```sh
   npx wrangler secret put STRIPE_SECRET_KEY --env production
   npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
   npx wrangler secret put RESEND_API_KEY --env production
   ```
5. **Comprobar producción sin cargos** (cuando 1 a 4 estén hechos):
   ```sh
   B=https://whyhumanoid-premium.javier-198.workers.dev
   curl -s $B/v1/billing/plan            # checkout_available: true
   curl -s $B/v1/datasets/deployments/preview | head -c 300   # total_rows 119, 10 filas
   curl -s -o /dev/null -w "%{http_code}\n" "$B/v1/datasets/deployments?limit=5"   # 401
   ```
   Luego: correo de inicio de sesión desde `premium@whyhumanoid.com` canjeado; con esa cuenta sin pago, 403 en filas completas; una sesión de Checkout live creada y abandonada sin introducir tarjeta; `node tools/audit-deployments.mjs --from <export>` con 0 diferencias. El acceso de suscriptor en producción solo se comprueba con un pago real que Javier decida hacer y cancelar; nunca con datos de pago introducidos por un agente.
6. **Decisiones de Javier** (consecuencias en el cierre `relevo-muro-de-pago` de `ops/entregas/cierres/`): restringir el libro maestro y su copia; repositorio privado con la web en un repositorio público aparte.
7. **Limpieza:** borrar en GitHub la rama `deploy/worker-bundle-f4bd2db` (el proxy del agente no deja borrar ramas).

## Notas para Claude Code

- Reglas: AGENTS.md. Nunca filas completas en Git ni en la web (`data/database/` prohibido; `node tools/check-public.mjs`). Sin cargos ni datos de pago. Cada trabajo termina con un cierre: `node tools/entregas.mjs nuevo --desde <borrador>`, `--check`, PR a `main`, `informe <ID>`.
- Desplegar el Worker: `cd server && npx wrangler deploy --env production` con la sesión de Wrangler de Javier. Esta sesión no tenía token y usó el editor del panel (`node server/scripts/build-dashboard.mjs`, ver DEPLOYMENT.md).
- La exportación privada del libro usada aquí no está en el repositorio ni es accesible desde Code. Para auditar, saca una exportación nueva según el paso 6 del skill y guárdala fuera de Git.
- La tarea programada de los miércoles (14:00, Madrid) ya aplica el muro de pago; no crees otra.
