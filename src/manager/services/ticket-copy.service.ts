import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { env } from 'src/config';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import { AxiosRequestConfig } from 'axios';
import { sanitizeADF } from '../utils/jira.utils';

/**
 * Servicio responsable de copiar comentarios y attachments entre tickets
 * Encapsula la lógica de migración de extras de un ticket a otro
 */
@Injectable()
export class TicketCopyService {
  private readonly logger = new Logger('TicketCopyService');

  constructor(private readonly http: HttpService) {}

  /**
   * Copia comentarios desde ticket origen a ticket destino
   */
  async copyComments(
    sourceId: string,
    targetId: string,
    sourceConfig: AxiosRequestConfig,
    targetConfig: AxiosRequestConfig
  ): Promise<void> {
    try {
      const { data } = await lastValueFrom(
        this.http.get(
          `https://integratelperu.atlassian.net/rest/api/3/issue/${sourceId}/comment`,
          sourceConfig
        )
      );

      const commentPromises = (data.comments ?? [])
        .filter((comment: any) => comment.body)
        .map(async (comment: any) => {
          const cleanBody = sanitizeADF(structuredClone(comment.body));
          if (!cleanBody) return;

          cleanBody.content.unshift({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `[Migrado desde Jira origen - ${comment.author?.displayName ?? 'Desconocido'}]`,
              },
            ],
          });

          return lastValueFrom(
            this.http.post(
              `https://pormel.atlassian.net/rest/api/3/issue/${targetId}/comment`,
              { body: cleanBody },
              targetConfig
            )
          );
        });

      await Promise.allSettled(commentPromises);
    } catch (error: any) {
      this.logger.error(
        { sourceId, targetId, error: error?.message },
        'Error copying comments'
      );
    }
  }

  /**
   * Copia attachments desde ticket origen a ticket destino
   */
  async copyAttachments(
    sourceId: string,
    targetId: string,
    sourceConfig: AxiosRequestConfig
  ): Promise<void> {
    try {
      const { data } = await lastValueFrom(
        this.http.get(
          `https://integratelperu.atlassian.net/rest/api/3/issue/${sourceId}`,
          sourceConfig
        )
      );

      const attachments = data.fields?.attachment ?? [];
      const attachmentPromises = attachments.map(async (att: any) => {
        try {
          const file = await lastValueFrom(
            this.http.get(att.content, {
              responseType: 'stream',
              ...sourceConfig,
            })
          );

          const form = new FormData();
          form.append('file', file.data, att.filename);

          const authToken = Buffer.from(
            `${env.jiraUserIn}:${env.jiraTokenIn}`
          ).toString('base64');

          return lastValueFrom(
            this.http.post(
              `https://pormel.atlassian.net/rest/api/3/issue/${targetId}/attachments`,
              form,
              {
                headers: {
                  ...form.getHeaders(),
                  Authorization: `Basic ${authToken}`,
                  'X-Atlassian-Token': 'no-check',
                },
                maxBodyLength: Infinity,
              }
            )
          );
        } catch (error: any) {
          this.logger.error(
            { attachment: att.filename, error: error?.message },
            'Error copying single attachment'
          );
        }
      });

      await Promise.allSettled(attachmentPromises);
    } catch (error: any) {
      this.logger.error(
        { sourceId, targetId, error: error?.message },
        'Error copying attachments'
      );
    }
  }

  /**
   * Copia comentarios y attachments de un ticket
   */
  async copyIssueExtras(
    sourceId: string,
    targetId: string,
    sourceConfig: AxiosRequestConfig,
    targetConfig: AxiosRequestConfig
  ): Promise<void> {
    await Promise.all([
      this.copyAttachments(sourceId, targetId, sourceConfig),
      this.copyComments(sourceId, targetId, sourceConfig, targetConfig),
    ]);
  }
}
