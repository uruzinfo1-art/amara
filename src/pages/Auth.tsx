import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, AlertCircle, Database } from 'lucide-react';

import { AmaraLogo } from '../components/AmaraLogo';

export function AuthPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
const handleResetPassword = async () => {
  if (!email) {
    setError('Ingresa tu correo primero');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo:
        'capacitor://localhost/reset-password',
    }
  );

  if (error) {
    setError(error.message);
  } else {
    setMessage(
      'Te enviamos un enlace para recuperar tu contraseña'
    );
  }
};
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!hasSupabaseConfig || !supabase) {
      setError('Las credenciales de Supabase no están configuradas.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Navigation will happen in useEffect once session updates
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Registro exitoso. Revisa tu correo electrónico para confirmar tu cuenta y luego inicia sesión.');
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      console.error("MESSAGE:", err?.message);
      console.error("STACK:", err?.stack);

      setError(
        err?.message ||
        JSON.stringify(err, null, 2) ||
        'Error desconocido'
      );

      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center font-bold text-muted-foreground text-xl">Cargando...</div>;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-500/50 bg-amber-500/5">
          <CardHeader>
             <CardTitle className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <Database className="w-5 h-5" />
                <span>Supabase no configurado</span>
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-amber-700 dark:text-amber-300">
            <p>Para usar la autenticación, necesitas configurar las credenciales de Supabase.</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Abre el panel de Variables de entorno en AI Studio.</li>
              <li>Añade <code>VITE_SUPABASE_URL</code> con tu URL.</li>
              <li>Añade <code>VITE_SUPABASE_ANON_KEY</code> con tu clave anónima.</li>
              <li>Reinicia la aplicación.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8 flex flex-col items-center text-center">
        <AmaraLogo iconSize={100} showText={true} align="center" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600 text-sm flex gap-2 items-start">
                 <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                 <p>{error}</p>
              </div>
            )}
            
            {message && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
                 <p>{message}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Procesando...' : isLogin ? 'Ingresar' : 'Registrarse'}
            </Button>
            <div className="text-right mt-2">
              <button
               type="button"
               className="text-sm text-primary hover:underline"
               onClick={handleResetPassword}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                }}
              >
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground text-center">
         Nota: Para que el inicio de sesión funcione correctamente, <br/>
         Asegúrate de configurar los proveedores de autenticación (Email) y políticas en Supabase Auth.
      </p>
    </div>
  );
}
