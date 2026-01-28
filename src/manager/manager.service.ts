import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { env, NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';
import { IncIssueGetResponse } from 'src/interfaces/issue-integratel.template';
import { mapTicketIntegraPormel } from 'src/common/maps/map-pormel-integratel';
import { IssuesInterface } from 'src/interfaces/issue-pormel.template';
type JiraSearchJqlResponse = {
  issues?: Array<{ id: string }>;
  nextPageToken?: string;
  isLast?: boolean;
};
type JiraSearchJqlResponseTicket = {
  issues?: Array<IncIssueGetResponse>;
  nextPageToken?: string;
  isLast?: boolean;
};

@Injectable()
export class ManagerService {
  
    private readonly logger = new Logger('Service')
  
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private readonly prisma: PrismaService
  ) { }

async create(ids: string[]) {
  const tickets = await this.ticketsByIds(ids);
  const dbObject:{}[] =[{}];
  const newTickets: IssuesInterface[] = [];

  for (const ticket of tickets) {
    if (!ticket) continue;

    try {
      const newticket = mapTicketIntegraPormel(ticket)
      dbObject.push({idEx : ticket.id , keyEx: ticket.key})
      newTickets.push(newticket);
    } catch (e: any) {
      this.logger?.error?.(
        {
          issueId: ticket?.id,
          issueKey: ticket?.key,
          msg: e?.message,
        },
        "mapTicketIntegraPormel failed"
      );
      continue;
    }
  }
  console.log(newTickets[1])
  return await this.createTickets(newTickets)
}


  async update(ids: string[]) {
    return `This action updates a #manager`;
  }

  private async clasificator(ids: string[]) {

    const existing = await this.prisma.ticketRelation.findMany({
      where: {
        sourceSystem: 'integratel',
        sourceIssueId: {
          in: ids,
        },
      },
      select: {
        sourceIssueId: true,
      },
    });

    const existingSet = new Set(
      existing.map(e => e.sourceIssueId)
    );

    // 3️⃣ Clasificar
    const newIds: string[] = [];
    const oldIds: string[] = [];

    for (const id of ids) {
      if (existingSet.has(id)) {
        oldIds.push(id);
      } else {
        newIds.push(id);
      }
    }

    return {
      newIds,
      oldIds,
    };
  }

  async ticketsId(date: string) {
  const ids: string[] = [];

  const jql = `project = INC
                AND (
                (customfield_13272 = "INDRA - Operaciones - BI"
                OR customfield_13272 = SOAINT) and updated >= "${date}"
                )
                ORDER BY updated DESC`;

  let nextPageToken: string | undefined = undefined;
  let isLast = false;

  while (!isLast) {
    try {
      const body: any = {
        jql,
        maxResults: 1000,        // probá 100 o 500 si tu instancia limita
        fields: ["id"],         // solo ids
      };

      // para la segunda página en adelante
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const { data } = await axios.post<JiraSearchJqlResponse>(
        env.urlJiraExternal, // ej: https://integratelperu.atlassian.net/rest/api/3/search/jql
        body,
        {
          auth: {
            username: env.jiraUserEx,
            password: env.jiraTokenEx,
          },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          
        }
      );

      const pageIds = (data.issues ?? []).map((i) => i.id);
      ids.push(...pageIds);

      nextPageToken = data.nextPageToken;
      isLast = Boolean(data.isLast) || !nextPageToken;
    } catch (error: any) {
      const status = error?.response?.status;     // <- acá está el status real
      const msg = error?.response?.data ?? error?.message;

      this.logger.error({ status, msg }, "Jira search/jql failed");

      throw new InternalServerErrorException(
        `Error al conectar con Jira-Externo${status ? ` (HTTP ${status})` : ""}`
      );
    }
  }

  const classified = await this.clasificator(ids)

  return classified ;
  }

  async ticketsByIds(ids: string[]) {
  const issues: IncIssueGetResponse[] = [];

  const safeIds = Array.from(
    new Set(ids.map((x) => String(x).trim()).filter((x) => /^\d+$/.test(x)))
  );

  if (!safeIds.length) return [];

  const chunkSize = 200; // por las dudas (evita URLs/body enormes)
  const chunks: string[][] = [];
  for (let i = 0; i < safeIds.length; i += chunkSize) {
    chunks.push(safeIds.slice(i, i + chunkSize));
  }

  for (const chunkIds of chunks) {
    const jql = `id IN (${chunkIds.join(",")}) ORDER BY updated DESC`;

    let nextPageToken: string | undefined = undefined;
    let isLast = false;

    while (!isLast) {
      try {
        const body: any = {
          jql,
          maxResults: 1000,
          fields: [
            "id",
            "project",
            "issuetype",
            "summary",
            "priority",
            "description",
            "parent",
            "reporter",
            "assignee",
            "environment",
            "customfield_13269",
            "customfield_10246",
            "customfield_11795",
            "customfield_10636",
            "customfield_13283",
            "customfield_13274",
            "customfield_14687",
            "attachment",
            "updated",
          ],
        };

        if (nextPageToken) body.nextPageToken = nextPageToken;

        const { data } = await axios.post<JiraSearchJqlResponseTicket>(
          env.urlJiraExternal,
          body,
          {
            auth: {
              username: env.jiraUserEx,
              password: env.jiraTokenEx,
            },
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        issues.push( ...(data.issues ?? []));

        nextPageToken = data.nextPageToken;
        isLast = Boolean(data.isLast) || !nextPageToken;
      } catch (error: any) {
        const status = error?.response?.status;
        const msg = error?.response?.data ?? error?.message;

        this.logger.error({ status, msg }, "Jira search/jql failed");

        throw new InternalServerErrorException(
          `Error al conectar con Jira-Externo${status ? ` (HTTP ${status})` : ""}`
        );
      }
    }
  }

  return issues;
}
  async createTickets(tickets: IssuesInterface[]) {
  const created: { id: string; key: string }[] = [];
  const failed: { summary?: string; error: any }[] = [];

  for (const ticket of tickets) {
    try {

      
      const { data } = await axios.post(
        env.urlJiraInternal, // ej: https://xxx.atlassian.net/rest/api/3/issue
        ticket,
        {
            auth: {
              username: env.jiraUserIn,
              password: env.jiraTokenIn,
            },
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
        }
      );

      created.push({
        id: data.id,
        key: data.key,
      });

    } catch (error: any) {
      failed.push({
        summary: ticket.fields?.summary,
        error: error?.response?.data ?? error?.message,
      });

      this.logger?.error(
        {
          summary: ticket.fields?.summary,
          project: ticket.fields.project,
          status: error?.response?.status,
          data: error?.response?.data,
        },
        "Jira POST create failed"
      );
    }
  }

  return { created, failed };
}

}
