export interface EmpleadoRequest {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  rolNombre: string; 
  especialidadId?: number;
  cmpColegiatura?: string;
}

export interface EmpleadoResponse {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  estadoActivo: boolean;
  rolNombre: string;
  cmpColegiatura?: string;
  especialidadNombre?: string;
}