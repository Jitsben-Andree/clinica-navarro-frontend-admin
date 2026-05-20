import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Receta } from '../../shared/interfaces/receta.dto';

@Injectable({
  providedIn: 'root'
})
export class RecetaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/recetas';

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