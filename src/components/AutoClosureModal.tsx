import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { formatCurrency } from '../lib/utils';
import { Sprout, Coins, Trash2, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { getCategoryIcon } from '../lib/categoryUtils';

interface AutoClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  disponiblePrev: number;
  currentMonth: string;
}

export function AutoClosureModal({ isOpen, onClose, disponiblePrev, currentMonth }: AutoClosureModalProps) {
  const { 
    bolsillos, 
    addBolsillo, 
    updateBolsillo, 
    addMovimiento, 
    updateSettings, 
    settings, 
    addMonthlyCycle 
  } = useFinance();
  
  const [selectedOption, setSelectedOption] = useState<'save' | 'keep' | 'discard' | null>(null);
  const [errorStr, setErrorStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pocket Selection and Creation Flow States
  const [selectedPocket, setSelectedPocket] = useState<string | number | null>(null);
  const [newPocketName, setNewPocketName] = useState('');
  const [newPocketIcon, setNewPocketIcon] = useState('Sprout');
  const [newPocketColor, setNewPocketColor] = useState('#10b981');
  const [showNewForm, setShowNewForm] = useState(false);

  // Initialize selectedPocket when bolsillos loads or changes
  React.useEffect(() => {
    if (bolsillos && bolsillos.length > 0) {
      // Only set if we haven't selected anything yet, or if the selected one is no longer in the list
      const stillExists = bolsillos.some(b => b.id === selectedPocket);
      if (!selectedPocket || !stillExists) {
        // Find "Bolsillo AMARA" or first pocket
        const amara = bolsillos.find(b => b.nombre.trim().toLowerCase() === 'bolsillo amara');
        if (amara) {
          setSelectedPocket(amara.id);
        } else {
          setSelectedPocket(bolsillos[0].id);
        }
      }
    } else {
      setSelectedPocket(null);
    }
  }, [bolsillos, selectedPocket]);

  const handleCreatePocket = async () => {
    if (!newPocketName.trim()) return;
    try {
      const created = await addBolsillo({
        nombre: newPocketName.trim(),
        tipo: 'ahorro',
        saldo: 0,
        meta: 0,
        icono: newPocketIcon,
        color: newPocketColor,
        active: true
      });
      if (created) {
        setSelectedPocket(created.id);
      }
      setShowNewForm(false);
      setNewPocketName('');
    } catch (err: any) {
      console.error(err);
      setErrorStr('Error al crear el bolsillo: ' + (err.message || ''));
    }
  };

  if (!isOpen) return null;

  const getSpanishFinishedMonthName = (currentMonthKey: string) => {
    if (!currentMonthKey) return '';
    const parts = currentMonthKey.split('-');
    if (parts.length < 2) return currentMonthKey;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    
    // We want the previous month which just finished
    let finishedMonth = month - 1;
    let finishedYear = year;
    if (finishedMonth === 0) {
      finishedMonth = 12;
      finishedYear = year - 1;
    }
    
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${months[finishedMonth - 1]} ${finishedYear}`;
  };

  const handleConfirm = async () => {
    if (!selectedOption) return;
    setErrorStr('');
    setIsSubmitting(true);

    try {
      if (selectedOption === 'save') {
        if (!selectedPocket) {
          throw new Error("Por favor selecciona o crea un bolsillo para depositar el ahorro.");
        }

        const activePocket = (bolsillos || []).find(b => b.id === selectedPocket);
        if (!activePocket) {
          throw new Error("El bolsillo de destino seleccionado ya no existe.");
        }

        await updateBolsillo(activePocket.id, {
          saldo: Number(activePocket.saldo) + disponiblePrev
        });

        // Create transaction with date at end of previous month
        const lastDayOfClosedMonth = new Date(currentMonth + '-01');
        lastDayOfClosedMonth.setDate(0);
        lastDayOfClosedMonth.setHours(23, 59, 59, 999);

        await addMovimiento({
          tipo: 'ahorro',
          monto: disponiblePrev,
          categoria: `bolsillo_${activePocket.id}`,
          fecha: lastDayOfClosedMonth.toISOString(),
          descripcion: `Ahorro automático → ${activePocket.nombre}`
        });

        await addMonthlyCycle({
          month_key: currentMonth,
          remaining_balance: disponiblePrev,
          action_taken: 'save_to_pocket'
        });

        await updateSettings({
          remanente_mes_anterior: 0
        });

        onClose();
      } else if (selectedOption === 'keep') {
        await addMonthlyCycle({
          month_key: currentMonth,
          remaining_balance: disponiblePrev,
          action_taken: 'carry_over'
        });

        await updateSettings({
          remanente_mes_anterior: disponiblePrev
        });

        onClose();
      } else if (selectedOption === 'discard') {
        await addMonthlyCycle({
          month_key: currentMonth,
          remaining_balance: disponiblePrev,
          action_taken: 'ignore'
        });

        await updateSettings({
          remanente_mes_anterior: 0
        });

        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorStr(err.message || 'Ocurrió un error al procesar el cierre mensual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedMonth = getSpanishFinishedMonthName(currentMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-[0_12px_45px_rgba(0,0,0,0.08)] border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden rounded-[28px] text-slate-800">
        
        {/* Glow styling for standard premium elegance */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 dark:bg-[#00B050]/10 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-[#00B050]/20 text-[#00B050] dark:text-[#00e676] border border-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold !text-black leading-tight">
      Cierre de Período
   </h2>

   <p className="text-xs text-slate-600">
      Automatización de saldo de cierre
   </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6 relative z-10 max-h-[80vh] overflow-y-auto">
          {errorStr && (
            <div className="p-3 text-sm text-rose-600 dark:text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorStr}</span>
            </div>
          )}

          <div className="text-center py-2">
            <h3 className="text-lg font-bold !text-black">
              Terminó {formattedMonth} 🌱
            </h3>
            <p className="text-sm text-slate-700 mt-1">
              Aquí tienes el resumen final y las opciones de cierre de este ciclo.
            </p>
          </div>

          {/* Balance Display Card with high contrast */}
          <div className="p-5 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/90 dark:border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 uppercase font-bold tracking-wider">Disponible Restante del Mes</p>
              <h3 className="text-2xl sm:text-3.5xl font-extrabold !text-emerald-600 mt-1">
                {formatCurrency(disponiblePrev, settings.currency)}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
              <Coins className="w-6 h-6 text-[#00B050] dark:text-[#00e676]" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">¿Qué deseas hacer?</p>

            <div className="grid gap-3">
              {/* Option 1: Guardar en bolsillo */}
              <div
                onClick={() => {
                  if (selectedOption !== 'save') {
                    setSelectedOption('save');
                  }
                }}
                className={`flex flex-col gap-4 p-4 rounded-3xl text-left border cursor-pointer transition-all duration-300 ${
                  selectedOption === 'save' 
                    ? 'bg-emerald-50/60 border-emerald-400 text-black'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/80 dark:bg-[#121214]/60 dark:border-white/5 dark:hover:border-white/10 dark:hover:bg-[#121214]/90'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    selectedOption === 'save' 
                      ? 'bg-emerald-500/20 text-[#00B050] dark:text-[#00e676]' 
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-650 dark:text-neutral-400'
                  }`}>
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-lg font-bold !text-black mb-1">
                      1. Guardar en bolsillo
                    </h4>
                    <p className="text-sm text-slate-705">
                      Crear un movimiento de ahorro automático del restante de {formattedMonth}.
                    </p>
                  </div>
                </div>

                {/* Pocket Selector and Creation Sub-flow */}
                {selectedOption === 'save' && (
                  <div className="border-t border-emerald-200/50 pt-3 mt-1 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destino del ahorro</p>
                    
                    {(!bolsillos || bolsillos.length === 0) ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <p className="text-sm text-slate-500 font-medium">No tienes bolsillos creados</p>
                        {!showNewForm && (
                          <button
                            type="button"
                            onClick={() => setShowNewForm(true)}
                            className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                          >
                            Crear primer bolsillo
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {bolsillos.map((pocket) => {
                          const isSelected = selectedPocket === pocket.id;
                          const PocketIcon = getCategoryIcon(pocket.icono);
                          return (
                            <button
                              key={pocket.id}
                              type="button"
                              onClick={() => setSelectedPocket(pocket.id)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'bg-white border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500/30' 
                                  : 'bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700'
                              }`}
                            >
                              <div 
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ 
                                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : (pocket.color ? `${pocket.color}15` : 'rgba(16, 185, 129, 0.15)'), 
                                  color: pocket.color || '#00B050' 
                                }}
                              >
                                <PocketIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate leading-tight text-slate-800">{pocket.nombre}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{formatCurrency(pocket.saldo, settings?.currency)}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!showNewForm && bolsillos && bolsillos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewForm(true)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        + Crear nuevo bolsillo
                      </button>
                    )}

                    {showNewForm && (
                      <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 text-slate-800 space-y-3 shadow-xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                          <h5 className="text-xs font-bold text-slate-900">Crear bolsillo nuevo</h5>
                        </div>
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre</label>
                            <input
                              type="text"
                              value={newPocketName}
                              onChange={(e) => setNewPocketName(e.target.value)}
                              placeholder="Ej: Viaje ✈️"
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Sugerencias rápidas</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { label: 'Bolsillo AMARA', iconName: 'Sprout', emoji: '🌿', color: '#10b981' },
                                { label: 'Viaje ✈️', iconName: 'Plane', emoji: '✈️', color: '#3b82f6' },
                                { label: 'Emergencia 🚨', iconName: 'HeartPulse', emoji: '🚨', color: '#f43f5e' },
                                { label: 'Ahorro 🪙', iconName: 'PiggyBank', emoji: '🪙', color: '#eab308' },
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setNewPocketName(preset.label);
                                    setNewPocketIcon(preset.iconName);
                                    setNewPocketColor(preset.color);
                                  }}
                                  className="text-left text-[11px] p-1.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 transition-colors flex items-center gap-1.5 text-slate-750 cursor-pointer"
                                >
                                  <span>{preset.emoji}</span>
                                  <span className="truncate">{preset.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-1.5 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewForm(false);
                                setNewPocketName('');
                              }}
                              className="text-[10px] font-bold text-slate-550 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleCreatePocket}
                              disabled={!newPocketName.trim()}
                              className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              Crear
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Option 2: Pasar al siguiente mes */}
              <button
                type="button"
                onClick={() => setSelectedOption('keep')}
                className={`flex items-start gap-4 p-4 rounded-3xl text-left border cursor-pointer transition-all duration-300 ${
                  selectedOption === 'keep' 
                    ? 'bg-[#E8F8F0] text-emerald-800 dark:text-emerald-350 border-emerald-500/40 dark:bg-[#00e676]/10 dark:border-emerald-500/30' 
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/80 dark:bg-[#121214]/60 dark:border-white/5 dark:hover:border-white/10 dark:hover:bg-[#121214]/90'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${
                  selectedOption === 'keep' 
                    ? 'bg-emerald-500/20 text-[#00B050]' 
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-650 dark:text-neutral-400'
                }`}>
                  <Coins className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold !text-black mb-2">
                   2. Pasar al siguiente mes
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    Mantener saldo disponible líquido para el nuevo ciclo como disponible inicial.
                  </p>
                </div>
              </button>

              {/* Option 3: Ignorar */}
              <button
                type="button"
                onClick={() => setSelectedOption('discard')}
                className={`flex items-start gap-4 p-4 rounded-3xl text-left border cursor-pointer transition-all duration-300 ${
                  selectedOption === 'discard' 
                    ? 'bg-rose-50 text-rose-800 dark:text-[#f87171] border-rose-500/50 dark:bg-rose-550/10 dark:border-rose-500/30' 
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/80 dark:bg-[#121214]/60 dark:border-white/5 dark:hover:border-white/10 dark:hover:bg-[#121214]/90'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${
                  selectedOption === 'discard' 
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' 
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-650 dark:text-neutral-400'
                }`}>
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold !text-black mb-2"> 3. Reiniciar desde cero </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    Reiniciar el saldo disponible a cero para comenzar el nuevo mes completamente desde limpio.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedOption}
            className="w-full h-12 text-sm font-semibold rounded-3xl mt-4 bg-[#00B050] hover:bg-[#009b46] text-white cursor-pointer active:scale-95 transition-all duration-150 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Procesando Cierre...' : (
              <>
                Confirmar de Forma Segura
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
