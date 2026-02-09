import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Search, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Eye, FileText, CheckCircle, Upload, File, X } from 'lucide-react';
import { toast } from 'sonner';
import { getPagos, updatePago, Pago, SustentoPago } from '@/lib/pagosStorage';
import { getDevengadoById, saveDevengado } from '@/lib/devengadosStorage';

const ESTADOS_PAGO = ['TODOS', 'GENERADO', 'PAGADO', 'ANULADO'] as const;
const ENTIDADES = ['FCR', 'ONP', 'ESSALUD'] as const;
const UNIDADES_NEGOCIO = ['FCR-DL 19990', 'FCR-DL 20530', 'ONP-PENSIONES'] as const;
const PAGE_SIZES = [10, 20, 50] as const;

function formatMonto(monto: number): string {
  return monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(fecha: string | undefined): string {
  if (!fecha) return '-';
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

function getEstadoBadgeVariant(estado: Pago['estado']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (estado) {
    case 'GENERADO': return 'default';
    case 'PAGADO': return 'outline';
    case 'ANULADO': return 'destructive';
    default: return 'secondary';
  }
}

function getFechaHoy(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const day = hoy.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TesoreriaPagosPage() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState<Pago[]>([]);
  
  // Filtros
  const [filterEntidad, setFilterEntidad] = useState('FCR');
  const [filterUnidadNegocio, setFilterUnidadNegocio] = useState('FCR-DL 19990');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterFechaPago, setFilterFechaPago] = useState('');
  
  // Filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    entidad: 'FCR',
    unidadNegocio: 'FCR-DL 19990',
    periodo: '',
    estado: 'TODOS',
    fechaPago: ''
  });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // Modales
  const [verPagoOpen, setVerPagoOpen] = useState(false);
  const [verSustentoOpen, setVerSustentoOpen] = useState(false);
  const [confirmarPagoOpen, setConfirmarPagoOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
  const [fechaPagoInput, setFechaPagoInput] = useState('');
  
  // Sustento files state
  const [sustentoFiles, setSustentoFiles] = useState<SustentoPago>({});
  
  useEffect(() => {
    loadData();
    
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'igv_pagos_v1') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const loadData = () => {
    setPagos(getPagos());
  };

  // Filtrar pagos
  const filteredPagos = useMemo(() => {
    return pagos
      .filter(p => {
        if (p.entidad !== appliedFilters.entidad) return false;
        if (p.unidadNegocio !== appliedFilters.unidadNegocio) return false;
        if (appliedFilters.periodo && p.periodo !== appliedFilters.periodo) return false;
        if (appliedFilters.estado !== 'TODOS' && p.estado !== appliedFilters.estado) return false;
        if (appliedFilters.fechaPago && p.fechaPago !== appliedFilters.fechaPago) return false;
        return true;
      })
      .sort((a, b) => {
        const periodoCompare = b.periodo.localeCompare(a.periodo);
        if (periodoCompare !== 0) return periodoCompare;
        return b.fechaGeneracion.localeCompare(a.fechaGeneracion);
      });
  }, [pagos, appliedFilters]);

  // Paginación
  const totalItems = filteredPagos.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedPagos = filteredPagos.slice(startIndex, endIndex);

  const handleBuscar = () => {
    setAppliedFilters({
      entidad: filterEntidad,
      unidadNegocio: filterUnidadNegocio,
      periodo: filterPeriodo,
      estado: filterEstado,
      fechaPago: filterFechaPago
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

  // Acciones
  const handleVerPago = (pago: Pago) => {
    setSelectedPago(pago);
    setVerPagoOpen(true);
  };

  const handleVerSustento = (pago: Pago) => {
    setSelectedPago(pago);
    setSustentoFiles(pago.sustento || {});
    setVerSustentoOpen(true);
  };

  const handleFileUpload = (type: keyof SustentoPago) => {
    // Mock file upload - en producción sería un input file real
    const mockFileName = `${type}_${Date.now()}.pdf`;
    setSustentoFiles(prev => ({
      ...prev,
      [type]: mockFileName
    }));
    toast.success(`Archivo "${mockFileName}" adjuntado`);
  };

  const handleRemoveFile = (type: keyof SustentoPago) => {
    setSustentoFiles(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  const handleGuardarSustento = () => {
    if (!selectedPago) return;
    
    const result = updatePago(selectedPago.id, { sustento: sustentoFiles });
    if (result.success) {
      toast.success('Sustento guardado correctamente');
      loadData();
      setVerSustentoOpen(false);
    } else {
      toast.error('Error al guardar el sustento');
    }
  };

  const handleOpenConfirmarPago = (pago: Pago) => {
    setSelectedPago(pago);
    setFechaPagoInput(getFechaHoy());
    setConfirmarPagoOpen(true);
  };

  const handleConfirmarPago = () => {
    if (!selectedPago || !fechaPagoInput) {
      toast.error('Debe ingresar la fecha de pago');
      return;
    }

    // Actualizar Pago
    const pagoResult = updatePago(selectedPago.id, {
      estado: 'PAGADO',
      fechaPago: fechaPagoInput
    });

    if (!pagoResult.success) {
      toast.error(pagoResult.error || 'Error al actualizar el pago');
      return;
    }

    // Actualizar Devengado
    const devengado = getDevengadoById(parseInt(selectedPago.devengadoId));
    if (devengado) {
      const devResult = saveDevengado({
        ...devengado,
        estado: 'PAGADO',
        fechaPago: fechaPagoInput
      });
      
      if (!devResult.success) {
        toast.warning('Pago confirmado, pero hubo un error actualizando el devengado');
      }
    }

    toast.success('Pago confirmado correctamente');
    loadData();
    setConfirmarPagoOpen(false);
    setSelectedPago(null);
  };

  const handleVolver = () => {
    navigate('/tesoreria/prepago');
  };

  const handleVolverInicio = () => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional */}
      <div className="institutional-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Lista de Pagos</h1>
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
                <Label className="text-sm font-medium mb-1 block">Fecha de Pago</Label>
                <Input
                  type="date"
                  value={filterFechaPago}
                  onChange={(e) => setFilterFechaPago(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PAGO.map(estado => (
                      <SelectItem key={estado} value={estado}>
                        {estado === 'TODOS' ? 'Todos' : estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="default" onClick={handleBuscar}>
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
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
                  <TableHead className="font-semibold text-right">Monto (S/)</TableHead>
                  <TableHead className="font-semibold">Tipo de Pago</TableHead>
                  <TableHead className="font-semibold">Cuenta Bancaria</TableHead>
                  <TableHead className="font-semibold">F. Generación</TableHead>
                  <TableHead className="font-semibold">F. Pago</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPagos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No hay pagos para los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPagos.map((pago, index) => (
                    <TableRow key={pago.id}>
                      <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{pago.periodo}</TableCell>
                      <TableCell>{pago.proveedor}</TableCell>
                      <TableCell className="text-right font-mono">{formatMonto(pago.monto)}</TableCell>
                      <TableCell>{pago.tipoPago}</TableCell>
                      <TableCell>
                        {pago.cuentaBancaria.banco 
                          ? `${pago.cuentaBancaria.banco} ${pago.cuentaBancaria.numeroMasked}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{formatFecha(pago.fechaGeneracion)}</TableCell>
                      <TableCell>{formatFecha(pago.fechaPago)}</TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(pago.estado)}>
                          {pago.estado}
                        </Badge>
                      </TableCell>
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
                            <DropdownMenuItem onClick={() => handleVerPago(pago)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Detalle del Pago
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVerSustento(pago)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Sustento del Pago
                            </DropdownMenuItem>
                            {pago.estado === 'GENERADO' && (
                              <DropdownMenuItem onClick={() => handleOpenConfirmarPago(pago)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirmar Pago
                              </DropdownMenuItem>
                            )}
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

        {/* Botones navegación */}
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={handleVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Pre-Pago
          </Button>
          <Button variant="ghost" onClick={handleVolverInicio}>
            Ir al inicio
          </Button>
        </div>
      </div>

      {/* Modal Ver Pago (solo lectura) */}
      <Dialog open={verPagoOpen} onOpenChange={setVerPagoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Pago</DialogTitle>
            <DialogDescription>
              Información completa del pago {selectedPago?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPago && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">ID Pago</Label>
                  <p className="font-medium">{selectedPago.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Periodo</Label>
                  <p className="font-medium">{selectedPago.periodo}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-muted-foreground text-xs">Proveedor</Label>
                <p className="font-medium">{selectedPago.proveedor}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Entidad</Label>
                  <p className="font-medium">{selectedPago.entidad}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Unidad de Negocio</Label>
                  <p className="font-medium">{selectedPago.unidadNegocio}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo de Pago</Label>
                  <p className="font-medium">{selectedPago.tipoPago}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Monto</Label>
                  <p className="font-medium font-mono">S/ {formatMonto(selectedPago.monto)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-xs">Cuenta Bancaria</Label>
                <p className="font-medium">
                  {selectedPago.cuentaBancaria.banco 
                    ? `${selectedPago.cuentaBancaria.banco} - ${selectedPago.cuentaBancaria.numeroMasked} (${selectedPago.cuentaBancaria.moneda})`
                    : '-'
                  }
                </p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha Generación</Label>
                  <p className="font-medium">{formatFecha(selectedPago.fechaGeneracion)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha Pago</Label>
                  <p className="font-medium">{formatFecha(selectedPago.fechaPago)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-xs">Estado</Label>
                <div className="mt-1">
                  <Badge variant={getEstadoBadgeVariant(selectedPago.estado)}>
                    {selectedPago.estado}
                  </Badge>
                </div>
              </div>
              
              {selectedPago.observacion && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observación</Label>
                  <p className="font-medium">{selectedPago.observacion}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerPagoOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Sustento del Pago - con carga de archivos */}
      <Dialog open={verSustentoOpen} onOpenChange={setVerSustentoOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sustento del Pago</DialogTitle>
            <DialogDescription>
              Adjunte los documentos de respaldo para el pago {selectedPago?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPago && (
            <div className="py-4 space-y-4">
              {/* Comprobante de Giro */}
              <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Comprobante de Giro (PDF)</p>
                    {sustentoFiles.comprobanteGiro ? (
                      <p className="text-xs text-green-600 font-medium">✓ {sustentoFiles.comprobanteGiro}</p>
                    ) : (
                      <p className="text-xs text-orange-500">Pendiente de adjuntar</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {sustentoFiles.comprobanteGiro ? (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveFile('comprobanteGiro')}>
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleFileUpload('comprobanteGiro')}>
                      <Upload className="h-4 w-4 mr-1" />
                      Adjuntar
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Constancia SUNAT */}
              <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Constancia SUNAT (PDF)</p>
                    {sustentoFiles.constanciaSunat ? (
                      <p className="text-xs text-green-600 font-medium">✓ {sustentoFiles.constanciaSunat}</p>
                    ) : (
                      <p className="text-xs text-orange-500">Pendiente de adjuntar</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {sustentoFiles.constanciaSunat ? (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveFile('constanciaSunat')}>
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleFileUpload('constanciaSunat')}>
                      <Upload className="h-4 w-4 mr-1" />
                      Adjuntar
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Copia de Cheque - solo si tipo de pago es Cheque */}
              {selectedPago.tipoPago === 'Cheque' && (
                <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Copia de Cheque (PDF/Imagen)</p>
                      {sustentoFiles.copiaCheque ? (
                        <p className="text-xs text-green-600 font-medium">✓ {sustentoFiles.copiaCheque}</p>
                      ) : (
                        <p className="text-xs text-orange-500">Pendiente de adjuntar</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sustentoFiles.copiaCheque ? (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFile('copiaCheque')}>
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleFileUpload('copiaCheque')}>
                        <Upload className="h-4 w-4 mr-1" />
                        Adjuntar
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Voucher Bancario - solo si tipo de pago es Transferencia o Depósito */}
              {(selectedPago.tipoPago === 'Transferencia' || selectedPago.tipoPago === 'Depósito en Cuenta') && (
                <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Voucher Bancario (PDF)</p>
                      {sustentoFiles.voucherBancario ? (
                        <p className="text-xs text-green-600 font-medium">✓ {sustentoFiles.voucherBancario}</p>
                      ) : (
                        <p className="text-xs text-orange-500">Pendiente de adjuntar</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sustentoFiles.voucherBancario ? (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFile('voucherBancario')}>
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleFileUpload('voucherBancario')}>
                        <Upload className="h-4 w-4 mr-1" />
                        Adjuntar
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground text-center italic">
                Adjuntar documentos NO cambia el estado del pago. Use "Confirmar Pago" para finalizar.
              </p>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerSustentoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarSustento}>
              Guardar Sustento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Pago */}
      <Dialog open={confirmarPagoOpen} onOpenChange={setConfirmarPagoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>
              Confirme el pago del periodo {selectedPago?.periodo} por S/ {selectedPago ? formatMonto(selectedPago.monto) : '0.00'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fechaPago">Fecha de Pago</Label>
              <Input
                id="fechaPago"
                type="date"
                value={fechaPagoInput}
                onChange={(e) => setFechaPagoInput(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Resumen:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Proveedor: {selectedPago?.proveedor}</li>
                <li>• Tipo de Pago: {selectedPago?.tipoPago}</li>
                <li>• Cuenta: {selectedPago?.cuentaBancaria.banco} {selectedPago?.cuentaBancaria.numeroMasked}</li>
                <li>• Monto: <span className="font-mono font-medium text-foreground">S/ {selectedPago ? formatMonto(selectedPago.monto) : '0.00'}</span></li>
              </ul>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Al confirmar, el pago pasará a estado <Badge variant="outline" className="ml-1">PAGADO</Badge> y se actualizará el devengado correspondiente.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarPagoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPago}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
