import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DEFAULT_CATEGORIES, AVAILABLE_ICONS, AVAILABLE_COLORS, getCategoryIcon, getCategoryStyle } from '../lib/categoryUtils';
import { Plus, Edit2, Trash2, X, Check, ChevronDown } from 'lucide-react';
import { CategoriaPersonalizada } from '../types';

export function Categories() {
  const { categorias, addCategoria, updateCategoria, deleteCategoria } = useFinance();
  
  const [isEditing, setIsEditing] = useState<string | number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<CategoriaPersonalizada>>({});

  const allCategories = categorias;

  const handleCreate = () => {
    setFormData({ nombre: '', icono: AVAILABLE_ICONS[0], color: AVAILABLE_COLORS[0].hex, type: 'expense' });
    setIsCreating(true);
    setIsEditing(null);
    setErrorMsg(null);
  };

  const handleEdit = (cat: CategoriaPersonalizada) => {
    setFormData(cat);
    setIsEditing(cat.id);
    setIsCreating(false);
    setErrorMsg(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(null);
    setFormData({});
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (!formData.nombre?.trim()) {
      setErrorMsg("El nombre de la categoría es obligatorio");
      return;
    }
    if (!formData.type) {
      setErrorMsg("El tipo de categoría es obligatorio");
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        await addCategoria(formData as Omit<CategoriaPersonalizada, "id" | "created_at">);
      } else if (isEditing) {
        await updateCategoria(isEditing, formData);
      }
      handleCancel();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Ocurrió un error al guardar la categoría");
    } finally {
      setIsSaving(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoriaPersonalizada | null>(null);

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteCategoria(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Ocurrió un error al eliminar la categoría");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (cat: CategoriaPersonalizada) => {
    if (cat.is_default) {
      setErrorMsg("Las categorías base no pueden eliminarse");
      return;
    }
    setCategoryToDelete(cat);
  };


  return (
    <div className="space-y-6 pb-20 md:pb-0 h-full max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona y personaliza tus categorías de ingresos y gastos.</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating || isEditing !== null}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva
        </Button>
      </header>

      {(isCreating || isEditing !== null) && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle>{isCreating ? 'Nueva Categoría' : 'Editar Categoría'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input 
                  value={formData.nombre || ''} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Compras Online" 
                  className="bg-black/20 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <div className="relative">
                  <select 
                    className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 pl-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary appearance-none cursor-pointer"
                    value={formData.type || 'expense'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="expense" className="bg-card">Gasto</option>
                    <option value="income" className="bg-card">Ingreso</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
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

            {errorMsg && (
              <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-500">
                {errorMsg}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!formData.nombre?.trim() || isSaving}>
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  'Guardar Categoría'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {['expense', 'income'].map((tipo) => {
        const typeCategories = allCategories.filter(c => (!c.type && tipo === 'expense') || c.type === tipo);
        if (typeCategories.length === 0) return null;

        const title = tipo === 'expense' ? 'Gastos' : 'Ingresos';

        return (
          <div key={tipo} className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground/80 border-b border-white/5 pb-2">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {typeCategories.map((cat, idx) => {
                const isDefault = cat.is_default || (typeof cat.id === 'string' && cat.id.startsWith('cat-'));
                const style = getCategoryStyle(cat.nombre, categorias);
                const Icon = style.icon;
                return (
                  <Card key={`${cat.id}-${idx}`} className="group overflow-hidden bg-card/60 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bgClass} ${style.colorClass} border border-white/5 shadow-inner`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[15px]">{cat.nombre} {isDefault && <span className="ml-2 text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">Base</span>}</h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-primary bg-white/5 hover:bg-white/10 rounded-lg" onClick={() => handleEdit(cat)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!isDefault && (
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-rose-500 bg-white/5 hover:bg-rose-500/20 rounded-lg" onClick={() => handleDelete(cat)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setCategoryToDelete(null)} />
          <div className="relative bg-card border border-white/10 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">¿Eliminar categoría?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Está a un paso de eliminar la categoría <span className="font-semibold text-foreground">"{categoryToDelete.nombre}"</span>. Los movimientos asociados conservarán el nombre, pero podrían perder el color.
              </p>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setCategoryToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="outline"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Eliminando...
                    </div>
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
