import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { IncIssueGetResponse } from 'src/interfaces/issue-integratel.template';
import { mapTicketIntegraPormel } from 'src/common/maps/map-pormel-integratel';
import { IssuesInterface } from 'src/interfaces/issue-pormel.template';

/**
 * Servicio responsable del mapeo y clasificación de tickets
 * Gestiona la transformación de tickets entre sistemas y su clasificación
 */
@Injectable()
export class TicketMappingService {
  private readonly logger = new Logger('TicketMappingService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mapea tickets de Jira externo a formato interno
   */
  mapTickets(tickets: IncIssueGetResponse[]) {
    const mapped: Array<{ ticket: IssuesInterface; idEx: string; keyEx: string }> = [];
    const failed: Array<{ id: string; key: string; error: string }> = [];

    for (const ticket of tickets) {
      if (!ticket) continue;

      try {
        const mappedTicket = mapTicketIntegraPormel(ticket);
        mapped.push({
          ticket: mappedTicket,
          idEx: ticket.id,
          keyEx: ticket.key,
        });
      } catch (error: any) {
        failed.push({
          id: ticket.id,
          key: ticket.key,
          error: error?.message,
        });
      }
    }

    return { mapped, failed };
  }

  /**
   * Clasifica tickets en nuevos (no en BD) y existentes (en BD)
   */
  async clasificator(ids: string[]) {
    const existing = await this.prisma.ticketRelation.findMany({
      where: {
        sourceSystem: 'integratel',
        sourceIssueId: { in: ids },
      },
      select: { sourceIssueId: true },
    });

    const existingSet = new Set(existing.map(e => e.sourceIssueId));
    const newIds: string[] = [];
    const oldIds: string[] = [];

    for (const id of ids) {
      if (existingSet.has(id)) {
        oldIds.push(id);
      } else {
        newIds.push(id);
      }
    }

    return { newIds, oldIds };
  }
}
