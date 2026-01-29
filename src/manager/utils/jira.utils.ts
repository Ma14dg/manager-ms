/**
 * Constantes y utilidades compartidas para operaciones con Jira
 */

// ===== CONSTANTES =====
export const JIRA_CHUNK_SIZE = 200;
export const JIRA_MAX_RESULTS = 1000;

export const JIRA_REQUIRED_FIELDS = [
  'id',
  'project',
  'issuetype',
  'summary',
  'priority',
  'description',
  'parent',
  'reporter',
  'assignee',
  'environment',
  'customfield_13269',
  'customfield_10246',
  'customfield_11795',
  'customfield_10636',
  'customfield_13283',
  'customfield_13274',
  'customfield_14687',
  'attachment',
  'updated',
];

// ===== TIPOS =====
export type JiraSearchJqlResponse = {
  issues?: Array<{ id: string }>;
  nextPageToken?: string;
  isLast?: boolean;
};

export type JiraErrorInfo = {
  status?: number;
  msg?: string;
};

// ===== UTILIDADES =====

/**
 * Limpia y valida estructura ADF (Atlassian Document Format)
 */
export function sanitizeADF(body: any): any | null {
  if (!body || body.type !== 'doc' || body.version !== 1) {
    return null;
  }

  const cleanContent = (nodes: any[]): any[] =>
    nodes
      .map((node) => {
        if (!node || !node.type) return null;

        // Eliminar media
        if (node.type === 'media' || node.type === 'mediaSingle') {
          return null;
        }

        if (node.content) {
          node.content = cleanContent(node.content);
        }

        // Eliminar nodos vacíos
        if (node.content && node.content.length === 0 && node.type !== 'paragraph') {
          return null;
        }

        if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
          return null;
        }

        return node;
      })
      .filter(Boolean);

  const content = cleanContent(body.content || []);

  if (!content.length) return null;

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

/**
 * Divide un array en chunks de tamaño especificado
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Limpia y valida IDs de tickets
 */
export function sanitizeIds(ids: string[]): string[] {
  return Array.from(
    new Set(ids.map(x => String(x).trim()).filter(x => /^\d+$/.test(x)))
  );
}
