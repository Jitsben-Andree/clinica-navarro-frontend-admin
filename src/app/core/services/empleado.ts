import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmpleadoRequest, EmpleadoResponse } from '../../shared/interfaces/empleado.dto';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://217.216.94.194:8080/api/empleados';

  listarTodos(): Observable<EmpleadoResponse[]> {
    return this.http.get<EmpleadoResponse[]>(this.apiUrl);
  }

  listarOdontologos(): Observable<EmpleadoResponse[]> {
    return this.http.get<EmpleadoResponse[]>(`${this.apiUrl}/odontologos`);
  }

  registrar(empleado: EmpleadoRequest): Observable<EmpleadoResponse> {
    return this.http.post<EmpleadoResponse>(this.apiUrl, empleado);
  }

  cambiarEstado(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/estado`, {});
  }
}