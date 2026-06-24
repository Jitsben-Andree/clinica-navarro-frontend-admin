import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
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
  private toastService = inject(ToastService);

  // Control de Pestañas
  tabActiva = signal<'historial' | 'odontograma' | 'recetas'>('historial');

  // Signals Sala de Espera
  pacientesEnSala = signal<Cita[]>([]);
  cargandoSala = signal<boolean>(true);

  // Signals Historial
  pacientes = signal<Paciente[]>([]);
  pacienteSeleccionado = signal<number | null>(null);
  cargando = signal<boolean>(false);
  fichaActual = signal<FichaClinica | null>(null);

  // Signals Odontograma
  dientes = signal<DetalleOdontogramaDTO[]>(this.generarDientesVacios());
  cargandoOdontograma = signal<boolean>(false);
  mostrarModalDiente = signal<boolean>(false);
  dienteSeleccionado = signal<DetalleOdontogramaDTO | null>(null);

  // Signals Recetas
  citasPaciente = signal<Cita[]>([]);
  citaSeleccionadaParaReceta = signal<number | null>(null);
  recetaActual = signal<Receta | null>(null);
  cargandoReceta = signal<boolean>(false);

  // MAGIA UX: Plantillas de recetas para ahorrar tiempo escribiendo
  plantillasReceta = [
    { 
      nombre: 'Post-Extracción Simple', 
      icono: '🦷',
      texto: '1. Amoxicilina 500mg: Tomar 1 cápsula cada 8 horas por 7 días.\n2. Ibuprofeno 400mg: Tomar 1 tableta cada 8 horas por 3 días para el dolor.\n3. Reposo absoluto. Dieta blanda y fría. No escupir ni realizar enjuagues bruscos.' 
    },
    { 
      nombre: 'Infección / Absceso', 
      icono: '🦠',
      texto: '1. Clindamicina 300mg: Tomar 1 cápsula cada 8 horas por 7 días.\n2. Ketorolaco 10mg: Tomar 1 tableta cada 8 horas por 3 días (solo si hay dolor fuerte).' 
    },
    { 
      nombre: 'Limpieza / Profilaxis', 
      icono: '✨',
      texto: '1. Usar enjuague bucal con Clorhexidina al 0.12% dos veces al día por 7 días.\n2. Uso de hilo dental diario y cepillado de cerdas suaves.\n3. Próximo control de rutina en 6 meses.' 
    }
  ];

  recetaForm = this.fb.group({
    indicaciones: ['', Validators.required]
  });

  fichaForm = this.fb.group({
    tipoSangre: [''],
    antecedentes: this.fb.array([])
  });

  ngOnInit(): void {
    this.pacienteService.listarTodos().subscribe(data => this.pacientes.set(data));
    this.cargarSalaDeEspera();
  }

  cargarSalaDeEspera(): void {
    this.cargandoSala.set(true);
    this.citaService.listarTodas().subscribe({
      next: (citas: Cita[]) => {
        const hoy = new Date();
        hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
        const hoyStr = hoy.toISOString().split('T')[0];

        const enSala = citas.filter(c => c.fechaHora.startsWith(hoyStr) && c.estado === 'CONFIRMADA');
        enSala.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
        
        this.pacientesEnSala.set(enSala);
        this.cargandoSala.set(false);
      },
      error: () => this.cargandoSala.set(false)
    });
  }

  atenderPaciente(cita: Cita): void {
    this.pacienteSeleccionado.set(cita.pacienteId);
    this.tabActiva.set('historial');
    this.cargarFicha(cita.pacienteId);
    this.toastService.mostrar('info', `Expediente de ${cita.pacienteNombreCompleto} abierto.`);
  }

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
    this.cargarSalaDeEspera();
  }

  cargarFicha(pacienteId: number): void {
    this.cargando.set(true);
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
        this.toastService.mostrar('error', 'Error al cargar historial.');
        this.cargando.set(false);
      }
    });
  }

  guardarFicha(): void {
    if (this.fichaForm.invalid || !this.pacienteSeleccionado()) return;

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
        this.toastService.mostrar('exito', 'Historial médico actualizado.');
        this.fichaActual.set(fichaGuardada);
      },
      error: () => {
        this.toastService.mostrar('error', 'No se pudo guardar la ficha.');
        this.cargando.set(false);
      }
    });
  }

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
        this.toastService.mostrar('error', 'Error al sincronizar odontograma.');
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
        this.toastService.mostrar('info', 'Guarda el historial médico primero.');
        return;
    }

    this.cargandoOdontograma.set(true);
    const dientesAfectados = this.dientes().filter(d => d.estadoDiagnostico !== 'Sano' || (d.observaciones && d.observaciones.trim() !== ''));

    this.odontogramaService.guardarOdontograma(ficha.id, dientesAfectados).subscribe({
      next: () => {
        this.cargandoOdontograma.set(false);
        this.toastService.mostrar('exito', 'Odontograma dental guardado.');
      },
      error: () => {
        this.toastService.mostrar('error', 'Error al guardar piezas.');
        this.cargandoOdontograma.set(false);
      }
    });
  }

  // Estilos base para el diente según el diagnóstico
  getColorDiente(estado: string): string {
    const base = "w-10 h-14 border border-white/20 shadow-md transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center relative overflow-hidden";
    
    switch(estado) {
      case 'Caries': return `${base} bg-gradient-to-br from-rose-500 to-red-600 border-red-500 shadow-red-500/30 text-white`;
      case 'Curación': return `${base} bg-gradient-to-br from-blue-400 to-blue-600 border-blue-500 shadow-blue-500/30 text-white`;
      case 'Ausente': return `${base} bg-slate-200 border-slate-300 text-slate-400 opacity-60`;
      case 'Extracción Indicada': return `${base} bg-gradient-to-br from-orange-400 to-orange-500 border-orange-500 shadow-orange-500/30 text-white`;
      case 'Endodoncia': return `${base} bg-gradient-to-br from-purple-500 to-purple-600 border-purple-500 shadow-purple-500/30 text-white`;
      default: return `${base} bg-white border-slate-200 text-slate-300 shadow-sm`;
    }
  }

  cargarCitasParaReceta(pacienteId: number): void {
    this.citaService.listarPorPaciente(pacienteId).subscribe((data: Cita[]) => {
      // Ordenamos las citas para mostrar la más reciente primero
      const ordenadas = data.sort((a,b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      this.citasPaciente.set(ordenadas);
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

  // MAGIA UX: Añadir plantilla al textarea
  usarPlantilla(textoPlantilla: string): void {
    const actual = this.recetaForm.value.indicaciones || '';
    const nuevoTexto = actual ? `${actual}\n\n${textoPlantilla}` : textoPlantilla;
    this.recetaForm.patchValue({ indicaciones: nuevoTexto });
    this.toastService.mostrar('info', 'Plantilla insertada. Puedes modificarla.');
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
        this.toastService.mostrar('exito', 'Receta guardada. Lista para exportar en PDF.');
      },
      error: () => {
        this.toastService.mostrar('error', 'Error al guardar receta.');
        this.cargandoReceta.set(false);
      }
    });
  }

  descargarPdfReceta(): void {
    const citaId = this.citaSeleccionadaParaReceta();
    if (!citaId) return;
    
    this.toastService.mostrar('info', 'Generando PDF...');
    this.recetaService.descargarPdf(citaId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank'); 
    });
  }
}