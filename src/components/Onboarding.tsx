import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { AmaraLogoIcon } from './AmaraLogo';
import { Check, ArrowRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dashboardImg from '../assets/tutorial/dashboard.jpeg';
import movimientosImg from '../assets/tutorial/movimientos.jpeg';
import bolsillosImg from '../assets/tutorial/bolsillos.jpeg';
import perfil1 from '../assets/tutorial/perfil1.jpeg';

export function Onboarding() {
  const { updateSettings, profiles, renameProfile } = useFinance();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pasos:
  // 1: Logo (auto ~2.7s)  2: Frase (auto 3s)  3: Nombre  4: Moneda
  // 5-10: 6 tarjetas cortas (panel, movimientos, bolsillos, perfiles, WhatsApp, listo)
  const [step, setStep] = useState(1);
  const [isDissolving, setIsDissolving] = useState(false);

  const [userName, setUserName] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [errorStr, setErrorStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (step === 1) {
      const dissolveTimer = setTimeout(() => setIsDissolving(true), 1000);
      const nextTimer = setTimeout(() => setStep(2), 2700);
      return () => {
        clearTimeout(dissolveTimer);
        clearTimeout(nextTimer);
      };
    }
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => setStep(3), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Sugerir el nombre desde la cuenta
  useEffect(() => {
    if (user && !userName) {
      const suggested = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      if (suggested) {
        setUserName(suggested.charAt(0).toUpperCase() + suggested.slice(1));
      }
    }
  }, [user]);

  // Cierre del onboarding: guarda ajustes, nombra el perfil por defecto con el
  // nombre que eligió el usuario, y entra a la app.
  const finalizar = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorStr('');
    try {
      const nombre = userName.trim() || 'Usuario';

      await updateSettings({
        userName: nombre,
        currency,
        theme: 'dark',
        onboarding_completed: true,
      });

      // El perfil por defecto se crea solo con el prefijo del correo; lo
      // renombramos con el nombre real.
      const perfilDefault = profiles.find((p) => p.is_default) ?? profiles[0];
      if (perfilDefault && perfilDefault.name !== nombre) {
        try {
          await renameProfile(perfilDefault.id, nombre);
        } catch (e) {
          console.warn('No se pudo renombrar el perfil por defecto:', e);
        }
      }

      navigate('/');
    } catch (err: any) {
      console.error('Error al finalizar el onboarding:', err);
      setErrorStr(err?.message || 'Ocurrió un error inesperado al iniciar.');
    } finally {
      setIsSaving(false);
    }
  };

  // Hojas al viento de la pantalla 1
  const PARTICLE_COUNT = 30;
  const particles = React.useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
      const driftY = -80 - Math.random() * 160;
      const driftX = 100 + Math.random() * 220;
      const driftRotation = (Math.random() - 0.5) * 400;
      const scale = 0.5 + Math.random() * 0.7;
      const delay = Math.random() * 0.3;
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

  // Tarjeta a pantalla completa (pasos 5-10): imagen de fondo opcional + texto abajo
  const Tarjeta = ({
    image,
    tag,
    titulo,
    texto,
    boton,
    onNext,
  }: {
    image?: string;
    tag: string;
    titulo: string;
    texto: React.ReactNode;
    boton: string;
    onNext: () => void;
  }) => (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {image ? (
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#08080a] via-[#050c07] to-neutral-950" />
      )}
      <div className="absolute inset-0 bg-black/55" />

      <div className="absolute bottom-10 left-6 right-6 z-10 space-y-4">
        <span className="text-[#00E676] text-xs uppercase tracking-[0.25em] font-bold">
          {tag}
        </span>
        <h2 className="text-3xl font-black text-white leading-tight">{titulo}</h2>
        <p className="text-sm text-white/90 leading-relaxed">{texto}</p>

        <Button
          className="w-full h-12 rounded-2xl bg-[#00E676] hover:bg-[#00c853] text-black font-black uppercase tracking-wide"
          disabled={isSaving}
          onClick={onNext}
        >
          {boton}
        </Button>

        {step < 10 && (
          <button
            onClick={finalizar}
            disabled={isSaving}
            className="w-full text-center text-xs text-white/50 hover:text-white/80"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#08080a] via-[#050c07] to-neutral-950 overflow-hidden font-sans text-white select-none">

      <style>{`
        @keyframes leafDrift {
          0% { transform: translate(0, 0) rotate(0deg) scale(0.3); opacity: 0; }
          15% { opacity: 0.95; }
          80% { opacity: 0.45; }
          100% { transform: translate(var(--drift-x), var(--drift-y)) rotate(var(--drift-rotation)) scale(var(--drift-scale)); opacity: 0; }
        }
        .animate-leaf-drift {
          position: absolute;
          animation-name: leafDrift;
          animation-timing-function: cubic-bezier(0.12, 0.6, 0.45, 1);
          animation-fill-mode: forwards;
          pointer-events: none;
        }
      `}</style>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col justify-center h-full">

        {step === 1 && (
          <div className="flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-500">
            <div className="relative mb-6">
              <div className={`transition-all duration-700 ease-in-out ${isDissolving ? 'opacity-0 scale-90 translate-x-[20px] blur-[3px]' : 'opacity-100 scale-100'}`}>
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl opacity-50 scale-125"></div>
                <AmaraLogoIcon size={120} />
              </div>

              {isDissolving && particles.map((p) => (
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
          <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-8 animate-in fade-in duration-700">
            <span className="text-[28px] shrink-0 animate-bounce">🌱</span>
            <div className="space-y-4 relative">
              <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight leading-snug text-slate-100 px-4">
                "No es tu salario lo que te hace rico.
                <br />
                <span className="text-[#00E676]">Son tus hábitos financieros."</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-mono tracking-wider italic">
                — Inspirado por Robert Kiyosaki
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
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
                    if (e.key === 'Enter' && userName.trim()) setStep(4);
                  }}
                />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed pl-1 text-center">
                Con este nombre se llamará tu primer perfil y así te saludará AMARA.
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
          <div className="bg-[#121214]/65 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] animate-in slide-in-from-bottom-8 duration-300">
            <div className="space-y-2 text-center text-ellipsis">
              <span className="text-[#00E676] text-sm font-mono uppercase tracking-[0.2em] font-semibold block">Tu Moneda</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                Selecciona tu moneda
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2">
              {[
                { code: 'COP', label: 'Peso Colombiano', symbol: 'COP $' },
                { code: 'USD', label: 'Dólar Estadounidense', symbol: 'USD $' },
                { code: 'EUR', label: 'Euro Oficial', symbol: 'EUR €' },
                { code: 'MXN', label: 'Peso Mexicano', symbol: 'MXN $' },
              ].map((item) => {
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

            {errorStr && <p className="text-xs text-rose-500 font-medium text-center">{errorStr}</p>}

            <Button
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-black font-extrabold tracking-wide text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              onClick={() => setStep(5)}
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 5 && (
          <Tarjeta
            image={dashboardImg}
            tag="Tu panel"
            titulo="Todo tu dinero de un vistazo"
            texto="Aquí ves cuánto te queda disponible este mes, tus ingresos, tus gastos y tus ahorros."
            boton="Continuar"
            onNext={() => setStep(6)}
          />
        )}

        {step === 6 && (
          <Tarjeta
            image={movimientosImg}
            tag="Movimientos"
            titulo="Registra lo que entra y sale"
            texto="Con el botón + agregas un gasto, un ingreso o un gasto fijo. También puedes hacerlo hablándole a AMARA por WhatsApp."
            boton="Continuar"
            onNext={() => setStep(7)}
          />
        )}

        {step === 7 && (
          <Tarjeta
            image={bolsillosImg}
            tag="Bolsillos"
            titulo="Aparta plata para tus metas"
            texto="Guarda dinero para un viaje, una emergencia o lo que quieras. AMARA lo separa de tu disponible para que no lo gastes por accidente."
            boton="Continuar"
            onNext={() => setStep(8)}
          />
        )}

        {step === 8 && (
          <Tarjeta
            image={perfil1}
            tag="Perfiles"
            titulo="Un espacio por cada cosa"
            texto={
              <>
                Empiezas con tu perfil de Hogar. Cuando quieras, crea perfiles
                aparte para tus negocios: 🍞 flujo continuo (tiendas, servicios) o
                🪴 ciclo productivo (agro, ganadería). Cada perfil lleva sus
                cuentas por separado.
              </>
            }
            boton="Continuar"
            onNext={() => setStep(9)}
          />
        )}

        {step === 9 && (
          <Tarjeta
            tag="WhatsApp"
            titulo="Usa AMARA por chat"
            texto="Puedes registrar y consultar todo hablándole a AMARA por WhatsApp. Conéctalo cuando quieras desde Ajustes → Conectar con WhatsApp."
            boton="Continuar"
            onNext={() => setStep(10)}
          />
        )}

        {step === 10 && (
          <Tarjeta
            tag="Listo"
            titulo="Ya puedes empezar"
            texto="El tutorial completo, con el detalle de cada función, está siempre en Ajustes."
            boton={isSaving ? 'Entrando...' : 'Entrar a AMARA'}
            onNext={finalizar}
          />
        )}

      </div>
    </div>
  );
}
