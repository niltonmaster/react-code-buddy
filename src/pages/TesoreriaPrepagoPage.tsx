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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ArrowLeft, Edit, CreditCard, ChevronLeft, ChevronRight, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getDevengados, saveDevengado, DevengadoRecord, CuentaBancaria, saveDevengadoNDGroup } from '@/lib/devengadosStorage';
import { savePago } from '@/lib/pagosStorage';

// Solo estados permitidos para Tesorería en Pre-Pago
const ESTADOS_PREPAGO = ['TODOS', 'REGISTRADO', 'EN_PREPAGO'] as const;
const ENTIDADES = ['FCR', 'ONP', 'ESSALUD'] as const;
const UNIDADES_NEGOCIO = ['FCR-DL 19990', 'FCR-DL 20530', 'FCR-MACROFONDO', 'ONP-PENSIONES'] as const;
const PAGE_SIZES = [10, 20, 50] as const;

const TIPOS_PAGO = ['Cheque', 'Transferencia', 'Efectivo', 'Carta Orden', 'Depósito en Cuenta', 'Débito en cuenta'] as const;

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
  'Débito en cuenta': [
    { id: 'DEB-001', banco: 'Scotiabank', numeroMasked: '970-0700108', moneda: 'USD' },
    { id: 'DEB-002', banco: 'BCP', numeroMasked: '****4444', moneda: 'PEN' },
  ],
};

function formatMonto(monto: number, moneda?: string): string {
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
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s\u00A0-]+/g, '');
}

