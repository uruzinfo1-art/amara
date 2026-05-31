import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Movimiento, TipoTransaccion } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { DEFAULT_CATEGORIES } from '../lib/categoryUtils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimiento?: Movimiento | null;
  initialTipo?: any;
}

type ContextType = 'gasto' | 'ingreso';

export function TransactionModal({ isOpen, onClose, movimiento, initialTipo = 'gasto' }: TransactionModalProps) {
  const { addMovimiento, updateMovimiento, categorias, addFixedExpense, bolsillos, updateBolsillo } = useFinance();
  const allCategories = categorias;

  const [contexto, setContexto] = useState<ContextType>(initialTipo);
  const [gastoSubtipo, setGastoSubtipo] = useState<'real' | 'ahorro'>('real');
  const [selectedBolsilloId, setSelectedBolsilloId] = useState<string>('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isFixed, setIsFixed] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<string>('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (movimiento) {
      const isSaving = movimiento.tipo === 'gasto_ahorro' || movimiento.tipo === 'ahorro';
      setContexto(movimiento.tipo === 'ingreso' ? 'ingreso' : 'gasto');
      setGastoSubtipo(isSaving ? 'ahorro' : 'real');
      setMonto(movimiento.monto.toString());
      if (isSaving && (movimiento.categoria.startsWith('bolsillo_') || movimiento.categoria === 'ahorro')) {
        let bId = '';
        if (movimiento.categoria === 'ahorro') {
          const name = movimiento.descripcion.replace('Ahorro → ', '');
          const bObj = bolsillos.find(x => x.nombre === name);
          if (bObj) bId = bObj.id.toString();
        } else {
          bId = movimiento.categoria.replace('bolsillo_', '');
        }
        setSelectedBolsilloId(bId);
      }
      setCategoria(movimiento.categoria);
      setDescripcion(movimiento.descripcion);
      setFecha(movimiento.fecha);
      setIsFixed(movimiento.is_fixed || false);
      setFrequency(movimiento.frequency || 'monthly');
      setDayOfMonth(movimiento.day_of_month?.toString() || '1');
    } else {
      setContexto(initialTipo);
      setGastoSubtipo('real');
      setMonto('');
      setDescripcion('');
      setFecha(format(new Date(), 'yyyy-MM-dd'));
      setIsFixed(false);
      setFrequency('monthly');
      setDayOfMonth('1');
      
      const typeMap: Record<string, string> = {
        gasto: 'expense',
        ingreso: 'income'
      };
      
      const filteredCategories = Array.from(new Set(allCategories
        .filter(c => !c.type || c.type === typeMap[initialTipo])
        .map(c => c.nombre)));

      setCategoria(filteredCategories.length > 0 ? filteredCategories[0] : '');
      if (bolsillos.length > 0) {
        setSelectedBolsilloId(bolsillos[0].id.toString());
      }
    }
  }, [movimiento, isOpen, initialTipo, allCategories, bolsillos]);

  if (!isOpen) return null;

  const getContextValues = (ctx: ContextType) => {
    // Filtrar categorias según el contexto o mostrar todo si no tienen tipo
    const typeMap: Record<string, string> = {
      gasto: 'expense',
      ingreso: 'income'
    };
    
    const filteredCategories = Array.from(new Set(allCategories
      .filter(c => !c.type || c.type === typeMap[ctx])
      .map(c => c.nombre)));

    switch (ctx) {
      case 'ingreso':
        return {
          title: 'Nuevo Ingreso',
          placeholder: 'Ej. Pago cliente',
          buttonText: 'Registrar ingreso',
          categories: filteredCategories.length ? filteredCategories : ['Nómina', 'Freelance', 'Ventas'],
          realTipo: 'ingreso' as TipoTransaccion,
          glowClass: 'shadow-[0_0_40px_-10px_rgba(0,230,118,0.2)] border-[#00e676]/20',
          focusClass: 'focus-visible:ring-[#00e676]/30 focus-visible:border-[#00e676]',
          textClass: 'text-[#00e676]',
          buttonClass: 'bg-[#00e676] hover:bg-[#00e676]/90 text-black shadow-[0_4px_15px_rgba(0,230,118,0.2)]'
        };
      case 'gasto':
      default:
        return {
          title: 'Nuevo Gasto',
          placeholder: 'Ej. Supermercado',
          buttonText: 'Guardar gasto',
          categories: filteredCategories.length ? filteredCategories : ['Comida', 'Transporte', 'Salud', 'Servicios', 'Entretenimiento'],
          realTipo: 'gasto' as TipoTransaccion,
          glowClass: 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.2)] border-rose-500/20',
          focusClass: 'focus-visible:ring-rose-500/30 focus-visible:border-rose-500',
          textClass: 'text-rose-400',
          buttonClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_4px_15px_rgba(244,63,94,0.2)]'
        };
    }
  };

  const contextData = getContextValues(contexto);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || isNaN(Number(monto))) return;

    setLoading(true);
    try {
      const isSavingExpense = contexto === 'gasto' && gastoSubtipo === 'ahorro';
      const actualTipo = contexto === 'ingreso' 
        ? 'ingreso' 
        : (isSavingExpense ? 'ahorro' : 'gasto_real');

      let actualCategoria = categoria;
      let finalDescripcion = descripcion || categoria;

      if (isSavingExpense) {
        if (!selectedBolsilloId) {
          throw new Error("Por favor selecciona un bolsillo.");
        }
        actualCategoria = 'ahorro';
        const b = bolsillos.find(x => String(x.id) === String(selectedBolsilloId));
        if (b) {
          finalDescripcion = `Ahorro → ${b.nombre}`;
        }
      }

      const data = {
        tipo: actualTipo as TipoTransaccion,
        monto: Number(monto),
        categoria: actualCategoria,
        descripcion: finalDescripcion,
        fecha: movimiento ? fecha : new Date().toISOString()
      };

      if (movimiento) {
        // If old transaction was savings, subtract from old pocket
        if ((movimiento.tipo === 'gasto_ahorro' || movimiento.tipo === 'ahorro') && (movimiento.categoria.startsWith('bolsillo_') || movimiento.categoria === 'ahorro')) {
          let oldBId = '';
          if (movimiento.categoria === 'ahorro') {
            const name = movimiento.descripcion.replace('Ahorro → ', '');
            const bObj = bolsillos.find(x => x.nombre === name);
            if (bObj) oldBId = bObj.id.toString();
          } else {
            oldBId = movimiento.categoria.replace('bolsillo_', '');
          }
          if (oldBId) {
            const oldB = bolsillos.find(x => String(x.id) === String(oldBId));
            if (oldB) {
              await updateBolsillo(oldB.id, { saldo: Math.max(0, oldB.saldo - movimiento.monto) });
            }
          }
        }

        // If new transaction is savings, add to selected pocket
        if (isSavingExpense) {
          const newB = bolsillos.find(x => String(x.id) === String(selectedBolsilloId));
          if (newB) {
            await updateBolsillo(newB.id, { saldo: newB.saldo + data.monto });
          }
        }

        await updateMovimiento(movimiento.id, data);
      } else {
        // New transaction
        if (isSavingExpense) {
          const newB = bolsillos.find(x => String(x.id) === String(selectedBolsilloId));
          if (newB) {
            await updateBolsillo(newB.id, { saldo: newB.saldo + data.monto });
          }
        }
        await addMovimiento(data);
      }
      
      onClose();
    } catch (error: any) {
      console.error('------- Error in TransactionModal -------:', error);
      let errorMsg = error.message || error.details || JSON.stringify(error);
      alert('Error guardando movimiento: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      
      <div className={cn(
        "relative z-50 w-full max-w-lg rounded-t-3xl sm:rounded-[24px] bg-card/95 backdrop-blur-xl border p-6 sm:p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 transition-colors",
        contextData.glowClass
      )}>
        <button onClick={onClose} className="absolute right-6 top-6 text-muted-foreground/50 hover:text-foreground transition-colors p-2 hover:bg-white/5 rounded-full">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8">
          <h2 className={cn("text-2xl font-bold tracking-tight", contextData.textClass)}>
            {movimiento ? 'Editar Movimiento' : contextData.title}
          </h2>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Completa los detalles de este movimiento
          </p>
        </div>

         <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">Monto</label>
            <div className="relative group">
              <span className={cn("absolute left-4 top-1/2 -translate-y-1/2 font-medium transition-colors opacity-80", contextData.textClass)}>$</span>
              <Input 
                type="number" 
                step="0.01"
                required
                className={cn(
                  "pl-9 h-12 text-lg sm:text-xl font-semibold bg-black/20 hover:bg-black/30 border-white/10 rounded-xl transition-all",
                  contextData.focusClass
                )}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>

          {contexto === 'gasto' && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <label className="text-sm font-medium text-foreground/95 pb-1 block">Categoría de Gasto</label>
              <div className="grid grid-cols-2 gap-2 bg-black/25 p-1.5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setGastoSubtipo('real')}
                  className={cn(
                    "py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all border",
                    gastoSubtipo === 'real'
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-extrabold shadow-sm"
                      : "text-muted-foreground hover:text-foreground border-transparent bg-transparent"
                  )}
                >
                  Gasto Real
                </button>
                <button
                  type="button"
                  onClick={() => setGastoSubtipo('ahorro')}
                  className={cn(
                    "py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all border",
                    gastoSubtipo === 'ahorro'
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30 font-extrabold shadow-sm"
                      : "text-muted-foreground hover:text-foreground border-transparent bg-transparent"
                  )}
                >
                  Gasto Ahorro
                </button>
              </div>
            </div>
          )}

          {contexto === 'gasto' && gastoSubtipo === 'ahorro' ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-foreground/90">Bolsillo de Destino (Ahorro)</label>
              <div className="relative">
                <select 
                  className={cn(
                    "flex h-12 w-full rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 pl-4 pr-10 py-2 text-sm sm:text-[15px] focus-visible:outline-none focus-visible:ring-1 transition-all appearance-none cursor-pointer focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
                  )}
                  value={selectedBolsilloId}
                  onChange={(e) => setSelectedBolsilloId(e.target.value)}
                >
                  {bolsillos.length === 0 ? (
                    <option value="" disabled>No tienes bolsillos creados</option>
                  ) : (
                    bolsillos.map(b => (
                      <option key={b.id} value={b.id} className="bg-card text-foreground">
                        {b.nombre} (Saldo: ${b.saldo})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none opacity-80 text-blue-400" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/90">Categoría</label>
              <div className="relative">
                <select 
                  className={cn(
                    "flex h-12 w-full rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 pl-4 pr-10 py-2 text-sm sm:text-[15px] focus-visible:outline-none focus-visible:ring-1 transition-all appearance-none cursor-pointer",
                    contextData.focusClass
                  )}
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {contextData.categories.map(c => <option key={c} value={c} className="bg-card text-foreground">{c}</option>)}
                </select>
                <ChevronDown className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none opacity-80", contextData.textClass)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">Descripción</label>
            <Input 
              placeholder={contextData.placeholder}
              className={cn(
                "h-12 bg-black/20 hover:bg-black/30 border-white/10 rounded-xl px-4 text-sm sm:text-[15px] transition-all",
                contextData.focusClass
              )}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <Button 
            type="submit" 
            className={cn(
              "w-full h-12 text-[15px] font-semibold mt-6 rounded-[14px] transition-all transform hover:scale-[1.02] active:scale-[0.98]",
              contextData.buttonClass
            )} 
            disabled={loading}
          >
            {loading ? 'Guardando...' : contextData.buttonText}
          </Button>
        </form>
      </div>
    </div>
  );
}
