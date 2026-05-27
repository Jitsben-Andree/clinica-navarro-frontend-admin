export interface InsumoRequest {
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  fechaCaducidad?: string | null;
}

export interface InsumoResponse {
  id: number;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  fechaCaducidad?: string;
  estadoStock: string; // 'NORMAL', 'BAJO', 'AGOTADO'
}