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
  // Default: Sep 2025
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

  // Reset state when periodo changes (via key in parent or re-mount)
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
      // Formato nuevo: NC dentro de operaciones, descuento separado
      const tDescuento = sumar(descuentoBaseImponible);
      
      // Operaciones gravadas = facturas + boletas + ND + NC (todo junto)
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

    // Formato antiguo
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

  const tituloSeccionPrincipal = esFormatoNuevo ? 'Operaciones Gravadas' : 'Ventas Gravadas';

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
        {/* Card Operaciones/Ventas Gravadas */}
        <Card className="shadow-lg">
          <CardHeader className="py-3 bg-muted/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {tituloSeccionPrincipal}
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

            {esFormatoNuevo ? (
              <>
                {/* Formato nuevo: NC dentro de operaciones */}
                <TablaVentas 
                  titulo="NOTAS DE CRÉDITO"
                  datos={notasCredito}
                  onUpdateDato={(id, field, value) => updateDato(setNotasCredito, id, field, value)}
                  showHeader={false}
                />

                {/* Subtotal Operaciones (código 100) */}
                <div className="flex justify-end gap-8 py-2 border-t">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Subtotal Base:</span>
                    <p className="font-mono font-semibold">{formatNumber(totales.baseGravada)}</p>
                  </div>
                  <div className="text-right bg-highlight-yellow px-3 py-1 rounded">
                    <span className="text-xs text-muted-foreground">Subtotal IGV:</span>
                    <p className="font-mono font-bold">{formatNumber(totales.igvGravado)}</p>
                  </div>
                </div>

                {/* Ajuste y no aplicable */}
                <div className="flex justify-end gap-8 py-1">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Ajuste a la base de cálculo por redondeos:</span>
                    <p className="font-mono text-sm">0.00</p>
                  </div>
                </div>

                {/* Total con Impuesto Total */}
                <div className="bg-muted/50 rounded-lg p-4 flex justify-between items-center">
                  <span className="font-bold">SUBTOTAL OPERACIONES GRAVADAS</span>
                  <div className="flex gap-8">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Base:</span>
                      <p className="font-mono font-bold text-lg">{formatNumber(totales.baseGravada)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">IGV:</span>
                      <p className="font-mono font-bold text-lg">{formatNumber(totales.igvGravado)}</p>
                    </div>
                    <div className="text-right" style={{ backgroundColor: '#C62828', padding: '4px 12px', borderRadius: '4px' }}>
                      <span className="text-xs" style={{ color: 'white' }}>Impuesto Total:</span>
                      <p className="font-mono font-bold text-lg" style={{ color: 'white' }}>{totales.impuestoTotalOperaciones?.toLocaleString('es-PE')}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Formato antiguo: subtotal positivos, luego NC separadas */}
                <div className="flex justify-end gap-8 py-2 border-t">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Subtotal Base:</span>
                    <p className="font-mono font-semibold">{formatNumber(totales.facturas.base + totales.boletas.base + totales.notasDebito.base)}</p>
                  </div>
                  <div className="text-right bg-highlight-yellow px-3 py-1 rounded">
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
                  <div className="text-right bg-highlight-yellow px-3 py-1 rounded">
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Card Descuento de Base Imponible (solo formato nuevo) */}
        {esFormatoNuevo && (
          <Card className="shadow-lg">
            <CardHeader className="py-3 bg-muted/50">
              <CardTitle className="text-base">Descuento de Base Imponible (meses anteriores)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <TablaVentas 
                titulo="NOTAS DE CRÉDITO"
                datos={descuentoBaseImponible}
                onUpdateDato={(id, field, value) => updateDato(setDescuentoBaseImponible, id, field, value)}
              />

              {/* Subtotal descuento (código 102) */}
              <div className="flex justify-end gap-8 py-2 border-t">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Subtotal Base:</span>
                  <p className="font-mono font-semibold" style={{ color: '#C62828' }}>{formatParentheses(totales.descuentoBase?.base || 0)}</p>
                </div>
                <div className="text-right bg-highlight-yellow px-3 py-1 rounded">
                  <span className="text-xs text-muted-foreground">Subtotal IGV:</span>
                  <p className="font-mono font-bold" style={{ color: '#C62828' }}>{formatParentheses(totales.descuentoBase?.igv || 0)}</p>
                </div>
                <div className="text-right" style={{ color: '#C62828' }}>
                  <span className="text-xs text-muted-foreground">Impuesto Total:</span>
                  <p className="font-mono font-bold">({Math.abs(totales.impuestoTotalDescuento || 0).toLocaleString('es-PE')})</p>
                </div>
              </div>

              {/* Ajuste */}
              <div className="flex justify-end gap-8 py-1">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Ajuste a la base de cálculo por redondeos:</span>
                  <p className="font-mono text-sm">0.00</p>
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
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Impuesto Total:</span>
                    <p className="font-mono font-bold text-lg">{totales.importePagar.toLocaleString('es-PE')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Ventas No Gravadas */}
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
                <p className="font-mono font-semibold" style={esFormatoNuevo ? { color: '#C62828' } : undefined}>{formatNumber(totales.noGravadas.base)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Neto Ventas (solo formato nuevo) */}
        {esFormatoNuevo && totales.totalNetoVentas !== undefined && (
          <Card className="shadow-lg border-2" style={{ borderColor: '#C62828' }}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-foreground">TOTAL NETO VENTAS {meses[periodo.mes].toUpperCase()} {periodo.año}</h3>
                <div className="px-6 py-3 rounded-lg" style={{ backgroundColor: '#C62828' }}>
                  <span className="text-2xl font-bold font-mono" style={{ color: 'white' }}>{formatNumber(totales.totalNetoVentas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Importe a Pagar */}
        <Card className="shadow-xl border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-foreground">IMPORTE A PAGAR</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-muted-foreground">S/</span>
                <div className="bg-highlight-yellow px-6 py-3 rounded-lg border-2 border-foreground">
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
