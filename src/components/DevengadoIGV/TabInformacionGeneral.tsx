import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FIELD_CONFIG_DEVENGADO, DevengadoFormData } from './constants';

interface Props {
  formData: DevengadoFormData;
  onChange: (field: keyof DevengadoFormData, value: string | number | boolean) => void;
  isNoDomiciliado?: boolean;
  isFromPagoFacil?: boolean;
}

export function TabInformacionGeneral({ formData, onChange, isNoDomiciliado = false, isFromPagoFacil = false }: Props) {
  // Campos siempre deshabilitados (datos del proveedor precargados)
  const camposBloqueados = isFromPagoFacil;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sección: Información del proveedor */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Información del proveedor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Proveedor</Label>
            <Input
              value={formData.proveedor}
              onChange={(e) => onChange('proveedor', e.target.value)}
              disabled={camposBloqueados}
              className={camposBloqueados ? "bg-muted/50" : ""}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">RUC/NIT</Label>
            <Input
              value={formData.ruc}
              onChange={(e) => onChange('ruc', e.target.value)}
              disabled={camposBloqueados}
              className={camposBloqueados ? "bg-muted/50" : ""}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Entidad</Label>
            <Input
              value={formData.entidad}
              onChange={(e) => onChange('entidad', e.target.value)}
              disabled={camposBloqueados}
              className={camposBloqueados ? "bg-muted/50" : ""}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de documento</Label>
            <Input
              value={formData.tipoDocumento}
              onChange={(e) => onChange('tipoDocumento', e.target.value)}
              disabled={camposBloqueados}
              className={camposBloqueados ? "bg-muted/50" : ""}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pagar a</Label>
            <Input
              value={formData.pagarA}
              onChange={(e) => onChange('pagarA', e.target.value)}
              disabled={camposBloqueados}
              className={camposBloqueados ? "bg-muted/50" : ""}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Documento Nº</Label>
            <Input
              value={formData.documentoNumero}
              onChange={(e) => onChange('documentoNumero', e.target.value)}
              placeholder={isNoDomiciliado ? "GE/0002499" : "IGVFCRSET2025"}
            />
          </div>
        </div>
      </Card>

      {/* Sección: Fechas del documento - SIEMPRE EDITABLES con valores sugeridos */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Fechas del documento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Registro</Label>
            <Input
              value={formData.fechaRegistro}
              disabled
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
            <Input
              type="date"
              value={formData.fechaEmision}
              onChange={(e) => onChange('fechaEmision', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha Recepción</Label>
            <Input
              type="date"
              value={formData.fechaRecepcion}
              onChange={(e) => onChange('fechaRecepcion', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha Vencimiento</Label>
            <Input
              type="date"
              value={formData.fechaVencimiento}
              onChange={(e) => onChange('fechaVencimiento', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha Prog. Pago</Label>
            <Input
              type="date"
              value={formData.fechaProgramacionPago}
              onChange={(e) => onChange('fechaProgramacionPago', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Sección: Información adicional - Combos SIEMPRE EDITABLES con valores sugeridos */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Información adicional</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Unidad de negocio</Label>
            <Select
              value={formData.unidadNegocio}
              onValueChange={(v) => onChange('unidadNegocio', v)}
              disabled={camposBloqueados}
            >
              <SelectTrigger className={camposBloqueados ? "bg-muted/50" : ""}>
                <SelectValue placeholder="Seleccione unidad de negocio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FCR-DL 19990">FCR-DL 19990</SelectItem>
                <SelectItem value="FCR-MACROFONDO">FCR-MACROFONDO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de servicio</Label>
            <Select
              value={formData.tipoServicio}
              onValueChange={(v) => onChange('tipoServicio', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No afecto a ninguna">No afecto a ninguna</SelectItem>
                <SelectItem value="Afecto IGV">Afecto IGV</SelectItem>
                <SelectItem value="Exonerado">Exonerado</SelectItem>
                <SelectItem value="IGV No Domiciliado">IGV No Domiciliado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de pago</Label>
            <Select
              value={formData.tipoPago}
              onValueChange={(v) => onChange('tipoPago', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Débito en cuenta">Débito en cuenta</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Sección: Información documentaria */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Información documentaria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">#Registro</Label>
            <Input
              value=""
              disabled
              placeholder="Se genera al guardar (demo)"
              className="bg-muted/50 text-muted-foreground"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ingresado por</Label>
            <Input
              value="usuario.demo"
              disabled
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Revisado por</Label>
            <Input
              value=""
              disabled
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Aprobador</Label>
            <Input
              value=""
              disabled
              className="bg-muted/50"
            />
          </div>
        </div>
      </Card>

      {/* Sección: Glosa del asiento - SIEMPRE EDITABLE */}
      <Card className="p-5">
        <h3 className="section-title mb-4">Glosa del asiento</h3>
        <Textarea
          value={formData.glosa}
          onChange={(e) => onChange('glosa', e.target.value)}
          placeholder="Ingrese la glosa del asiento contable..."
          className="min-h-[80px]"
        />
      </Card>
    </div>
  );
}
