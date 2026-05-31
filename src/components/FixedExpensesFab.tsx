import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { getCategoryStyle, getCategoryIcon } from '../lib/categoryUtils';
import { Receipt, X, Check, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { isThisMonth, isThisWeek, isThisQuarter, isThisYear, parseISO, isSameMonth, isSameYear, isSameWeek, isSameQuarter } from 'date-fns';
import { Movimiento } from '../types';

interface FixedExpenseSummary {
  key: string;
  descripcion: string;
  categoria: string;
  frequency: string;
  ultimoPago: number;
  status: 'paid' | 'pending' | 'upcoming';
  lastPaymentDate: string;
  dayOfMonth: number;
  configId: string;
}

export function FixedExpensesFab() {
  const [isOpen, setIsOpen] = useState(false);
  const { movimientos, fixedExpenses: dbFixedExpenses, updateFixedExpense, categorias, addMovimiento, updateMovimiento, settings } = useFinance();
  const [selectedExpense, setSelectedExpense] = useState<FixedExpenseSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  const fixedExpenses = useMemo(() => {
    // Real evaluated payments
    const payments = movimientos.filter(m => (!m.is_fixed || m.day_of_month == null) && m.active !== false && m.tipo === 'gasto');
    
    // Key -> config + payments
    const groups = new Map<string, { configId: string | number, descripcion: string, categoria: string, frequency: string, dayOfMonth: number, configuredAmount: number, payments: Movimiento[] }>();

    // Add new fixed expenses only
    dbFixedExpenses.forEach(f => {
      if (f.active !== false) {
        const key = `${f.category}-${(f.descripcion || '').trim().toLowerCase()}-${f.frequency}`;
        if (!groups.has(key)) {
          // Reutilizar lógica: Buscar el importe en el movimiento de configuración de la tabla 'movimientos'
          const configMov = movimientos.find(m => 
            m.is_fixed === true && 
            m.day_of_month != null && 
            m.categoria === f.category && 
            (m.descripcion || '').trim().toLowerCase() === (f.descripcion || '').trim().toLowerCase()
          );

          groups.set(key, {
            configId: f.id,
            descripcion: f.descripcion || f.category,
            categoria: f.category,
            frequency: f.frequency || 'monthly',
            dayOfMonth: f.day_of_month || 1,
            configuredAmount: configMov ? configMov.monto : (Number(f.monto) || 0),
            payments: []
          });
        }
      }
    });

    payments.forEach(p => {
      for (const group of groups.values()) {
        if (group.categoria === p.categoria && (group.descripcion).trim().toLowerCase() === (p.descripcion || '').trim().toLowerCase()) {
          group.payments.push(p);
        }
      }
    });

    const summaries: FixedExpenseSummary[] = [];

    groups.forEach((group, key) => {
      const freq = group.frequency;
      const parsedDay = Number(group.dayOfMonth);
      const targetDay = isNaN(parsedDay) ? 1 : parsedDay;
      const now = new Date();
      const currentDay = now.getDate();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      // 1. IMPORTANTE: NO aceptar pagos con fecha futura.
      const validPayments = group.payments.filter(m => {
        const d = new Date(m.fecha);
        const startOfPaymentDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return startOfPaymentDay <= startOfToday;
      });
      
      let isPaidThisPeriod = false;
      
      isPaidThisPeriod = validPayments.some(m => {
        const d = new Date(m.fecha);
        if (freq === 'monthly') return isSameMonth(d, now) && isSameYear(d, now);
        if (freq === 'weekly') return isSameWeek(d, now) && isSameYear(d, now);
        if (freq === 'quarterly') return isSameQuarter(d, now) && isSameYear(d, now);
        if (freq === 'yearly') return isSameYear(d, now);
        return isSameMonth(d, now) && isSameYear(d, now);
      });

      let status: 'paid' | 'pending' | 'upcoming' = 'upcoming';

      // 1. Validar primero si ya fue pagado
      if (isPaidThisPeriod) {
        status = 'paid';
      } 
      // 2. Si NO fue pagado, fijarse en la fecha de vencimiento
      else if (currentDay < targetDay) {
        status = 'upcoming';
      } 
      // 3. Si ya pasó la fecha o es el día y no está pagado
      else {
        status = 'pending';
      }

      // Sort valid payments to find the most recent one to get its amount
      const sortedPayments = [...validPayments].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const ultimoPago = sortedPayments.length > 0 ? sortedPayments[0].monto : group.configuredAmount;
      const lastPaymentDate = sortedPayments.length > 0 ? sortedPayments[0].fecha : new Date().toISOString();

      summaries.push({
        key,
        configId: String(group.configId),
        descripcion: group.descripcion,
        categoria: group.categoria,
        frequency: freq,
        ultimoPago,
        lastPaymentDate,
        status,
        dayOfMonth: targetDay
      });
    });

    return summaries.sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      return b.ultimoPago - a.ultimoPago;
    });

  }, [movimientos, dbFixedExpenses]);

  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async () => {
    if (!selectedExpense || !paymentAmount || isPaying) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsPaying(true);
    try {
      await addMovimiento({
          tipo: 'gasto',
          monto: amount,
          categoria: selectedExpense.categoria,
          descripcion: selectedExpense.descripcion,
          fecha: new Date().toISOString(),
          is_fixed: false // This is an execution, not a configuration
      });
      
      setSelectedExpense(null);
      setPaymentAmount('');
    } catch (e) {
      console.error('Error al registrar pago:', e);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeleteRecurrence = async () => {
    if (!selectedExpense) return;
    try {
      await updateFixedExpense(selectedExpense.configId, { active: false });
      setSelectedExpense(null);
    } catch (e) {
      console.error('Error al desactivar gasto recurrente:', e);
    }
  };

  const getFreqText = (f: string) => {
    const map: Record<string, string> = {
      weekly: 'Semanal',
      biweekly: 'Quincenal',
      monthly: 'Mensual',
      bimonthly: 'Bimestral',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      yearly: 'Anual'
    };
    return map[f] || 'Mensual';
  };

  return (
    <>
      <div className="fixed bottom-[104px] right-5 md:bottom-8 md:right-8 z-[60] flex flex-col gap-3 pointer-events-none group">
        <div className="absolute inset-0 bg-[#00e676]/20 rounded-full blur-[20px] animate-pulse pointer-events-none" />
        <Button
          size="icon"
          className="pointer-events-auto relative h-[52px] w-[52px] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(0,230,118,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_30px_rgba(0,230,118,0.5)] bg-black/40 backdrop-blur-xl hover:bg-black/50 border border-[#00e676]/30 hover:border-[#00e676]/60 transition-all duration-500 z-50 text-[#00e676] hover:scale-105 active:scale-95 overflow-hidden"
          onClick={() => setIsOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00e676]/10 via-transparent to-[#00e676]/5 opacity-80 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00e676]/80 to-transparent opacity-70" />
          <Receipt className="h-[22px] w-[22px] relative z-10 drop-shadow-[0_0_8px_rgba(0,230,118,0.8)] transition-all duration-300 group-hover:scale-110" />
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-md bg-gradient-to-b from-card/95 to-background border-t border-white/10 rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-[100%] duration-300 pointer-events-auto flex flex-col max-h-[85vh]">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

            <div className="w-full flex justify-center pt-4 pb-2 cursor-pointer z-20 shrink-0" onClick={() => setIsOpen(false)}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 pb-4 shrink-0 relative z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Gastos Fijos</h3>
                <p className="text-[13px] text-muted-foreground mt-1 font-medium">Gestiona tus pagos recurrentes</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-4 sm:px-6 pb-8 overflow-y-auto relative z-10 custom-scrollbar space-y-3">
              {fixedExpenses.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                   <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                     <Receipt className="w-5 h-5 text-muted-foreground" />
                   </div>
                   <p className="font-medium text-foreground">Sin gastos fijos</p>
                   <p className="text-xs text-muted-foreground mt-1 text-balance">Marca una transacción como "Pago recurrente" al crearla.</p>
                </div>
              ) : (
                fixedExpenses.map(expense => {
                  const cat = categorias.find(c => c.id === expense.categoria || c.nombre === expense.categoria);
                  const catStyle = cat ? getCategoryStyle(cat.color) : getCategoryStyle('gray');
                  const CatIcon = cat ? getCategoryIcon(cat.icono) : Receipt;

                  return (
                    <div key={expense.key} className="flex relative items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-card border border-white/5 hover:border-white/10 transition-colors shadow-sm group">
                      <div className="flex items-center space-x-3.5 overflow-hidden">
                        <div className={cn("w-12 h-12 rounded-xl flex shrink-0 items-center justify-center border border-white/5", catStyle.bgClass, catStyle.colorClass)}>
                          <CatIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col truncate pr-2">
                          <p className="font-semibold text-[15px] truncate text-foreground/95">{expense.descripcion}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-medium text-muted-foreground/70">{getFreqText(expense.frequency)}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className="text-[11px] font-medium text-muted-foreground/90">Último: {formatCurrency(expense.ultimoPago, settings.currency)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2.5">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md border",
                          expense.status === 'paid' ? "bg-[#00e676]/10 border-[#00e676]/20 text-[#00e676]" :
                          expense.status === 'pending' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                          "bg-white/5 border-white/10 text-muted-foreground"
                        )}>
                          {expense.status === 'paid' && <Check className="w-3 h-3" />}
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {expense.status === 'paid' ? 'Pagado' : expense.status === 'pending' ? 'Pendiente' : 'Próximo'}
                          </span>
                        </div>

                        <button 
                          onClick={() => {
                             if (expense.status === 'paid') {
                               // Just allow visualizing instead of paying
                               return;
                             }
                             setSelectedExpense(expense);
                             setPaymentAmount(expense.ultimoPago.toString());
                          }}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none",
                            expense.status === 'paid' ? "bg-[#00e676] cursor-default opacity-80" : "bg-white/10 hover:bg-white/20 cursor-pointer"
                          )}
                        >
                          <span 
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                              expense.status === 'paid' ? "translate-x-6" : "translate-x-1"
                            )} 
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedExpense && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
            
            <h3 className="text-xl font-bold tracking-tight text-foreground mb-1">{selectedExpense.descripcion}</h3>
            <p className="text-sm text-muted-foreground mb-5">Confirma el valor del recibo este mes</p>
            
            <div className="space-y-4">
              <div className="relative group">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">$</span>
                 <Input 
                   type="number"
                   className="w-full pl-8 h-14 bg-black/20 hover:bg-black/30 border border-white/10 rounded-2xl text-lg font-bold outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono placeholder:text-muted-foreground/30"
                   value={paymentAmount}
                   onChange={(e) => setPaymentAmount(e.target.value)}
                   autoFocus
                   placeholder="0.00"
                 />
              </div>

              <div className="flex w-full gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border-white/10 hover:bg-white/5 h-12 rounded-xl font-semibold" 
                  onClick={() => setSelectedExpense(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 border-0 rounded-xl font-bold shadow-[0_0_15px_rgba(0,230,118,0.3)]" 
                  onClick={handlePay}
                  disabled={isPaying}
                >
                  {isPaying ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>

              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  className="w-full h-11 text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl font-semibold transition-colors"
                  onClick={handleDeleteRecurrence}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
