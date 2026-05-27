import { Component, OnInit, inject } from '@angular/core';
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
export class DashboardComponent implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);

  emailUsuario = 'Cargando...';
  rolUsuario = '';

  fechaActual = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  ngOnInit(): void {

    if (typeof window !== 'undefined') {

      this.emailUsuario =
        localStorage.getItem('user_email')
        || 'Usuario Administrativo';

      this.rolUsuario =
        localStorage.getItem('user_role')
        || '';
    }
  }

  cerrarSesion(): void {

    if (typeof window !== 'undefined') {

      const confirmar = window.confirm(
        '¿Estás seguro de que deseas cerrar sesión en el sistema?'
      );

      if (confirmar) {

        this.authService.cerrarSesion();

        this.router.navigate(['/login']);
      }
    }
  }

  getNombreRol(): string {

    switch (this.rolUsuario) {

      case 'ROLE_ADMIN':
        return 'Administrador General';

      case 'ROLE_RECEPCIONISTA':
        return 'Recepción y Caja';

      case 'ROLE_ODONTOLOGO':
        return 'Especialista Médico';

      default:
        return 'Personal Clínico';
    }
  }
}