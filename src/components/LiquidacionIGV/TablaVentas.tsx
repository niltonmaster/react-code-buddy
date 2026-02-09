import { ConceptoVenta } from './types';

interface Props {
  titulo: string;
  datos: ConceptoVenta[];
  onUpdateDato: (id: string, field: 'base' | 'igv', value: number) => void;
  showHeader?: boolean;
}

export function TablaVentas({ titulo, datos, onUpdateDato, showHeader = true }: Props) {
  const formatNumber = (num: number) => {
    return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleInputChange = (id: string, field: 'base' | 'igv', value: string) => {
    const numValue = parseFloat(value.replace(/,/g, '')) || 0;
    onUpdateDato(id, field, numValue);
  };

  return (
    <div className="overflow-x-auto">
      <table className="excel-table">
        {showHeader && (
          <thead>
            <tr>
              <th className="w-[40%]">Concepto</th>
              <th className="w-[25%]">Rango de Comprobantes</th>
              <th className="w-[17%] text-right">Base Imponible</th>
              <th className="w-[18%] text-right">IGV 18%</th>
            </tr>
          </thead>
        )}
        <tbody>
          {titulo && (
            <tr className="bg-primary/5">
              <td colSpan={4} className="font-bold text-primary text-sm py-1">
                {titulo}
              </td>
            </tr>
          )}
          {datos.map((item) => (
            <tr 
              key={item.id} 
              className={`${item.isHeader ? 'bg-muted/70 font-semibold' : ''} ${item.isNegative ? 'text-destructive' : ''}`}
            >
              <td className={`text-sm ${item.isHeader ? 'font-semibold' : ''}`}>
                {item.concepto}
              </td>
              <td className="text-xs text-muted-foreground font-mono">
                {item.rango}
              </td>
              <td className="p-0">
                <input
                  type="text"
                  className={`excel-input py-2 ${item.isNegative ? 'text-destructive' : ''}`}
                  value={formatNumber(item.base)}
                  onChange={(e) => handleInputChange(item.id, 'base', e.target.value)}
                />
              </td>
              <td className="p-0">
                <input
                  type="text"
                  className={`excel-input py-2 ${item.isNegative ? 'text-destructive' : ''}`}
                  value={formatNumber(item.igv)}
                  onChange={(e) => handleInputChange(item.id, 'igv', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
