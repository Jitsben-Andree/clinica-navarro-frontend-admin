export interface Paciente {
  id?: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  fechaNacimiento: string;
  direccion: string;
  
  // Datos de usuario asociados
  email: string;
  estadoActivo?: boolean;
}