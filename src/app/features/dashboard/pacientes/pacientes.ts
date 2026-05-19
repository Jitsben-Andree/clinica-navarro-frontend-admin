import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PacienteService } from '../../../core/services/paciente';
import { Paciente } from '../../../shared/interfaces/paciente.dto';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pacientes.html'
})
export class PacientesComponent implements OnInit {
  private pacienteService = inject(PacienteService);
  private fb = inject(FormBuilder);

  // Signals para el estado de la UI
  pacientes = signal<Paciente[]>([]);
  cargando = signal<boolean>(false);
  mostrarModal = signal<boolean>(false);
  pacienteEnEdicion = signal<Paciente | null>(null);

  // Formulario Reactivo
  pacienteForm = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.pattern('^[0-9]{8,15}$')]],
    telefono: [''],
    fechaNacimiento: ['', Validators.required],
    direccion: [''],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.cargarPacientes();
  }

  cargarPacientes(): void {
    this.cargando.set(true);
    this.pacienteService.listarTodos().subscribe({
      next: (data) => {
        this.pacientes.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar pacientes', err);
        this.cargando.set(false);
      }
    });
  }

  abrirModal(paciente?: Paciente): void {
    this.pacienteForm.reset();
    if (paciente) {
      this.pacienteEnEdicion.set(paciente);
      this.pacienteForm.patchValue(paciente);
    } else {
      this.pacienteEnEdicion.set(null);
    }
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.pacienteEnEdicion.set(null);
  }

  guardarPaciente(): void {
    if (this.pacienteForm.invalid) {
      this.pacienteForm.markAllAsTouched();
      return;
    }

    const datos = this.pacienteForm.getRawValue();
    const pacienteActual = this.pacienteEnEdicion();

    if (pacienteActual && pacienteActual.id) {
      // Actualizar
      this.pacienteService.actualizar(pacienteActual.id, datos).subscribe({
        next: () => {
          this.cargarPacientes();
          this.cerrarModal();
        },
        error: (err) => alert(err.error?.message || 'Error al actualizar')
      });
    } else {
      // Crear Nuevo
      this.pacienteService.registrar(datos).subscribe({
        next: () => {
          this.cargarPacientes();
          this.cerrarModal();
        },
        error: (err) => alert(err.error?.message || 'Error al registrar')
      });
    }
  }

  cambiarEstado(paciente: Paciente): void {
    if (confirm(`¿Estás seguro de ${paciente.estadoActivo ? 'desactivar' : 'activar'} a este paciente?`)) {
      this.pacienteService.cambiarEstado(paciente.id!).subscribe({
        next: () => this.cargarPacientes(),
        error: (err) => console.error(err)
      });
    }
  }
}