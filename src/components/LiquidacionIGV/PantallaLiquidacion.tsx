import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, ArrowLeft } from 'lucide-react';
import { ConceptoVenta, PeriodoSeleccionado, TotalesLiquidacion, usaFormatoNuevo } from './types';
import { TablaVentas } from './TablaVentas';
import {
  sep2025Facturas, sep2025Boletas, sep2025NotasDebito, sep2025NotasCredito, sep2025NoGravadas,
  feb2026Facturas, feb2026Boletas, feb2026NotasDebito, feb2026NotasCreditoOperaciones,
  feb2026DescuentoBaseImponible, feb2026NoGravadas
} from './mockData';

interface DatosParaPagoFacil {
  facturas: ConceptoVenta[];
  boletas: ConceptoVenta[];
  notasDebito: ConceptoVenta[];
  notasCredito: ConceptoVenta[];
  ventasNoGravadas: ConceptoVenta[];
  descuentoBaseImponible?: ConceptoVenta[];
  totales: TotalesLiquidacion;
}

interface Props {
  periodo: PeriodoSeleccionado;
  onVerPagoFacil: (importe: number, datos: DatosParaPagoFacil) => void;
  onVolver: () => void;
}

const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getMockData(periodo: PeriodoSeleccionado) {
  if (periodo.año === 2026 && periodo.mes === 2) {
    return {
      facturas: feb2026Facturas,
      boletas: feb2026Boletas,
      notasDebito: feb2026NotasDebito,
      notasCredito: feb2026NotasCreditoOperaciones,
      noGravadas: feb2026NoGravadas,
      descuentoBaseImponible: feb2026DescuentoBaseImponible,
    };
  }
  return {
    facturas: sep2025Facturas,
    boletas: sep2025Boletas,
    notasDebito: sep2025NotasDebito,
    notasCredito: sep2025NotasCredito,
    noGravadas: sep2025NoGravadas,
    descuentoBaseImponible: undefined,
  };
}

