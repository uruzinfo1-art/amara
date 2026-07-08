import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatCompactCurrency, isExpenseConfig, isIncomeReal, isExpenseReal } from '../lib/utils';
import { getCategoryStyle } from '../lib/categoryUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowUpRight, ArrowDownRight, Wallet, PieChart as LucidePieChart, Coins, Activity } from 'lucide-react';
import { format, isThisMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import { enrichMovimiento } from '../lib/categoryUtils';
import { FixedExpensesFab } from '../components/FixedExpensesFab';
import { AutoClosureModal } from '../components/AutoClosureModal';
import { ProfilePicture } from '../components/ProfilePicture';
import CreateProfileModal from "../components/CreateProfileModal";
import { TipoTransaccion } from '../types';


export default function DashboardBusinessContinuous() {
  const { profiles, addMovimiento, activeProfile, setActiveProfile, movimientos, categorias, settings, createProfile, loading, bolsillos, updateSettings, monthlyCycles, addMonthlyCycle } = useFinance();
  
  console.log("TIPO PERFIL:", activeProfile?.profile_type);
 
  const navigate = useNavigate();
  const capitalKey = `capitalManual_${activeProfile?.id ?? 0}`;
  const [showBalanceModal, setShowBalanceModal] = React.useState(false);
  const [touchStartY, setTouchStartY] = React.useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = React.useState<number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showCreateProfileModal, setShowCreateProfileModal] = React.useState(false);
  const [capitalManual, setCapitalManual] = React.useState<number>(0);
  React.useEffect(() => {
  const guardado = localStorage.getItem(capitalKey);
  setCapitalManual(guardado ? Number(guardado) : 0);
}, [capitalKey]);
  

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    // Only allow swiping down
    if (currentY > touchStartY) {
       setTouchCurrentY(currentY);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY !== null && touchCurrentY !== null) {
      const diff = touchCurrentY - touchStartY;
      if (diff > 100) { // If dragged down > 100px, close
        setShowBalanceModal(false);
      }
    }
    setTouchStartY(null);
    setTouchCurrentY(null);
  };

  const translateY = (touchCurrentY && touchStartY && touchCurrentY > touchStartY) 
    ? touchCurrentY - touchStartY 
    : 0;


  const [isClosureOpen, setIsClosureOpen] = React.useState(false);
  const [disponiblePrevState, setDisponiblePrevState] = React.useState(0);
  const [monthToCloseState, setMonthToCloseState] = React.useState('');
  const isInitializingCycle = React.useRef(false);

  React.useEffect(() => {
    if (loading || !settings || !monthlyCycles) return;

    const currentMonth = format(new Date(), 'yyyy-MM');
    // Buscar registro EXACTO: month_key = mes actual
    const existingMonth = (monthlyCycles || []).find(c => c.month_key === currentMonth);
    const recordsCount = (monthlyCycles || []).length;
    const showClose = !!(settings.onboarding_completed === true && !existingMonth && recordsCount > 0);

    console.log("currentMonth", currentMonth);
    console.log("existingMonth", existingMonth);
    console.log("recordsCount", recordsCount);
    console.log("showClose", showClose);

    if (showClose) {
      if (recordsCount === 0) {
        if (!isInitializingCycle.current) {
          isInitializingCycle.current = true;
          addMonthlyCycle({
            month_key: currentMonth,
            remaining_balance: 0,
            action_taken: 'initial_cycle'
          }).catch(err => {
            console.error("Error creating initial monthly cycle:", err);
            isInitializingCycle.current = false;
          });
        }
      } else {
        console.log("show monthly close");

        // Calculate the remaining balance of the previous month
        const lastMonthObject = subMonths(new Date(), 1);
        const lastMonthKey = format(lastMonthObject, 'yyyy-MM');

        const prevMonthMovs = movimientos.filter(m => {
          if (isExpenseConfig(m)) return false;
          const d = new Date(m.fecha);
          return d.getFullYear() === lastMonthObject.getFullYear() && d.getMonth() === lastMonthObject.getMonth();
        });
        const prevIncome = prevMonthMovs.filter(isIncomeReal).reduce((acc, c) => acc + c.monto, 0);
        const prevGastos = prevMonthMovs.filter(isExpenseReal).reduce((acc, c) => acc + c.monto, 0);
        const prevMonthRemainder = (settings.remanente_mes_anterior || 0) + prevIncome - prevGastos;

        setDisponiblePrevState(prevMonthRemainder);
        setMonthToCloseState(currentMonth);
        setIsClosureOpen(true);
      }
    }
  }, [movimientos, settings, loading, monthlyCycles]);

  const now = new Date();
  const thisMonthMovimientos = movimientos.filter(m => !isExpenseConfig(m) && isThisMonth(new Date(m.fecha)));
  const lastMonth = subMonths(now, 1);
  const prevMonthMovimientos = movimientos.filter(m => {
    if (isExpenseConfig(m)) return false;
    const d = new Date(m.fecha);
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
  });
  
  const ingresosMes = thisMonthMovimientos
  .filter(
    m =>
      isIncomeReal(m) &&
      m.categoria !== 'Capital inicial'
  )
  .reduce((acc, curr) => acc + curr.monto, 0);

  const gastosMes = thisMonthMovimientos
    .filter(isExpenseReal)
    .reduce((acc, curr) => acc + curr.monto, 0);
    const gananciaHoy = ingresosMes - gastosMes;

  const disponibleMes =
