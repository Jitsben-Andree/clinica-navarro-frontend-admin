export interface DetalleOdontogramaDTO {
  numeroPieza: number;
  estadoDiagnostico: string; 
  observaciones?: string;
}

export interface OdontogramaResponse {
  id?: number;
  fichaClinicaId: number;
  fechaActualizacion?: string;
  detalles: DetalleOdontogramaDTO[];
}