export function PantallaLiquidacion({ periodo, onVerPagoFacil, onVolver }: Props) {
  const esFormatoNuevo = usaFormatoNuevo(periodo);
  const mockData = getMockData(periodo);

  const [facturas, setFacturas] = useState(mockData.facturas);
  const [boletas, setBoletas] = useState(mockData.boletas);
  const [notasDebito, setNotasDebito] = useState(mockData.notasDebito);
  const [notasCredito, setNotasCredito] = useState(mockData.notasCredito);
  const [ventasNoGravadas, setVentasNoGravadas] = useState(mockData.noGravadas);
  const [descuentoBaseImponible, setDescuentoBaseImponible] = useState(mockData.descuentoBaseImponible || []);

  const updateDato = (
    setter: React.Dispatch<React.SetStateAction<ConceptoVenta[]>>,
    id: string,
    field: 'base' | 'igv',
    value: number
  ) => {
    setter(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totales = useMemo(() => {
    const sumar = (arr: ConceptoVenta[]) => ({
      base: arr.reduce((sum, i) => sum + i.base, 0),
      igv: arr.reduce((sum, i) => sum + i.igv, 0)
    });

    const tFacturas = sumar(facturas);
    const tBoletas = sumar(boletas);
    const tNotasDebito = sumar(notasDebito);
    const tNotasCredito = sumar(notasCredito);
    const tNoGravadas = sumar(ventasNoGravadas);

    if (esFormatoNuevo) {
      const tDescuento = sumar(descuentoBaseImponible);
      
      const baseOperaciones = tFacturas.base + tBoletas.base + tNotasDebito.base + tNotasCredito.base;
      const igvOperaciones = tFacturas.igv + tBoletas.igv + tNotasDebito.igv + tNotasCredito.igv;
      
      const impuestoTotalOperaciones = Math.round(igvOperaciones);
      const impuestoTotalDescuento = Math.round(tDescuento.igv);
      
      const baseNeta = baseOperaciones + tDescuento.base;
      const igvNeto = igvOperaciones + tDescuento.igv;
      const importePagar = Math.round(igvNeto);
      const totalNetoVentas = baseNeta + tNoGravadas.base;

      return {
        facturas: tFacturas,
        boletas: tBoletas,
        notasDebito: tNotasDebito,
        notasCredito: tNotasCredito,
        noGravadas: tNoGravadas,
        baseGravada: baseOperaciones,
        igvGravado: igvOperaciones,
        baseNeta,
        igvNeto,
        importePagar,
        descuentoBase: tDescuento,
        impuestoTotalOperaciones,
        impuestoTotalDescuento,
        totalNetoVentas,
      };
    }

    const baseGravada = tFacturas.base + tBoletas.base + tNotasDebito.base + tNotasCredito.base;
    const igvGravado = tFacturas.igv + tBoletas.igv + tNotasDebito.igv + tNotasCredito.igv;
    const baseNeta = baseGravada;
    const igvNeto = igvGravado;
    const importePagar = Math.round(igvNeto);

    return {
      facturas: tFacturas,
      boletas: tBoletas,
      notasDebito: tNotasDebito,
      notasCredito: tNotasCredito,
      noGravadas: tNoGravadas,
      baseGravada,
      igvGravado,
      baseNeta,
      igvNeto,
      importePagar
    };
  }, [facturas, boletas, notasDebito, notasCredito, ventasNoGravadas, descuentoBaseImponible, esFormatoNuevo]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatParentheses = (num: number) => {
    const abs = Math.abs(num);
    return `(${abs.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  };

  /* ── Helpers for 5-column table rows (formato nuevo) ── */

  const renderRow5 = (
    item: ConceptoVenta,
    setter: React.Dispatch<React.SetStateAction<ConceptoVenta[]>>
  ) => (
    <tr key={item.id} className={item.isNegative ? 'text-destructive' : ''}>
      <td className="text-sm">{item.concepto}</td>
      <td className="text-xs text-muted-foreground font-mono">{item.rango}</td>
      <td className="p-0">
        <input
          type="text"
          className={`excel-input py-2 ${item.isNegative ? 'text-destructive' : ''}`}
          value={formatNumber(item.base)}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(/,/g, '')) || 0;
            updateDato(setter, item.id, 'base', v);
          }}
        />
      </td>
      <td className="p-0">
        <input
          type="text"
          className={`excel-input py-2 ${item.isNegative ? 'text-destructive' : ''}`}
          value={formatNumber(item.igv)}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(/,/g, '')) || 0;
            updateDato(setter, item.id, 'igv', v);
          }}
        />
      </td>
      <td></td>
    </tr>
  );

  const sectionHeader5 = (title: string) => (
    <tr key={`sh-${title}`} className="bg-primary/5">
      <td colSpan={5} className="font-bold text-primary text-sm py-1">{title}</td>
    </tr>
  );

  const colWidths = { concepto: 'w-[30%]', rango: 'w-[25%]', base: 'w-[18%]', tasa: 'w-[14%]', impTotal: 'w-[13%]' };

  /* ── Render ── */

  return (
    <div className="min-h-screen p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="institutional-header rounded-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold">FONDO CONSOLIDADO DE RESERVAS PREVISIONALES – FCR</h1>
            <p className="text-sm opacity-90">EQUIPO DE TRABAJO DE CONTABILIDAD</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">RUC 20421413216</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">LIQUIDACIÓN DEL IMPUESTO GENERAL A LAS VENTAS</h2>
        <p className="text-primary font-semibold">Mes de {meses[periodo.mes]} {periodo.año}</p>
        <p className="text-sm text-muted-foreground">(En Soles)</p>
      </div>

      <div className="space-y-6 max-w-6xl mx-auto">

        {esFormatoNuevo ? (
          /* ═══════════════════════════════════════════════════════════
             FORMATO NUEVO — Febrero 2026+
             ═══════════════════════════════════════════════════════════ */
          <>
            {/* ── Card unificada: Operaciones Gravadas + Descuento ── */}
            <Card className="shadow-lg">
              <CardHeader className="py-3 bg-muted/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Operaciones Gravadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className={colWidths.concepto}>Concepto</th>
                        <th className={colWidths.rango}>Rango de Comprobantes</th>
                        <th className={`${colWidths.base} text-right`}>Base Imponible</th>
                        <th className={`${colWidths.tasa} text-right`}>Tasa 18%</th>
                        <th className={`${colWidths.impTotal} text-right`}>Impuesto Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Facturas */}
                      {sectionHeader5('FACTURAS')}
                      {facturas.map(item => renderRow5(item, setFacturas))}

                      {/* Boletas */}
                      {sectionHeader5('BOLETAS')}
                      {boletas.map(item => renderRow5(item, setBoletas))}

                      {/* Notas de Débito */}
                      {sectionHeader5('NOTAS DE DÉBITO')}
                      {notasDebito.map(item => renderRow5(item, setNotasDebito))}

                      {/* Notas de Crédito */}
                      {sectionHeader5('NOTAS DE CRÉDITO')}
                      {notasCredito.map(item => renderRow5(item, setNotasCredito))}

                      {/* ── Subtotal Operaciones ── */}
                      <tr className="border-t-2 font-semibold bg-muted/30">
                        <td colSpan={2} className="text-right font-bold text-sm">Subtotal</td>
                        <td className="text-right font-mono" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                          {formatNumber(totales.baseGravada)}
                        </td>
                        <td className="text-right font-mono">
                          {formatNumber(totales.igvGravado)}
                        </td>
                        <td className="text-right font-mono font-bold" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                          {formatNumber(totales.igvGravado)}
                        </td>
                      </tr>

                      {/* ── Descuento de Base Imponible (subsección) ── */}
                      <tr>
                        <td colSpan={5} className="pt-6 pb-2 border-t-2 border-border">
                          <span className="font-bold text-sm text-foreground">
                            Descuento de Base Imponible (meses anteriores)
                          </span>
                        </td>
                      </tr>

                      {sectionHeader5('NOTAS DE CRÉDITO')}
                      {descuentoBaseImponible
                        .filter(item => item.base !== 0 || item.igv !== 0)
                        .map(item => renderRow5(item, setDescuentoBaseImponible))}

                      {/* ── Subtotal Descuento ── */}
                      <tr className="border-t-2 font-semibold bg-muted/30">
                        <td colSpan={2} className="text-right font-bold text-sm">Subtotal</td>
                        <td className="text-right font-mono text-destructive" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                          {formatParentheses(totales.descuentoBase?.base || 0)}
                        </td>
                        <td className="text-right font-mono text-destructive">
                          {formatParentheses(totales.descuentoBase?.igv || 0)}
                        </td>
                        <td className="text-right font-mono font-bold text-destructive" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                          {formatParentheses(totales.descuentoBase?.igv || 0)}
                        </td>
                      </tr>

                      {/* ── TOTAL NETO ── */}
                      <tr className="border-t-2">
                        <td colSpan={2} className="text-right font-bold text-base py-3">TOTAL NETO</td>
                        <td className="text-right font-mono font-bold text-base py-3">
                          {formatNumber(totales.baseNeta)}
                        </td>
                        <td></td>
                        <td className="text-right font-mono font-bold text-base py-3">
                          {formatNumber(totales.igvNeto)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── Card: Ventas No Gravadas ── */}
            <Card className="shadow-lg">
              <CardHeader className="py-3 bg-muted/50">
                <CardTitle className="text-base">Ventas No Gravadas</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className={colWidths.concepto}>Concepto</th>
                        <th className={colWidths.rango}>Rango de Comprobantes</th>
                        <th className={`${colWidths.base} text-right`}>Base Imponible</th>
                        {/* Columnas vacías para mantener la grilla alineada */}
                        <th className={colWidths.tasa}></th>
                        <th className={colWidths.impTotal}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasNoGravadas
                        .filter(item => item.base !== 0)
                        .map(item => (
                          <tr key={item.id}>
                            <td className="text-sm">{item.concepto}</td>
                            <td className="text-xs text-muted-foreground font-mono">{item.rango}</td>
                            <td className="p-0">
                              <input
                                type="text"
                                className="excel-input py-2"
                                value={formatNumber(item.base)}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                  updateDato(setVentasNoGravadas, item.id, 'base', v);
                                }}
                              />
                            </td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}

                      {/* Total Ventas no gravadas */}
                      <tr className="border-t-2 font-semibold">
                        <td colSpan={2} className="text-right font-bold text-sm">Total Ventas no gravadas</td>
                        <td className="text-right font-mono font-bold" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                          {formatNumber(totales.noGravadas.base)}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── TOTAL NETO VENTAS ── */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="excel-table">
                    <colgroup>
                      <col className={colWidths.concepto} />
                      <col className={colWidths.rango} />
                      <col className={colWidths.base} />
                      <col className={colWidths.tasa} />
                      <col className={colWidths.impTotal} />
                    </colgroup>
                    <tbody>
                      <tr className="font-bold">
                        <td colSpan={2} className="text-base font-bold py-3 border-0">
                          TOTAL NETO VENTAS {meses[periodo.mes].toUpperCase()} {periodo.año}
                        </td>
                        <td className="text-right font-mono text-base py-3 font-bold" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                          {formatNumber(totales.totalNetoVentas || 0)}
                        </td>
                        <td className="border-0"></td>
                        <td className="border-0"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════
             FORMATO ANTIGUO — Sep 2025 y anteriores
             ═══════════════════════════════════════════════════════════ */
          <>
            <Card className="shadow-lg">
              <CardHeader className="py-3 bg-muted/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Ventas Gravadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <TablaVentas
                  titulo="FACTURAS"
                  datos={facturas}
                  onUpdateDato={(id, field, value) => updateDato(setFacturas, id, field, value)}
                />
                <TablaVentas
                  titulo="BOLETAS"
                  datos={boletas}
                  onUpdateDato={(id, field, value) => updateDato(setBoletas, id, field, value)}
                  showHeader={false}
                />
                <TablaVentas
                  titulo="NOTAS DE DÉBITO"
                  datos={notasDebito}
                  onUpdateDato={(id, field, value) => updateDato(setNotasDebito, id, field, value)}
                  showHeader={false}
                />

                {/* Subtotal positivos */}
                <div className="flex justify-end gap-8 py-2 border-t">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Subtotal Base:</span>
                    <p className="font-mono font-semibold">{formatNumber(totales.facturas.base + totales.boletas.base + totales.notasDebito.base)}</p>
                  </div>
                  <div className="text-right px-3 py-1 rounded" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                    <span className="text-xs text-muted-foreground">Subtotal IGV:</span>
                    <p className="font-mono font-bold">{formatNumber(totales.facturas.igv + totales.boletas.igv + totales.notasDebito.igv)}</p>
                  </div>
                </div>

                <TablaVentas
                  titulo="NOTAS DE CRÉDITO"
                  datos={notasCredito}
                  onUpdateDato={(id, field, value) => updateDato(setNotasCredito, id, field, value)}
                  showHeader={false}
                />

                <div className="flex justify-end gap-8 py-2 border-t">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Subtotal Base:</span>
                    <p className="font-mono font-semibold">{formatNumber(totales.notasCredito.base)}</p>
                  </div>
                  <div className="text-right px-3 py-1 rounded" style={{ backgroundColor: 'hsl(50 100% 80%)' }}>
                    <span className="text-xs text-muted-foreground">Subtotal IGV:</span>
                    <p className="font-mono font-bold">{formatNumber(totales.notasCredito.igv)}</p>
                  </div>
                </div>

                {/* Total Neto */}
                <div className="bg-muted/50 rounded-lg p-4 flex justify-between items-center">
                  <span className="font-bold">TOTAL NETO</span>
                  <div className="flex gap-8">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Base Neta:</span>
                      <p className="font-mono font-bold text-lg">{formatNumber(totales.baseNeta)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">IGV Neto:</span>
                      <p className="font-mono font-bold text-lg text-primary">{formatNumber(totales.igvNeto)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ventas No Gravadas (formato antiguo) */}
            <Card className="shadow-lg">
              <CardHeader className="py-3 bg-muted/50">
                <CardTitle className="text-base">Ventas No Gravadas</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <TablaVentas
                  titulo=""
                  datos={ventasNoGravadas}
                  onUpdateDato={(id, field, value) => updateDato(setVentasNoGravadas, id, field, value)}
                />
                <div className="flex justify-end gap-8 py-2 mt-2 border-t">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Total Base No Gravada:</span>
                    <p className="font-mono font-semibold">{formatNumber(totales.noGravadas.base)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Card Importe a Pagar (compartida, sin cambios) ── */}
        <Card className="shadow-xl border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-foreground">IMPORTE A PAGAR</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-muted-foreground">S/</span>
                <div className="px-6 py-3 rounded-lg border-2 border-foreground">
                  <span className="text-3xl font-bold font-mono">{totales.importePagar.toLocaleString('es-PE')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 no-print">
          <Button variant="outline" onClick={onVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a selección
          </Button>
          <Button onClick={() => onVerPagoFacil(totales.importePagar, {
            facturas,
            boletas,
            notasDebito,
            notasCredito,
            ventasNoGravadas,
            descuentoBaseImponible: esFormatoNuevo ? descuentoBaseImponible : undefined,
            totales
          })}>
            <FileText className="mr-2 h-4 w-4" />
            Previsualizar Pago Fácil 1011
          </Button>
        </div>
      </div>
    </div>
  );
}
