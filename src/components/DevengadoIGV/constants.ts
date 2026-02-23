export const PARAMS_DEVENGADO_IGV = {
  proveedorCodigo: '8101',
  proveedorNombre: 'SUNAT/BANCO DE LA NACION',
  ruc: '20131312955',
  entidad: 'FCR',
  tipoDocumento: 'Impuestos Propios',
  centroCostoCodigo: '78',
  centroCostoNombre: 'CONTABILIDAD',
  unidadNegocioCodigo: 'FCR-DL 19990',
  unidadNegocioNombre: 'FCR-DL 19990',
  tipoServicioCodigo: 'NO_AFECTO',
  tipoServicioNombre: 'No afecto a ninguna',
  cuentaContable: '4011101',
  cuentaContableNombre: 'IGV - Cuenta Propia'
};

// Constantes específicas para IGV No Domiciliado
export const PARAMS_DEVENGADO_IGV_ND = {
  tipoDocumento: 'No Domiciliado',
  tipoServicio: 'IGV No Domiciliado',
  codigoTributo: '1041',
  entidad: 'FCR',
  centroCostoCodigo: '78',
  centroCostoNombre: 'CONTABILIDAD',
  unidadNegocioCodigo: 'FCR-MACROFONDO',
  unidadNegocioNombre: 'FCR-MACROFONDO',
  cuentaContable: '4699108',
  cuentaContableNombre: 'Comisiones de Portafolio'
};

export const FIELD_CONFIG_DEVENGADO = {
  proveedor: { disabled: true },
  ruc: { disabled: true },
  entidad: { disabled: true },
  tipoDocumento: { disabled: true },
  centroCosto: { disabled: true },
  unidadNegocio: { disabled: true },
  tipoServicio: { disabled: false },
  glosa: { disabled: false },
  fechas: { disabled: false },
  tipoPago: { disabled: false },
  numeroDocumento: { disabled: false }
};

export interface DevengadoState {
  fromPagoFacil: boolean;
  periodoTributario: string;
  importeIGV: number;
}

// Interface para datos provenientes de Pago Fácil ND
export interface PagoFacilNDPayload {
  periodoTributario: string;
  codigoTributo: string;
  tributo: string;
  importePagarSoles: number;
  facturaNro: string;
  proveedor: string;
  fechaPagoServicio: string;
  tcSunatVenta: number;
  expedienteNro: string;
  igvUsd: number;
  baseUsd: number;
  totalFacturaSoles: number;
  igvSoles: number;
  redondeo: number;
  totalIgvSoles: number;
  tcSbs: number;
  periodoComision: string;
  fechaEmisionLima: string;
}

export interface DevengadoNDState {
  fromPagoFacilND: boolean;
  pagoFacilNDData: PagoFacilNDPayload;
  portafolio?: string;
  proveedoresSeleccionados?: string[];
}

// ─── Mapeo de cuentas contables para Distribución Contable ND ───
export interface CuentaContableND {
  cuenta: string;
  descripcion: string;
}

// Soporte para cuentas distintas en línea 1 (Haber) y línea 3 (Debe)
export interface CuentasComisionPar {
  lineaHaber: CuentaContableND; // línea 1
  lineaDebe: CuentaContableND;  // línea 3
}

// Cuentas FIJAS para todos los casos ND
export const CUENTA_IGV_SERVICIO_ND: CuentaContableND = {
  cuenta: '4011201',
  descripcion: 'IGV - Servicios prestados por No Domiciliados',
};
export const CUENTA_IGV_NO_DOMICILIADO: CuentaContableND = {
  cuenta: '6411101',
  descripcion: 'IGV no domiciliados',
};

