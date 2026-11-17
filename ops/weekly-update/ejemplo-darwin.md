# Ejemplo reproducible: Darwin Robotics (17/11/2026)

Prueba real del proceso completo de actualización con una sola empresa, encargada por Javier a través de Codex. Sirve de modelo para la actualización semanal (skill `whyhumanoid-weekly-update`) y para cualquier alta puntual. Registro de la ejecución: `ops/weekly-update/runs/2026-11-17-darwin.json`.

Este documento es público: no lleva enlaces ni identificadores del libro maestro, contenido de pestañas premium ni contactos.

## 1. Investigar

Fuentes revisadas el 17/11/2026, cada una con su fecha:

| Fuente | Qué sostiene |
|---|---|
| Web de la empresa (inicio, equipo, empleo, blog) | Nombre Darwin-0, solo en el texto alternativo de la imagen principal; logotipo del programa NVIDIA Inception; equipo publicado; puestos abiertos |
| Anuncio de la empresa, 05/11/2026 | Ronda presemilla de 3,6 M USD liderada por Link Ventures; resto de fondos; ángeles descritos sin nombre; aprendizaje por demostraciones bajo supervisión en el centro |
| Ficha de Y Combinator | Fundada en 2025, San Francisco, lote F25, equipo de 4, primeros despliegues previstos a principios de 2027 |
| Lanzamiento en Y Combinator, 02/11/2026 | Centros de datos primero; conversaciones con hiperescaladores y operadores; vídeo de manipulación de cables |
| Organización de GitHub | Se presenta como «Humanoid Robots»; solo repositorios bifurcados |

Reglas que se aplicaron:
- Nada se deduce de una foto: la morfología queda como «no declarada» aunque GitHub diga «Humanoid Robots» y la imagen muestre dos brazos sobre un soporte.
- Programa no es inversión: NVIDIA Inception es pertenencia a un programa; no hay inversión de NVIDIA.
- Fondo no es persona: los fondos se nombran; los ángeles, descritos solo como fundadores de OpenAI, xAI e Y Combinator, no se nombran.
- Una demostración no es un despliegue y una intención no es un contrato: sin contraparte, lugar ni acuerdo, no hay fila en Deployments; el objetivo de 2027 va en Humanoids (Release) como anunciado, sin cliente.
- Sin dato, «Not disclosed» o «Not found»: altura, peso, velocidades, carga, autonomía, grados de libertad, sensores, batería, precio, clientes y software comercial.

## 2. Evitar duplicados

Búsqueda de «Darwin», «Darwin Robotics», «Darwin-0» y «Thesis» en las 13 pestañas de una exportación completa: ninguna fila. Un resultado antiguo de Y Combinator hablaba de «Thesis»; la ficha de Thesis lleva hoy a Darwin Robotics, con los mismos fundadores y lote. Es el mismo registro renombrado: no se crea otra entidad y se anota en la ficha de Entidades.

## 3. Decidir dónde va cada dato

| Pestaña | Decisión |
|---|---|
| Humanoids | Fila nueva (Darwin, Darwin-0), con fuentes y fecha en «Sources / checked» y las cautelas en «Buyer checks» y «Platform / mobility» |
| Entidades limpias | Dos filas: el fabricante y el modelo, con alcance de identidad resuelto por marca y por modelo |
| Deployments | Ninguna fila: no hay contraparte identificada |
| Relaciones evidencia, Software, Stocks, Other Robots | Ninguna: no encaja el esquema, no hay producto comercial, empresa privada; se queda en Humanoids con la morfología marcada |
| Relaciones | Alias de fabricante «Darwin» en `tools/relations-aliases.json` (solo el nombre público) |

## 4. Escribir en el libro maestro

Autosheet pedía volver a iniciar sesión, así que se usó Google Sheets en el navegador de Javier, como prevé el skill:
1. Preparar el plan celda a celda en un fichero privado y una tabla HTML con las mismas columnas que la cabecera.
2. Humanoids es una tabla de Google Sheets que termina en la última fila: clic derecho en la última fila, «Insertar 1 fila debajo», para que la fila nueva quede dentro de la tabla.
3. Copiar la tabla HTML al portapapeles y pegar en la columna A de la fila nueva con «pegar solo valores» (Cmd+Mayús+V): conserva el formato de la tabla y los saltos de línea dentro de una celda.
4. Entidades limpias tiene un filtro que termina en la última fila; las filas nuevas se pegan debajo. Las fechas de revisión se escriben como texto (`'2026-11-17`), igual que las existentes, porque el pegado las convierte en fecha.
5. Volver a leer: exportación nueva y comparación de las 56 celdas con el plan (56 iguales).

## 5. Exportar y publicar

```
# Exportación privada (fuera de Git): conector de Google Drive, descarga como .xlsx
python3 -I tools/workbook-xlsx-to-json.py <libro.xlsx> <export.json> --compare <exportación anterior>
#   esperado: filas añadidas por ti y los valores en vivo de Valuation; nada más

node --no-warnings tools/export-database.mjs --from <export.json> --snapshot <ISO>
# Humanoids: importación local (server/src/import/run.js) -> filas con los valores del producto de pago
#   y filas de la hoja en orden; ver la cabecera de tools/sync-humanoids.mjs
node tools/sync-humanoids.mjs --preview <humanoids.json> --sheet-rows <filas> --run "<descripción>"
node tools/export-humanoids.mjs && node tools/build-site.mjs

node tools/audit-deployments.mjs --from <export.json>   # 0 diferencias
node tools/relations.mjs --from <export.json>           # en pantalla, nunca en Git
node tools/relations.mjs --check && node tools/check-public.mjs && node tools/export-database.mjs --check
(cd server && npm test) && (cd tools && node verify-site.mjs && node verify-premium-app.mjs)
```

Después: rama, PR contra `main`, CI en verde, fusión, despliegue de Pages e importación de producción («Import private workbook», `main`, `production`). En el registro del job: HTTP 200, recuentos de las 13 pestañas (Humanoids 134 públicas, Entidades 26) y `relations.ok: true`.

Notas de la exportación:
- La descarga .xlsx conserva los valores pero no todos los formatos de visualización. El conversor aplica los que llegan a datos públicos (Valuation con separador de miles y dos decimales, y una celda de Humanoids que la hoja muestra como 4-5) y avisa de los demás.
- Las columnas en vivo de Stocks (precio, variación, capitalización, última cotización) no se importan, así que su formato no afecta a nada.
- Las fórmulas de Valuation de las empresas cotizadas cambian solas con el mercado: aparecen como cambios aunque nadie haya tocado la celda.

## 6. Verificar producción

- Web: ficha pública de Darwin-0 con sus fuentes y fecha, sin sección de despliegues; recuento del catálogo 134.
- Aplicación como visitante y como suscriptor (sesión existente, solo lectura): vista del robot y de la empresa, recarga y volver.
- Vista previa de las pestañas premium sin cambios: Darwin no está en las 10 primeras filas de Entidades.

## 7. Cerrar

Cierre con `node tools/entregas.mjs nuevo --desde <borrador.json>`: inventario antes y después, celdas escritas, datos no encontrados, conflictos, fuentes, ejecución de la importación, PR y URLs verificadas.
