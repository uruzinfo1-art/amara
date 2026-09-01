import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MessageCircle, ArrowLeft, Check, Copy } from 'lucide-react';

const NUMERO_WA = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0,O,1,I,L

function generarCodigo(n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return s;
}

export default function ConectarWhatsApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProfile } = useFinance();

  const [codigo, setCodigo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telefonoConectado, setTelefonoConectado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function revisarConexion() {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.phone) {
      setTelefonoConectado(data.phone);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }

  useEffect(() => {
    revisarConexion();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function generar() {
    if (!supabase || !user) return;
    if (!activeProfile) { setError('Primero elige un perfil en Ajustes.'); return; }
    setCargando(true);
    setError(null);
    try {
      let creado: string | null = null;
      for (let intento = 0; intento < 5 && !creado; intento++) {
        const c = generarCodigo();
        const { error: e } = await supabase.from('whatsapp_link_codes').insert({
          code: c,
          user_id: user.id,
          profile_id: activeProfile.id,
        });
        if (!e) creado = c;
        else if (e.code !== '23505') throw e; // 23505 = código repetido, reintenta
      }
      if (!creado) throw new Error('No se pudo generar el código. Intenta de nuevo.');
      setCodigo(creado);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(revisarConexion, 4000);
    } catch (err: any) {
      setError(err.message || 'Error generando el código.');
    } finally {
      setCargando(false);
    }
  }

  const mensajeWA = codigo ? `AMARA ${codigo}` : '';
  const linkWA = `https://wa.me/${NUMERO_WA}?text=${encodeURIComponent(mensajeWA)}`;

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-xl mx-auto">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a Ajustes
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Conectar con WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {telefonoConectado ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm">
              <div className="flex items-center gap-2 font-bold text-emerald-500">
                <Check className="w-4 h-4" /> WhatsApp conectado
              </div>
              <p className="text-muted-foreground mt-1">
                Número terminado en <strong>{telefonoConectado.slice(-4)}</strong>.
                Ya puedes escribirle a AMARA por WhatsApp.
              </p>
            </div>
          ) : !codigo ? (
            <>
              <p className="text-sm text-muted-foreground">
                Genera un código y envíalo por WhatsApp desde tu teléfono. Así AMARA
                sabrá que ese número es tuyo. No tienes que escribir tu número.
              </p>
              <Button className="w-full" onClick={generar} disabled={cargando}>
                {cargando ? 'Generando...' : 'Generar código'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                1. Toca el botón para abrir WhatsApp con el mensaje listo.<br />
                2. Pulsa <strong>enviar</strong> sin cambiar nada.<br />
                3. Vuelve aquí; te avisaremos cuando quede conectado.
              </p>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-widest">
                  Tu código
                </div>
                <div className="text-2xl font-black tracking-[0.2em] mt-1">
                  AMARA {codigo}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`AMARA ${codigo}`);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1500);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                >
                  <Copy className="w-3 h-3" /> {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <a href={linkWA} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">Abrir WhatsApp</Button>
              </a>

              <p className="text-xs text-muted-foreground text-center">
                El código vence en 15 minutos. Si no funciona, genera otro.
              </p>
              <button
                onClick={generar}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Generar otro código
              </button>
            </>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
