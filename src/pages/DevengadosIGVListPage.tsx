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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { getDevengadosByUnidad, getDevengadoNDGroup, updateDevengadoStatus, DevengadoRecord } from '@/lib/devengadosStorage';

const ESTADOS = ['TODOS', 'REGISTRADO', 'APROBADO', 'EN_PREPAGO', 'PAGADO', 'PAGADO_PARCIALMENTE', 'ANULADO'] as const;
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
    case 'APROBADO': return 'default';
    case 'EN_PREPAGO': return 'default';
    case 'PAGADO': return 'outline';
    case 'PAGADO_PARCIALMENTE': return 'default';
    case 'ANULADO': return 'destructive';
    default: return 'secondary';
  }
}

export default function DevengadosIGVListPage() {
  const navigate = useNavigate();
  const [devengados, setDevengados] = useState<DevengadoRecord[]>([]);
  
  // Segmented control (bandeja) - preconfigurar filtro estado
  const [bandeja, setBandeja] = useState<string>('todos');
  
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

  // Modal Voucher AP (solo para ND al aprobar)
  const [voucherAPOpen, setVoucherAPOpen] = useState(false);
  const [voucherAPRecord, setVoucherAPRecord] = useState<DevengadoRecord | null>(null);

  // Modal confirmación aprobar
  const [aprobarDialogOpen, setAprobarDialogOpen] = useState(false);
  const [devengadoToAprobar, setDevengadoToAprobar] = useState<DevengadoRecord | null>(null);

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
        // Filtro por estado (soporta APROBADOS_GRUPO = APROBADO + PAGADO_PARCIALMENTE)
        if (appliedFilters.estado === 'APROBADOS_GRUPO') {
          if (d.estado !== 'APROBADO' && d.estado !== 'PAGADO_PARCIALMENTE') return false;
        } else if (appliedFilters.estado !== 'TODOS' && d.estado !== appliedFilters.estado) return false;
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

  const handleBandejaChange = (value: string) => {
    setBandeja(value);
    let newEstado = 'TODOS';
    if (value === 'pendientes') newEstado = 'REGISTRADO';
    else if (value === 'aprobados') newEstado = 'APROBADOS_GRUPO'; // placeholder interno
    else if (value === 'pagados') newEstado = 'PAGADO';
    
    setFilterEstado(newEstado === 'APROBADOS_GRUPO' ? 'TODOS' : newEstado);
    
    // Aplicar filtros inmediatamente
    setAppliedFilters(prev => ({
      ...prev,
      estado: newEstado
    }));
    setCurrentPage(1);
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
    if (dev.tipoDevengado === 'NO_DOMICILIADO') {
      // Para ND: siempre tomar el registro PRINCIPAL (no el hijo IGV -1)
      let principal: DevengadoRecord | undefined;
      if (dev.groupId) {
        const grupo = getDevengadoNDGroup(dev.groupId);
        principal = grupo.find(g => g.rol === 'PRINCIPAL') || dev;
      } else {
        principal = dev;
      }

      // Navegar como COPIA MANUAL precargada (NO como Pago Fácil)
      navigate('/devengado-igv', {
        state: {
          fromLista: true,
          copyMode: true,
          tipoDevengadoLista: 'NO_DOMICILIADO',
          copyDataND: {
            periodoTributario: principal.periodo ? (() => {
              const [y, m] = principal.periodo.split('-');
              return `${m}-${y}`;
            })() : '09-2025',
            proveedor: principal.proveedor,
            fechaPagoServicio: principal.fechaRegistro,
            baseUsd: principal.montoBaseUSD || 0,
            igvUsd: principal.montoIgvUSD || 0,
            totalIgvSoles: principal.igvSoles || 0,
            tipoCambio: 3.5
          }
        }
      });
    } else {
      // Para IGV D, copiar normal (abrir con datos precargados sin ID)
      navigate('/devengado-igv', {
        state: {
          fromPagoFacil: false,
          fromLista: true,
          copyMode: true,
          tipoDevengadoLista: 'DOMICILIADO',
          copyData: {
            periodo: dev.periodo,
            proveedor: dev.proveedor,
            ruc: dev.ruc,
            monto: dev.monto,
            moneda: dev.moneda,
            observacion: dev.observacion,
            fechaEmision: dev.fechaRegistro,
            fechaRecepcion: dev.fechaRegistro,
            fechaVencimiento: dev.fechaRegistro,
            fechaProgPago: dev.fechaRegistro,
            unidadNegocio: dev.unidadNegocio,
            tipoPago: dev.tipoPago,
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

  const handleAprobar = (dev: DevengadoRecord) => {
    setDevengadoToAprobar(dev);
    setAprobarDialogOpen(true);
  };

  const handleConfirmAprobar = () => {
    if (!devengadoToAprobar) return;
    const dev = devengadoToAprobar;
    const isND = dev.tipoDevengado === 'NO_DOMICILIADO';
    const newEstado = isND ? 'PAGADO_PARCIALMENTE' : 'APROBADO';
    
    // Para ND: aprobar también el registro hijo del grupo
    if (isND && dev.groupId) {
      const grupo = getDevengadoNDGroup(dev.groupId);
      grupo.forEach(g => {
        updateDevengadoStatus(g.id, newEstado as DevengadoRecord['estado']);
      });
    } else {
      updateDevengadoStatus(dev.id, newEstado as DevengadoRecord['estado']);
    }
    
    setDevengados(getDevengadosByUnidad(appliedFilters.unidadNegocio));
    setAprobarDialogOpen(false);
    
    if (isND) {
      // Mostrar Voucher AP para ND
      setVoucherAPRecord(dev);
      setVoucherAPOpen(true);
      toast.success(`Devengado aprobado → ${newEstado}`);
    } else {
      toast.success(`Devengado aprobado → APROBADO`);
    }
    setDevengadoToAprobar(null);
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

        {/* Segmented control - Bandejas */}
        <Tabs value={bandeja} onValueChange={handleBandejaChange} className="mb-4">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
            <TabsTrigger value="aprobados">Aprobados</TabsTrigger>
            <TabsTrigger value="pagados">Pagados</TabsTrigger>
          </TabsList>
        </Tabs>

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
                            <DropdownMenuItem onClick={() => handleVerEditar(dev)}
                              disabled={dev.estado === 'APROBADO' || dev.estado === 'PAGADO_PARCIALMENTE'}
                            >
                              {dev.estado === 'REGISTRADO' ? 'Ver / Editar' : 'Ver detalle'}
                            </DropdownMenuItem>
                            {/* Aprobar: solo visible en REGISTRADO */}
                            {dev.estado === 'REGISTRADO' && !(dev.tipoDevengado === 'NO_DOMICILIADO' && dev.rol === 'IGV') && (
                              <DropdownMenuItem onClick={() => handleAprobar(dev)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Aprobar
                              </DropdownMenuItem>
                            )}
                            {/* F) Copiar solo en padre ND, ocultar en hijo */}
                            {!(dev.tipoDevengado === 'NO_DOMICILIADO' && dev.rol === 'IGV') && (
                              <DropdownMenuItem onClick={() => handleCopiar(dev)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleIrPrePago(dev.id)}
                              disabled={dev.estado !== 'APROBADO' && dev.estado !== 'PAGADO_PARCIALMENTE'}
                              className={(dev.estado !== 'APROBADO' && dev.estado !== 'PAGADO_PARCIALMENTE') ? 'opacity-50 cursor-not-allowed' : ''}
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

      {/* Modal de confirmación para aprobar */}
      <AlertDialog open={aprobarDialogOpen} onOpenChange={setAprobarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              {devengadoToAprobar?.tipoDevengado === 'NO_DOMICILIADO'
                ? `¿Aprobar el devengado ND del periodo ${devengadoToAprobar?.periodo}? El estado cambiará a PAGADO PARCIALMENTE y se generará el Voucher AP.`
                : `¿Aprobar el devengado del periodo ${devengadoToAprobar?.periodo}? El estado cambiará a APROBADO y ya no podrá modificarse.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAprobar} className="bg-primary">
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Voucher AP (solo IGV ND) */}
      <Dialog open={voucherAPOpen} onOpenChange={setVoucherAPOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher AP – Asiento Contable</DialogTitle>
            <DialogDescription>
              Asiento: {voucherAPRecord?.asiento || '—'} | Periodo: {voucherAPRecord?.periodo} | Proveedor: {voucherAPRecord?.proveedor}
            </DialogDescription>
          </DialogHeader>
          {voucherAPRecord && (
            <VoucherAPTable record={voucherAPRecord} />
          )}
          <DialogFooter>
            <Button onClick={() => setVoucherAPOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════
// Voucher AP Table (inline, reutiliza datos del record ND)
// ════════════════════════════════════════════════
const fmtMonto = (v: number) =>
  v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function VoucherAPTable({ record }: { record: DevengadoRecord }) {
  const baseUsd = record.montoBaseUSD || 0;
  const igvUsd = record.montoIgvUSD || 0;
  const igvSoles = record.igvSoles || 0;
  // Estimar TC a partir de igvSoles / igvUsd
  const tc = igvUsd > 0 ? igvSoles / igvUsd : 0;
  const baseSoles = Math.round(baseUsd * tc * 100) / 100;

  const lineas = [
    { num: 1, cuenta: 'Variable', desc: `Comisión ${record.proveedor}`, localDebe: 0, localHaber: baseSoles, usdDebe: 0, usdHaber: baseUsd },
    { num: 2, cuenta: '4011201', desc: 'IGV No Domiciliados', localDebe: 0, localHaber: igvSoles, usdDebe: 0, usdHaber: igvUsd },
    { num: 3, cuenta: 'Variable', desc: `Gasto Comisión ${record.proveedor}`, localDebe: baseSoles, localHaber: 0, usdDebe: baseUsd, usdHaber: 0 },
    { num: 4, cuenta: '6411101', desc: 'Gasto IGV No Domiciliados', localDebe: igvSoles, localHaber: 0, usdDebe: igvUsd, usdHaber: 0 },
  ];

  const totalLocalDebe = lineas.reduce((s, l) => s + l.localDebe, 0);
  const totalLocalHaber = lineas.reduce((s, l) => s + l.localHaber, 0);
  const totalUsdDebe = lineas.reduce((s, l) => s + l.usdDebe, 0);
  const totalUsdHaber = lineas.reduce((s, l) => s + l.usdHaber, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="border p-2 w-8">#</th>
            <th className="border p-2">Cuenta</th>
            <th className="border p-2">Descripción</th>
            <th className="border p-2 text-right" colSpan={2}>LOCAL</th>
            <th className="border p-2 text-right" colSpan={2}>DÓLARES</th>
          </tr>
          <tr className="bg-muted/30 text-[10px]">
            <th className="border p-1"></th>
            <th className="border p-1"></th>
            <th className="border p-1"></th>
            <th className="border p-1 text-right">Debe</th>
            <th className="border p-1 text-right">Haber</th>
            <th className="border p-1 text-right">Debe</th>
            <th className="border p-1 text-right">Haber</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map(l => (
            <tr key={l.num}>
              <td className="border p-2 text-center font-mono">{l.num}</td>
              <td className="border p-2 font-mono">{l.cuenta}</td>
              <td className="border p-2">{l.desc}</td>
              <td className="border p-2 text-right font-mono">{l.localDebe > 0 ? fmtMonto(l.localDebe) : '-'}</td>
              <td className="border p-2 text-right font-mono text-destructive">{l.localHaber > 0 ? fmtMonto(l.localHaber) : '-'}</td>
              <td className="border p-2 text-right font-mono">{l.usdDebe > 0 ? fmtMonto(l.usdDebe) : '-'}</td>
              <td className="border p-2 text-right font-mono text-destructive">{l.usdHaber > 0 ? fmtMonto(l.usdHaber) : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50 font-semibold">
            <td colSpan={3} className="border p-2 text-right">Total Voucher:</td>
            <td className="border p-2 text-right font-mono">{fmtMonto(totalLocalDebe)}</td>
            <td className="border p-2 text-right font-mono text-destructive">{fmtMonto(totalLocalHaber)}</td>
            <td className="border p-2 text-right font-mono">{fmtMonto(totalUsdDebe)}</td>
            <td className="border p-2 text-right font-mono text-destructive">{fmtMonto(totalUsdHaber)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-muted-foreground mt-3">
        TC estimado: {tc.toFixed(3)} | Asiento: {record.asiento || '—'}
      </p>
    </div>
  );
}
