import e from "express";

export type JiraId = string;

export interface JiraLinkRef {
  self?: string;
}

export interface JiraProject {
  id: JiraId;
  key: string;
  name?: string;
  self?: string;
}

export interface JiraIssueType {
  id: JiraId;
  name?: string;
  self?: string;
  subtask?: boolean;
}

export interface JiraUser {
  accountId: JiraId;
  displayName?: string;
  emailAddress?: string;
  active?: boolean;
  self?: string;
}

export interface JiraOption {
  id: JiraId;
  value?: string;
  self?: string;
}
export interface Priority {
  id: JiraId;
  name?: string;
  self?: string;
  iconUrl: string
}
export type ADFNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: ADFNode[];
  text?: string;
  marks?: any[];
};

export type ADFDoc = {
  type: "doc";
  version: 1;
  content: ADFNode[];
};

// ---- CMDB/Assets refs (lo que se ve en el GET) ----
export interface CmdbObjectInIssue {
  workspaceId?: string;
  id?: string;       // suele venir como "workspaceId:objectId"
  objectId?: string; // número como string
  objectKey?: string;
  label?: string;
  // y a veces atributos; lo dejamos flexible
  [k: string]: unknown;
}

export interface JiraAttachment {
  self?: string;
  id: JiraId;
  filename?: string;
  mimeType?: string;
  size?: number;
  content?: string;
  thumbnail?: string;
  created?: string;
  author?: JiraUser;
}

export interface JiraStatus {
  id: JiraId;
  name: string;
  self?: string;
}

// =======================
// Response interface
// =======================

/**
 * GET /rest/api/3/issue/{issueIdOrKey}
 * Modelado SOLO con los campos que tu create-payload soporta.
 */
export interface IncIssueGetResponse {
  id: JiraId;
  key: string;
  self?: string;
  expand?: string;

  fields: {
    // "soporta": project, issuetype, summary, description, parent
    project: JiraProject;
    issuetype: JiraIssueType;
    summary: string;
    priority?: Priority;
    // en GET es ADF o null (en tu ejemplo es ADF)
    description?: ADFDoc | null;

    // parent a veces viene como objeto issue "lite"
    parent?: {
      id?: JiraId;
      key: string;
      self?: string;
      fields?: {
        summary?: string;
        issuetype?: JiraIssueType;
      };
    } | null;

    //Asignacion y Estado
      status?: JiraStatus;

    // Soportados en tu payload (aunque algunos sean optional)
    reporter?: JiraUser | null;
    assignee?: JiraUser | null;
    environment?: string | null;

    // customfields del createmeta INC
    customfield_13269?: JiraOption | null; // Urgencia (option)
    customfield_10246?: JiraOption | null; // Impacto (option)

    customfield_11795?: string | null; // Teléfono del Solicitante
    customfield_10636?: number | null; // Cantidad de casos (día)

    // CMDB / Assets
    customfield_13283?: CmdbObjectInIssue[] | null; // Tipología
    customfield_13274?: CmdbObjectInIssue[] | null; // APLICACION 1
    customfield_14687?: CmdbObjectInIssue[] | null; // Tipo de Componente
    customfield_16907: string;
    
    attachment?: JiraAttachment[];
  };
}
