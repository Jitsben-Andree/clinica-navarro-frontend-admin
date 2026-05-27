import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmpleadoService } from '../../../core/services/empleado';
import { EmpleadoRequest, EmpleadoResponse } from '../../../shared/interfaces/empleado.dto';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.html'
})
export class UsuariosComponent implements OnInit {
  private empleadoService = inject(EmpleadoService);
  private fb = inject(FormBuilder);

  empleados = signal<EmpleadoResponse[]>([]);
  cargando = signal<boolean>(false);
  mostrarModal = signal<boolean>(false);

  // Formulario Reactivo
  empleadoForm = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.pattern('^[0-9]{8,15}$')]],
    telefono: [''],
    email: ['', [Validators.required, Validators.email]],
    rolNombre: ['ROLE_RECEPCIONISTA', Validators.required],
    especialidadId: [1], // 1=Odontologia General por defecto
    cmpColegiatura: ['']
  });

  ngOnInit(): void {
    this.cargarEmpleados();
    
    // Si cambian a "Recepcionista", borramos las validaciones del CMP. Si es Odontologo, las pedimos.
    this.empleadoForm.get('rolNombre')?.valueChanges.subscribe(rol => {
      const isOdontologo = rol === 'ROLE_ODONTOLOGO';
      const cmpCtrl = this.empleadoForm.get('cmpColegiatura');
      if (isOdontologo) {
        cmpCtrl?.setValidators([Validators.required]);
      } else {
        cmpCtrl?.clearValidators();
      }
      cmpCtrl?.updateValueAndValidity();
    });
  }

  cargarEmpleados(): void {
    this.cargando.set(true);
    this.empleadoService.listarTodos().subscribe({
      next: (data) => {
        this.empleados.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  abrirModal(): void {
    this.empleadoForm.reset({ rolNombre: 'ROLE_RECEPCIONISTA', especialidadId: 1 });
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  guardarEmpleado(): void {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    const datos: EmpleadoRequest = this.empleadoForm.getRawValue();

    this.empleadoService.registrar(datos).subscribe({
      next: () => {
        this.cargarEmpleados();
        this.cerrarModal();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar al empleado')
    });
  }

  cambiarEstado(emp: EmpleadoResponse): void {
    if (confirm(`¿Estás seguro de ${emp.estadoActivo ? 'desactivar' : 'activar'} a este empleado?`)) {
      this.empleadoService.cambiarEstado(emp.id).subscribe({
        next: () => this.cargarEmpleados(),
        error: (err) => console.error(err)
      });
    }
  }
}