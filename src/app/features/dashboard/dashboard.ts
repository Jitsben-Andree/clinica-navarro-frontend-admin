import { Component, OnInit, inject, signal, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../core/services/inventario';
import { PacienteService } from '../../core/services/paciente';
import { Paciente } from '../../shared/interfaces/paciente.dto';
import { computed } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  
  // 2. INYECTAR LOS SERVICIOS REALES
  private inventarioService = inject(InventarioService);
  private pacienteService = inject(PacienteService);

  // Modernizamos el estado usando Signals de Angular 17+
  emailUsuario = signal<string>('Cargando...');
  rolUsuario = signal<string>('');
  
  // UX: Estados para el Buscador Omnipresente (Spotlight)
  mostrarBuscadorGlobal = signal<boolean>(false);
  terminoBusqueda = signal<string>('');

  // 3. NUEVOS SIGNALS PARA DATOS REALES
  notificacionesPendientes = signal<number>(0);
  todosLosPacientes = signal<Paciente[]>([]);

  // 4. COMPUTADO: Filtra los pacientes en tiempo real mientras escribes
  resultadosBusqueda = computed(() => {
    const termino = this.terminoBusqueda().toLowerCase().trim();
    if (termino.length < 3) return []; // Solo busca si hay más de 3 letras
    
    return this.todosLosPacientes().filter(p => 
      p.nombres.toLowerCase().includes(termino) || 
      p.apellidos.toLowerCase().includes(termino) || 
      p.dni.includes(termino)
    ).slice(0, 5); // Solo mostramos los 5 mejores resultados
  });

  fechaActual = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  @ViewChild('searchInput') searchInput!: ElementRef;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.emailUsuario.set(localStorage.getItem('user_email') || 'Usuario Administrativo');
      const rol = localStorage.getItem('user_role') || '';
      this.rolUsuario.set(rol);
      
      // 5. CARGAR ALERTAS Y PACIENTES AL INICIAR EL PANEL
      if (rol === 'ROLE_ADMIN' || rol === 'ROLE_RECEPCIONISTA') {
        this.cargarAlertasInventario();
        this.cargarPacientes();
      }
    }
  }

  // 6. MÉTODOS PARA CARGAR DATOS REALES
  cargarAlertasInventario() {
    this.inventarioService.listarTodos().subscribe(insumos => {
      // Cuenta cuántos insumos están en "BAJO" o "AGOTADO"
      const alertas = insumos.filter(i => i.estadoStock === 'BAJO' || i.estadoStock === 'AGOTADO').length;
      this.notificacionesPendientes.set(alertas);
    });
  }

  cargarPacientes() {
    this.pacienteService.listarTodos().subscribe(pacientes => {
      this.todosLosPacientes.set(pacientes);
    });
  }

  // MAGIA UX: Escuchamos el atajo de teclado Ctrl+K (o Cmd+K) en toda la aplicación
  @HostListener('window:keydown', ['$event'])
  manejarAtajosTeclado(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); // Evita que el navegador abra su propio buscador
      this.abrirBuscador();
    }
    if (event.key === 'Escape' && this.mostrarBuscadorGlobal()) {
      this.cerrarBuscador();
    }
  }

  abrirBuscador() {
    this.mostrarBuscadorGlobal.set(true);
    this.terminoBusqueda.set('');
    // Enfocamos el input automáticamente tras un pequeñísimo delay para que renderice
    setTimeout(() => {
      if (this.searchInput) this.searchInput.nativeElement.focus();
    }, 50);
  }

  cerrarBuscador() {
    this.mostrarBuscadorGlobal.set(false);
  }

  // 7. ACCIONES RÁPIDAS DEL BUSCADOR
  irAModuloRapido(ruta: string) {
    this.cerrarBuscador();
    this.router.navigate([ruta]);
  }

  cerrarSesion(): void {
    if (typeof window !== 'undefined') {
      const confirmar = window.confirm('¿Estás seguro de que deseas cerrar sesión en el sistema?');
      if (confirmar) {
        this.authService.cerrarSesion();
        this.router.navigate(['/login']);
      }
    }
  }

  getNombreRol(): string {
    switch (this.rolUsuario()) {
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