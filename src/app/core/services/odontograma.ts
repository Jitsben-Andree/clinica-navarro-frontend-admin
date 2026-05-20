import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OdontogramaResponse, DetalleOdontogramaDTO } from '../../shared/interfaces/odontograma.dto';

@Injectable({
  providedIn: 'root'
})
export class OdontogramaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/odontogramas';

  obtenerPorFicha(fichaId: number): Observable<OdontogramaResponse> {
    return this.http.get<OdontogramaResponse>(`${this.apiUrl}/ficha/${fichaId}`);
  }

  guardarOdontograma(fichaId: number, detalles: DetalleOdontogramaDTO[]): Observable<OdontogramaResponse> {
    return this.http.post<OdontogramaResponse>(`${this.apiUrl}/ficha/${fichaId}`, detalles);
  }
}