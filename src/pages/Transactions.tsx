import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn, isExpenseConfig } from '../lib/utils';
import { getCategoryStyle, getCategoryIcon, AVAILABLE_COLORS, enrichMovimiento } from '../lib/categoryUtils';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Movimiento } from '../types';
import { Plus, Search, Edit2, Trash2, X, TrendingUp, TrendingDown, PiggyBank, AlertTriangle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { TransactionModal } from '../components/TransactionModal';
import { BulkFixedExpensesModal } from '../components/BulkFixedExpensesModal';
import { TipoTransaccion } from '../types';
import { RefreshCw } from 'lucide-react';

export function Transactions() {
  const { movimientos, categorias, bolsillos, settings, deleteMovimiento } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(() => {
    return localStorage.getItem('amara_open_fixed_expenses_onboarding') === 'true';
  });
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [initialTipo, setInitialTipo] = useState<TipoTransaccion>('gasto');

  const sortedMovimientos = [...movimientos].sort((a,b) => new Date(b.fecha?.includes('T') ? b.fecha : `${b.fecha || ''}T12:00:00`).getTime() - new Date(a.fecha?.includes('T') ? a.fecha : `${a.fecha || ''}T12:00:00`).getTime());

  const filtered = sortedMovimientos.filter(m => {
    if (isExpenseConfig(m)) return false;
    
    // Hide all savings withdrawals (retiros) entirely from UI per rules
    if (m.tipo === 'retiro_ahorro' || m.categoria?.startsWith('retiro_bolsillo_')) {
      return false;
    }

    // Hide old structure deposits that aren't the new 'ahorro' type
    if (m.categoria?.startsWith('bolsillo_') && m.tipo !== 'ahorro') return false;

    // Hide generic transferencias
    if (m.tipo === 'transferencia' && m.categoria !== 'ahorro') {
      return false;
    }

    return ((m.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
           (m.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const groupedMovimientos = filtered.reduce((groups, mov) => {
    const validDateStr = mov.fecha?.includes('T') ? mov.fecha : `${mov.fecha}T12:00:00`;
    const date = new Date(validDateStr);
    
    let dateGroup = format(date, 'd MMMM yyyy', { locale: es });
    if (isToday(date)) {
      dateGroup = 'Hoy';
    } else if (isYesterday(date)) {
      dateGroup = 'Ayer';
    }

    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(mov);
    return groups;
  }, {} as Record<string, Movimiento[]>);

  const handleEdit = (m: Movimiento) => {
    setEditingMovimiento(m);
    setIsModalOpen(true);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteMovimiento(deletingId);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 relative h-full">
      <header className="flex flex-col gap-4 mb-6 sm:mb-8 mt-2 p-5 sm:p-7 bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-2xl border border-white/[0.08] rounded-[24px] sm:rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-white/90 dark:to-white/60">
              Movimientos
            </h1>
            <p className="text-[13px] sm:text-[15px] text-muted-foreground/80 mt-1 sm:mt-1.5 font-medium tracking-wide">
              Historial de todas tus transacciones
            </p>
          </div>
          
          <div className="w-full md:w-auto relative group/search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-[18px] sm:w-[18px] text-muted-foreground/60 group-focus-within/search:text-primary transition-colors" />
            <Input 
              placeholder="Buscar..." 
              className="w-full md:w-72 pl-10 sm:pl-11 pr-4 h-11 sm:h-12 bg-black/20 hover:bg-black/30 focus:bg-black/40 border-white/5 hover:border-white/10 focus-visible:border-primary/30 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-inner text-[14px] sm:text-[15px]" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="space-y-6 pb-24">
        {Object.entries(groupedMovimientos).length === 0 ? (
          <Card className="border-dashed border-white/10 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center opacity-80">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">No se encontraron movimientos</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">Intenta con otra búsqueda o registra un nuevo movimiento.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedMovimientos).map(([dateLabel, group]) => (
            <div key={dateLabel} className="space-y-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest pl-2 pb-1">{dateLabel}</h3>
              <div className="space-y-2">
                {(group as Movimiento[]).map(mov => {
                  const { catStyle, CatIcon, displayName, secondaryInfo } = enrichMovimiento(mov, categorias, bolsillos);

                  const validDateStr = mov.fecha?.includes('T') ? mov.fecha : `${mov.fecha}T12:00:00`;
                  let timeStr = '';
                  if (mov.fecha?.includes('T')) {
                    timeStr = format(new Date(mov.fecha), 'h:mm a');
                  } else {
                    // Generate a stable pseudo-random time based on the ID
                    const idStr = String(mov.id || '');
                    const hash = idStr.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
                    const hours = Math.abs(hash % 12) || 12;
                    const mins = Math.abs(hash % 60).toString().padStart(2, '0');
                    const ampm = Math.abs(hash % 2) === 0 ? 'AM' : 'PM';
                    timeStr = `${hours}:${mins} ${ampm}`;
                  }

                  return (
                    <Card key={mov.id} className="group hover:border-white/10 transition-colors duration-300 border border-white/5 bg-card/40 backdrop-blur-md rounded-[18px] overflow-hidden shadow-sm">
                      <CardContent className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
                        <div className="flex items-center space-x-3.5 sm:space-x-4 overflow-hidden">
                          <div className={cn(
                            "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex shrink-0 items-center justify-center border border-white/5 shadow-inner",
                            catStyle.bgClass,
                            catStyle.colorClass
                          )}>
                            <CatIcon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                          </div>
                          <div className="truncate flex flex-col justify-center">
                            <p className="font-semibold text-[14px] sm:text-[15px] tracking-tight text-foreground/95 truncate">
                              {displayName}
                            </p>
                            <p className="text-[11px] sm:text-[12px] text-muted-foreground/70 mt-0.5 truncate">
                              <span className="truncate">{secondaryInfo}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 sm:space-x-4 pl-2 shrink-0">
                          <div className="text-right flex flex-col justify-center items-end">
                            {(() => {
                              const isRetiro = mov.categoria?.startsWith('retiro_bolsillo_');
                              const isIngreso = mov.tipo === 'ingreso';
                              return (
                                <div className={cn("font-semibold text-[15px] sm:text-[16px] tracking-tight", isIngreso ? 'text-[#00e676]' : (isRetiro ? 'text-blue-400' : 'text-foreground/90'))}>
                                  {isIngreso ? '+' : '-'}{formatCurrency(mov.monto || 0, settings.currency)}
                                </div>
                              );
                            })()}
                            <div className="text-[10px] sm:text-[11px] text-muted-foreground/50 mt-0.5 font-medium tracking-wide">
                              {timeStr}
                            </div>
                          </div>
                          <div className="flex opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity items-center space-x-0.5">
                            {mov.tipo !== 'transferencia' ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-8 md:w-8 text-muted-foreground hover:text-foreground hover:bg-white/10" onClick={() => handleEdit(mov)}><Edit2 className="w-3.5 h-3.5"/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-8 md:w-8 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => setDeletingId(mov.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                              </>
                            ) : (
                              <div className="h-8 w-16" /> /* Placeholder space so layout doesn't shift */
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {isFabMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/20 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setIsFabMenuOpen(false)}
        />
      )}

      <div className="fixed bottom-[104px] md:bottom-8 right-5 md:right-8 z-40 flex flex-col items-end gap-3">
        <div 
          className={cn(
            "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
            isFabMenuOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-90 translate-y-4 pointer-events-none absolute bottom-16"
          )}
        >
          <Button 
            variant="outline"
            className="rounded-[18px] bg-card/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:bg-white/10 text-foreground px-4 h-12 flex items-center gap-3.5 transition-all transform hover:scale-105 active:scale-95 justify-between w-44"
            onClick={() => { setInitialTipo('gasto'); setEditingMovimiento(null); setIsModalOpen(true); setIsFabMenuOpen(false); }}
          >
            <span className="font-semibold text-[15px]">Gasto</span>
            <div className="bg-rose-500/20 text-rose-400 p-1.5 rounded-full shadow-inner">
              <TrendingDown className="w-4 h-4" />
            </div>
          </Button>

          <Button 
            variant="outline"
            className="rounded-[18px] bg-card/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:bg-white/10 text-foreground px-4 h-12 flex items-center gap-3.5 transition-all transform hover:scale-105 active:scale-95 justify-between w-44"
            onClick={() => { setInitialTipo('ingreso'); setEditingMovimiento(null); setIsModalOpen(true); setIsFabMenuOpen(false); }}
          >
            <span className="font-semibold text-[15px]">Ingreso</span>
            <div className="bg-[#00e676]/20 text-[#00e676] p-1.5 rounded-full shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </Button>

          <Button 
            variant="outline"
            className="rounded-[18px] bg-card/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:bg-white/10 text-foreground px-4 h-12 flex items-center gap-3.5 transition-all transform hover:scale-105 active:scale-95 justify-between w-44"
            onClick={() => { setIsBulkOpen(true); setIsFabMenuOpen(false); }}
          >
            <span className="font-semibold text-[15px] text-foreground">Gastos Fijos</span>
            <div className="bg-[#FF4081]/20 text-[#FF4081] p-1.5 rounded-full shadow-inner">
              <RefreshCw className="w-4 h-4" />
            </div>
          </Button>
        </div>

        <Button 
          size="icon" 
          className={cn(
            "h-14 w-14 rounded-[20px] shadow-[0_8px_20px_rgba(0,230,118,0.25)] hover:shadow-[0_8px_25px_rgba(0,230,118,0.35)] bg-primary/95 backdrop-blur-xl hover:bg-primary border border-white/10 transition-all duration-300 z-50 text-primary-foreground",
            isFabMenuOpen ? "rotate-[135deg] bg-card hover:bg-card border-white/20 text-foreground shadow-[0_8px_25px_rgba(0,0,0,0.5)]" : "hover:scale-105 active:scale-95"
          )}
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        movimiento={editingMovimiento} 
        initialTipo={initialTipo}
      />

      <BulkFixedExpensesModal
        isOpen={isBulkOpen}
        onClose={() => {
          setIsBulkOpen(false);
          localStorage.removeItem('amara_open_fixed_expenses_onboarding');
        }}
      />

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">¿Eliminar movimiento?</h3>
              <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
              
              <div className="flex w-full gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border-white/10 hover:bg-white/5 disabled:opacity-50 h-11" 
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 h-11 border-0" 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
