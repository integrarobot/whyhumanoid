# Backlog de Why Humanoid?

Ideas aprobadas para más adelante. No se implementan hasta que Javier las priorice; cuando una se ponga en marcha, se mueve a su PR y se registra su cierre en `ops/entregas/`.

## Secuencia autorizada (17/11/2026, 14:20 Madrid)

Orden de Javier transmitido por Codex. Se ejecuta en este orden, sin esperar otro permiso entre pasos:

1. **Hecho (cierre WH-20261117-1427-darwin-actualizacion-completa): prueba real del proceso de actualización con Darwin Robotics** (https://darwinrobotics.ai). Investigar fuentes primarias, actualizar primero el libro maestro, publicar con el pipeline habitual, verificar producción, documentar el caso como ejemplo reproducible y emitir el cierre. Puntos de control: deduplicar contra «Thesis» (la ficha de YC `companies/thesis` resuelve hoy a Darwin Robotics: mismos fundadores y lote F25), NVIDIA Inception es un programa y no una inversión, el objetivo de despliegues de principios de 2027 es un anuncio sin cliente ni planta, no se deducen especificaciones de fotos.
2. **En curso desde el 17/11/2026: buscador global y etiquetas comunes** (ideas 2 y 3 de abajo). «Es lo que más facilitaría encontrar información comercial» (Javier). Alcance acordado:
   - Buscador visible y accesible en /app/ con acceso claro desde la portada. Busca en las 13 categorías: robots, empresas y despliegues, nombres y alias, y los campos comerciales relevantes. Cada resultado muestra categoría, nombre, contexto breve de la coincidencia y enlace estable a su ficha. Orden por relevancia (nombre exacto antes que menciones), sin duplicados, paginado, y conserva consulta y filtros al volver.
   - Etiquetas con vocabulario común controlado, sacado de los campos reales: sector, tarea o aplicación, país o ubicación, y tipo o rol de entidad. Estado de despliegue y nivel de evidencia solo donde apliquen. Se distingue el país de sede del país de despliegue, y la madurez del producto del estado del despliegue. Los sinónimos se normalizan; no se inventan etiquetas ni se heredan relaciones ambiguas.
   - Filtros combinables con chips activos, quitar uno a uno, limpiar todo, recuentos del conjunto accesible y estado sin resultados. Interfaz en inglés; mayúsculas, acentos, alias y sinónimos revisados, incluidas búsquedas comerciales habituales en español cuando sea razonable.
   - Seguridad: Humanoids completo gratis; del resto, solo las 10 filas de vista previa ya autorizadas. La autorización se comprueba en el servidor ANTES de buscar, filtrar o generar fragmentos, sugerencias, etiquetas o recuentos, y no hay contenido premium en ningún índice público. Los suscriptores buscan en todo.
   - Índices y etiquetas se regeneran en cada importación y forman parte del skill semanal.
   - Verificación con datos reales (empresa, robot, sector con tarea, país con estado), como visitante y como suscriptor, en móvil y con teclado, con enlaces, recarga y vuelta atrás, sin resultados y con medida de rendimiento. Publicar con CI en verde, comprobar producción y entregar URL, ejemplos, cobertura y límites.
   - Fuera de alcance: mapa del ecosistema, DNS y cambios en Stripe.

## Ideas inspiradas en RoboticsMap (Javier, 17/11/2026)

Guardadas para después; NO implementar mientras el lanzamiento del muro de pago siga abierto.

1. **Hecho el 17/11/2026 (PR #26 y #27, cierre WH-20261117-1335-relaciones-deployments).** **Relaciones robot, empresa y despliegue.** Enlazar cada robot (Humanoids) con su fabricante y sus empresas (Entities, Integrators) y con sus despliegues (Deployments), en las dos direcciones, para navegar de uno a otro.
2. **Autorizado el 17/11/2026, va después de Darwin (ver «Secuencia autorizada»).** **Buscador global.** Una sola búsqueda sobre las 13 pestañas (nombres, alias, empresas, tareas, lugares), con resultados agrupados por categoría y respetando el muro de pago: la vista previa para visitantes y todo para suscriptores.
3. **Autorizado el 17/11/2026, junto con el buscador.** **Etiquetas comunes.** Un vocabulario compartido entre pestañas (sector, tarea, tipo de robot, país, estado) para filtrar igual en todas.
4. **Fichas con URL propia y correcciones.** Cada registro con una dirección estable que se pueda compartir y citar, y un botón para proponer correcciones que llegue a revisión editorial antes de tocar el libro maestro.
5. **Mapa del ecosistema.** Una vista visual de fabricantes, integradores, clientes y despliegues por país y sector, construida desde las relaciones del punto 1.

Antes de empezar cualquiera hay que decidir qué parte es gratuita y qué parte es premium (d-0008) y cómo se mantiene con la actualización semanal (d-0005).
