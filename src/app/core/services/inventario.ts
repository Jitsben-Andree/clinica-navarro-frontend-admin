import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InsumoRequest, InsumoResponse } from '../../shared/interfaces/inventario.dto';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://217.216.94.194:8080/api/inventario';

  listarTodos(): Observable<InsumoResponse[]> {
    return this.http.get<InsumoResponse[]>(this.apiUrl);
  }

  registrar(insumo: InsumoRequest): Observable<InsumoResponse> {
    return this.http.post<InsumoResponse>(this.apiUrl, insumo);
  }

  // Permite sumar (positivos) o restar (negativos) al stock actual
  actualizarStock(id: number, cantidad: number): Observable<InsumoResponse> {
    return this.http.patch<InsumoResponse>(`${this.apiUrl}/${id}/stock?cantidad=${cantidad}`, {});
  }
}