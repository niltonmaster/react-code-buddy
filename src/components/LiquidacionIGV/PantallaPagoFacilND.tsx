import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, FileText, Printer, Download, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import tcSbsData from '@/data/tc_sbs.json';
import tcSunatData from '@/data/tc_sunat.json';
import {
  getPeriodosFLAR,
  findCase,
  buildAutofillFromCase,
  getDefaultReadonlyFields,
  type AutofillResult,
} from '@/lib/flarDataService';

// ─── Tipos ───────────────────────────────────────────────

export interface PagoFacilND {
  periodoTributario: string;
  codigoTributo: string;
  tributo: string;
  importePagarSoles: number;
  facturaNro: string;
  proveedor: string;
  domicilio: string;
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

const emptyFormData: PagoFacilND = {
  periodoTributario: '',
  codigoTributo: '1041',
  tributo: 'IGV NO DOMICILIADO',
  importePagarSoles: 0,
  facturaNro: '',
  proveedor: '',
  domicilio: '',
  fechaPagoServicio: '',
  tcSunatVenta: 0,
  expedienteNro: '',
  igvUsd: 0,
  baseUsd: 0,
  totalFacturaSoles: 0,
  igvSoles: 0,
  redondeo: 0,
  totalIgvSoles: 0,
  tcSbs: 0,
  periodoComision: '',
  fechaEmisionLima: new Date().toISOString().split('T')[0],
};

// ─── Tipos Custodia ──────────────────────────────────────

interface FilaCustodia {
  proveedor: string;
  facturaNro: string;
  baseUsd: number;
  igvUsd: number;
  igvSoles: number;
  totalIgvSoles: number;
  redondeo: number;
}

const FILAS_CUSTODIA_LABELS = ['BBVA', 'COMPASS', 'CREDICORP'];

const emptyFilaCustodia = (prov: string): FilaCustodia => ({
  proveedor: prov,
  facturaNro: '',
  baseUsd: 0,
  igvUsd: 0,
  igvSoles: 0,
  totalIgvSoles: 0,
  redondeo: 0,
});

// ─── Componente principal ────────────────────────────────

export function PantallaPagoFacilND() {
  const navigate = useNavigate();

  // Selección cascada
  const [portafolio, setPortafolio] = useState<'FLAR' | 'MILA' | ''>('');
  const [tipoFLAR, setTipoFLAR] = useState<string>('');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');

  // ─── MILA state ──────────────────────────────────────
  const [tipoComisionMILA, setTipoComisionMILA] = useState<'administrativa' | 'custodia' | ''>('');
  const [proveedorMILA, setProveedorMILA] = useState<string>('');
  const [filasCustodia, setFilasCustodia] = useState<FilaCustodia[]>(
    FILAS_CUSTODIA_LABELS.map(emptyFilaCustodia)
  );

  // Derivar proveedoresSeleccionados según portafolio
  const proveedoresSeleccionados = useMemo(() => {
    if (portafolio === 'MILA') {
      if (tipoComisionMILA === 'administrativa' && proveedorMILA) return [proveedorMILA];
      if (tipoComisionMILA === 'custodia') return ['BBH'];
      return [];
    }
    if (portafolio !== 'FLAR') return [];
    switch (tipoFLAR) {
      case 'conjunto': return ['ALLSPRING', 'WELLINGTON'];
      case 'allspring': return ['ALLSPRING'];
      case 'wellington': return ['WELLINGTON'];
      default: return [];
    }
  }, [portafolio, tipoFLAR, tipoComisionMILA, proveedorMILA]);

  // Datos del formulario
  const [pagoFacilND, setPagoFacilND] = useState<PagoFacilND>(emptyFormData);
  const [readonlyFields, setReadonlyFields] = useState<Record<string, boolean>>(getDefaultReadonlyFields());
  const [autofilledCase, setAutofilledCase] = useState<string | null>(null);
  const [noMatchWarning, setNoMatchWarning] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  // ─── Modal Consulta Tipo de Cambio ─────────────────────
  const [tcModalOpen, setTcModalOpen] = useState(false);
  const [tcModalData, setTcModalData] = useState<{
    fecha: string;
    fechaAnterior: string;
    sunat: { compra: number; venta: number } | null;
    sbs: { compra: number; venta: number } | null;
  } | null>(null);

  const handleConsultarTC = () => {
    const fechaPago = pagoFacilND.fechaPagoServicio;
    if (!fechaPago) return;

    // Calcular D-1
    const d = new Date(fechaPago + 'T00:00:00');
    const dMinus1 = new Date(d);
    dMinus1.setDate(dMinus1.getDate() - 1);
    const fechaAnterior = dMinus1.toISOString().split('T')[0];

    // Buscar en JSONs
    const sunatEntry = (tcSunatData as any[]).find((e) => e.date === fechaPago);
    const sbsEntry = (tcSbsData as any[]).find((e) => e.date === fechaAnterior);

    setTcModalData({
      fecha: fechaPago,
      fechaAnterior,
      sunat: sunatEntry ? { compra: sunatEntry.compra, venta: sunatEntry.venta } : null,
      sbs: sbsEntry ? { compra: sbsEntry.compra, venta: sbsEntry.venta } : null,
    });
    setTcModalOpen(true);
  };

  const handleUsarVentaSunat = () => {
    if (!tcModalData?.sunat) return;
    const ventaSunat = tcModalData.sunat.venta;

    // Setear TC SUNAT y disparar recálculos
    updateField('tcSunatVenta', ventaSunat);

    setTcModalOpen(false);
    toast.success(`TC SUNAT Venta aplicado: ${ventaSunat}`);
  };

  // Listas dinámicas
  const periodosDisponibles = useMemo(() => {
    if (portafolio === 'FLAR' && proveedoresSeleccionados.length > 0) {
      return getPeriodosFLAR(proveedoresSeleccionados);
    }
    return [];
  }, [portafolio, proveedoresSeleccionados]);

  // ─── Eventos de selección ────────────────────────────

  const handlePortafolioChange = (value: 'FLAR' | 'MILA') => {
    setPortafolio(value);
    setTipoFLAR('');
    setPeriodoSeleccionado('');
    setTipoComisionMILA('');
    setProveedorMILA('');
    setFilasCustodia(FILAS_CUSTODIA_LABELS.map(emptyFilaCustodia));
    setPagoFacilND(emptyFormData);
    setReadonlyFields(getDefaultReadonlyFields());
    setAutofilledCase(null);
    setNoMatchWarning(false);
  };

  const handleTipoFLARChange = (value: string) => {
    setTipoFLAR(value);
    setPeriodoSeleccionado('');
    setPagoFacilND(emptyFormData);
    setReadonlyFields(getDefaultReadonlyFields());
    setAutofilledCase(null);
    setNoMatchWarning(false);
  };

  const handlePeriodoChange = (value: string) => {
    setPeriodoSeleccionado(value);
  };

  const handleTipoComisionMILAChange = (value: 'administrativa' | 'custodia') => {
    setTipoComisionMILA(value);
    setProveedorMILA('');
    setFilasCustodia(FILAS_CUSTODIA_LABELS.map(emptyFilaCustodia));
    setPagoFacilND({
      ...emptyFormData,
      proveedor: value === 'custodia' ? 'BBH' : '',
    });
  };

  // ─── Efecto de precarga FLAR ─────────────────────────

  useEffect(() => {
    if (portafolio !== 'FLAR') return;
    if (proveedoresSeleccionados.length === 0 || !periodoSeleccionado) return;

    const caseEntry = findCase('FLAR', proveedoresSeleccionados, periodoSeleccionado);

    if (!caseEntry) {
      setNoMatchWarning(true);
      setAutofilledCase(null);
      setPagoFacilND({
        ...emptyFormData,
        proveedor: proveedoresSeleccionados.join(' + '),
      });
      setReadonlyFields(getDefaultReadonlyFields());
      toast.warning('No se encontró caso en índice (solo prototipo). Modo manual activado.');
      return;
    }

    const result = buildAutofillFromCase(caseEntry, proveedoresSeleccionados);
    if (!result) {
      toast.error('Error al procesar datos del caso');
      return;
    }

    setNoMatchWarning(false);
    setAutofilledCase(result.casoLabel);
    setPagoFacilND(prev => ({ ...prev, ...result.fields }));
    setReadonlyFields(result.readonlyFields);
    toast.success(`Datos cargados: ${result.casoLabel}`);
  }, [portafolio, proveedoresSeleccionados, periodoSeleccionado]);

  // ─── Recalcular grilla custodia cuando cambia TC SUNAT ─────
  useEffect(() => {
    if (portafolio !== 'MILA' || tipoComisionMILA !== 'custodia') return;
    setFilasCustodia(prev => prev.map(fila => recalcFilaCustodia(fila, pagoFacilND.tcSunatVenta)));
  }, [pagoFacilND.tcSunatVenta]);

  // ─── Update field con recálculos ─────────────────────

  const updateField = <K extends keyof PagoFacilND>(field: K, value: PagoFacilND[K]) => {
    setPagoFacilND(prev => {
      const updated = { ...prev, [field]: value };

      // Solo recalcular factura individual si NO es custodia MILA
      if (!(portafolio === 'MILA' && tipoComisionMILA === 'custodia')) {
        if (field === 'baseUsd') {
          updated.igvUsd = Number((Number(value) * 0.18).toFixed(2));
        }

        if (field === 'igvUsd' || field === 'tcSunatVenta' || field === 'baseUsd') {
          updated.igvSoles = Number((updated.igvUsd * updated.tcSunatVenta).toFixed(2));
          updated.totalIgvSoles = Math.round(updated.igvSoles);
          updated.redondeo = Number((updated.totalIgvSoles - updated.igvSoles).toFixed(2));
          updated.importePagarSoles = updated.totalIgvSoles;
          updated.totalFacturaSoles = Number((updated.baseUsd * updated.tcSunatVenta).toFixed(2));
        }
      }

      return updated;
    });
  };

  // ─── Custodia: recalc helpers ─────────────────────────

  const recalcFilaCustodia = (fila: FilaCustodia, tc: number): FilaCustodia => {
    const igvUsd = Number((fila.baseUsd * 0.18).toFixed(2));
    const igvSoles = Number((igvUsd * tc).toFixed(2));
    const totalIgvSoles = Math.round(igvSoles);
    const redondeo = Number((totalIgvSoles - igvSoles).toFixed(2));
    return { ...fila, igvUsd, igvSoles, totalIgvSoles, redondeo };
  };

  const updateFilaCustodia = (index: number, field: 'facturaNro' | 'baseUsd', value: string | number) => {
    setFilasCustodia(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'baseUsd') {
        updated[index] = recalcFilaCustodia(updated[index], pagoFacilND.tcSunatVenta);
      }
      return updated;
    });
  };

  // Totales custodia consolidados
  const totalesCustodia = useMemo(() => {
    const totalBaseUsd = filasCustodia.reduce((s, f) => s + f.baseUsd, 0);
    const totalIgvUsd = filasCustodia.reduce((s, f) => s + f.igvUsd, 0);
    const totalIgvSolesEntero = filasCustodia.reduce((s, f) => s + f.totalIgvSoles, 0);
    const totalRedondeo = filasCustodia.reduce((s, f) => s + f.redondeo, 0);
    return { totalBaseUsd, totalIgvUsd, totalIgvSolesEntero, totalRedondeo: Number(totalRedondeo.toFixed(2)) };
  }, [filasCustodia]);

  // Sincronizar importePagarSoles con totales custodia
  useEffect(() => {
    if (portafolio === 'MILA' && tipoComisionMILA === 'custodia') {
      setPagoFacilND(prev => ({
        ...prev,
        importePagarSoles: totalesCustodia.totalIgvSolesEntero,
        baseUsd: totalesCustodia.totalBaseUsd,
        igvUsd: totalesCustodia.totalIgvUsd,
        igvSoles: filasCustodia.reduce((s, f) => s + f.igvSoles, 0),
        totalIgvSoles: totalesCustodia.totalIgvSolesEntero,
        redondeo: totalesCustodia.totalRedondeo,
      }));
    }
  }, [totalesCustodia, portafolio, tipoComisionMILA]);

  // ─── Formato ─────────────────────────────────────────

  const formatNumber = (num: number, decimals: number = 2) =>
    num.toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const formatRedondeo = (num: number) => {
    const abs = Math.abs(num);
    const formatted = abs.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num < 0 ? `(${formatted})` : formatted;
  };

  const formatMiles = (num: number, decimals: number = 2) =>
    num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const parseMiles = (val: string): number => {
    const cleaned = val.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    const [year, month, day] = fecha.split('-');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`;
  };

  const getMesAño = () => {
    if (!pagoFacilND.periodoTributario) return '';
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const val = pagoFacilND.periodoTributario.trim();
    if (val.includes('-')) {
      const [mes, año] = val.split('-');
      const mesIdx = parseInt(mes) - 1;
      return meses[mesIdx] ? `${meses[mesIdx]} DE ${año}` : val;
    }
    if (val.length === 6) {
      let mesNum = parseInt(val.substring(0, 2));
      let año = val.substring(2);
      if (mesNum < 1 || mesNum > 12) {
        año = val.substring(0, 4);
        mesNum = parseInt(val.substring(4));
      }
      return meses[mesNum - 1] ? `${meses[mesNum - 1]} DE ${año}` : val;
    }
    return val;
  };

  // ─── Validación ──────────────────────────────────────

  const periodoTributarioRegex = /^(0[1-9]|1[0-2])-\d{4}$/;
  const isPeriodoTributarioValid = periodoTributarioRegex.test(pagoFacilND.periodoTributario.trim());

  // Validación diferenciada MILA vs FLAR
  const camposRequeridos = useMemo(() => {
    const base = {
      portafolio: !!portafolio,
      fechaPagoServicio: !!pagoFacilND.fechaPagoServicio,
      periodoTributario: isPeriodoTributarioValid,
      tcSunat: pagoFacilND.tcSunatVenta > 0,
      expediente: !!pagoFacilND.expedienteNro,
    };

    if (portafolio === 'MILA') {
      if (tipoComisionMILA === 'administrativa') {
        return {
          ...base,
          tipoComision: true,
          proveedorMILA: !!proveedorMILA,
          facturaNro: !!pagoFacilND.facturaNro,
          baseUsd: pagoFacilND.baseUsd > 0,
        };
      }
      if (tipoComisionMILA === 'custodia') {
        // Al menos 1 fila completa
        const alMenosUnaFila = filasCustodia.some(f => !!f.facturaNro && f.baseUsd > 0);
        return {
          ...base,
          tipoComision: true,
          custodiaFilas: alMenosUnaFila,
        };
      }
      // MILA sin tipo comisión
      return { ...base, tipoComision: false };
    }

    // FLAR
    return {
      ...base,
      proveedores: proveedoresSeleccionados.length > 0,
      facturaNro: !!pagoFacilND.facturaNro,
      baseUsd: pagoFacilND.baseUsd > 0,
    };
  }, [portafolio, pagoFacilND, isPeriodoTributarioValid, tipoComisionMILA, proveedorMILA, proveedoresSeleccionados, filasCustodia]);

  const canPreview = Object.values(camposRequeridos).every(Boolean);

  const getMissingFields = () => {
    const labels: Record<string, string> = {
      portafolio: 'Portafolio',
      proveedores: 'Proveedor(es)',
      proveedorMILA: 'Proveedor',
      fechaPagoServicio: 'Fecha Pago Servicio',
      periodoTributario: 'Periodo Tributario (formato MM-YYYY)',
      tcSunat: 'TC SUNAT',
      baseUsd: 'Total Factura US$',
      facturaNro: 'Factura Nro',
      expediente: 'Expediente Nro',
      tipoComision: 'Tipo de Comisión',
      custodiaFilas: 'Al menos 1 fila completa (Nro Factura + Base USD)',
    };
    return Object.entries(camposRequeridos)
      .filter(([, ok]) => !ok)
      .map(([key]) => labels[key] || key);
  };

  // ─── Helpers para readonly UI ────────────────────────

  const isReadonly = (field: string) => readonlyFields[field] === true;
  const fieldBg = (field: string) => isReadonly(field) ? 'bg-muted' : 'bg-white';

  // ─── Es MILA activo ──────────────────────────────────
  const isMILA = portafolio === 'MILA';
  const isCustodia = isMILA && tipoComisionMILA === 'custodia';
  const isAdministrativa = isMILA && tipoComisionMILA === 'administrativa';

  // ─── Export PDF ──────────────────────────────────────

  const handleExportPDF = () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    const filename = `PagoFacil_ND_${pagoFacilND.periodoTributario}.pdf`;

    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['css'] as const },
    };

    const worker: any = html2pdf().set(opt).from(element).toPdf();
    worker
      .get('pdf')
      .then((pdf: any) => {
        if (pdf?.internal?.getNumberOfPages && pdf.internal.getNumberOfPages() === 3) {
          pdf.deletePage(2);
        }
      })
      .then(() => worker.save());
  };

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Pago Fácil – IGV No Domiciliado (1041)</h1>

        {/* ═══ Sección 0: Selección de Caso ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selección de Caso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Portafolio */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Portafolio *</Label>
                <Select value={portafolio} onValueChange={(v) => handlePortafolioChange(v as 'FLAR' | 'MILA')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar portafolio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAR">FLAR</SelectItem>
                    <SelectItem value="MILA">MILA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo FLAR (solo FLAR) */}
              {portafolio === 'FLAR' && (
                <div className="space-y-2">
                  <Label className="font-semibold">Tipo FLAR *</Label>
                  <Select value={tipoFLAR} onValueChange={handleTipoFLARChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conjunto">Conjunto (Allspring + Wellington)</SelectItem>
                      <SelectItem value="allspring">Solo Allspring</SelectItem>
                      <SelectItem value="wellington">Solo Wellington</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Periodo (solo FLAR con tipo seleccionado) */}
              {portafolio === 'FLAR' && tipoFLAR && (
                <div className="space-y-2">
                  <Label className="font-semibold">Periodo (YYYYMM) <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                  <Select value={periodoSeleccionado} onValueChange={handlePeriodoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={periodosDisponibles.length === 0 ? 'Sin periodos disponibles' : 'Seleccionar periodo'} />
                    </SelectTrigger>
                    <SelectContent>
                      {periodosDisponibles.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tipo Comisión MILA */}
              {isMILA && (
                <div className="space-y-2">
                  <Label className="font-semibold">Tipo de Comisión *</Label>
                  <Select value={tipoComisionMILA} onValueChange={(v) => handleTipoComisionMILAChange(v as 'administrativa' | 'custodia')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrativa">Administrativa</SelectItem>
                      <SelectItem value="custodia">Custodia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Proveedor único MILA Administrativa */}
              {isAdministrativa && (
                <div className="space-y-2">
                  <Label className="font-semibold">Proveedor *</Label>
                  <Select value={proveedorMILA} onValueChange={(v) => {
                    setProveedorMILA(v);
                    updateField('proveedor', v);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BBVA">BBVA</SelectItem>
                      <SelectItem value="BCP">BCP</SelectItem>
                      <SelectItem value="COMPASS">COMPASS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Proveedor Cabecera BBH (custodia) */}
            {isCustodia && (
              <div className="space-y-2">
                <Label className="font-semibold">Proveedor Cabecera</Label>
                <Input value="BBH" readOnly className="bg-muted max-w-xs" />
              </div>
            )}

            {/* Status badges */}
            <div className="flex gap-2 flex-wrap">
              {portafolio && <Badge variant="outline">{portafolio}</Badge>}
              {isMILA && tipoComisionMILA && (
                <Badge variant="secondary">{tipoComisionMILA === 'administrativa' ? 'Administrativa' : 'Custodia'}</Badge>
              )}
              {proveedoresSeleccionados.length > 0 && (
                <Badge variant="secondary">{proveedoresSeleccionados.join(' + ')}</Badge>
              )}
              {periodoSeleccionado && <Badge variant="secondary">{periodoSeleccionado}</Badge>}
              {autofilledCase && <Badge className="bg-green-100 text-green-800 border-green-300">✓ {autofilledCase}</Badge>}
              {noMatchWarning && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Sin match — modo manual
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ═══ Sección 1: Datos Tributarios ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos Tributarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periodo Tributario *</Label>
                <Input
                  value={pagoFacilND.periodoTributario}
                  onChange={(e) => updateField('periodoTributario', e.target.value)}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (/^\d{6}$/.test(val)) {
                      const yyyy = val.substring(0, 4);
                      const mm = val.substring(4);
                      if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
                        updateField('periodoTributario', `${mm}-${yyyy}`);
                      }
                    }
                  }}
                  readOnly={isReadonly('periodoTributario')}
                  className={`${fieldBg('periodoTributario')} ${pagoFacilND.periodoTributario && !isPeriodoTributarioValid ? 'border-destructive' : ''}`}
                  placeholder="MM-YYYY"
                />
                {pagoFacilND.periodoTributario && !isPeriodoTributarioValid && (
                  <p className="text-sm text-destructive">Formato MM-YYYY (ej. 10-2025)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Código Tributo</Label>
                <Input value={pagoFacilND.codigoTributo} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Tributo</Label>
                <Input value={pagoFacilND.tributo} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Importe a Pagar S/</Label>
                <Input
                  type="text"
                  value={formatMiles(pagoFacilND.importePagarSoles)}
                  readOnly
                  className="bg-muted font-bold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Sección 2: Datos del Documento ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Factura Nro: solo si NO es custodia (custodia usa grilla) */}
              {!isCustodia && (
                <div className="space-y-2">
                  <Label>Factura Nro *</Label>
                  <Input
                    value={pagoFacilND.facturaNro}
                    onChange={(e) => updateField('facturaNro', e.target.value)}
                    readOnly={isReadonly('facturaNro')}
                    className={fieldBg('facturaNro')}
                  />
                </div>
              )}
              {/* Proveedor: FLAR editable/readonly, MILA autocompletado readonly */}
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input
                  value={isMILA ? (isCustodia ? 'BBH' : proveedorMILA || '') : pagoFacilND.proveedor}
                  onChange={!isMILA ? (e) => updateField('proveedor', e.target.value) : undefined}
                  readOnly={isMILA || isReadonly('proveedor')}
                  className={isMILA ? 'bg-muted' : fieldBg('proveedor')}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Pago del Servicio *</Label>
                <Input
                  type="date"
                  value={pagoFacilND.fechaPagoServicio}
                  onChange={(e) => updateField('fechaPagoServicio', e.target.value)}
                  readOnly={isReadonly('fechaPagoServicio')}
                  className={fieldBg('fechaPagoServicio')}
                />
              </div>
              <div className="space-y-2">
                <Label>Expediente Nro *</Label>
                <Input
                  value={pagoFacilND.expedienteNro}
                  onChange={(e) => updateField('expedienteNro', e.target.value)}
                  readOnly={isReadonly('expedienteNro')}
                  className={fieldBg('expedienteNro')}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Domicilio</Label>
                <Input
                  value={pagoFacilND.domicilio}
                  onChange={(e) => updateField('domicilio', e.target.value)}
                  placeholder="Ej: Avenida Calle 84 A No 12 -18 Piso 7, Bogotá D.C., Colombia"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Sección 3: Conversión / Cálculo ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversión / Cálculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Orden NO custodia (original): Total Factura, IGV USD, TC Sunat, IGV S/, Redondeo, Total IGV S/, TC SBS, Periodo Comisión, Fecha Emisión ── */}
            {!isCustodia && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Factura US$ *</Label>
                  <Input
                    type="text"
                    value={formatMiles(pagoFacilND.baseUsd)}
                    onChange={(e) => updateField('baseUsd', parseMiles(e.target.value))}
                    readOnly={isReadonly('baseUsd')}
                    className={fieldBg('baseUsd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IGV No Domiciliado US$</Label>
                  <Input type="text" value={formatMiles(pagoFacilND.igvUsd)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>TC Sunat Venta *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={pagoFacilND.tcSunatVenta || ''}
                      onChange={(e) => updateField('tcSunatVenta', Number(e.target.value))}
                      readOnly={isReadonly('tcSunatVenta')}
                      className={fieldBg('tcSunatVenta')}
                    />
                    {pagoFacilND.fechaPagoServicio && (
                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleConsultarTC}>
                        <Search className="h-4 w-4 mr-1" />
                        Consultar TC
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IGV S/ (sin redondeo)</Label>
                  <Input type="text" value={formatMiles(pagoFacilND.igvSoles)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Redondeo</Label>
                  <Input type="text" value={formatRedondeo(pagoFacilND.redondeo)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Total IGV S/ (entero)</Label>
                  <Input type="text" value={formatMiles(pagoFacilND.totalIgvSoles, 0)} readOnly className="bg-muted font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>TC SBS</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={pagoFacilND.tcSbs || ''}
                    onChange={(e) => updateField('tcSbs', Number(e.target.value))}
                    readOnly={isReadonly('tcSbs')}
                    className={fieldBg('tcSbs')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Periodo Comisión</Label>
                  <Input
                    value={pagoFacilND.periodoComision}
                    onChange={(e) => updateField('periodoComision', e.target.value)}
                    readOnly={isReadonly('periodoComision')}
                    className={fieldBg('periodoComision')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Emisión Lima</Label>
                  <Input
                    type="date"
                    value={pagoFacilND.fechaEmisionLima}
                    onChange={(e) => updateField('fechaEmisionLima', e.target.value)}
                    readOnly={isReadonly('fechaEmisionLima')}
                    className={fieldBg('fechaEmisionLima')}
                  />
                </div>
              </div>
            )}

            {/* ── Custodia: TCs primero, luego grilla ── */}
            {isCustodia && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>TC Sunat Venta *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        value={pagoFacilND.tcSunatVenta || ''}
                        onChange={(e) => updateField('tcSunatVenta', Number(e.target.value))}
                        className="bg-white"
                      />
                      {pagoFacilND.fechaPagoServicio && (
                        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleConsultarTC}>
                          <Search className="h-4 w-4 mr-1" />
                          Consultar TC
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>TC SBS</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={pagoFacilND.tcSbs || ''}
                      onChange={(e) => updateField('tcSbs', Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Periodo Comisión</Label>
                    <Input
                      value={pagoFacilND.periodoComision}
                      onChange={(e) => updateField('periodoComision', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Emisión Lima</Label>
                    <Input
                      type="date"
                      value={pagoFacilND.fechaEmisionLima}
                      onChange={(e) => updateField('fechaEmisionLima', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-4">
                  <Label className="font-semibold text-base">Facturas por Proveedor (Custodia)</Label>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Proveedor</TableHead>
                          <TableHead className="w-[160px]">Nro Factura</TableHead>
                          <TableHead className="w-[140px] text-right">Base USD</TableHead>
                          <TableHead className="w-[120px] text-right">IGV USD (18%)</TableHead>
                          <TableHead className="w-[140px] text-right">IGV S/ sin red.</TableHead>
                          <TableHead className="w-[120px] text-right">Total IGV S/</TableHead>
                          <TableHead className="w-[100px] text-right">Redondeo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filasCustodia.map((fila, idx) => (
                          <TableRow key={fila.proveedor}>
                            <TableCell className="font-medium">{fila.proveedor}</TableCell>
                            <TableCell>
                              <Input
                                value={fila.facturaNro}
                                onChange={(e) => updateFilaCustodia(idx, 'facturaNro', e.target.value)}
                                className="bg-white h-8"
                                placeholder="Nro"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={fila.baseUsd ? formatMiles(fila.baseUsd) : ''}
                                onChange={(e) => updateFilaCustodia(idx, 'baseUsd', parseMiles(e.target.value))}
                                className="bg-white h-8 text-right"
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatMiles(fila.igvUsd)}</TableCell>
                            <TableCell className="text-right font-mono">{formatMiles(fila.igvSoles)}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{formatMiles(fila.totalIgvSoles, 0)}</TableCell>
                            <TableCell className="text-right font-mono">{formatRedondeo(fila.redondeo)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold">
                          <TableCell colSpan={2}>TOTALES</TableCell>
                          <TableCell className="text-right">{formatMiles(totalesCustodia.totalBaseUsd)}</TableCell>
                          <TableCell className="text-right">{formatMiles(totalesCustodia.totalIgvUsd)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">{formatMiles(totalesCustodia.totalIgvSolesEntero, 0)}</TableCell>
                          <TableCell className="text-right">{formatRedondeo(totalesCustodia.totalRedondeo)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══ Footer ═══ */}
        <div className="flex justify-center gap-3 py-4 border-t border-border bg-muted/30 rounded-lg">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a selección
          </Button>
          <Button
            onClick={() => {
              if (!canPreview) {
                const missing = getMissingFields();
                toast.error(`Campos faltantes: ${missing.join(', ')}`);
                return;
              }
              setModalOpen(true);
            }}
            className="gap-2"
            disabled={!portafolio}
          >
            <FileText className="h-4 w-4" />
            Previsualizar Pago Fácil 1041
          </Button>
        </div>
      </div>

      {/* ═══ Modal Preview (sin cambios) ═══ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa - Pago Fácil 1041</DialogTitle>
          </DialogHeader>

          <div id="print-area" style={{ backgroundColor: 'white' }}>
            {/* HOJA 1: Pago Fácil */}
            <div className="pdf-page" style={{ width: '210mm', height: '297mm', padding: '8mm', boxSizing: 'border-box', backgroundColor: 'white', pageBreakAfter: 'always' }}>
              <div className="border-2 border-black p-6 h-full" style={{ boxSizing: 'border-box' }}>
                <div className="border border-black p-4 mb-6">
                  <p className="font-bold text-lg">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES</p>
                  <p>RUC: 20421413216</p>
                </div>

                <h2 className="text-center font-bold text-xl mb-8">SISTEMA DE PAGO FÁCIL</h2>

                <div className="flex justify-between mb-6">
                  <div className="border border-black p-2 text-center w-1/3">
                    <p className="text-sm border-b border-black pb-1 mb-2">PERIODO TRIBUTARIO</p>
                    <p className="font-bold text-lg">{pagoFacilND.periodoTributario}</p>
                  </div>
                  <div className="border border-black p-2 text-center w-1/3 mx-4">
                    <p className="text-sm border-b border-black pb-1 mb-2">CODIGO DEL TRIBUTO</p>
                    <p className="font-bold">{pagoFacilND.codigoTributo}</p>
                    <p className="text-sm">{pagoFacilND.tributo}</p>
                  </div>
                  <div className="border border-black p-2 text-center w-1/3">
                    <p className="text-sm border-b border-black pb-1 mb-2">IMPORTE A PAGAR S/.</p>
                    <p className="font-bold text-lg">{formatNumber(pagoFacilND.importePagarSoles, 2)}</p>
                  </div>
                </div>

                <div className="flex justify-end mb-8">
                  <div className="flex items-center">
                    <span className="border border-black px-3 py-1 font-bold bg-gray-100">TOTAL S/.</span>
                    <span className="border border-black px-4 py-1 font-bold text-lg">{formatNumber(pagoFacilND.importePagarSoles, 2)}</span>
                  </div>
                </div>

                <div className="mb-6 space-y-1">
                  {isCustodia ? (
                    <p><span className="font-bold">Factura Nros</span> : {filasCustodia.map(f => f.facturaNro || '—').join('     ')}</p>
                  ) : (
                    <p><span className="font-bold">Factura Nro</span> : {pagoFacilND.facturaNro}</p>
                  )}
                  <p><span className="font-bold">Proveedor</span> : {pagoFacilND.proveedor}</p>
                  {pagoFacilND.domicilio && (
                    <p><span className="font-bold">Domicilio</span> : {pagoFacilND.domicilio}</p>
                  )}
                  <p><span className="font-bold">Fecha Pago del Servicio</span> : {formatFecha(pagoFacilND.fechaPagoServicio)}</p>
                </div>

                <div className="mb-6 space-y-1">
                  <p><span className="font-bold">Importe en Dólares</span> : {formatNumber(pagoFacilND.igvUsd, 2)}</p>
                  <p><span className="font-bold">T.C.P.P.Vta Publicado</span></p>
                  <p><span className="font-bold">SUNAT</span> : {pagoFacilND.tcSunatVenta.toFixed(3)}</p>
                </div>

                <div className="mb-8">
                  <p><span className="font-bold">Expediente Nro</span> : {pagoFacilND.expedienteNro}</p>
                </div>

                <div className="border border-black p-6 mt-auto" style={{ minHeight: '120px' }}>
                  <p className="text-right mb-16">Lima, {formatFecha(pagoFacilND.fechaEmisionLima)}</p>
                  <div className="flex justify-between mt-8">
                    <div className="text-center">
                      <div className="border-t border-black w-48 mb-1"></div>
                      <p className="font-bold">Elaborado</p>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-black w-48 mb-1"></div>
                      <p className="font-bold">V° B°</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HOJA 2: Liquidación */}
            <div className="pdf-page" style={{ width: '210mm', height: '297mm', padding: '8mm', boxSizing: 'border-box', backgroundColor: 'white' }}>
              <div className="border-2 border-black p-6 h-full" style={{ boxSizing: 'border-box' }}>
                <div className="mb-6">
                  <p className="font-bold text-lg">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES</p>
                  <p>RUC: 20421413216</p>
                </div>

                <div className="border border-black p-4 mb-6 text-center">
                  <p className="font-bold">LIQUIDACIÓN DEL IMPUESTO GENERAL A LAS VENTAS</p>
                  <p className="font-bold mt-2">NO DOMICILIADOS</p>
                  <p className="font-bold mt-2">MES DE {getMesAño()}</p>
                  <p>(En Soles)</p>
                </div>

                {isCustodia ? (
                  /* ═══ HOJA 2 CUSTODIA: Desglose por proveedor ═══ */
                  <div style={{ fontSize: '10.5px', lineHeight: '1.35' }}>
                    <p className="mb-2">Por concepto de servicio de custodia del Portafolio MILA llevado a cabo por Brown Brothers Harriman (BBH).</p>

                    <div className="mb-2">
                      <p><span className="font-bold">Proveedor</span> : Brown Brothers Harriman</p>
                      {pagoFacilND.domicilio && (
                        <p><span className="font-bold">Domicilio</span> : {pagoFacilND.domicilio}</p>
                      )}
                    </div>

                    <div className="mb-2">
                      <p><span className="font-bold">Expediente N°</span> : {pagoFacilND.expedienteNro}</p>
                      <p><span className="font-bold">Fecha pago del Servicio</span> : {formatFecha(pagoFacilND.fechaPagoServicio)}</p>
                    </div>

                    <div className="flex gap-8 mb-3">
                      <div>
                        <p><span className="font-bold">T.C.P.P.Venta</span></p>
                        <p><span className="font-bold">Publicado - SUNAT</span> : {pagoFacilND.tcSunatVenta.toFixed(3)}</p>
                      </div>
                      <div>
                        <p><span className="font-bold">T.C.P.P.</span></p>
                        <p><span className="font-bold">Vigente - SBS</span> : {pagoFacilND.tcSbs.toFixed(3)}</p>
                      </div>
                    </div>

                    {/* Desglose por cada fila/proveedor */}
                    {filasCustodia.filter(f => f.facturaNro || f.baseUsd > 0).map((fila, idx) => {
                      const totalFacturaUsd = fila.baseUsd + fila.igvUsd;
                      const totalFacturaSoles = Number((totalFacturaUsd * pagoFacilND.tcSunatVenta).toFixed(2));
                      return (
                        <div key={idx} className="mb-2">
                          <p><span className="font-bold">Factura N°</span> : {fila.facturaNro}</p>
                          <p className="font-bold">{fila.proveedor}:</p>
                          <p className="font-bold">{fila.proveedor}:</p>

                          <div className="ml-4 mt-1 space-y-0">
                            <div className="flex justify-between items-center">
                              <div className="border border-black px-2 py-0 font-bold" style={{ fontSize: '10px' }}>{pagoFacilND.periodoComision || '—'}</div>
                              <div className="text-right">
                                <span className="font-bold mr-4">US$</span>
                                <span className="font-bold">{formatNumber(fila.baseUsd, 2)}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <p>Impuesto General a las Ventas - No Domiciliados</p>
                              <div className="text-right">
                                <span className="font-bold mr-4">US$</span>
                                <span className="font-bold">{formatNumber(fila.igvUsd, 2)}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <p><span className="font-bold">Total Factura US$</span> : {formatNumber(fila.baseUsd, 2)}    <span className="font-bold">S/</span> : {formatNumber(totalFacturaSoles, 2)}</p>
                            </div>

                            <div className="flex justify-between items-center">
                              <p>Impuesto General a las Ventas No Domiciliados</p>
                              <div className="flex items-center">
                                <span className="px-1">S/</span>
                                <span className="px-2 font-bold">{formatNumber(fila.igvSoles, 2)}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <p>Redondeo</p>
                              <div className="flex items-center">
                                <span className="px-1">S/</span>
                                <span className="px-2">{formatRedondeo(fila.redondeo)}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <p className="font-bold">Subtotal Impuesto General a las Ventas No domiciliados</p>
                              <div className="flex items-center">
                                <span className="border border-black px-1 font-bold">S/</span>
                                <span className="border border-black px-2 font-bold">{formatNumber(fila.totalIgvSoles, 2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Totales generales */}
                    <div className="border-t-2 border-black pt-2 space-y-1 mt-2">
                      <div className="flex justify-between items-center">
                        <p className="font-bold">Total Impuesto General a las Ventas - No Domiciliados 18%</p>
                        <div className="flex items-center">
                          <span className="border border-black px-1 font-bold">US$</span>
                          <span className="border border-black px-2 font-bold">{formatNumber(totalesCustodia.totalIgvUsd, 2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-bold">Total Impuesto General a las Ventas - No Domiciliados 18%</p>
                        <div className="flex items-center">
                          <span className="border border-black px-1 font-bold">S/</span>
                          <span className="border border-black px-2 font-bold">{formatNumber(totalesCustodia.totalIgvSolesEntero, 2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ═══ HOJA 2 ESTÁNDAR (FLAR / MILA Administrativa) ═══ */
                  <>
                    <p className="mb-6">Por concepto de administración del Portafolio {portafolio || 'FLAR'} llevado a cabo por {pagoFacilND.proveedor}.</p>

                    <div className="space-y-1 mb-6">
                      <p><span className="font-bold">Proveedor</span> : {pagoFacilND.proveedor}</p>
                      {pagoFacilND.domicilio && (
                        <p><span className="font-bold">Domicilio</span> : {pagoFacilND.domicilio}</p>
                      )}
                      <p><span className="font-bold">Factura N°</span> : {pagoFacilND.facturaNro}</p>
                      <p><span className="font-bold">Expediente</span> : {pagoFacilND.expedienteNro}</p>
                      <p><span className="font-bold">Fecha pago del Servicio</span> : {formatFecha(pagoFacilND.fechaPagoServicio)}</p>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <div className="border border-black px-4 py-2 bg-gray-100 font-bold">{pagoFacilND.periodoComision || '—'}</div>
                      <div className="text-right">
                        <span className="font-bold mr-4">US$</span>
                        <span className="font-bold">{formatNumber(pagoFacilND.baseUsd, 2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                      <p>Impuesto General a las Ventas - No Domiciliados</p>
                      <div className="text-right">
                        <span className="font-bold mr-4">US$</span>
                        <span className="font-bold">{formatNumber(pagoFacilND.igvUsd, 2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p><span className="font-bold">T.C.P.P.Venta</span></p>
                      <p><span className="font-bold">Publicado - SUNAT</span> : {pagoFacilND.tcSunatVenta.toFixed(3)}</p>
                      <p className="mt-4"><span className="font-bold">T.C.P.P.C.</span></p>
                      <p><span className="font-bold">Vigente - SBS</span> : {pagoFacilND.tcSbs.toFixed(3)}</p>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p><span className="font-bold">Total Factura US$</span> : {formatNumber(pagoFacilND.baseUsd, 2)}</p>
                      <p><span className="font-bold">Total Factura S/</span> : {formatNumber(pagoFacilND.totalFacturaSoles, 2)}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="font-bold">Impuesto General a las Ventas No Domiciliados</p>
                        <div className="flex items-center">
                          <span className="border border-black px-2 py-1">S/</span>
                          <span className="border border-black px-4 py-1 font-bold">{formatNumber(pagoFacilND.igvSoles, 2)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="font-bold">Redondeo</p>
                        <div className="flex items-center">
                          <span className="px-2 py-1">S/</span>
                          <span className="px-4 py-1">{formatRedondeo(pagoFacilND.redondeo)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="font-bold">Total Impuesto General a las Ventas No Domiciliados 18%</p>
                        <div className="flex items-center">
                          <span className="border border-black px-2 py-1 bg-gray-100 font-bold">S/</span>
                          <span className="border border-black px-4 py-1 font-bold text-lg">{formatNumber(pagoFacilND.totalIgvSoles, 2)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer del Modal */}
          <div className="flex justify-center gap-3 py-4 border-t border-border bg-muted/30 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Liquidación
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={() => {
              setModalOpen(false);
              navigate('/devengado-igv', {
                state: {
                  fromPagoFacilND: true,
                  pagoFacilNDData: pagoFacilND,
                  portafolio,
                  proveedoresSeleccionados,
                }
              });
            }} className="gap-2">
              <FileText className="h-4 w-4" />
              Generar devengado IGV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Modal Consulta Tipo de Cambio ═══ */}
      <Dialog open={tcModalOpen} onOpenChange={setTcModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tcModalData?.sunat || tcModalData?.sbs
                ? `Tipo de Cambio para ${tcModalData?.fecha}`
                : 'Consulta Tipo de Cambio'}
            </DialogTitle>
          </DialogHeader>

          {tcModalData?.sunat || tcModalData?.sbs ? (
            <div className="space-y-4">
              {tcModalData.sunat && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">SUNAT (Publicado)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Compra:</span>
                    <span className="font-mono font-medium">{tcModalData.sunat.compra}</span>
                    <span className="text-muted-foreground">Venta:</span>
                    <span className="font-mono font-medium">{tcModalData.sunat.venta}</span>
                  </div>
                </div>
              )}
              {tcModalData?.sbs && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">SBS (Cierre día anterior {tcModalData.fechaAnterior})</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Compra:</span>
                    <span className="font-mono font-medium">{tcModalData.sbs.compra}</span>
                    <span className="text-muted-foreground">Venta:</span>
                    <span className="font-mono font-medium">{tcModalData.sbs.venta}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground italic">
                El tipo de cambio SUNAT corresponde al cierre SBS del día anterior.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se encontró tipo de cambio cargado para la fecha seleccionada. Puede ingresar el TC manualmente.
            </p>
          )}

          <DialogFooter className="gap-2">
            {tcModalData?.sunat && (
              <Button onClick={handleUsarVentaSunat}>
                Usar Venta SUNAT
              </Button>
            )}
            <Button variant="outline" onClick={() => setTcModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
