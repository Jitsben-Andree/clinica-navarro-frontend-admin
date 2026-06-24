import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CitaService } from '../../../core/services/cita';
import { PacienteService } from '../../../core/services/paciente';
import { FacturacionService } from '../../../core/services/facturacion';
import { Cita } from '../../../shared/interfaces/cita.dto';

interface MetricCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  tooltip?: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styles: [`
    .metric-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
    }
    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    .metric-card:active {
      transform: scale(0.98);
    }
    .skeleton-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .status-badge {
      transition: all 0.2s ease;
    }
    .status-badge:hover {
      transform: scale(1.05);
    }
    .glass-effect {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.8);
    }
    .progress-bar {
      transition: width 1s ease-in-out;
    }
    .fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .pulse-dot {
      animation: pulseDot 2s ease-in-out infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
  `]
})
export class InicioComponent implements OnInit {
  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private facturacionService = inject(FacturacionService);

  // Signals principales
  citasHoy = signal<Cita[]>([]);
  totalPacientes = signal<number>(0);
  ingresosHoy = signal<number>(0);
  cargando = signal<boolean>(true);
  cargandoPacientes = signal<boolean>(true);
  cargandoIngresos = signal<boolean>(true);
  filtroEstado = signal<string>('TODAS');
  ultimaActualizacion = signal<Date>(new Date());
  vistaActiva = signal<'dia' | 'semana'>('dia');

