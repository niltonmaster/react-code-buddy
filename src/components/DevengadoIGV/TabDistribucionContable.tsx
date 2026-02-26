import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DevengadoFormData,
  PARAMS_DEVENGADO_IGV,
  CUENTA_IGV_SERVICIO_ND,
  CUENTA_IGV_NO_DOMICILIADO,
  CUENTAS_COMISION_ND,
  CuentasComisionPar,
  getCuentaComisionKey,
  PERSONA_ND,
} from './constants';

interface Props {
  formData: DevengadoFormData;
  isFromPagoFacil?: boolean;
  isNoDomiciliado?: boolean;
  portafolio?: string;
  proveedores?: string[];
  facturaNro?: string;
}

const fmt = (v: number) =>
  v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TabDistribucionContable({
  formData,
  isFromPagoFacil = false,
  isNoDomiciliado = false,
  portafolio = '',
  proveedores = [],
  facturaNro = '',
}: Props) {
  // ─── Caso IGV Domiciliado (D) — tabla simple ───
  if (!isNoDomiciliado) {
    return (
      <TabDistribucionDomiciliado formData={formData} />
    );
  }

  // ─── Caso IGV No Domiciliado (ND) — tabla 4 líneas ───
  return (
    <TabDistribucionNoDomiciliado
      formData={formData}
      portafolio={portafolio}
      proveedores={proveedores}
      facturaNro={facturaNro}
    />
  );
}

// ════════════════════════════════════════════════════════
// Sub-componente: Domiciliado (D) — 1 línea editable
// ════════════════════════════════════════════════════════

