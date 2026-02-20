/**
 * Servicio de datos FLAR — lee casesIndex, cabecera, trx_previa y detalle
 * para autocompletar el formulario Pago Fácil ND cuando portafolio = FLAR.
 */

import casesIndex from '@/data/casesIndex.json';
import cabeceraRaw from '@/data/cabecera.json';
import trxPreviaRaw from '@/data/trx_previa.json';
import detalleRaw from '@/data/detalle.json';

// ---------- Tipos ----------

export interface CaseEntry {
  id: string;
  portafolio: string;
  proveedores: string[];
  voucher: { period: string; voucherNo: string };
  trxNumbers: number[];
  labels: { casoLabel: string };
}

export interface CabeceraItem {
  period: string;
  voucherno: string;
  vouchertitle: string;
  exchangerate: number;
  voucherdate: string;
  businessunit: string;
  [key: string]: unknown;
}

export interface TrxPreviaItem {
  numerotransaccion: number;
  tipotransaccion: string;
  fechatransaccion: string;
  periodocontable: string;
  voucherno: string;
  montodolares: number;
  montolocal: number;
  tipodecambio: number;
  comentario: string;
  unidadnegocio: string;
  secuencia: number;
  [key: string]: unknown;
}

export interface DetalleItem {
  period: string;
  voucherno: string;
  voucherline: number;
  account: string;
  localamount: number;
  dollaramount: number;
  invoice: string;
  vendor: number;
  [key: string]: unknown;
}

// ---------- Parseo Oracle JSON (columns + items) ----------

function parseOracleJson<T>(raw: any): T[] {
  if (!raw?.results?.[0]?.items) return [];
  return raw.results[0].items as T[];
}

const cabeceras: CabeceraItem[] = parseOracleJson<CabeceraItem>(cabeceraRaw);
const transacciones: TrxPreviaItem[] = parseOracleJson<TrxPreviaItem>(trxPreviaRaw);
const detalles: DetalleItem[] = parseOracleJson<DetalleItem>(detalleRaw);
const cases: CaseEntry[] = casesIndex as CaseEntry[];

// ---------- Proveedores disponibles FLAR ----------

export function getProveedoresFLAR(): string[] {
  const set = new Set<string>();
  cases.forEach(c => c.proveedores.forEach(p => set.add(p)));
  // Siempre incluir WELLINGTON aunque no haya caso solo
  set.add('WELLINGTON');
  return Array.from(set).sort();
}

export const PROVEEDORES_MILA = ['BBVA', 'COMPASS', 'BCP'];

// ---------- Periodos disponibles ----------

export function getPeriodosFLAR(): string[] {
  const set = new Set<string>();
  cases.forEach(c => set.add(c.voucher.period));
  return Array.from(set).sort();
}

// ---------- Búsqueda de caso ----------

export function findCase(
  portafolio: string,
  proveedoresSeleccionados: string[],
  periodoSeleccionado: string
): CaseEntry | null {
  const provSet = new Set(proveedoresSeleccionados.map(p => p.toUpperCase()));

  return cases.find(c => {
    if (c.portafolio !== portafolio) return false;
    if (c.voucher.period !== periodoSeleccionado) return false;
    // Match exacto del set de proveedores
    const caseSet = new Set(c.proveedores.map(p => p.toUpperCase()));
    if (caseSet.size !== provSet.size) return false;
    for (const p of provSet) {
      if (!caseSet.has(p)) return false;
    }
    return true;
  }) ?? null;
}

// ---------- Obtener cabecera ----------

export function getHeader(caseEntry: CaseEntry): CabeceraItem | null {
  return cabeceras.find(
    h => h.period === caseEntry.voucher.period && h.voucherno === caseEntry.voucher.voucherNo
  ) ?? null;
}

// ---------- Obtener transacción CFL ----------

export function getTrxCFL(caseEntry: CaseEntry): TrxPreviaItem | null {
  return transacciones.find(
    t => caseEntry.trxNumbers.includes(t.numerotransaccion) && t.tipotransaccion === 'CFL'
  ) ?? null;
}

// ---------- Obtener detalles voucher ----------

export function getDetalles(caseEntry: CaseEntry): DetalleItem[] {
  return detalles.filter(
    d => d.period === caseEntry.voucher.period && d.voucherno === caseEntry.voucher.voucherNo
  );
}

