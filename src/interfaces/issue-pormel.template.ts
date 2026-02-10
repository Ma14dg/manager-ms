
export enum UrgenciasId {
    Crítica = "10020",
    Alta = "10021",
    Media = "10022",
    Baja = "10023",
}
export enum issueId{
    Incidente = "10146",
    Solicitud = "10147",
    Problema = "10148",
}
export enum priorityId{
  P1_Critica = "10003",
  P2_Alta = "10002",
  P3_Media = "10001",
  P4_Baja = "10000",
  P5_Interna = "10004",
}
export enum ImpactoId {
    Extenso = "10000",
    Significativo = "10001",
    Moderado = "10002",
    Menor = "10003",
}
export enum servicesId {
    Campañas = "ari:cloud:graph::service/f74cb678-7b46-4ef5-ab62-7611ab6444eb/817145be-fd23-11f0-b9f6-0affcf0fbd09",
    BI = "ari:cloud:graph::service/f74cb678-7b46-4ef5-ab62-7611ab6444eb/ce7b58cc-fd23-11f0-8c4e-0affcf0fbd09"
}
export enum teamsId {
    NOC = "040c35a7-ab29-4cf5-9102-4ed7a1d5b14c",
    Especialisado ="56b66b31-28fc-4d96-899f-b2439f4f0b02"
}
export interface IssuesInterface {
    fields:{
        project:{
            key : string 
        };
        issuetype:{
            id: issueId | null
        };
        summary:string;
        description: any;
        reporter?: { id:string}| null;
        assignee?: { id:string}| null;
        //attachment?:{}| null;
        customfield_10043?:{ id: UrgenciasId}| null;
        customfield_10004?:{ id: ImpactoId}| null;

        
        priority?: { id:priorityId}| null;
        environment?: string | null;

        customfield_10044: { id:servicesId }[]| null;
        
        customfield_10002: { id:string }[]| null;
        //Team
        customfield_10001?: { id: teamsId }| null; 
        //Major Incident
        customfield_10047?: string| null;
        //root cause
        customfield_10058?:string| null;

        customfield_10059?:string| null;
        
        parent?: {key: string}[]| null;
    }
    
}