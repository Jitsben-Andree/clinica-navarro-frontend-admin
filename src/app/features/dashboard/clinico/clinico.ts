import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { ClinicoService } from '../../../core/services/clinico';
import { PacienteService } from '../../../core/services/paciente';
import { FichaClinica, AntecedenteDTO } from '../../../shared/interfaces/clinico.dto';
import { Paciente } from '../../../shared/interfaces/paciente.dto';
import { OdontogramaService } from '../../../core/services/odontograma';
import { DetalleOdontogramaDTO } from '../../../shared/interfaces/odontograma.dto';
import { CitaService } from '../../../core/services/cita';
import { RecetaService } from '../../../core/services/receta';
import { ToastService } from '../../../core/services/toasts';
import { Cita } from '../../../shared/interfaces/cita.dto';
import { Receta } from '../../../shared/interfaces/receta.dto';

@Component({
  selector: 'app-clinico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clinico.html'
})
export class ClinicoComponent implements OnInit {
  private clinicoService = inject(ClinicoService);
  private pacienteService = inject(PacienteService);
  private fb = inject(FormBuilder);
  private odontogramaService = inject(OdontogramaService);
  private citaService = inject(CitaService);
  private recetaService = inject(RecetaService);
  private toastService = inject(ToastService); // Magia UX

  // Control de Pestañas
  tabActiva = signal<'historial' | 'odontograma' | 'recetas'>('historial');

  // Signals de la Sala de Espera (Nueva Épica)
  pacientesEnSala = signal<Cita[]>([]);
  cargandoSala = signal<boolean>(true);

  // Signals Historial Médico
  pacientes = signal<Paciente[]>([]);
  pacienteSeleccionado = signal<number | null>(null);
  cargando = signal<boolean>(false);
  fichaActual = signal<FichaClinica | null>(null);
  mensajeExito = signal<boolean>(false);

  // Signals Odontograma
  dientes = signal<DetalleOdontogramaDTO[]>(this.generarDientesVacios());
  cargandoOdontograma = signal<boolean>(false);
  mostrarModalDiente = signal<boolean>(false);
  dienteSeleccionado = signal<DetalleOdontogramaDTO | null>(null);
  mensajeExitoOdonto = signal<boolean>(false);

  // Signals Recetas
  citasPaciente = signal<Cita[]>([]);
  citaSeleccionadaParaReceta = signal<number | null>(null);
  recetaActual = signal<Receta | null>(null);
  cargandoReceta = signal<boolean>(false);
  mensajeExitoReceta = signal<boolean>(false);

  // Formulario Receta
  recetaForm = this.fb.group({
    indicaciones: ['', Validators.required]
  });

  // Formulario con FormArray para los antecedentes dinámicos
  fichaForm = this.fb.group({
    tipoSangre: [''],
    antecedentes: this.fb.array([])
  });

  ngOnInit(): void {
    // 1. Cargar el buscador global por si busca un historial pasado
    this.pacienteService.listarTodos().subscribe(data => this.pacientes.set(data));
    
    // 2. Cargar la "Sala de Espera Virtual" para hoy
    this.cargarSalaDeEspera();
  }

  // ================= LÓGICA DE SALA DE ESPERA (UX) =================

  cargarSalaDeEspera(): void {
    this.cargandoSala.set(true);
    this.citaService.listarTodas().subscribe({
      next: (citas: Cita[]) => {
        // Obtenemos la fecha de hoy sin problemas de zona horaria
        const hoy = new Date();
        hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
        const hoyStr = hoy.toISOString().split('T')[0];

        // Filtramos: Solo citas de HOY que la recepcionista marcó como "CONFIRMADA" (Check-in)
        const enSala = citas.filter(c => 
          c.fechaHora.startsWith(hoyStr) && c.estado === 'CONFIRMADA'
        );
        
        // Ordenamos por hora de atención
        enSala.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
        
        this.pacientesEnSala.set(enSala);
        this.cargandoSala.set(false);
      },
      error: () => this.cargandoSala.set(false)
    });
  }

  atenderPaciente(cita: Cita): void {
    this.pacienteSeleccionado.set(cita.pacienteId);
    this.tabActiva.set('historial'); // Llevamos al doctor a la pestaña principal
    this.cargarFicha(cita.pacienteId);
    this.toastService.mostrar('info', `Abriendo expediente médico de ${cita.pacienteNombreCompleto}`);
  }

