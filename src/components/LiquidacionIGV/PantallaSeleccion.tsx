import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { PeriodoSeleccionado } from './types';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onGenerarLiquidacion: (periodo: PeriodoSeleccionado) => void;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const años = [2023, 2024, 2025, 2026];

// Periodo con información cargada y conciliada (simulado)
const PERIODO_DISPONIBLE = { año: 2025, mes: 9 }; // Setiembre 2025

export function PantallaSeleccion({ onGenerarLiquidacion }: Props) {
  const [año, setAño] = useState<number>(2025);
  const [mes, setMes] = useState<number>(9);
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const { toast } = useToast();

  const periodoDisponible = año === PERIODO_DISPONIBLE.año && mes === PERIODO_DISPONIBLE.mes;

  const handleGenerar = () => {
    if (periodoDisponible) {
      onGenerarLiquidacion({ año, mes });
    } else {
      setMostrarAdvertencia(true);
      toast({
        variant: "destructive",
        title: "Periodo no disponible",
        description: "No es posible generar la liquidación del IGV para el periodo seleccionado. Verifique que el Registro de Ventas (DIN) se haya cargado y conciliado previamente.",
      });
    }
  };

  const handlePeriodoChange = (nuevoAño?: number, nuevoMes?: number) => {
    if (nuevoAño !== undefined) setAño(nuevoAño);
    if (nuevoMes !== undefined) setMes(nuevoMes);
    setMostrarAdvertencia(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in">
      <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Preparar Liquidación del IGV del Mes</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Fondo Consolidado de Reservas Previsionales – FCR
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Selectores de periodo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Año</label>
              <Select 
                value={año.toString()} 
                onValueChange={(v) => handlePeriodoChange(parseInt(v), undefined)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {años.map(a => (
                    <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mes</label>
              <Select 
                value={mes.toString()} 
                onValueChange={(v) => handlePeriodoChange(undefined, parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Texto informativo - Origen de la información */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Origen de la información</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los datos del Registro de Ventas (DIN) se obtienen automáticamente 
              a partir de los procesos de carga y conciliación realizados en el sistema. 
              En esta pantalla solo se selecciona el periodo a liquidar.
            </p>
          </div>

          {/* Mensaje de advertencia */}
          {mostrarAdvertencia && !periodoDisponible && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                No es posible generar la liquidación del IGV para el periodo seleccionado. 
                Verifique que el Registro de Ventas (DIN) se haya cargado y conciliado previamente.
              </p>
            </div>
          )}

          {/* Botón principal */}
          <Button 
            onClick={handleGenerar}
            className="w-full h-12 text-base font-semibold"
            variant={periodoDisponible ? "default" : "secondary"}
          >
            Generar Liquidación del IGV
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
