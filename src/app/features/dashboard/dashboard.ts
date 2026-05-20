import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  emailUsuario = this.authService.obtenerToken() ? 'Administrador' : 'Usuario';
  fechaActual = new Date().toLocaleDateString('es-PE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  rolUsuario = localStorage.getItem('user_role') || ''; 
  
  cerrarSesion(): void {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.cerrarSesion();
      this.router.navigate(['/login']);
    }
  }
}