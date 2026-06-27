import React from "react";
import { useFinance } from "../context/FinanceContext";

export default function BusinessHealth() {
  const {
    activeProfile,
    movimientos,
    bolsillos
  } = useFinance();

  const products = JSON.parse(
    localStorage.getItem("products_services") || "[]"
  );

  const capitalInicial = Number(
    activeProfile?.initial_investment ?? 0
  );

  const efectivo = movimientos.reduce(
    (total: number, mov: any) => {
      if (mov.tipo === "ingreso") {
        return total + Number(mov.monto || 0);
      }

      if (
        mov.tipo === "gasto" ||
        mov.tipo === "gasto_real"
      ) {
        return total - Number(mov.monto || 0);
      }

      return total;
    },
    0
  );

  const valorInventario = products.reduce(
    (total: number, item: any) => {
      const stock = Number(item.stock || 0);
      const costo = Number(item.cost || 0);

      return total + stock * costo;
    },
    0
  );

  const ahorro = bolsillos.reduce(
    (total: number, bolsillo: any) =>
      total + Number(bolsillo.saldo || 0),
    0
  );

  const patrimonioActual =
    efectivo +
    valorInventario +
    ahorro;

  const ganancia =
    patrimonioActual - capitalInicial;

  const rentabilidad =
    capitalInicial > 0
      ? (ganancia / capitalInicial) * 100
      : 0;

  const color =
    ganancia >= 0
      ? "text-green-500"
      : "text-red-500";

  return (
  <div className="max-w-5xl mx-auto p-4 space-y-6">

    {/* Título */}
    <div>
      <h1 className="text-3xl font-bold">
        ¿Cómo va mi negocio?
      </h1>
      <p className="text-muted-foreground mt-1">
        Estado financiero y evolución de tu empresa
      </p>
    </div>

    {/* Tarjeta principal */}
    <div className="rounded-3xl border border-emerald-500/20 bg-card p-6">

      <div className="inline-flex rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-400 font-semibold">
        🟢 Excelente
      </div>

      <p className="text-muted-foreground mt-4">
        Tu negocio mantiene un crecimiento positivo.
      </p>

      <p className="text-muted-foreground">
        Continúa controlando los gastos para aumentar la rentabilidad.
      </p>

      <div className="mt-8">

        <p className="text-muted-foreground">
          Patrimonio actual
        </p>

        <h2 className="text-5xl font-black mt-2">
          ${patrimonioActual.toLocaleString()}
        </h2>

      </div>

    </div>

    {/* Este mes */}

    <div>

      <h2 className="text-xl font-semibold mb-3">
        Este mes
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-2xl bg-card p-5">
          <p className="text-emerald-400">Ventas</p>
          <h3 className="text-2xl font-bold mt-2">$0</h3>
        </div>

        <div className="rounded-2xl bg-card p-5">
          <p className="text-rose-400">Gastos</p>
          <h3 className="text-2xl font-bold mt-2">$0</h3>
        </div>

        <div className="rounded-2xl bg-card p-5">
          <p className="text-cyan-400">Ganancia</p>
          <h3 className="text-2xl font-bold mt-2">
            ${ganancia.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-2xl bg-card p-5">
          <p className="text-violet-400">
            Rentabilidad
          </p>
          <h3 className="text-2xl font-bold mt-2">
            {rentabilidad.toFixed(1)}%
          </h3>
        </div>

      </div>

    </div>

    {/* Análisis */}

    <div className="rounded-2xl bg-card p-5">

      <h2 className="text-lg font-semibold">
        Análisis de Amara
      </h2>

      <p className="text-muted-foreground mt-3">
        Tu patrimonio actual es de
        <strong> ${patrimonioActual.toLocaleString()}</strong>.
      </p>

      <p className="text-muted-foreground mt-2">
        Mantén este ritmo para seguir aumentando el valor de tu negocio.
      </p>

    </div>

    {/* Negocio completo */}

    <div>

      <h2 className="text-xl font-semibold mb-3">
        El negocio completo
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-xl bg-card p-4">
          <p className="text-muted-foreground text-sm">
            Capital inicial
          </p>
          <h3 className="font-bold mt-2">
            ${capitalInicial.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-card p-4">
          <p className="text-muted-foreground text-sm">
            Efectivo
          </p>
          <h3 className="font-bold mt-2">
            ${efectivo.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-card p-4">
          <p className="text-muted-foreground text-sm">
            Inventario
          </p>
          <h3 className="font-bold mt-2">
            ${valorInventario.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-card p-4">
          <p className="text-muted-foreground text-sm">
            Ahorros
          </p>
          <h3 className="font-bold mt-2">
            ${ahorro.toLocaleString()}
          </h3>
        </div>

      </div>

    </div>

  </div>
);
}