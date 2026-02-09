// LocalStorage service for Devengados IGV persistence

export interface CuentaBancaria {
  id: string;
  banco: string;
  numeroMasked: string;
  moneda: 'PEN' | 'USD';
}

export interface DevengadoRecord {
  id: number;
  periodo: string; // "YYYY-MM"
  proveedor: string;
  ruc: string;
  documentoNro: string;
  moneda: string;
  monto: number;
  estado: 'REGISTRADO' | 'EN_PREPAGO' | 'PAGADO' | 'ANULADO';
  fechaRegistro: string;
  fechaPago: string | null;
  observacion: string;
  // Campos opcionales para integración con Tesorería
  entidad?: string;           // default "FCR"
  unidadNegocio?: string;     // default "FCR-DL 19990"
  tipoPago?: string;
  tipoServicio?: string;      // Para ND: "IGV No Domiciliado"
  tipoDocumento?: string;     // Para ND: "No Domiciliado"
  cuentaBancaria?: CuentaBancaria;
  // Tipo de devengado: DOMICILIADO o NO_DOMICILIADO
  tipoDevengado?: 'DOMICILIADO' | 'NO_DOMICILIADO';
  // Campos específicos para IGV ND (grupo)
  groupId?: string;           // Identificador de grupo (ej: "GE/0002499")
  rol?: 'PRINCIPAL' | 'IGV';  // Rol en el grupo: Principal o IGV (-1)
  // Montos adicionales para ND
  montoBaseUSD?: number;
  montoIgvUSD?: number;
  totalObligacionUSD?: number;
  igvSoles?: number;
  // Asiento contable AP
  asiento?: string | null;    // Formato: YYYYMM-APF######
}

interface DevengadosData {
  seq: number;
  devengados: DevengadoRecord[];
}

const STORAGE_KEY = 'igv_devengados_v1';

