import { Card } from '@/components/ui/card';
import { DevengadoFormData, PARAMS_DEVENGADO_IGV, PARAMS_DEVENGADO_IGV_ND } from './constants';

interface Props {
  formData: DevengadoFormData;
  isFromPagoFacil?: boolean;
  isNoDomiciliado?: boolean;
}

export function TabDistribucionContable({ formData, isFromPagoFacil = false, isNoDomiciliado = false }: Props) {
  // Para ND: el monto de distribución es el total obligación visible (suma USD)
  // Para D: usar montoDistribucion directamente (ya viene sincronizado del padre)
  const montoDisplay = isNoDomiciliado
    ? (formData.montoAfecto || 0) + (formData.noAfectoImpuestos || 0) + (formData.igv || 0) + (formData.otrosImpuestos || 0)
    : formData.montoDistribucion;

  // Cuentas contables según tipo
  const params = isNoDomiciliado ? PARAMS_DEVENGADO_IGV_ND : PARAMS_DEVENGADO_IGV;
  const cuentaCodigo = params.cuentaContable;
  const cuentaNombre = params.cuentaContableNombre;
  const centroCostoCodigo = params.centroCostoCodigo;
  const centroCostoNombre = params.centroCostoNombre;
  const proveedorCodigo = isNoDomiciliado ? '' : PARAMS_DEVENGADO_IGV.proveedorCodigo;
  const proveedorNombre = isNoDomiciliado ? (formData.proveedor || '') : PARAMS_DEVENGADO_IGV.proveedorNombre;

  const monedaSymbol = isNoDomiciliado ? 'US$' : 'S/';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Grilla contable */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Detalle de distribución contable</h3>
        <div className="overflow-x-auto">
          <table className="excel-table">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>Cuenta contable</th>
                <th>Centro de costo</th>
                <th>Persona</th>
                <th>Descripción</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center font-mono">1</td>
                <td>
                  <span className="font-mono text-primary font-medium">
                    {cuentaCodigo}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    – {cuentaNombre}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-primary font-medium">
                    {centroCostoCodigo}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    – {centroCostoNombre}
                  </span>
                </td>
                <td>
                  {proveedorCodigo && (
                    <span className="font-mono text-primary font-medium">
                      {proveedorCodigo}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-2">
                    {proveedorCodigo ? '– ' : ''}{proveedorNombre}
                  </span>
                </td>
                <td className="text-muted-foreground">
                  {isNoDomiciliado ? 'Comisión administración de cartera' : 'Liquidación IGV periodo'}
                </td>
                <td className="text-right">
                  <span className="highlight-cell px-3 py-1 rounded font-mono font-semibold">
                    {monedaSymbol} {montoDisplay.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={5} className="text-right">Total distribuido:</td>
                <td className="text-right font-mono">
                  {monedaSymbol} {montoDisplay.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Información adicional */}
      <Card className="p-5 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Nota:</strong> La distribución contable se genera automáticamente en base a los parámetros configurados.
          {isNoDomiciliado
            ? ' El monto refleja el total obligación (USD) de la pestaña de Información Monetaria.'
            : ' El monto refleja el valor del IGV ingresado en la pestaña de Información Monetaria.'}
        </p>
      </Card>
    </div>
  );
}
