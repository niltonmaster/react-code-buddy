import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getDevengadosByUnidad, getDevengadoNDGroup, updateDevengadoStatus, DevengadoRecord } from '@/lib/devengadosStorage';

const ESTADOS = ['TODOS', 'REGISTRADO', 'EN_PREPAGO', 'PAGADO', 'ANULADO'] as const;
const ENTIDADES = ['FCR', 'ONP', 'ESSALUD'] as const;

// Relación Entidad → Unidades de Negocio
const UNIDADES_POR_ENTIDAD: Record<string, string[]> = {
  'FCR': ['FCR-DL 19990', 'FCR-MACROFONDO'],
  'ONP': ['ONP-PENSIONES'],
  'ESSALUD': []
};

const PAGE_SIZES = [10, 20, 50] as const;

function formatMonto(monto: number): string {
  return monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '-';
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
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

export default function DevengadosIGVListPage() {
  const navigate = useNavigate();
  const [devengados, setDevengados] = useState<DevengadoRecord[]>([]);
  
  // Filtros de selección
  const [filterEntidad, setFilterEntidad] = useState('FCR');
  const [filterUnidadNegocio, setFilterUnidadNegocio] = useState('FCR-DL 19990');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterProveedor, setFilterProveedor] = useState('');
  
  // Filtros aplicados (se actualizan al hacer clic en Buscar)
  const [appliedFilters, setAppliedFilters] = useState({
    entidad: 'FCR',
    unidadNegocio: 'FCR-DL 19990',
    periodo: '',
    estado: 'TODOS',
    proveedor: ''
  });
  
  // Unidades de negocio disponibles según entidad seleccionada
  const unidadesDisponibles = UNIDADES_POR_ENTIDAD[filterEntidad] || [];
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // Modal de confirmación para anular
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [devengadoToAnular, setDevengadoToAnular] = useState<DevengadoRecord | null>(null);

  useEffect(() => {
    // Carga inicial con filtros aplicados por defecto
    setDevengados(getDevengadosByUnidad(appliedFilters.unidadNegocio));

    // Mantener la lista sincronizada si se crea/edita un devengado en otra pantalla
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'igv_devengados_v1') {
        setDevengados(getDevengadosByUnidad(appliedFilters.unidadNegocio));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [appliedFilters.unidadNegocio]);

  // Cuando cambia la entidad, resetear unidad de negocio a la primera disponible
  useEffect(() => {
    const unidades = UNIDADES_POR_ENTIDAD[filterEntidad] || [];
    if (unidades.length > 0 && !unidades.includes(filterUnidadNegocio)) {
      setFilterUnidadNegocio(unidades[0]);
    }
  }, [filterEntidad]);

  // Determinar si estamos en modo IGV ND (basado en filtros APLICADOS)
  const isIGVND = appliedFilters.unidadNegocio === 'FCR-MACROFONDO';

  // Filtrar y ordenar
  const filteredDevengados = useMemo(() => {
    return devengados
      .filter(d => {
        // Filtro por periodo (exacto)
        if (appliedFilters.periodo && d.periodo !== appliedFilters.periodo) return false;
        // Filtro por estado
        if (appliedFilters.estado !== 'TODOS' && d.estado !== appliedFilters.estado) return false;
        // Filtro por proveedor (contains, case-insensitive)
        if (appliedFilters.proveedor && !d.proveedor.toLowerCase().includes(appliedFilters.proveedor.toLowerCase())) return false;
        return true;
      })
      // Ordenar por periodo desc, luego por groupId (para agrupar ND), luego por rol
      .sort((a, b) => {
        const periodoCompare = b.periodo.localeCompare(a.periodo);
        if (periodoCompare !== 0) return periodoCompare;
        // Para ND, ordenar por groupId y luego principal primero
        if (a.groupId && b.groupId) {
          const groupCompare = b.groupId.localeCompare(a.groupId);
          if (groupCompare !== 0) return groupCompare;
          // Principal antes que IGV
          if (a.rol === 'PRINCIPAL' && b.rol === 'IGV') return -1;
          if (a.rol === 'IGV' && b.rol === 'PRINCIPAL') return 1;
        }
        return b.id - a.id;
      });
  }, [devengados, appliedFilters]);

  // Paginación
  const totalItems = filteredDevengados.length;
  const totalPages = Math.ceil(totalItems / pageSize);
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

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize, 10));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleNuevoDevengado = () => {
    navigate('/devengado-igv', { 
      state: { 
        fromPagoFacil: false, 
        fromLista: true,
        tipoDevengadoLista: isIGVND ? 'NO_DOMICILIADO' : 'DOMICILIADO'
      } 
    });
  };

  const handleVerEditar = (dev: DevengadoRecord) => {
    // A) Para IGV ND: si es el hijo (rol='IGV'), redirigir al padre del grupo
    if (dev.tipoDevengado === 'NO_DOMICILIADO' && dev.rol === 'IGV' && dev.groupId) {
      const grupo = getDevengadoNDGroup(dev.groupId);
      const padre = grupo.find(g => g.rol === 'PRINCIPAL');
      if (padre) {
        toast.info('El IGV (-1) se gestiona desde el registro Principal');
        navigate(`/devengado-igv?id=${padre.id}`, { 
          state: { fromPagoFacil: false, fromLista: true, editId: padre.id } 
        });
        return;
      }
    }
    // Caso normal: navegar al registro directamente
    navigate(`/devengado-igv?id=${dev.id}`, { state: { fromPagoFacil: false, fromLista: true, editId: dev.id } });
  };

  // Copiar devengado (para ND copia el grupo completo)
  const handleCopiar = (dev: DevengadoRecord) => {
    if (dev.tipoDevengado === 'NO_DOMICILIADO' && dev.groupId) {
      // Obtener grupo completo
      const grupo = getDevengadoNDGroup(dev.groupId);
      const principal = grupo.find(g => g.rol === 'PRINCIPAL');
      
      if (principal) {
        // Navegar a registrar devengado con datos precargados para crear nuevo grupo
        navigate('/devengado-igv', {
          state: {
            fromPagoFacilND: true,
            fromLista: true,
            copyMode: true,
            pagoFacilNDData: {
              periodoTributario: principal.periodo ? (() => {
                const [y, m] = principal.periodo.split('-');
                return `${m}-${y}`; // Convert YYYY-MM to MM-YYYY for UI
              })() : '09-2025',
              proveedor: principal.proveedor,
              facturaNro: '', // Se generará nuevo
              fechaPagoServicio: principal.fechaRegistro,
              periodoComision: principal.observacion?.match(/\d{4}-\d{2}/)?.[0] || '',
              baseUsd: principal.montoBaseUSD || 0,
              igvUsd: principal.montoIgvUSD || 0,
              tipoCambio: 3.5, // Default
              totalIgvSoles: principal.igvSoles || 0,
            }
          }
        });
      }
    } else {
      // Para IGV D, copiar normal (abrir con datos precargados sin ID)
      navigate('/devengado-igv', {
        state: {
          fromPagoFacil: false,
          fromLista: true,
          copyMode: true,
          copyData: {
            periodo: dev.periodo,
            proveedor: dev.proveedor,
            ruc: dev.ruc,
            monto: dev.monto,
            moneda: dev.moneda,
            observacion: dev.observacion,
          }
        }
      });
    }
    toast.info('Modo copiar: se creará un nuevo registro');
  };

  // Obtener etiqueta de rol para IGV ND
  const getRolLabel = (dev: DevengadoRecord): string => {
    if (dev.tipoDevengado !== 'NO_DOMICILIADO') return '-';
    return dev.rol === 'PRINCIPAL' ? 'Principal' : 'IGV (-1)';
  };

  const handleConfirmAnular = () => {
    if (!devengadoToAnular) return;
    
    const success = updateDevengadoStatus(devengadoToAnular.id, 'ANULADO');
    if (success) {
      toast.success('Devengado anulado correctamente');
      setDevengados(getDevengadosByUnidad(appliedFilters.unidadNegocio));
    } else {
      toast.error('Error al anular el devengado');
    }
    setAnularDialogOpen(false);
    setDevengadoToAnular(null);
  };

  const handleAnular = (dev: DevengadoRecord) => {
    setDevengadoToAnular(dev);
    setAnularDialogOpen(true);
  };

  const handleIrPrePago = (id: number) => {
    const success = updateDevengadoStatus(id, 'EN_PREPAGO');
    if (success) {
      toast.success('Devengado enviado a Pre-Pago (Tesorería)');
      setDevengados(getDevengadosByUnidad(appliedFilters.unidadNegocio));
    } else {
      toast.error('Error al enviar a Pre-Pago');
    }
  };

  const handleVolver = () => {
    navigate('/');
  };

  // Generar números de página para mostrar
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional */}
      <div className="institutional-header">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">Lista de Devengados IGV</h1>
          <p className="text-sm opacity-80">RUC: 20421413216 | Contabilidad</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Entidad</label>
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
                <label className="text-sm font-medium mb-1 block">Unidad de Negocio</label>
                <Select 
                  value={filterUnidadNegocio} 
                  onValueChange={setFilterUnidadNegocio}
                  disabled={unidadesDisponibles.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesDisponibles.map(unidad => (
                      <SelectItem key={unidad} value={unidad}>
                        {unidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Periodo (YYYY-MM)</label>
                <Input
                  placeholder="Ej: 2025-09"
                  value={filterPeriodo}
                  onChange={(e) => setFilterPeriodo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Estado</label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(estado => (
                      <SelectItem key={estado} value={estado}>
                        {estado === 'TODOS' ? 'Todos' : estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Proveedor</label>
                <Input
                  placeholder="Buscar proveedor..."
                  value={filterProveedor}
                  onChange={(e) => setFilterProveedor(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBuscar}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button onClick={handleNuevoDevengado}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo devengado
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  localStorage.removeItem('igv_devengados_v1');
                  localStorage.removeItem('igv_pagos');
                  toast.success('Datos eliminados. Recargando...');
                  setTimeout(() => window.location.reload(), 500);
                }}
              >
                🗑️ Reset LS
              </Button>
            </div>
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
                  <TableHead className="font-semibold">Documento N°</TableHead>
                  {isIGVND && <TableHead className="font-semibold">Rol</TableHead>}
                  <TableHead className="font-semibold">Moneda</TableHead>
                  <TableHead className="font-semibold text-right">
                    {isIGVND ? 'Monto (USD)' : 'Monto (S/)'}
                  </TableHead>
                  <TableHead className="font-semibold">Asiento</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">F. Registro</TableHead>
                  <TableHead className="font-semibold">F. Pago</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevengados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isIGVND ? 12 : 11} className="text-center py-8 text-muted-foreground">
                      No hay devengados para los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDevengados.map((dev, index) => (
                    <TableRow key={dev.id} className={dev.rol === 'IGV' ? 'bg-muted/30' : ''}>
                      <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{dev.periodo}</TableCell>
                      <TableCell>{dev.proveedor}</TableCell>
                      <TableCell>{dev.documentoNro}</TableCell>
                      {isIGVND && (
                        <TableCell>
                          <Badge variant={dev.rol === 'PRINCIPAL' ? 'default' : 'secondary'}>
                            {getRolLabel(dev)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>{dev.moneda}</TableCell>
                      <TableCell className="text-right font-mono">{formatMonto(dev.monto)}</TableCell>
                      <TableCell className="font-mono text-sm">{dev.asiento || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(dev.estado)}>
                          {dev.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFecha(dev.fechaRegistro)}</TableCell>
                      <TableCell>{formatFecha(dev.fechaPago)}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="default" 
                              size="sm"
                              className="bg-[#0d3b5e] hover:bg-[#0a2d47] text-white"
                            >
                              Acciones
                              <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleVerEditar(dev)}>
                              Ver / Editar
                            </DropdownMenuItem>
                            {/* F) Copiar solo en padre ND, ocultar en hijo */}
                            {!(dev.tipoDevengado === 'NO_DOMICILIADO' && dev.rol === 'IGV') && (
                              <DropdownMenuItem onClick={() => handleCopiar(dev)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleIrPrePago(dev.id)}
                              disabled={dev.estado !== 'REGISTRADO'}
                              className={dev.estado !== 'REGISTRADO' ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              Ir a Pre-Pago
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAnular(dev)}
                              disabled={dev.estado === 'PAGADO' || dev.estado === 'ANULADO'}
                              className={`text-destructive focus:text-destructive ${
                                (dev.estado === 'PAGADO' || dev.estado === 'ANULADO') ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              Anular
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                Mostrando {startIndex + 1}–{endIndex} de {totalItems}
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

      {/* Modal de confirmación para anular */}
      <AlertDialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar anulación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas anular el devengado del periodo {devengadoToAnular?.periodo}?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAnular} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
