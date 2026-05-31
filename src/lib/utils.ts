import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Movimiento } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isExpenseConfig(m: Movimiento) {
  // A configuration is a fixed expense setup that implicitly has day_of_month
  // which distinguishes it from actual executed payments!
  return m.is_fixed === true && m.day_of_month != null;
}

export function isIncomeReal(m: Movimiento) {
  return m.tipo === 'ingreso' && !m.categoria?.startsWith('bolsillo_');
}

export function isGastoReal(m: Movimiento) {
  return m.tipo === 'gasto_real' || m.tipo === 'gasto';
}

export function isGastoAhorro(m: Movimiento) {
  return m.tipo === 'gasto_ahorro' || m.tipo === 'ahorro' || (m.tipo === 'transferencia' && !!m.categoria?.startsWith('bolsillo_'));
}

export function isExpenseReal(m: Movimiento) {
  return isGastoReal(m) || isGastoAhorro(m);
}

export function isAhorroIn(m: Movimiento) {
  // Transfer into a pocket
  return isGastoAhorro(m);
}

export function isAhorroOut(m: Movimiento) {
  // Withdrawal from a pocket
  return isRetiroAhorro(m);
}

export function isRetiroAhorro(m: Movimiento) {
  return m.tipo === 'retiro_ahorro' || (m.tipo === 'transferencia' && !!m.categoria?.startsWith('retiro_bolsillo_'));
}

export const formatCurrency = (amount: number, currency: string = 'COP') => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactCurrency = (amount: number) => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  let formatted = '';

  if (absAmount >= 1000000) {
    formatted = `$${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 10000) {
    formatted = `$${(absAmount / 1000).toFixed(0)}K`;
  } else {
    // For values < 10000, don't use initials, just full numbers like $950, $4,500
    // Wait, the requirement says "Miles: $950", what about $5,000? Maybe just format normally without cents.
    formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(absAmount);
  }

  // Remove .0M if it's perfectly round? "Millones: $4.0M", so .0 is fine.
  return isNegative ? `-${formatted}` : formatted;
};
