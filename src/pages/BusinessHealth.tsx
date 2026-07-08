import {
  Activity,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Landmark,
  BarChart3,
  Sparkles
} from "lucide-react";

import { Card, CardContent } from "../components/ui/Card";
import { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency } from "../lib/utils";

export default function BusinessHealth() {
  const [infoSeleccionada, setInfoSeleccionada] = useState<string | null>(null);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());

  const {
    movimientos,
    activeProfile,
    settings
  } = useFinance();

  if (!activeProfile) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        No existe un perfil activo.
      </div>
    );
  }

  const now = new Date();

const currentMonth = mesSeleccionado.getMonth();
const currentYear = mesSeleccionado.getFullYear();
const mesesDisponibles = Array.from(
  new Set(
    movimientos.map((m) => {
      const fecha = new Date(m.fecha);
      return `${fecha.getFullYear()}-${fecha.getMonth()}`;
    })
  )
)
  .sort((a, b) => b.localeCompare(a))
  .map((mes) => {
    const [year, month] = mes.split("-");

    return {
      value: mes,
      label: new Date(Number(year), Number(month)).toLocaleDateString("es-CO", {
        month: "long",
        year: "numeric",
      }),
    };
  });
// Movimientos del mes actual
const monthlyMovements = movimientos.filter((m) => {
  const date = new Date(m.fecha);

  return (
    date.getMonth() === currentMonth &&
    date.getFullYear() === currentYear
  );
});

// Todos los movimientos del negocio
const historicalMovements = movimientos;

// Capital histórico
const capitalHistorico = historicalMovements
  .filter(
    (m) =>
      m.categoria === "Capital inicial" ||
      m.descripcion === "Capital agregado"
  )
  .reduce(
    (acc, mov) => acc + Number(mov.monto),
    0
  );

// Ventas históricas
const ventasHistoricas = historicalMovements
  .filter(
    (m) =>
      m.tipo === "ingreso" &&
      m.descripcion !== "Capital agregado" &&
      m.categoria !== "Capital inicial"
  )
  .reduce(
    (acc, mov) => acc + Number(mov.monto),
    0
  );

// Gastos históricos
const gastosHistoricos = historicalMovements
  .filter(
    (m) => m.tipo === "gasto_real"
  )
  .reduce(
    (acc, mov) => acc + Number(mov.monto),
    0
  );

// Ganancia histórica
const gananciaHistorica =
  ventasHistoricas - gastosHistoricos;

    

  //----------------------------------
  // CAPITAL
  //----------------------------------

  const capitalInicial = monthlyMovements
    .filter(
      (m) =>
        m.categoria === "Capital inicial" ||
        m.descripcion === "Capital agregado"
    )
    .reduce(
      (acc, mov) => acc + Number(mov.monto),
      0
    );

  //----------------------------------
  // VENTAS
  //----------------------------------

  const ventas = monthlyMovements
  .filter(
    (m) =>
      m.tipo === "ingreso" &&
      m.descripcion !== "Capital agregado" &&
      m.categoria !== "Capital inicial"
  )
  .reduce(
    (acc, mov) => acc + Number(mov.monto),
    0
  );

  //----------------------------------
  // GASTOS
  //----------------------------------

  const gastos = monthlyMovements
    .filter(
      (m) => m.tipo === "gasto_real"
    )
    .reduce(
      (acc, mov) => acc + Number(mov.monto),
      0
    );

  //----------------------------------
  // GANANCIA
  //----------------------------------

  const ganancia = ventas - gastos;

  //----------------------------------
  // PATRIMONIO
  //----------------------------------

  const patrimonio = Math.max(
  capitalHistorico + gananciaHistorica,
  0
);

  //----------------------------------
  // MARGEN
  //----------------------------------

  const margen =
  ventasHistoricas > 0
    ? (gananciaHistorica / ventasHistoricas) * 100
    : 0;

  //----------------------------------
  // RECUPERACIÓN
  //----------------------------------

  const recuperacion =
  capitalHistorico > 0
    ? (gananciaHistorica / capitalHistorico) * 100
    : 0;

  //----------------------------------
  // SCORE
  //----------------------------------

  let score = 0;

