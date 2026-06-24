export interface Cita {
  id?: number;
  pacienteId: number;
  pacienteNombreCompleto?: string;
  odontologoId: number;
  odontologoNombreCompleto?: string;
  fechaHora: string; 
  motivo: string;
  estado?: string;
}