capitalManual
+ ingresosMes
- gastosMes;
  
  const ingresosPrev = prevMonthMovimientos
    .filter(isIncomeReal)
    .reduce((acc, curr) => acc + curr.monto, 0);

  const gastosPrev = prevMonthMovimientos
    .filter(isExpenseReal)
    .reduce((acc, curr) => acc + curr.monto, 0);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return { type: 'up', text: '100%' };
    const diff = current - previous;
    const percent = Math.round((Math.abs(diff) / previous) * 100);
    if (percent === 0) return { type: 'neutral', text: '0%' };
    return { type: diff > 0 ? 'up' : 'down', text: `${percent}%` };
  };

  const renderTrend = (trend: { type: string, text: string } | null, defaultColor: string) => {
    if (!trend) return <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground/50 tracking-wide">Sin datos</span>;
    if (trend.type === 'neutral') return <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground/70 tracking-wide">0%</span>;
    
    return (
      <span className={`text-[9px] sm:text-xs font-semibold ${defaultColor} flex items-center tracking-wide`}>
        {trend.type === 'up' ? '▲' : '▼'} {trend.text}
      </span>
    );
  };
  
  const ingresosTrend = calculateTrend(ingresosMes, ingresosPrev);
  const gastosTrend = calculateTrend(gastosMes, gastosPrev);

  const ahorrosTotal = bolsillos?.filter(b => b.active !== false).reduce((acc, curr) => acc + Number(curr.saldo), 0) || 0;

  const isDeficit = disponibleMes < 0;
  
  let donutData = [];
  const gananciaVisual = Math.max(0, gananciaHoy);
  if (gastosMes === 0 && gananciaVisual === 0) {

  donutData = [
    {
      name: 'Sin datos',
      value: 1,
      color: '#333333'
    }
  ];

} else {

  donutData = [
    {
      name: 'Gastos',
      value: gastosMes,
      color: '#f43f5e'
    },
    {
      name: 'Ganancia',
      value: gananciaVisual,
      color: '#00e676'
    }
  ].filter(item => item.value > 0);

}

  const getPercent = (val: number, customTotal?: number) => {
    const total = customTotal !== undefined ? customTotal : (ingresosMes + (settings.remanente_mes_anterior || 0));
    if (total <= 0) return "0.0";
    const pct = (val / total) * 100;
    return Math.min(pct, 100).toFixed(1);
  };

  const today = new Date();
  const rawDate = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const displayDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  if (loading) return null;

  return (
    <div className="space-y-6">
        
<header className="relative z-50 flex flex-row items-center justify-between mb-6 sm:mb-8 mt-2 sm:mt-4">        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-white/90 dark:to-white/60 flex items-center gap-2">
            ¡Hola, {settings.userName?.split(' ')[0] || 'User'}! <span className="text-2xl sm:text-3xl">👋</span>
          </h1>
          <div className="mt-1 sm:mt-1.5 flex items-center gap-2 text-[12px] sm:text-[13px] font-medium text-muted-foreground/60 w-fit">
            <div className="bg-black/5 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse"></span>
              {activeProfile?.name || 'Perfil'} • {displayDate}
            </div>
          </div>
        </div>
        <div className="flex items-center relative z-10 pl-3">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full shadow-[0_0_20px_rgba(34,197,94,0.15)] cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group/avatar flex items-center justify-center overflow-hidden"
            aria-label="Ir a Ajustes"
          >
            <ProfilePicture 
              name={settings.userName || 'Usuario'} 
              url={settings.avatarUrl} 
              size="md" 
              className="w-11 h-11 sm:w-12 sm:h-12 hover:border-[#00ff80] transition-colors"
            />
          </button>
          {showProfileMenu && (
  <div className="absolute right-0 top-16 w-64 rounded-2xl border bg-card p-2 shadow-xl z-50">
    <div className="space-y-1">
      <div className="space-y-2">
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
  <button
  onClick={() => {
  setShowCreateProfileModal(true);
}}
  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5"
>
  ➕ Nuevo perfil
</button>

</div>

  <div className="border-t border-white/10 my-2"></div>

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
  </div>
)}
        </div>
      </header>

      <div className="grid gap-4 mb-4">
        <Card className="border border-white/10 bg-gradient-to-br from-card/90 via-card/50 to-background/80 backdrop-blur-xl relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.8)] group hover:border-primary/20 transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/20 transition-all duration-500"></div>
          
          {/* Decorative Graph SVG */}
          <div className="absolute bottom-0 left-0 w-full h-[80px] opacity-40 pointer-events-none translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,100 C40,80 80,90 120,50 C160,10 200,60 240,40 C280,20 320,70 360,30 L400,10 L400,100 Z" fill="url(#gradient-primary)" opacity="0.3" />
              <path d="M0,100 C40,80 80,90 120,50 C160,10 200,60 240,40 C280,20 320,70 360,30 L400,10" fill="none" stroke="#00e676" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00e676" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00e676" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-5 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-[12px] font-medium text-muted-foreground/80 uppercase tracking-wider">
              Disponible Hoy
              </CardTitle>
            <button
onClick={async () => {
  const nuevoValor = prompt(
    "¿Con cuánto dinero quieres iniciar hoy?",
    disponibleMes.toString()
  );

  if (nuevoValor !== null) {
    const valor = Number(nuevoValor);

    if (!isNaN(valor)) {

    const nuevoCapital = capitalManual + valor;

setCapitalManual(nuevoCapital);
localStorage.setItem(capitalKey, nuevoCapital.toString());

     const movimientoInicial = {
  
  tipo: 'ingreso' as TipoTransaccion,
  monto: valor,
  categoria: 'Capital inicial',
  descripcion: 'Capital agregado',
  fecha: new Date().toISOString(),

  is_fixed: false,
  frequency: '',
  day_of_month: 0,
  active: true,
  

  
  subtipo: 'capital_inicial'
};

    await addMovimiento(movimientoInicial);
}
  }
}}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(0,230,118,0.15)] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] hover:bg-primary/20 transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </button>
          </CardHeader>
          <CardContent className="relative z-10 p-5 sm:p-6 pt-0 sm:pt-0">
            <div className={`text-[32px] sm:text-5xl font-bold tracking-tight pb-1 ${isDeficit ? 'text-rose-600 dark:text-rose-500' : 'text-neutral-900 dark:text-white'}`}>
              {formatCurrency(disponibleMes, settings.currency)}
            </div>
            <div className="flex items-center mt-3 sm:mt-4 space-x-3">
              <span className={`text-[11px] sm:text-sm font-medium ${isDeficit ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-primary bg-primary/10 border-primary/20'} px-2.5 py-1 rounded-full border flex items-center shadow-[0_0_10px_rgba(0,230,118,0.1)]`}>
                <span className="mr-1">{isDeficit ? '!' : '✓'}</span> {isDeficit ? 'Sobregasto' : 'Líquido'}
              </span>
              <p className="text-[11px] sm:text-sm text-muted-foreground/80">
  Dinero disponible en este momento
