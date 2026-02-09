import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DevengadoFormData } from './constants';

interface Props {
  formData: DevengadoFormData;
  onChange: (field: keyof DevengadoFormData, value: string | number | boolean) => void;
  isNoDomiciliado?: boolean;
  isFromPagoFacil?: boolean;
}

const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const parseFormattedNumber = (value: string): number => {
  const cleaned = value.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export function TabInformacionMonetaria({ formData, onChange, isNoDomiciliado = false, isFromPagoFacil = false }: Props) {

  const isPagoFacilD = isFromPagoFacil && !isNoDomiciliado;
  const isPagoFacilND = isFromPagoFacil && isNoDomiciliado;
  const isNDManual = isNoDomiciliado && !isFromPagoFacil;

  const camposBloqueados = isFromPagoFacil;

  // ---- useEffect SOLO para ND Manual ----
  // Recalcula igv, igvSoles y totalObligacion cuando cambian los inputs editables
  const prevCalcRef = useRef({ igv: -1, igvSoles: -1, total: -1 });

  useEffect(() => {
    if (!isNDManual) return;

    const montoAfecto = formData.montoAfecto || 0;
    const tipoCambio = formData.tipoCambio || 0;
    const noAfecto = formData.noAfectoImpuestos || 0;
    const otrosImp = formData.otrosImpuestos || 0;

    // IGV = 18% de montoAfecto
    const newIgv = Math.round(montoAfecto * 0.18 * 100) / 100;
    // IGV en soles (informativo)
    const newIgvSoles = Math.round(newIgv * tipoCambio * 100) / 100;
    // Total obligación
    const newTotal = Math.round((montoAfecto + noAfecto + newIgv + otrosImp) * 100) / 100;

    const prev = prevCalcRef.current;
    if (prev.igv === newIgv && prev.igvSoles === newIgvSoles && prev.total === newTotal) return;

    prevCalcRef.current = { igv: newIgv, igvSoles: newIgvSoles, total: newTotal };

    if (formData.igv !== newIgv) onChange('igv', newIgv);
    if (formData.igvSoles !== newIgvSoles) onChange('igvSoles', newIgvSoles);
    if (formData.totalObligacion !== newTotal) onChange('totalObligacion', newTotal);
  }, [isNDManual, formData.montoAfecto, formData.tipoCambio, formData.noAfectoImpuestos, formData.otrosImpuestos]);

  // Handler de montos para IGV D (domiciliado) — sin cambios en lógica
  const handleMontoChangeD = (field: 'montoAfecto' | 'noAfectoImpuestos' | 'igv', value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange(field, numValue);

    const montoAfecto = field === 'montoAfecto' ? numValue : formData.montoAfecto;
    const noAfecto = field === 'noAfectoImpuestos' ? numValue : formData.noAfectoImpuestos;
    const igv = field === 'igv' ? numValue : formData.igv;
    const otrosImpuestos = formData.otrosImpuestos || 0;

    const total = montoAfecto + noAfecto + igv + otrosImpuestos;
    onChange('totalObligacion', total);
    onChange('montoDistribucion', total);
  };

  // Handler de montoAfecto para ND Manual (solo actualiza montoAfecto, useEffect hace el resto)
  const handleMontoAfectoND = (value: string) => {
    const numValue = parseFormattedNumber(value);
    onChange('montoAfecto', numValue);
  };

  // Total obligación display
  const totalObligacionDisplay = isNoDomiciliado
    ? (formData.montoAfecto || 0) + (formData.noAfectoImpuestos || 0) + (formData.igv || 0) + (formData.otrosImpuestos || 0)
    : formData.totalObligacion;

  const monedaSymbol = isNoDomiciliado ? 'US$' : 'S/';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sección: Montos del documento */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Montos del documento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Moneda del documento</Label>
            <Select
              value={formData.monedaDocumento}
              onValueChange={(v) => onChange('monedaDocumento', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Local">Local (PEN)</SelectItem>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Monto afecto a impuesto {isNoDomiciliado && '(USD)'}
            </Label>
            <Input
              type={isNoDomiciliado ? "text" : "number"}
              value={isNoDomiciliado ? formatNumber(formData.montoAfecto) : (formData.montoAfecto || '')}
              onChange={(e) => {
                if (isNoDomiciliado) {
                  // ND Manual: solo actualiza montoAfecto, useEffect calcula el resto
                  // ND PagoFacil: bloqueado, no llega aquí
                  handleMontoAfectoND(e.target.value);
                } else {
                  handleMontoChangeD('montoAfecto', e.target.value);
                }
              }}
              disabled={camposBloqueados}
              className={`font-mono text-right ${camposBloqueados ? "bg-muted/50" : "bg-white"}`}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">No afecto a impuestos</Label>
            <Input
              type={isNoDomiciliado ? "text" : "number"}
              value={isNoDomiciliado ? formatNumber(formData.noAfectoImpuestos || 0) : (formData.noAfectoImpuestos || '')}
              onChange={(e) => {
                if (!isNoDomiciliado) handleMontoChangeD('noAfectoImpuestos', e.target.value);
              }}
              disabled
              className="font-mono text-right bg-muted/50"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Impuesto a las ventas (IGV) {isNoDomiciliado && '(USD)'}
            </Label>
            <Input
              type={isNoDomiciliado ? "text" : "number"}
              value={isNoDomiciliado ? formatNumber(formData.igv) : (formData.igv || '')}
              onChange={(e) => {
                if (!isNoDomiciliado) handleMontoChangeD('igv', e.target.value);
              }}
              disabled
              className="font-mono text-right bg-muted/50"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Otros impuestos / Retenciones</Label>
            <Input
              type="number"
              value={formData.otrosImpuestos || 0}
              disabled
              className="font-mono text-right bg-muted/50"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Total obligación / Total a pagar {isNoDomiciliado && '(USD)'}
            </Label>
            <div className="highlight-cell rounded-md px-3 py-2 text-right font-mono font-semibold text-lg">
              {monedaSymbol} {formatNumber(totalObligacionDisplay)}
            </div>
          </div>
        </div>

        {/* Tipo de cambio — SOLO para ND */}
        {isNoDomiciliado && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de cambio (SBS)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.tipoCambio || ''}
                  onChange={(e) => onChange('tipoCambio', parseFloat(e.target.value) || 0)}
                  disabled={isPagoFacilND}
                  className={`font-mono text-right ${isPagoFacilND ? "bg-muted/50" : "bg-white"}`}
                  placeholder="0.000"
                />
              </div>
            </div>
          </div>
        )}

        {/* IGV en soles — SOLO para ND (informativo, NO afecta total amarillo) */}
        {isNoDomiciliado && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">IGV en Soles (informativo – para distribución contable y pago SUNAT)</Label>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 text-right font-mono font-semibold">
                  S/ {formatNumber(
                    isNDManual
                      ? (formData.igvSoles || 0)
                      : (formData.igvSoles || formData.totalObligacion || 0)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Sección: Información del pago */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Información del pago</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Moneda de pago</Label>
            <Select
              value={formData.monedaPago}
              onValueChange={(v) => onChange('monedaPago', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Local">Local (PEN)</SelectItem>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cuenta bancaria</Label>
            <Select
              value={formData.cuentaBancaria}
              onValueChange={(v) => onChange('cuentaBancaria', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione cuenta bancaria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="001-001-00001234567">001-001-00001234567 - BN Corriente</SelectItem>
                <SelectItem value="001-001-00007654321">001-001-00007654321 - BN Ahorros</SelectItem>
                <SelectItem value="002-001-00009876543">002-001-00009876543 - BCP Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Sección: Características */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Características</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generarPago"
              checked={formData.generarPagoAutomatico}
              onCheckedChange={(checked) => onChange('generarPagoAutomatico', !!checked)}
            />
            <Label htmlFor="generarPago" className="text-sm cursor-pointer">
              Generar pago (Automático)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="aplicarRetencion" />
            <Label htmlFor="aplicarRetencion" className="text-sm cursor-pointer text-muted-foreground">
              Aplicar retención
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="pagoAnticipado" />
            <Label htmlFor="pagoAnticipado" className="text-sm cursor-pointer text-muted-foreground">
              Pago anticipado
            </Label>
          </div>
        </div>
      </Card>
    </div>
  );
}