// ---------- Parsear fecha Oracle "dd/mm/yy" → "YYYY-MM-DD" ----------

export function parseFechaOracle(fecha: string): string {
  if (!fecha) return '';
  const parts = fecha.replace(/\\\//g, '/').split('/');
  if (parts.length !== 3) return '';
  const [dd, mm, yy] = parts;
  const year = parseInt(yy) < 50 ? `20${yy}` : `20${yy}`;
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// ---------- Derivar periodo tributario MM-YYYY desde fecha YYYY-MM-DD ----------

export function derivarPeriodoTributario(fechaISO: string): string {
  if (!fechaISO) return '';
  const [year, month] = fechaISO.split('-');
  return `${month}-${year}`;
}

// ---------- Mapeo completo desde caso encontrado ----------

export interface AutofillResult {
  /** Campos mapeados */
  fields: Record<string, any>;
  /** Campos que deben ser readonly (true = readonly) */
  readonlyFields: Record<string, boolean>;
  /** Label del caso */
  casoLabel: string;
}

export function buildAutofillFromCase(
  caseEntry: CaseEntry,
  proveedoresSeleccionados: string[]
): AutofillResult | null {
  const trxCFL = getTrxCFL(caseEntry);
  const header = getHeader(caseEntry);

  if (!trxCFL) return null;

  const proveedorTexto = proveedoresSeleccionados.join(' + ');
  const fechaPagoISO = parseFechaOracle(trxCFL.fechatransaccion);
  const periodoTributario = derivarPeriodoTributario(fechaPagoISO) || 
    (() => { const p = caseEntry.voucher.period; return `${p.slice(4)}-${p.slice(0,4)}`; })();
  
  const tcSunat = trxCFL.tipodecambio;
  const tcSbs = header?.exchangerate ?? 0;
  const baseUsd = Math.abs(trxCFL.montodolares);
  const igvUsd = Number((baseUsd * 0.18).toFixed(2));
  const igvSoles = Number((igvUsd * tcSunat).toFixed(2));
  const totalIgvSoles = Math.round(igvSoles);
  const redondeo = Number((totalIgvSoles - igvSoles).toFixed(2));

  const fields = {
    periodoTributario,
    codigoTributo: '1041',
    tributo: 'IGV NO DOMICILIADO',
    importePagarSoles: totalIgvSoles,
    facturaNro: '',           // No viene de JSON, editable
    proveedor: proveedorTexto,
    fechaPagoServicio: fechaPagoISO,
    tcSunatVenta: tcSunat,
    expedienteNro: '',        // No viene de JSON, editable
    igvUsd,
    baseUsd,
    totalFacturaSoles: Number((baseUsd * tcSunat).toFixed(2)),
    igvSoles,
    redondeo,
    totalIgvSoles,
    tcSbs,
    periodoComision: '',      // No viene de JSON, editable
    fechaEmisionLima: new Date().toISOString().split('T')[0],
  };

  const readonlyFields: Record<string, boolean> = {
    periodoTributario: true,
    codigoTributo: true,
    tributo: true,
    importePagarSoles: true,
    proveedor: true,
    fechaPagoServicio: true,
    tcSunatVenta: true,
    baseUsd: true,
    // Calculados siempre readonly
    igvUsd: true,
    igvSoles: true,
    redondeo: true,
    totalIgvSoles: true,
    totalFacturaSoles: true,
    // Editables
    facturaNro: false,
    expedienteNro: false,
    periodoComision: false,
    fechaEmisionLima: false,
    tcSbs: false,
  };

  return { fields, readonlyFields, casoLabel: caseEntry.labels.casoLabel };
}

// ---------- Campos readonly por defecto (MILA manual o FLAR sin match) ----------

export function getDefaultReadonlyFields(): Record<string, boolean> {
  return {
    codigoTributo: true,
    tributo: true,
    // Calculados siempre readonly
    igvUsd: true,
    igvSoles: true,
    redondeo: true,
    totalIgvSoles: true,
    importePagarSoles: true,
    totalFacturaSoles: true,
    // Todo lo demás editable
    periodoTributario: false,
    proveedor: false,
    facturaNro: false,
    fechaPagoServicio: false,
    tcSunatVenta: false,
    baseUsd: false,
    expedienteNro: false,
    tcSbs: false,
    periodoComision: false,
    fechaEmisionLima: false,
  };
}
