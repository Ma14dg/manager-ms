/**
 * Constantes y configuración centralizada para Jira
 */

// ===== HOSTS JIRA =====
export const JIRA_HOSTS = {
  SOURCE: 'https://integratelperu.atlassian.net',
  TARGET: 'https://pormel.atlassian.net',
};

// ===== API ENDPOINTS =====
export const JIRA_ENDPOINTS = {
  SEARCH: '/rest/api/3/search/jql',
  ISSUE_CREATE: '/rest/api/3/issue',
  ISSUE_GET: (issueId: string) => `/rest/api/3/issue/${issueId}`,
  ISSUE_COMMENTS: (issueId: string) => `/rest/api/3/issue/${issueId}/comment`,
  ISSUE_ATTACHMENTS: (issueId: string) => `/rest/api/3/issue/${issueId}/attachments`,
};
