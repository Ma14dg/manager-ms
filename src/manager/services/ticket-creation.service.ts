import { Injectable, Logger } from '@nestjs/common';
import { IncIssueGetResponse } from 'src/interfaces/issue-integratel.template';
import { JiraService, CreatedTicket, FailedTicket } from './jira.service';
import { TicketCopyService } from './ticket-copy.service';
import { TicketMappingService } from './ticket-mapping.service';
import { TicketPersistenceService } from './ticket-persistence.service';

/**
 * Servicio orquestador para la creación completa de tickets
 * Maneja el flujo: mapear → crear en Jira → persistir en BD → copiar extras
 */
@Injectable()
export class TicketCreationService {
  private readonly logger = new Logger('TicketCreationService');

  constructor(
    private readonly jiraService: JiraService,
    private readonly ticketCopyService: TicketCopyService,
    private readonly ticketMappingService: TicketMappingService,
    private readonly persistenceService: TicketPersistenceService
  ) {}

  /**
   * Ejecuta el flujo completo de creación de tickets
   * 1. Mapea tickets desde origen a formato destino
   * 2. Crea tickets en Jira destino
   * 3. Persiste relaciones en BD
   * 4. Copia comentarios y attachments
   */
  async executeCreationFlow(
    tickets: IncIssueGetResponse[]
  ): Promise<{ created: CreatedTicket[]; failed: FailedTicket[] }> {
    // Step 1: Mapear tickets
    const { mapped, failed: mappingFailed } = this.ticketMappingService.mapTickets(tickets);

    if (mappingFailed.length > 0) {
      mappingFailed.forEach(f =>
        this.logger.error(
          { issueId: f.id, issueKey: f.key, error: f.error },
          'Ticket mapping failed'
        )
      );
    }

    if (mapped.length === 0) {
      this.logger.warn('No tickets to create after mapping');
      return { created: [], failed: mappingFailed };
    }

    // Step 2: Crear en Jira
    const { created, failed: creationFailed } = await this.jiraService.createTickets(
      mapped.map(m => m.ticket),
      mapped.map(m => ({ idEx: m.idEx, keyEx: m.keyEx }))
    );

    if (creationFailed.length > 0) {
      creationFailed.forEach(f =>
        this.logger.error(
          { summary: f.summary, error: f.error },
          'Ticket creation in Jira failed'
        )
      );
    }

    // Step 3: Persistir en BD
    if (created.length > 0) {
      await this.persistenceService.createTicketRelations(created);
    }

    // Step 4: Copiar extras (comentarios y attachments)
    await this.copyExtrasForCreatedTickets(created);

    return {
      created,
      failed: [...mappingFailed, ...creationFailed],
    };
  }

  /**
   * Copia comentarios y attachments para cada ticket creado
   */
  private async copyExtrasForCreatedTickets(created: CreatedTicket[]): Promise<void> {
    const sourceConfig = this.jiraService.getSourceConfig();
    const targetConfig = this.jiraService.getTargetConfig();

    const promises = created.map(ticket =>
      this.ticketCopyService
        .copyIssueExtras(ticket.idEx, ticket.id, sourceConfig, targetConfig)
        .catch(error =>
          this.logger.error(
            { sourceId: ticket.idEx, targetId: ticket.id, error },
            'Error copying issue extras'
          )
        )
    );

    await Promise.allSettled(promises);
  }
}
