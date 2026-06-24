import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IngresoMensualDTO, TratamientoEstadisticaDTO } from '../../shared/interfaces/analitica.dto';
import { environment } from '../../../environments/env';

@Injectable({
  providedIn: 'root'
})
export class AnaliticaService {
  private readonly http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}`
  private readonly apiUrl = `${this.API_URL}/analitica`;

  obtenerIngresosMensuales(): Observable<IngresoMensualDTO[]> {
    return this.http.get<IngresoMensualDTO[]>(`${this.apiUrl}/ingresos-mensuales`);
  }

  obtenerTopTratamientos(): Observable<TratamientoEstadisticaDTO[]> {
    return this.http.get<TratamientoEstadisticaDTO[]>(`${this.apiUrl}/top-tratamientos`);
  }

  obtenerResumenCitas(): Observable<{[key: string]: number}> {
    return this.http.get<{[key: string]: number}>(`${this.apiUrl}/resumen-citas`);
  }
}