import { Injectable, Logger } from '@nestjs/common';
import { JiraService } from './jira.service';
import { TicketMappingService } from './ticket-mapping.service';
import { TicketPersistenceService } from './ticket-persistence.service';

/**
 * Servicio orquestador para la actualización completa de tickets
 * Maneja el flujo: clasificar → obtener → mapear → actualizar en Jira
 */
@Injectable()
export class TicketUpdateService {
  private readonly logger = new Logger('TicketUpdateService');

  constructor(
    private readonly jiraService: JiraService,
    private readonly ticketMappingService: TicketMappingService,
    private readonly persistenceService: TicketPersistenceService
  ) {}

  /**
   * Ejecuta el flujo completo de actualización de tickets
   * 1. Clasifica tickets (nuevos vs existentes)
   * 2. Obtiene solo los existentes
   * 3. Mapea tickets desde origen a formato destino
   * 4. Actualiza en Jira destino
   */
  async executeUpdateFlow(ids: string[]) {
    // Step 1: Clasificar
    const { oldIds } = await this.persistenceService.classifyTickets(ids);

    if (oldIds.length === 0) {
      this.logger.warn('No existing tickets found to update', { requestedIds: ids });
      return { updated: [], failed: [] };
    }

    this.logger.debug(`Found ${oldIds.length} existing tickets to update`);

    // Step 2: Obtener tickets desde origen
    const tickets = await this.jiraService.fetchTicketsByIds(oldIds);

    if (tickets.length === 0) {
      this.logger.warn('No ticket data retrieved for update', { oldIds });
      return { updated: [], failed: [] };
    }

    // Step 3: Mapear tickets
    const { mapped, failed: mappingFailed } = this.ticketMappingService.mapTickets(tickets);

    if (mappingFailed.length > 0) {
      mappingFailed.forEach(f =>
        this.logger.error(
          { issueId: f.id, issueKey: f.key, error: f.error },
          'Ticket mapping failed during update'
        )
      );
    }

    if (mapped.length === 0) {
      this.logger.warn('No tickets to update after mapping');
      return { updated: [], failed: mappingFailed };
    }

    // Step 4: Obtener IDs de destino desde BD
    const targetTickets = await this.persistenceService.findTargetTickets(oldIds);

    // Preparar datos para actualización
    const ticketUpdates = mapped
      .map(m => ({
        sourceId: m.idEx,
        targetId: targetTickets.get(m.idEx),
        data: m.ticket,
      }))
      .filter(t => t.targetId); // Solo los que tienen mapping

    if (ticketUpdates.length === 0) {
      this.logger.warn('No target tickets found for update mapping');
      return { updated: [], failed: mappingFailed };
    }

    // Step 5: Actualizar en Jira
    const { updated, failed: updateFailed } = await this.jiraService.updateTickets(
      ticketUpdates.map(t => ({
        id: t.targetId!,
        data: t.data,
      }))
    );

    if (updateFailed.length > 0) {
      updateFailed.forEach(f =>
        this.logger.error(
          { summary: f.summary, error: f.error },
          'Ticket update in Jira failed'
        )
      );
    }

    return {
      updated,
      failed: [...mappingFailed, ...updateFailed],
    };
  }
}
