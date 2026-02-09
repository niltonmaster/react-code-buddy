// LocalStorage service for Pagos IGV persistence

export interface CuentaBancariaPago {
  id: string;
  banco: string;
  numeroMasked: string;
  moneda: 'PEN' | 'USD';
}

export interface SustentoPago {
  comprobanteGiro?: string; // base64 o nombre archivo mock
  constanciaSunat?: string;
  copiaCheque?: string;
  voucherBancario?: string;
}

export interface Pago {
  id: string;
  devengadoId: string;
  periodo: string;
  entidad: string;
  unidadNegocio: string;
  proveedor: string;
  monto: number;
  tipoPago: string;
  cuentaBancaria: CuentaBancariaPago;
  fechaGeneracion: string;
  fechaPago?: string;
  estado: 'GENERADO' | 'PAGADO' | 'ANULADO';
  sustento?: SustentoPago;
  observacion?: string;
}

interface PagosData {
  seq: number;
  pagos: Pago[];
}

const STORAGE_KEY = 'igv_pagos_v1';

const INITIAL_DATA: PagosData = {
  seq: 1,
  pagos: []
};

function getData(): PagosData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      return INITIAL_DATA;
    }
    return JSON.parse(stored);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
}

function saveData(data: PagosData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPagos(): Pago[] {
  return getData().pagos;
}

export function getPagoById(id: string): Pago | undefined {
  return getData().pagos.find(p => p.id === id);
}

export function getPagoByDevengadoId(devengadoId: string): Pago | undefined {
  return getData().pagos.find(p => p.devengadoId === devengadoId);
}

export function getPagosByPeriodo(periodo: string): Pago[] {
  return getData().pagos.filter(p => p.periodo === periodo);
}

export function getPagosByEstado(estado: Pago['estado']): Pago[] {
  return getData().pagos.filter(p => p.estado === estado);
}

export function savePago(pago: Omit<Pago, 'id'> & { id?: string }): { success: boolean; error?: string; pago?: Pago } {
  const data = getData();
  
  if (pago.id) {
    // Update existing
    const index = data.pagos.findIndex(p => p.id === pago.id);
    if (index === -1) {
      return { success: false, error: 'Pago no encontrado' };
    }
    const updated: Pago = { ...pago, id: pago.id };
    data.pagos[index] = updated;
    saveData(data);
    return { success: true, pago: updated };
  } else {
    // Create new
    const newId = `PAG-${data.seq.toString().padStart(6, '0')}`;
    const newPago: Pago = { ...pago, id: newId };
    data.seq += 1;
    data.pagos.push(newPago);
    saveData(data);
    return { success: true, pago: newPago };
  }
}

export function updatePago(id: string, updates: Partial<Omit<Pago, 'id'>>): { success: boolean; error?: string; pago?: Pago } {
  const data = getData();
  const index = data.pagos.findIndex(p => p.id === id);
  
  if (index === -1) {
    return { success: false, error: 'Pago no encontrado' };
  }
  
  const updated: Pago = { ...data.pagos[index], ...updates };
  data.pagos[index] = updated;
  saveData(data);
  return { success: true, pago: updated };
}

export function updatePagoEstado(id: string, estado: Pago['estado'], fechaPago?: string): boolean {
  const data = getData();
  const index = data.pagos.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  data.pagos[index].estado = estado;
  if (fechaPago) {
    data.pagos[index].fechaPago = fechaPago;
  }
  saveData(data);
  return true;
}

export function clearPagos(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
}
