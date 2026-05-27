import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitaService } from '../../../core/services/cita';
import { PacienteService } from '../../../core/services/paciente';
import { EmpleadoService } from '../../../core/services/empleado';
import { Cita } from '../../../shared/interfaces/cita.dto';
import { Paciente } from '../../../shared/interfaces/paciente.dto';
import { EmpleadoResponse } from '../../../shared/interfaces/empleado.dto';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './citas.html'
})
export class CitasComponent implements OnInit {
  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private fb = inject(FormBuilder);

  // Signals para el estado
  citas = signal<Cita[]>([]);
  pacientes = signal<Paciente[]>([]);
  odontologos = signal<EmpleadoResponse[]>([]); // Doctores 100% reales desde la BD
  cargando = signal<boolean>(false);
  mostrarModal = signal<boolean>(false);

  // Formulario Reactivo
  citaForm = this.fb.nonNullable.group({
    pacienteId: [0, [Validators.required, Validators.min(1)]],
    odontologoId: [0, [Validators.required, Validators.min(1)]],
    fechaHora: ['', Validators.required],
    motivo: ['', Validators.required]
  });

  ngOnInit(): void {
    this.cargarCitas();
    this.cargarPacientes();
    this.cargarOdontologos();
  }

  cargarCitas(): void {
    this.cargando.set(true);
    this.citaService.listarTodas().subscribe({
      next: (data) => {
        // Ordenamos las citas de la más reciente a la más antigua
        const ordenadas = data.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
        this.citas.set(ordenadas);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar citas', err);
        this.cargando.set(false);
      }
    });
  }

  cargarPacientes(): void {
    this.pacienteService.listarTodos().subscribe({
      next: (data) => this.pacientes.set(data.filter(p => p.estadoActivo)) // Solo mostramos pacientes activos
    });
  }

  cargarOdontologos(): void {
    // Solo trae a los usuarios que tengan el rol 'ROLE_ODONTOLOGO' y estén activos
    this.empleadoService.listarOdontologos().subscribe({
      next: (data) => this.odontologos.set(data)
    });
  }

  abrirModal(): void {
    this.citaForm.reset({ pacienteId: 0, odontologoId: 0 });
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  guardarCita(): void {
    if (this.citaForm.invalid) {
      this.citaForm.markAllAsTouched();
      return;
    }

    const datos = this.citaForm.getRawValue();

    this.citaService.agendarCita(datos).subscribe({
      next: () => {
        this.cargarCitas();
        this.cerrarModal();
      },
      error: (err) => alert(err.error?.message || 'Error al agendar la cita. Verifique el choque de horarios.')
    });
  }

  cambiarEstado(cita: Cita, nuevoEstado: string): void {
    if (confirm(`¿Mover la cita a estado: ${nuevoEstado}?`)) {
      this.citaService.cambiarEstado(cita.id!, nuevoEstado).subscribe({
        next: () => this.cargarCitas(),
        error: (err) => console.error(err)
      });
    }
  }

  getColorEstado(estado?: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REALIZADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}