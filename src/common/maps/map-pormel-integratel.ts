import {
  issueId,
  IssuesInterface
} from "../../interfaces/issue-pormel.template";
import { IncIssueGetResponse } from '../../interfaces/issue-integratel.template';
import { mapImpacto, mapPrioridad, mapServices, mapTeam, mapUrgencia } from "./helpers/map.helpers";
import { map } from "rxjs";

export const mapTicketIntegraPormel = (ticketInt: IncIssueGetResponse): IssuesInterface => {
  const urgencia = mapUrgencia(ticketInt.fields.customfield_13269?.id);
  const impacto = mapImpacto(ticketInt.fields.customfield_10246?.id);
  const prioridad = mapPrioridad(ticketInt.fields.priority?.id);
  const description = toADF(ticketInt.fields.description);
  const services = mapServices(ticketInt.fields.customfield_16907);
  const team = mapTeam(ticketInt.fields.status!.name);
  const ticketPormel: IssuesInterface = {
    fields: {
      project: { key: "SPT" },
      issuetype: { id: issueId.Incidente },
      summary: `|Key:${ticketInt.key}| - | ${ticketInt.fields.summary} |`,
      description: description || createDefaultDescription(),
      customfield_10043: urgencia ? { id: urgencia } : undefined,
      customfield_10004: impacto ? { id: impacto } : undefined,
      customfield_10002:[{ id: '100'}],
      customfield_10044: [{ id: services }],
      customfield_10001:{id: team},
      priority: prioridad ? { id: prioridad } : undefined,
      environment: ticketInt.fields.environment ?? undefined
    }
  };

  return ticketPormel;
};

type ADFText = { type: "text"; text: string };
type ADFParagraph = { type: "paragraph"; content: ADFText[] };
type ADFDoc = { type: "doc"; version: 1; content: ADFParagraph[] };

/**
 * Cleans an ADF node by removing invalid structures and ensuring all fields are properly formatted.
 * This prevents Jira API errors about unrecognized file formats.
 */
function cleanADFNode(node: any): any {
  if (!node || typeof node !== 'object') {
    return null;
  }

  // Handle text nodes
  if (node.type === 'text' && typeof node.text === 'string') {
    const result: any = { type: 'text', text: node.text };
    if (Array.isArray(node.marks)) {
      result.marks = node.marks.filter((m: any) => m && typeof m === 'object' && m.type);
      if (result.marks.length === 0) delete result.marks;
    }
    return result;
  }

  // Handle paragraph nodes
  if (node.type === 'paragraph') {
    const content = (Array.isArray(node.content) ? node.content : [])
      .map(cleanADFNode)
      .filter((n: any) => n !== null);
    // Return null if paragraph has no content to avoid empty paragraphs
    if (content.length === 0) {
      return null;
    }
    return { type: 'paragraph', content };
  }

  // Handle other block types (heading, bulletList, orderedList, blockquote, codeBlock, etc)
  if (['heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'panel'].includes(node.type)) {
    const result: any = { type: node.type };
    
    if (node.type === 'heading' && node.attrs?.level) {
      result.attrs = { level: node.attrs.level };
    }
    if (node.type === 'codeBlock' && node.attrs?.language) {
      result.attrs = { language: node.attrs.language };
    }
    if (node.type === 'panel' && node.attrs?.panelType) {
      result.attrs = { panelType: node.attrs.panelType };
    }

    if (Array.isArray(node.content)) {
      const content = node.content
        .map(cleanADFNode)
        .filter((n: any) => n !== null);
      // Return null if block has no content to avoid empty blocks
      if (content.length === 0) {
        return null;
      }
      result.content = content;
    }
    return result;
  }

  // Handle inline nodes (hardbreak, mention, emoji, etc)
  if (['hardbreak', 'mention', 'emoji'].includes(node.type)) {
    const result: any = { type: node.type };
    if (node.attrs && typeof node.attrs === 'object') {
      result.attrs = { ...node.attrs };
    }
    return result;
  }

  // Ignore unknown node types
  return null;
}

export function toADF(value: any): ADFDoc | null {
  // si ya es ADF válido con estructura
  if (value && value.type === "doc" && value.version === 1 && Array.isArray(value.content)) {
    // Clean the ADF content to remove invalid structures
    const cleanedContent = value.content
      .map(cleanADFNode)
      .filter((n: any) => n !== null);

    // If content is empty after cleaning, return null so default description is used
    if (cleanedContent.length === 0) {
      return null;
    }

    return {
      type: "doc",
      version: 1,
      content: cleanedContent,
    };
  }

  // si viene como string o cualquier cosa -> ADF mínimo
  const text = (value ?? "").toString().trim();

  // If text is empty, return null so default description is used
  if (!text) {
    return null;
  }

  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

/**
 * Creates a default description ADF document when no description is available
 */
function createDefaultDescription(): ADFDoc {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Ticket migrado desde Integratel" }],
      },
    ],
  };
}