const INITIAL_DATA: DevengadosData = {
  seq: 1127,
  devengados: [
    // === IGV DOMICILIADO (IGV D) ===
    {
      id: 1113,
      periodo: "2025-01",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRENE2025",
      moneda: "PEN",
      monto: 356210.45,
      estado: "PAGADO",
      fechaRegistro: "2025-02-07",
      fechaPago: "2025-02-10",
      observacion: "LIQUIDACIÓN IGV ENERO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1114,
      periodo: "2025-02",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRFEB2025",
      moneda: "PEN",
      monto: 348920.30,
      estado: "PAGADO",
      fechaRegistro: "2025-03-07",
      fechaPago: "2025-03-11",
      observacion: "LIQUIDACIÓN IGV FEBRERO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1115,
      periodo: "2025-03",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRMAR2025",
      moneda: "PEN",
      monto: 372450.80,
      estado: "PAGADO",
      fechaRegistro: "2025-04-08",
      fechaPago: "2025-04-11",
      observacion: "LIQUIDACIÓN IGV MARZO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1116,
      periodo: "2025-04",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRABR2025",
      moneda: "PEN",
      monto: 365780.15,
      estado: "PAGADO",
      fechaRegistro: "2025-05-07",
      fechaPago: "2025-05-09",
      observacion: "LIQUIDACIÓN IGV ABRIL 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1117,
      periodo: "2025-05",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRMAY2025",
      moneda: "PEN",
      monto: 389120.60,
      estado: "PAGADO",
      fechaRegistro: "2025-06-06",
      fechaPago: "2025-06-10",
      observacion: "LIQUIDACIÓN IGV MAYO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1118,
      periodo: "2025-06",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRJUN2025",
      moneda: "PEN",
      monto: 378540.25,
      estado: "PAGADO",
      fechaRegistro: "2025-07-07",
      fechaPago: "2025-07-10",
      observacion: "LIQUIDACIÓN IGV JUNIO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1119,
      periodo: "2025-07",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRJUL2025",
      moneda: "PEN",
      monto: 385905.65,
      estado: "PAGADO",
      fechaRegistro: "2025-08-08",
      fechaPago: "2025-08-11",
      observacion: "LIQUIDACIÓN IGV JULIO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    {
      id: 1120,
      periodo: "2025-08",
      proveedor: "SUNAT/BANCO DE LA NACION",
      ruc: "20131312955",
      documentoNro: "IGVFCRAGO2025",
      moneda: "PEN",
      monto: 401871.00,
      estado: "PAGADO",
      fechaRegistro: "2025-09-08",
      fechaPago: "2025-09-12",
      observacion: "LIQUIDACIÓN IGV AGOSTO 2025",
      entidad: "FCR",
      unidadNegocio: "FCR-DL 19990",
      tipoDevengado: "DOMICILIADO"
    },
    // === IGV NO DOMICILIADO (IGV ND) - GRUPO 1 ===
    {
      id: 1125,
      periodo: "2025-12",
      proveedor: "BBVA Asset Management S.A.",
      ruc: "00000000000",
      documentoNro: "GE/0002499",
      moneda: "USD",
      monto: 118146.06,
      estado: "REGISTRADO",
      fechaRegistro: "2025-12-19",
      fechaPago: null,
      observacion: "IGV NO DOMICILIADO - PRINCIPAL",
      entidad: "FCR",
      unidadNegocio: "FCR-MACROFONDO",
      tipoDevengado: "NO_DOMICILIADO",
      groupId: "GE/0002499",
      rol: "PRINCIPAL",
      montoBaseUSD: 100123.78,
      montoIgvUSD: 18022.28,
      totalObligacionUSD: 118146.06,
      igvSoles: 63060.00,
      asiento: "202512-APF1000006"
    },
    {
      id: 1126,
      periodo: "2025-12",
      proveedor: "BBVA Asset Management S.A.",
      ruc: "00000000000",
      documentoNro: "GE/0002499-1",
      moneda: "USD",
      monto: 18022.28,
      estado: "REGISTRADO",
      fechaRegistro: "2025-12-19",
      fechaPago: null,
      observacion: "IGV NO DOMICILIADO - IGV",
      entidad: "FCR",
      unidadNegocio: "FCR-MACROFONDO",
      tipoDevengado: "NO_DOMICILIADO",
      groupId: "GE/0002499",
      rol: "IGV",
      montoBaseUSD: 100123.78,
      montoIgvUSD: 18022.28,
      totalObligacionUSD: 118146.06,
      igvSoles: 63060.00,
      asiento: "202512-APF1000006"
    }
  ]
};

