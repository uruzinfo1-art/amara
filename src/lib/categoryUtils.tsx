import React from 'react';
import * as Icons from 'lucide-react';
import { CategoriaPersonalizada } from '../types';

export const DEFAULT_CATEGORIES: CategoriaPersonalizada[] = [
  // Gastos
  {
    id: 'cat-g-1',
    nombre: 'Comida',
    icono: 'Utensils',
    color: '#f97316',
    type: 'expense',
    is_default: true
  },
  {
    id: 'cat-g-2',
    nombre: 'Transporte',
    icono: 'Car',
    color: '#3b82f6',
    type: 'expense',
    is_default: true
  },
  {
    id: 'cat-g-3',
    nombre: 'Salud',
    icono: 'HeartPulse',
    color: '#f43f5e',
    type: 'expense',
    is_default: true
  },
  {
    id: 'cat-g-4',
    nombre: 'Servicios',
    icono: 'Zap',
    color: '#eab308',
    type: 'expense',
    is_default: true
  },
  {
    id: 'cat-g-5',
    nombre: 'Arriendo',
    icono: 'Home',
    color: '#10b981',
    type: 'expense',
    is_default: true
  },
  {
    id: 'cat-g-6',
    nombre: 'Entretenimiento',
    icono: 'Gamepad2',
    color: '#a855f7',
    type: 'expense',
    is_default: true
  },

  // Ingresos
  {
    id: 'cat-i-1',
    nombre: 'Nómina',
    icono: 'Briefcase',
    color: '#10b981',
    type: 'income',
    is_default: true
  },
  {
    id: 'cat-i-2',
    nombre: 'Freelance',
    icono: 'Laptop',
    color: '#6366f1',
    type: 'income',
    is_default: true
  },
  {
    id: 'cat-i-3',
    nombre: 'Ventas',
    icono: 'ShoppingCart',
    color: '#06b6d4',
    type: 'income',
    is_default: true
  }
];

export const AVAILABLE_ICONS = [
  'Briefcase',
  'Wallet',
  'Coins',
  'Building',
  'Store',
  'Landmark',
  'PiggyBank',

  'Book',
  'BookOpen',
  'GraduationCap',
  'Library',
  'PenTool',
  'Laptop',

  'Plane',
  'Map',
  'Compass',
  'Palmtree',
  'Ticket',
  'Tent',
  'Luggage',

  'Home',
  'Sofa',
  'ChefHat',
  'Sparkles',
  'Paintbrush',
  'Hammer',
  'ShoppingCart',

  'Droplet',
  'Zap',
  'Lightbulb',
  'Flame',
  'Wifi',
  'Phone',
  'Plug',

  'HeartPulse',
  'Heart',
  'Stethoscope',
  'Pill',
  'Dumbbell',
  'Activity',
  'Cross',
  'Syringe',

  'Car',
  'Bike',
  'Bus',
  'Train',
  'Ship',
  'Fuel',
  'Navigation',

  'Gamepad2',
  'Tv',
  'Smartphone',
  'Monitor',
  'Headphones',
  'Camera',
  'Film',
  'Music',
  'Speaker',

  'Gift',
  'Scissors',
  'Shirt',
  'Trash',
  'Wrench',
  'Coffee',
  'Utensils',
  'WashingMachine',

  // Ventas
  'Package'
];

