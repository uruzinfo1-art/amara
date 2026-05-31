import React, { useState } from 'react';
import { Bolsillo } from '../types';
import { useFinance } from '../context/FinanceContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCurrency, isExpenseConfig, isIncomeReal, isExpenseReal } from '../lib/utils';
import { Card, CardContent } from './ui/Card';

interface TransferBolsilloModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'deposito' | 'retiro';
  bolsillo: Bolsillo;
}

export function TransferBolsilloModal({ isOpen, onClose, tipo, bolsillo }: TransferBolsilloModalProps) {
  const { transferirABolsillo, retirarDeBolsillo, settings, movimientos, bolsillos } = useFinance();
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const ingresos = movimientos.filter(m => !isExpenseConfig(m) && isIncomeReal(m)).reduce((sum, m) => sum + m.monto, 0);
  const gastos = movimientos.filter(m => !isExpenseConfig(m) && isExpenseReal(m)).reduce((sum, m) => sum + m.monto, 0);
  const availableBalance = Math.max(0, ingresos - gastos);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const val = parseFloat(monto);
    if (!val || val <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    if (tipo === 'deposito' && val > availableBalance) {
      setError('No tienes suficiente balance principal para esta transferencia.');
      return;
    }

    if (tipo === 'retiro' && val > bolsillo.saldo) {
      setError('El monto excede el saldo de este bolsillo.');
      return;
    }

    setLoading(true);
    try {
      if (tipo === 'deposito') {
        await transferirABolsillo(bolsillo.id, val, descripcion);
      } else {
        await retirarDeBolsillo(bolsillo.id, val, descripcion);
      }
      onClose();
      setMonto('');
      setDescripcion('');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error en la transferencia.');
    } finally {
      setLoading(false);
    }
  };

  const isDeposit = tipo === 'deposito';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isDeposit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
              {isDeposit ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{isDeposit ? 'Depositar' : 'Retirar'}</h2>
              <p className="text-sm text-muted-foreground">{bolsillo.nombre}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="bg-muted/30 p-4 rounded-xl flex justify-between items-center mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">
                  {isDeposit ? 'Balance Principal' : 'Saldo del Ahorro'}
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(isDeposit ? availableBalance : bolsillo.saldo, settings.currency)}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-rose-500 bg-rose-500/10 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {settings.currency === 'EUR' ? '€' : '$'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8 text-lg"
                  placeholder="0.00"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción (Opcional)</label>
              <Input
                placeholder={isDeposit ? 'Aporte mensual...' : 'Retiro para compra...'}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full mt-6" disabled={loading || !monto}>
              {loading ? 'Procesando...' : isDeposit ? 'Confirmar Depósito' : 'Confirmar Retiro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