// Rentabilidad
if (margen >= 40) score += 30;
else if (margen >= 20) score += 20;
else if (margen >= 10) score += 10;

// Utilidad
if (gananciaHistorica > 0) score += 25;

// Ventas
if (ventasHistoricas > 0) score += 25;

// Control de gastos
const porcentajeGastos =
  ventasHistoricas > 0
    ? (gastosHistoricos / ventasHistoricas) * 100
    : 100;

if (porcentajeGastos <= 40)
  score += 20;
else if (porcentajeGastos <= 60)
  score += 10;

score = Math.min(100, Math.round(score));

  //----------------------------------
  // ESTADO
  //----------------------------------

  let estado = "Crítico";

if (score >= 90) {
  estado = "Excelente";
} else if (score >= 75) {
  estado = "Muy bueno";
} else if (score >= 60) {
  estado = "Bueno";
} else if (score >= 40) {
  estado = "Regular";
}

  //----------------------------------
  // COLOR
  //----------------------------------

  const scoreColor =
    score >= 80
      ? "text-green-400"
      : score >= 60
      ? "text-yellow-400"
      : "text-red-400";

  return (

    <div
  className="space-y-8 p-6"
  onClick={() => setInfoSeleccionada(null)}
>

      {/* =======================================================
          HEADER
      ======================================================= */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-black">

            Salud del negocio

          </h1>

          <p className="text-gray-400 mt-2">

            {mesSeleccionado.toLocaleString("es-ES", {
  month: "long",
  year: "numeric",
})}

          </p>

        </div>

        <div className="w-16 h-16 rounded-2xl bg-violet-600/20 flex items-center justify-center">

          <Activity
            size={34}
            className="text-violet-400"
          />

        </div>

      </div>
      {/* =======================================================
          SCORE DEL NEGOCIO
      ======================================================= */}

      <Card className="bg-[#111827] border-white/10 overflow-hidden">

        <CardContent className="p-8">

          <div className="grid lg:grid-cols-[260px_1fr] gap-10">

            {/* CÍRCULO */}

            <div className="flex flex-col items-center justify-center">

  <div
    className="relative w-56 h-56 cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();

      setInfoSeleccionada(
        infoSeleccionada === "Puntaje del negocio"
          ? null
          : "Puntaje del negocio"
      );
    }}
  >

                <svg
                  className="absolute inset-0"
                  viewBox="0 0 220 220"
                >

                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    stroke="#262d3d"
                    strokeWidth="14"
                    fill="none"
                  />

                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    stroke="#8b5cf6"
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={565}
                    strokeDashoffset={
                      565 -
                      (565 * score) / 100
                    }
                    transform="rotate(-90 110 110)"
                  />

                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">

  <div className="mb-3 text-center">
    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        Salud
    </div>

    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        del negocio
    </div>
</div>

  <span
    className={`text-6xl font-black ${scoreColor}`}
  >
    {score}
  </span>

  <span className="text-gray-400">
    de 100 pts
  </span>