export const AVAILABLE_COLORS = [
  { class: 'text-red-500', bg: 'bg-red-500/10', hex: '#ef4444' },
  { class: 'text-orange-500', bg: 'bg-orange-500/10', hex: '#f97316' },
  { class: 'text-amber-500', bg: 'bg-amber-500/10', hex: '#f59e0b' },
  { class: 'text-yellow-500', bg: 'bg-yellow-500/10', hex: '#eab308' },
  { class: 'text-lime-500', bg: 'bg-lime-500/10', hex: '#84cc16' },
  { class: 'text-emerald-500', bg: 'bg-emerald-500/10', hex: '#10b981' },
  { class: 'text-teal-500', bg: 'bg-teal-500/10', hex: '#14b8a6' },
  { class: 'text-cyan-500', bg: 'bg-cyan-500/10', hex: '#06b6d4' },
  { class: 'text-blue-500', bg: 'bg-blue-500/10', hex: '#3b82f6' },
  { class: 'text-indigo-500', bg: 'bg-indigo-500/10', hex: '#6366f1' },
  { class: 'text-violet-500', bg: 'bg-violet-500/10', hex: '#8b5cf6' },
  { class: 'text-purple-500', bg: 'bg-purple-500/10', hex: '#a855f7' },
  { class: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', hex: '#d946ef' },
  { class: 'text-pink-500', bg: 'bg-pink-500/10', hex: '#ec4899' },
  { class: 'text-rose-500', bg: 'bg-rose-500/10', hex: '#f43f5e' },
  { class: 'text-slate-500', bg: 'bg-slate-500/10', hex: '#64748b' }
];

export function getCategoryIcon(iconName: string): any {
  return (Icons as any)[iconName] || Icons.HelpCircle;
}

export function getCategoryStyle(
  categoriaName: string,
  customCategories: CategoriaPersonalizada[] = []
) {
  const allCategories =
    customCategories.length > 0
      ? customCategories
      : DEFAULT_CATEGORIES;

  const cat =
    allCategories.find(c => c.nombre === categoriaName) ||
    DEFAULT_CATEGORIES.find(c => c.nombre === 'Comida') ||
    allCategories[0];

  const matchedColor =
    AVAILABLE_COLORS.find(c => c.hex === cat?.color) ||
    AVAILABLE_COLORS[AVAILABLE_COLORS.length - 1];

  return {
    icon: getCategoryIcon(cat?.icono || 'MoreHorizontal'),
    colorClass: matchedColor.class,
    bgClass: matchedColor.bg,
    hexColor: cat?.color || '#cbd5e1'
  };
}
export function enrichMovimiento(mov: any, categorias: any[], bolsillos: any[]) {
  let catStyle = getCategoryStyle(mov.categoria, categorias);
  let CatIcon = catStyle.icon;

  const safeCategoria = mov.categoria || "";
  const safeDescripcion = mov.descripcion || "";

  let displayName = safeDescripcion || "Movimiento";
  let secondaryInfo = safeCategoria;

  const isBolsillo = safeCategoria.startsWith("bolsillo_");
  const isRetiroBolsillo = safeCategoria.startsWith("retiro_bolsillo_");

  // ==========================
  // AHORROS
  // ==========================
  if (mov.tipo === "ahorro" || safeCategoria === "ahorro") {
    catStyle = {
      bgClass: "bg-emerald-500/10",
      colorClass: "text-emerald-400",
      icon: getCategoryIcon("Sprout"),
      hexColor: "#10b981"
    };

    CatIcon = catStyle.icon;
    displayName = safeDescripcion || "Ahorro";
    secondaryInfo = "Ahorros";
  }

  // ==========================
  // BOLSILLOS
  // ==========================
  else if (isBolsillo || isRetiroBolsillo) {
    const prefix = isRetiroBolsillo
      ? "retiro_bolsillo_"
      : "bolsillo_";

    const bolsilloId = safeCategoria.replace(prefix, "");

    const bolsillo = bolsillos.find(
      (b: any) => String(b.id) === bolsilloId
    );

    if (bolsillo) {
      const colorObj =
        AVAILABLE_COLORS.find(c => c.hex === bolsillo.color) ||
        AVAILABLE_COLORS[0];

      catStyle = {
        bgClass: colorObj.bg,
        colorClass: colorObj.class,
        icon: getCategoryIcon(bolsillo.icono),
        hexColor: bolsillo.color
      };

      CatIcon = catStyle.icon;
      displayName = bolsillo.nombre;

      secondaryInfo = isRetiroBolsillo
        ? "Salida de ahorro"
        : "Depósito a ahorro";
    } else {
      displayName = "Ahorro";
      secondaryInfo = "Ahorros";
    }
  }

  // ==========================
  // VENTAS
  // ==========================
  else if (
    mov.tipo === "ingreso" &&
    safeCategoria !== "ingreso"
) {

    if (safeCategoria === "Venta de producto") {

      catStyle = {
        bgClass: "bg-cyan-500/10",
        colorClass: "text-cyan-400",
        icon: getCategoryIcon("ShoppingCart"),
        hexColor: "#06b6d4"
      };

      CatIcon = catStyle.icon;

      displayName = safeDescripcion || "Producto";

      secondaryInfo =
        mov.cantidad
          ? `${mov.cantidad} unidad${mov.cantidad > 1 ? "es" : ""}`
          : "Venta de producto";
    }

    else if (safeCategoria === "Venta de servicio") {

      catStyle = {
        bgClass: "bg-violet-500/10",
        colorClass: "text-violet-400",
        icon: getCategoryIcon("Briefcase"),
        hexColor: "#8b5cf6"
      };

      CatIcon = catStyle.icon;

      displayName = safeDescripcion || "Servicio";
      secondaryInfo = "Venta de servicio";
    }

    else {

      displayName = safeDescripcion || "Ingreso";

      if (safeCategoria.toLowerCase().includes("salario")) {
        secondaryInfo = "Nómina";
      } else if (safeCategoria.toLowerCase().includes("freelance")) {
        secondaryInfo = "Freelance";
      }
    }
  }

  // ==========================
  // GASTOS
  // ==========================
  // ==========================
// PERFIL PRODUCTIVO
// ==========================
else if (
    safeCategoria === "inversion" ||
    safeCategoria === "gasto" ||
    safeCategoria === "ingreso"
) {

    if (safeCategoria === "inversion") {
        catStyle = {
            bgClass: "bg-violet-500/10",
            colorClass: "text-violet-400",
            icon: getCategoryIcon("Wallet"),
            hexColor: "#8b5cf6"
        };

        CatIcon = catStyle.icon;
        displayName = safeDescripcion || "Inversión";
        secondaryInfo = "Inversión";
    }

    else if (safeCategoria === "gasto") {
        catStyle = {
            bgClass: "bg-rose-500/10",
            colorClass: "text-rose-400",
            icon: getCategoryIcon("Receipt"),
            hexColor: "#f43f5e"
        };

        CatIcon = catStyle.icon;
        displayName = safeDescripcion || "Gasto";
        secondaryInfo = "Gasto";
    }

    else if (safeCategoria === "ingreso") {
        catStyle = {
            bgClass: "bg-emerald-500/10",
            colorClass: "text-emerald-400",
            icon: getCategoryIcon("Coins"),
            hexColor: "#10b981"
        };

        CatIcon = catStyle.icon;
        displayName = safeDescripcion || "Ingreso";
        secondaryInfo = "Ingreso";
    }
}
  else {

    displayName = safeDescripcion || safeCategoria;

    if (safeCategoria.toLowerCase().includes("ahorro")) {
      secondaryInfo = "Ahorros";
    }
  }

  return {
    catStyle,
    CatIcon,
    displayName,
    secondaryInfo,
    isBolsillo
  };
}