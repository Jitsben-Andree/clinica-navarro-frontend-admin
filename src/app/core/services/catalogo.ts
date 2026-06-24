import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogoServicio } from '../../shared/interfaces/catalogo.dto';
import { environment } from '../../../environments/env';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}`
  private readonly apiUrl = `${this.API_URL}/catalogo`;

  listarTodos(): Observable<CatalogoServicio[]> {
    return this.http.get<CatalogoServicio[]>(this.apiUrl);
  }

  listarActivos(): Observable<CatalogoServicio[]> {
    return this.http.get<CatalogoServicio[]>(`${this.apiUrl}/activos`);
  }

  registrar(servicio: CatalogoServicio): Observable<CatalogoServicio> {
    return this.http.post<CatalogoServicio>(this.apiUrl, servicio);
  }

  actualizar(id: number, servicio: CatalogoServicio): Observable<CatalogoServicio> {
    return this.http.put<CatalogoServicio>(`${this.apiUrl}/${id}`, servicio);
  }

  cambiarEstado(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/estado`, {});
  }
}