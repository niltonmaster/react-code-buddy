import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, RefreshCw, FileText, DollarSign, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { TabInformacionGeneral } from './TabInformacionGeneral';
import { TabInformacionMonetaria } from './TabInformacionMonetaria';
import { TabDistribucionContable } from './TabDistribucionContable';
import {
  PARAMS_DEVENGADO_IGV,
  PARAMS_DEVENGADO_IGV_ND,
  DevengadoState,
  DevengadoNDState,
  DevengadoFormData,
  getDocumentoNumeroSugerido,
  getFechaHoy,
  getFechaFormatoInput,
  getMesNombre
} from './constants';
import {
  saveDevengado,
  saveDevengadoNDGroup,
  updateDevengadoNDGroup,
  getDevengadoById,
  getPreviousPeriodDevengado,
  getLatestDevengadoByTipo,
  getDevengadoNDGroup,
  DevengadoRecord
} from '@/lib/devengadosStorage';

interface ExtendedState extends DevengadoState {
  fromLista?: boolean;
  editId?: number;
  fromPagoFacilND?: boolean;
  pagoFacilNDData?: DevengadoNDState['pagoFacilNDData'];
  portafolio?: string;
  proveedoresSeleccionados?: string[];
  tipoDevengadoLista?: 'DOMICILIADO' | 'NO_DOMICILIADO';
  copyMode?: boolean;
  copyDataND?: {
    periodoTributario: string;
    proveedor: string;
    fechaPagoServicio: string;
    baseUsd: number;
    igvUsd: number;
    totalIgvSoles: number;
    tipoCambio: number;
  };
  copyData?: {
    periodo: string;
    proveedor: string;
    ruc: string;
    monto: number;
    moneda: string;
    observacion: string;
    fechaEmision?: string;
    fechaRecepcion?: string;
    fechaVencimiento?: string;
    fechaProgPago?: string;
    unidadNegocio?: string;
    tipoPago?: string;
  };
}

