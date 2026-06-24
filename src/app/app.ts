import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from './core/services/toasts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html' // En tu proyecto esto se llama app.html
})
export class App {
  title = 'Admin - Clínica Navarro';
  // Inyectamos el servicio de Toasts de forma pública para que el HTML lo lea
  toastService = inject(ToastService);
}