</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <Card className="border border-white/5 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500 p-3 sm:p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
               <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400/90 uppercase tracking-widest">
Ventas del día
</span>
               <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-sm sm:rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow duration-500">
                 <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />
               </div>
            </div>
            <div className="text-[13px] sm:text-[17px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 break-words leading-tight">
              {formatCurrency(ingresosMes, settings.currency)}
            </div>
            <div className="flex items-center mt-1.5 sm:mt-2">
              {renderTrend(ingresosTrend, 'text-emerald-400')}
            </div>
          </div>
        </Card>

        <Card className="border border-white/5 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-rose-500/30 transition-all duration-500 p-3 sm:p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
             <div className="flex items-center justify-between mb-2.5 sm:mb-3">
               <span className="text-[10px] sm:text-[11px] font-medium text-rose-400/90 uppercase tracking-widest">Gastos del día</span>
               <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-sm sm:rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)] group-hover:shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-shadow duration-500">
                 <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-400" />
               </div>
            </div>
            <div className="text-[13px] sm:text-[17px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 break-words leading-tight">
              {formatCurrency(gastosMes, settings.currency)}
            </div>
            <div className="flex items-center mt-1.5 sm:mt-2">
              {renderTrend(gastosTrend, 'text-rose-400')}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="lg:col-span-4 border border-white/10 bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.8)]focus:outline-none ">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10 px-5 sm:px-6 pt-5 sm:pt-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-500">
                <LucidePieChart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <CardTitle className="text-[13px] sm:text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">
                Resumen del día
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 px-5 sm:px-6 pb-6">
            <div className="flex items-center justify-center w-full h-[200px] sm:h-[240px] relative mt-2 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>

                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                   
                    isAnimationActive={false}
                    innerRadius="75%"
                    outerRadius="100%"
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={12}
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                        pointerEvents="none"
                      />
                    ))}
                  </Pie>
                </PieChart >
              </ResponsiveContainer>

              {/* Inner Text for Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-[11px] sm:text-xs uppercase tracking-widest mb-1 ${isDeficit ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>
                  HOY
                </span>
                <span className={`text-xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${isDeficit ? 'from-rose-400 to-rose-600' : 'from-white to-white/70'}`}>
                  {formatCurrency(gananciaHoy, settings.currency)}
                </span>
                <span className={`text-[10px] sm:text-xs font-medium mt-1 ${isDeficit ? 'text-rose-500/80' : 'text-muted-foreground/80'}`}>
                  Ganancia
                </span>
              </div>
            </div>

            {/* Horizontal Mini Indicators */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5">
              {/* Disponible Indicator */}
              <div className="flex flex-col items-center sm:items-start p-2.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all duration-300">
                <div className="flex items-center space-x-1.5 mb-1.5 sm:mb-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_rgba(0,230,118,0.5)]"></div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Disponible</span>
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-center sm:text-left break-words w-full">{formatCurrency(disponibleMes, settings.currency)}</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-1 whitespace-nowrap font-medium">Hoy</span>
              </div>

              {/* Ingresos Indicator */}
              <div className="flex flex-col items-center sm:items-start p-2.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all duration-300">
                <div className="flex items-center space-x-1.5 mb-1.5 sm:mb-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
  Ventas
</span>
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-center sm:text-left break-words w-full">{formatCurrency(ingresosMes, settings.currency)}</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-1 whitespace-nowrap font-medium">Hoy</span>
              </div>

              {/* Gastos Indicator */}
              <div className="flex flex-col items-center sm:items-start p-2.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all duration-300">
                <div className="flex items-center space-x-1.5 mb-1.5 sm:mb-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
  Gastos
</span>
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-center sm:text-left break-words w-full">{formatCurrency(gastosMes, settings.currency)}</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-1 whitespace-nowrap font-medium">Hoy </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border border-white/5 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
  Movimientos de hoy
</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
               {movimientos
                 .filter(m => {
                   if (isExpenseConfig(m)) return false;
                   if (m.tipo === 'retiro_ahorro' || m.categoria?.startsWith('retiro_bolsillo_')) return false;
                   if (m.categoria?.startsWith('bolsillo_') && m.tipo !== 'ahorro') return false;
                   if (m.tipo === 'transferencia' && m.categoria !== 'ahorro') return false;
                   return true;
                 })
                 .slice(0, 5).map(mov => {
                 const { catStyle, CatIcon, displayName, secondaryInfo } = enrichMovimiento(mov, categorias, bolsillos);
                 const isRetiro = mov.categoria?.startsWith('retiro_bolsillo_');
                 const isIngreso = mov.tipo === 'ingreso';

                 return (
                 <div key={mov.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition-colors">
                   <div className="flex items-center space-x-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 ${catStyle.bgClass} ${catStyle.colorClass}`}>
                       <CatIcon className="w-5 h-5"/>
                     </div>
                     <div>
                       <p className="font-medium text-[14px] leading-none">{displayName}</p>
                       <div className="flex items-center text-[11px] text-muted-foreground mt-1.5 space-x-1">
                         <span>{secondaryInfo}</span>
                         <span>•</span>
                         <span>{format(new Date(mov.fecha), 'dd MMM', {locale: es})}</span>
                       </div>
                     </div>
                   </div>
                   <div className={`font-semibold text-[15px] ${isIngreso ? 'text-primary' : (isRetiro ? 'text-blue-400' : 'text-foreground/90')}`}>
                     {isIngreso ? '+' : '-'}{formatCurrency(mov.monto, settings.currency)}
                   </div>
                 </div>
               )})}
               {movimientos.filter(m => {
                    if (isExpenseConfig(m)) return false;
                    if (m.tipo === 'retiro_ahorro' || m.categoria?.startsWith('retiro_bolsillo_')) return false;
                    if (m.categoria?.startsWith('bolsillo_') && m.tipo !== 'ahorro') return false;
                    if (m.tipo === 'transferencia' && m.categoria !== 'ahorro') return false;
                    return true;
                  }).length === 0 && (
                 <p className="text-sm text-muted-foreground text-center py-4">Aún no hay movimientos registrados.</p>
               )}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Desglose Balance (Rendered outside to break stacking context) */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-500">
          {/* Overlay con blur y oscurecimiento para sensación de profundidad */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-md" 
            onClick={() => setShowBalanceModal(false)}
          ></div>
          
          <div 
            className="relative w-full max-w-[420px] bg-gradient-to-b from-card/95 to-background border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-[100%] sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-500"
            style={{ transform: `translateY(${translateY}px)`, transition: touchStartY === null ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
             {/* decorative glow verde */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>
             
             {/* Drag indicator area para mobile */}
             <div 
               className="w-full flex justify-center pt-4 pb-2 sm:hidden cursor-pointer relative z-20"
               onClick={() => setShowBalanceModal(false)}
             >
               <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
             </div>

             <div className="relative z-10 px-6 sm:px-10 pt-4 sm:pt-10 pb-8 sm:pb-10">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Cálculo de Balance</h3>
                 <button 
                   onClick={() => setShowBalanceModal(false)}
                   className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-colors hidden sm:flex"
                 >
                   <span className="text-muted-foreground text-xs font-bold">✕</span>
                 </button>
               </div>
               
               <div className="space-y-6">
                 {/* Ventas */}
                 <div className="flex justify-between items-center group">
                   <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 rounded-2xl bg-[#00e676]/10 flex items-center justify-center border border-[#00e676]/20 shadow-[0_0_15px_rgba(0,230,118,0.1)] group-hover:shadow-[0_0_20px_rgba(0,230,118,0.2)] transition-shadow">
                        <ArrowDownRight className="w-5 h-5 text-[#00e676]" />
                     </div>
                     <div className="flex flex-col">
                       <span className="font-semibold text-sm sm:text-base text-foreground/90">Ventas</span>
                       <span className="text-[11px] sm:text-xs text-muted-foreground">Este mes</span>
                     </div>
                   </div>
                   <span className="font-bold text-lg sm:text-xl text-[#00e676]">{formatCurrency(ingresosMes, settings.currency)}</span>
                 </div>

                 {/* Costos */}
                 <div className="flex justify-between items-center group">
                   <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] group-hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-shadow">
                        <ArrowUpRight className="w-5 h-5 text-rose-400" />
                     </div>
                     <div className="flex flex-col">
                       <span className="font-semibold text-sm sm:text-base text-foreground/90">Costos</span>
                       <span className="text-[11px] sm:text-xs text-muted-foreground">Este mes (incluye fijos y de ahorro)</span>
                     </div>
                   </div>
                   <span className="font-bold text-lg sm:text-xl text-rose-400">-{formatCurrency(gastosMes, settings.currency)}</span>
                 </div>

                 
               </div>

               {/* Divider */}
               <div className="w-full h-[2px] bg-white/10 my-8 rounded-full"></div>

               {/* Capital Disponible */}
               <div className="flex justify-between items-center mb-6 relative p-4 rounded-3xl bg-white/[0.02] border border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                 <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Wallet className="w-5 h-5 text-primary" />
                   </div>
                   <span className="font-semibold text-sm sm:text-base text-foreground/90">
  Capital Líquido
</span>
                 </div>
                 <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${isDeficit ? 'from-rose-400 to-rose-600' : 'from-[#00e676] to-[#00e676]/70'}`}>
                   {formatCurrency(disponibleMes, settings.currency)}
                 </span>
               </div>

               {/* Ahorros */}
               <div className="flex justify-between items-center group bg-white/[0.01] p-3 -mx-3 rounded-2xl">
                 <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-shadow">
                      <Coins className="w-4 h-4 text-blue-400" />
                   </div>
                   <div className="flex flex-col">
                     <span className="font-semibold text-[#00e676]">Ahorrado en Bolsillos</span>
                     <span className="text-[10px] sm:text-[11px] text-muted-foreground/70">Dinero real apartado</span>
                   </div>
                 </div>
                 <span className="font-bold text-base sm:text-lg text-blue-400">{formatCurrency(ahorrosTotal, settings.currency)}</span>
                </div>

                {/* Capital Total */}
                <div className="flex justify-between items-center group bg-[#00e676]/5 border border-[#00e676]/10 p-3 -mx-3 rounded-2xl mt-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-400/20">
                       <Activity className="w-4 h-4 text-[#00e676]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs sm:text-sm text-[#00e676]">Capital Total del Negocio</span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground/70">Ventas netas + ahorros</span>
                    </div>
                  </div>
                  <span className="font-bold text-base sm:text-lg text-[#00e676]">{formatCurrency(disponibleMes + ahorrosTotal, settings.currency)}</span>
               </div>
             </div>
          </div>
        </div>
      )}
      {showCreateProfileModal && (
  <CreateProfileModal
    onSelect={async (tipo) => {
      const nombre = prompt("Nombre del perfil");
      if (!nombre) return;

      if (tipo === "home") {
        await createProfile(nombre, "home");
      }

      if (tipo === "continuous") {
        await createProfile(nombre, "business_continuous");
      }

      if (tipo === "productive") {
        await createProfile(nombre, "business_productive");
      }

      setShowCreateProfileModal(false);
      setShowProfileMenu(false);
    }}
  />
)}
      <AutoClosureModal isOpen={isClosureOpen} onClose={() => setIsClosureOpen(false)} disponiblePrev={disponiblePrevState} currentMonth={monthToCloseState} />
      <FixedExpensesFab />
    </div>
  );
}
