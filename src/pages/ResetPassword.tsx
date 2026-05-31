import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {

  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {

    const recoveryUrl = localStorage.getItem('recovery_url');

    console.log('RECOVERY URL:', recoveryUrl);

    if (recoveryUrl) {

      const hash = recoveryUrl.split('#')[1];

      if (hash) {

        const params = new URLSearchParams(hash);

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        console.log('ACCESS:', access_token);
        console.log('REFRESH:', refresh_token);

        if (access_token && refresh_token) {

          supabase.auth.setSession({
            access_token,
            refresh_token
          });
        }
      }
    }

  }, []);

  const handleUpdatePassword = async () => {

    setError('');
    setMessage('');

    if (password !== confirmPassword) {

      setError('Las contraseñas no coinciden');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {

      setError(error.message);
      return;
    }

    localStorage.removeItem('recovery_url');

    setMessage('Contraseña actualizada correctamente');

    setTimeout(() => {

      navigate('/auth');

    }, 2000);
  };

  return (

    <div className="min-h-screen bg-background flex items-center justify-center p-6">

      <div className="w-full max-w-md space-y-4">

        <h1 className="text-2xl font-bold">
          Restablecer contraseña
        </h1>

        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg"
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-3 rounded-lg"
        />

        <button
          onClick={handleUpdatePassword}
          className="w-full p-3 rounded-lg bg-green-600 text-white"
        >
          Actualizar contraseña
        </button>

        {message && (
          <p className="text-green-500">
            {message}
          </p>
        )}

        {error && (
          <p className="text-red-500">
            {error}
          </p>
        )}

      </div>

    </div>
  );
}