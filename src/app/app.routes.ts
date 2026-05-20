import { Routes } from '@angular/router';
import { AuthComponent } from './features/auth/auth';
import { DashboardComponent } from './features/dashboard/dashboard';
import { authGuard } from './core/guards/auth-guard';

// Importamos todas nuestras pantallas construidas
import { InicioComponent } from './features/dashboard/inicio/inicio';
import { PacientesComponent } from './features/dashboard/pacientes/pacientes';
import { CatalogoComponent } from './features/dashboard/catalogo/catalogo';
import { CitasComponent } from './features/dashboard/citas/citas';
import { ClinicoComponent } from './features/dashboard/clinico/clinico';
import { FacturacionComponent } from './features/dashboard/facturacion/facturacion';
import { ResumenComponent } from './features/dashboard/resumen/resumen';

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard],
    children: [
      // Al entrar a /dashboard carga este resumen
      { path: '', component: InicioComponent }, 
      
      // Módulos del sistema
      { path: 'pacientes', component: PacientesComponent },
      { path: 'catalogo', component: CatalogoComponent },
      { path: 'citas', component: CitasComponent },
      { path: 'clinico', component: ClinicoComponent },
      { path: 'facturacion', component: FacturacionComponent },
      { path: 'resumen', component: ResumenComponent },
    ]
  } 
];