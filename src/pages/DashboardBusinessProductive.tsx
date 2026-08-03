import React from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

import { useFinance } from "../context/FinanceContext";

import {
  formatCurrency,
  isIncomeReal,
  isExpenseReal,
  isExpenseConfig,
} from "../lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";

import {
  Wallet,
  TrendingUp,
 
  PiggyBank,
  Clock3,
  Target,
  Activity,
 
} from "lucide-react";

import { ProfilePicture } from "../components/ProfilePicture";


export default function DashboardBusinessProductive() {

  const navigate = useNavigate();

  const {
  profiles,
  activeProfile,
  setActiveProfile,
  settings,
  movimientos,
  partners,
  loading,
  addPartner,
} = useFinance();
const [showPartnerModal, setShowPartnerModal,] = React.useState(false);

const [newPartner, setNewPartner] = React.useState({
  name: "",
  
});
const guardarPartner = async () => {
  console.log("Entró a guardarPartner");
  if (!newPartner.name.trim()) return;
// Ya no es necesario validar capital

 try {
  await addPartner({
    name: newPartner.name,
    capital: 0,
    profile_id: activeProfile!.id,
    user_id: activeProfile!.user_id,
    active: true,
  });

  console.log("SOCIO GUARDADO");

} catch (error) {
  console.error(error);
}

  setNewPartner({
  name: "",
});

  setShowPartnerModal(false);
};
  const [showProfileMenu, setShowProfileMenu] =
    React.useState(false);

  

  const [isClosureOpen, setIsClosureOpen] =
    React.useState(false);

  /******************************************************
   *
   *             DATOS DE LA INVERSIÓN
   *
   ******************************************************/

  const movimientosProyecto = movimientos.filter(
  (m) =>
    m.profile_id === activeProfile?.id &&
    !isExpenseConfig(m)
);

  /******************************************************
 *
 *          RESUMEN FINANCIERO DEL NEGOCIO
 *
 ******************************************************/

/**
 * Todo el dinero que ha salido del bolsillo del dueño.
 * Incluye inversiones y gastos reales.
 */
const capitalInvertido = movimientosProyecto
  .filter(
    (m) =>
      m.categoria?.toLowerCase() === "inversion" ||
      m.tipo === "gasto_real"
  )
  .reduce((total, mov) => total + Math.abs(mov.monto), 0);

/**
 * Todo el dinero que ha ingresado al negocio.
 */
const recuperado = movimientosProyecto
  .filter((m) => isIncomeReal(m))
  .reduce((total, mov) => total + mov.monto, 0);

/**
 * Dinero que aún sigue comprometido en el negocio.
 */
const faltaRecuperar = Math.max(
  capitalInvertido - recuperado,
  0
);

/**
 * Solo existe utilidad cuando ya se recuperó todo
 * el capital invertido.
 */
const utilidad = Math.max(
  recuperado - capitalInvertido,
  0
);

/**
 * Porcentaje recuperado.
 */
const porcentajeRecuperado =
  capitalInvertido > 0
    ? (recuperado / capitalInvertido) * 100
    : 0;
    const socios = partners.filter(
  (p) =>
    p.profile_id === activeProfile?.id &&
    p.active
);

const obtenerCapitalSocio = (partnerId: string) => {

  const socio = socios.find(
    s => s.id === partnerId
  );

  const capitalInicial =
    Number(socio?.capital || 0);

  const movimientosSocio =
    movimientosProyecto.filter(
      m =>
        m.partner_id === partnerId &&
        (
          m.categoria === "inversion" ||
          m.categoria === "gasto"
        )
    );

  const aportes =
    movimientosSocio.reduce(
      (total, mov) => total + Number(mov.monto),
      0
    );

  return capitalInicial + aportes;

};

const capitalSocios =
  socios.reduce(
    (total, socio) =>
      total + obtenerCapitalSocio(socio.id),
    0
  );
/**
 * FECHA DE INICIO
 * Primer movimiento registrado del proyecto.
 */
const fechaInicio =
  movimientosProyecto.length > 0
    ? new Date(
        movimientosProyecto.reduce((a, b) =>
          new Date(a.fecha) < new Date(b.fecha) ? a : b
        ).fecha
      )
    : new Date();
  /**
   * TIEMPO
   */

  const hoy = new Date();

  const meses =
    differenceInMonths(
      hoy,
      fechaInicio
    );

  const dias =
    differenceInDays(
      hoy,
      fechaInicio
    );

  /**
   * PROMEDIO MENSUAL
   */

  const diasTranscurridos = Math.max(dias, 1);

const ritmoDiario = recuperado / diasTranscurridos;

const ritmoMensual = ritmoDiario * 30;

  /**
   * TIEMPO ESTIMADO
   */

 const diasRestantes =
    ritmoDiario > 0
        ? Math.ceil(faltaRecuperar / ritmoDiario)
        : 0;

const mesesRestantes = Math.ceil(diasRestantes / 30);

  /**
   * ESTADO
   */

  let estado =
    "Inicio";

  if (
    porcentajeRecuperado >=
    100
  ) {

    estado =
      "Generando utilidad";

  } else if (
    porcentajeRecuperado >=
    75
  ) {

    estado =
      "Cerca del equilibrio";

  } else if (
    porcentajeRecuperado >=
    25
  ) {

    estado =
      "Recuperando capital";

  }

  /**
   * MOVIMIENTOS
   */

  

  if (loading)
    return null;

  return (
<>
<div className="space-y-6">

      {/* HEADER */}

      <header className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">

            Dashboard de Inversión

          </h1>

          <p className="text-muted-foreground">

            Controla la recuperación
            de tu inversión.

          </p>

        </div>

        <div className="relative">

  <button
    onClick={() => setShowProfileMenu(!showProfileMenu)}
  >
    <ProfilePicture
      name={settings.userName || "Usuario"}
      url={settings.avatarUrl}
      size="md"
    />
  </button>

  {showProfileMenu && (
    <div className="absolute right-0 top-16 w-64 rounded-2xl border bg-card p-2 shadow-xl z-50">

      {profiles.map((profile) => (
        <button
          key={profile.id}
          onClick={() => {
            setActiveProfile(profile);
            setShowProfileMenu(false);
          }}
          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5"
        >
          👤 {profile.name}
        </button>
      ))}

      <div className="border-t border-white/10 my-2" />

      <button
        onClick={() => {
          setShowProfileMenu(false);
          navigate("/settings");
        }}
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5"
      >
        ⚙ Ajustes
      </button>

    </div>
  )}

</div>

      </header>

      {/* TARJETA PRINCIPAL */}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-background">

        <CardHeader>

          <CardTitle className="flex items-center gap-2">

            <Wallet
              className="w-5 h-5 text-primary"
            />

            Capital invertido

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="text-5xl font-bold">

            {formatCurrency(
              capitalInvertido,
              settings.currency
            )}

          </div>

          <div className="mt-6">

            <div className="flex justify-between text-sm">

              <span>

                Recuperado

              </span>

              <span>

                {porcentajeRecuperado.toFixed(
                  1
                )}
                %

              </span>

            </div>

            <div className="mt-2 h-4 rounded-full bg-muted overflow-hidden">

              <div

                className="h-full bg-primary transition-all duration-500"

                style={{
                  width: `${Math.min(
                    porcentajeRecuperado,
                    100
                  )}%`,
                }}

              />

            </div>

          </div>

        </CardContent>

      </Card>
      <Card className="border-primary/20 bg-gradient-to-br from-card to-background">

  <CardHeader className="flex flex-row items-center justify-between">

    <CardTitle>
      👥 Socios
    </CardTitle>

    <button
  onClick={() => setShowPartnerModal(true)}
  className="text-sm px-3 py-1 rounded-lg bg-primary text-white hover:opacity-90"
>
  + Agregar
</button>

  </CardHeader>

  <CardContent>

    <div className="mb-5">

      <p className="text-xs text-muted-foreground">
        Capital de socios
      </p>

      <h2 className="text-3xl font-bold">

        {formatCurrency(
          capitalSocios,
          settings.currency
        )}

      </h2>

    </div>

    <div className="space-y-4">

      {socios.length === 0 ? (

        <div className="text-center py-8 text-muted-foreground">

          No hay socios registrados.

        </div>

      ) : (

        socios.map((socio) => {

          const capitalActual =
  obtenerCapitalSocio(socio.id);

const porcentaje =
  capitalSocios > 0
    ? (capitalActual / capitalSocios) * 100
    : 0;

          return (

            <div
              key={socio.id}
              className="rounded-xl border p-4"
            >

              <div className="flex justify-between items-center">

                <strong>

                  {socio.name}

                </strong>

                <span>

                  {porcentaje.toFixed(1)}%

                </span>

              </div>

              <div className="mt-2 flex justify-between">

                <span>

                  {formatCurrency(
  capitalActual,
  settings.currency
)}

                </span>

              </div>

            </div>

          );

        })

      )}

    </div>

  </CardContent>

</Card>
      {/* ==========================================
        TARJETAS DE INDICADORES
========================================== */}

      {/* ==========================================
              TARJETAS DE INDICADORES
      ========================================== */}

      <div className="grid grid-cols-2 gap-4">

        {/* Recuperado */}

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">

          <CardContent className="p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Recuperado
                </p>

                <h2 className="mt-2 text-2xl font-bold text-emerald-400">

                  {formatCurrency(
                    recuperado,
                    settings.currency
                  )}

                </h2>

              </div>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">

                <TrendingUp
                  className="text-emerald-400"
                  size={22}
                />

              </div>

            </div>

            <p className="text-xs text-muted-foreground mt-3">

              Dinero recuperado de la inversión.

            </p>

          </CardContent>

        </Card>

        {/* Falta recuperar */}

        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">

          <CardContent className="p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs uppercase tracking-wider text-muted-foreground">

                  Falta recuperar

                </p>

                <h2 className="mt-2 text-2xl font-bold text-orange-400">

                  {formatCurrency(
                    faltaRecuperar,
                    settings.currency
                  )}

                </h2>

              </div>

              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">

                <Target
                  className="text-orange-400"
                  size={22}
                />

              </div>

            </div>

            <p className="text-xs text-muted-foreground mt-3">

              Capital pendiente por recuperar.

            </p>

          </CardContent>

        </Card>

        {/* Utilidad */}
{utilidad > 0 && (
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">

          <CardContent className="p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs uppercase tracking-wider text-muted-foreground">

                  Utilidad

                </p>

                <h2 className="mt-2 text-2xl font-bold text-blue-400">

                  {formatCurrency(
                    utilidad,
                    settings.currency
                  )}

                </h2>

              </div>

              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">

                <PiggyBank
                  className="text-blue-400"
                  size={22}
                />

              </div>

            </div>

            <p className="text-xs text-muted-foreground mt-3">

              Solo aparece después de recuperar el 100%.

            </p>

          </CardContent>

        </Card>
        )}

        
      </div>
      {/* =======================================================
                    TIEMPO DE LA INVERSIÓN
      ======================================================= */}

      <Card className="mt-5 border-primary/20 bg-gradient-to-br from-card to-background overflow-hidden">

        <CardHeader>

          <CardTitle className="flex items-center gap-2">

            <Clock3 className="w-5 h-5 text-primary" />

            Tiempo de la inversión

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-3 gap-4">

            {/* Tiempo transcurrido */}

            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5">

              <p className="text-xs uppercase tracking-widest text-muted-foreground">

                Tiempo transcurrido

              </p>

              <div className="mt-3 text-3xl font-bold">

                {meses}

              </div>

              <p className="text-sm text-muted-foreground">

                meses

              </p>

              <div className="mt-2 text-xs text-muted-foreground">

                {dias} días desde el inicio

              </div>

            </div>

            {/* Ritmo */}

            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-5">

              <p className="text-xs uppercase tracking-widest text-muted-foreground">

                Ritmo promedio

              </p>

              <div className="mt-3 text-2xl font-bold text-emerald-400">

                {formatCurrency(
                  ritmoMensual,
                  settings.currency
                )}

              </div>

              <p className="text-sm text-muted-foreground">

                por mes

              </p>

              <div className="mt-2 text-xs text-muted-foreground">

                Promedio de recuperación

              </div>

            </div>

            {/* Tiempo estimado */}

            <div className="rounded-2xl bg-orange-500/5 border border-orange-500/10 p-5">

              <p className="text-xs uppercase tracking-widest text-muted-foreground">

                Tiempo estimado

              </p>

              <div className="mt-3 text-3xl font-bold text-orange-400">

                {mesesRestantes}

              </div>

              <p className="text-sm text-muted-foreground">

                meses

              </p>

              <div className="mt-2 text-xs text-muted-foreground">

                para recuperar el capital

              </div>

            </div>

          </div>

        </CardContent>

      </Card>

      
      

      {/* =====================================================
                  ANÁLISIS AUTOMÁTICO AMARA
===================================================== */}

<Card className="mt-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">

  <CardHeader>
    <CardTitle>
      Análisis AMARA
    </CardTitle>
  </CardHeader>

  <CardContent>

    <div className="space-y-4">

      {/* 0% */}

      {
        porcentajeRecuperado === 0 && (

          <p>

            ⏳ La inversión aún no ha comenzado a recuperarse.
            Cuando registres tus primeras ventas, AMARA empezará
            a mostrar el avance de recuperación del capital.

          </p>

        )
      }

      {/* 1% - 24% */}

      {
        porcentajeRecuperado > 0 &&
        porcentajeRecuperado < 25 && (

          <p>

            🌱 La recuperación del capital apenas comienza.
            Aún queda la mayor parte de la inversión por recuperar.

          </p>

        )
      }

      {/* 25% - 74% */}

      {
        porcentajeRecuperado >= 25 &&
        porcentajeRecuperado < 75 && (

          <p>

            📈 La inversión avanza de forma constante.
            Ya has recuperado una parte importante del capital invertido.

          </p>

        )
      }

      {/* 75% - 99% */}

      {
        porcentajeRecuperado >= 75 &&
        porcentajeRecuperado < 100 && (

          <p>

            🚀 Excelente progreso.
            Falta muy poco para recuperar completamente la inversión.

          </p>

        )
      }

      {/* 100% o más */}

      {
        porcentajeRecuperado >= 100 && (

          <p>

            💰 ¡Felicidades!
            Toda la inversión fue recuperada.
            A partir de este momento cada nuevo ingreso representa utilidad para el negocio.

          </p>

        )
      }

    </div>

  </CardContent>

</Card>
              

    </div>
    {showPartnerModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

    <div className="bg-card rounded-2xl p-6 w-[380px] space-y-4">

      <h2 className="text-xl font-bold">
        Agregar socio
      </h2>

      <input
        className="w-full rounded-lg border p-2"
        placeholder="Nombre"
        value={newPartner.name}
        onChange={(e) =>
          setNewPartner({
            ...newPartner,
            name: e.target.value,
          })
        }
      />

      

      <div className="flex justify-end gap-2">

        <button
          onClick={() => setShowPartnerModal(false)}
          className="px-4 py-2 rounded-lg border"
        >
          Cancelar
        </button>

        <button
          onClick={guardarPartner}
          className="px-4 py-2 rounded-lg bg-primary text-white"
        >
          Guardar
        </button>

      </div>

    </div>

  </div>
)}
</>
  );

}
