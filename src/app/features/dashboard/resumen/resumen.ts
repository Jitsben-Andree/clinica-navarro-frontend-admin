import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnaliticaService } from '../../../core/services/analitica';
import { IngresoMensualDTO, TratamientoEstadisticaDTO } from '../../../shared/interfaces/analitica.dto';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen.html'
})
export class ResumenComponent implements OnInit {
  private analiticaService = inject(AnaliticaService);

  // Signals para almacenar los datos
  ingresos = signal<IngresoMensualDTO[]>([]);
  topTratamientos = signal<TratamientoEstadisticaDTO[]>([]);
  resumenCitas = signal<{[key: string]: number}>({ Realizadas: 0, Canceladas: 0, Pendientes: 0 });
  cargando = signal<boolean>(true);

  // Computados (Magia reactiva): Calculan el valor máximo para escalar los gráficos en la pantalla
  maxIngreso = computed(() => {
    const max = Math.max(...this.ingresos().map(i => i.total));
    // Si el maximo es 0, devolvemos 1 para evitar divisiones por cero en el CSS
    return max > 0 ? max : 1; 
  });

  maxTratamiento = computed(() => {
    const max = Math.max(...this.topTratamientos().map(t => t.cantidadAplicada));
    return max > 0 ? max : 1;
  });

  totalCitas = computed(() => {
    const citas = this.resumenCitas();
    return citas['Realizadas'] + citas['Canceladas'] + citas['Pendientes'];
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    let peticionesCompletadas = 0;

    const checkCarga = () => {
      peticionesCompletadas++;
      if (peticionesCompletadas === 3) this.cargando.set(false);
    };

    this.analiticaService.obtenerIngresosMensuales().subscribe(res => {
      this.ingresos.set(res);
      checkCarga();
    });

    this.analiticaService.obtenerTopTratamientos().subscribe(res => {
      this.topTratamientos.set(res);
      checkCarga();
    });

    this.analiticaService.obtenerResumenCitas().subscribe(res => {
      this.resumenCitas.set(res);
      checkCarga();
    });
  }

  // Funciones auxiliares para calcular porcentajes CSS
  calcularAlturaBarra(total: number): number {
    return (total / this.maxIngreso()) * 100;
  }

  calcularAnchoBarra(cantidad: number): number {
    return (cantidad / this.maxTratamiento()) * 100;
  }

  calcularPorcentajeCitas(cantidad: number): number {
    if (this.totalCitas() === 0) return 0;
    return Math.round((cantidad / this.totalCitas()) * 100);
  }
}