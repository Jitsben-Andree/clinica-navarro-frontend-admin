import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Receta } from '../../shared/interfaces/receta.dto';
import { environment } from '../../../environments/env';

@Injectable({
  providedIn: 'root'
})
export class RecetaService {
  private readonly http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}`
  private readonly apiUrl = `${this.API_URL}/recetas`;

  obtenerPorCita(citaId: number): Observable<Receta> {
    return this.http.get<Receta>(`${this.apiUrl}/cita/${citaId}`);
  }

  guardarReceta(receta: Receta): Observable<Receta> {
    return this.http.post<Receta>(this.apiUrl, receta);
  }

  // Petición especial: Le decimos a Angular que espere un Archivo (blob)
  descargarPdf(citaId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/cita/${citaId}/pdf`, {
      responseType: 'blob'
    });
  }
}