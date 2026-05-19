import { Routes } from '@angular/router';
import { AuthComponent } from './features/auth/auth';
import { DashboardComponent } from './features/dashboard/dashboard';
import { authGuard } from './core/guards/auth-guard';
import { Component } from '@angular/core';
import { PacientesComponent } from './features/dashboard/pacientes/pacientes';
import { CatalogoComponent } from './features/dashboard/catalogo/catalogo';

// 1. Creamos un componente "Inicio" rápido
@Component({
  standalone: true,
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
      <h2 class="text-3xl font-extrabold text-blue-900 mb-4">¡Bienvenido al Sistema!</h2>
      <p class="text-gray-500 text-lg">Selecciona una opción en el menú lateral izquierdo para comenzar a gestionar la clínica.</p>
    </div>
  `
})
export class DashboardHomeComponent {}

// 2. Definimos las rutas
export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'pacientes', component: PacientesComponent },
      { path: 'catalogo', component: CatalogoComponent }
    ]
  } 
];