// Cuentas VARIABLES por portafolio + proveedor
export const CUENTAS_COMISION_ND: Record<string, CuentaContableND> = {
  // FLAR
  'FLAR_CONJUNTO': { cuenta: '4699103', descripcion: 'Comisiones portafolio Fondo Latinoamericano' },
  'FLAR_ALLSPRING': { cuenta: '4699107', descripcion: 'Comisiones portafolio analytic Investors' },
  'FLAR_WELLINGTON': { cuenta: '4699103', descripcion: 'Comisiones portafolio Fondo Latinoamericano' }, // placeholder — confirmar
  // MILA
  'MILA_BBVA': { cuenta: '0000000', descripcion: 'Comisiones portafolio BBVA' },           // pendiente
  'MILA_BCP': { cuenta: '0000000', descripcion: 'Comisiones portafolio BCP' },             // pendiente
  'MILA_COMPASS': { cuenta: '0000000', descripcion: 'Comisiones portafolio Compass' },     // pendiente
};

/** Obtiene la clave de lookup para CUENTAS_COMISION_ND */
export function getCuentaComisionKey(portafolio: string, proveedores: string[]): string {
  if (!portafolio) return '';
  const proveedoresUpper = proveedores.map(p => p.toUpperCase());
  // Si hay más de un proveedor → CONJUNTO
  if (proveedoresUpper.length > 1) return `${portafolio.toUpperCase()}_CONJUNTO`;
  return `${portafolio.toUpperCase()}_${proveedoresUpper[0] || ''}`;
}

export interface DevengadoFormData {
  // Tab 1 - Información General
  proveedor: string;
  ruc: string;
  entidad: string;
  tipoDocumento: string;
  pagarA: string;
  documentoNumero: string;
  fechaRegistro: string;
  fechaEmision: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  fechaProgramacionPago: string;
  unidadNegocio: string;
  tipoServicio: string;
  tipoPago: string;
  glosa: string;
  // Tab 2 - Información Monetaria
  monedaDocumento: string;
  montoAfecto: number;
  noAfectoImpuestos: number;
  igv: number;
  otrosImpuestos: number;
  totalObligacion: number;
  monedaPago: string;
  cuentaBancaria: string;
  generarPagoAutomatico: boolean;
  // Tab 3 - Distribución Contable
  cuentaContable: string;
  centroCosto: string;
  persona: string;
  montoDistribucion: number;



  tipoCambio?: number;   // <-- NUEVO
  igvSoles?: number;     // <-- NUEVO (solo para ND)

}

export function getDocumentoNumeroSugerido(periodoTributario: string): string {
  const [mes, año] = periodoTributario.split('-');
  const mesNombre = getMesNombre(mes).substring(0, 3);
  return `IGVFCR${mesNombre}${año}`;
}

export function getFechaHoy(): string {
  const hoy = new Date();
  const dia = hoy.getDate().toString().padStart(2, '0');
  const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const año = hoy.getFullYear();
  return `${dia}/${mes}/${año}`;
}

export function getFechaFormatoInput(periodoTributario: string): string {
  const [mes, año] = periodoTributario.split('-');
  const ultimoDia = new Date(parseInt(año), parseInt(mes), 0).getDate();
  return `${año}-${mes}-${ultimoDia.toString().padStart(2, '0')}`;
}

export function getUltimoDiaMes(periodoTributario: string): string {
  const [mes, año] = periodoTributario.split('-');
  const mesNum = parseInt(mes, 10);
  const añoNum = parseInt(año, 10);
  const ultimoDia = new Date(añoNum, mesNum, 0).getDate();
  return `${ultimoDia}/${mes}/${año}`;
}

export function getMesNombre(mes: string): string {
  const meses: Record<string, string> = {
    '01': 'ENERO', '02': 'FEBRERO', '03': 'MARZO', '04': 'ABRIL',
    '05': 'MAYO', '06': 'JUNIO', '07': 'JULIO', '08': 'AGOSTO',
    '09': 'SETIEMBRE', '10': 'OCTUBRE', '11': 'NOVIEMBRE', '12': 'DICIEMBRE'
  };
  return meses[mes] || mes;
}
