import { useState } from 'react';
import { ArrowLeft, FileText, Printer, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

export interface PagoFacilND {
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

const initialData: PagoFacilND = {
  periodoTributario: "09-2025",
  codigoTributo: "1041",
  tributo: "IGV NO DOMICILIADO",
  importePagarSoles: 63060,
  facturaNro: "GE/0002499",
  proveedor: "BBVA Asset Management S.A.",
  fechaPagoServicio: "2025-09-16",
  tcSunatVenta: 3.499,
  expedienteNro: "OGR.RF20250000153",
  igvUsd: 18022.28,
  baseUsd: 100123.78,
  totalFacturaSoles: 349331.87,
  igvSoles: 63059.96,
  redondeo: 0.04,
  totalIgvSoles: 63060.00,
  tcSbs: 3.489,
  periodoComision: "Abril - Junio 2025",
  fechaEmisionLima: "2025-09-24"
};

export function PantallaPagoFacilND() {
  const navigate = useNavigate();
  const [pagoFacilND, setPagoFacilND] = useState<PagoFacilND>(initialData);
  const [modalOpen, setModalOpen] = useState(false);

  const updateField = <K extends keyof PagoFacilND>(field: K, value: PagoFacilND[K]) => {
    setPagoFacilND(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate IGV USD when baseUsd changes
      if (field === 'baseUsd') {
        updated.igvUsd = Number((Number(value) * 0.18).toFixed(2));
      }
      
      // Auto-calculate IGV Soles when igvUsd or tcSunatVenta changes
      if (field === 'igvUsd' || field === 'tcSunatVenta' || field === 'baseUsd') {
        updated.igvSoles = Number((updated.igvUsd * updated.tcSunatVenta).toFixed(2));
        updated.totalIgvSoles = Math.round(updated.igvSoles);
        updated.redondeo = Number((updated.totalIgvSoles - updated.igvSoles).toFixed(2));
        updated.importePagarSoles = updated.totalIgvSoles;
      }
      
      return updated;
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatFecha = (fecha: string) => {
    const [year, month, day] = fecha.split('-');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`;
  };

  const getMesAño = () => {
    const [mes, año] = pagoFacilND.periodoTributario.split('-');
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${meses[parseInt(mes) - 1]} DE ${año}`;
  };

  const handleExportPDF = () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    const filename = `PagoFacil_ND_${pagoFacilND.periodoTributario}.pdf`;

    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794 // A4 width in pixels at 96dpi
      },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
      // IMPORTANT: do NOT use `avoid: '.pdf-page'` here, it can cause an extra blank page
      pagebreak: { mode: ['css'] as const }
    };

    const worker: any = html2pdf().set(opt).from(element).toPdf();

    worker
      .get('pdf')
      .then((pdf: any) => {
        // Safety net: if an empty page slips in between, remove it.
        if (pdf?.internal?.getNumberOfPages && pdf.internal.getNumberOfPages() === 3) {
          pdf.deletePage(2);
        }
      })
      .then(() => worker.save());
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header - Título */}
        <h1 className="text-2xl font-bold">Pago Fácil – IGV No Domiciliado (1041)</h1>

        {/* Sección 1: Datos Tributarios */}
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
                  placeholder="MM-YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label>Código Tributo</Label>
                <Input 
                  value={pagoFacilND.codigoTributo} 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Tributo</Label>
                <Input 
                  value={pagoFacilND.tributo} 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Importe a Pagar S/</Label>
                <Input 
                  type="number"
                  value={pagoFacilND.importePagarSoles} 
                  onChange={(e) => updateField('importePagarSoles', Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 2: Datos del Documento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Factura Nro</Label>
                <Input 
                  value={pagoFacilND.facturaNro} 
                  onChange={(e) => updateField('facturaNro', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input 
                  value={pagoFacilND.proveedor} 
                  onChange={(e) => updateField('proveedor', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Pago del Servicio</Label>
                <Input 
                  type="date"
                  value={pagoFacilND.fechaPagoServicio} 
                  onChange={(e) => updateField('fechaPagoServicio', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Expediente Nro</Label>
                <Input 
                  value={pagoFacilND.expedienteNro} 
                  onChange={(e) => updateField('expedienteNro', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Conversión / Cálculo - Orden nuevo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversión / Cálculo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Factura US$</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={pagoFacilND.baseUsd} 
                  onChange={(e) => updateField('baseUsd', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>IGV No Domiciliado US$</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={pagoFacilND.igvUsd} 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>TC Sunat Venta</Label>
                <Input 
                  type="number"
                  step="0.001"
                  value={pagoFacilND.tcSunatVenta} 
                  onChange={(e) => updateField('tcSunatVenta', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>IGV S/ (sin redondeo)</Label>
                <Input 
                  type="number"
                  value={pagoFacilND.igvSoles} 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Redondeo</Label>
                <Input 
                  type="number"
                  value={pagoFacilND.redondeo} 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Total IGV S/ (entero)</Label>
                <Input 
                  type="number"
                  value={pagoFacilND.totalIgvSoles} 
                  readOnly
                  className="bg-muted font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label>TC SBS</Label>
                <Input 
                  type="number"
                  step="0.001"
                  value={pagoFacilND.tcSbs} 
                  onChange={(e) => updateField('tcSbs', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Periodo Comisión</Label>
                <Input 
                  value={pagoFacilND.periodoComision} 
                  onChange={(e) => updateField('periodoComision', e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Fecha Emisión Lima</Label>
                <Input 
                  type="date"
                  value={pagoFacilND.fechaEmisionLima} 
                  onChange={(e) => updateField('fechaEmisionLima', e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer - Barra de botones estilo institucional */}
        <div className="flex justify-center gap-3 py-4 border-t border-border bg-muted/30 rounded-lg">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a selección
          </Button>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recalcular Totales
          </Button>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            Previsualizar Pago Fácil 1041
          </Button>
        </div>
      </div>

      {/* Modal Preview */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa - Pago Fácil 1041</DialogTitle>
          </DialogHeader>
          
          <div id="print-area" style={{ backgroundColor: 'white' }}>
            {/* HOJA 1: Pago Fácil */}
            <div id="page-1" className="pdf-page" style={{ width: '210mm', height: '297mm', padding: '8mm', boxSizing: 'border-box', backgroundColor: 'white', pageBreakAfter: 'always' }}>
              <div className="border-2 border-black p-6 h-full" style={{ boxSizing: 'border-box' }}>
                {/* Header */}
                <div className="border border-black p-4 mb-6">
                  <p className="font-bold text-lg">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES</p>
                  <p>RUC: 20421413216</p>
                </div>

                <h2 className="text-center font-bold text-xl mb-8">SISTEMA DE PAGO FÁCIL</h2>

                {/* Datos principales */}
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

                {/* Total */}
                <div className="flex justify-end mb-8">
                  <div className="flex items-center">
                    <span className="border border-black px-3 py-1 font-bold bg-gray-100">TOTAL S/.</span>
                    <span className="border border-black px-4 py-1 font-bold text-lg">{formatNumber(pagoFacilND.importePagarSoles, 2)}</span>
                  </div>
                </div>

                {/* Datos documento */}
                <div className="mb-6 space-y-1">
                  <p><span className="font-bold">Factura Nro</span> : {pagoFacilND.facturaNro}</p>
                  <p><span className="font-bold">Proveedor</span> : {pagoFacilND.proveedor}</p>
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

                {/* Firma */}
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
            <div id="page-2" className="pdf-page" style={{ width: '210mm', height: '297mm', padding: '8mm', boxSizing: 'border-box', backgroundColor: 'white' }}>
              <div className="border-2 border-black p-6 h-full" style={{ boxSizing: 'border-box' }}>
                {/* Header */}
                <div className="mb-6">
                  <p className="font-bold text-lg">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES</p>
                  <p>RUC: 20421413216</p>
                </div>

                {/* Título */}
                <div className="border border-black p-4 mb-6 text-center">
                  <p className="font-bold">LIQUIDACIÓN DEL IMPUESTO GENERAL A LAS VENTAS</p>
                  <p className="font-bold mt-2">NO DOMICILIADOS</p>
                  <p className="font-bold mt-2">MES DE {getMesAño()}</p>
                  <p>(En Soles)</p>
                </div>

                <p className="mb-6">Por concepto de administración del Portafolio MILA llevado a cabo por {pagoFacilND.proveedor}.</p>

                {/* Datos */}
                <div className="space-y-1 mb-6">
                  <p><span className="font-bold">Proveedor</span> : {pagoFacilND.proveedor}</p>
                  <p><span className="font-bold">Factura N°</span> : {pagoFacilND.facturaNro}</p>
                  <p><span className="font-bold">Expediente</span> : {pagoFacilND.expedienteNro}</p>
                  <p><span className="font-bold">Fecha pago del Servicio</span> : {formatFecha(pagoFacilND.fechaPagoServicio)}</p>
                </div>

                {/* Tabla periodo */}
                <div className="flex justify-between items-center mb-2">
                  <div className="border border-black px-4 py-2 bg-gray-100 font-bold">{pagoFacilND.periodoComision}</div>
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

                {/* TC */}
                <div className="space-y-2 mb-6">
                  <p><span className="font-bold">T.C.P.P.Venta</span></p>
                  <p><span className="font-bold">Publicado - SUNAT</span> : {pagoFacilND.tcSunatVenta.toFixed(3)}</p>
                  <p className="mt-4"><span className="font-bold">T.C.P.P.C.</span></p>
                  <p><span className="font-bold">Vigente - SBS</span> : {pagoFacilND.tcSbs.toFixed(3)}</p>
                </div>

                {/* Totales */}
                <div className="space-y-2 mb-6">
                  <p><span className="font-bold">Total Factura US$</span> : {formatNumber(pagoFacilND.baseUsd, 2)}</p>
                  <p><span className="font-bold">Total Factura S/</span> : {formatNumber(pagoFacilND.totalFacturaSoles, 2)}</p>
                </div>

                {/* IGV Final */}
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
                      <span className="px-4 py-1">{formatNumber(pagoFacilND.redondeo, 2)}</span>
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
          
          {/* Footer del Modal - Barra de botones */}
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
                  pagoFacilNDData: pagoFacilND
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
