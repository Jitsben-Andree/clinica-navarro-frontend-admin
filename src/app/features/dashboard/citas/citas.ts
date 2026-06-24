import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitaService } from '../../../core/services/cita';
import { PacienteService } from '../../../core/services/paciente';
import { EmpleadoService } from '../../../core/services/empleado';
import { ToastService } from '../../../core/services/toasts';
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
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  // Signals para el estado general
  citas = signal<Cita[]>([]);
  pacientes = signal<Paciente[]>([]);
  odontologos = signal<EmpleadoResponse[]>([]); // Doctores reales de la BD
  cargando = signal<boolean>(false);
  mostrarModal = signal<boolean>(false);

  // NUEVOS SIGNALS: Control de UX (Loaders y Formularios Rápidos)
  creandoPacienteRapido = signal<boolean>(false);
  guardandoPaciente = signal<boolean>(false);
  guardandoCita = signal<boolean>(false);

  // Formulario Reactivo Principal (Cita)
  citaForm = this.fb.nonNullable.group({
    pacienteId: [0, [Validators.required, Validators.min(1)]],
    odontologoId: [0, [Validators.required, Validators.min(1)]],
    fechaHora: ['', Validators.required],
    motivo: ['', Validators.required]
  });

  // Formulario Reactivo Rápido (Paciente Express)
  pacienteRapidoForm = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.pattern('^[0-9]{8,15}$')]],
    telefono: [''],
    email: ['', [Validators.required, Validators.email]]
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
      next: (data) => this.pacientes.set(data.filter(p => p.estadoActivo)) 
    });
  }

  cargarOdontologos(): void {
    this.empleadoService.listarOdontologos().subscribe({
      next: (data) => this.odontologos.set(data)
    });
  }

  abrirModal(): void {
    this.citaForm.reset({ pacienteId: 0, odontologoId: 0 });
    this.creandoPacienteRapido.set(false); 
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

    this.guardandoCita.set(true);
    const datos = this.citaForm.getRawValue();

    this.citaService.agendarCita(datos).subscribe({
      next: () => {
        this.cargarCitas();
        this.cerrarModal();
        this.guardandoCita.set(false);
        this.toastService.mostrar('exito', 'Cita médica agendada correctamente.');
      },
      error: (err) => {
        this.guardandoCita.set(false);
        this.toastService.mostrar('error', err.error?.message || 'Error al agendar la cita. Verifique el choque de horarios.');
      }
    });
  }

  // ==========================================
  // MAGIA UX 1: REGISTRO FAST-TRACK DE PACIENTE
  // ==========================================
  toggleCreacionRapida(): void {
    this.creandoPacienteRapido.update(v => !v);
    this.pacienteRapidoForm.reset();
  }

  guardarPacienteRapido(): void {
    if (this.pacienteRapidoForm.invalid) {
      this.pacienteRapidoForm.markAllAsTouched();
      return;
    }
    
    this.guardandoPaciente.set(true);
    const formValues = this.pacienteRapidoForm.getRawValue();

    // CORRECCIÓN: Le agregamos los datos obligatorios faltantes por defecto 
    // para cumplir con la interfaz Paciente de TypeScript.
    const nuevoPaciente: Paciente = {
      ...formValues,
      fechaNacimiento: '1900-01-01', // Valor temporal
      direccion: 'Por actualizar'    // Valor temporal
    };

    this.pacienteService.registrar(nuevoPaciente).subscribe({
      next: (pacienteBD) => {
        this.cargarPacientes(); // Refrescamos la lista oculta
        this.citaForm.patchValue({ pacienteId: pacienteBD.id }); // ¡Lo autoseleccionamos en la cita!
        
        this.toastService.mostrar('exito', 'Paciente creado y seleccionado automáticamente.');
        
        this.guardandoPaciente.set(false);
        this.creandoPacienteRapido.set(false); // Volvemos a mostrar el formulario de la cita
      },
      error: (err) => {
        this.toastService.mostrar('error', err.error?.message || 'Error al registrar al paciente.');
        this.guardandoPaciente.set(false);
      }
    });
  }

  // ==========================================
  // MAGIA UX 2: CHECK-IN Y ESTADOS
  // ==========================================
  
  // Atajo de un solo clic para cuando el paciente entra por la puerta
  marcarLlegada(cita: Cita): void {
    this.citaService.cambiarEstado(cita.id!, 'CONFIRMADA').subscribe({
      next: () => {
         this.cargarCitas();
         this.toastService.mostrar('info', 'El paciente ha sido marcado en Sala de Espera.');
      },
      error: (err) => {
        this.toastService.mostrar('error', 'No se pudo actualizar el estado.');
      }
    });
  }

  // Cambio manual de estado (usando el select)
  cambiarEstado(cita: Cita, nuevoEstado: string): void {
    if (confirm(`¿Mover la cita a estado: ${nuevoEstado}?`)) {
      this.citaService.cambiarEstado(cita.id!, nuevoEstado).subscribe({
        next: () => {
           this.cargarCitas();
           this.toastService.mostrar('exito', `Cita movida a ${nuevoEstado}`);
        },
        error: (err) => this.toastService.mostrar('error', 'No se pudo actualizar el estado.')
      });
    }
  }

  getColorEstado(estado?: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REALIZADA': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELADA': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }
}