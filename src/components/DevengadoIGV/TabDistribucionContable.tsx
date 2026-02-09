import { Card } from '@/components/ui/card';
import { DevengadoFormData, PARAMS_DEVENGADO_IGV } from './constants';

interface Props {
  formData: DevengadoFormData;
  isFromPagoFacil?: boolean;
}

export function TabDistribucionContable({ formData, isFromPagoFacil = false }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info superior */}

      {/* <Card className="p-5">
        <h3 className="section-title mb-4">Resumen de distribución</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Total a distribuir</p>
            <p className="text-xl font-bold font-mono">
              S/ {formData.totalObligacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Monto distribuido</p>
            <p className="text-xl font-bold font-mono text-[hsl(var(--positive-green))]">
              S/ {formData.montoDistribucion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <p className="text-xl font-bold font-mono">
              S/ 0.00
            </p>
          </div>
        </div>
      </Card> */}

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
                    {PARAMS_DEVENGADO_IGV.cuentaContable}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    – {PARAMS_DEVENGADO_IGV.cuentaContableNombre}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-primary font-medium">
                    {PARAMS_DEVENGADO_IGV.centroCostoCodigo}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    – {PARAMS_DEVENGADO_IGV.centroCostoNombre}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-primary font-medium">
                    {PARAMS_DEVENGADO_IGV.proveedorCodigo}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    – {PARAMS_DEVENGADO_IGV.proveedorNombre}
                  </span>
                </td>
                <td className="text-muted-foreground">
                  Liquidación IGV periodo
                </td>
                <td className="text-right">
                  <span className="highlight-cell px-3 py-1 rounded font-mono font-semibold">
                    S/ {formData.montoDistribucion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={5} className="text-right">Total distribuido:</td>
                <td className="text-right font-mono">
                  S/ {formData.montoDistribucion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
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
          El monto refleja el valor del IGV ingresado en la pestaña de Información Monetaria.
        </p>
      </Card>
    </div>
  );
}
