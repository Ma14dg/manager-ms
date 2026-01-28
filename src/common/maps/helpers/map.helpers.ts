import { ImpactoId, priorityId, UrgenciasId } from "src/interfaces/issue-pormel.template";

export const mapUrgencia = (id?: string): UrgenciasId | undefined => {
  switch (id) {
    case "618442": return UrgenciasId.Alta;
    case "618438": return UrgenciasId.Media;
    case "618439": return UrgenciasId.Baja;
    default: return undefined;
  }
};

export const mapImpacto = (id?: string): ImpactoId | undefined => {
  switch (id) {
    case "618439": return ImpactoId.Significativo;
    case "618438": return ImpactoId.Moderado;
    case "618437": return ImpactoId.Menor;
    default: return undefined;
  }
};

export const mapPrioridad = (id?: string): priorityId | undefined => {
  switch (id) {
    case "1": return priorityId.P5_Interna;
    case "2": return priorityId.P4_Baja;
    case "3": return priorityId.P3_Media;
    case "4": return priorityId.P2_Alta;
    case "5": return priorityId.P5_Interna;
    default: return undefined;
  }
};
