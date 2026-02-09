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

// Helper para formatear números con separador de miles
const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// E) Helper para parsear números con comas (quitar comas, permitir punto)
const parseFormattedNumber = (value: string): number => {
  // Quitar comas y parsear
  const cleaned = value.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export function TabInformacionMonetaria({ formData, onChange, isNoDomiciliado = false, isFromPagoFacil = false }: Props) {

  const isPagoFacilD = isFromPagoFacil && !isNoDomiciliado;

  const isPagoFacilND = isFromPagoFacil && isNoDomiciliado;
  const isNDManual = isNoDomiciliado && !isFromPagoFacil; // ND y no PF



  const camposBloqueados = isFromPagoFacil;


  // E) Para ND: usar input type="text" con formato de comas
  const handleMontoChange = (field: 'montoAfecto' | 'noAfectoImpuestos' | 'igv', value: string) => {
    // Si es ND, parsear número con comas
    const numValue = isNoDomiciliado ? parseFormattedNumber(value) : (parseFloat(value) || 0);
    onChange(field, numValue);

    // Recalcular total automáticamente
    const montoAfecto = field === 'montoAfecto' ? numValue : formData.montoAfecto;
    const noAfecto = field === 'noAfectoImpuestos' ? numValue : formData.noAfectoImpuestos;
    const igv = field === 'igv' ? numValue : formData.igv;
    const otrosImpuestos = formData.otrosImpuestos;

    const total = montoAfecto + noAfecto + igv + otrosImpuestos;
    onChange('totalObligacion', total);
    onChange('montoDistribucion', total);
  };

  // E) Para ND: manejar input con formato de comas
  const handleFormattedInputChange = (field: 'montoAfecto' | 'noAfectoImpuestos' | 'igv', inputValue: string) => {
    // Permitir solo números, comas y punto decimal
    const cleaned = inputValue.replace(/[^0-9.,]/g, '');
    handleMontoChange(field, cleaned);
  };

  // Para ND: Total obligación = Base USD + IGV USD
  const totalObligacionDisplay = isNoDomiciliado
    ? formData.montoAfecto + formData.igv
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
            {/* E) Para ND: input tipo text con formato de comas */}
            <Input
              type={isNoDomiciliado ? "text" : "number"}
              value={isNoDomiciliado ? formatNumber(formData.montoAfecto) : (formData.montoAfecto || '')}
              onChange={(e) => isNoDomiciliado
                ? handleFormattedInputChange('montoAfecto', e.target.value)
                : handleMontoChange('montoAfecto', e.target.value)
              }
              //NILTON
              disabled={camposBloqueados}
              // className={camposBloqueados ? "bg-muted/50" : ""}
              // className="font-mono text-right  "

              className={`font-mono text-right ${camposBloqueados ? "bg-muted/50" : "bg-white"
                }`}



              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">No afecto a impuestos</Label>
            {/* E) Para ND: input tipo text con formato de comas */}
            <Input
              type={isNoDomiciliado ? "text" : "number"}
              value={isNoDomiciliado ? formatNumber(formData.noAfectoImpuestos) : (formData.noAfectoImpuestos || '')}
              onChange={(e) => isNoDomiciliado
                ? handleFormattedInputChange('noAfectoImpuestos', e.target.value)
                : handleMontoChange('noAfectoImpuestos', e.target.value)
              }
              disabled
              className="font-mono text-right bg-muted/50"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Impuesto a las ventas (IGV) {isNoDomiciliado && '(USD)'}
            </Label>
            {/* E) Para ND: input tipo text con formato de comas */}
            <Input
              type={isNoDomiciliado ? "text" : "number"}
              value={isNoDomiciliado ? formatNumber(formData.igv) : (formData.igv || '')}
              onChange={(e) => isNoDomiciliado
                ? handleFormattedInputChange('igv', e.target.value)
                : handleMontoChange('igv', e.target.value)
              }

              disabled
              className="font-mono text-right bg-muted/50"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Otros impuestos / Retenciones</Label>
            <Input
              type="number"
              value={formData.otrosImpuestos || ''}
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

        {/* Mostrar IGV en soles solo para ND (referencia para distribución) */}
        {isNoDomiciliado && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">IGV en Soles (para distribución contable y pago SUNAT)</Label>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 text-right font-mono font-semibold">
                  S/ {formatNumber(formData.totalObligacion)}
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
