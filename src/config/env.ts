import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {  
  PORT: number;
  NATS_SERVERS:string;
  JIRA_USER_EX: string;
  JIRA_TOKEN_EX: string;
  JIRA_USER_IN: string;
  JIRA_TOKEN_IN: string;
  URL_JIRA_EXTERNAL :string;
  URL_JIRA_INTERNAL :string;
}

const envsSchema = joi.object({
  NATS_SERVERS: joi.array().items( joi.string() ).required(),
})
.unknown(true);

const { error, value } = envsSchema.validate( { 
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
} );


if ( error ) {
  throw new Error(`Config validation error: ${ error.message }`);
}

const envVars:EnvVars = value;


export const env = {
    port: envVars.PORT,
    natsServers: envVars.NATS_SERVERS,
    jiraUserEx: envVars.JIRA_USER_EX,
    jiraTokenEx: envVars.JIRA_TOKEN_EX,
    jiraUserIn: envVars.JIRA_USER_IN,
    jiraTokenIn: envVars.JIRA_TOKEN_IN,
    urlJiraExternal: envVars.URL_JIRA_EXTERNAL,
    urlJiraInternal: envVars.URL_JIRA_INTERNAL,
}