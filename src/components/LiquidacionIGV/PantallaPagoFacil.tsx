import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import { PeriodoSeleccionado, ConceptoVenta, TotalesLiquidacion } from './types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface DatosLiquidacion {
  facturas: ConceptoVenta[];
  boletas: ConceptoVenta[];
  notasDebito: ConceptoVenta[];
  notasCredito: ConceptoVenta[];
  ventasNoGravadas: ConceptoVenta[];
  totales: TotalesLiquidacion;
}

interface Props {
  periodo: PeriodoSeleccionado;
  importe: number;
  datosLiquidacion: DatosLiquidacion;
  onVolver: () => void;
}

const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function PantallaPagoFacil({ periodo, importe, datosLiquidacion, onVolver }: Props) {
  const navigate = useNavigate();
  const mesStr = String(periodo.mes).padStart(2, '0');
  const periodoTributario = `${mesStr}-${periodo.año}`;
  
  const fechaActual = new Date();
  const opciones: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const fechaFormateada = fechaActual.toLocaleDateString('es-PE', opciones);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const element = document.getElementById('preview-contenido');
    if (!element) return;

    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `Liquidacion_IGV_PagoFacil_${periodoTributario}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleGenerarDevengado = () => {
    navigate('/devengado-igv', {
      state: {
        fromPagoFacil: true,
        periodoTributario,
        importeIGV: importe
      }
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const { facturas, boletas, notasDebito, notasCredito, ventasNoGravadas, totales } = datosLiquidacion;

  // Subtotal antes de NC
  const subtotalBasePositivos = totales.facturas.base + totales.boletas.base + totales.notasDebito.base;
  const subtotalIgvPositivos = totales.facturas.igv + totales.boletas.igv + totales.notasDebito.igv;

  return (
    <div className="min-h-screen p-6 bg-background animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div id="preview-contenido">
          {/* ============ HOJA 1: PAGO FÁCIL 1011 ============ */}
          <div className="pdf-page pdf-hoja-1">
            <Card className="shadow-2xl border-2 border-foreground/20 bg-card">
              <div className="p-8">
                {/* Header institucional */}
                <div className="border-b-2 border-foreground pb-4 mb-6">
                  <h2 className="font-bold text-lg">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES</h2>
                  <p className="text-sm">CONTABILIDAD</p>
                  <p className="text-sm">RUC 20421413216</p>
                </div>

                {/* Título */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold tracking-wide">SISTEMA DE PAGO FÁCIL</h1>
                </div>

                {/* Referencia legal */}
                <p className="text-xs text-primary text-center mb-6">
                  FONDO : Saldo de la Reserva del Decreto Ley N° 19990 - Decreto de Urgencia N° 067-98
                </p>

                {/* Bloques de información */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {/* Periodo tributario */}
                  <div className="text-center">
                    <div className="voucher-box mb-2">
                      <p className="text-xs font-semibold">PERIODO</p>
                      <p className="text-xs">TRIBUTARIO</p>
                    </div>
                    <div className="voucher-box">
                      <p className="text-lg font-bold font-mono">{periodoTributario}</p>
                    </div>
                  </div>

                  {/* Código del tributo */}
                  <div className="text-center">
                    <div className="voucher-box mb-2">
                      <p className="text-xs font-semibold">CODIGO</p>
                      <p className="text-xs">DEL TRIBUTO</p>
                    </div>
                    <div className="voucher-box">
                      <p className="text-lg font-bold text-primary">1011</p>
                      <p className="text-xs font-semibold text-primary">IMP. GENERAL</p>
                      <p className="text-xs text-primary">VTA.</p>
                    </div>
                  </div>

                  {/* Importe a pagar */}
                  <div className="text-center">
                    <div className="voucher-box mb-2">
                      <p className="text-xs font-semibold">IMPORTE A</p>
                      <p className="text-xs">PAGAR S/.</p>
                    </div>
                    <div className="voucher-box bg-highlight-yellow">
                      <p className="text-lg font-bold font-mono">{importe.toLocaleString('es-PE')}</p>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-end mb-8">
                  <div className="voucher-box px-6">
                    <span className="font-semibold">TOTAL S/</span>
                    <span className="font-bold font-mono ml-4">{importe.toLocaleString('es-PE')}</span>
                  </div>
                </div>

                {/* Fecha */}
                <p className="text-center text-sm mb-12">{fechaFormateada}</p>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-16 mt-16">
                  <div className="text-center">
                    <div className="border-t border-foreground pt-2 mx-8">
                      <p className="text-sm font-semibold">Elaborado</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-foreground pt-2 mx-8">
                      <p className="text-sm font-semibold">V° B°</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ============ HOJA 2: LIQUIDACIÓN DEL IGV ============ */}
          <div className="pdf-page pdf-hoja-2">
            <Card className="shadow-2xl border-2 border-foreground/20 bg-card mt-8">
              <div className="p-8">
                {/* Header institucional */}
                <div className="border-b-2 border-foreground pb-4 mb-6">
                  <h2 className="font-bold text-lg">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES – FCR</h2>
                  <p className="text-sm">EQUIPO DE TRABAJO DE CONTABILIDAD</p>
                  <p className="text-sm">RUC: 20421413216</p>
                </div>

                {/* Título */}
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold tracking-wide">LIQUIDACIÓN DEL IMPUESTO GENERAL A LAS VENTAS</h1>
                  <p className="text-sm font-semibold mt-2">Mes de {meses[periodo.mes]} {periodo.año}</p>
                  <p className="text-xs text-muted-foreground">(En soles)</p>
                </div>

                {/* VENTAS GRAVADAS */}
                <div className="mb-6">
                  <h3 className="font-bold text-sm border-b pb-2 mb-3">VENTAS GRAVADAS</h3>
                  
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-2 font-semibold">Concepto</th>
                        <th className="text-left py-2 px-2 font-semibold">Rango de comprobantes</th>
                        <th className="text-right py-2 px-2 font-semibold">Base imponible</th>
                        <th className="text-right py-2 px-2 font-semibold">IGV 18%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Facturas */}
                      <tr className="border-b border-muted/30">
                        <td colSpan={4} className="py-1 px-2 font-semibold text-xs text-muted-foreground">FACTURAS</td>
                      </tr>
                      {facturas.map((item) => (
                        <tr key={item.id} className="border-b border-muted/20">
                          <td className="py-1 px-2">{item.concepto}</td>
                          <td className="py-1 px-2 text-xs" style={{ color: '#1A73E8' }}>{item.rango}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.base)}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.igv)}</td>
                        </tr>
                      ))}

                      {/* Boletas */}
                      <tr className="border-b border-muted/30">
                        <td colSpan={4} className="py-1 px-2 font-semibold text-xs text-muted-foreground">BOLETAS</td>
                      </tr>
                      {boletas.map((item) => (
                        <tr key={item.id} className="border-b border-muted/20">
                          <td className="py-1 px-2">{item.concepto}</td>
                          <td className="py-1 px-2 text-xs" style={{ color: '#1A73E8' }}>{item.rango}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.base)}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.igv)}</td>
                        </tr>
                      ))}

                      {/* Notas de Débito */}
                      <tr className="border-b border-muted/30">
                        <td colSpan={4} className="py-1 px-2 font-semibold text-xs text-muted-foreground">NOTAS DE DÉBITO</td>
                      </tr>
                      {notasDebito.map((item) => (
                        <tr key={item.id} className="border-b border-muted/20">
                          <td className="py-1 px-2">{item.concepto}</td>
                          <td className="py-1 px-2 text-xs" style={{ color: '#1A73E8' }}>{item.rango}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.base)}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.igv)}</td>
                        </tr>
                      ))}

                      {/* Subtotal Positivos */}
                      <tr className="border-b-2 bg-muted/20">
                        <td colSpan={2} className="py-2 px-2 text-right font-semibold">Subtotal Base:</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">{formatNumber(subtotalBasePositivos)}</td>
                        <td className="py-2 px-2 text-right">
                          <span className="px-2 py-1 rounded font-mono font-bold" style={{ backgroundColor: '#FFF3A3' }}>{formatNumber(subtotalIgvPositivos)}</span>
                        </td>
                      </tr>

                      {/* Notas de Crédito */}
                      <tr className="border-b border-muted/30">
                        <td colSpan={4} className="py-1 px-2 font-semibold text-xs" style={{ color: '#C62828' }}>NOTAS DE CRÉDITO</td>
                      </tr>
                      {notasCredito.map((item) => (
                        <tr key={item.id} className="border-b border-muted/20">
                          <td className="py-1 px-2" style={{ color: '#C62828' }}>{item.concepto}</td>
                          <td className="py-1 px-2 text-xs" style={{ color: '#C62828' }}>{item.rango}</td>
                          <td className="py-1 px-2 text-right font-mono" style={{ color: '#C62828' }}>{formatNumber(item.base)}</td>
                          <td className="py-1 px-2 text-right font-mono" style={{ color: '#C62828' }}>{formatNumber(item.igv)}</td>
                        </tr>
                      ))}

                      {/* Subtotal Notas de Crédito */}
                      <tr className="border-b-2 bg-muted/20">
                        <td colSpan={2} className="py-2 px-2 text-right font-semibold" style={{ color: '#C62828' }}>Subtotal Base:</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold" style={{ color: '#C62828' }}>{formatNumber(totales.notasCredito.base)}</td>
                        <td className="py-2 px-2 text-right">
                          <span className="px-2 py-1 rounded font-mono font-bold" style={{ backgroundColor: '#FFF3A3', color: '#C62828' }}>{formatNumber(totales.notasCredito.igv)}</span>
                        </td>
                      </tr>

                      {/* Total Neto */}
                      <tr className="bg-muted/50 font-bold">
                        <td colSpan={2} className="py-3 px-2 text-right">TOTAL NETO:</td>
                        <td className="py-3 px-2 text-right font-mono">{formatNumber(totales.baseNeta)}</td>
                        <td className="py-3 px-2 text-right">
                          <span className="px-2 py-1 rounded font-mono font-bold" style={{ backgroundColor: '#FFF3A3' }}>{formatNumber(totales.igvNeto)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* VENTAS NO GRAVADAS */}
                <div className="mb-6">
                  <h3 className="font-bold text-sm border-b pb-2 mb-3">VENTAS NO GRAVADAS</h3>
                  
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-2 font-semibold">Concepto</th>
                        <th className="text-left py-2 px-2 font-semibold">Rango de comprobantes</th>
                        <th className="text-right py-2 px-2 font-semibold">Base imponible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasNoGravadas.map((item) => (
                        <tr key={item.id} className="border-b border-muted/20">
                          <td className="py-1 px-2">{item.concepto}</td>
                          <td className="py-1 px-2 text-xs" style={{ color: '#1A73E8' }}>{item.rango}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatNumber(item.base)}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/20 font-semibold">
                        <td colSpan={2} className="py-2 px-2 text-right">Total Base No Gravada:</td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(totales.noGravadas.base)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* IMPORTE A PAGAR */}
                <div className="border-2 border-foreground rounded-lg p-4 mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">IMPORTE A PAGAR</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">S/</span>
                      <div className="bg-highlight-yellow px-4 py-2 rounded border-2 border-foreground">
                        <span className="text-2xl font-bold font-mono">{totales.importePagar.toLocaleString('es-PE')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 no-print">
          <Button variant="outline" onClick={onVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Liquidación
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={handleGenerarDevengado}>
            <FileText className="mr-2 h-4 w-4" />
            Generar devengado IGV
          </Button>
        </div>
      </div>
    </div>
  );
}
