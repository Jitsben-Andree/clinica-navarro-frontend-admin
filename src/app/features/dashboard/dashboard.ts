import { Component, inject } from '@angular/core';
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

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/auth']);
  }
}