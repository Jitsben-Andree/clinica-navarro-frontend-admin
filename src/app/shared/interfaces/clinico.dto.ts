export interface AntecedenteDTO {
  id?: number;
  categoria: string;
  descripcion: string;
}

export interface FichaClinica {
  id?: number;
  pacienteId: number;
  pacienteNombreCompleto?: string;
  tipoSangre?: string;
  antecedentes: AntecedenteDTO[];
}