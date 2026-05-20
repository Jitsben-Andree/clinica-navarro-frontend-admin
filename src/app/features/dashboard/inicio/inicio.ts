import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CitaService } from '../../../core/services/cita';
import { PacienteService } from '../../../core/services/paciente';
import { FacturacionService } from '../../../core/services/facturacion'; // Inyectamos el servicio de cobros
import { Cita } from '../../../shared/interfaces/cita.dto';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html'
})
export class InicioComponent implements OnInit {
  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private facturacionService = inject(FacturacionService); // Instanciamos

  // Signals para las métricas
  citasHoy = signal<Cita[]>([]);
  totalPacientes = signal<number>(0);
  cargando = signal<boolean>(true);
  
  // Inicializamos en 0 en lugar de dejar un número quemado
  ingresosHoy = signal<number>(0); 

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    const hoy = new Date().toISOString().split('T')[0];

    // 1. Cargar el total de pacientes
    this.pacienteService.listarTodos().subscribe({
      next: (pacientes) => this.totalPacientes.set(pacientes.length)
    });

    // 2. Cargar ingresos reales del día desde la BD
    this.facturacionService.obtenerIngresosHoy().subscribe({
      next: (monto) => this.ingresosHoy.set(monto),
      error: (err) => console.error('Error al obtener ingresos:', err)
    });

    // 3. Cargar citas del día
    this.citaService.listarTodas().subscribe({
      next: (citas) => {
        const filtradas = citas.filter(c => c.fechaHora.startsWith(hoy));
        filtradas.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
        this.citasHoy.set(filtradas);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  getCitasPendientes(): number {
    return this.citasHoy().filter(c => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA').length;
  }

  getColorEstado(estado?: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMADA': return 'bg-blue-100 text-blue-800';
      case 'REALIZADA': return 'bg-green-100 text-green-800';
      case 'CANCELADA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}