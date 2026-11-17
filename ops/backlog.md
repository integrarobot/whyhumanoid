# Backlog de Why Humanoid?

Ideas aprobadas para más adelante. No se implementan hasta que Javier las priorice; cuando una se ponga en marcha, se mueve a su PR y se registra su cierre en `ops/entregas/`.

## Secuencia autorizada (17/11/2026, 14:20 Madrid)

Orden de Javier transmitido por Codex. Se ejecuta en este orden, sin esperar otro permiso entre pasos:

1. **Hecho (cierre WH-20261117-1427-darwin-actualizacion-completa): prueba real del proceso de actualización con Darwin Robotics** (https://darwinrobotics.ai). Investigar fuentes primarias, actualizar primero el libro maestro, publicar con el pipeline habitual, verificar producción, documentar el caso como ejemplo reproducible y emitir el cierre. Puntos de control: deduplicar contra «Thesis» (la ficha de YC `companies/thesis` resuelve hoy a Darwin Robotics: mismos fundadores y lote F25), NVIDIA Inception es un programa y no una inversión, el objetivo de despliegues de principios de 2027 es un anuncio sin cliente ni planta, no se deducen especificaciones de fotos.
2. **Hecho (cierre WH-20261117-1456-buscador-global-etiquetas, PR #34, #35 y #36): buscador global y etiquetas comunes** (ideas 2 y 3 de abajo). «Es lo que más facilitaría encontrar información comercial» (Javier). Alcance acordado:
   - Buscador visible y accesible en /app/ con acceso claro desde la portada. Busca en las 13 categorías: robots, empresas y despliegues, nombres y alias, y los campos comerciales relevantes. Cada resultado muestra categoría, nombre, contexto breve de la coincidencia y enlace estable a su ficha. Orden por relevancia (nombre exacto antes que menciones), sin duplicados, paginado, y conserva consulta y filtros al volver.
   - Etiquetas con vocabulario común controlado, sacado de los campos reales: sector, tarea o aplicación, país o ubicación, y tipo o rol de entidad. Estado de despliegue y nivel de evidencia solo donde apliquen. Se distingue el país de sede del país de despliegue, y la madurez del producto del estado del despliegue. Los sinónimos se normalizan; no se inventan etiquetas ni se heredan relaciones ambiguas.
   - Filtros combinables con chips activos, quitar uno a uno, limpiar todo, recuentos del conjunto accesible y estado sin resultados. Interfaz en inglés; mayúsculas, acentos, alias y sinónimos revisados, incluidas búsquedas comerciales habituales en español cuando sea razonable.
   - Seguridad: Humanoids completo gratis; del resto, solo las 10 filas de vista previa ya autorizadas. La autorización se comprueba en el servidor ANTES de buscar, filtrar o generar fragmentos, sugerencias, etiquetas o recuentos, y no hay contenido premium en ningún índice público. Los suscriptores buscan en todo.
   - Índices y etiquetas se regeneran en cada importación y forman parte del skill semanal.
   - Verificación con datos reales (empresa, robot, sector con tarea, país con estado), como visitante y como suscriptor, en móvil y con teclado, con enlaces, recarga y vuelta atrás, sin resultados y con medida de rendimiento. Publicar con CI en verde, comprobar producción y entregar URL, ejemplos, cobertura y límites.
   - Fuera de alcance: mapa del ecosistema, DNS y cambios en Stripe.

## Cola autorizada (17/11/2026, por la tarde)

Javier, a través de Codex, añade dos tareas al final de la cola, en este orden y sin esperar otro permiso entre ellas. No autoriza comprar créditos adicionales (Autosheet incluido). Para las dos: libro maestro primero, fuentes y fechas por afirmación, sin duplicados, publicación por el flujo habitual cuando proceda, verificación de fichas, buscador, relaciones y permisos premium, y cierre con registros cambiados, URLs, evidencias y pendientes. Producto y datos en inglés; coordinación en español.

3. **Pendiente: Boston Dynamics y GlobalFoundries.** Investigar e incorporar la ampliación de su colaboración (https://bostondynamics.com/news/boston-dynamics-globalfoundries-expand-robotics-collaboration/). Leer la fuente primaria y separar por robot (Atlas, Spot u otros si aparecen), tarea, planta, fechas y estado. No atribuir a Atlas operaciones de Spot ni convertir acuerdos o planes en operación verificada. Buscar registros existentes antes de añadir y actualizar las categorías y relaciones que correspondan.
4. **Pendiente: Howl de NC State (Unitree G1 según la noticia).** Proyecto de recogida de huevos del suelo en avicultura sin jaulas. Fuente aportada: https://x.com/CyberRobooo/status/2122713920851128802; localizar la fuente primaria de NC State / CALS Magazine, «From Code to Coop», de Olivia Rogers. Teleoperación con realidad virtual, aprendizaje por imitación y por refuerzo, y objetivo actual de validar detección y recogida en simulación: es investigación y desarrollo, no un despliegue comercial operativo. Confirmar modelo y versión del robot. El 2-15 % de huevos en el suelo es contexto, no rendimiento del robot. Comprobar por separado el 47,7 % de gallinas sin jaulas en abril de 2026 frente al 9,6 % de 2012, y omitirlo si no hay fuente. Poultry Talk (RAG) y la monitorización 2D/3D son proyectos aparte: no afirmar que ya están integrados.

5. **Pendiente, después de la tarea 4: URL permanente por robot y por empresa** (Javier, 17/11/2026, por la tarde; idea 4 de abajo, adelantada). Brief in English:
   - Every robot and company gets a stable, unique, directly accessible URL with real paths, not only hash fragments or modal state. Reuse existing stable identifiers; keep old links working and handle slug changes without breaking inbound links.
   - The main permitted content is in the initial HTML (static generation or server rendering): name, description, available key facts, sources and robot-company links, readable on direct entry without clicks, search, tabs, modals or JavaScript. No invented facts.
   - Public/premium policy unchanged: public company summaries use already public information only; restricted fields stay server-side and out of public HTML, metadata and embedded payloads.
   - Unique titles, canonical URLs and descriptions; linked from the catalogue and search; public indexable pages in the sitemap.
   - Verify direct navigation, refresh, old links, mobile, main HTML without JavaScript and public/premium access. Deliver production URLs for at least one robot and one company, changes, evidence and remaining issues. Not done until production is verified.

## Ideas inspiradas en RoboticsMap (Javier, 17/11/2026)

Guardadas para después; NO implementar mientras el lanzamiento del muro de pago siga abierto.

1. **Hecho el 17/11/2026 (PR #26 y #27, cierre WH-20261117-1335-relaciones-deployments).** **Relaciones robot, empresa y despliegue.** Enlazar cada robot (Humanoids) con su fabricante y sus empresas (Entities, Integrators) y con sus despliegues (Deployments), en las dos direcciones, para navegar de uno a otro.
2. **Hecho el 17/11/2026 (PR #34).** **Buscador global.** Una sola búsqueda sobre las 13 pestañas (nombres, alias, empresas, tareas, lugares), con resultados agrupados por categoría y respetando el muro de pago: la vista previa para visitantes y todo para suscriptores.
3. **Hecho el 17/11/2026 (PR #34).** **Etiquetas comunes.** Un vocabulario compartido entre pestañas (sector, tarea, tipo de robot, país, estado) para filtrar igual en todas.
4. **Fichas con URL propia y correcciones.** Cada registro con una dirección estable que se pueda compartir y citar, y un botón para proponer correcciones que llegue a revisión editorial antes de tocar el libro maestro.
5. **Mapa del ecosistema.** Una vista visual de fabricantes, integradores, clientes y despliegues por país y sector, construida desde las relaciones del punto 1.

Antes de empezar cualquiera hay que decidir qué parte es gratuita y qué parte es premium (d-0008) y cómo se mantiene con la actualización semanal (d-0005).
