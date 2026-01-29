import { Inject, Injectable, Logger } from '@nestjs/common';
import { env, NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { JiraService } from './services/jira.service';
import { TicketCreationService } from './services/ticket-creation.service';
import { TicketUpdateService } from './services/ticket-update.service';
import { TicketPersistenceService } from './services/ticket-persistence.service';

/**
 * Servicio principal que orquesta la creación y actualización de tickets
 * Delega responsabilidades específicas a servicios especializados
 */
@Injectable()
export class ManagerService {
  private readonly logger = new Logger('ManagerService');

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private readonly jiraService: JiraService,
    private readonly ticketCreationService: TicketCreationService,
    private readonly ticketUpdateService: TicketUpdateService,
    private readonly persistenceService: TicketPersistenceService
  ) {}
  /**
   * Crea tickets: obtiene desde Jira externo y ejecuta flujo completo de creación
   */
  async create(ids: string[]) {
    const tickets = await this.jiraService.fetchTicketsByIds(ids);
    return this.ticketCreationService.executeCreationFlow(tickets);
  }

  /**
   * Actualiza tickets existentes
   */
  async update(ids: string[]) {
    return this.ticketUpdateService.executeUpdateFlow(ids);
  }

  /**
   * Obtiene IDs de tickets clasificados desde Jira externo filtrados por fecha
   */
  async ticketsId(date: string) {
    const ids = await this.jiraService.fetchTicketIds(date);
    const classified = await this.persistenceService.classifyTickets(ids);
    return classified;
  }
}