import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FichaClinica } from '../../shared/interfaces/clinico.dto';
import { environment } from '../../../environments/env';

@Injectable({
  providedIn: 'root'
})
export class ClinicoService {
  private readonly http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}`
  private readonly apiUrl = `${this.API_URL}/fichas`;

  obtenerFicha(pacienteId: number): Observable<FichaClinica> {
    return this.http.get<FichaClinica>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  guardarFicha(ficha: FichaClinica): Observable<FichaClinica> {
    return this.http.post<FichaClinica>(this.apiUrl, ficha);
  }
}