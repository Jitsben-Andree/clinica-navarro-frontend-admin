import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventarioService } from '../../../core/services/inventario';
import { InsumoResponse, InsumoRequest } from '../../../shared/interfaces/inventario.dto';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventario.html'
})
export class InventarioComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private fb = inject(FormBuilder);

  insumos = signal<InsumoResponse[]>([]);
  cargando = signal<boolean>(false);
  mostrarModal = signal<boolean>(false);

  // Computed para las métricas de arriba
  alertasStock = computed(() => this.insumos().filter(i => i.estadoStock === 'BAJO' || i.estadoStock === 'AGOTADO').length);
  totalInsumos = computed(() => this.insumos().length);

  inventarioForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    stockActual: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    unidadMedida: ['Unidades', Validators.required],
    fechaCaducidad: ['']
  });

  ngOnInit(): void {
    this.cargarInsumos();
  }

  cargarInsumos(): void {
    this.cargando.set(true);
    this.inventarioService.listarTodos().subscribe({
      next: (data) => {
        // Ordenamos para que los AGOTADOS y BAJOS salgan primero
        const ordenados = data.sort((a, b) => {
          const valorEstado = { 'AGOTADO': 1, 'BAJO': 2, 'NORMAL': 3 };
          return valorEstado[a.estadoStock as keyof typeof valorEstado] - valorEstado[b.estadoStock as keyof typeof valorEstado];
        });
        this.insumos.set(ordenados);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando inventario:', err);
        this.cargando.set(false);
      }
    });
  }

  abrirModal(): void {
    this.inventarioForm.reset({ stockActual: 0, stockMinimo: 0, unidadMedida: 'Unidades', fechaCaducidad: '' });
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  guardarInsumo(): void {
    if (this.inventarioForm.invalid) {
      this.inventarioForm.markAllAsTouched();
      return;
    }

    const formValue = this.inventarioForm.getRawValue();
    const nuevoInsumo: InsumoRequest = {
      ...formValue,
      fechaCaducidad: formValue.fechaCaducidad ? formValue.fechaCaducidad : null
    };

    this.inventarioService.registrar(nuevoInsumo).subscribe({
      next: () => {
        this.cargarInsumos();
        this.cerrarModal();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar insumo')
    });
  }

  // Modifica el stock (+ sumar, - restar)
  modificarStock(insumo: InsumoResponse, cantidad: number): void {
    // Evitamos que queden en negativo
    if (insumo.stockActual + cantidad < 0) {
      alert('El stock no puede ser menor a cero.');
      return;
    }

    this.inventarioService.actualizarStock(insumo.id, cantidad).subscribe({
      next: () => this.cargarInsumos(),
      error: (err) => alert(err.error?.message || 'Error al actualizar el stock')
    });
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'NORMAL': return 'bg-green-100 text-green-800 border-green-200';
      case 'BAJO': return 'bg-yellow-100 text-yellow-800 border-yellow-300 animate-pulse';
      case 'AGOTADO': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}