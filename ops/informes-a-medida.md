# Informes a medida: procedimiento del operador

Dos servicios de pago único de US$1,000: Robot integration diagnostic y Industrial diversification report. Ninguno exige suscripción ni la da. El cliente paga y se le abre un cuestionario privado. Cuando lo envía completo, recibe por correo un informe en PDF en un plazo de 24 horas desde el envío. El pago solo no pone en marcha el reloj.

El sistema guarda el pedido, verifica el pago, conserva las respuestas, fija el plazo y avisa. **No redacta ni envía el informe**: eso lo hacéis Javier o Codex, a mano.

## Dónde se ve todo

- **Cola de pedidos:** `https://whyhumanoid.com/app/#ops`. Entras con un enlace de acceso a una dirección de `OPERATOR_EMAILS` (secreto del Worker). Con una suscripción no se entra.
- Por API, con el `ADMIN_TOKEN` existente en la cabecera `x-admin-token`:
  - `GET /v1/ops/orders`;
  - `GET /v1/ops/orders/<id>`;
  - `POST /v1/ops/orders/<id>`;
  - `POST /v1/ops/outbox/retry`.
- **Avisos:** llegan a `OPERATOR_NOTIFY_EMAIL` cuando se paga un pedido y cuando se envía un cuestionario. No llevan las respuestas: la fuente es la cola.

## Estados de un pedido

| Estado | Qué significa | Qué haces |
|---|---|---|
| `pending_payment` | Pedido creado; Stripe no ha confirmado el pago | Nada. Si el cliente dice que ha pagado, pídele que vuelva a la app: la app reconcilia con Stripe |
| `awaiting_questionnaire` | Pagado; cuestionario abierto, sin plazo todavía | Nada hasta el envío. Puedes ver el borrador |
| `awaiting_report` | Cuestionario enviado; `due_at` = envío + 24 h | Prepara el informe. Pulsa «Start work» |
| `in_progress` | Informe en preparación | Termina y envía el PDF |
| `delivered` | Registro de que el PDF se envió | Nada |
| `cancelled` / `payment_failed` | No se cobró nada | Nada |

## Preparar y entregar un informe

1. Abre el pedido en la cola. Lee el brief enviado; la versión del formulario va con las respuestas.
2. Prepara el informe en PDF, en el idioma elegido (`report_language`).
   - Usa la investigación de Why Humanoid? y lo que el cliente ha contado.
   - Sin promesas de retorno ni de contratos.
   - Sin certificación de seguridad in situ.
3. Envía el PDF por correo, desde la dirección de soporte (javier@integrarobot.com; desde el 25/11/2026), a la dirección de la cuenta del pedido.
   - Para usar otra dirección, el cliente tiene que pedirlo por escrito desde la de la cuenta.
4. En la cola, escribe la nota de entrega y pulsa «Record delivery».
   - La nota dice cuándo y a qué dirección se envió.
   - Registrar la entrega no envía nada: es el registro.
5. Si el plazo no se puede cumplir, escribe al cliente antes de que venza. El plazo registrado no cambia.

## Correcciones y documentos

- Un cuestionario enviado no se edita. Si el cliente corrige algo, escribe al soporte: guarda su correo con el pedido (en la nota) y trabaja con ambas cosas. El plazo sigue siendo el mismo.
- Los documentos opcionales llegan por correo después del envío. En la web no hay subida de archivos.

## Correos que no salen

Cada correo pasa por la bandeja duradera (`notification_outbox`).
- Si uno falla, se reintenta con espera creciente: con el cron del Worker y desde la cola («Retry now» o «Retry» en cada correo).
- Un correo en rojo en la cola significa que el cliente o el operador todavía no lo han recibido.

## Abrir y cerrar la venta

- **En pruebas (modo test de Stripe):** `REPORTS_CHECKOUT_ENABLED=true` y los dos `REPORT_PRICE_ID_*` de test en el Worker de pruebas.
- **En producción:** además, `REPORTS_LIVE_OPEN = true` en `server/src/orders/services.js` (abierto el 25/11/2026). Se activó después de que en modo test pasaran:
  - el flujo completo de extremo a extremo;
  - el aviso al operador;
  - la recuperación del pedido.

  Ese cambio va por PR, con CI y revisión de Codex. Para cerrar la venta, se vuelve a `false`; los pedidos existentes no se tocan.
- No se reembolsa, cancela ni cobra nada desde este sistema: cualquier reembolso lo decide Javier y se hace en Stripe.