</div>

              </div>

            </div>

            {/* INFORMACIÓN */}

            <div className="flex flex-col justify-center">

              <div className="inline-flex w-fit rounded-xl bg-violet-500/15 px-4 py-2">

                <Sparkles
                  size={18}
                  className="mr-2 text-violet-400"
                />

                <span className="text-violet-300 font-semibold">

                 Diagnóstico del negocio

                </span>

              </div>

              <h2
                className={`text-5xl font-black mt-6 ${scoreColor}`}
              >

                {estado}

              </h2>

              <p className="text-gray-400 mt-4 max-w-xl leading-7">

                {
score >= 90
? "El negocio mantiene una excelente salud financiera. Continúa con la estrategia actual."

: score >= 75
? "El negocio presenta un buen equilibrio entre ventas, utilidad y control de gastos."

: score >= 60
? "El negocio es estable, aunque existen oportunidades para mejorar la rentabilidad."

: score >= 40
? "Se recomienda revisar el comportamiento de las ventas y reducir los gastos."

: "La salud del negocio requiere atención. Es recomendable analizar ventas, gastos e inversión."
}
              </p>

              <div className="space-y-6 mt-8">
                
                {[
                  
                  {
  titulo: "Rentabilidad",
  valor: Math.min(
    100,
    Math.max(0, margen * 2)
  ),
},
                  {
                    titulo: "Capital recuperado",
                    valor: Math.min(
                      recuperacion,
                      100
                    )
                  },
                  {
    titulo: "Ventas",
    valor: Math.min(
        100,
        recuperacion
    ),
},{
    titulo: "Control de gastos",
    valor:
        ventasHistoricas > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    100 - (gastosHistoricos / ventasHistoricas) * 100
                )
            )
            : 0,
},
                ].map((item) => (

                  <div
  key={item.titulo}
  onClick={(e) => {
    e.stopPropagation();

    setInfoSeleccionada(
      infoSeleccionada === item.titulo
        ? null
        : item.titulo
    );
  }}
  className="cursor-pointer"
>

                    <div className="flex justify-between mb-2">

                      <span className="text-gray-300">

                        {item.titulo}

                      </span>

                      <span className="font-semibold text-violet-300">

                        {Math.round(item.valor)}%

                      </span>

                    </div>

                    <div className="h-3 rounded-full bg-[#1f2937] overflow-hidden">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-700"
                        style={{
                          width: `${item.valor}%`
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </CardContent>

      </Card>
      {infoSeleccionada && (
<Card className="bg-[#111827] border-violet-500/20">
<CardContent className="p-6">

<h3 className="text-xl font-bold text-violet-300 mb-3">
{infoSeleccionada}
</h3>

<p className="text-gray-300 leading-7">

{infoSeleccionada === "Rentabilidad" &&
"La rentabilidad mide qué porcentaje de las ventas termina convertido en utilidad. Mientras más alto sea este porcentaje, más eficiente está siendo el negocio."}

{infoSeleccionada === "Capital recuperado" &&
"Indica cuánto del capital invertido ya fue recuperado mediante las utilidades generadas por el negocio."}

{infoSeleccionada === "Ventas" &&
"Representa la capacidad del negocio para generar ingresos. Más ventas normalmente significan mayor crecimiento, siempre que los gastos permanezcan controlados."}

{infoSeleccionada === "Control de gastos" &&
"Compara los gastos frente a las ventas. Un porcentaje bajo significa que el negocio está administrando correctamente sus costos."}
{infoSeleccionada === "Puntaje del negocio" &&
"Este puntaje resume la salud general del negocio. Se calcula analizando la rentabilidad, las ventas, el control de gastos y la recuperación del capital. Entre más alto sea este valor, mejor es el desempeño financiero del negocio."}

</p>

</CardContent>
</Card>
)}
      {/* =======================================================
          RESUMEN DEL MES
      ======================================================= */}

      <div>

        <div className="flex items-center justify-between mb-5">

  <h2 className="text-2xl font-bold">
    Resumen del mes
  </h2>

  <div className="flex items-center gap-3">

    <select
  value={`${mesSeleccionado.getFullYear()}-${mesSeleccionado.getMonth()}`}
  onChange={(e) => {
    const [year, month] = e.target.value.split("-");
    setMesSeleccionado(new Date(Number(year), Number(month), 1));
  }}
  className="bg-[#141b2d] border border-[#2a3550] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
>
  {mesesDisponibles.map((mes) => (
    <option key={mes.value} value={mes.value}>
      {mes.label}
    </option>
  ))}
</select>

  </div>

</div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

          {/* VENTAS */}

          <Card className="bg-[#111827] border-green-500/20 hover:border-green-500/40 transition-all">

            <CardContent className="p-6">

              <ShoppingCart
                size={28}
                className="text-green-400 mb-5"
              />

              <p className="text-gray-500 text-sm">

                Ventas

              </p>

              <h2 className="text-3xl font-bold mt-2">

                {formatCurrency(
                  ventas,
                  settings.currency
                )}

              </h2>

            </CardContent>

          </Card>

          {/* GASTOS */}

          <Card className="bg-[#111827] border-red-500/20 hover:border-red-500/40 transition-all">

            <CardContent className="p-6">

              <TrendingDown
                size={28}
                className="text-red-400 mb-5"
              />

              <p className="text-gray-500 text-sm">

                Gastos

              </p>

              <h2 className="text-3xl font-bold mt-2">

                {formatCurrency(
                  gastos,
                  settings.currency
                )}

              </h2>

            </CardContent>

          </Card>

          {/* GANANCIA */}

          <Card className="bg-[#111827] border-cyan-500/20 hover:border-cyan-500/40 transition-all">

            <CardContent className="p-6">

              <TrendingUp
                size={28}
                className="text-cyan-400 mb-5"
              />

              <p className="text-gray-500 text-sm">

                Ganancia

              </p>

              <h2
                className={`text-3xl font-bold mt-2 ${
                  ganancia >= 0
                    ? "text-cyan-400"
                    : "text-red-400"
                }`}
              >

                {formatCurrency(
                  ganancia,
                  settings.currency
                )}

              </h2>

            </CardContent>

          </Card>

          {/* MARGEN */}

          <Card className="bg-[#111827] border-violet-500/20 hover:border-violet-500/40 transition-all">

            <CardContent className="p-6">

              <BarChart3
                size={28}
                className="text-violet-400 mb-5"
              />

              <p className="text-gray-500 text-sm">

                Margen

              </p>

              <h2
                className={`text-3xl font-bold mt-2 ${
                  margen >= 20
                    ? "text-green-400"
                    : margen >= 10
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >

                {margen.toFixed(1)}%

              </h2>

            </CardContent>

          </Card>

        </div>

      </div>
      {/* =======================================================
          RECUPERACIÓN DE LA INVERSIÓN
      ======================================================= */}

      <Card className="bg-[#111827] border-white/10 overflow-hidden">

        <CardContent className="p-8">

          <div className="flex items-center justify-between mb-8">

            <div>

              <h2 className="text-2xl font-bold">

                Recuperación de la inversión

              </h2>

              <p className="text-gray-400 mt-2">

                Progreso del capital inicial del negocio.

              </p>

            </div>

            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center">

              <Landmark
                className="text-violet-400"
                size={28}
              />

            </div>

          </div>

          <div className="grid md:grid-cols-3 gap-6">

            <div className="rounded-2xl bg-[#181f2e] p-6">

              <p className="text-gray-400 text-sm">

                Capital inicial

              </p>

              <h2 className="text-3xl font-black mt-3">

                {formatCurrency(
                  capitalHistorico,
                  settings.currency
                )}

              </h2>

            </div>

            <div className="rounded-2xl bg-[#181f2e] p-6">

              <p className="text-gray-400 text-sm">

                Recuperado

              </p>

              <h2 className="text-3xl font-black mt-3 text-green-400">

                {formatCurrency(
  Math.max(gananciaHistorica, 0),
  settings.currency
)}

              </h2>

            </div>

            <div className="rounded-2xl bg-[#181f2e] p-6">

              <p className="text-gray-400 text-sm">

                Falta recuperar

              </p>

              <h2 className="text-3xl font-black mt-3 text-orange-400">

                {formatCurrency(
                  Math.max(
  capitalHistorico - Math.max(gananciaHistorica, 0),
  0
),
                  settings.currency
                )}

              </h2>

            </div>

          </div>

          <div className="mt-10">

            <div className="flex justify-between mb-3">

              <span className="text-gray-400">

                Recuperación del capital

              </span>

              <span className="font-bold text-violet-300">

                {Math.min(
                  recuperacion,
                  100
                ).toFixed(1)}%

              </span>

            </div>

            <div className="h-5 rounded-full bg-[#1c2435] overflow-hidden">

              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 transition-all duration-700"
                style={{
                  width: `${Math.max(0, Math.min(recuperacion, 100))}%`
                }}
              />

            </div>

          </div>

          <div className="mt-8 rounded-2xl bg-violet-500/10 border border-violet-500/20 p-6">

            <div className="flex items-start gap-4">

              <Sparkles
                className="text-violet-400 mt-1"
                size={24}
              />

              <div>

                <h3 className="font-bold text-violet-300">

                  Análisis AMARA

                </h3>

                <p className="text-gray-300 mt-3 leading-7">

                  {recuperacion >= 100
                    ? "¡Excelente! Ya recuperaste completamente la inversión inicial. A partir de ahora toda utilidad incrementará directamente el patrimonio del negocio."
                    : `Has recuperado el ${recuperacion.toFixed(
                        1
                      )}% de tu inversión inicial. Manteniendo este ritmo podrás completar la recuperación del capital en los próximos meses.`}

                </p>

              </div>

            </div>

          </div>

        </CardContent>

      </Card>
      {/* =======================================================
          EVOLUCIÓN DEL NEGOCIO
      ======================================================= */}

      <div>

        <div className="flex items-center justify-between mb-5">

          <h2 className="text-2xl font-bold">

            Evolución del negocio

          </h2>

          <BarChart3
            className="text-violet-400"
            size={28}
          />

        </div>

        <Card className="bg-[#111827] border-white/10">

          <CardContent className="p-8">

            <div className="h-72 rounded-2xl bg-[#181f2e] flex items-center justify-center">

              <div className="text-center">

                <BarChart3
                  size={70}
                  className="mx-auto text-violet-500"
                />

                <h3 className="mt-6 text-2xl font-bold">

                  Gráfica mensual

                </h3>

                <p className="text-gray-400 mt-3">

                  Aquí mostraremos la evolución de
                  ventas, gastos y utilidad del mes.

                </p>

              </div>

            </div>

          </CardContent>

        </Card>

      </div>

      {/* =======================================================
          INTELIGENCIA AMARA
      ======================================================= */}

      <div className="grid lg:grid-cols-2 gap-6">

        <Card className="bg-[#111827] border-green-500/20">

          <CardContent className="p-7">

            <div className="flex items-center gap-3 mb-5">

              <Sparkles
                className="text-green-400"
                size={26}
              />

              <h2 className="text-xl font-bold">

                Lo mejor del mes

              </h2>

            </div>

            <p className="text-gray-300 leading-8">

              {ganancia > 0
                ? `El negocio obtuvo una utilidad de ${formatCurrency(
                    ganancia,
                    settings.currency
                  )}. Esto significa que las ventas superaron los gastos y el patrimonio continúa creciendo.`
                : "Todavía no existe una utilidad positiva durante este mes."}

            </p>

          </CardContent>

        </Card>

        <Card className="bg-[#111827] border-violet-500/20">

          <CardContent className="p-7">

            <div className="flex items-center gap-3 mb-5">

              <Sparkles
                className="text-violet-400"
                size={26}
              />

              <h2 className="text-xl font-bold">

                Recomendación AMARA

              </h2>

            </div>

            <p className="text-gray-300 leading-8">

              {gastos < ventas
                ? "Mantén el control de los gastos y continúa aumentando las ventas. El negocio presenta un comportamiento saludable."
                : "Reduce gastos antes de realizar nuevas inversiones. Mejorar el margen de utilidad debe ser la prioridad del próximo mes."}

            </p>

          </CardContent>

        </Card>

      </div>
      {/* =======================================================
          RESUMEN FINAL
      ======================================================= */}

      

    </div>

  );

}