function getData(): DevengadosData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      return INITIAL_DATA;
    }

    let parsed = JSON.parse(stored) as DevengadosData;
    let changed = false;

    // Migración 1: normalizar periodos mal guardados (p.ej. "10-2025" -> "2025-10")
    if (parsed?.devengados?.length) {
      const migrated = parsed.devengados.map((d) => {
        const normalized = normalizePeriodo(d.periodo);
        if (normalized !== d.periodo) {
          changed = true;
          return { ...d, periodo: normalized };
        }
        return d;
      });
      if (changed) {
        parsed = { ...parsed, devengados: migrated };
      }
    }

    // Migración 2: agregar campos entidad/unidadNegocio/tipoDevengado a registros existentes
    // IMPORTANTE: Solo aplica defaults si los campos están vacíos, NO sobreescribe valores existentes
    if (parsed?.devengados?.length) {
      const migratedWithFields = parsed.devengados.map((d) => {
        // Solo migrar si faltan campos Y no es un registro ND ya válido
        // Detectar si es ND para aplicar defaults correctos
        const isND = d.groupId || d.tipoDevengado === 'NO_DOMICILIADO';
        
        // Para ND: SIEMPRE forzar entidad='FCR' (corrige registros con entidad incorrecta como 'bbva')
        // Para D: solo migrar si falta entidad
        const needsMigration = !d.entidad || !d.unidadNegocio || !d.tipoDevengado || 
          (isND && d.entidad?.toUpperCase() !== 'FCR');
        
        if (needsMigration) {
          if (isND) {
            changed = true;
            return {
              ...d,
              entidad: 'FCR', // SIEMPRE FCR para ND
              unidadNegocio: d.unidadNegocio || 'FCR-MACROFONDO',
              tipoDevengado: d.tipoDevengado || 'NO_DOMICILIADO' as const
            };
          } else {
            // Es IGV D
            changed = true;
            return {
              ...d,
              entidad: d.entidad || 'FCR',
              unidadNegocio: d.unidadNegocio || 'FCR-DL 19990',
              tipoDevengado: d.tipoDevengado || 'DOMICILIADO' as const
            };
          }
        }
        return d;
      });
      parsed = { ...parsed, devengados: migratedWithFields };
    }

    // Migración 3: agregar mocks de IGV ND si no existen
    const hasNDMocks = parsed.devengados.some(d => d.groupId === 'GE/0002499');
    if (!hasNDMocks) {
      const ndMocks = INITIAL_DATA.devengados.filter(d => d.tipoDevengado === 'NO_DOMICILIADO');
      if (ndMocks.length > 0) {
        parsed.devengados.push(...ndMocks);
        // Actualizar seq si es necesario
        const maxId = Math.max(...parsed.devengados.map(d => d.id));
        if (parsed.seq <= maxId) {
          parsed.seq = maxId + 1;
        }
        changed = true;
      }
    }

    if (changed) {
      saveData(parsed);
    }

    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
}

