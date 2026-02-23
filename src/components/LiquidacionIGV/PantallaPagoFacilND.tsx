import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, FileText, Printer, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import {
  getProveedoresFLAR,
  PROVEEDORES_MILA,
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

// ─── Componente principal ────────────────────────────────

export function PantallaPagoFacilND() {
  const navigate = useNavigate();

  // Selección cascada
  const [portafolio, setPortafolio] = useState<'FLAR' | 'MILA' | ''>('');
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');

  // Datos del formulario
  const [pagoFacilND, setPagoFacilND] = useState<PagoFacilND>(emptyFormData);
  const [readonlyFields, setReadonlyFields] = useState<Record<string, boolean>>(getDefaultReadonlyFields());
  const [autofilledCase, setAutofilledCase] = useState<string | null>(null);
  const [noMatchWarning, setNoMatchWarning] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  // Listas dinámicas
  const proveedoresDisponibles = useMemo(() => {
    if (portafolio === 'FLAR') return getProveedoresFLAR();
    if (portafolio === 'MILA') return PROVEEDORES_MILA;
    return [];
  }, [portafolio]);

  const periodosDisponibles = useMemo(() => {
    if (portafolio === 'FLAR') return getPeriodosFLAR();
    return [];
  }, [portafolio]);

  // ─── Eventos de selección ────────────────────────────

  const handlePortafolioChange = (value: 'FLAR' | 'MILA') => {
    setPortafolio(value);
    setProveedoresSeleccionados([]);
    setPeriodoSeleccionado('');
    setPagoFacilND(emptyFormData);
    setReadonlyFields(getDefaultReadonlyFields());
    setAutofilledCase(null);
    setNoMatchWarning(false);
  };

  const handleProveedorToggle = (prov: string) => {
    setProveedoresSeleccionados(prev => {
      const next = prev.includes(prov) ? prev.filter(p => p !== prov) : [...prev, prov];
      return next;
    });
    // No precargar aún, falta periodo
    setAutofilledCase(null);
    setNoMatchWarning(false);
  };

  const handlePeriodoChange = (value: string) => {
    setPeriodoSeleccionado(value);
  };

  // ─── Efecto de precarga FLAR ─────────────────────────

  useEffect(() => {
    if (portafolio !== 'FLAR') return;
    if (proveedoresSeleccionados.length === 0 || !periodoSeleccionado) return;

    const caseEntry = findCase('FLAR', proveedoresSeleccionados, periodoSeleccionado);

    if (!caseEntry) {
      setNoMatchWarning(true);
      setAutofilledCase(null);
      // Dejar editable (modo manual dentro de FLAR)
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

  // ─── Update field con recálculos ─────────────────────

  const updateField = <K extends keyof PagoFacilND>(field: K, value: PagoFacilND[K]) => {
    setPagoFacilND(prev => {
      const updated = { ...prev, [field]: value };

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

      return updated;
    });
  };

  // ─── Formato ─────────────────────────────────────────

  const formatNumber = (num: number, decimals: number = 2) =>
    num.toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const formatRedondeo = (num: number) => {
    const abs = Math.abs(num);
    const formatted = abs.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num < 0 ? `(${formatted})` : formatted;
  };

  // Máscara de miles: 143049.31 → "143,049.31"
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
    const [mes, año] = pagoFacilND.periodoTributario.split('-');
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${meses[parseInt(mes) - 1]} DE ${año}`;
  };

  // ─── Validación ──────────────────────────────────────

  const camposRequeridos = {
    portafolio: !!portafolio,
    proveedores: proveedoresSeleccionados.length > 0,
    periodo: portafolio === 'MILA' || !!periodoSeleccionado,
    fechaPagoServicio: !!pagoFacilND.fechaPagoServicio,
    periodoTributario: !!pagoFacilND.periodoTributario,
    tcSunat: pagoFacilND.tcSunatVenta > 0,
    baseUsd: pagoFacilND.baseUsd > 0,
    facturaNro: !!pagoFacilND.facturaNro,
    expediente: !!pagoFacilND.expedienteNro,
  };

  const canPreview = Object.values(camposRequeridos).every(Boolean);

  const getMissingFields = () => {
    const labels: Record<string, string> = {
      portafolio: 'Portafolio',
      proveedores: 'Proveedor(es)',
      periodo: 'Periodo',
      fechaPagoServicio: 'Fecha Pago Servicio',
      periodoTributario: 'Periodo Tributario',
      tcSunat: 'TC SUNAT',
      baseUsd: 'Total Factura US$',
      facturaNro: 'Factura Nro',
      expediente: 'Expediente Nro',
    };
    return Object.entries(camposRequeridos)
      .filter(([, ok]) => !ok)
      .map(([key]) => labels[key]);
  };

  // ─── Helpers para readonly UI ────────────────────────

  const isReadonly = (field: string) => readonlyFields[field] === true;
  const fieldBg = (field: string) => isReadonly(field) ? 'bg-muted' : '';

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

        {/* ═══ Sección 0: Selección Portafolio → Proveedor → Periodo ═══ */}
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
                    <SelectItem value="FLAR">FLAR (Auto)</SelectItem>
                    <SelectItem value="MILA">MILA (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Periodo (solo FLAR) */}
              {portafolio === 'FLAR' && (
                <div className="space-y-2">
                  <Label className="font-semibold">Periodo (YYYYMM) *</Label>
                  <Select value={periodoSeleccionado} onValueChange={handlePeriodoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodosDisponibles.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Proveedores */}
            {portafolio && (
              <div className="space-y-2">
                <Label className="font-semibold">Proveedor(es) * {portafolio === 'FLAR' ? '(puede seleccionar varios)' : ''}</Label>
                <div className="flex flex-wrap gap-3">
                  {proveedoresDisponibles.map(prov => (
                    <label key={prov} className="flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={proveedoresSeleccionados.includes(prov)}
                        onCheckedChange={() => handleProveedorToggle(prov)}
                      />
                      <span className="text-sm font-medium">{prov}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Status badges */}
            <div className="flex gap-2 flex-wrap">
              {portafolio && <Badge variant="outline">{portafolio}</Badge>}
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
                <Label>Periodo Tributario</Label>
                <Input
                  value={pagoFacilND.periodoTributario}
                  onChange={(e) => updateField('periodoTributario', e.target.value)}
                  readOnly={isReadonly('periodoTributario')}
                  className={fieldBg('periodoTributario')}
                  placeholder="MM-YYYY"
                />
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
              <div className="space-y-2">
                <Label>Factura Nro *</Label>
                <Input
                  value={pagoFacilND.facturaNro}
                  onChange={(e) => updateField('facturaNro', e.target.value)}
                  readOnly={isReadonly('facturaNro')}
                  className={fieldBg('facturaNro')}
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input
                  value={pagoFacilND.proveedor}
                  onChange={(e) => updateField('proveedor', e.target.value)}
                  readOnly={isReadonly('proveedor')}
                  className={fieldBg('proveedor')}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversión / Cálculo</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Input
                  type="number"
                  step="0.001"
                  value={pagoFacilND.tcSunatVenta}
                  onChange={(e) => updateField('tcSunatVenta', Number(e.target.value))}
                  readOnly={isReadonly('tcSunatVenta')}
                  className={fieldBg('tcSunatVenta')}
                />
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
                  value={pagoFacilND.tcSbs}
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
              <div className="space-y-2 col-span-2">
                <Label>Fecha Emisión Lima</Label>
                <Input
                  type="date"
                  value={pagoFacilND.fechaEmisionLima}
                  onChange={(e) => updateField('fechaEmisionLima', e.target.value)}
                  readOnly={isReadonly('fechaEmisionLima')}
                  className={`max-w-xs ${fieldBg('fechaEmisionLima')}`}
                />
              </div>
            </div>
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

      {/* ═══ Modal Preview ═══ */}
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
                  <p><span className="font-bold">Factura Nro</span> : {pagoFacilND.facturaNro}</p>
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
    </div>
  );
}
