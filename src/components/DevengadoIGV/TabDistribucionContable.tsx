import { Card } from '@/components/ui/card';
import {
  DevengadoFormData,
  PARAMS_DEVENGADO_IGV,
  PARAMS_DEVENGADO_IGV_ND,
  CUENTA_IGV_SERVICIO_ND,
  CUENTA_IGV_NO_DOMICILIADO,
  CUENTAS_COMISION_ND,
  getCuentaComisionKey,
} from './constants';

interface Props {
  formData: DevengadoFormData;
  isFromPagoFacil?: boolean;
  isNoDomiciliado?: boolean;
  portafolio?: string;
  proveedores?: string[];
}

const fmt = (v: number) =>
  v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface LineaContable {
  cuenta: string;
  descripcion: string;
  localDebe: number;
  localHaber: number;
  usdDebe: number;
  usdHaber: number;
}

export function TabDistribucionContable({
  formData,
  isFromPagoFacil = false,
  isNoDomiciliado = false,
  portafolio = '',
  proveedores = [],
}: Props) {
  // ─── Caso IGV Domiciliado (D) — tabla simple original ───
  if (!isNoDomiciliado) {
    const params = PARAMS_DEVENGADO_IGV;
    const montoDisplay = formData.montoDistribucion;
    return (
      <div className="space-y-6 animate-fade-in">
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
                    <span className="font-mono text-primary font-medium">{params.cuentaContable}</span>
                    <span className="text-muted-foreground ml-2">– {params.cuentaContableNombre}</span>
                  </td>
                  <td>
                    <span className="font-mono text-primary font-medium">{params.centroCostoCodigo}</span>
                    <span className="text-muted-foreground ml-2">– {params.centroCostoNombre}</span>
                  </td>
                  <td>
                    <span className="font-mono text-primary font-medium">{params.proveedorCodigo}</span>
                    <span className="text-muted-foreground ml-2">– {params.proveedorNombre}</span>
                  </td>
                  <td className="text-muted-foreground">Liquidación IGV periodo</td>
                  <td className="text-right">
                    <span className="highlight-cell px-3 py-1 rounded font-mono font-semibold">
                      S/ {fmt(montoDisplay)}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td colSpan={5} className="text-right">Total distribuido:</td>
                  <td className="text-right font-mono">S/ {fmt(montoDisplay)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Caso IGV No Domiciliado (ND) — tabla con 4 líneas ───
  const tc = formData.tipoCambio || 0;
  const baseUsd = formData.montoAfecto || 0;
  const igvUsd = formData.igv || 0;
  const baseSoles = Math.round(baseUsd * tc * 100) / 100;
  const igvSoles = Math.round(igvUsd * tc * 100) / 100;

  // Resolver cuenta de comisión variable
  const cuentaKey = getCuentaComisionKey(portafolio, proveedores);
  const cuentaComision = CUENTAS_COMISION_ND[cuentaKey] || {
    cuenta: '0000000',
    descripcion: `Comisiones portafolio ${portafolio || 'N/D'}`,
  };

  const lineas: LineaContable[] = [
    {
      cuenta: cuentaComision.cuenta,
      descripcion: cuentaComision.descripcion,
      localDebe: 0,
      localHaber: baseSoles,
      usdDebe: 0,
      usdHaber: baseUsd,
    },
    {
      cuenta: CUENTA_IGV_SERVICIO_ND.cuenta,
      descripcion: CUENTA_IGV_SERVICIO_ND.descripcion,
      localDebe: 0,
      localHaber: igvSoles,
      usdDebe: 0,
      usdHaber: igvUsd,
    },
    {
      cuenta: cuentaComision.cuenta,
      descripcion: cuentaComision.descripcion,
      localDebe: baseSoles,
      localHaber: 0,
      usdDebe: baseUsd,
      usdHaber: 0,
    },
    {
      cuenta: CUENTA_IGV_NO_DOMICILIADO.cuenta,
      descripcion: CUENTA_IGV_NO_DOMICILIADO.descripcion,
      localDebe: igvSoles,
      localHaber: 0,
      usdDebe: igvUsd,
      usdHaber: 0,
    },
  ];

  const totalLocalDebe = lineas.reduce((s, l) => s + l.localDebe, 0);
  const totalLocalHaber = lineas.reduce((s, l) => s + l.localHaber, 0);
  const totalUsdDebe = lineas.reduce((s, l) => s + l.usdDebe, 0);
  const totalUsdHaber = lineas.reduce((s, l) => s + l.usdHaber, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-5">
        <h3 className="section-title mb-4">Detalle de distribución contable (Voucher AP)</h3>
        <div className="overflow-x-auto">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>Cuenta</th>
                <th>Cuenta / Descripción</th>
                <th colSpan={2} className="text-center border-l border-border">
                  L O C A L
                </th>
                <th colSpan={2} className="text-center border-l border-border">
                  D O L A R E S
                </th>
              </tr>
              <tr className="bg-muted/30">
                <th></th>
                <th></th>
                <th></th>
                <th className="text-right border-l border-border">Debe</th>
                <th className="text-right">Haber</th>
                <th className="text-right border-l border-border">Debe</th>
                <th className="text-right">Haber</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td className="text-center font-mono">{i + 1}</td>
                  <td className="font-mono text-primary font-medium whitespace-nowrap">{l.cuenta}</td>
                  <td className="text-muted-foreground">{l.descripcion}</td>
                  <td className="text-right font-mono border-l border-border">
                    {l.localDebe > 0 ? fmt(l.localDebe) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                  <td className={`text-right font-mono ${l.localHaber > 0 ? 'text-red-600' : ''}`}>
                    {l.localHaber > 0 ? fmt(l.localHaber) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                  <td className="text-right font-mono border-l border-border">
                    {l.usdDebe > 0 ? fmt(l.usdDebe) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                  <td className={`text-right font-mono ${l.usdHaber > 0 ? 'text-red-600' : ''}`}>
                    {l.usdHaber > 0 ? fmt(l.usdHaber) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={3} className="text-right">Total Voucher:</td>
                <td className="text-right font-mono border-l border-border">{fmt(totalLocalDebe)}</td>
                <td className="text-right font-mono text-red-600">{fmt(totalLocalHaber)}</td>
                <td className="text-right font-mono border-l border-border">{fmt(totalUsdDebe)}</td>
                <td className="text-right font-mono text-red-600">{fmt(totalUsdHaber)}</td>
              </tr>
              <tr className="text-xs text-muted-foreground">
                <td colSpan={3} className="text-right">Diferencia:</td>
                <td colSpan={2} className="text-center font-mono border-l border-border">
                  {fmt(Math.abs(totalLocalDebe - totalLocalHaber))}
                </td>
                <td colSpan={2} className="text-center font-mono border-l border-border">
                  {fmt(Math.abs(totalUsdDebe - totalUsdHaber))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-5 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Nota:</strong> La distribución contable se genera automáticamente según el portafolio
          ({portafolio || 'N/D'}) y proveedor(es) ({proveedores.join(', ') || 'N/D'}).
          Montos calculados con TC {tc.toFixed(3)}.
          {cuentaComision.cuenta === '0000000' && (
            <span className="text-amber-600 ml-1">⚠ Cuenta contable pendiente de configuración para esta combinación.</span>
          )}
        </p>
      </Card>
    </div>
  );
}
