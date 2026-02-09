import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, ArrowLeft, Edit, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getDevengados, saveDevengado, DevengadoRecord, CuentaBancaria } from '@/lib/devengadosStorage';
import { savePago } from '@/lib/pagosStorage';

// Solo estados permitidos para Tesorería en Pre-Pago
const ESTADOS_PREPAGO = ['TODOS', 'REGISTRADO', 'EN_PREPAGO'] as const;
const ENTIDADES = ['FCR', 'ONP', 'ESSALUD'] as const;
const UNIDADES_NEGOCIO = ['FCR-DL 19990', 'FCR-DL 20530', 'FCR-MACROFONDO', 'ONP-PENSIONES'] as const;
const PAGE_SIZES = [10, 20, 50] as const;

const TIPOS_PAGO = ['Cheque', 'Transferencia', 'Efectivo', 'Carta Orden', 'Depósito en Cuenta'] as const;

const CUENTAS_BANCARIAS: Record<string, CuentaBancaria[]> = {
  'Cheque': [
    { id: 'CHQ-001', banco: 'BCP', numeroMasked: '****1234', moneda: 'PEN' },
    { id: 'CHQ-002', banco: 'BBVA', numeroMasked: '****5678', moneda: 'PEN' },
  ],
  'Transferencia': [
    { id: 'TRF-001', banco: 'BCP', numeroMasked: '****9012', moneda: 'PEN' },
    { id: 'TRF-002', banco: 'Interbank', numeroMasked: '****3456', moneda: 'PEN' },
    { id: 'TRF-003', banco: 'Scotiabank', numeroMasked: '****7890', moneda: 'USD' },
  ],
  'Efectivo': [],
  'Carta Orden': [
    { id: 'CO-001', banco: 'Banco de la Nación', numeroMasked: '****1111', moneda: 'PEN' },
  ],
  'Depósito en Cuenta': [
    { id: 'DEP-001', banco: 'BCP', numeroMasked: '****2222', moneda: 'PEN' },
    { id: 'DEP-002', banco: 'BBVA', numeroMasked: '****3333', moneda: 'PEN' },
  ],
};

