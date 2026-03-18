import { ConceptoVenta } from './types';

// ===================== SETIEMBRE 2025 (formato antiguo) =====================

export const sep2025Facturas: ConceptoVenta[] = [
  { id: 'f1', concepto: 'C / Factura Electrónica Alquiler', rango: 'D-JF001-0006212 al F001-0006273', base: 2165754.19, igv: 389835.71 },
  { id: 'f2', concepto: 'C / Factura Electrónica Garantías', rango: 'D-JF001', base: 0.00, igv: 0.00 },
];

export const sep2025Boletas: ConceptoVenta[] = [
  { id: 'b1', concepto: 'C / Boleta de Venta Elec Alquiler', rango: 'D-JB001-0031511 al B001-0031771', base: 166521.18, igv: 29973.73 },
  { id: 'b2', concepto: 'C / Boleta de Venta Elec Garantías', rango: 'D-JB001-0031760', base: 1314.07, igv: 236.53 },
];

export const sep2025NotasDebito: ConceptoVenta[] = [
  { id: 'nd1', concepto: 'C / Nota de Débito Elec Alq Boleta', rango: 'D-JBD01-0029385 al BD01-0029418', base: 1015.82, igv: 182.86 },
  { id: 'nd2', concepto: 'C / Nota de Débito Elec Alq Fact', rango: 'D-JFD01-0004170 al FD01-0004212', base: 402.62, igv: 72.46 },
];

export const sep2025NotasCredito: ConceptoVenta[] = [
  { id: 'nc1', concepto: 'C / Nota de Crédito Elec Alquiler boleta', rango: 'D-JBC001-0000595 - BC001-0000610', base: -4940.65, igv: -889.35, isNegative: true },
  { id: 'nc2', concepto: 'C / Nota de Crédito Elec Alquiler factura', rango: '', base: -1968.94, igv: -354.57, isNegative: true },
  { id: 'nc3', concepto: 'C / Nota de Crédito Elec Garantía boleta', rango: 'D-JBC001-0000587 - BC001-00000611', base: -1002.45, igv: -180.44, isNegative: true },
  { id: 'nc4', concepto: 'C / Nota de Crédito Elec Garantía factura', rango: 'D-JFC001-0000185 - FC001-0000186', base: 0.00, igv: 0.00, isNegative: true },
];

export const sep2025NoGravadas: ConceptoVenta[] = [
  { id: 'ng1', concepto: 'C / Boleta', rango: '', base: 0.00, igv: 0.00 },
  { id: 'ng2', concepto: 'C / Nota de Débito', rango: 'Del BD01-0029385 al BD01-0029618/ FD01-0004170 al FD01-0004212', base: 240.75, igv: 0.00 },
  { id: 'ng3', concepto: 'C / Nota de Crédito', rango: 'Del BC001-0000587 - BC001-0000611 /FC001-0000185 - FC001-0000186', base: -2.88, igv: 0.00 },
];

// ===================== FEBRERO 2026 (formato nuevo) =====================

export const feb2026Facturas: ConceptoVenta[] = [
  { id: 'f1', concepto: 'C / Factura Electrónica Alquiler', rango: 'Del F001-0006548 al F001-0006608', base: 1553972.11, igv: 279714.95 },
  { id: 'f2', concepto: 'C / Factura Electrónica garantías', rango: 'Del F001-0000000', base: 0.00, igv: 0.00 },
];

export const feb2026Boletas: ConceptoVenta[] = [
  { id: 'b1', concepto: 'C / Boleta de Venta Elec Alquiler', rango: 'Del B001-0032765 al B001-0033010', base: 152696.67, igv: 27485.30 },
  { id: 'b2', concepto: 'C / Boleta de Venta Elec garantías', rango: 'Del B001-0033009', base: 793.56, igv: 142.84 },
];

export const feb2026NotasDebito: ConceptoVenta[] = [
  { id: 'nd1', concepto: 'C / Nota de Débito Elec Alq Boleta', rango: 'Del BD01-0030479 al BD01-0030635', base: 708.51, igv: 127.57 },
  { id: 'nd2', concepto: 'C / Nota de Débito Elec Alq Fact', rango: 'Del FD01-0004385 al FD01-0004416', base: 644.05, igv: 115.93 },
];

// NC dentro de Operaciones Gravadas (formato nuevo)
export const feb2026NotasCreditoOperaciones: ConceptoVenta[] = [
  { id: 'nc1', concepto: 'C / Nota de Crédito Elec Alquiler boleta', rango: 'Del BC001-000650 al BC001-000654', base: -2176.61, igv: -391.79, isNegative: true },
  { id: 'nc2', concepto: 'C / Nota de Crédito Elec Alquiler factura', rango: 'Del FC001-000200 al FC001-000201', base: -1885.68, igv: -339.42, isNegative: true },
];

// Descuento de Base Imponible (meses anteriores) - sección nueva
export const feb2026DescuentoBaseImponible: ConceptoVenta[] = [
  { id: 'desc1', concepto: 'C / Nota de Crédito Elec Alquiler boleta', rango: 'Del BC001-000652', base: -396.78, igv: -71.42, isNegative: true },
  { id: 'desc2', concepto: 'C / Nota de Crédito Elec Alquiler factura', rango: 'Del FC001-000197', base: 0.00, igv: 0.00, isNegative: true },
  { id: 'desc3', concepto: 'C / Nota de Crédito Elec Garantía boleta', rango: 'Del BC001-000651 al BC001-000653', base: -2079.20, igv: -374.25, isNegative: true },
];

export const feb2026NoGravadas: ConceptoVenta[] = [
  { id: 'ng1', concepto: 'C / Factura', rango: 'Del E001-15', base: 4008000.00, igv: 0.00 },
  { id: 'ng2', concepto: 'C / Boleta', rango: 'Del EB01-70 al EB01-71', base: 0.00, igv: 0.00 },
  { id: 'ng3', concepto: 'C / Nota de Débito', rango: 'Del BD01-0030479 al BD01-0030635/ FD01-0004385 al FD01-0004416', base: 361.81, igv: 0.00 },
  { id: 'ng4', concepto: 'C / Nota de Crédito', rango: 'Del BC01-0000625 al BC01-0000649', base: 0.00, igv: 0.00 },
];
