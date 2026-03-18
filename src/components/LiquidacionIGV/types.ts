export interface ConceptoVenta {
  id: string;
  concepto: string;
  rango: string;
  base: number;
  igv: number;
  isNegative?: boolean;
  isHeader?: boolean;
}

export interface DatosLiquidacion {
  facturas: ConceptoVenta[];
  boletas: ConceptoVenta[];
  notasDebito: ConceptoVenta[];
  notasCredito: ConceptoVenta[];
  ventasNoGravadas: ConceptoVenta[];
}

export interface TotalesLiquidacion {
  facturas: { base: number; igv: number };
  boletas: { base: number; igv: number };
  notasDebito: { base: number; igv: number };
  notasCredito: { base: number; igv: number };
  noGravadas: { base: number; igv: number };
  baseGravada: number;
  igvGravado: number;
  baseNeta: number;
  igvNeto: number;
  importePagar: number;
  // Campos adicionales para formato nuevo (Feb 2026+)
  descuentoBase?: { base: number; igv: number };
  impuestoTotalOperaciones?: number;
  impuestoTotalDescuento?: number;
  totalNetoVentas?: number;
}

export interface PeriodoSeleccionado {
  año: number;
  mes: number;
}

export type PantallaActiva = 'seleccion' | 'liquidacion' | 'pagoFacil';

/** Determina si el periodo usa el formato nuevo (con Descuento de Base Imponible) */
export function usaFormatoNuevo(periodo: PeriodoSeleccionado): boolean {
  // Feb 2026 en adelante usa formato nuevo
  if (periodo.año > 2026) return true;
  if (periodo.año === 2026 && periodo.mes >= 2) return true;
  return false;
}
