import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { env } from 'src/config';
import axios, { AxiosRequestConfig } from 'axios';
import { IncIssueGetResponse } from 'src/interfaces/issue-integratel.template';
import { IssuesInterface } from 'src/interfaces/issue-pormel.template';
import {
  JIRA_CHUNK_SIZE,
  JIRA_MAX_RESULTS,
  JIRA_REQUIRED_FIELDS,
  JiraSearchJqlResponse,
  sanitizeIds,
  chunkArray,
} from '../utils/jira.utils';

type JiraSearchJqlResponseTicket = {
  issues?: Array<IncIssueGetResponse>;
  nextPageToken?: string;
  isLast?: boolean;
};

export type CreatedTicket = {
  id: string;
  key: string;
  idEx: string;
  keyEx: string;
};

export type FailedTicket = {
  summary?: string;
  error: any;
  idEx?: string;
  keyEx?: string;
};

/**
 * Servicio responsable de la comunicación con Jira
 * Maneja búsquedas, paginación y creación de tickets
 */
@Injectable()
export class JiraService {
  private readonly logger = new Logger('JiraService');
  private readonly sourceConfig: AxiosRequestConfig;
  private readonly targetConfig: AxiosRequestConfig;

  constructor() {
    this.sourceConfig = this.buildAxiosConfig(env.jiraUserEx, env.jiraTokenEx);
    this.targetConfig = this.buildAxiosConfig(env.jiraUserIn, env.jiraTokenIn);
  }

  /**
   * Construye configuración de axios para autenticación básica
   */
  private buildAxiosConfig(username: string, password: string): AxiosRequestConfig {
    return {
      auth: { username, password },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Obtiene IDs de tickets desde Jira externo filtrados por fecha y criterios
   */
  async fetchTicketIds(date: string): Promise<string[]> {
    const ids: string[] = [];

    const jql = `project = INC
                AND (
                (customfield_13272 = "INDRA - Operaciones - BI"
                OR customfield_13272 = SOAINT) and updated >= "${date}"
                )
                ORDER BY updated DESC`;

    await this.fetchJiraPageinated<JiraSearchJqlResponse>(
      env.urlJiraExternal,
      { jql, maxResults: JIRA_MAX_RESULTS, fields: ['id'] },
      this.sourceConfig,
      (data) => {
        const pageIds = (data.issues ?? []).map(i => i.id);
        ids.push(...pageIds);
      }
    );

    return ids;
  }

  /**
   * Obtiene tickets completos desde Jira externo por IDs
   */
  async fetchTicketsByIds(ids: string[]): Promise<IncIssueGetResponse[]> {
    const issues: IncIssueGetResponse[] = [];
    const safeIds = sanitizeIds(ids);

    if (!safeIds.length) return [];

    const chunks = chunkArray(safeIds, JIRA_CHUNK_SIZE);

    for (const chunkIds of chunks) {
      const jql = `id IN (${chunkIds.join(',')}) ORDER BY updated DESC`;

      await this.fetchJiraPageinated<JiraSearchJqlResponseTicket>(
        env.urlJiraExternal,
        { jql, maxResults: JIRA_MAX_RESULTS, fields: JIRA_REQUIRED_FIELDS },
        this.sourceConfig,
        (data) => {
          issues.push(...(data.issues ?? []));
        }
      );
    }

    return issues;
  }

  /**
   * Crea tickets en Jira interno
   */
  async createTickets(
    tickets: IssuesInterface[],
    dbTickets: Array<{ idEx: string; keyEx: string }>
  ): Promise<{ created: CreatedTicket[]; failed: FailedTicket[] }> {
    const created: CreatedTicket[] = [];
    const failed: FailedTicket[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];

      try {
        const { data } = await axios.post(env.urlJiraInternal, ticket, this.targetConfig);

        created.push({
          id: data.id,
          key: data.key,
          ...dbTickets[i],
        });
      } catch (error: any) {
        failed.push({
          summary: ticket.fields?.summary,
          error: error?.response?.data ?? error?.message,
          ...dbTickets[i],
        });

        this.logger.error(
          {
            summary: ticket.fields?.summary,
            project: ticket.fields?.project,
            status: error?.response?.status,
            data: error?.response?.data,
          },
          'Jira POST create failed'
        );
      }
    }

    return { created, failed };
  }

  /**
   * Actualiza tickets existentes en Jira interno
   */
  async updateTickets(
    ticketUpdates: Array<{ id: string; data: IssuesInterface }>
  ): Promise<{ updated: Array<{ id: string; key: string }>; failed: FailedTicket[] }> {
    const updated: Array<{ id: string; key: string }> = [];
    const failed: FailedTicket[] = [];

    for (const { id, data } of ticketUpdates) {
      try {
        const { data: response } = await axios.put(
          `${env.urlJiraInternal}/${id}`,
          { fields: data.fields },
          this.targetConfig
        );

        updated.push({
          id: response.id || id,
          key: response.key || data.fields?.project?.key || '',
        });
      } catch (error: any) {
        failed.push({
          summary: data.fields?.summary,
          error: error?.response?.data ?? error?.message,
          idEx: id,
        });

        this.logger.error(
          {
            ticketId: id,
            summary: data.fields?.summary,
            status: error?.response?.status,
            data: error?.response?.data,
          },
          'Jira PUT update failed'
        );
      }
    }

    return { updated, failed };
  }

  /**
   * Hace solicitudes paginadas a Jira de forma genérica
   */
  private async fetchJiraPageinated<T extends { nextPageToken?: string; isLast?: boolean }>(
    url: string,
    body: any,
    config: AxiosRequestConfig,
    onData: (data: T) => void
  ): Promise<void> {
    let nextPageToken: string | undefined = undefined;
    let isLast = false;

    while (!isLast) {
      try {
        const requestBody = nextPageToken ? { ...body, nextPageToken } : body;

        const { data } = await axios.post<T>(url, requestBody, config);

        onData(data);

        nextPageToken = data.nextPageToken;
        isLast = Boolean(data.isLast) || !nextPageToken;
      } catch (error: any) {
        this.handleJiraError(error, 'Jira search/jql failed');
        throw new InternalServerErrorException(
          `Error al conectar con Jira-Externo${error?.response?.status ? ` (HTTP ${error.response.status})` : ''}`
        );
      }
    }
  }

  /**
   * Manejo centralizado de errores de Jira
   */
  private handleJiraError(error: any, context: string): void {
    const status = error?.response?.status;
    const msg = error?.response?.data ?? error?.message;
    this.logger.error({ status, msg }, context);
  }

  /**
   * Obtiene configuración de origen para HttpService
   */
  getSourceConfig(): AxiosRequestConfig {
    return this.sourceConfig;
  }

  /**
   * Obtiene configuración de destino para HttpService
   */
  getTargetConfig(): AxiosRequestConfig {
    return this.targetConfig;
  }
}
