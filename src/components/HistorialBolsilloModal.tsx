import React, { useEffect, useState } from 'react';
import { Bolsillo, TransferenciaBolsillo } from '../types';
import { useFinance } from '../context/FinanceContext';
import { Button } from './ui/Button';
import { X, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent } from './ui/Card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistorialBolsilloModalProps {
  isOpen: boolean;
  onClose: () => void;
  bolsillo: Bolsillo;
}

export function HistorialBolsilloModal({ isOpen, onClose, bolsillo }: HistorialBolsilloModalProps) {
  const { obtenerTransferenciasBolsillo, settings } = useFinance();
  const [transferencias, setTransferencias] = useState<TransferenciaBolsillo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      obtenerTransferenciasBolsillo(bolsillo.id)
        .then(data => setTransferencias(data))
        .catch(err => console.error("Error al obtener historial", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, bolsillo.id, obtenerTransferenciasBolsillo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-full">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Historial de Transferencias</h2>
              <p className="text-sm text-muted-foreground">{bolsillo.nombre}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <CardContent className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p>Cargando historial...</p>
            </div>
          ) : transferencias.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="divide-y">
              {transferencias.map(tr => {
                const isDeposit = tr.tipo === 'deposito';
                return (
                  <div key={tr.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${isDeposit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {isDeposit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {tr.descripcion || (isDeposit ? 'Depósito' : 'Retiro')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tr.created_at ? format(new Date(tr.created_at), "d 'de' MMMM, yyyy • HH:mm", { locale: es }) : 'Fecha desconocida'}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${isDeposit ? 'text-emerald-500' : 'text-foreground'}`}>
                      {isDeposit ? '+' : '-'}{formatCurrency(tr.monto, settings.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