  // Computed para estadísticas avanzadas
  citasFiltradas = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'TODAS') return this.citasHoy();
    return this.citasHoy().filter(c => c.estado === filtro);
  });

  // Estadísticas calculadas
  estadisticas = computed(() => {
    const citas = this.citasHoy();
    const total = citas.length;
    const pendientes = citas.filter(c => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA').length;
    const realizadas = citas.filter(c => c.estado === 'REALIZADA').length;
    const canceladas = citas.filter(c => c.estado === 'CANCELADA').length;
    const tasaOcupacion = total > 0 ? ((pendientes + realizadas) / total) * 100 : 0;
    const tasaEfectividad = total > 0 ? (realizadas / total) * 100 : 0;

    return {
      total,
      pendientes,
      realizadas,
      canceladas,
      tasaOcupacion,
      tasaEfectividad
    };
  });

  // Métricas para las tarjetas KPI
  metricas = computed<MetricCard[]>(() => {
    const stats = this.estadisticas();
    const hoy = new Date();
    const horaActual = hoy.getHours();
    
    return [
      {
        title: 'Citas de Hoy',
        value: stats.total,
        icon: '📅',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        subtitle: `${stats.pendientes} pendientes · ${stats.realizadas} realizadas`,
        tooltip: 'Total de citas programadas para hoy'
      },
      {
        title: 'Por Atender',
        value: stats.pendientes,
        icon: '⏳',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        subtitle: stats.pendientes > 0 ? `${stats.pendientes} pacientes esperando` : 'Sin pacientes en espera',
        tooltip: 'Citas pendientes o confirmadas por realizar'
      },
      {
        title: 'Tasa de Ocupación',
        value: `${Math.round(stats.tasaOcupacion)}%`,
        icon: '📊',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        subtitle: stats.total > 0 ? `${stats.realizadas} de ${stats.total} atendidas` : 'Sin datos',
        tooltip: 'Porcentaje de citas ocupadas del total disponible'
      },
      {
        title: 'Ingresos del Día',
        value: `S/. ${this.ingresosHoy().toFixed(2)}`,
        icon: '💰',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        subtitle: this.ingresosHoy() > 0 ? `Promedio: S/. ${(this.ingresosHoy() / (stats.realizadas || 1)).toFixed(2)} por atención` : 'Sin ingresos registrados',
        tooltip: 'Total de ingresos generados hoy'
      }
    ];
  });

  // Efecto para actualizar el título de la página
  effect = effect(() => {
    const stats = this.estadisticas();
    document.title = `Dashboard - ${stats.total} citas hoy`;
  });

  ngOnInit(): void {
    this.cargarDashboard();
    // Auto-refresh cada 5 minutos
    setInterval(() => this.cargarDashboard(), 300000);
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.cargandoPacientes.set(true);
    this.cargandoIngresos.set(true);
    
    const hoy = new Date().toISOString().split('T')[0];

    // Cargar pacientes
    this.pacienteService.listarTodos().subscribe({
      next: (pacientes) => {
        this.totalPacientes.set(pacientes.length);
        this.cargandoPacientes.set(false);
      },
      error: () => this.cargandoPacientes.set(false)
    });

    // Cargar ingresos
    this.facturacionService.obtenerIngresosHoy().subscribe({
      next: (monto) => {
        this.ingresosHoy.set(monto);
        this.cargandoIngresos.set(false);
      },
      error: () => this.cargandoIngresos.set(false)
    });

    // Cargar citas
    this.citaService.listarTodas().subscribe({
      next: (citas) => {
        const filtradas = citas.filter(c => c.fechaHora.startsWith(hoy));
        filtradas.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
        this.citasHoy.set(filtradas);
        this.cargando.set(false);
        this.ultimaActualizacion.set(new Date());
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  // Métodos de utilidad
  getCitasPendientes(): number {
    return this.citasHoy().filter(c => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA').length;
  }

  getCitasRealizadas(): number {
    return this.citasHoy().filter(c => c.estado === 'REALIZADA').length;
  }

  getColorEstado(estado?: string): string {
    const colores = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'CONFIRMADA': 'bg-blue-100 text-blue-800 border-blue-200',
      'REALIZADA': 'bg-green-100 text-green-800 border-green-200',
      'CANCELADA': 'bg-red-100 text-red-800 border-red-200'
    };
    return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getIconoEstado(estado?: string): string {
    const iconos = {
      'PENDIENTE': '⏳',
      'CONFIRMADA': '✅',
      'REALIZADA': '✔️',
      'CANCELADA': '❌'
    };
    return iconos[estado as keyof typeof iconos] || '📌';
  }

  getTiempoActualizacion(): string {
    const diff = Math.floor((Date.now() - this.ultimaActualizacion().getTime()) / 1000);
    if (diff < 60) return `Hace ${diff} segundos`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`;
    return `Hace ${Math.floor(diff / 3600)} horas`;
  }

  formatearHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-PE', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  cambiarFiltro(estado: string): void {
    this.filtroEstado.set(estado);
  }

  cambiarVista(vista: 'dia' | 'semana'): void {
    this.vistaActiva.set(vista);
  }

  // Para los gráficos simples (progreso del día)
  getProgresoDelDia(): number {
    const ahora = new Date();
    const inicio = new Date(ahora);
    inicio.setHours(6, 0, 0, 0); // 6 AM
    const fin = new Date(ahora);
    fin.setHours(22, 0, 0, 0); // 10 PM
    
    const total = fin.getTime() - inicio.getTime();
    const actual = ahora.getTime() - inicio.getTime();
    
    return Math.min(Math.max((actual / total) * 100, 0), 100);
  }

  getSaludoPersonalizado(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getFechaFormateada(): string {
    return new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Para el resumen ejecutivo
  getResumenEjecutivo(): { texto: string, color: string, icono: string } {
    const stats = this.estadisticas();
    const total = stats.total;
    const pendientes = stats.pendientes;
    const realizadas = stats.realizadas;
    const canceladas = stats.canceladas;

    if (total === 0) {
      return {
        texto: 'Hoy no hay citas programadas',
        color: 'text-gray-600',
        icono: '📌'
      };
    }

    if (pendientes > 0 && realizadas === 0 && canceladas === 0) {
      return {
        texto: `Todas las citas (${total}) están pendientes por atender`,
        color: 'text-yellow-600',
        icono: '⏳'
      };
    }

    if (realizadas === total && total > 0) {
      return {
        texto: `¡Excelente! Todas las citas (${total}) han sido atendidas`,
        color: 'text-green-600',
        icono: '🎉'
      };
    }

    if (canceladas > total * 0.3) {
      return {
        texto: `Alerta: ${canceladas} citas canceladas (${Math.round((canceladas/total)*100)}% del total)`,
        color: 'text-red-600',
        icono: '⚠️'
      };
    }

    return {
      texto: `${realizadas} citas atendidas, ${pendientes} pendientes, ${canceladas} canceladas`,
      color: 'text-blue-600',
      icono: '📋'
    };
  }

  // Para estadísticas de atención
  getEstadisticasAtencion() {
    const stats = this.estadisticas();
    return {
      productividad: stats.total > 0 ? Math.round((stats.realizadas / stats.total) * 100) : 0,
      tasaExito: stats.realizadas + stats.canceladas > 0 
        ? Math.round((stats.realizadas / (stats.realizadas + stats.canceladas)) * 100) 
        : 0,
      porcPendientes: stats.total > 0 ? Math.round((stats.pendientes / stats.total) * 100) : 0,
      porcCanceladas: stats.total > 0 ? Math.round((stats.canceladas / stats.total) * 100) : 0
    };
  }
}