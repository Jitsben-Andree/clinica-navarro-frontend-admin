import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoService } from '../../../core/services/catalogo';
import { CatalogoServicio } from '../../../shared/interfaces/catalogo.dto';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogo.html'
})
export class CatalogoComponent implements OnInit {
  private catalogoService = inject(CatalogoService);
  private fb = inject(FormBuilder);

  // Signals para el estado
  servicios = signal<CatalogoServicio[]>([]);
  cargando = signal<boolean>(false);
  mostrarModal = signal<boolean>(false);
  servicioEnEdicion = signal<CatalogoServicio | null>(null);

  // Formulario Reactivo
  catalogoForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    precioBase: [0, [Validators.required, Validators.min(0.1)]] // Mayor a 0
  });

  ngOnInit(): void {
    this.cargarServicios();
  }

  cargarServicios(): void {
    this.cargando.set(true);
    this.catalogoService.listarTodos().subscribe({
      next: (data) => {
        this.servicios.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar catálogo', err);
        this.cargando.set(false);
      }
    });
  }

  abrirModal(servicio?: CatalogoServicio): void {
    this.catalogoForm.reset({ precioBase: 0 }); // Valor por defecto
    if (servicio) {
      this.servicioEnEdicion.set(servicio);
      this.catalogoForm.patchValue(servicio);
    } else {
      this.servicioEnEdicion.set(null);
    }
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.servicioEnEdicion.set(null);
  }

  guardarServicio(): void {
    if (this.catalogoForm.invalid) {
      this.catalogoForm.markAllAsTouched();
      return;
    }

    const datos = this.catalogoForm.getRawValue();
    const servicioActual = this.servicioEnEdicion();

    if (servicioActual && servicioActual.id) {
      // Editar
      this.catalogoService.actualizar(servicioActual.id, datos).subscribe({
        next: () => {
          this.cargarServicios();
          this.cerrarModal();
        },
        error: (err) => alert(err.error?.message || 'Error al actualizar')
      });
    } else {
      // Crear Nuevo
      this.catalogoService.registrar(datos).subscribe({
        next: () => {
          this.cargarServicios();
          this.cerrarModal();
        },
        error: (err) => alert(err.error?.message || 'Error al registrar')
      });
    }
  }

  cambiarEstado(servicio: CatalogoServicio): void {
    if (confirm(`¿Estás seguro de ${servicio.activo ? 'desactivar' : 'activar'} el servicio "${servicio.nombre}"?`)) {
      this.catalogoService.cambiarEstado(servicio.id!).subscribe({
        next: () => this.cargarServicios(),
        error: (err) => console.error(err)
      });
    }
  }
}