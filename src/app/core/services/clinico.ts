import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FichaClinica } from '../../shared/interfaces/clinico.dto';

@Injectable({
  providedIn: 'root'
})
export class ClinicoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://217.216.94.194:8080/api/fichas';

  obtenerFicha(pacienteId: number): Observable<FichaClinica> {
    return this.http.get<FichaClinica>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  guardarFicha(ficha: FichaClinica): Observable<FichaClinica> {
    return this.http.post<FichaClinica>(this.apiUrl, ficha);
  }
}