export function DevengadoIGV() {
  const location = useLocation();
  console.log('STATE /devengado-igv =>', location.state);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as ExtendedState | null;

  const editIdFromUrl = searchParams.get('id');
  const editId = state?.editId ?? (editIdFromUrl ? parseInt(editIdFromUrl, 10) : null);

  const fromPagoFacil = state?.fromPagoFacil ?? false;
  const fromPagoFacilND = state?.fromPagoFacilND ?? false;
  const fromLista = state?.fromLista ?? false;
  const pagoFacilNDData = state?.pagoFacilNDData;
  const portafolioND = state?.portafolio ?? '';
  const proveedoresND = state?.proveedoresSeleccionados ?? [];
  const tipoDevengadoLista = state?.tipoDevengadoLista;
  const copyMode = state?.copyMode ?? false;
  const copyDataND = state?.copyDataND;
  const copyData = state?.copyData;

  // Determinar si es modo No Domiciliado (desde Pago Fácil ND o desde lista ND)
  const isNoDomiciliado = fromPagoFacilND || tipoDevengadoLista === 'NO_DOMICILIADO';

  // Determinar si viene de Pago Fácil (D o ND) - campos deben estar deshabilitados
  // IMPORTANTE: copyMode === true → NO es Pago Fácil, es copia manual editable
  const isFromPagoFacil = copyMode ? false : (fromPagoFacil || (fromPagoFacilND && Boolean(pagoFacilNDData)));

  // Si no viene un periodo explícito (ej. navegación manual desde la lista),
  // sugerimos el mes siguiente al último devengado guardado DEL MISMO TIPO.
  // (Antes de IGV ND, esto era equivalente a "el último devengado"; ahora evitamos
  // que ND empuje el periodo sugerido para IGV D.)
  const suggestedPeriodo = (() => {
    const latest = getLatestDevengadoByTipo(isNoDomiciliado ? 'NO_DOMICILIADO' : 'DOMICILIADO');
    if (!latest?.periodo) return '09-2025';

    const [y, m] = latest.periodo.split('-').map(Number); // YYYY-MM
    if (!Number.isFinite(y) || !Number.isFinite(m)) return '09-2025';

    let nextMonth = m + 1;
    let nextYear = y;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear += 1;
    }

    const mm = String(nextMonth).padStart(2, '0');
    return `${mm}-${nextYear}`; // UI format MM-YYYY
  })();

  // Usar periodo de ND si viene de Pago Fácil ND (con datos) o de copia ND, sino usar suggestedPeriodo
  const periodoTributario = (isNoDomiciliado && pagoFacilNDData)
    ? pagoFacilNDData.periodoTributario
    : (copyMode && copyDataND)
      ? copyDataND.periodoTributario
      : (copyMode && copyData && copyData.periodo)
        ? (() => { const [y, m] = copyData.periodo.split('-'); return `${m}-${y}`; })()
        : (state?.periodoTributario ?? suggestedPeriodo);

  // El importe para ND es el totalIgvSoles (en soles, entero)
  const importeIGV = (isNoDomiciliado && pagoFacilNDData)
    ? pagoFacilNDData.totalIgvSoles
    : (copyMode && copyDataND)
      ? copyDataND.totalIgvSoles
      : (copyMode && copyData)
        ? (copyData.monto || 0)
        : (state?.importeIGV ?? 0);

  const [currentPeriodo, setCurrentPeriodo] = useState(periodoTributario);
  const [currentMonto, setCurrentMonto] = useState(importeIGV);
  const [existingId, setExistingId] = useState<number | null>(editId);
  const [originalTipoDevengado, setOriginalTipoDevengado] = useState<'DOMICILIADO' | 'NO_DOMICILIADO' | null>(null);

  const fechaInputDefault = getFechaFormatoInput(currentPeriodo);
  const [mes] = currentPeriodo.split('-');
  const mesNombre = getMesNombre(mes);

  // Generar asiento contable automático para ND
  const generarAsientoND = () => {
    const year = currentPeriodo.split('-')[1] || '2025';
    const month = currentPeriodo.split('-')[0] || '09';
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `${year}${month}APF${random}`;
  };

  // Inicializar formData según el origen
  const getInitialFormData = (): DevengadoFormData => {
    if (isNoDomiciliado && pagoFacilNDData) {
      // D) Modo No Domiciliado - prellenar desde Pago Fácil ND
      // RUC/NIT precargado según proveedor
      const rucNit = pagoFacilNDData.proveedor.toLowerCase().includes('bbva')
        ? '28597854'
        : '000000';

      // Total obligación display = Base USD + IGV USD (para mostrar en UI)
      // Monto distribución = IGV en soles (para distribución contable y pago SUNAT)
      const totalObligacionUsd = pagoFacilNDData.baseUsd + pagoFacilNDData.igvUsd;

      return {
        // Tab 1
        proveedor: pagoFacilNDData.proveedor,
        ruc: rucNit, // D) RUC precargado
        entidad: PARAMS_DEVENGADO_IGV_ND.entidad,
        tipoDocumento: PARAMS_DEVENGADO_IGV_ND.tipoDocumento,
        pagarA: pagoFacilNDData.proveedor,
        documentoNumero: pagoFacilNDData.facturaNro,
        fechaRegistro: getFechaHoy(),
        fechaEmision: pagoFacilNDData.fechaPagoServicio,//nilton esta fecha en el ejemplo es 07/08 pero ahi ver como traer porquie no estamos mostradno oleyendp
        fechaRecepcion: pagoFacilNDData.fechaPagoServicio,
        fechaVencimiento: pagoFacilNDData.fechaPagoServicio,
        fechaProgramacionPago: pagoFacilNDData.fechaPagoServicio,
        unidadNegocio: PARAMS_DEVENGADO_IGV_ND.unidadNegocioNombre,
        tipoServicio: PARAMS_DEVENGADO_IGV_ND.tipoServicio,
        tipoPago: 'Débito en cuenta',
        glosa: `COMISIÓN DE ADMINISTRACIÓN DE CARTERA ${pagoFacilNDData.periodoComision} – ${pagoFacilNDData.proveedor}`,
        // Tab 2 - Montos en USD
        monedaDocumento: 'USD',
        montoAfecto: pagoFacilNDData.baseUsd,
        noAfectoImpuestos: 0,
        igv: pagoFacilNDData.igvUsd,
        otrosImpuestos: 0,
        totalObligacion: pagoFacilNDData.totalIgvSoles, // IGV en soles para referencia/distribución
        monedaPago: 'Local',
        cuentaBancaria: '',
        generarPagoAutomatico: true,
        // Tab 3 - Distribución usa IGV en soles
        cuentaContable: `${PARAMS_DEVENGADO_IGV_ND.cuentaContable} – ${PARAMS_DEVENGADO_IGV_ND.cuentaContableNombre}`,
        centroCosto: `${PARAMS_DEVENGADO_IGV_ND.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV_ND.centroCostoNombre}`,
        persona: pagoFacilNDData.proveedor,
        montoDistribucion: pagoFacilNDData.totalIgvSoles


        , tipoCambio: pagoFacilNDData.tcSunatVenta,      // <-- TC Sunat Venta
        igvSoles: pagoFacilNDData.igvUsd * pagoFacilNDData.tcSunatVenta
      };
    } else if (copyMode && copyDataND && tipoDevengadoLista === 'NO_DOMICILIADO') {
      // Modo COPIA ND desde Lista — precargado pero EDITABLE (igual que ND manual)
      const igvCalc = typeof copyDataND.igvUsd === 'number' && copyDataND.igvUsd >= 0
        ? copyDataND.igvUsd
        : Math.round(copyDataND.baseUsd * 0.18 * 100) / 100;
      const igvSolesCalc = Math.round(igvCalc * copyDataND.tipoCambio * 100) / 100;
      const totalObl = Math.round((copyDataND.baseUsd + igvCalc) * 100) / 100;

      return {
        // Tab 1
        proveedor: copyDataND.proveedor,
        ruc: '',
        entidad: PARAMS_DEVENGADO_IGV_ND.entidad,
        tipoDocumento: PARAMS_DEVENGADO_IGV_ND.tipoDocumento,
        pagarA: copyDataND.proveedor,
        documentoNumero: '',
        fechaRegistro: getFechaHoy(),
        fechaEmision: copyDataND.fechaPagoServicio,
        fechaRecepcion: copyDataND.fechaPagoServicio,
        fechaVencimiento: copyDataND.fechaPagoServicio,
        fechaProgramacionPago: copyDataND.fechaPagoServicio,
        unidadNegocio: PARAMS_DEVENGADO_IGV_ND.unidadNegocioNombre,
        tipoServicio: PARAMS_DEVENGADO_IGV_ND.tipoServicio,
        tipoPago: 'Débito en cuenta',
        glosa: `COMISIÓN DE ADMINISTRACIÓN DE CARTERA ${mesNombre} ${currentPeriodo.split('-')[1]} – ${copyDataND.proveedor}`,
        // Tab 2 - Montos en USD (editables)
        monedaDocumento: 'USD',
        montoAfecto: copyDataND.baseUsd,
        noAfectoImpuestos: 0,
        igv: igvCalc,
        otrosImpuestos: 0,
        totalObligacion: totalObl,
        monedaPago: 'Local',
        cuentaBancaria: '',
        generarPagoAutomatico: true,
        // Tab 3
        cuentaContable: `${PARAMS_DEVENGADO_IGV_ND.cuentaContable} – ${PARAMS_DEVENGADO_IGV_ND.cuentaContableNombre}`,
        centroCosto: `${PARAMS_DEVENGADO_IGV_ND.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV_ND.centroCostoNombre}`,
        persona: copyDataND.proveedor,
        montoDistribucion: totalObl,
        tipoCambio: copyDataND.tipoCambio,
        igvSoles: igvSolesCalc
      };
    } else if (copyMode && copyData && tipoDevengadoLista === 'DOMICILIADO') {
      // Modo COPIA D desde Lista — precargado pero EDITABLE (igual que D manual)
      const periodoForDoc = copyData.periodo
        ? (() => { const [y, m] = copyData.periodo.split('-'); return `${m}-${y}`; })()
        : currentPeriodo;
      return {
        proveedor: copyData.proveedor || '',
        ruc: copyData.ruc || '',
        entidad: PARAMS_DEVENGADO_IGV.entidad,
        tipoDocumento: PARAMS_DEVENGADO_IGV.tipoDocumento,
        pagarA: copyData.proveedor || '',
        documentoNumero: '', // Nuevo registro, usuario lo define
        fechaRegistro: getFechaHoy(),
        fechaEmision: copyData.fechaEmision || fechaInputDefault,
        fechaRecepcion: copyData.fechaRecepcion || fechaInputDefault,
        fechaVencimiento: copyData.fechaVencimiento || fechaInputDefault,
        fechaProgramacionPago: copyData.fechaProgPago || fechaInputDefault,
        unidadNegocio: copyData.unidadNegocio || PARAMS_DEVENGADO_IGV.unidadNegocioNombre,
        tipoServicio: PARAMS_DEVENGADO_IGV.tipoServicioNombre,
        tipoPago: copyData.tipoPago || 'Débito en cuenta',
        glosa: copyData.observacion || `LIQUIDACIÓN IGV ${mesNombre} ${currentPeriodo.split('-')[1]}`,
        monedaDocumento: copyData.moneda === 'USD' ? 'USD' : 'Local',
        montoAfecto: copyData.monto || 0,
        noAfectoImpuestos: 0,
        igv: 0,
        otrosImpuestos: 0,
        totalObligacion: copyData.monto || 0,
        monedaPago: 'Local',
        cuentaBancaria: '',
        generarPagoAutomatico: true,
        cuentaContable: `${PARAMS_DEVENGADO_IGV.cuentaContable} – ${PARAMS_DEVENGADO_IGV.cuentaContableNombre}`,
        centroCosto: `${PARAMS_DEVENGADO_IGV.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV.centroCostoNombre}`,
        persona: copyData.proveedor || '',
        montoDistribucion: copyData.monto || 0
      };
    } else if (fromPagoFacil) {
      // Modo IGV Domiciliado normal
      return {
        proveedor: `${PARAMS_DEVENGADO_IGV.proveedorCodigo} – ${PARAMS_DEVENGADO_IGV.proveedorNombre}`,//pre
        ruc: PARAMS_DEVENGADO_IGV.ruc,//pre
        entidad: PARAMS_DEVENGADO_IGV.entidad,////pre
        tipoDocumento: PARAMS_DEVENGADO_IGV.tipoDocumento,////pre
        pagarA: PARAMS_DEVENGADO_IGV.proveedorNombre,/////pre
        documentoNumero: getDocumentoNumeroSugerido(currentPeriodo),//viene de STATE PF D VIENE 09-2025
        fechaRegistro: getFechaHoy(),
        fechaEmision: fechaInputDefault,
        fechaRecepcion: fechaInputDefault,
        fechaVencimiento: fechaInputDefault,
        fechaProgramacionPago: fechaInputDefault,//ULTIMO DIA MES DEL CURRETNPERIODO 
        unidadNegocio: PARAMS_DEVENGADO_IGV.unidadNegocioNombre,
        tipoServicio: PARAMS_DEVENGADO_IGV.tipoServicioNombre,
        tipoPago: 'Cheque',//'Débito en cuenta',
        glosa: `LIQUIDACIÓN IGV ${mesNombre} ${currentPeriodo.split('-')[1]}`,//arma ok

        monedaDocumento: 'Local', //ok
        montoAfecto: currentMonto,//de state
        noAfectoImpuestos: 0,
        igv: 0,
        otrosImpuestos: 0,
        totalObligacion: currentMonto,//amarillo =copia de montoAfecto
        monedaPago: 'Local',
        cuentaBancaria: '',


        generarPagoAutomatico: true,

        cuentaContable: `${PARAMS_DEVENGADO_IGV.cuentaContable} – ${PARAMS_DEVENGADO_IGV.cuentaContableNombre}`,
        centroCosto: `${PARAMS_DEVENGADO_IGV.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV.centroCostoNombre}`,
        persona: `${PARAMS_DEVENGADO_IGV.proveedorCodigo} – ${PARAMS_DEVENGADO_IGV.proveedorNombre}`,
        montoDistribucion: currentMonto
      };
    } else if (isNoDomiciliado) {
      // Modo manual IGV No Domiciliado (desde lista)
      return {
        proveedor: '',
        ruc: '',
        entidad: PARAMS_DEVENGADO_IGV_ND.entidad, // FCR siempre para ND
        tipoDocumento: PARAMS_DEVENGADO_IGV_ND.tipoDocumento, // No Domiciliado
        pagarA: '',
        documentoNumero: '', // Vacío, formato es GE/XXXXX definido por usuario
        fechaRegistro: getFechaHoy(),
        fechaEmision: fechaInputDefault,
        fechaRecepcion: fechaInputDefault,
        fechaVencimiento: fechaInputDefault,
        fechaProgramacionPago: fechaInputDefault,
        unidadNegocio: PARAMS_DEVENGADO_IGV_ND.unidadNegocioNombre,
        tipoServicio: PARAMS_DEVENGADO_IGV_ND.tipoServicio,
        tipoPago: 'Débito en cuenta',
        glosa: `COMISIÓN DE ADMINISTRACIÓN DE CARTERA ${mesNombre} ${currentPeriodo.split('-')[1]}`,
        monedaDocumento: 'USD',
        montoAfecto: 0,
        noAfectoImpuestos: 0,
        igv: 0,
        otrosImpuestos: 0,
        totalObligacion: 0,
        monedaPago: 'Local',
        cuentaBancaria: '',
        generarPagoAutomatico: true,
        cuentaContable: `${PARAMS_DEVENGADO_IGV_ND.cuentaContable} – ${PARAMS_DEVENGADO_IGV_ND.cuentaContableNombre}`,
        centroCosto: `${PARAMS_DEVENGADO_IGV_ND.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV_ND.centroCostoNombre}`,
        persona: '',
        montoDistribucion: 0
      };
    } else {
      // Modo manual IGV Domiciliado (desde lista)
      return {
        proveedor: '',
        ruc: '',
        entidad: '',
        tipoDocumento: '',
        pagarA: '',
        documentoNumero: '', // Vacío para manual, usuario lo define
        fechaRegistro: getFechaHoy(),
        fechaEmision: fechaInputDefault,
        fechaRecepcion: fechaInputDefault,
        fechaVencimiento: fechaInputDefault,
        fechaProgramacionPago: fechaInputDefault,
        unidadNegocio: PARAMS_DEVENGADO_IGV.unidadNegocioNombre,
        tipoServicio: PARAMS_DEVENGADO_IGV.tipoServicioNombre,
        tipoPago: 'Débito en cuenta',
        glosa: `LIQUIDACIÓN IGV ${mesNombre} ${currentPeriodo.split('-')[1]}`,
        monedaDocumento: 'Local',
        montoAfecto: currentMonto,
        noAfectoImpuestos: 0,
        igv: 0,
        otrosImpuestos: 0,
        totalObligacion: currentMonto,
        monedaPago: 'Local',
        cuentaBancaria: '',
        generarPagoAutomatico: true,
        cuentaContable: '',
        centroCosto: '',
        persona: '',
        montoDistribucion: currentMonto
      };
    }
  };

  const [formData, setFormData] = useState<DevengadoFormData>(getInitialFormData);

  // Load existing record if editing
  useEffect(() => {
    if (editId) {
      const existing = getDevengadoById(editId);
      if (existing) {
        // A) Si es un hijo ND (rol='IGV'), redirigir al padre antes de renderizar
        if (existing.tipoDevengado === 'NO_DOMICILIADO' && existing.rol === 'IGV' && existing.groupId) {
          import('@/lib/devengadosStorage').then(({ getDevengadoNDGroup }) => {
            const grupo = getDevengadoNDGroup(existing.groupId!);
            const padre = grupo.find(g => g.rol === 'PRINCIPAL');
            if (padre) {
              toast.info('El IGV (-1) se gestiona desde el registro Principal');
              navigate(`/devengado-igv?id=${padre.id}`, {
                state: { fromPagoFacil: false, fromLista: true, editId: padre.id },
                replace: true
              });
            }
          });
          return;
        }

        setExistingId(existing.id);
        setCurrentPeriodo(existing.periodo);
        setCurrentMonto(existing.monto);
        // Guardar el tipo original para preservarlo al editar
        setOriginalTipoDevengado(existing.tipoDevengado || 'DOMICILIADO');

        const [year, month] = existing.periodo.split('-');
        const fechaDefault = getFechaFormatoInput(`${month}-${year}`);

        const isExistingND = existing.tipoDevengado === 'NO_DOMICILIADO';

        setFormData(prev => ({
          ...prev,
          // Usar valores EXACTOS guardados, sin defaults que sobreescriban
          proveedor: existing.proveedor || '',
          ruc: existing.ruc || '',
          entidad: existing.entidad ?? '', // Usar valor guardado exacto, incluso si está vacío
          tipoDocumento: existing.tipoDocumento ?? '', // Usar valor guardado exacto
          pagarA: existing.proveedor || '',
          documentoNumero: existing.documentoNro || '', // Usar valor guardado exacto
          fechaRegistro: existing.fechaRegistro.split('-').reverse().join('/'),
          fechaEmision: fechaDefault,
          fechaRecepcion: fechaDefault,
          fechaVencimiento: fechaDefault,
          fechaProgramacionPago: fechaDefault,
          unidadNegocio: existing.unidadNegocio ?? '', // Usar valor guardado exacto
          tipoServicio: existing.tipoServicio ?? '', // Usar valor guardado exacto
          tipoPago: existing.tipoPago ?? '', // Usar valor guardado exacto
          glosa: existing.observacion || '',
          montoAfecto: isExistingND ? (existing.montoBaseUSD || existing.monto) : existing.monto,
          igv: isExistingND ? (existing.montoIgvUSD || 0) : 0,
          totalObligacion: isExistingND ? (existing.igvSoles || existing.monto) : existing.monto,
          montoDistribucion: isExistingND ? (existing.igvSoles || existing.monto) : existing.monto,
          monedaDocumento: existing.moneda === 'USD' ? 'USD' : 'Local',
          cuentaContable: isExistingND
            ? `${PARAMS_DEVENGADO_IGV_ND.cuentaContable} – ${PARAMS_DEVENGADO_IGV_ND.cuentaContableNombre}`
            : `${PARAMS_DEVENGADO_IGV.cuentaContable} – ${PARAMS_DEVENGADO_IGV.cuentaContableNombre}`,
          centroCosto: isExistingND
            ? `${PARAMS_DEVENGADO_IGV_ND.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV_ND.centroCostoNombre}`
            : `${PARAMS_DEVENGADO_IGV.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV.centroCostoNombre}`,
        }));
      }
    }
  }, [editId, navigate]);

  const handleChange = (field: keyof DevengadoFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTraerMesAnterior = () => {
    if (isFromPagoFacil) return;

    // Buscar registro del periodo anterior del mismo tipo
    const tipoParaBuscar = isNoDomiciliado ? 'NO_DOMICILIADO' : 'DOMICILIADO';
    const prevRecord = getPreviousPeriodDevengado(currentPeriodo, tipoParaBuscar);

    if (prevRecord) {
      // Map storage periodo (YYYY-MM) to UI periodo (MM-YYYY) for date helpers
      const [prevYear, prevMonth] = prevRecord.periodo.split('-');
      const prevUiPeriodo = `${prevMonth}-${prevYear}`;
      const prevFechaDefault = getFechaFormatoInput(prevUiPeriodo);
      const prevMesNombre = getMesNombre(prevMonth);

      if (isNoDomiciliado) {
        // Para ND, usar parámetros de ND
        const proveedorDisplay = prevRecord.proveedor;
        const cuentaContableDisplay = `${PARAMS_DEVENGADO_IGV_ND.cuentaContable} – ${PARAMS_DEVENGADO_IGV_ND.cuentaContableNombre}`;
        const centroCostoDisplay = `${PARAMS_DEVENGADO_IGV_ND.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV_ND.centroCostoNombre}`;

        setFormData(prev => ({
          ...prev,
          // Tab 1
          proveedor: proveedorDisplay,
          ruc: prevRecord.ruc || '',
          entidad: PARAMS_DEVENGADO_IGV_ND.entidad,
          tipoDocumento: PARAMS_DEVENGADO_IGV_ND.tipoDocumento,
          pagarA: prevRecord.proveedor,
          documentoNumero: '', // Se generará nuevo
          fechaEmision: prevFechaDefault,
          fechaRecepcion: prevFechaDefault,
          fechaVencimiento: prevFechaDefault,
          fechaProgramacionPago: prevFechaDefault,
          unidadNegocio: PARAMS_DEVENGADO_IGV_ND.unidadNegocioNombre,
          tipoServicio: PARAMS_DEVENGADO_IGV_ND.tipoServicio,
          tipoPago: 'Débito en cuenta',
          glosa: prevRecord.observacion || `COMISIÓN DE ADMINISTRACIÓN – ${prevRecord.proveedor}`,

          // Tab 2 - Montos en USD para ND
          monedaDocumento: 'USD',
          montoAfecto: prevRecord.montoBaseUSD || 0,
          noAfectoImpuestos: 0,
          igv: prevRecord.montoIgvUSD || 0,
          otrosImpuestos: 0,
          totalObligacion: prevRecord.igvSoles || 0,
          monedaPago: 'Local',
          cuentaBancaria: prev.cuentaBancaria,
          generarPagoAutomatico: true,

          // Tab 3
          cuentaContable: cuentaContableDisplay,
          centroCosto: centroCostoDisplay,
          persona: prevRecord.proveedor,
          montoDistribucion: prevRecord.igvSoles || 0
        }));

        setCurrentMonto(prevRecord.igvSoles || 0);
      } else {
        // Para D, usar parámetros de D (lógica existente)
        const proveedorDisplay = `${PARAMS_DEVENGADO_IGV.proveedorCodigo} – ${prevRecord.proveedor}`;
        const cuentaContableDisplay = `${PARAMS_DEVENGADO_IGV.cuentaContable} – ${PARAMS_DEVENGADO_IGV.cuentaContableNombre}`;
        const centroCostoDisplay = `${PARAMS_DEVENGADO_IGV.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV.centroCostoNombre}`;
        const personaDisplay = `${PARAMS_DEVENGADO_IGV.proveedorCodigo} – ${prevRecord.proveedor}`;

        setFormData(prev => ({
          ...prev,
          // Tab 1
          proveedor: proveedorDisplay,
          ruc: prevRecord.ruc,
          entidad: PARAMS_DEVENGADO_IGV.entidad,
          tipoDocumento: PARAMS_DEVENGADO_IGV.tipoDocumento,
          pagarA: prevRecord.proveedor,
          documentoNumero: getDocumentoNumeroSugerido(currentPeriodo),
          fechaEmision: prevFechaDefault,
          fechaRecepcion: prevFechaDefault,
          fechaVencimiento: prevFechaDefault,
          fechaProgramacionPago: prevFechaDefault,
          unidadNegocio: PARAMS_DEVENGADO_IGV.unidadNegocioNombre,
          tipoServicio: PARAMS_DEVENGADO_IGV.tipoServicioNombre,
          tipoPago: prev.tipoPago,
          glosa: `LIQUIDACIÓN IGV ${prevMesNombre} ${prevYear}`,

          // Tab 2
          monedaDocumento: prev.monedaDocumento,
          montoAfecto: prevRecord.monto,
          noAfectoImpuestos: 0,
          igv: 0,
          otrosImpuestos: 0,
          totalObligacion: prevRecord.monto,
          monedaPago: prev.monedaPago,
          cuentaBancaria: prev.cuentaBancaria,
          generarPagoAutomatico: prev.generarPagoAutomatico,

          // Tab 3
          cuentaContable: cuentaContableDisplay,
          centroCosto: centroCostoDisplay,
          persona: personaDisplay,
          montoDistribucion: prevRecord.monto
        }));

        setCurrentMonto(prevRecord.monto);
      }

      toast.success(`Información del periodo ${prevRecord.periodo} cargada correctamente`);
    } else {
      // Fallback to constants según el tipo
      if (isNoDomiciliado) {
        setFormData(prev => ({
          ...prev,
          proveedor: '',
          ruc: '',
          entidad: PARAMS_DEVENGADO_IGV_ND.entidad,
          tipoDocumento: PARAMS_DEVENGADO_IGV_ND.tipoDocumento,
          pagarA: '',
          unidadNegocio: PARAMS_DEVENGADO_IGV_ND.unidadNegocioNombre,
          cuentaContable: `${PARAMS_DEVENGADO_IGV_ND.cuentaContable} – ${PARAMS_DEVENGADO_IGV_ND.cuentaContableNombre}`,
          centroCosto: `${PARAMS_DEVENGADO_IGV_ND.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV_ND.centroCostoNombre}`,
          persona: ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          proveedor: `${PARAMS_DEVENGADO_IGV.proveedorCodigo} – ${PARAMS_DEVENGADO_IGV.proveedorNombre}`,
          ruc: PARAMS_DEVENGADO_IGV.ruc,
          entidad: PARAMS_DEVENGADO_IGV.entidad,
          tipoDocumento: PARAMS_DEVENGADO_IGV.tipoDocumento,
          pagarA: PARAMS_DEVENGADO_IGV.proveedorNombre,
          unidadNegocio: PARAMS_DEVENGADO_IGV.unidadNegocioNombre,
          cuentaContable: `${PARAMS_DEVENGADO_IGV.cuentaContable} – ${PARAMS_DEVENGADO_IGV.cuentaContableNombre}`,
          centroCosto: `${PARAMS_DEVENGADO_IGV.centroCostoCodigo} – ${PARAMS_DEVENGADO_IGV.centroCostoNombre}`,
          persona: `${PARAMS_DEVENGADO_IGV.proveedorCodigo} – ${PARAMS_DEVENGADO_IGV.proveedorNombre}`
        }));
      }
      toast.warning(`No se encontró un registro ${isNoDomiciliado ? 'ND' : 'D'} del periodo anterior. Se cargó la configuración por defecto.`);
    }
  };

  const handleGuardar = () => {
    // Validar campos requeridos
    if (!formData.fechaEmision || !formData.fechaRecepcion || !formData.fechaVencimiento || !formData.fechaProgramacionPago) {
      toast.error('Debe completar todas las fechas');
      return;
    }
    if (!formData.glosa.trim()) {
      toast.error('Debe ingresar la glosa del asiento');
      return;
    }
    if (formData.totalObligacion <= 0) {
      toast.error('El monto del IGV debe ser mayor a 0');
      return;
    }

    // Convert periodo format from "MM-YYYY" to "YYYY-MM"
    const [mesPart, añoPart] = currentPeriodo.split('-');
    const periodoFormatted = añoPart && mesPart ? `${añoPart}-${mesPart}` : currentPeriodo;

    // Para IGV ND nuevo (con o sin datos de Pago Fácil ND), guardar como grupo
    if (isNoDomiciliado && !existingId) {
      const baseData = {
        periodo: periodoFormatted,
        proveedor: formData.pagarA || formData.proveedor,
        ruc: formData.ruc || '',
        documentoNro: '', // Se generará automáticamente
        moneda: 'USD',
        monto: 0, // Se calculará
        estado: 'REGISTRADO' as const,
        fechaRegistro: new Date().toISOString().split('T')[0],
        fechaPago: null,
        observacion: formData.glosa,
        tipoDevengado: 'NO_DOMICILIADO' as const
      };

      // Usar datos de Pago Fácil ND si existen, sino usar datos del formulario
      const montoBaseUSD = pagoFacilNDData ? pagoFacilNDData.baseUsd : (formData.montoAfecto || 0);
      const montoIgvUSD = pagoFacilNDData ? pagoFacilNDData.igvUsd : (formData.igv || 0);
      const igvSoles = pagoFacilNDData ? pagoFacilNDData.totalIgvSoles : (formData.totalObligacion || 0);

      const result = saveDevengadoNDGroup(
        baseData,
        montoBaseUSD,
        montoIgvUSD,
        igvSoles,
        // Pasar campos del formulario para persistirlos
        {
          documentoNumero: formData.documentoNumero || undefined,
          entidad: formData.entidad || undefined,
          tipoDocumento: formData.tipoDocumento || undefined,
          tipoServicio: formData.tipoServicio || undefined,
          tipoPago: formData.tipoPago || undefined,
          unidadNegocio: formData.unidadNegocio || undefined,
        }
      );

      if (result.success) {
        console.log('Devengado IGV ND (grupo) guardado:', JSON.stringify(result.records, null, 2));
        toast.success('Devengado IGV No Domiciliado registrado correctamente (2 registros creados)');
        navigate('/devengados-igv');
      } else {
        toast.error(result.error || 'Error al guardar el devengado ND');
      }
      return;
    }

    // B) Para IGV ND en modo EDICIÓN: actualizar el grupo completo (padre + hijo)
    if (originalTipoDevengado === 'NO_DOMICILIADO' && existingId) {
      const existingRecord = getDevengadoById(existingId);
      if (existingRecord?.groupId) {
        const result = updateDevengadoNDGroup(existingRecord.groupId, {
          proveedor: formData.pagarA || formData.proveedor,
          ruc: formData.ruc || '',
          observacion: formData.glosa,
          entidad: formData.entidad,
          tipoDocumento: formData.tipoDocumento,
          tipoServicio: formData.tipoServicio,
          tipoPago: formData.tipoPago,
          unidadNegocio: formData.unidadNegocio,
          documentoNumero: formData.documentoNumero,
          montoBaseUSD: formData.montoAfecto || 0,
          montoIgvUSD: formData.igv || 0,
          igvSoles: formData.totalObligacion || 0,
        });

        if (result.success) {
          console.log('Grupo ND actualizado:', JSON.stringify(result.records, null, 2));
          toast.success('Devengado IGV No Domiciliado actualizado correctamente (grupo completo)');
          navigate('/devengados-igv');
        } else {
          toast.error(result.error || 'Error al actualizar el grupo ND');
        }
        return;
      }
    }

    // Para IGV D o edición normal
    // Al editar, preservar el tipoDevengado original del registro
    const tipoDevengadoFinal = existingId && originalTipoDevengado
      ? originalTipoDevengado
      : (isNoDomiciliado ? 'NO_DOMICILIADO' : 'DOMICILIADO');

    const esND = tipoDevengadoFinal === 'NO_DOMICILIADO';

    const record: Omit<DevengadoRecord, 'id'> & { id?: number } = {
      id: existingId ?? undefined,
      periodo: periodoFormatted,
      proveedor: formData.pagarA || (esND ? formData.proveedor : PARAMS_DEVENGADO_IGV.proveedorNombre),
      ruc: formData.ruc || (esND ? '' : PARAMS_DEVENGADO_IGV.ruc),
      documentoNro: formData.documentoNumero,
      moneda: esND ? 'USD' : 'PEN',
      monto: formData.totalObligacion,
      estado: 'REGISTRADO',
      fechaRegistro: new Date().toISOString().split('T')[0],
      fechaPago: null,
      observacion: formData.glosa,
      tipoDevengado: tipoDevengadoFinal,
      // Nuevos campos para persistir
      entidad: formData.entidad || (esND ? PARAMS_DEVENGADO_IGV_ND.entidad : PARAMS_DEVENGADO_IGV.entidad),
      unidadNegocio: formData.unidadNegocio || (esND ? PARAMS_DEVENGADO_IGV_ND.unidadNegocioNombre : PARAMS_DEVENGADO_IGV.unidadNegocioNombre),
      tipoServicio: formData.tipoServicio || (esND ? PARAMS_DEVENGADO_IGV_ND.tipoServicio : PARAMS_DEVENGADO_IGV.tipoServicioNombre),
      tipoPago: formData.tipoPago || 'Débito en cuenta',
      tipoDocumento: formData.tipoDocumento || (esND ? PARAMS_DEVENGADO_IGV_ND.tipoDocumento : PARAMS_DEVENGADO_IGV.tipoDocumento)
    };

    const result = saveDevengado(record);

    if (result.success) {
      console.log('Devengado IGV guardado:', JSON.stringify(result.record, null, 2));
      toast.success(existingId ? 'Devengado IGV actualizado correctamente' : 'Devengado IGV registrado correctamente');
      navigate('/devengados-igv');
    } else {
      toast.error(result.error || 'Error al guardar el devengado');
    }
  };

  const handleVolver = () => {
    if (fromLista) {
      navigate('/devengados-igv');
    } else if (fromPagoFacilND) {
      navigate('/pago-facil-igv-nd');
    } else if (fromPagoFacil) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional - C) Encabezado dinámico D vs ND */}
      <div className="institutional-header">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">
            {existingId
              ? (originalTipoDevengado === 'NO_DOMICILIADO'
                ? 'Editar Devengado IGV – No Domiciliado'
                : 'Editar Devengado IGV')
              : isNoDomiciliado
                ? 'Registrar Devengado IGV – No Domiciliado'
                : 'Registrar Devengado IGV'}
          </h1>
          <p className="text-sm opacity-80">
            Periodo: {currentPeriodo} | RUC: 20421413216
            {(isNoDomiciliado || originalTipoDevengado === 'NO_DOMICILIADO') && !copyMode && ' | Origen: Pago Fácil IGV ND (1041)'}
            {copyMode && ' | Origen: Copia desde registro existente'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Botón traer mes anterior */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Cargar configuración</h3>
              <p className="text-sm text-muted-foreground">
                {copyMode
                  ? 'Se cargó información base desde un registro existente. Ajuste los campos según sustento.'
                  : isFromPagoFacil
                    ? (isNoDomiciliado
                      ? 'La información fue cargada automáticamente desde Pago Fácil IGV No Domiciliado.'
                      : 'La información fue cargada automáticamente desde Pago Fácil.')
                    : 'Complete los datos o traiga la información del mes anterior.'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleTraerMesAnterior}
              disabled={isFromPagoFacil}
              title={isFromPagoFacil ? 'La información ya fue cargada automáticamente' : ''}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Traer información del mes anterior
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="general" className="flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Información General</span>
              <span className="sm:hidden">General</span>
            </TabsTrigger>
            <TabsTrigger value="monetaria" className="flex items-center gap-2 py-3">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Información Monetaria</span>
              <span className="sm:hidden">Monetaria</span>
            </TabsTrigger>
            <TabsTrigger value="distribucion" className="flex items-center gap-2 py-3">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Distribución Contable</span>
              <span className="sm:hidden">Contable</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <TabInformacionGeneral formData={formData} onChange={handleChange} isNoDomiciliado={isNoDomiciliado} isFromPagoFacil={isFromPagoFacil} />
          </TabsContent>

          <TabsContent value="monetaria">
            <TabInformacionMonetaria formData={formData} onChange={handleChange} isNoDomiciliado={isNoDomiciliado} isFromPagoFacil={isFromPagoFacil} />
          </TabsContent>

          <TabsContent value="distribucion">
            <TabDistribucionContable formData={formData} isFromPagoFacil={isFromPagoFacil} isNoDomiciliado={isNoDomiciliado} portafolio={portafolioND} proveedores={proveedoresND} />
          </TabsContent>
        </Tabs>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={handleGuardar} className="bg-primary">
            <Save className="mr-2 h-4 w-4" />
            Guardar devengado (demo)
          </Button>
        </div>
      </div>
    </div>
  );
}
