import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreatedTicket } from './jira.service';

/**
 * Servicio responsable de la persistencia de datos en BD
 * Maneja la creación y actualización de relaciones entre tickets
 */
@Injectable()
export class TicketPersistenceService {
  private readonly logger = new Logger('TicketPersistenceService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea registros en base de datos para mantener relación entre tickets
   */
  async createTicketRelations(created: CreatedTicket[]): Promise<void> {
    const createPromises = created.map(ticket =>
      this.prisma.ticketRelation.create({
        data: {
          sourceSystem: 'integratel',
          sourceIssueId: ticket.idEx,
          sourceIssueKey: ticket.keyEx,
          targetSystem: 'pormel',
          targetIssueId: ticket.id,
          targetIssueKey: ticket.key,
        },
      }).catch(error => {
        this.logger.error(
          { issueId: ticket.id, error },
          'Error creating ticket relation'
        );
        return null;
      })
    );

    await Promise.allSettled(createPromises);
  }

  /**
   * Obtiene tickets existentes desde la BD para clasificación
   */
  async findExistingTickets(sourceIds: string[]): Promise<Set<string>> {
    const existing = await this.prisma.ticketRelation.findMany({
      where: {
        sourceSystem: 'integratel',
        sourceIssueId: { in: sourceIds },
      },
      select: { sourceIssueId: true },
    });

    return new Set(existing.map(e => e.sourceIssueId));
  }

  /**
   * Obtiene el mapeo de IDs origen → destino
   */
  async findTargetTickets(sourceIds: string[]): Promise<Map<string, string>> {
    const relations = await this.prisma.ticketRelation.findMany({
      where: {
        sourceSystem: 'integratel',
        sourceIssueId: { in: sourceIds },
      },
      select: {
        sourceIssueId: true,
        targetIssueId: true,
      },
    });

    const map = new Map<string, string>();
    relations.forEach(r => map.set(r.sourceIssueId, r.targetIssueId));
    return map;
  }

  /**
   * Clasifica tickets en nuevos y existentes
   */
  async classifyTickets(ids: string[]): Promise<{ newIds: string[]; oldIds: string[] }> {
    const existingSet = await this.findExistingTickets(ids);
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