function normalizePeriodo(value: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const parts = raw.split('-').map(p => p.trim());
  if (parts.length !== 2) return raw;
  if (parts[0].length === 4) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}`;
  }
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

function formatFecha(fecha: string | undefined | null): string {
  if (!fecha) return '-';
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
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
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  
  // Filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    entidad: 'FCR',
    unidadNegocio: 'FCR-DL 19990',
    periodo: '',
    estado: 'REGISTRADO',
    proveedor: '',
    fechaDesde: '',
    fechaHasta: '',
  });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // Selección múltiple para Cambio Masivo
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Modal Cambio Masivo
  const [cambioMasivoOpen, setCambioMasivoOpen] = useState(false);
  const [masivoTipoPago, setMasivoTipoPago] = useState('');
  const [masivoCuenta, setMasivoCuenta] = useState<CuentaBancaria | null>(null);
  
  // Modal Modificar (individual)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevengado, setSelectedDevengado] = useState<DevengadoRecord | null>(null);
  const [modalTipoPago, setModalTipoPago] = useState('');
  const [modalCuentaBancaria, setModalCuentaBancaria] = useState<CuentaBancaria | null>(null);
  
  // Modal Confirmar Pre-Pago (para ND con glosa, noPago, monto soles)
  const [confirmarPrepagoOpen, setConfirmarPrepagoOpen] = useState(false);
  const [confirmarDevengado, setConfirmarDevengado] = useState<DevengadoRecord | null>(null);
  const [confirmarGlosa, setConfirmarGlosa] = useState('');
  const [confirmarNoPago, setConfirmarNoPago] = useState('');
  
  // Modal Comprobante de Giro
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const [comprobanteData, setComprobanteData] = useState<any>(null);
  
  // Detectar si estamos en modo MACROFONDO (ND)
  const isNDMode = normalizeKey(appliedFilters.unidadNegocio) === normalizeKey('FCR-MACROFONDO');
  
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

  // Filtrar devengados
  const filteredDevengados = useMemo(() => {
    return devengados
      .filter(d => {
        // Solo REGISTRADO y EN_PREPAGO
        if (d.estado !== 'REGISTRADO' && d.estado !== 'EN_PREPAGO') return false;
        
        // Para ND: solo mostrar registros PRINCIPAL (el -1 se crea al confirmar prepago)
        if (d.tipoDevengado === 'NO_DOMICILIADO' && d.rol === 'IGV') return false;
        
        const entidadMatch = !d.entidad || normalizeKey(d.entidad) === normalizeKey(appliedFilters.entidad);
        const unidadMatch = !d.unidadNegocio || normalizeKey(d.unidadNegocio) === normalizeKey(appliedFilters.unidadNegocio);
        if (!entidadMatch || !unidadMatch) return false;

        const periodoFiltro = normalizePeriodo(appliedFilters.periodo);
        if (periodoFiltro && normalizePeriodo(d.periodo) !== periodoFiltro) return false;

        if (appliedFilters.estado !== 'TODOS' && d.estado !== appliedFilters.estado) return false;

        if (appliedFilters.proveedor && !d.proveedor.toLowerCase().includes(appliedFilters.proveedor.toLowerCase())) return false;
        
        // Filtro Fecha Prox Pago (usa fechaRegistro como proxy)
        if (appliedFilters.fechaDesde && d.fechaRegistro < appliedFilters.fechaDesde) return false;
        if (appliedFilters.fechaHasta && d.fechaRegistro > appliedFilters.fechaHasta) return false;
        
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
      proveedor: filterProveedor,
      fechaDesde: filterFechaDesde,
      fechaHasta: filterFechaHasta,
    });
    setCurrentPage(1);
    setSelectedIds(new Set());
    toast.info('Filtros aplicados');
  };

  const handleLimpiar = () => {
    const defaults = {
      entidad: 'FCR',
      unidadNegocio: 'FCR-DL 19990',
      periodo: '',
      estado: 'REGISTRADO',
      proveedor: '',
      fechaDesde: '',
      fechaHasta: '',
    };
    setFilterEntidad(defaults.entidad);
    setFilterUnidadNegocio(defaults.unidadNegocio);
    setFilterPeriodo(defaults.periodo);
    setFilterEstado(defaults.estado);
    setFilterProveedor(defaults.proveedor);
    setFilterFechaDesde(defaults.fechaDesde);
    setFilterFechaHasta(defaults.fechaHasta);
    setAppliedFilters(defaults);
    setCurrentPage(1);
    setSelectedIds(new Set());
    toast.info('Filtros limpiados');
  };

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize, 10));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // === Selección múltiple ===
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const registrados = paginatedDevengados.filter(d => d.estado === 'REGISTRADO');
    const allSelected = registrados.every(d => selectedIds.has(d.id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        registrados.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        registrados.forEach(d => next.add(d.id));
        return next;
      });
    }
  };

  // === Cambio Masivo ===
  const handleOpenCambioMasivo = () => {
    if (selectedIds.size === 0) {
      toast.error('Seleccione al menos un registro');
      return;
    }
    setMasivoTipoPago('');
    setMasivoCuenta(null);
    setCambioMasivoOpen(true);
  };

  const handleAplicarCambioMasivo = () => {
    if (!masivoTipoPago) {
      toast.error('Seleccione un Tipo de Pago');
      return;
    }
    const requiresCuenta = (CUENTAS_BANCARIAS[masivoTipoPago] || []).length > 0;
    if (requiresCuenta && !masivoCuenta) {
      toast.error('Seleccione una Cuenta Bancaria');
      return;
    }

    let updated = 0;
    selectedIds.forEach(id => {
      const dev = devengados.find(d => d.id === id);
      if (dev && dev.estado === 'REGISTRADO') {
        saveDevengado({
          ...dev,
          tipoPago: masivoTipoPago,
          cuentaBancaria: masivoCuenta || undefined,
        });
        updated++;
      }
    });

    toast.success(`${updated} registro(s) actualizado(s)`);
    loadData();
    setSelectedIds(new Set());
    setCambioMasivoOpen(false);
  };

  // === Modal Modificar individual ===
  const openModificar = (dev: DevengadoRecord) => {
    setSelectedDevengado(dev);
    setModalTipoPago(dev.tipoPago || '');
    setModalCuentaBancaria(dev.cuentaBancaria || null);
    setModalOpen(true);
  };

  const handleTipoPagoChange = (value: string) => {
    setModalTipoPago(value);
    setModalCuentaBancaria(null);
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

  // === Generar Pre-Pago ===
  const handleGenerarPrePago = (dev: DevengadoRecord) => {
    if (!dev.tipoPago) {
      toast.error('Debe configurar el Tipo de Pago antes de generar el Pre-Pago');
      return;
    }
    const requiresCuenta = (CUENTAS_BANCARIAS[dev.tipoPago] || []).length > 0;
    if (requiresCuenta && !dev.cuentaBancaria) {
      toast.error('Debe configurar la Cuenta Bancaria antes de generar el Pre-Pago');
      return;
    }

    // Para ND: abrir modal de confirmación con glosa, noPago
    if (dev.tipoDevengado === 'NO_DOMICILIADO') {
      const memo = dev.documentoNro || '';
      const defaultGlosa = `PAGO IGV NO DOMICILIADO - ${dev.proveedor} - MEMO ${memo}`;
      setConfirmarDevengado(dev);
      setConfirmarGlosa(defaultGlosa);
      setConfirmarNoPago('');
      setConfirmarPrepagoOpen(true);
      return;
    }

    // Para IGV D: flujo directo (existente)
    ejecutarPrepago(dev);
  };

  // Ejecutar el prepago (común D y ND después de confirmación)
  const ejecutarPrepago = (dev: DevengadoRecord, glosa?: string, noPago?: string) => {
    const isND = dev.tipoDevengado === 'NO_DOMICILIADO';
    // Para ND: el monto del pago es igvSoles (en PEN)
    const montoPago = isND ? (dev.igvSoles || dev.monto) : dev.monto;

    // Crear pago
    const pagoResult = savePago({
      devengadoId: dev.id.toString(),
      periodo: dev.periodo,
      entidad: dev.entidad || 'FCR',
      unidadNegocio: dev.unidadNegocio || 'FCR-DL 19990',
      proveedor: dev.proveedor,
      monto: montoPago,
      tipoPago: dev.tipoPago!,
      cuentaBancaria: dev.cuentaBancaria || { id: '', banco: '', numeroMasked: '', moneda: 'PEN' },
      fechaGeneracion: getFechaHoy(),
      estado: 'GENERADO',
      observacion: glosa || `PRE-PAGO ${dev.documentoNro}`,
    });

    if (!pagoResult.success) {
      toast.error(pagoResult.error || 'Error al crear el pago');
      return;
    }

    // Actualizar devengado principal a PAGADO
    saveDevengado({ ...dev, estado: 'PAGADO', fechaPago: getFechaHoy() });

    // Para ND: crear el registro -1 (IGV) con estado PAGADO
    if (isND && dev.groupId) {
      const igvRecord: Omit<DevengadoRecord, 'id'> = {
        periodo: dev.periodo,
        proveedor: dev.proveedor,
        ruc: dev.ruc,
        documentoNro: `${dev.documentoNro}-1`,
        moneda: 'PEN',
        monto: dev.igvSoles || 0,
        estado: 'PAGADO',
        fechaRegistro: getFechaHoy(),
        fechaPago: getFechaHoy(),
        observacion: `IGV NO DOMICILIADO - IGV (${noPago || 'S/N'})`,
        entidad: 'FCR',
        unidadNegocio: dev.unidadNegocio || 'FCR-MACROFONDO',
        tipoDevengado: 'NO_DOMICILIADO',
        groupId: dev.groupId,
        rol: 'IGV',
        montoBaseUSD: dev.montoBaseUSD,
        montoIgvUSD: dev.montoIgvUSD,
        totalObligacionUSD: dev.totalObligacionUSD,
        igvSoles: dev.igvSoles,
        asiento: dev.asiento,
        tipoPago: dev.tipoPago,
        cuentaBancaria: dev.cuentaBancaria,
      };
      saveDevengado(igvRecord);
    }

    // Mostrar comprobante de giro
    setComprobanteData({
      giradoA: dev.proveedor,
      documento: dev.documentoNro,
      monto: montoPago,
      moneda: isND ? 'PEN' : (dev.moneda || 'PEN'),
      glosa: glosa || `PRE-PAGO ${dev.documentoNro}`,
      modalidadPago: dev.tipoPago,
      cuenta: dev.cuentaBancaria ? `${dev.cuentaBancaria.banco} ${dev.cuentaBancaria.numeroMasked}` : '-',
      noPago: noPago || '-',
      fecha: getFechaHoy(),
      pagoId: pagoResult.pago?.id,
    });
    setComprobanteOpen(true);

    toast.success('Pre-Pago generado correctamente');
    loadData();
  };

  // Confirmar Pre-Pago ND
  const handleConfirmarPrepagoND = () => {
    if (!confirmarDevengado) return;
    if (!confirmarNoPago.trim()) {
      toast.error('Debe ingresar el No. Pago (Telebank)');
      return;
    }
    ejecutarPrepago(confirmarDevengado, confirmarGlosa, confirmarNoPago);
    setConfirmarPrepagoOpen(false);
    setConfirmarDevengado(null);
  };

  const handleVolver = () => navigate('/');

  // Generar números de página
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  const cuentasDisponibles = CUENTAS_BANCARIAS[modalTipoPago] || [];
  const cuentasMasivo = CUENTAS_BANCARIAS[masivoTipoPago] || [];

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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1 block">Entidad</Label>
                <Select value={filterEntidad} onValueChange={setFilterEntidad}>
                  <SelectTrigger><SelectValue placeholder="Seleccione entidad" /></SelectTrigger>
                  <SelectContent>
                    {ENTIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Unidad de Negocio</Label>
                <Select value={filterUnidadNegocio} onValueChange={setFilterUnidadNegocio}>
                  <SelectTrigger><SelectValue placeholder="Seleccione unidad" /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES_NEGOCIO.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Periodo (YYYY-MM)</Label>
                <Input placeholder="Ej: 2025-12" value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger><SelectValue placeholder="Seleccione estado" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PREPAGO.map(e => <SelectItem key={e} value={e}>{e === 'TODOS' ? 'Todos' : e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1 block">Proveedor</Label>
                <Input placeholder="Buscar proveedor..." value={filterProveedor} onChange={(e) => setFilterProveedor(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Fecha Prox Pago Desde</Label>
                <Input type="date" value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Fecha Prox Pago Hasta</Label>
                <Input type="date" value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="default" onClick={handleBuscar}>
                  <Search className="mr-2 h-4 w-4" /> Buscar
                </Button>
                <Button variant="outline" onClick={handleLimpiar}>Limpiar</Button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Filtros: Entidad <span className="font-medium text-foreground">{appliedFilters.entidad}</span> · Unidad{' '}
            <span className="font-medium text-foreground">{appliedFilters.unidadNegocio}</span> · Periodo{' '}
            <span className="font-medium text-foreground">{appliedFilters.periodo ? normalizePeriodo(appliedFilters.periodo) : 'Todos'}</span> · Estado{' '}
            <span className="font-medium text-foreground">{appliedFilters.estado}</span>
            {appliedFilters.fechaDesde && <> · Desde <span className="font-medium text-foreground">{formatFecha(appliedFilters.fechaDesde)}</span></>}
            {appliedFilters.fechaHasta && <> · Hasta <span className="font-medium text-foreground">{formatFecha(appliedFilters.fechaHasta)}</span></>}
          </div>
        </Card>

        {/* Toolbar: Cambio Masivo */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <Badge variant="secondary">{selectedIds.size} seleccionado(s)</Badge>
            <Button variant="outline" size="sm" onClick={handleOpenCambioMasivo}>
              <Edit className="h-4 w-4 mr-1" /> Cambio Masivo
            </Button>
          </div>
        )}

        {/* Tabla */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paginatedDevengados.filter(d => d.estado === 'REGISTRADO').length > 0 && paginatedDevengados.filter(d => d.estado === 'REGISTRADO').every(d => selectedIds.has(d.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold w-12">N°</TableHead>
                  <TableHead className="font-semibold">Periodo</TableHead>
                  <TableHead className="font-semibold">Documento</TableHead>
                  <TableHead className="font-semibold">Proveedor</TableHead>
                  <TableHead className="font-semibold">Glosa</TableHead>
                  {isNDMode && <TableHead className="font-semibold">Asiento AP</TableHead>}
                  <TableHead className="font-semibold text-right">
                    {isNDMode ? 'Monto (USD)' : 'Monto (S/)'}
                  </TableHead>
                  {isNDMode && <TableHead className="font-semibold text-right">IGV Soles</TableHead>}
                  <TableHead className="font-semibold">Tipo de Pago</TableHead>
                  <TableHead className="font-semibold">Cuenta Bancaria</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevengados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isNDMode ? 13 : 11} className="text-center py-8 text-muted-foreground">
                      No hay devengados para los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDevengados.map((dev, index) => (
                    <TableRow key={dev.id} className={selectedIds.has(dev.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(dev.id)}
                          onCheckedChange={() => toggleSelect(dev.id)}
                          disabled={dev.estado !== 'REGISTRADO'}
                        />
                      </TableCell>
                      <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{dev.periodo}</TableCell>
                      <TableCell className="font-mono text-sm">{dev.documentoNro || '-'}</TableCell>
                      <TableCell>{dev.proveedor}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{dev.observacion || '-'}</TableCell>
                      {isNDMode && <TableCell className="font-mono text-sm">{dev.asiento || '-'}</TableCell>}
                      <TableCell className="text-right font-mono">
                        {isNDMode
                          ? formatMonto(dev.montoIgvUSD || dev.monto)
                          : formatMonto(dev.monto)
                        }
                      </TableCell>
                      {isNDMode && (
                        <TableCell className="text-right font-mono text-primary font-semibold">
                          {dev.igvSoles ? formatMonto(dev.igvSoles) : '-'}
                        </TableCell>
                      )}
                      <TableCell>{dev.tipoPago || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        {dev.cuentaBancaria
                          ? `${dev.cuentaBancaria.banco} ${dev.cuentaBancaria.numeroMasked}`
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(dev.estado)}>{dev.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openModificar(dev)} disabled={dev.estado !== 'REGISTRADO'}>
                            <Edit className="h-4 w-4 mr-1" /> Modificar
                          </Button>
                          <Button
                            variant="default" size="sm"
                            onClick={() => handleGenerarPrePago(dev)}
                            disabled={dev.estado !== 'REGISTRADO' || !dev.tipoPago}
                            className="bg-[#0d3b5e] hover:bg-[#0a2d47]"
                          >
                            <CreditCard className="h-4 w-4 mr-1" /> Generar Pre-Pago
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
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Mostrando {totalItems > 0 ? startIndex + 1 : 0}–{endIndex} de {totalItems}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                {getPageNumbers().map((page, idx) =>
                  typeof page === 'number' ? (
                    <Button key={idx} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => handlePageChange(page)} className="min-w-[36px]">{page}</Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground">…</span>
                  )
                )}
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Botón volver */}
        <div className="mt-6">
          <Button variant="outline" onClick={handleVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
          </Button>
        </div>
      </div>

      {/* ========== Modal Modificar Individual ========== */}
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
              <Label>Tipo de Pago</Label>
              <Select value={modalTipoPago} onValueChange={handleTipoPagoChange}>
                <SelectTrigger><SelectValue placeholder="Seleccione tipo de pago" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_PAGO.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {cuentasDisponibles.length > 0 && (
              <div className="space-y-2">
                <Label>Cuenta Bancaria</Label>
                <Select value={modalCuentaBancaria?.id || ''} onValueChange={handleCuentaChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccione cuenta bancaria" /></SelectTrigger>
                  <SelectContent>
                    {cuentasDisponibles.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.banco} - {c.numeroMasked} ({c.moneda})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {modalTipoPago === 'Efectivo' && (
              <p className="text-sm text-muted-foreground italic">El pago en efectivo no requiere cuenta bancaria.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardarModificacion}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Modal Cambio Masivo ========== */}
      <Dialog open={cambioMasivoOpen} onOpenChange={setCambioMasivoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambio Masivo</DialogTitle>
            <DialogDescription>
              Aplicar Tipo de Pago y Cuenta a {selectedIds.size} registro(s) seleccionado(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <Select value={masivoTipoPago} onValueChange={(v) => { setMasivoTipoPago(v); setMasivoCuenta(null); }}>
                <SelectTrigger><SelectValue placeholder="Seleccione tipo de pago" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_PAGO.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {cuentasMasivo.length > 0 && (
              <div className="space-y-2">
                <Label>Cuenta Bancaria</Label>
                <Select value={masivoCuenta?.id || ''} onValueChange={(id) => setMasivoCuenta(cuentasMasivo.find(c => c.id === id) || null)}>
                  <SelectTrigger><SelectValue placeholder="Seleccione cuenta" /></SelectTrigger>
                  <SelectContent>
                    {cuentasMasivo.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.banco} - {c.numeroMasked} ({c.moneda})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCambioMasivoOpen(false)}>Cancelar</Button>
            <Button onClick={handleAplicarCambioMasivo}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Modal Confirmar Pre-Pago ND ========== */}
      <Dialog open={confirmarPrepagoOpen} onOpenChange={setConfirmarPrepagoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Generación de Pre-Pago</DialogTitle>
            <DialogDescription>
              {confirmarDevengado?.proveedor} — {confirmarDevengado?.documentoNro}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Monto Total USD:</span>
                <p className="font-mono font-semibold">$ {formatMonto(confirmarDevengado?.totalObligacionUSD || confirmarDevengado?.monto || 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">IGV a pagar (Soles):</span>
                <p className="font-mono font-semibold text-primary text-lg">S/ {formatMonto(confirmarDevengado?.igvSoles || 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo de Pago:</span>
                <p className="font-medium">{confirmarDevengado?.tipoPago || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cuenta:</span>
                <p className="font-medium">{confirmarDevengado?.cuentaBancaria ? `${confirmarDevengado.cuentaBancaria.banco} ${confirmarDevengado.cuentaBancaria.numeroMasked}` : '-'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Glosa</Label>
              <Textarea
                value={confirmarGlosa}
                onChange={(e) => setConfirmarGlosa(e.target.value)}
                rows={3}
                placeholder="Edite la glosa del pre-pago..."
              />
            </div>

            <div className="space-y-2">
              <Label>No. Pago (Telebank) <span className="text-destructive">*</span></Label>
              <Input
                value={confirmarNoPago}
                onChange={(e) => setConfirmarNoPago(e.target.value)}
                placeholder="Ingrese número de reporte Telebank"
              />
              <p className="text-xs text-muted-foreground">Número del reporte de Telebank que sustenta la transacción bancaria</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarPrepagoOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarPrepagoND} className="bg-[#0d3b5e] hover:bg-[#0a2d47]">
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmar Pre-Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Modal Comprobante de Giro ========== */}
      <Dialog open={comprobanteOpen} onOpenChange={setComprobanteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Comprobante de Giro
            </DialogTitle>
            <DialogDescription>Pre-pago generado exitosamente</DialogDescription>
          </DialogHeader>
          {comprobanteData && (
            <div className="space-y-3 py-4">
              <div className="border rounded-lg p-4 bg-muted/30 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Pago:</span>
                  <span className="font-mono font-semibold">{comprobanteData.pagoId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>{formatFecha(comprobanteData.fecha)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Girado a:</span>
                  <span className="font-medium">{comprobanteData.giradoA}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="font-mono">{comprobanteData.documento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modalidad:</span>
                  <span>{comprobanteData.modalidadPago}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuenta:</span>
                  <span>{comprobanteData.cuenta}</span>
                </div>
                {comprobanteData.noPago !== '-' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Pago (Telebank):</span>
                    <span className="font-mono">{comprobanteData.noPago}</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between text-base font-bold">
                  <span>Monto:</span>
                  <span className="text-primary">{comprobanteData.moneda === 'PEN' ? 'S/' : '$'} {formatMonto(comprobanteData.monto)}</span>
                </div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Glosa:</span>
                <p className="mt-1">{comprobanteData.glosa}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setComprobanteOpen(false); navigate('/tesoreria/pagos'); }}>
              Ir a Lista de Pagos
            </Button>
            <Button onClick={() => setComprobanteOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