  // ================= LÓGICA DE HISTORIAL =================

  get antecedentesFormArray() {
    return this.fichaForm.get('antecedentes') as FormArray;
  }

  agregarAntecedente(categoria: string = '', descripcion: string = ''): void {
    const antecedenteForm = this.fb.group({
      categoria: [categoria, Validators.required],
      descripcion: [descripcion, Validators.required]
    });
    this.antecedentesFormArray.push(antecedenteForm);
  }

  removerAntecedente(index: number): void {
    this.antecedentesFormArray.removeAt(index);
  }

  // Buscador manual (combobox)
  onPacienteChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const pId = Number(selectElement.value);
    
    if (pId) {
      this.pacienteSeleccionado.set(pId);
      this.cargarFicha(pId);
    }
  }

  volverASalaEspera(): void {
    this.pacienteSeleccionado.set(null);
    this.cargarSalaDeEspera(); // Refrescamos por si alguien nuevo llegó
  }

  cargarFicha(pacienteId: number): void {
    this.cargando.set(true);
    this.mensajeExito.set(false);
    
    this.clinicoService.obtenerFicha(pacienteId).subscribe({
      next: (ficha) => {
        this.fichaActual.set(ficha);
        
        this.fichaForm.patchValue({ tipoSangre: ficha.tipoSangre || '' });
        
        this.antecedentesFormArray.clear();
        if (ficha.antecedentes) {
          ficha.antecedentes.forEach(a => this.agregarAntecedente(a.categoria, a.descripcion));
        }
        
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.mostrar('error', 'Error al cargar el historial del paciente');
        this.cargando.set(false);
      }
    });
  }

  guardarFicha(): void {
    if (this.fichaForm.invalid || !this.pacienteSeleccionado()) {
      this.fichaForm.markAllAsTouched();
      return;
    }

    const formValue = this.fichaForm.value;
    const request: FichaClinica = {
      pacienteId: this.pacienteSeleccionado()!,
      tipoSangre: formValue.tipoSangre || '',
      antecedentes: formValue.antecedentes as AntecedenteDTO[]
    };

    this.cargando.set(true);
    this.clinicoService.guardarFicha(request).subscribe({
      next: (fichaGuardada) => {
        this.cargando.set(false);
        this.toastService.mostrar('exito', 'Historial médico guardado con éxito');
        this.fichaActual.set(fichaGuardada);
        this.cargarFicha(this.pacienteSeleccionado()!); 
      },
      error: () => {
        this.toastService.mostrar('error', 'Ocurrió un problema al guardar la ficha');
        this.cargando.set(false);
      }
    });
  }

  // ================= LÓGICA DEL ODONTOGRAMA =================

  cambiarTab(tab: 'historial' | 'odontograma' | 'recetas'): void {
    this.tabActiva.set(tab);
    const pId = this.pacienteSeleccionado();
    
    if (tab === 'odontograma' && pId) {
      this.cargarOdontograma();
    } else if (tab === 'recetas' && pId) {
      this.cargarCitasParaReceta(pId);
    }
  }

  generarDientesVacios(): DetalleOdontogramaDTO[] {
    const piezas = [
      18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28,
      48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38
    ];
    return piezas.map(p => ({ numeroPieza: p, estadoDiagnostico: 'Sano', observaciones: '' }));
  }

  cargarOdontograma(): void {
    const ficha = this.fichaActual();
    if (!ficha || !ficha.id) return; 

    this.cargandoOdontograma.set(true);
    this.odontogramaService.obtenerPorFicha(ficha.id).subscribe({
      next: (res) => {
        const base = this.generarDientesVacios();
        if (res.detalles && res.detalles.length > 0) {
          res.detalles.forEach(d => {
            const index = base.findIndex(b => b.numeroPieza === d.numeroPieza);
            if (index !== -1) base[index] = d;
          });
        }
        this.dientes.set(base);
        this.cargandoOdontograma.set(false);
      },
      error: () => {
        this.toastService.mostrar('error', 'No se pudo cargar el odontograma');
        this.cargandoOdontograma.set(false);
      }
    });
  }

  abrirModalDiente(diente: DetalleOdontogramaDTO): void {
    this.dienteSeleccionado.set({ ...diente });
    this.mostrarModalDiente.set(true);
  }

  cerrarModalDiente(): void {
    this.mostrarModalDiente.set(false);
    this.dienteSeleccionado.set(null);
  }

  actualizarDienteTemporal(estado: string, observaciones: string): void {
    const actual = this.dienteSeleccionado();
    if (actual) {
      actual.estadoDiagnostico = estado;
      actual.observaciones = observaciones;
      
      const lista = [...this.dientes()];
      const index = lista.findIndex(d => d.numeroPieza === actual.numeroPieza);
      if (index !== -1) lista[index] = actual;
      
      this.dientes.set(lista);
      this.cerrarModalDiente();
    }
  }

  guardarOdontograma(): void {
    const ficha = this.fichaActual();
    if (!ficha || !ficha.id) {
        this.toastService.mostrar('info', 'Debe guardar primero los datos básicos del Historial Médico para crear la Ficha en la BD.');
        return;
    }

    this.cargandoOdontograma.set(true);
    
    const dientesAfectados = this.dientes().filter(d => 
      d.estadoDiagnostico !== 'Sano' || (d.observaciones && d.observaciones.trim() !== '')
    );

    this.odontogramaService.guardarOdontograma(ficha.id, dientesAfectados).subscribe({
      next: () => {
        this.cargandoOdontograma.set(false);
        this.toastService.mostrar('exito', 'Odontograma guardado y actualizado con éxito');
      },
      error: () => {
        this.toastService.mostrar('error', 'Ocurrió un error guardando las piezas dentales');
        this.cargandoOdontograma.set(false);
      }
    });
  }

  getColorDiente(estado: string): string {
    switch(estado) {
      case 'Caries': return 'bg-red-500 text-white border-red-700 shadow-red-200';
      case 'Curación': return 'bg-blue-500 text-white border-blue-700 shadow-blue-200';
      case 'Ausente': return 'bg-gray-800 text-gray-300 border-gray-900 opacity-80';
      case 'Extracción Indicada': return 'bg-orange-500 text-white border-orange-700 shadow-orange-200';
      case 'Endodoncia': return 'bg-purple-500 text-white border-purple-700 shadow-purple-200';
      default: return 'bg-white text-gray-800 border-gray-300 hover:bg-blue-50 shadow-sm';
    }
  }

  // ================= LÓGICA DE RECETAS =================

  cargarCitasParaReceta(pacienteId: number): void {
    this.citaService.listarPorPaciente(pacienteId).subscribe((data: Cita[]) => {
      this.citasPaciente.set(data);
      this.citaSeleccionadaParaReceta.set(null);
      this.recetaForm.reset();
      this.recetaActual.set(null);
    });
  }

  onCitaRecetaChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const citaId = Number(select.value);
    if (citaId) {
      this.citaSeleccionadaParaReceta.set(citaId);
      this.cargarReceta(citaId);
    }
  }

  cargarReceta(citaId: number): void {
    this.cargandoReceta.set(true);
    this.recetaService.obtenerPorCita(citaId).subscribe({
      next: (res) => {
        this.recetaActual.set(res.id ? res : null);
        this.recetaForm.patchValue({ indicaciones: res.indicacionesFarmacologicas || '' });
        this.cargandoReceta.set(false);
      },
      error: () => this.cargandoReceta.set(false)
    });
  }

  guardarReceta(): void {
    if (this.recetaForm.invalid || !this.citaSeleccionadaParaReceta()) return;
    
    this.cargandoReceta.set(true);
    const request: Receta = {
      citaId: this.citaSeleccionadaParaReceta()!,
      indicacionesFarmacologicas: this.recetaForm.value.indicaciones || ''
    };

    this.recetaService.guardarReceta(request).subscribe({
      next: (res) => {
        this.recetaActual.set(res);
        this.cargandoReceta.set(false);
        this.toastService.mostrar('exito', 'Receta médica guardada y lista para imprimir');
      },
      error: () => {
        this.toastService.mostrar('error', 'Error al guardar la receta');
        this.cargandoReceta.set(false);
      }
    });
  }

  descargarPdfReceta(): void {
    const citaId = this.citaSeleccionadaParaReceta();
    if (!citaId) return;
    
    this.recetaService.descargarPdf(citaId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank'); 
    });
  }
}