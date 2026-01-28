
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
        //TODO: investigar que es un affected services
        customfield_10044?: { id:string }[]| null;
        
        //TODO: investigar que es Organizations
        customfield_10002?: { id:string }[]| null;

        customfield_10001?: { id: string }| null; 
        //Major Incident
        customfield_10047?: string| null;
        //root cause
        customfield_10058?:string| null;

        customfield_10059?:string| null;
        
        parent?: {key: string}[]| null;
    }
    
}