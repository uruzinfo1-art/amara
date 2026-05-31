import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Plus, Trash2, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface BulkFixedExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExpenseRow {
  descripcion: string;
  monto: string;
  day_of_month: string;
  category: string;
  isNew?: boolean;
}

export function BulkFixedExpensesModal({ isOpen, onClose }: BulkFixedExpensesModalProps) {
  const { categorias, addFixedExpenses, addMovimiento } = useFinance();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get available expense categories
  const expenseCategories = React.useMemo(() => {
    const list = categorias
      .filter(c => !c.type || c.type === 'expense')
      .map(c => c.nombre);
    return list.length > 0 ? list : ['Servicios', 'Entretenimiento', 'Comida', 'Transporte', 'Salud'];
  }, [categorias]);

  // Reset or initialize rows on open
  useEffect(() => {
    if (isOpen) {
      setRows([
        { descripcion: '', monto: '', day_of_month: '', category: 'Servicios', isNew: true }
      ]);
      setSuccessCount(null);
      setValidationErrors([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      { descripcion: '', monto: '', day_of_month: '', category: 'Servicios', isNew: true }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      // Just clear it instead of removing completely, to keep at least one row
      setRows([
        { descripcion: '', monto: '', day_of_month: '', category: 'Servicios', isNew: true }
      ]);
    } else {
      setRows(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpdateField = (index: number, field: keyof ExpenseRow, value: string) => {
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleSaveAll = async () => {
    setValidationErrors([]);
    const errors: string[] = [];

    // Validations
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const desc = row.descripcion.trim();
      const val = parseFloat(row.monto);
      const day = parseInt(row.day_of_month);

      if (!desc) {
        errors.push(`Fila ${rowNum}: El nombre es obligatorio.`);
      }
      if (isNaN(val) || val <= 0) {
        errors.push(`Fila ${rowNum}: El valor debe ser mayor a 0.`);
      }
      if (isNaN(day) || day < 1 || day > 31) {
        errors.push(`Fila ${rowNum}: El "Día de pago" debe ser un número entre 1 y 31.`);
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      // 1. Build sanitized configuration rows
      const sanitizedConfigs = rows.map(r => ({
        descripcion: r.descripcion.trim(),
        category: r.category,
        frequency: 'monthly',
        day_of_month: parseInt(r.day_of_month) || 1,
        active: true,
        monto: parseFloat(r.monto)
      }));

      await addFixedExpenses(sanitizedConfigs);

      // 2. Build and save matching config movements in "movimientos" to store the setup amount without affecting dashboard/disponible/gastos (since isExpenseConfig(m) = true)
      for (const r of rows) {
        await addMovimiento({
          tipo: 'gasto',
          monto: parseFloat(r.monto),
          categoria: r.category,
          descripcion: r.descripcion.trim(),
          fecha: new Date().toISOString(),
          is_fixed: true,
          day_of_month: parseInt(r.day_of_month) || 1,
          frequency: 'monthly',
          active: true
        });
      }

      setSuccessCount(rows.length);
      localStorage.removeItem('amara_open_fixed_expenses_onboarding');
    } catch (err: any) {
      console.error(err);
      setValidationErrors([`Ocurrió un error al guardar: ${err.message || 'Error desconocido'}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="bulk-fixed-expenses-modal" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-[28px] bg-card/95 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
        
        {/* Ambient brand glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C2185B]/5 rounded-full blur-[90px] -ml-20 -mb-20 pointer-events-none" />
        
        <header className="relative z-10 flex shrink-0 justify-between items-center mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="text-primary text-xl">🔁</span> CARGA MÚLTIPLE: GASTOS FIJOS
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground/80 mt-1">
              Configura tus gastos recurrentes mensuales en una sola acción.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-2 hover:bg-white/5 rounded-full"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {successCount !== null ? (
          /* SUCCESS SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300 relative z-10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,230,118,0.2)]">
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">¡Guardado Exitoso!</h3>
              <p className="text-sm text-primary font-black tracking-wide mt-1 uppercase">
                {successCount} {successCount === 1 ? 'gasto fijo creado correctamente' : 'gastos fijos creados correctamente'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 max-w-sm mx-auto">
                Los nuevos gastos fijos han sido agregados a tu lista. Visita tu panel de "Gastos Fijos" para seguir su estado de pago.
              </p>
            </div>
            <Button 
              onClick={onClose} 
              className="bg-primary hover:bg-primary/95 text-black font-bold rounded-xl px-10 h-11 shadow-lg shadow-primary/10 mt-4 cursor-pointer"
            >
              Entendido
            </Button>
          </div>
        ) : (
          /* EDITABLE TABLE FORM */
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            
            {/* Onboarding Welcome Message */}
            {localStorage.getItem('amara_open_fixed_expenses_onboarding') === 'true' && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 shadow-[0_4px_20px_rgba(16,185,129,0.05)] animate-in fade-in slide-in-from-top-4 duration-300">
                <span className="text-xl shrink-0">✨</span>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Configura tus gastos fijos para comenzar con AMARA.</h4>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                    Modifica o agrega tus pagos recurrentes (como arriendo, internet o suscripciones) para automatizar tu control de caja.
                  </p>
                </div>
              </div>
            )}
            
            {/* Validation messages */}
            {validationErrors.length > 0 && (
              <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5 overflow-y-auto max-h-28 custom-scrollbar">
                <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Por favor, corrige los siguientes errores:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-rose-300/90 pl-1 font-mono leading-normal">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Container */}
            <div className="flex-1 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-2 sm:p-4 mb-4 custom-scrollbar">
              <div className="min-w-full inline-block align-middle">
                
                {/* Desktop/Tablet Table layout */}
                <table className="min-w-full divide-y divide-white/5 hidden sm:table">
                  <thead>
                    <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="pb-3.5 pl-2">Gasto Fijo (Nombre / Descripción)</th>
                      <th className="pb-3.5 px-4 w-44">Categoría</th>
                      <th className="pb-3.5 px-4 w-44">Valor</th>
                      <th className="pb-3.5 px-4 w-32">Día de Pago</th>
                      <th className="pb-3.5 pr-2 w-16 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((row, index) => (
                      <tr key={index} className="group hover:bg-white/[0.01] transition-colors">
                        <td className="py-2.5 pl-2 pr-4">
                          <Input
                            placeholder="Ej. Netflix, Gimnasio, Luz, Internet"
                            className="bg-black/20 hover:bg-black/30 border-white/5 font-semibold text-sm rounded-xl focus-visible:ring-primary/20 h-10 w-full placeholder:text-muted-foreground/30 placeholder:font-normal"
                            value={row.descripcion}
                            onChange={(e) => handleUpdateField(index, 'descripcion', e.target.value)}
                            required
                            autoFocus={row.isNew && index === rows.length - 1}
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            className="flex h-10 w-full rounded-xl border border-white/5 bg-black/20 select-box hover:bg-black/30 px-3 text-xs font-semibold focus-visible:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                            value={row.category}
                            onChange={(e) => handleUpdateField(index, 'category', e.target.value)}
                          >
                            {expenseCategories.map(catName => (
                              <option key={catName} value={catName} className="bg-card text-foreground">{catName}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-xs font-bold font-mono">$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="pl-7 bg-black/20 hover:bg-black/30 border-white/5 font-bold font-mono text-sm rounded-xl focus-visible:ring-primary/20 h-10 w-full placeholder:text-muted-foreground/20 placeholder:font-normal"
                              value={row.monto}
                              onChange={(e) => handleUpdateField(index, 'monto', e.target.value)}
                              required
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            className="flex h-10 w-full rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 px-3 font-semibold font-mono text-xs focus-visible:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                            value={row.day_of_month}
                            onChange={(e) => handleUpdateField(index, 'day_of_month', e.target.value)}
                          >
                            <option value="" disabled className="bg-card text-muted-foreground/50">Día</option>
                            {Array.from({ length: 31 }, (_, idx) => idx + 1).map(day => (
                              <option key={day} value={day} className="bg-card text-foreground">{day}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 pr-2 w-16 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-2 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors font-semibold cursor-pointer shrink-0"
                            title="Eliminar fila"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile list editor layout (shown instead of table in viewport <= sm) */}
                <div className="sm:hidden space-y-4">
                  {rows.map((row, index) => (
                    <div key={index} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 relative group">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary uppercase">Gasto #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="p-1 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Quitar</span>
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Nombre / Descripción</label>
                        <Input
                          placeholder="Ej. Netflix, Luz"
                          className="bg-black/20 hover:bg-black/30 border-white/5 font-semibold text-xs rounded-xl focus-visible:ring-primary/20 h-10 w-full"
                          value={row.descripcion}
                          onChange={(e) => handleUpdateField(index, 'descripcion', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Categoría</label>
                          <select
                            className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs font-semibold"
                            value={row.category}
                            onChange={(e) => handleUpdateField(index, 'category', e.target.value)}
                          >
                            {expenseCategories.map(catName => (
                              <option key={catName} value={catName} className="bg-card text-foreground">{catName}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Día Pago</label>
                          <select
                            className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs font-semibold font-mono"
                            value={row.day_of_month}
                            onChange={(e) => handleUpdateField(index, 'day_of_month', e.target.value)}
                          >
                            <option value="">Día</option>
                            {Array.from({ length: 31 }, (_, idx) => idx + 1).map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Valor Gasto</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-xs font-bold font-mono">$</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-7 bg-black/20 hover:bg-black/30 border-white/5 font-bold font-mono text-xs rounded-xl focus-visible:ring-primary/20 h-10 w-full"
                            value={row.monto}
                            onChange={(e) => handleUpdateField(index, 'monto', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 border-t border-white/5 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddRow}
                className="w-full sm:w-auto bg-transparent hover:bg-white/5 border-white/10 rounded-xl px-5 h-11 text-xs font-bold flex items-center justify-center gap-1.5 text-primary hover:text-primary-foreground select-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar fila</span>
              </Button>

              <div className="flex w-full sm:w-auto gap-3">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial border border-transparent hover:bg-white/5 hover:border-white/5 text-muted-foreground hover:text-white rounded-xl px-6 h-11 text-xs font-bold cursor-pointer"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAll}
                  className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-black font-extrabold rounded-xl px-8 h-11 text-xs tracking-wider uppercase shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Todos'}
                </Button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
