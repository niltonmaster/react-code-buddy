import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import { ConceptoVenta, PeriodoSeleccionado, TotalesLiquidacion } from './types';
import { TablaVentas } from './TablaVentas';

interface DatosParaPagoFacil {
  facturas: ConceptoVenta[];
  boletas: ConceptoVenta[];
  notasDebito: ConceptoVenta[];
  notasCredito: ConceptoVenta[];
  ventasNoGravadas: ConceptoVenta[];
  totales: TotalesLiquidacion;
}

interface Props {
  periodo: PeriodoSeleccionado;
  onVerPagoFacil: (importe: number, datos: DatosParaPagoFacil) => void;
  onVolver: () => void;
}

const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const datosInicialesFacturas: ConceptoVenta[] = [
  { id: 'f1', concepto: 'C / Factura Electrónica Alquiler', rango: 'D-JF001-0006212 al F001-0006273', base: 2165754.19, igv: 389835.71 },
  { id: 'f2', concepto: 'C / Factura Electrónica Garantías', rango: 'D-JF001', base: 0.00, igv: 0.00 },
];

const datosInicialesBoletas: ConceptoVenta[] = [
  { id: 'b1', concepto: 'C / Boleta de Venta Elec Alquiler', rango: 'D-JB001-0031511 al B001-0031771', base: 166521.18, igv: 29973.73 },
  { id: 'b2', concepto: 'C / Boleta de Venta Elec Garantías', rango: 'D-JB001-0031760', base: 1314.07, igv: 236.53 },
];

const datosInicialesNotasDebito: ConceptoVenta[] = [
  { id: 'nd1', concepto: 'C / Nota de Débito Elec Alq Boleta', rango: 'D-JBD01-0029385 al BD01-0029418', base: 1015.82, igv: 182.86 },
  { id: 'nd2', concepto: 'C / Nota de Débito Elec Alq Fact', rango: 'D-JFD01-0004170 al FD01-0004212', base: 402.62, igv: 72.46 },
];

const datosInicialesNotasCredito: ConceptoVenta[] = [
  { id: 'nc1', concepto: 'C / Nota de Crédito Elec Alquiler boleta', rango: 'D-JBC001-0000595 - BC001-0000610', base: -4940.65, igv: -889.35, isNegative: true },
  { id: 'nc2', concepto: 'C / Nota de Crédito Elec Alquiler factura', rango: '', base: -1968.94, igv: -354.57, isNegative: true },
  { id: 'nc3', concepto: 'C / Nota de Crédito Elec Garantía boleta', rango: 'D-JBC001-0000587 - BC001-00000611', base: -1002.45, igv: -180.44, isNegative: true },
  { id: 'nc4', concepto: 'C / Nota de Crédito Elec Garantía factura', rango: 'D-JFC001-0000185 - FC001-0000186', base: 0.00, igv: 0.00, isNegative: true },
];

const datosInicialesNoGravadas: ConceptoVenta[] = [
  { id: 'ng1', concepto: 'C / Boleta', rango: '', base: 0.00, igv: 0.00 },
  { id: 'ng2', concepto: 'C / Nota de Débito', rango: 'Del BD01-0029385 al BD01-0029618/ FD01-0004170 al FD01-0004212', base: 240.75, igv: 0.00 },
  { id: 'ng3', concepto: 'C / Nota de Crédito', rango: 'Del BC001-0000587 - BC001-0000611 /FC001-0000185 - FC001-0000186', base: -2.88, igv: 0.00 },
];

export function PantallaLiquidacion({ periodo, onVerPagoFacil, onVolver }: Props) {
  const [facturas, setFacturas] = useState(datosInicialesFacturas);
  const [boletas, setBoletas] = useState(datosInicialesBoletas);
  const [notasDebito, setNotasDebito] = useState(datosInicialesNotasDebito);
  const [notasCredito, setNotasCredito] = useState(datosInicialesNotasCredito);
  const [ventasNoGravadas, setVentasNoGravadas] = useState(datosInicialesNoGravadas);

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
  }, [facturas, boletas, notasDebito, notasCredito, ventasNoGravadas]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const mesStr = String(periodo.mes).padStart(2, '0');

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
        {/* Card Ventas Gravadas */}
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

            {/* Subtotal antes de NC */}
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

            {/* Subtotal Notas de Crédito */}
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
          </CardContent>
        </Card>

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
                <p className="font-mono font-semibold">{formatNumber(totales.noGravadas.base)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalcular Totales
          </Button>
          <Button onClick={() => onVerPagoFacil(totales.importePagar, {
            facturas,
            boletas,
            notasDebito,
            notasCredito,
            ventasNoGravadas,
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
