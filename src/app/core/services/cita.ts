import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cita } from '../../shared/interfaces/cita.dto';

@Injectable({
  providedIn: 'root'
})
export class CitaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://217.216.94.194:8080/api/citas';

  listarTodas(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.apiUrl);
  }

  agendarCita(cita: Cita): Observable<Cita> {
    return this.http.post<Cita>(this.apiUrl, cita);
  }
  
  listarPorPaciente(pacienteId: number): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  cambiarEstado(id: number, nuevoEstado: string): Observable<Cita> {
    return this.http.patch<Cita>(`${this.apiUrl}/${id}/estado`, { nuevoEstado });
  }
}