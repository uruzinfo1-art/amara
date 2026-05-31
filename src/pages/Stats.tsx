import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency, formatCompactCurrency, isExpenseConfig, isIncomeReal, isExpenseReal, isAhorroIn, isAhorroOut, isGastoReal, isGastoAhorro } from '../lib/utils';
import { enrichMovimiento } from '../lib/categoryUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Flame, Award, AlertCircle, Sparkles, Activity } from 'lucide-react';

export function Stats() {
  const { movimientos, categorias, bolsillos, settings } = useFinance();

  const now = new Date();
  
  // Si no hay movimientos en absoluto, mostrar estado vacío premium
  if (movimientos.length === 0) {
    return (
      <div className="space-y-6 sm:space-y-8 pb-24 md:pb-6 h-full max-w-5xl mx-auto animate-in fade-in duration-500">
         <header className="flex flex-row items-center justify-between mb-6 sm:mb-8 mt-2 sm:mt-4 p-5 sm:p-7 bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-2xl border border-white/[0.08] rounded-3xl sm:rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.6)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>
            <div className="relative z-10 w-full">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-white/90 dark:to-white/60">
                Estadísticas
              </h1>
              <p className="text-[13px] sm:text-[15px] text-muted-foreground/80 mt-1 sm:mt-1.5 font-medium tracking-wide">
                Resumen financiero inteligente
              </p>
            </div>
         </header>

         <div className="border border-white/5 bg-card/40 backdrop-blur-md flex flex-col items-center justify-center p-12 py-20 text-center rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 mb-5 shadow-inner backdrop-blur-xl">
                <Activity className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 tracking-tight">Sin actividad reciente</h3>
            <p className="text-muted-foreground text-sm max-w-[280px] font-medium leading-relaxed">
                Registra tus primeros movimientos para comenzar a generar insights financieros útiles.
            </p>
         </div>
      </div>
    );
  }

  // Helpers
  const getStatsForDate = (date: Date) => {
    const movs = movimientos.filter(m => !isExpenseConfig(m) && isSameMonth(new Date(m.fecha), date));
    const ingresos = movs.filter(isIncomeReal).reduce((a, b) => a + b.monto, 0);
    const gastoReal = movs.filter(isGastoReal).reduce((a, b) => a + b.monto, 0);
    const gastoAhorro = movs.filter(isGastoAhorro).reduce((a, b) => a + b.monto, 0);
    return { ingresos, gastoReal, gastoAhorro, movs };
  };

  const currentStats = getStatsForDate(now);
  const prevStats = getStatsForDate(subMonths(now, 1));

  const calculateGrowth = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const ingresosGrowth = calculateGrowth(currentStats.ingresos, prevStats.ingresos);
  const gastorealGrowth = calculateGrowth(currentStats.gastoReal, prevStats.gastoReal);
  const gastoahorroGrowth = calculateGrowth(currentStats.gastoAhorro, prevStats.gastoAhorro);

  // Month Chart Data (Last 6 months)
  const monthData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(now, i);
    const stats = getStatsForDate(date);
    return {
      month: format(date, 'MMM', { locale: es }),
      ingresos: stats.ingresos,
      gastos: stats.gastoReal,
      ahorros: stats.gastoAhorro
    };
  }).reverse();

  // Expenses by Category (Current Month)
  const expensesByCategory = new Map();
  currentStats.movs
    .filter(isGastoReal)
    .forEach(m => {
      const enriched = enrichMovimiento(m, categorias, bolsillos);
      const name = enriched.displayName;
      const current = expensesByCategory.get(name) || { 
        value: 0, 
        color: enriched.catStyle.hexColor, 
        icon: enriched.CatIcon, 
        bgClass: enriched.catStyle.bgClass, 
        colorClass: enriched.catStyle.colorClass 
      };
      expensesByCategory.set(name, {
        ...current,
        value: current.value + m.monto,
      });
    });

  const topCategories = Array.from(expensesByCategory.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a,b) => b.value - a.value);

  const totalGastosMes = currentStats.gastoReal;

  // Insights
  const insights = [];
  if (topCategories.length > 0) {
    insights.push({
      id: 1,
      icon: Flame,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      title: 'Mayor Gasto',
      desc: `Tu mayor gasto fue en ${topCategories[0].name.toLowerCase()} (${formatCompactCurrency(topCategories[0].value)}).`
    });
  }

  if (gastorealGrowth < 0 && prevStats.gastoReal > 0) {
    insights.push({
      id: 2,
      icon: TrendingDown,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      title: 'Gastos Reducidos',
      desc: `Redujiste tus gastos reales un ${Math.abs(gastorealGrowth).toFixed(0)}% respecto al mes pasado.`
    });
  } else if (gastorealGrowth > 10) {
    insights.push({
      id: 3,
      icon: AlertCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      title: 'Gastos Elevados',
      desc: `Tus gastos reales aumentaron un ${gastorealGrowth.toFixed(0)}% este mes.`
    });
  }

  if (currentStats.gastoAhorro > prevStats.gastoAhorro && currentStats.gastoAhorro > 0) {
    insights.push({
      id: 4,
      icon: Award,
      color: 'text-[#3b82f6]',
      bg: 'bg-[#3b82f6]/10',
      title: 'Buen Ahorro',
      desc: 'Ahorraste más que el mes pasado. ¡Excelente disciplina!'
    });
  } else if (ingresosGrowth > 0) {
    insights.push({
      id: 5,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      title: 'Ingresos Arriba',
      desc: `Tus ingresos crecieron un ${ingresosGrowth.toFixed(0)}% este mes.`
    });
  }

  const SummaryCard = ({ title, amount, growth, isExpense, colorHeader }: { title: string, amount: number, growth: number, isExpense: boolean, colorHeader: string }) => {
    const isPositiveTrend = growth >= 0;
    const isGood = isExpense ? !isPositiveTrend : isPositiveTrend;
    const trendColor = isGood ? 'text-[#00e676]' : 'text-rose-400';
    const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;
    const formattedGrowth = Math.abs(growth).toFixed(0);

    return (
      <div className="p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.3)] space-y-3 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
         <div className={`absolute top-0 right-0 w-32 h-32 ${colorHeader} rounded-bl-full bg-opacity-20 opacity-20 blur-[24px] group-hover:opacity-40 transition-opacity`}></div>
         <h3 className="text-xs sm:text-[13px] font-medium text-muted-foreground uppercase tracking-widest relative z-10">{title}</h3>
         <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground relative z-10">{formatCompactCurrency(amount)}</div>
         <div className="flex items-center space-x-2 text-[10px] sm:text-xs relative z-10">
           <div className={`flex items-center space-x-1 ${trendColor} bg-white/5 px-2.5 py-1 rounded-full border border-white/[0.05]`}>
              <TrendIcon className="w-3 h-3" />
              <span className="font-medium tracking-wide">{formattedGrowth}%</span>
           </div>
           <span className="text-muted-foreground/70 tracking-wide font-medium">vs mes pasado</span>
         </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-md">
          <p className="font-medium text-sm mb-3 capitalize text-muted-foreground">{label}</p>
          <div className="space-y-2.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium capitalize text-foreground/90">{entry.name}</span>
                </div>
                <span className="text-sm font-bold">{formatCurrency(entry.value, settings.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-24 md:pb-6 h-full max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-row items-center justify-between mb-6 sm:mb-8 mt-2 sm:mt-4 p-5 sm:p-7 bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-2xl border border-white/[0.08] rounded-3xl sm:rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.6)] relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>
         <div className="relative z-10 w-full">
           <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-white/90 dark:to-white/60">
             Estadísticas
           </h1>
           <p className="text-[13px] sm:text-[15px] text-muted-foreground/80 mt-1 sm:mt-1.5 font-medium tracking-wide">
             Resumen financiero inteligente
           </p>
         </div>
      </header>

      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <SummaryCard 
          title="Ingresos" 
          amount={currentStats.ingresos} 
          growth={ingresosGrowth} 
          isExpense={false} 
          colorHeader="bg-[#00e676]"
        />
        <SummaryCard 
          title="Gasto Real" 
          amount={currentStats.gastoReal} 
          growth={gastorealGrowth} 
          isExpense={true} 
          colorHeader="bg-rose-500"
        />
        <SummaryCard 
          title="Gasto Ahorro" 
          amount={currentStats.gastoAhorro} 
          growth={gastoahorroGrowth} 
          isExpense={false} 
          colorHeader="bg-[#3b82f6]"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfica Principal */}
        <Card className="lg:col-span-2 border-white/[0.08] bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <CardHeader className="px-6 py-5 sm:px-7 sm:py-6 pb-2 sm:pb-2">
            <CardTitle className="text-[13px] sm:text-sm rounded-full bg-white/5 w-max px-4 py-1.5 font-medium border border-white/10 text-muted-foreground tracking-wide">
              Evolución últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] sm:h-[320px] p-2 pl-0 sm:p-6 sm:pl-0 sm:pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-[0.03]" vertical={false} />
                  <XAxis dataKey="month" stroke="currentColor" className="opacity-50 text-[10px] sm:text-xs capitalize" tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="currentColor" className="opacity-50 text-[10px] sm:text-xs" tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} dx={-10} width={60} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'currentColor', opacity: 0.05}} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#00e676" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="gastos" name="Gasto Real" fill="#f43f5e" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="ahorros" name="Gasto Ahorro" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col">
          {/* Insights */}
          <Card className="border-white/[0.08] bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-xl shrink-0 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <CardHeader className="px-6 py-5 border-b border-white/[0.05] bg-white/[0.01]">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2.5 tracking-tight text-foreground/90">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Inteligencia Financiera</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
               <div className="grid grid-cols-1 gap-3.5">
                {insights.slice(0, 2).map(insight => {
                    const Icon = insight.icon;
                    return (
                      <div key={insight.id} className="p-4 rounded-[20px] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 flex space-x-3 items-start group">
                         <div className={`p-2.5 rounded-xl border border-white/10 ${insight.bg} ${insight.color} shrink-0 group-hover:scale-105 transition-transform`}>
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                         </div>
                         <div>
                            <h4 className="font-bold text-[13px] sm:text-sm mb-1 text-foreground/90 tracking-tight">{insight.title}</h4>
                            <p className="text-[11px] sm:text-[13px] text-muted-foreground/80 leading-relaxed font-medium">{insight.desc}</p>
                         </div>
                      </div>
                    )
                })}
                {insights.length === 0 && (
                   <div className="p-6 rounded-[20px] bg-white/[0.02] border border-white/[0.03] text-center">
                     <p className="text-[13px] text-muted-foreground font-medium">Más actividad necesaria este mes para generar insights.</p>
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categorías Principales */}
          <Card className="border-white/[0.08] bg-gradient-to-br from-card/80 to-background/50 backdrop-blur-xl flex-1 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <CardHeader className="px-6 py-5 border-b border-white/[0.05] bg-white/[0.01]">
              <CardTitle className="text-sm font-semibold text-foreground/90 tracking-tight">Principales Gastos (Mes)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
               <div className="space-y-6">
                {topCategories.slice(0, 4).map((cat, idx) => {
                  const percent = totalGastosMes > 0 ? (cat.value / totalGastosMes) * 100 : 0;
                  const Icon = cat.icon;
                  return (
                    <div key={idx} className="flex flex-col space-y-3 group">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl ${cat.bgClass} ${cat.colorClass} border border-white/10 shadow-sm group-hover:scale-105 transition-transform`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-[13px] sm:text-sm text-foreground/90 tracking-tight">{cat.name}</span>
                         </div>
                         <div className="flex items-center space-x-3.5">
                             <span className="font-bold tracking-tight text-[13px] sm:text-sm">{formatCompactCurrency(cat.value)}</span>
                             <span className="text-[11px] sm:text-[13px] font-bold text-muted-foreground/60 w-9 text-right bg-white/[0.03] px-1.5 py-0.5 rounded-md border border-white/[0.05]">{percent.toFixed(0)}%</span>
                         </div>
                      </div>
                      <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden shadow-inner">
                         <div className="h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${percent}%`, backgroundColor: cat.color }}>
                            <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000"></div>
                         </div>
                      </div>
                    </div>
                  );
                })}
                {topCategories.length === 0 && (
                  <p className="text-[13px] text-muted-foreground font-medium text-center py-8">No hay gastos este mes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

