/**
 * ARQUITECTURA REFACTORIZADA DEL MANAGER SERVICE
 * 
 * ManagerService (Orquestador principal)
 * │
 * ├─→ Crear flow
 * │   └─ TicketCreationService.executeCreationFlow()
 * │      ├─→ JiraService.fetchTicketsByIds()
 * │      ├─→ TicketMappingService.mapTickets()
 * │      ├─→ JiraService.createTickets()
 * │      ├─→ TicketPersistenceService.createTicketRelations()
 * │      └─→ TicketCopyService.copyIssueExtras()
 * │
 * └─→ Update flow
 *    └─ TicketUpdateService.executeUpdateFlow()
 *       ├─→ TicketPersistenceService.classifyTickets()
 *       ├─→ JiraService.fetchTicketsByIds()
 *       ├─→ TicketMappingService.mapTickets()
 *       ├─→ TicketPersistenceService.findTargetTickets()
 *       └─→ JiraService.updateTickets()
 * 
 * SERVICIOS:
 * - JiraService: Comunicación con APIs Jira (búsqueda, creación, actualización)
 * - TicketCreationService: Orquestador del flujo de creación
 * - TicketUpdateService: Orquestador del flujo de actualización ⭐
 * - TicketMappingService: Transformación de datos entre sistemas
 * - TicketPersistenceService: Persistencia en BD y clasificación
 * - TicketCopyService: Copia de extras (comentarios, attachments)
 * 
 * FLUJO DE CREACIÓN:
 * 1. manager.create(ids)
 * 2. → JiraService.fetchTicketsByIds()
 * 3. → TicketCreationService.executeCreationFlow()
 *    → Mapear + Crear en Jira + Persistir + Copiar extras
 * 
 * FLUJO DE ACTUALIZACIÓN (NUEVO):
 * 1. manager.update(ids)
 * 2. → TicketUpdateService.executeUpdateFlow()
 *    → Clasificar (nuevos vs existentes)
 *    → Obtener solo existentes
 *    → Mapear
 *    → Encontrar IDs de destino en BD
 *    → Actualizar en Jira destino
 * 
 * RESPONSABILIDADES:
 * - ManagerService: Orquestación principal, punto de entrada
 * - JiraService: Comunicación con APIs Jira
 * - TicketCreationService: Orquestación del flujo completo de creación
 * - TicketUpdateService: Orquestación del flujo completo de actualización ⭐
 * - TicketMappingService: Transformación de datos entre sistemas
 * - TicketPersistenceService: Persistencia en BD y búsquedas
 * - TicketCopyService: Copia de extras
 */