function formatMonto(monto: number): string {
  return monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getEstadoBadgeVariant(estado: DevengadoRecord['estado']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (estado) {
    case 'REGISTRADO': return 'secondary';
    case 'EN_PREPAGO': return 'default';
    case 'PAGADO': return 'outline';
    case 'ANULADO': return 'destructive';
    default: return 'secondary';
  }
}

function normalizeKey(value?: string): string {
  // Normalización agresiva para evitar que variaciones como "FCR - MACROFONDO" vs "FCR-MACROFONDO" rompan los filtros
  return (value ?? '')
    .trim()
    .toUpperCase()
    // espacios, NBSP y guiones
    .replace(/[\s\u00A0-]+/g, '');
}

function normalizePeriodo(value: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const parts = raw.split('-').map(p => p.trim());
  if (parts.length !== 2) return raw;

  // YYYY-MM
  if (parts[0].length === 4) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}`;
  }

  // MM-YYYY
  const month = parts[0].padStart(2, '0');
  const year = parts[1];
  return `${year}-${month}`;
}

function getFechaHoy(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const day = hoy.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TesoreriaPrepagoPage() {
  const navigate = useNavigate();
  const [devengados, setDevengados] = useState<DevengadoRecord[]>([]);
  
  // Filtros
  const [filterEntidad, setFilterEntidad] = useState('FCR');
  const [filterUnidadNegocio, setFilterUnidadNegocio] = useState('FCR-DL 19990');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('REGISTRADO');
  const [filterProveedor, setFilterProveedor] = useState('');
  
  // Filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    entidad: 'FCR',
    unidadNegocio: 'FCR-DL 19990',
    periodo: '',
    estado: 'REGISTRADO',
    proveedor: ''
  });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // Modal Modificar
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevengado, setSelectedDevengado] = useState<DevengadoRecord | null>(null);
  const [modalTipoPago, setModalTipoPago] = useState('');
  const [modalCuentaBancaria, setModalCuentaBancaria] = useState<CuentaBancaria | null>(null);
  
  useEffect(() => {
    loadData();
    
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'igv_devengados_v1') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const loadData = () => {
    setDevengados(getDevengados());
  };

  // Filtrar devengados - Solo REGISTRADO y EN_PREPAGO para Tesorería
  const filteredDevengados = useMemo(() => {
    return devengados
      .filter(d => {
        // IMPORTANTE: Solo mostrar REGISTRADO y EN_PREPAGO (NO PAGADOS ni ANULADOS)
        if (d.estado !== 'REGISTRADO' && d.estado !== 'EN_PREPAGO') return false;
        
        // Solo mostrar devengados con entidad/unidadNegocio compatibles (o sin definir = defaults)
        const entidadMatch = !d.entidad || normalizeKey(d.entidad) === normalizeKey(appliedFilters.entidad);
        const unidadMatch = !d.unidadNegocio || normalizeKey(d.unidadNegocio) === normalizeKey(appliedFilters.unidadNegocio);
        if (!entidadMatch || !unidadMatch) return false;

        // Filtro por periodo (acepta "YYYY-MM" o "MM-YYYY")
        const periodoFiltro = normalizePeriodo(appliedFilters.periodo);
        if (periodoFiltro && normalizePeriodo(d.periodo) !== periodoFiltro) return false;

        // Filtro por estado (dentro de los permitidos)
        if (appliedFilters.estado !== 'TODOS' && d.estado !== appliedFilters.estado) return false;

        // Filtro por proveedor
        if (appliedFilters.proveedor && !d.proveedor.toLowerCase().includes(appliedFilters.proveedor.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const periodoCompare = b.periodo.localeCompare(a.periodo);
        if (periodoCompare !== 0) return periodoCompare;
        return b.id - a.id;
      });
  }, [devengados, appliedFilters]);

  // Paginación
  const totalItems = filteredDevengados.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedDevengados = filteredDevengados.slice(startIndex, endIndex);

  const handleBuscar = () => {
    setAppliedFilters({
      entidad: filterEntidad,
      unidadNegocio: filterUnidadNegocio,
      periodo: filterPeriodo,
      estado: filterEstado,
      proveedor: filterProveedor
    });
    setCurrentPage(1);
    toast.info('Filtros aplicados');
  };

  const handleLimpiar = () => {
    const defaults = {
      entidad: 'FCR',
      unidadNegocio: 'FCR-DL 19990',
      periodo: '',
      estado: 'REGISTRADO',
      proveedor: ''
    };

    setFilterEntidad(defaults.entidad);
    setFilterUnidadNegocio(defaults.unidadNegocio);
    setFilterPeriodo(defaults.periodo);
    setFilterEstado(defaults.estado);
    setFilterProveedor(defaults.proveedor);

    setAppliedFilters(defaults);
    setCurrentPage(1);
    toast.info('Filtros limpiados');
  };

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize, 10));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Modal Modificar
  const openModificar = (dev: DevengadoRecord) => {
    setSelectedDevengado(dev);
    setModalTipoPago(dev.tipoPago || '');
    setModalCuentaBancaria(dev.cuentaBancaria || null);
    setModalOpen(true);
  };

  const handleTipoPagoChange = (value: string) => {
    setModalTipoPago(value);
    setModalCuentaBancaria(null); // Reset cuenta cuando cambia tipo
  };

  const handleCuentaChange = (cuentaId: string) => {
    const cuentas = CUENTAS_BANCARIAS[modalTipoPago] || [];
    const cuenta = cuentas.find(c => c.id === cuentaId) || null;
    setModalCuentaBancaria(cuenta);
  };

  const handleGuardarModificacion = () => {
    if (!selectedDevengado) return;
    
    const updatedRecord: DevengadoRecord = {
      ...selectedDevengado,
      tipoPago: modalTipoPago || undefined,
      cuentaBancaria: modalCuentaBancaria || undefined,
      entidad: selectedDevengado.entidad || 'FCR',
      unidadNegocio: selectedDevengado.unidadNegocio || 'FCR-DL 19990'
    };
    
    const result = saveDevengado(updatedRecord);
    if (result.success) {
      toast.success('Devengado actualizado correctamente');
      loadData();
      setModalOpen(false);
    } else {
      toast.error(result.error || 'Error al actualizar');
    }
  };

  // Generar Pre-Pago
  const handleGenerarPrePago = (dev: DevengadoRecord) => {
    // Validar tipoPago y cuentaBancaria
    if (!dev.tipoPago) {
      toast.error('Debe configurar el Tipo de Pago antes de generar el Pre-Pago');
      return;
    }
    
    const requiresCuenta = CUENTAS_BANCARIAS[dev.tipoPago]?.length > 0;
    if (requiresCuenta && !dev.cuentaBancaria) {
      toast.error('Debe configurar la Cuenta Bancaria antes de generar el Pre-Pago');
      return;
    }
    
    // Crear pago
    const pagoResult = savePago({
      devengadoId: dev.id.toString(),
      periodo: dev.periodo,
      entidad: dev.entidad || 'FCR',
      unidadNegocio: dev.unidadNegocio || 'FCR-DL 19990',
      proveedor: dev.proveedor,
      monto: dev.monto,
      tipoPago: dev.tipoPago,
      cuentaBancaria: dev.cuentaBancaria || { id: '', banco: '', numeroMasked: '', moneda: 'PEN' },
      fechaGeneracion: getFechaHoy(),
      estado: 'GENERADO'
    });
    
    if (!pagoResult.success) {
      toast.error(pagoResult.error || 'Error al crear el pago');
      return;
    }
    
    // Actualizar devengado a EN_PREPAGO
    const updatedDevengado: DevengadoRecord = {
      ...dev,
      estado: 'EN_PREPAGO'
    };
    
    const devResult = saveDevengado(updatedDevengado);
    if (!devResult.success) {
      toast.error(devResult.error || 'Error al actualizar el devengado');
      return;
    }
    
    toast.success('Pre-Pago generado correctamente');
    navigate('/tesoreria/pagos');
  };

  const handleVolver = () => {
    navigate('/');
  };

  // Generar números de página
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const cuentasDisponibles = CUENTAS_BANCARIAS[modalTipoPago] || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional */}
      <div className="institutional-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Preparación de Pre-Pago</h1>
            <p className="text-sm opacity-80">RUC: 20421413216 | Tesorería</p>
          </div>
          <Badge variant="outline" className="bg-white/10 text-white border-white/30">
            Perfil: TE
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1 block">Entidad</Label>
                <Select value={filterEntidad} onValueChange={setFilterEntidad}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTIDADES.map(entidad => (
                      <SelectItem key={entidad} value={entidad}>
                        {entidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Unidad de Negocio</Label>
                <Select value={filterUnidadNegocio} onValueChange={setFilterUnidadNegocio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_NEGOCIO.map(unidad => (
                      <SelectItem key={unidad} value={unidad}>
                        {unidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Periodo (YYYY-MM)</Label>
                <Input
                  placeholder="Ej: 2025-09"
                  value={filterPeriodo}
                  onChange={(e) => setFilterPeriodo(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Proveedor</Label>
                <Input
                  placeholder="Buscar proveedor..."
                  value={filterProveedor}
                  onChange={(e) => setFilterProveedor(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PREPAGO.map(estado => (
                      <SelectItem key={estado} value={estado}>
                        {estado === 'TODOS' ? 'Todos' : estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="default" onClick={handleBuscar}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button variant="outline" onClick={handleLimpiar}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Filtros aplicados: Entidad <span className="font-medium text-foreground">{appliedFilters.entidad}</span> · Unidad{' '}
            <span className="font-medium text-foreground">{appliedFilters.unidadNegocio}</span> · Periodo{' '}
            <span className="font-medium text-foreground">{appliedFilters.periodo ? normalizePeriodo(appliedFilters.periodo) : 'Todos'}</span> · Estado{' '}
            <span className="font-medium text-foreground">{appliedFilters.estado}</span>
          </div>
        </Card>

        {/* Tabla */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-12">N°</TableHead>
                  <TableHead className="font-semibold">Periodo</TableHead>
                  <TableHead className="font-semibold">Proveedor</TableHead>
                  <TableHead className="font-semibold">Concepto</TableHead>
                  <TableHead className="font-semibold text-right">Monto (S/)</TableHead>
                  <TableHead className="font-semibold">Tipo de Pago</TableHead>
                  <TableHead className="font-semibold">Cuenta Bancaria</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevengados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay devengados para los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDevengados.map((dev, index) => (
                    <TableRow key={dev.id}>
                      <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{dev.periodo}</TableCell>
                      <TableCell>{dev.proveedor}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{dev.observacion || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{formatMonto(dev.monto)}</TableCell>
                      <TableCell>{dev.tipoPago || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        {dev.cuentaBancaria 
                          ? `${dev.cuentaBancaria.banco} ${dev.cuentaBancaria.numeroMasked}`
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(dev.estado)}>
                          {dev.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openModificar(dev)}
                            disabled={dev.estado !== 'REGISTRADO'}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modificar
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleGenerarPrePago(dev)}
                            disabled={dev.estado !== 'REGISTRADO' || !dev.tipoPago}
                            className="bg-[#0d3b5e] hover:bg-[#0a2d47]"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Generar Pre-Pago
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrar</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Mostrando {totalItems > 0 ? startIndex + 1 : 0}–{endIndex} de {totalItems}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                {getPageNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <Button
                      key={idx}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="min-w-[36px]"
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground">…</span>
                  )
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Botón volver */}
        <div className="mt-6">
          <Button variant="outline" onClick={handleVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>
        </div>
      </div>

      {/* Modal Modificar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modificar Información de Pago</DialogTitle>
            <DialogDescription>
              Configure el tipo de pago y cuenta bancaria para el devengado del periodo {selectedDevengado?.periodo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipoPago">Tipo de Pago</Label>
              <Select value={modalTipoPago} onValueChange={handleTipoPagoChange}>
                <SelectTrigger id="tipoPago">
                  <SelectValue placeholder="Seleccione tipo de pago" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PAGO.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {cuentasDisponibles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="cuentaBancaria">Cuenta Bancaria</Label>
                <Select 
                  value={modalCuentaBancaria?.id || ''} 
                  onValueChange={handleCuentaChange}
                >
                  <SelectTrigger id="cuentaBancaria">
                    <SelectValue placeholder="Seleccione cuenta bancaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentasDisponibles.map(cuenta => (
                      <SelectItem key={cuenta.id} value={cuenta.id}>
                        {cuenta.banco} - {cuenta.numeroMasked} ({cuenta.moneda})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {modalTipoPago === 'Efectivo' && (
              <p className="text-sm text-muted-foreground italic">
                El pago en efectivo no requiere cuenta bancaria.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarModificacion}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
