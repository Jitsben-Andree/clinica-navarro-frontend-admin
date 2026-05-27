import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TratamientoRequest,
  TratamientoResponse,
  PagoRequest,
  PagoResponse,
} from '../../shared/interfaces/facturacion.dto';

@Injectable({
  providedIn: 'root',
})
export class FacturacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://217.216.94.194:8080/api/facturacion';

  // --- TRATAMIENTOS ---
  listarTratamientos(citaId: number): Observable<TratamientoResponse[]> {
    return this.http.get<TratamientoResponse[]>(`${this.apiUrl}/cita/${citaId}/tratamientos`);
  }

  agregarTratamiento(citaId: number, request: TratamientoRequest): Observable<TratamientoResponse> {
    return this.http.post<TratamientoResponse>(
      `${this.apiUrl}/cita/${citaId}/tratamientos`,
      request,
    );
  }

  eliminarTratamiento(tratamientoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tratamientos/${tratamientoId}`);
  }

  // --- PAGOS ---
  obtenerPago(citaId: number): Observable<PagoResponse | null> {
    return this.http.get<PagoResponse | null>(`${this.apiUrl}/cita/${citaId}/pago`);
  }

  registrarPago(request: PagoRequest): Observable<PagoResponse> {
    return this.http.post<PagoResponse>(`${this.apiUrl}/pago`, request);
  }

  obtenerIngresosHoy(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/ingresos-hoy`);
  }
}
