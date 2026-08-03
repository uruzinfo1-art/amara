import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { AmaraLogoIcon } from './AmaraLogo';
import { Check, ArrowRight, User, Home, Lightbulb, Wifi, Tv, CreditCard, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dashboardImg from '../assets/tutorial/dashboard.jpeg';
import movimientosImg from '../assets/tutorial/movimientos.jpeg';
import gastosFijosImg from '../assets/tutorial/gastos-fijos.jpeg';
import bolsillosImg from '../assets/tutorial/bolsillos.jpeg';
import perfiles from "../assets/tutorial/perfiles.png";
import perfil1 from "../assets/tutorial/perfil1.jpeg";

export function Onboarding() {
  const { updateSettings } = useFinance();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Steps in FASE 1 & Flow Extendido:
  // 1: Logo & brand + transformation to leaves (duration 2-3s, auto transition)
  // 2: Robert Kiyosaki quote (duration 3s, auto transition)
  // 3: Name question ("¿Cómo quieres que AMARA te llame?") + Continuar button
  // 4: Currency selection + Continuar button
  // 5: Fixed expenses question ("¿Tienes gastos fijos?") -> Sí / No
  const [step, setStep] = useState(1);
  const [isDissolving, setIsDissolving] = useState(false);

  // Form State
  const [userName, setUserName] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [errorStr, setErrorStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // PANTALLA 1: Timeouts for automatic transitions (total 2.7s)
  useEffect(() => {
    if (step === 1) {
      const dissolveTimer = setTimeout(() => {
        setIsDissolving(true);
      }, 1000); // starts leaf change at 1.0s

      const nextTimer = setTimeout(() => {
        setStep(2);
      }, 2700); // moves to step 2 at 2.7s

      return () => {
        clearTimeout(dissolveTimer);
        clearTimeout(nextTimer);
      };
    }
  }, [step]);

  // PANTALLA 2: Timeouts for automatic transitions (3.0s duration)
  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        setStep(3);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Pre-populate user name from Auth if available
  useEffect(() => {
    if (user && !userName) {
      const suggested = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      if (suggested) {
        setUserName(suggested.charAt(0).toUpperCase() + suggested.slice(1));
      }
    }
  }, [user]);

  // Final Action: Complete Onboarding and write settings metadata
  const handleOnboardingChoice = async (hasFixedExpenses: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorStr('');
    try {
      if (hasFixedExpenses) {
        // Signal the app context/Transactions to auto-open Gastos Fijos
        localStorage.setItem('amara_open_fixed_expenses_onboarding', 'true');
      }

      // Save user details and onboarding complete in a single atomic update
      await updateSettings({
        userName: userName.trim() || 'Usuario',
        currency: currency,
        theme: 'dark',
        onboarding_completed: true
      });

      if (hasFixedExpenses) {
        // Navigate immediately to the movements tab where BulkFixedExpensesModal will open
        navigate('/transactions');
      } else {
        // Navigate immediately to the dashboard
        navigate('/');
      }
    } catch (err: any) {
      console.error('Error during onboarding save:', err);
      setErrorStr(err?.message || 'Ocurrió un error inesperado al iniciar.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate beautiful hardware-accelerated wind-drift leaves
  const PARTICLE_COUNT = 30;
  const particles = React.useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
      // Wind blowing to the right and slightly upwards
      const driftY = -80 - Math.random() * 160;
      const driftX = 100 + Math.random() * 220;
      const driftRotation = (Math.random() - 0.5) * 400;
      const scale = 0.5 + Math.random() * 0.7;
      const delay = Math.random() * 0.3; // instantaneous spread
      const duration = 1.0 + Math.random() * 1.2;
      const isLeaf = i % 2 === 0;
      const colors = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#a7f3d0'];
      const color = colors[i % colors.length];

      return {
        id: i,
        isLeaf,
        style: {
          '--drift-x': `${driftX}px`,
          '--drift-y': `${driftY}px`,
          '--drift-rotation': `${driftRotation}deg`,
          '--drift-scale': scale,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          color,
          left: `${46 + (Math.random() - 0.5) * 8}%`,
          top: `${36 + (Math.random() - 0.5) * 8}%`,
        } as React.CSSProperties,
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#08080a] via-[#050c07] to-neutral-950 overflow-hidden font-sans text-white select-none">

      {/* Custom CSS animations injection (leafDrift) */}
      <style>{`
        @keyframes leafDrift {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0.3);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          80% {
            opacity: 0.45;
          }
          100% {
            transform: translate(var(--drift-x), var(--drift-y)) rotate(var(--drift-rotation)) scale(var(--drift-scale));
            opacity: 0;
          }
        }
        .animate-leaf-drift {
          position: absolute;
          animation-name: leafDrift;
          animation-timing-function: cubic-bezier(0.12, 0.6, 0.45, 1);
          animation-fill-mode: forwards;
          pointer-events: none;
        }
      `}</style>

      {/* Ambient background blur elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Screen layout wrapper */}
      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col justify-center h-full">

        {step === 1 && (
          /* PANTALLA 1 - IDENTIDAD AMARA */
          <div className="flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-500">

            {/* Logo Emblem holding frame */}
            <div className="relative mb-6">
              {/* Core logo icon with elegant dissolve transition */}
              <div className={`transition-all duration-700 ease-in-out ${isDissolving ? 'opacity-0 scale-90 translate-x-[20px] blur-[3px]' : 'opacity-100 scale-100'}`}>
                {/* Embedded Glow */}
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl opacity-50 scale-125"></div>
                <AmaraLogoIcon size={120} />
              </div>

              {/* Fragmented Particles (wind-like leaves drift) */}
              {isDissolving && particles.map(p => (
                <div key={p.id} className="animate-leaf-drift" style={p.style}>
                  {p.isLeaf ? (
                    <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-current">
                      <path d="M2 22C2 22 6 16 12 16C16 16 22 14 22 8C22 2 16 2 16 2C10 2 6 6 6 12C6 16 2 22 2 22Z" />
                    </svg>
                  ) : (
                    <div className="w-[6px] h-[6px] rounded-full bg-current shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                  )}
                </div>
              ))}
            </div>

            {/* Typography brand frame */}
            <div className={`transition-all duration-1000 delay-100 ${isDissolving ? 'opacity-0 translate-y-2 blur-[2px]' : 'opacity-100 translate-y-0'}`}>
              <h1 className="text-4xl font-extrabold tracking-[0.25em] pl-[0.25em] leading-none uppercase font-sans mb-3 text-white">
                AMARA
              </h1>
              <p className="text-base text-primary/95 italic font-medium tracking-wide">
                Por lo que más amas.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          /* PANTALLA 2 - FILOSOFÍA FINANCIERA */
          <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-8 animate-in fade-in duration-700">
            <span className="text-[28px] shrink-0 animate-bounce">🌱</span>

            <div className="space-y-4 relative">
              <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight leading-snug text-slate-100 px-4">
                "No es tu salario lo que te hace rico.
                <br />
                <span className="text-[#00E676]">Son tus hábitos financieros.</span>"
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-mono tracking-wider italic">
                — Inspirado por Robert Kiyosaki
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          /* PANTALLA 3 - NOMBRE USUARIO */
          <div className="bg-[#121214]/65 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] animate-in slide-in-from-bottom-8 duration-300">
            <div className="space-y-2 text-center overflow-x-hidden">
              <span className="text-[#00E676] text-sm font-mono uppercase tracking-[0.2em] font-semibold block">Iniciemos Juntos</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                ¿Cómo quieres que AMARA te llame?
              </h2>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Ej. Lucho"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="flex h-12 w-full rounded-2xl border border-white/10 bg-black/40 pl-12 pr-4 text-base text-white placeholder:text-neutral-500 focus-visible:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-black/60 transition-all font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && userName.trim()) {
                      setStep(4);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed pl-1 text-center">
                AMARA guardará tu nombre localmente para personalizar tu panel financiero.
              </p>
            </div>

            <Button
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-black font-extrabold tracking-wide text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              disabled={!userName.trim()}
              onClick={() => setStep(4)}
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 4 && (
          /* PANTALLA 4 - MONEDA */
          <div className="bg-[#121214]/65 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] animate-in slide-in-from-bottom-8 duration-300">
            <div className="space-y-2 text-center text-ellipsis">
              <span className="text-[#00E676] text-sm font-mono uppercase tracking-[0.2em] font-semibold block">Tus Monedas</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                Selecciona tu moneda
              </h2>
            </div>

            {/* Currency Selecting Grid */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              {[
                { code: 'COP', label: 'Peso Colombiano', symbol: 'COP $' },
                { code: 'USD', label: 'Dólar Estadounidense', symbol: 'USD $' },
                { code: 'EUR', label: 'Euro Oficial', symbol: 'EUR €' },
                { code: 'MXN', label: 'Peso Mexicano', symbol: 'MXN $' },
              ].map(item => {
                const isSelected = currency === item.code;
                return (
                  <button
                    key={item.code}
                    onClick={() => setCurrency(item.code)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 tracking-normal transition-all duration-300 relative group cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,230,118,0.08)] scale-[1.02]'
                        : 'border-white/5 bg-black/20 hover:border-white/15'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-primary bg-primary/10 rounded-full p-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="text-[17px] font-black font-mono text-white/90">{item.symbol}</span>
                    <span className="text-[11px] text-neutral-400 font-semibold group-hover:text-white/80 transition-colors">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {errorStr && (
              <p className="text-xs text-rose-500 font-medium text-center">{errorStr}</p>
            )}

            <Button
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-black font-extrabold tracking-wide text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              disabled={isSaving}
              onClick={() => setStep(5)}
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
                {step === 5 && (
                  <div className="bg-[#121214]/65 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] animate-in slide-in-from-bottom-8 duration-300">

                    <div className="space-y-2 text-center">

                      <span className="text-[#00E676] text-sm font-mono uppercase tracking-[0.2em] font-semibold block">
                        Tutorial
                      </span>

                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        ¿Quieres aprender a usar AMARA?
                      </h2>

                      <p className="text-sm text-neutral-400">
                         n menos de un minuto conocerás las funciones principales del perfil Home y cómo acceder a los demás perfiles de AMARA.
                      </p>

                    </div>

                    <div className="space-y-3">

                      <Button
                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-black font-extrabold tracking-wide text-xs uppercase"
                        onClick={() => setStep(6)}
                      >
                        Sí, mostrar tutorial
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full h-11 rounded-xl text-neutral-400 hover:text-white"
                        onClick={() => handleOnboardingChoice(false)}
                      >
                        No, ir al dashboard
                      </Button>

                    </div>

                  </div>
                )}
            {step === 6 && (
              <div className="fixed inset-0 z-50 overflow-hidden">

                <img
                  src={dashboardImg}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-black/45" />

                <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">

                  

                    <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
                      Dashboard
                    </span>

                    <h2 className="text-3xl font-black text-white leading-tight">
                      Tu panel financiero personal
                    </h2>

                    <p className="text-sm text-neutral-300 leading-relaxed">
                      Desde aquí podrás conocer tu dinero disponible, ingresos, gastos y ahorros de un solo vistazo.
                    </p>

                    <Button
                      className="w-full h-12 rounded-2xl bg-[#00E676] hover:bg-[#00c853] text-black font-black uppercase tracking-wide"
                      onClick={() => setStep(7)}
                    >
                      Continuar
                    </Button>

                  </div>

                </div>


                    )}
                    {step === 7 && (
  <div className="fixed inset-0 z-50 overflow-hidden">

    <img
      src={perfiles}
      className="absolute inset-0 w-full h-full object-cover"
    />

    <div className="absolute inset-0 bg-black/45" />

    <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">

      <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
        PERFILES
      </span>

      <h2 className="text-3xl font-black text-white leading-tight">
        Administra varios perfiles
      </h2>

      <p className="text-sm text-white/90 leading-relaxed">
        Puedes tener un perfil para tu hogar y crear perfiles independientes para cada negocio. Cada perfil mantiene sus movimientos, estadísticas y configuración totalmente separados.
      </p>

      <Button
        className="w-full h-12 rounded-2xl bg-[#00E676] text-black font-black uppercase"
        onClick={() => setStep(8)}
      >
        Continuar
      </Button>

    </div>

  </div>
)}
{step === 8 && (
  <div className="fixed inset-0 z-50 overflow-hidden">

    <img
      src={perfil1}
      className="absolute inset-0 w-full h-full object-cover"
    />

    <div className="absolute inset-0 bg-black/45" />

    <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">

      <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
        NUEVO PERFIL
      </span>

      <h2 className="text-3xl font-black text-white leading-tight">
        Elige el tipo de perfil correcto
      </h2>

      <p className="text-sm text-white/90 leading-relaxed">
        Cada perfil está diseñado para una necesidad diferente. Puedes crear un perfil para tu hogar, un negocio de ciclo productivo o un negocio de flujo continuo.
      </p>

      <Button
        className="w-full h-12 rounded-2xl bg-[#00E676] text-black font-black uppercase"
        onClick={() => setStep(9)}
      >
        Continuar
      </Button>

    </div>

  </div>
)}
                {step === 9 && (
                  <div className="fixed inset-0 z-50 overflow-hidden">

                    <img
                      src={movimientosImg}
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/45" />

                    <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">

                      <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
                        MOVIMIENTOS
                      </span>

                      <h2 className="text-3xl font-black text-white leading-tight">
                        Registra todos tus movimientos
                      </h2>

                      <p className="text-sm text-white/90 leading-relaxed">
                        Registra ingresos, gastos y ahorros para que AMARA mantenga actualizado tu balance y tus estadísticas.
                      </p>

                      <Button
                        className="w-full h-12 rounded-2xl bg-[#00E676] text-black font-black uppercase"
                        onClick={() => setStep(10)}
                      >
                        Continuar
                      </Button>

                    </div>

                  </div>
                )}

                {step === 10 && (
                  <div className="fixed inset-0 z-50 overflow-hidden">

                    <img
                      src={gastosFijosImg}
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/45" />

                    <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">

                      <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
                        GASTOS FIJOS
                      </span>

                      <h2 className="text-3xl font-black text-white leading-tight">
                        Nunca olvides tus pagos
                      </h2>

                      <p className="text-sm text-white/90 leading-relaxed">
                        Automatiza tus pagos recurrentes.
                        Arriendo, internet, servicios y suscripciones pueden registrarse una sola vez.
                      </p>

                      <Button
                        className="w-full h-12 rounded-2xl bg-[#00E676] text-black font-black uppercase"
                        onClick={() => setStep(11)}
                      >
                        Continuar
                      </Button>

                    </div>

                  </div>
                )}

                {step === 11 && (
                  <div className="fixed inset-0 z-50 overflow-hidden">

                    <img
                      src={bolsillosImg}
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/45" />

                    <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">

                      <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
                        BOLSILLOS
                      </span>

                      <h2 className="text-3xl font-black text-white leading-tight">
                        Organiza tus ahorros por objetivos
                      </h2>

                      <p className="text-sm text-white/90 leading-relaxed">
                        Crea bolsillos para viajes, emergencias, estudios o cualquier meta financiera.
                      </p>

                      <Button
                        className="w-full h-12 rounded-2xl bg-[#00E676] text-black font-black uppercase"
                        onClick={() => setStep(12)}
                      >
                        Entrar a AMARA
                      </Button>

                    </div>

                  </div>
                )}
            {step === 12 && (
              <div className="fixed inset-0 z-50 overflow-hidden">

                <div className="absolute inset-0 bg-gradient-to-br from-[#08080a] via-[#050c07] to-neutral-950" />

                <div className="absolute bottom-10 left-6 right-6 z-10 space-y-5">

                  <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
                    ANTES DE COMENZAR
                  </span>

                  <h2 className="text-3xl font-black text-white leading-tight">
                    Un último consejo
                  </h2>

                  <p className="text-sm text-white/90 leading-relaxed">
                    Te recomendamos registrar primero tus gastos fijos.
                    Esto permitirá que AMARA organice mejor tus finanzas desde el inicio.
                  </p>

                  <p className="text-sm text-white/80 leading-relaxed">
                    Si en algún momento necesitas ayuda, encontrarás un tutorial completo en Ajustes donde se explica cada función de la aplicación paso a paso.
                  </p>

                  <Button
                    className="w-full h-12 rounded-2xl bg-[#00E676] text-black font-black uppercase"
                    onClick={() => handleOnboardingChoice(false)}
                  >
                    Entrar a AMARA
                  </Button>

                </div>

              </div>
            )}

              </div>
            </div>
          );
        }




