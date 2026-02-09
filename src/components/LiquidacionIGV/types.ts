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
}

export interface PeriodoSeleccionado {
  año: number;
  mes: number;
}

export type PantallaActiva = 'seleccion' | 'liquidacion' | 'pagoFacil';
