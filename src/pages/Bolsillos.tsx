import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AVAILABLE_ICONS, AVAILABLE_COLORS, getCategoryIcon } from '../lib/categoryUtils';
import { Plus, Edit2, Trash2, Check, Target, TrendingUp, PiggyBank, ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react';
import { Bolsillo } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { TransferBolsilloModal } from '../components/TransferBolsilloModal';
import { HistorialBolsilloModal } from '../components/HistorialBolsilloModal';

export function Bolsillos() {
  const { bolsillos, addBolsillo, updateBolsillo, deleteBolsillo, settings } = useFinance();
  
  const [isEditing, setIsEditing] = useState<string | number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Bolsillo>>({});
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; bolsilloId: string | number | null; isLoading: boolean}>({ isOpen: false, bolsilloId: null, isLoading: false});

  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; tipo: 'deposito' | 'retiro'; bolsillo: Bolsillo | null }>({ isOpen: false, tipo: 'deposito', bolsillo: null });
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; bolsillo: Bolsillo | null }>({ isOpen: false, bolsillo: null });


  const handleCreate = () => {
    setFormData({ nombre: '', tipo: 'ahorro', saldo: 0, meta: 0, fecha_objetivo: '', icono: AVAILABLE_ICONS[0], color: AVAILABLE_COLORS[0].hex });
    setIsCreating(true);
    setIsEditing(null);
  };

  const handleEdit = (bol: Bolsillo) => {
    setFormData(bol);
    setIsEditing(bol.id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.nombre?.trim() || formData.meta === undefined || formData.saldo === undefined) return;

    try {
      const pocketData = {
        nombre: formData.nombre,
        tipo: formData.tipo || 'ahorro',
        saldo: Number(formData.saldo),
        meta: Number(formData.meta),
        fecha_objetivo: formData.fecha_objetivo || null,
        icono: formData.icono || AVAILABLE_ICONS[0],
        color: formData.color || AVAILABLE_COLORS[0].hex,
      };

      if (isCreating) {
        await addBolsillo(pocketData);
      } else if (isEditing) {
        await updateBolsillo(isEditing, pocketData);
      }
      handleCancel();
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al guardar el ahorro");
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.bolsilloId) return;
    
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    try {
      await deleteBolsillo(deleteModal.bolsilloId);
      setDeleteModal({ isOpen: false, bolsilloId: null, isLoading: false });
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al eliminar el ahorro");
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteClick = (id: string | number) => {
    setDeleteModal({ isOpen: true, bolsilloId: id, isLoading: false });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 h-full max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ahorros</h1>
          <p className="text-muted-foreground mt-1 text-sm">Ahorra para tus metas con apartados personalizados.</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating || isEditing !== null}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ahorro
        </Button>
      </header>

      {(isCreating || isEditing !== null) && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle>{isCreating ? 'Nuevo Ahorro' : 'Editar Ahorro'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de la meta</label>
                <Input 
                  value={formData.nombre || ''} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Viaje a Japón" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={formData.tipo || 'ahorro'}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="ahorro">Ahorro</option>
                  <option value="inversion">Inversión</option>
                  <option value="meta">Meta</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Objetivo (Opcional)</label>
                <Input 
                  type="date"
                  value={formData.fecha_objetivo || ''} 
                  onChange={(e) => setFormData({ ...formData, fecha_objetivo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Meta de ahorro (Opcional)</label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.meta || ''} 
                  onChange={(e) => setFormData({ ...formData, meta: parseFloat(e.target.value) || 0 })}
                  placeholder="Sin meta definida" 
                />
              </div>
              {/*
                  <div className="space-y-2">
                <label className="text-sm font-medium">Saldo actual</label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.saldo !== undefined ? formData.saldo : ''} 
                  onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00" 
                />
              </div>
              */}
            </div>
            
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium">Seleccionar Icono</label>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 max-h-56 overflow-y-auto p-3 border rounded-xl bg-muted/10 custom-scrollbar">
                {AVAILABLE_ICONS.map(iconName => {
                  const Icon = getCategoryIcon(iconName);
                  const isSelected = formData.icono === iconName;
                  return (
                    <button
                      key={iconName}
                      onClick={() => setFormData({ ...formData, icono: iconName })}
                      className={`p-3 flex items-center justify-center rounded-xl transition-all duration-200 aspect-square ${isSelected ? 'bg-primary text-primary-foreground shadow-md scale-105 ring-2 ring-primary/30' : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground'}`}
                      type="button"
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLORS.map(color => {
                  const isSelected = formData.color === color.hex;
                  return (
                    <button
                      key={color.hex}
                      onClick={() => setFormData({ ...formData, color: color.hex })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isSelected ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color.hex }}
                      type="button"
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!formData.nombre?.trim()}>Guardar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bolsillos.length === 0 && !isCreating && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/10">
          <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground">No tienes ahorros aún</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm max-w-sm mx-auto">Crea tu primer ahorro para comenzar a guardar para tus metas.</p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Crear Ahorro
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bolsillos.map((bol) => {
          const Icon = getCategoryIcon(bol.icono);
          const colorObj = AVAILABLE_COLORS.find(c => c.hex === bol.color) || AVAILABLE_COLORS[0];
          const porcentaje = bol.meta > 0 ? Math.min(100, Math.round((bol.saldo / bol.meta) * 100)) : 0;
          
          return (
            <Card key={bol.id} className="group overflow-hidden transition-all duration-300 border border-white/5 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_0_20px_rgba(0,230,118,0.05)]">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorObj.bg} ${colorObj.class}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{bol.nombre}</h3>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{bol.tipo || 'ahorro'}</span>
                      {bol.fecha_objetivo && (
                        <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                          <Target className="w-3 h-3 mr-1" />
                          {format(new Date(bol.fecha_objetivo), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-8 h-8 h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(bol)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-rose-500" onClick={() => handleDeleteClick(bol.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold tracking-tight">
                        {formatCurrency(bol.saldo, settings.currency)}
                      </div>
                      {bol.meta > 0 ? (
                        <div className="text-sm text-muted-foreground">
                          de {formatCurrency(bol.meta, settings.currency)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Saldo ahorrado
                        </div>
                      )}
                    </div>
                    {bol.meta > 0 && (
                      <div className={cn("text-lg font-semibold flex items-center", bol.saldo >= bol.meta ? "text-emerald-500" : colorObj.class)}>
                        {porcentaje}%
                      </div>
                    )}
                  </div>

                  {bol.meta > 0 && (
                    <>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${porcentaje}%`,
                            backgroundColor: bol.saldo >= bol.meta ? '#10b981' : bol.color 
                          }}
                        />
                      </div>
                      
                      {bol.saldo >= bol.meta && (
                        <p className="text-xs text-emerald-500 font-medium flex items-center justify-center mt-2 pt-1">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          ¡Meta alcanzada!
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs hover:bg-emerald-500/10 hover:text-emerald-500"
                    onClick={() => setTransferModal({ isOpen: true, tipo: 'deposito', bolsillo: bol })}
                  >
                    <ArrowDownCircle className="w-4 h-4 mr-1" /> Depositar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs hover:bg-blue-500/10 hover:text-blue-500"
                    onClick={() => setTransferModal({ isOpen: true, tipo: 'retiro', bolsillo: bol })}
                    disabled={bol.saldo <= 0}
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-1" /> Retirar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs hover:bg-primary/10 hover:text-primary"
                    onClick={() => setHistoryModal({ isOpen: true, bolsillo: bol })}
                  >
                    <History className="w-4 h-4 mr-1" /> Historial
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {transferModal.bolsillo && (
        <TransferBolsilloModal
          isOpen={transferModal.isOpen}
          onClose={() => setTransferModal({ ...transferModal, isOpen: false })}
          tipo={transferModal.tipo}
          bolsillo={transferModal.bolsillo}
        />
      )}

      {historyModal.bolsillo && (
        <HistorialBolsilloModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
          bolsillo={historyModal.bolsillo}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => !deleteModal.isLoading && setDeleteModal({ isOpen: false, bolsilloId: null, isLoading: false })}></div>
          
          <div className="relative w-full max-w-[380px] bg-gradient-to-b from-card/95 to-background border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Glow decorativo */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none"></div>

            <div className="relative z-10 p-8">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mb-6 mx-auto">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              
              <h3 className="text-xl font-bold tracking-tight text-foreground text-center mb-2">¿Eliminar ahorro?</h3>
              <p className="text-muted-foreground text-sm text-center mb-8">
                Esta acción eliminará esta meta organizativa. Tus ingresos, gastos y saldo disponible no se verán afectados.
              </p>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-12 border-white/10 hover:bg-white/5 disabled:opacity-50"
                  onClick={() => setDeleteModal({ isOpen: false, bolsilloId: null, isLoading: false })}
                  disabled={deleteModal.isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 rounded-xl h-12 bg-rose-500 hover:bg-rose-600 disabled:opacity-50"
                  onClick={confirmDelete}
                  disabled={deleteModal.isLoading}
                >
                  {deleteModal.isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Eliminar'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
