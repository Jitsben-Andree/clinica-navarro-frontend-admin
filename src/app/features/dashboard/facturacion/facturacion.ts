import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FacturacionService } from '../../../core/services/facturacion';
import { PacienteService } from '../../../core/services/paciente';
import { CitaService } from '../../../core/services/cita';
import { CatalogoService } from '../../../core/services/catalogo';
import { ClinicoService } from '../../../core/services/clinico';
import { OdontogramaService } from '../../../core/services/odontograma';
import { ToastService } from '../../../core/services/toasts';

import { Paciente } from '../../../shared/interfaces/paciente.dto';
import { Cita } from '../../../shared/interfaces/cita.dto';
import { CatalogoServicio } from '../../../shared/interfaces/catalogo.dto';
import { TratamientoResponse, PagoResponse } from '../../../shared/interfaces/facturacion.dto';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [DatePipe, DecimalPipe],
  templateUrl: './facturacion.html'
})
export class FacturacionComponent implements OnInit {
  private facturacionService = inject(FacturacionService);
  private pacienteService = inject(PacienteService);
  private citaService = inject(CitaService);
  private catalogoService = inject(CatalogoService);
  private clinicoService = inject(ClinicoService);
  private odontogramaService = inject(OdontogramaService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  
  private datePipe = inject(DatePipe);
  private decimalPipe = inject(DecimalPipe);

  // Estados visuales
  pacientes = signal<Paciente[]>([]);
  citas = signal<Cita[]>([]);
  servicios = signal<CatalogoServicio[]>([]);
  
  pacienteSeleccionado = signal<number | null>(null);
  citaSeleccionada = signal<Cita | null>(null);
  
  tratamientos = signal<TratamientoResponse[]>([]);
  pagoActual = signal<PagoResponse | null>(null);
  
  // MAGIA: Aquí guardaremos lo que el sistema sugiere cobrar
  sugerenciasClinicas = signal<any[]>([]);
  cargando = signal<boolean>(false);

  totalAPagar = computed(() => {
    return this.tratamientos().reduce((suma, t) => suma + t.precioCobrado, 0);
  });

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
      this.sugerenciasClinicas.set([]); // Limpiamos sugerencias previas
      
      this.citaService.listarPorPaciente(pId).subscribe((citas: Cita[]) => {
        const ordenadas = citas.sort((a: Cita, b: Cita) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
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
      
      // DISPARAMOS LA INTELIGENCIA CLÍNICA AL SELECCIONAR LA CITA
      this.analizarOdontogramaParaSugerencias(this.pacienteSeleccionado()!);
    }
  }

  // ========================================================
  // LA INTELIGENCIA: Leer Odontograma y emparejar con Catálogo
  // ========================================================
  analizarOdontogramaParaSugerencias(pacienteId: number) {
    this.clinicoService.obtenerFicha(pacienteId).subscribe({
      next: (ficha) => {
        if (ficha && ficha.id) {
          this.odontogramaService.obtenerPorFicha(ficha.id).subscribe({
            next: (odonto) => {
              const sugerencias: any[] = [];
              if (odonto.detalles) {
                odonto.detalles.forEach(d => {
                  let servicioMatch = null;
                  
                  // Reglas de negocio: Emparejamos el diagnóstico con el catálogo
                  if (d.estadoDiagnostico === 'Curación' || d.estadoDiagnostico === 'Caries') {
                    servicioMatch = this.servicios().find(s => s.nombre.toLowerCase().includes('resina') || s.nombre.toLowerCase().includes('curación'));
                  } else if (d.estadoDiagnostico === 'Extracción Indicada') {
                    servicioMatch = this.servicios().find(s => s.nombre.toLowerCase().includes('extracción'));
                  } else if (d.estadoDiagnostico === 'Endodoncia') {
                    servicioMatch = this.servicios().find(s => s.nombre.toLowerCase().includes('endodoncia'));
                  }

                  if (servicioMatch) {
                    // Verificamos que no se lo hayamos cobrado ya en esta cita
                    const yaCobrado = this.tratamientos().some(t => t.servicioId === servicioMatch?.id && t.observaciones?.includes(`Pieza ${d.numeroPieza}`));
                    
                    if (!yaCobrado) {
                      sugerencias.push({ pieza: d.numeroPieza, estado: d.estadoDiagnostico, servicio: servicioMatch });
                    }
                  }
                });
              }
              this.sugerenciasClinicas.set(sugerencias);
            }
          });
        }
      }
    });
  }

  aplicarSugerencia(sug: any) {
    this.tratamientoForm.patchValue({
      servicioId: sug.servicio.id,
      precioCobrado: sug.servicio.precioBase,
      observaciones: `Pieza ${sug.pieza} (${sug.estado})`
    });
    this.agregarTratamiento();
    
    // Lo quitamos de la lista de sugerencias porque ya lo agregó al carrito
    this.sugerenciasClinicas.update(list => list.filter(s => s !== sug));
  }

  onServicioChange(event: Event): void {
    const servicioId = Number((event.target as HTMLSelectElement).value);
    const servicio = this.servicios().find(s => s.id === servicioId);
    if (servicio) {
      this.tratamientoForm.patchValue({ precioCobrado: servicio.precioBase });
    }
  }

  cargarDetallesFacturacion(citaId: number): void {
    this.cargando.set(true);
    this.facturacionService.listarTratamientos(citaId).subscribe(t => {
      this.tratamientos.set(t);
      this.facturacionService.obtenerPago(citaId).subscribe({
        next: (pago) => {
          this.pagoActual.set(pago);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
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
        this.tratamientoForm.reset({ servicioId: 0, precioCobrado: 0, observaciones: '' });
        this.cargando.set(false);
        this.toastService.mostrar('exito', 'Servicio añadido a la cuenta.');
      },
      error: (err) => {
        this.toastService.mostrar('error', err.error?.message || 'Error al agregar servicio.');
        this.cargando.set(false);
      }
    });
  }

  eliminarTratamiento(id: number): void {
    if (!confirm('¿Seguro que desea quitar este servicio?')) return;
    this.cargando.set(true);
    this.facturacionService.eliminarTratamiento(id).subscribe({
      next: () => {
        this.tratamientos.update(lista => lista.filter(t => t.id !== id));
        this.cargando.set(false);
        this.toastService.mostrar('info', 'Servicio eliminado correctamente.');
        
        // Volvemos a analizar por si borró algo que deberíamos sugerir de nuevo
        this.analizarOdontogramaParaSugerencias(this.pacienteSeleccionado()!);
      },
      error: (err) => {
        this.toastService.mostrar('error', err.error?.message || 'Error al eliminar.');
        this.cargando.set(false);
      }
    });
  }

  procesarPago(): void {
    if (this.pagoForm.invalid || !this.citaSeleccionada()?.id || this.tratamientos().length === 0) return;
    if (!confirm(`¿Confirmar recepción de pago por S/. ${this.totalAPagar().toFixed(2)}?`)) return;

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
        this.toastService.mostrar('exito', '¡Pago procesado con éxito!');
        
        // Al procesar el pago, cambiamos el estado de la cita a REALIZADA
        this.citaService.cambiarEstado(this.citaSeleccionada()!.id!, 'REALIZADA').subscribe();
      },
      error: (err) => {
        this.toastService.mostrar('error', err.error?.message || 'Error al procesar pago.');
        this.cargando.set(false);
      }
    });
  }

  imprimirRecibo(): void {
    const pago = this.pagoActual();
    const cita = this.citaSeleccionada();
    if (!pago || !cita) return;

    const fechaFormateada = this.datePipe.transform(pago.fechaPago, 'dd/MM/yyyy h:mm a') || '';
    
    let filasTratamientos = '';
    this.tratamientos().forEach(t => {
      const precio = this.decimalPipe.transform(t.precioCobrado, '1.2-2');
      const obs = t.observaciones ? `<br><small style="color: #666; font-size: 11px;">${t.observaciones}</small>` : '';
      
      filasTratamientos += `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px dashed #ccc;">${t.servicioNombre}${obs}</td>
          <td style="padding: 10px 0; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold;">S/. ${precio}</td>
        </tr>
      `;
    });

    const ventana = window.open('', 'Imprimir Recibo', 'height=600,width=800');
    if (!ventana) {
      this.toastService.mostrar('error', 'El navegador bloqueó la ventana emergente.');
      return;
    }

    const htmlTicket = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Recibo - Clínica Navarro</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; color: #111; margin: 0; padding: 20px; font-size: 14px; background: #eee; }
          .ticket { max-width: 350px; margin: 0 auto; background: #fff; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px dashed #111; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: 900; letter-spacing: -1px; }
          .header p { margin: 2px 0; font-size: 12px; }
          .info-cliente { margin-bottom: 20px; font-size: 13px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          .totales { border-top: 2px dashed #111; padding-top: 15px; text-align: right; }
          .totales h2 { margin: 0; font-size: 20px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>CLÍNICA NAVARRO</h1>
            <p>RUC: 20123456789</p>
            <p>Av. Principal 123, Lima - Perú</p>
            <h3 style="margin: 15px 0 0 0;">${pago.tipoComprobante} DE PAGO</h3>
            <p>Ticket #${pago.id.toString().padStart(6, '0')}</p>
          </div>
          <div class="info-cliente">
            <strong>Fecha:</strong> ${fechaFormateada}<br>
            <strong>Paciente:</strong> ${cita.pacienteNombreCompleto}<br>
            <strong>Método de Pago:</strong> ${pago.metodoPago}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left; padding-bottom: 10px; border-bottom: 1px solid #111;">Descripción</th>
                <th style="text-align: right; padding-bottom: 10px; border-bottom: 1px solid #111;">Importe</th>
              </tr>
            </thead>
            <tbody>${filasTratamientos}</tbody>
          </table>
          <div class="totales">
            <p style="margin: 0 0 5px 0;">Subtotal: S/. ${this.decimalPipe.transform(pago.montoTotal, '1.2-2')}</p>
            <h2>TOTAL: S/. ${this.decimalPipe.transform(pago.montoTotal, '1.2-2')}</h2>
          </div>
          <div class="footer">
            <p>¡Gracias por confiar en nosotros!</p>
            <p>Atendido por: Recepción</p>
            <p style="font-size: 10px; margin-top: 20px; color:#aaa;">Generado electrónicamente</p>
          </div>
        </div>
        <script>
          window.onload = function() {a
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;
    ventana.document.write(htmlTicket);
    ventana.document.close();
  }
}