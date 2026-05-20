import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FacturacionService } from '../../../core/services/facturacion';
import { PacienteService } from '../../../core/services/paciente';
import { CitaService } from '../../../core/services/cita';
import { CatalogoService } from '../../../core/services/catalogo';

import { Paciente } from '../../../shared/interfaces/paciente.dto';
import { Cita } from '../../../shared/interfaces/cita.dto';
import { CatalogoServicio } from '../../../shared/interfaces/catalogo.dto';
import { TratamientoResponse, PagoResponse } from '../../../shared/interfaces/facturacion.dto';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './facturacion.html'
})
export class FacturacionComponent implements OnInit {
  private facturacionService = inject(FacturacionService);
  private pacienteService = inject(PacienteService);
  private citaService = inject(CitaService);
  private catalogoService = inject(CatalogoService);
  private fb = inject(FormBuilder);

  // Estados visuales (Signals)
  pacientes = signal<Paciente[]>([]);
  citas = signal<Cita[]>([]);
  servicios = signal<CatalogoServicio[]>([]);
  
  pacienteSeleccionado = signal<number | null>(null);
  citaSeleccionada = signal<Cita | null>(null);
  
  tratamientos = signal<TratamientoResponse[]>([]);
  pagoActual = signal<PagoResponse | null>(null);
  
  cargando = signal<boolean>(false);

  // Computed: Calcula el total sumando los tratamientos en vivo
  totalAPagar = computed(() => {
    return this.tratamientos().reduce((suma, t) => suma + t.precioCobrado, 0);
  });

  // Formularios
  tratamientoForm = this.fb.group({
    servicioId: [0, [Validators.required, Validators.min(1)]],
    precioCobrado: [0, [Validators.required, Validators.min(0)]],
    observaciones: ['']
  });

  pagoForm = this.fb.group({
    metodoPago: ['', Validators.required],
    tipoComprobante: ['', Validators.required]
  });

  ngOnInit(): void {
    this.pacienteService.listarTodos().subscribe(p => this.pacientes.set(p));
    this.catalogoService.listarActivos().subscribe(s => this.servicios.set(s));
  }

  onPacienteChange(event: Event): void {
    const pId = Number((event.target as HTMLSelectElement).value);
    if (pId) {
      this.pacienteSeleccionado.set(pId);
      this.citaSeleccionada.set(null);
      this.tratamientos.set([]);
      this.pagoActual.set(null);
      
      this.citaService.listarPorPaciente(pId).subscribe(citas => {
        // Ordenamos las citas de la más reciente a la más antigua
        const ordenadas = citas.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
        this.citas.set(ordenadas);
      });
    }
  }

  onCitaChange(event: Event): void {
    const citaId = Number((event.target as HTMLSelectElement).value);
    if (citaId) {
      const cita = this.citas().find(c => c.id === citaId) || null;
      this.citaSeleccionada.set(cita);
      this.cargarDetallesFacturacion(citaId);
    }
  }

  // Cuando selecciona un servicio del combo, autocompletamos el precio base
  onServicioChange(event: Event): void {
    const servicioId = Number((event.target as HTMLSelectElement).value);
    const servicio = this.servicios().find(s => s.id === servicioId);
    if (servicio) {
      this.tratamientoForm.patchValue({ precioCobrado: servicio.precioBase });
    }
  }

  cargarDetallesFacturacion(citaId: number): void {
    this.cargando.set(true);
    
    // Cargamos tratamientos
    this.facturacionService.listarTratamientos(citaId).subscribe(t => this.tratamientos.set(t));
    
    // Cargamos si ya existe un pago
    this.facturacionService.obtenerPago(citaId).subscribe({
      next: (pago) => {
        this.pagoActual.set(pago);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  agregarTratamiento(): void {
    if (this.tratamientoForm.invalid || !this.citaSeleccionada()?.id) return;

    this.cargando.set(true);
    const formValue = this.tratamientoForm.value;
    const request = {
      servicioId: Number(formValue.servicioId),
      precioCobrado: Number(formValue.precioCobrado),
      observaciones: formValue.observaciones || ''
    };

    this.facturacionService.agregarTratamiento(this.citaSeleccionada()!.id!, request).subscribe({
      next: (nuevo) => {
        this.tratamientos.update(lista => [...lista, nuevo]);
        this.tratamientoForm.reset({ servicioId: 0, precioCobrado: 0 });
        this.cargando.set(false);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al agregar tratamiento');
        this.cargando.set(false);
      }
    });
  }

  eliminarTratamiento(id: number): void {
    if (!confirm('¿Seguro que desea quitar este tratamiento?')) return;
    
    this.cargando.set(true);
    this.facturacionService.eliminarTratamiento(id).subscribe({
      next: () => {
        this.tratamientos.update(lista => lista.filter(t => t.id !== id));
        this.cargando.set(false);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar');
        this.cargando.set(false);
      }
    });
  }

  procesarPago(): void {
    if (this.pagoForm.invalid || !this.citaSeleccionada()?.id || this.tratamientos().length === 0) {
      alert('Asegúrese de agregar tratamientos y completar el formulario de pago.');
      return;
    }

    if (!confirm(`¿Confirmar pago por S/. ${this.totalAPagar().toFixed(2)}?`)) return;

    this.cargando.set(true);
    const formValue = this.pagoForm.value;
    const request = {
      citaId: this.citaSeleccionada()!.id!,
      metodoPago: formValue.metodoPago!,
      tipoComprobante: formValue.tipoComprobante!
    };

    this.facturacionService.registrarPago(request).subscribe({
      next: (pago) => {
        this.pagoActual.set(pago);
        this.cargando.set(false);
        // Opcional: mostrar un ticket de éxito
      },
      error: (err) => {
        alert(err.error?.message || 'Error al procesar pago');
        this.cargando.set(false);
      }
    });
  }
}