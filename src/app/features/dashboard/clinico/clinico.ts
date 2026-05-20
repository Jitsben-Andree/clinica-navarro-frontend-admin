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

  // Control de Pestañas
  tabActiva = signal<'historial' | 'odontograma' | 'recetas'>('historial');

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
    // Cargamos los pacientes para el buscador/combo
    this.pacienteService.listarTodos().subscribe(data => this.pacientes.set(data));
  }

  // Getter (Facilita el acceso al array dinámico)
  get antecedentesFormArray() {
    return this.fichaForm.get('antecedentes') as FormArray;
  }

  // Añade una nueva fila al formulario
  agregarAntecedente(categoria: string = '', descripcion: string = ''): void {
    const antecedenteForm = this.fb.group({
      categoria: [categoria, Validators.required],
      descripcion: [descripcion, Validators.required]
    });
    this.antecedentesFormArray.push(antecedenteForm);
  }

  // Quita una fila del formulario
  removerAntecedente(index: number): void {
    this.antecedentesFormArray.removeAt(index);
  }

  // Se dispara al seleccionar un paciente en el desplegable
  onPacienteChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const pId = Number(selectElement.value);
    
    if (pId) {
      this.pacienteSeleccionado.set(pId);
      this.cargarFicha(pId);
    }
  }

  cargarFicha(pacienteId: number): void {
    this.cargando.set(true);
    this.mensajeExito.set(false);
    
    this.clinicoService.obtenerFicha(pacienteId).subscribe({
      next: (ficha) => {
        this.fichaActual.set(ficha);
        
        // Poner el tipo de sangre en el input
        this.fichaForm.patchValue({ tipoSangre: ficha.tipoSangre || '' });
        
        // Limpiar el array y llenarlo con los datos de la BD
        this.antecedentesFormArray.clear();
        if (ficha.antecedentes) {
          ficha.antecedentes.forEach(a => this.agregarAntecedente(a.categoria, a.descripcion));
        }
        
        this.cargando.set(false);
      },
      error: () => {
        console.error('Error al cargar la ficha');
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
        this.mensajeExito.set(true);
        setTimeout(() => this.mensajeExito.set(false), 3000); // Ocultar mensaje en 3s
        // Aseguramos tener el ID de la ficha (vital para el odontograma)
        this.fichaActual.set(fichaGuardada);
        this.cargarFicha(this.pacienteSeleccionado()!); // Recargar datos frescos
      },
      error: (err) => {
        alert('Error al guardar la ficha');
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

  // ================= LÓGICA DE RECETAS =================

  cargarCitasParaReceta(pacienteId: number): void {
    this.citaService.listarPorPaciente(pacienteId).subscribe(data => {
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
        // Si tiene ID, es que ya existía en BD. Si no, es una vacía.
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
        this.mensajeExitoReceta.set(true);
        setTimeout(() => this.mensajeExitoReceta.set(false), 3000);
      },
      error: () => {
        alert('Error al guardar receta');
        this.cargandoReceta.set(false);
      }
    });
  }

  descargarPdfReceta(): void {
    const citaId = this.citaSeleccionadaParaReceta();
    if (!citaId) return;
    
    this.recetaService.descargarPdf(citaId).subscribe(blob => {
      // Creamos un objeto URL temporal en el navegador con los bytes del PDF
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank'); // Abrimos el PDF en una nueva pestaña
    });
  }

  generarDientesVacios(): DetalleOdontogramaDTO[] {
    // Array universal de piezas dentales de un adulto (Cuadrantes 1 al 4)
    const piezas = [
      18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28,
      48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38
    ];
    return piezas.map(p => ({ numeroPieza: p, estadoDiagnostico: 'Sano', observaciones: '' }));
  }

  cargarOdontograma(): void {
    const ficha = this.fichaActual();
    if (!ficha || !ficha.id) return; // Se necesita la ficha guardada primero

    this.cargandoOdontograma.set(true);
    this.odontogramaService.obtenerPorFicha(ficha.id).subscribe({
      next: (res) => {
        const base = this.generarDientesVacios();
        // Mezclamos los dientes sanos (base) con los enfermos que vienen de la BD
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
        console.error('Error al cargar odontograma');
        this.cargandoOdontograma.set(false);
      }
    });
  }

  abrirModalDiente(diente: DetalleOdontogramaDTO): void {
    // Clonamos el objeto para no editar la vista hasta que no presione "Aplicar"
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
      
      // Actualizamos el array local (Signals) para que la UI reaccione y cambie de color
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
        alert('Debe guardar primero los datos básicos del Historial Médico para crear la Ficha en la BD.');
        return;
    }

    this.cargandoOdontograma.set(true);
    
    // Filtramos: Enviamos al Backend SOLO los dientes que tienen algo (Caries, curación, etc) 
    // para no saturar la BD guardando 32 dientes "Sanos" vacíos.
    const dientesAfectados = this.dientes().filter(d => 
      d.estadoDiagnostico !== 'Sano' || (d.observaciones && d.observaciones.trim() !== '')
    );

    this.odontogramaService.guardarOdontograma(ficha.id, dientesAfectados).subscribe({
      next: () => {
        this.cargandoOdontograma.set(false);
        this.mensajeExitoOdonto.set(true);
        setTimeout(() => this.mensajeExitoOdonto.set(false), 3000);
      },
      error: () => {
        alert('Error al guardar el odontograma');
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
}