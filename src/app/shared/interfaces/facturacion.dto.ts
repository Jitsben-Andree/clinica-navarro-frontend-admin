export interface TratamientoRequest {
  servicioId: number;
  precioCobrado: number;
  observaciones?: string;
}

export interface TratamientoResponse {
  id: number;
  servicioId: number;
  servicioNombre: string;
  precioCobrado: number;
  observaciones?: string;
}

export interface PagoRequest {
  citaId: number;
  metodoPago: string;
  tipoComprobante: string;
}

export interface PagoResponse {
  id: number;
  citaId: number;
  montoTotal: number;
  metodoPago: string;
  tipoComprobante: string;
  fechaPago: string;
}