function TabDistribucionDomiciliado({ formData }: { formData: DevengadoFormData }) {
  const params = PARAMS_DEVENGADO_IGV;
  const montoDisplay = formData.montoDistribucion;

  const [cuenta, setCuenta] = useState(params.cuentaContable);
  const [descripcion, setDescripcion] = useState(params.cuentaContableNombre);

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
                  <Input
                    value={cuenta}
                    onChange={(e) => setCuenta(e.target.value)}
                    className="h-7 text-xs font-mono w-28 inline-block"
                  />
                  <span className="text-muted-foreground ml-2">– {descripcion}</span>
                </td>
                <td>
                  <span className="font-mono text-primary font-medium">{params.centroCostoCodigo}</span>
                  <span className="text-muted-foreground ml-2">– {params.centroCostoNombre}</span>
                </td>
                <td>
                  <span className="font-mono text-primary font-medium">{params.proveedorCodigo}</span>
                  <span className="text-muted-foreground ml-2">– {params.proveedorNombre}</span>
                </td>
                <td>
                  <Input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="h-7 text-xs w-48"
                  />
                </td>
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

// ════════════════════════════════════════════════════════
// Sub-componente: No Domiciliado (ND) — 4 líneas editables
// ════════════════════════════════════════════════════════

interface LineaContableEditable {
  cuenta: string;
  descripcion: string;
  localDebe: number;
  localHaber: number;
  usdDebe: number;
  usdHaber: number;
  editable: boolean; // si cuenta/descripción son editables
}

function TabDistribucionNoDomiciliado({
  formData,
  portafolio,
  proveedores,
  facturaNro = '',
}: {
  formData: DevengadoFormData;
  portafolio: string;
  proveedores: string[];
  facturaNro?: string;
}) {
  const tc = formData.tipoCambio || 0;
  const baseUsd = formData.montoAfecto || 0;
  const igvUsd = formData.igv || 0;
  const baseSoles = Math.round(baseUsd * tc * 100) / 100;
  const igvSoles = Math.round(igvUsd * tc * 100) / 100;

  // Resolver cuentas variables
  const cuentaKey = getCuentaComisionKey(portafolio, proveedores);
  const cuentaPar: CuentasComisionPar = CUENTAS_COMISION_ND[cuentaKey] || {
    lineaHaber: { cuenta: '0000000', descripcion: `Comisiones portafolio ${portafolio || 'N/D'}` },
    lineaDebe: { cuenta: '0000000', descripcion: `Comisiones portafolio ${portafolio || 'N/D'}` },
  };

  // Estado editable para las 4 líneas (cuenta + descripción)
  const [cuentas, setCuentas] = useState([
    { cuenta: cuentaPar.lineaHaber.cuenta, descripcion: cuentaPar.lineaHaber.descripcion },
    { cuenta: CUENTA_IGV_SERVICIO_ND.cuenta, descripcion: CUENTA_IGV_SERVICIO_ND.descripcion },
    { cuenta: cuentaPar.lineaDebe.cuenta, descripcion: cuentaPar.lineaDebe.descripcion },
    { cuenta: CUENTA_IGV_NO_DOMICILIADO.cuenta, descripcion: CUENTA_IGV_NO_DOMICILIADO.descripcion },
  ]);

  // Sincronizar si cambia portafolio/proveedor
  useEffect(() => {
    const newPar: CuentasComisionPar = CUENTAS_COMISION_ND[cuentaKey] || {
      lineaHaber: { cuenta: '0000000', descripcion: `Comisiones portafolio ${portafolio || 'N/D'}` },
      lineaDebe: { cuenta: '0000000', descripcion: `Comisiones portafolio ${portafolio || 'N/D'}` },
    };
    setCuentas([
      { cuenta: newPar.lineaHaber.cuenta, descripcion: newPar.lineaHaber.descripcion },
      { cuenta: CUENTA_IGV_SERVICIO_ND.cuenta, descripcion: CUENTA_IGV_SERVICIO_ND.descripcion },
      { cuenta: newPar.lineaDebe.cuenta, descripcion: newPar.lineaDebe.descripcion },
      { cuenta: CUENTA_IGV_NO_DOMICILIADO.cuenta, descripcion: CUENTA_IGV_NO_DOMICILIADO.descripcion },
    ]);
  }, [cuentaKey, portafolio]);

  const updateCuenta = (idx: number, field: 'cuenta' | 'descripcion', value: string) => {
    setCuentas(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  // Estado editable para Persona y Factura (nuevas columnas)
  const personaDefault = PERSONA_ND[cuentaKey] || '';
  const facturaDefault = facturaNro ? `OB${facturaNro}` : '';
  const [personas, setPersonas] = useState([personaDefault, personaDefault, personaDefault, personaDefault]);
  const [facturas, setFacturas] = useState([facturaDefault, facturaDefault, facturaDefault, facturaDefault]);

  // Sincronizar factura y persona si cambian los props
  useEffect(() => {
    const val = facturaNro ? `OB${facturaNro}` : '';
    setFacturas([val, val, val, val]);
    const p = PERSONA_ND[cuentaKey] || '';
    setPersonas([p, p, p, p]);
  }, [facturaNro, cuentaKey]);

  const updatePersona = (idx: number, value: string) => {
    setPersonas(prev => prev.map((p, i) => i === idx ? value : p));
  };
  const updateFactura = (idx: number, value: string) => {
    setFacturas(prev => prev.map((f, i) => i === idx ? value : f));
  };

  const lineas: LineaContableEditable[] = [
    { ...cuentas[0], localDebe: 0, localHaber: baseSoles, usdDebe: 0, usdHaber: baseUsd, editable: true },
    { ...cuentas[1], localDebe: 0, localHaber: igvSoles, usdDebe: 0, usdHaber: igvUsd, editable: true },
    { ...cuentas[2], localDebe: baseSoles, localHaber: 0, usdDebe: baseUsd, usdHaber: 0, editable: true },
    { ...cuentas[3], localDebe: igvSoles, localHaber: 0, usdDebe: igvUsd, usdHaber: 0, editable: true },
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
                <th>Persona</th>
                <th>Factura</th>
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
                  <td>
                    <Input
                      value={l.cuenta}
                      onChange={(e) => updateCuenta(i, 'cuenta', e.target.value)}
                      className="h-7 text-xs font-mono w-24"
                    />
                  </td>
                  <td>
                    <Input
                      value={l.descripcion}
                      onChange={(e) => updateCuenta(i, 'descripcion', e.target.value)}
                      className="h-7 text-xs w-64"
                    />
                  </td>
                  <td>
                    <Input
                      value={personas[i]}
                      onChange={(e) => updatePersona(i, e.target.value)}
                      className="h-7 text-xs font-mono w-16"
                    />
                  </td>
                  <td>
                    <Input
                      value={facturas[i]}
                      onChange={(e) => updateFactura(i, e.target.value)}
                      className="h-7 text-xs font-mono w-32"
                    />
                  </td>
                  <td className="text-right font-mono border-l border-border">
                    {l.localDebe > 0 ? fmt(l.localDebe) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                  <td className={`text-right font-mono ${l.localHaber > 0 ? 'text-destructive' : ''}`}>
                    {l.localHaber > 0 ? fmt(l.localHaber) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                  <td className="text-right font-mono border-l border-border">
                    {l.usdDebe > 0 ? fmt(l.usdDebe) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                  <td className={`text-right font-mono ${l.usdHaber > 0 ? 'text-destructive' : ''}`}>
                    {l.usdHaber > 0 ? fmt(l.usdHaber) : <span className="text-muted-foreground/50">.00</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={5} className="text-right">Total Voucher:</td>
                <td className="text-right font-mono border-l border-border">{fmt(totalLocalDebe)}</td>
                <td className="text-right font-mono text-destructive">{fmt(totalLocalHaber)}</td>
                <td className="text-right font-mono border-l border-border">{fmt(totalUsdDebe)}</td>
                <td className="text-right font-mono text-destructive">{fmt(totalUsdHaber)}</td>
              </tr>
              <tr className="text-xs text-muted-foreground">
                <td colSpan={5} className="text-right">Diferencia:</td>
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
          Montos calculados con TC {tc.toFixed(3)}. Las cuentas contables son editables.
          {cuentas[0].cuenta === '0000000' && (
            <span className="text-amber-600 ml-1">⚠ Cuenta contable pendiente de configuración para esta combinación.</span>
          )}
        </p>
      </Card>
    </div>
  );
}
