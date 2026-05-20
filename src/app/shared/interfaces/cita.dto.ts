export interface Cita {
  id?: number;
  pacienteId: number;
  pacienteNombreCompleto?: string;
  odontologoId: number;
  odontologoNombreCompleto?: string;
  fechaHora: string; // Formato ISO "YYYY-MM-DDTHH:mm"
  motivo: string;
  estado?: string;
}