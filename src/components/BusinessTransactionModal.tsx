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
  const businessItems = JSON.parse(
  localStorage.getItem("products_services") || "[]"
);

const products = businessItems.filter(
  (i: any) => i.type === "product"
);

const services = businessItems.filter(
  (i: any) => i.type === "service"
);
  const [contexto, setContexto] = useState<ContextType>(initialTipo);
  const [saleType, setSaleType] =
useState<"product" | "service">("product");

  const [selectedBolsilloId, setSelectedBolsilloId] = useState<string>('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isFixed, setIsFixed] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (movimiento) {
      const isSaving = movimiento.tipo === 'gasto_ahorro' || movimiento.tipo === 'ahorro';
      setContexto(movimiento.tipo === 'ingreso' ? 'ingreso' : 'gasto');
      setSaleType("product");
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
      setSaleType("product");
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
      const isSavingExpense = false;
      const actualTipo = contexto === 'ingreso' 
        ? 'ingreso' 
        : (isSavingExpense ? 'ahorro' : 'gasto_real');

      let actualCategoria = categoria;
let finalDescripcion = descripcion;

// Si es una venta, la categoría debe indicar qué tipo de venta es
if (contexto === "ingreso") {
  actualCategoria =
    saleType === "product"
      ? "Venta de producto"
      : "Venta de servicio";
}

if (!finalDescripcion) {

  if (contexto === "ingreso") {

    if (saleType === "product") {

      const product = products.find(
        (p: any) => String(p.id) === String(selectedItemId)
      );

      finalDescripcion = product?.name || "Venta";

    } else {

      const service = services.find(
        (s: any) => String(s.id) === String(selectedItemId)
      );

      finalDescripcion = service?.name || "Servicio";

    }

  } else {

    finalDescripcion = categoria;

  }

}
      

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
  cantidad: contexto === "ingreso" ? quantity : undefined,
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
if (saleType === "product") {
  const updatedItems = businessItems.map((item: any) => {
    if (item.id === selectedItemId) {
      return {
        ...item,
        stock: item.stock - quantity,
      };
    }

    return item;
  });

  localStorage.setItem(
    "products_services",
    JSON.stringify(updatedItems)
  );
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
        
if (contexto === "ingreso" && saleType === "product") {

  const product = products.find(
    (p: any) => p.id === selectedItemId
  );

  if (!product) {
    alert("Producto no encontrado.");
    setLoading(false);
    return;
  }

  if (quantity > product.stock) {
    alert(
      `Solo hay ${product.stock} unidades disponibles.`
    );
    setLoading(false);
    return;
  }

  const updatedItems = businessItems.map((item: any) => {

    if (item.id === selectedItemId) {

      return {
        ...item,
        stock: item.stock - quantity,
      };

    }

    return item;

  });
  localStorage.setItem(
    "products_services",
    JSON.stringify(updatedItems)
  );

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
         {contexto === "ingreso" && ( 
            <>
          <div className="space-y-2">
  <label className="text-sm font-medium">
    Tipo de venta
  </label>

  <div className="grid grid-cols-2 gap-2">

    <Button
      type="button"
      variant={saleType === "product" ? "default" : "outline"}
      onClick={() => setSaleType("product")}
    >
      Producto
    </Button>

    <Button
      type="button"
      variant={saleType === "service" ? "default" : "outline"}
      onClick={() => setSaleType("service")}
    >
      Servicio
    </Button>

  </div>
</div>
<div className="space-y-2">
  <label className="text-sm font-medium">
    {saleType === "product" ? "Producto" : "Servicio"}
  </label>

  <select
  value={selectedItemId}
  onChange={(e) => setSelectedItemId(e.target.value)}
  className="..."
>
  <option value="">
    Selecciona una opción
  </option>

  {(saleType === "product" ? products : services).map((item: any) => (
    <option key={item.id} value={item.id}>
      {item.name}
    </option>
  ))}
</select>
{saleType === "product" && selectedItemId && (
  <p className="text-sm text-muted-foreground mt-2">
    Stock disponible: {
      products.find((p: any) => p.id === selectedItemId)?.stock ?? 0
    }
  </p>
)}
{saleType === "product" && (
  <div className="space-y-2 mt-4">
    <label>Cantidad</label>

    <Input
      type="number"
      min="1"
      value={quantity}
      onChange={(e) => setQuantity(Number(e.target.value))}
    />
  </div>
)}
</div>
</>
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
