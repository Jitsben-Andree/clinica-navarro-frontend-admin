import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Signal que almacenará la lista de notificaciones activas
  toasts = signal<Toast[]>([]);

  mostrar(tipo: 'exito' | 'error' | 'info', mensaje: string) {
    const id = Math.random().toString(36).substring(2, 9); // ID único
    
    // Agregamos el nuevo Toast a la lista
    this.toasts.update(actuales => [...actuales, { id, tipo, mensaje }]);

    // Desaparece automáticamente después de 4 segundos
    setTimeout(() => {
      this.remover(id);
    }, 4000);
  }

  remover(id: string) {
    // Filtramos para quitar el toast específico
    this.toasts.update(actuales => actuales.filter(t => t.id !== id));
  }
}