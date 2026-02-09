import { useState } from 'react';
import { PantallaSeleccion } from './PantallaSeleccion';
import { PantallaLiquidacion } from './PantallaLiquidacion';
import { PantallaPagoFacil } from './PantallaPagoFacil';
import { PantallaActiva, PeriodoSeleccionado, ConceptoVenta, TotalesLiquidacion } from './types';

interface DatosParaPagoFacil {
  facturas: ConceptoVenta[];
  boletas: ConceptoVenta[];
  notasDebito: ConceptoVenta[];
  notasCredito: ConceptoVenta[];
  ventasNoGravadas: ConceptoVenta[];
  totales: TotalesLiquidacion;
}

export function LiquidacionIGV() {
  const [pantallaActiva, setPantallaActiva] = useState<PantallaActiva>('seleccion');
  const [periodo, setPeriodo] = useState<PeriodoSeleccionado>({ año: 2025, mes: 9 });
  const [importePagar, setImportePagar] = useState(0);
  const [datosLiquidacion, setDatosLiquidacion] = useState<DatosParaPagoFacil | null>(null);

  const handleGenerarLiquidacion = (periodoSeleccionado: PeriodoSeleccionado) => {
    setPeriodo(periodoSeleccionado);
    setPantallaActiva('liquidacion');
  };

  const handleVerPagoFacil = (importe: number, datos: DatosParaPagoFacil) => {
    setImportePagar(importe);
    setDatosLiquidacion(datos);
    setPantallaActiva('pagoFacil');
  };

  const handleVolverSeleccion = () => {
    setPantallaActiva('seleccion');
  };

  const handleVolverLiquidacion = () => {
    setPantallaActiva('liquidacion');
  };

  return (
    <>
      {pantallaActiva === 'seleccion' && (
        <PantallaSeleccion onGenerarLiquidacion={handleGenerarLiquidacion} />
      )}
      {pantallaActiva === 'liquidacion' && (
        <PantallaLiquidacion
          periodo={periodo}
          onVerPagoFacil={handleVerPagoFacil}
          onVolver={handleVolverSeleccion}
        />
      )}
      {pantallaActiva === 'pagoFacil' && datosLiquidacion && (
        <PantallaPagoFacil
          periodo={periodo}
          importe={importePagar}
          datosLiquidacion={datosLiquidacion}
          onVolver={handleVolverLiquidacion}
        />
      )}
    </>
  );
}
