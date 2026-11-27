# Informes a medida: procedimiento del operador

Los dos servicios operativos son de pago único de US$1,000: Robot integration diagnostic y Industrial diversification report. Ninguno exige suscripción ni la da. El cliente paga y se le abre un cuestionario privado. Cuando lo envía completo, recibe por correo un informe en PDF en un plazo de 24 horas desde el envío para esos dos servicios. El pago solo no pone en marcha el reloj.

## Tesis de inversión bajo demanda

Investment thesis on demand es un informe de investigación por empresa cotizada del catálogo, a US$100 de pago único. El plazo de esta tesis es de 72 horas desde el envío del cuestionario completo. El precio y el plazo se aplican también al revisar el pedido y a sus avisos.

El brief recoge empresa, símbolo, mercado, tema de investigación y fuentes opcionales. Verifica la identidad del valor y reúne las tesis accesibles, incluidos los argumentos negativos. Resume cada fuente por separado y explica acuerdos, discrepancias, horizonte e incentivos. Si no hay una tesis verificable, construye el análisis a partir de fuentes primarias. En ambas vías incluye evidencia comercial, competencia, fundamentales, escenarios, dilución, catalizadores, pruebas que invalidarían el caso y fecha de corte. El informe trata de la empresa. Excluye recomendaciones de transacción y de cartera personalizadas.

Para habilitar compras, configura en el entorno de pruebas el precio Stripe propio, USD 100 de pago único, en `REPORT_PRICE_ID_INVESTMENT_THESIS` y `INVESTMENT_THESIS_CHECKOUT_ENABLED=true`. Verifica la compra de prueba, el cuestionario, el plazo de 72 horas y la recepción de los avisos. Configura el precio live y el interruptor equivalente en producción cuando esté operativo el recorrido. El interruptor controla únicamente el inicio de nuevos pagos de este servicio. Usa la misma cola y canal de entrega de los demás informes.

## Tramitación de pedidos

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
| `awaiting_report` | Cuestionario enviado; `due_at` = envío + el plazo del servicio | Prepara el informe. Pulsa «Start work» |
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