function saveData(data: DevengadosData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDevengados(): DevengadoRecord[] {
  return getData().devengados;
}

export function getLatestDevengado(): DevengadoRecord | undefined {
  return getData()
    .devengados
    .slice()
    .sort((a, b) => {
      const periodoCompare = b.periodo.localeCompare(a.periodo);
      if (periodoCompare !== 0) return periodoCompare;
      return b.id - a.id;
    })[0];
}

export function getLatestDevengadoByTipo(tipoDevengado: 'DOMICILIADO' | 'NO_DOMICILIADO'): DevengadoRecord | undefined {
  const filtered = getData()
    .devengados
    .filter((d) => {
      if (tipoDevengado === 'NO_DOMICILIADO') {
        // Para ND, usar el registro principal del grupo
        return d.tipoDevengado === 'NO_DOMICILIADO' && d.rol === 'PRINCIPAL';
      }
      // Para DOMICILIADO, excluir ND (mantiene el comportamiento previo a ND)
      return d.tipoDevengado !== 'NO_DOMICILIADO';
    })
    .slice()
    .sort((a, b) => {
      const periodoCompare = b.periodo.localeCompare(a.periodo);
      if (periodoCompare !== 0) return periodoCompare;
      return b.id - a.id;
    });

  return filtered[0];
}

export function getDevengadoById(id: number): DevengadoRecord | undefined {
  return getData().devengados.find(d => d.id === id);
}

export function getDevengadoByPeriodo(periodo: string, tipoDevengado?: 'DOMICILIADO' | 'NO_DOMICILIADO'): DevengadoRecord | undefined {
  const devengados = getData().devengados;
  return devengados.find(d => {
    if (d.periodo !== periodo) return false;
    // Si se especifica tipo, filtrar por él
    if (tipoDevengado) {
      // Para DOMICILIADO: aceptar registros con tipoDevengado='DOMICILIADO' o sin tipoDevengado (registros antiguos)
      if (tipoDevengado === 'DOMICILIADO') {
        if (d.tipoDevengado && d.tipoDevengado !== 'DOMICILIADO') return false;
      } else {
        // Para NO_DOMICILIADO: debe tener explícitamente ese tipo
        if (d.tipoDevengado !== 'NO_DOMICILIADO') return false;
        // Solo buscar el registro PRINCIPAL
        if (d.rol !== 'PRINCIPAL') return false;
      }
    }
    return true;
  });
}

export function getPreviousPeriodDevengado(
  currentPeriodo: string, 
  tipoDevengado: 'DOMICILIADO' | 'NO_DOMICILIADO' = 'DOMICILIADO'
): DevengadoRecord | undefined {
  // Accept both formats: "YYYY-MM" (storage) and "MM-YYYY" (UI)
  const parts = currentPeriodo.split('-').map(p => p.trim());
  if (parts.length !== 2) return undefined;

  let year: number;
  let month: number;

  // Detect format
  if (parts[0].length === 4) {
    // YYYY-MM
    year = Number(parts[0]);
    month = Number(parts[1]);
  } else {
    // MM-YYYY
    month = Number(parts[0]);
    year = Number(parts[1]);
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return undefined;

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const prevPeriodo = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  return getDevengadoByPeriodo(prevPeriodo, tipoDevengado);
}

// Normaliza periodo a formato "YYYY-MM"
function normalizePeriodo(periodo: string): string {
  const parts = periodo.split('-').map(p => p.trim());
  if (parts.length !== 2) return periodo;
  
  // Si el primer elemento tiene 4 dígitos, ya está en formato YYYY-MM
  if (parts[0].length === 4) {
    return periodo;
  }
  // Si no, asumimos MM-YYYY y lo convertimos
  const month = parts[0].padStart(2, '0');
  const year = parts[1];
  return `${year}-${month}`;
}

export function saveDevengado(record: Omit<DevengadoRecord, 'id'> & { id?: number }): { success: boolean; error?: string; record?: DevengadoRecord } {
  const data = getData();
  
  // Normalizar periodo a formato YYYY-MM
  const normalizedPeriodo = normalizePeriodo(record.periodo);
  const normalizedRecord = { ...record, periodo: normalizedPeriodo };
  
  if (normalizedRecord.id) {
    // Update existing - preservar campos del registro original que no se están actualizando
    const index = data.devengados.findIndex(d => d.id === normalizedRecord.id);
    if (index === -1) {
      return { success: false, error: 'Registro no encontrado' };
    }
    const existingRecord = data.devengados[index];
    // Merge: mantener campos originales (especialmente los de ND) y sobrescribir con los nuevos
    const updated: DevengadoRecord = { 
      ...existingRecord,  // Preservar groupId, rol, unidadNegocio, etc.
      ...normalizedRecord, 
      id: normalizedRecord.id,
      // Forzar preservar estos campos del original si existen (para ND)
      groupId: existingRecord.groupId,
      rol: existingRecord.rol,
      unidadNegocio: existingRecord.unidadNegocio || normalizedRecord.unidadNegocio,
      montoBaseUSD: existingRecord.montoBaseUSD,
      montoIgvUSD: existingRecord.montoIgvUSD,
      totalObligacionUSD: existingRecord.totalObligacionUSD,
      igvSoles: existingRecord.igvSoles,
    };
    data.devengados[index] = updated;
    saveData(data);
    return { success: true, record: updated };
  } else {
    // Create new - para IGV ND no validar duplicado de periodo (hay 2 registros por grupo)
    if (normalizedRecord.tipoDevengado !== 'NO_DOMICILIADO') {
      const existing = data.devengados.find(d => d.periodo === normalizedPeriodo && d.tipoDevengado !== 'NO_DOMICILIADO');
      if (existing) {
        return { success: false, error: `Ya existe un devengado para el periodo ${normalizedPeriodo}` };
      }
    }
    const newRecord: DevengadoRecord = { ...normalizedRecord, id: data.seq };
    data.seq += 1;
    data.devengados.push(newRecord);
    saveData(data);
    return { success: true, record: newRecord };
  }
}

export function updateDevengadoStatus(id: number, estado: DevengadoRecord['estado'], fechaPago?: string): boolean {
  const data = getData();
  const index = data.devengados.findIndex(d => d.id === id);
  if (index === -1) return false;
  
  data.devengados[index].estado = estado;
  if (fechaPago) {
    data.devengados[index].fechaPago = fechaPago;
  }
  saveData(data);
  return true;
}

// Guardar grupo de devengados IGV ND (principal + IGV -1)
export function saveDevengadoNDGroup(
  baseData: Omit<DevengadoRecord, 'id' | 'groupId' | 'rol'>,
  montoBaseUSD: number,
  montoIgvUSD: number,
  igvSoles: number,
  // Campos adicionales del formulario
  formFields?: {
    documentoNumero?: string;
    entidad?: string;
    tipoDocumento?: string;
    tipoServicio?: string;
    tipoPago?: string;
    unidadNegocio?: string;
  }
): { success: boolean; error?: string; records?: DevengadoRecord[] } {
  const data = getData();
  const normalizedPeriodo = normalizePeriodo(baseData.periodo);
  
  // Generar groupId único - usar documentoNumero del form si existe, sino generar automático
  const groupSeq = data.seq.toString().padStart(7, '0');
  const autoGroupId = `GE/${groupSeq}`;
  const groupId = formFields?.documentoNumero || autoGroupId;
  
  const totalUSD = montoBaseUSD + montoIgvUSD;
  const today = new Date().toISOString().split('T')[0];
  
  // Usar valores del formulario o defaults - FORZAR entidad='FCR' siempre para ND
  // (el campo entidad en ND representa la institución, no el proveedor)
  const entidad = 'FCR'; // Siempre FCR para registros ND
  const tipoDocumento = formFields?.tipoDocumento || 'No Domiciliado';
  const tipoServicio = formFields?.tipoServicio || 'IGV No Domiciliado';
  const tipoPago = formFields?.tipoPago || 'Débito en cuenta';
  const unidadNegocio = formFields?.unidadNegocio || 'FCR-MACROFONDO';
  
  // Generar Asiento contable AP para IGV ND: YYYYMM-APF######
  const periodoPartes = normalizedPeriodo.split('-');
  const asientoSeq = data.seq.toString().padStart(7, '0');
  const asiento = `${periodoPartes[0]}${periodoPartes[1]}-APF${asientoSeq}`;
  
  // Registro principal (Base + IGV USD)
  const principalRecord: DevengadoRecord = {
    ...baseData,
    id: data.seq,
    periodo: normalizedPeriodo,
    documentoNro: groupId,
    moneda: 'USD',
    monto: totalUSD,
    tipoDevengado: 'NO_DOMICILIADO',
    groupId,
    rol: 'PRINCIPAL',
    montoBaseUSD,
    montoIgvUSD,
    totalObligacionUSD: totalUSD,
    igvSoles,
    unidadNegocio,
    entidad,
    tipoDocumento,
    tipoServicio,
    tipoPago,
    fechaRegistro: today,
    asiento,
  };
  data.seq += 1;
  
  // Registro IGV (-1)
  const igvRecord: DevengadoRecord = {
    ...baseData,
    id: data.seq,
    periodo: normalizedPeriodo,
    documentoNro: `${groupId}-1`,
    moneda: 'USD',
    monto: montoIgvUSD,
    tipoDevengado: 'NO_DOMICILIADO',
    groupId,
    rol: 'IGV',
    montoBaseUSD,
    montoIgvUSD,
    totalObligacionUSD: totalUSD,
    igvSoles,
    unidadNegocio,
    entidad,
    tipoDocumento,
    tipoServicio,
    tipoPago,
    fechaRegistro: today,
    asiento,
  };
  data.seq += 1;
  
  data.devengados.push(principalRecord, igvRecord);
  saveData(data);
  
  return { success: true, records: [principalRecord, igvRecord] };
}

// B) Actualizar grupo completo de devengados IGV ND (padre + hijo)
export function updateDevengadoNDGroup(
  groupId: string,
  updateData: {
    proveedor?: string;
    ruc?: string;
    observacion?: string;
    entidad?: string;
    tipoDocumento?: string;
    tipoServicio?: string;
    tipoPago?: string;
    unidadNegocio?: string;
    documentoNumero?: string;
    montoBaseUSD?: number;
    montoIgvUSD?: number;
    igvSoles?: number;
  }
): { success: boolean; error?: string; records?: DevengadoRecord[] } {
  const data = getData();
  
  // Buscar registros del grupo
  const grupoIndices: number[] = [];
  data.devengados.forEach((d, idx) => {
    if (d.groupId === groupId) grupoIndices.push(idx);
  });
  
  if (grupoIndices.length === 0) {
    return { success: false, error: 'Grupo ND no encontrado' };
  }
  
  const updatedRecords: DevengadoRecord[] = [];
  
  grupoIndices.forEach(idx => {
    const record = data.devengados[idx];
    const isPrincipal = record.rol === 'PRINCIPAL';
    
    // Actualizar campos comunes
    if (updateData.proveedor !== undefined) record.proveedor = updateData.proveedor;
    if (updateData.ruc !== undefined) record.ruc = updateData.ruc;
    if (updateData.observacion !== undefined) record.observacion = updateData.observacion;
    if (updateData.entidad !== undefined) record.entidad = updateData.entidad;
    if (updateData.tipoDocumento !== undefined) record.tipoDocumento = updateData.tipoDocumento;
    if (updateData.tipoServicio !== undefined) record.tipoServicio = updateData.tipoServicio;
    if (updateData.tipoPago !== undefined) record.tipoPago = updateData.tipoPago;
    if (updateData.unidadNegocio !== undefined) record.unidadNegocio = updateData.unidadNegocio;
    
    // Actualizar montos
    if (updateData.montoBaseUSD !== undefined) record.montoBaseUSD = updateData.montoBaseUSD;
    if (updateData.montoIgvUSD !== undefined) record.montoIgvUSD = updateData.montoIgvUSD;
    if (updateData.igvSoles !== undefined) record.igvSoles = updateData.igvSoles;
    
    // Recalcular monto total según rol
    if (updateData.montoBaseUSD !== undefined || updateData.montoIgvUSD !== undefined) {
      const baseUSD = updateData.montoBaseUSD ?? record.montoBaseUSD ?? 0;
      const igvUSD = updateData.montoIgvUSD ?? record.montoIgvUSD ?? 0;
      record.totalObligacionUSD = baseUSD + igvUSD;
      
      if (isPrincipal) {
        record.monto = baseUSD + igvUSD; // Principal = total USD
      } else {
        record.monto = igvUSD; // IGV hijo = solo IGV USD
      }
    }
    
    // Actualizar documentoNro según rol
    if (updateData.documentoNumero !== undefined) {
      if (isPrincipal) {
        record.documentoNro = updateData.documentoNumero;
        // Actualizar también el groupId para mantener consistencia
        record.groupId = updateData.documentoNumero;
      } else {
        record.documentoNro = `${updateData.documentoNumero}-1`;
        record.groupId = updateData.documentoNumero;
      }
    }
    
    data.devengados[idx] = record;
    updatedRecords.push(record);
  });
  
  saveData(data);
  return { success: true, records: updatedRecords };
}

// Obtener devengados filtrados por unidad de negocio (filtro exacto)
export function getDevengadosByUnidad(unidadNegocio: string): DevengadoRecord[] {
  const devengados = getData().devengados;
  
  // Filtrar estrictamente por el campo unidadNegocio
  return devengados.filter(d => d.unidadNegocio === unidadNegocio);
}

// Obtener grupo completo de un devengado ND
export function getDevengadoNDGroup(groupId: string): DevengadoRecord[] {
  return getData().devengados.filter(d => d.groupId === groupId);
}
