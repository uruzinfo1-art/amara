/// <reference types="vite/client" />
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { User, Palette, Coins, LogOut, Calendar, AlertTriangle, Camera, Image as ImageIcon, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { ProfilePicture } from '../components/ProfilePicture';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import TutorialSelector from "../components/TutorialSelector";

import { AmaraLogoIcon } from '../components/AmaraLogo';

// Helper to Centered-Crop & Compress image to WebP (512x512, targeting low payload size)
const compressAndResizeToWebP = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto de canvas 2D'));
          return;
        }

        const size = 512;
        canvas.width = size;
        canvas.height = size;

        const imgWidth = img.width;
        const imgHeight = img.height;
        let srcX = 0;
        let srcY = 0;
        let srcWidth = imgWidth;
        let srcHeight = imgHeight;

        if (imgWidth > imgHeight) {
          srcWidth = imgHeight;
          srcX = (imgWidth - imgHeight) / 2;
        } else if (imgHeight > imgWidth) {
          srcHeight = imgWidth;
          srcY = (imgHeight - imgWidth) / 2;
        }

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
          0,
          0,
          size,
          size
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir archivo WebP'));
            }
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar el archivo de imagen'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo seleccionado'));
    reader.readAsDataURL(file);
  });
};

export function Settings() {
  
  const {
  settings,
  updateSettings,
  resetApp,
  profiles,
  activeProfile,
  setActiveProfile,
  renameProfile
} = useFinance();

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
const [showTutorialSelector, setShowTutorialSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleFileChange = async (file: File) => {
    if (!user) {
      setUploadError('Debes iniciar sesión para subir una imagen.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Crop and convert to WebP
      const croppedBlob = await compressAndResizeToWebP(file);

      // Verify sized blob is within 300KB
      if (croppedBlob.size > 300 * 1024) {
        throw new Error('La imagen comprimida supera los 300 KB permitidos.');
      }

      if (!hasSupabaseConfig || !supabase) {
        throw new Error('Supabase no está configurado.');
      }

      // Ensure bucket exists
      try {
        await supabase.storage.createBucket('profile-images', { public: true });
      } catch (e) {
        // Ignorar
      }

      const filePath = `${user.id}/avatar.webp`;
      const fileDir = user.id;

      // 1. Verificar si existe el avatar actual en la ruta especificada
      let exists = false;
      try {
        const { data: listData } = await supabase.storage
          .from('profile-images')
          .list(fileDir, { search: 'avatar.webp' });
        
        if (listData && listData.some(item => item.name === 'avatar.webp')) {
          exists = true;
        }
      } catch (e) {
        console.warn('Error checking existing file:', e);
      }

      // 2. Si existe: eliminar profile-images/user_id/avatar.webp y esperar confirmación de eliminación
      if (exists) {
        const { error: removeError } = await supabase.storage
          .from('profile-images')
          .remove([filePath]);
        
        if (removeError) {
          throw removeError;
        }

        // 3. Confirmar que el archivo desapareció del bucket (polling)
        let checkExists = true;
        let attempts = 0;
        while (checkExists && attempts < 15) {
          const { data: listCheck } = await supabase.storage
            .from('profile-images')
            .list(fileDir, { search: 'avatar.webp' });
          
          const found = listCheck && listCheck.some(item => item.name === 'avatar.webp');
          if (!found) {
            checkExists = false;
          } else {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      // 4. Subir nuevo avatar.webp
      const { error: uploadErr } = await supabase.storage
        .from('profile-images')
        .upload(filePath, croppedBlob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '0'
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // 5. Actualizar la interfaz de usuario & 6. Refrescar la imagen con el timestamp único
      const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(filePath);
      const uniqueUrl = `${publicUrl}?t=${Date.now()}`;

      // Persistir URL en settings de AMARA
      updateSettings({ avatarUrl: uniqueUrl });

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error al procesar la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      if (hasSupabaseConfig && supabase) {
        const filePath = `${user.id}/avatar.webp`;
        const fileDir = user.id;

        // 1. Borrar archivo en Supabase Storage
        const { error: removeError } = await supabase.storage
          .from('profile-images')
          .remove([filePath]);
          
        if (removeError) {
          console.warn('Advertencia al remover de storage:', removeError);
        }

        // 2. Confirmar que el archivo desapareció del bucket
        let checkExists = true;
        let attempts = 0;
        while (checkExists && attempts < 15) {
          const { data: listCheck } = await supabase.storage
            .from('profile-images')
            .list(fileDir, { search: 'avatar.webp' });
          
          const found = listCheck && listCheck.some(item => item.name === 'avatar.webp');
          if (!found) {
            checkExists = false;
          } else {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      // 3. Volver automáticamente a las iniciales
      updateSettings({ avatarUrl: null });
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error al eliminar la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const onCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const onGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error(error);
    }
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      await resetApp();
      setResetMessage({ text: 'AMARA restablecida correctamente', type: 'success' });
      setTimeout(() => {
        setIsConfirmModalOpen(false);
        setResetMessage(null);
      }, 2500);
    } catch (error: any) {
      console.error(error);
      setResetMessage({ text: error.message || 'Ocurrió un error al restablecer.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 h-full max-w-2xl mx-auto">
      
      {/* Brand Header Card with minimal compact design */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-100/90 to-white dark:from-[#0B0F14] dark:to-[#0B0F14] border border-neutral-200/80 dark:border-[rgba(0,255,150,0.08)] p-4 sm:p-5 flex flex-col items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative min-h-[110px]">
        {/* Subtle glowing emerald radial blur */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#00B050]/10 rounded-full blur-[60px] pointer-events-none dark:block hidden"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#C2185B]/5 rounded-full blur-[60px] pointer-events-none dark:block hidden"></div>
        
        {/* Back navigation button */}
        <button 
          onClick={() => navigate('/')} 
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 cursor-pointer transition-all duration-200 z-20 shadow-sm dark:shadow-none"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-[#00B050] dark:text-[#00e676]" />
        </button>

        {/* Brand emblem frame with AMARA brand mark */}
        <div className="relative shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-[#E8F8F0] dark:bg-black/40 border border-emerald-500/20 dark:border-[#00B050]/20 shadow-[0_4px_12px_rgba(0,230,118,0.1)] dark:shadow-[0_0_15px_rgba(0,230,118,0.08)] mb-2 relative z-10">
          <div className="absolute inset-0 bg-[#00B050]/5 rounded-full filter blur-md"></div>
          <AmaraLogoIcon size={55} className="relative z-10" />
        </div>

        <div className="text-center select-none relative z-10">
          <h2 className="text-2xl sm:text-[26px] font-bold text-[#111827] dark:text-white tracking-[0.3em] pl-[0.3em] leading-none uppercase font-sans">
            AMARA
          </h2>
          <p className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-[0.16em] mt-1 font-medium leading-none">
            Inteligencia financiera personal
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl">📖</div>

          <div>
            <h3 className="font-bold text-lg">
              Tutorial Interactivo
            </h3>

            <p className="text-sm text-muted-foreground">
              Aprende a utilizar todas las funciones de AMARA paso a paso.
            </p>
          </div>
        </div>

        <Button
  onClick={() => setShowTutorialSelector(true)}
  className="w-full"
>
  Ver Tutorial
</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <User className="w-5 h-5 text-primary" />
            <span>Perfil y Cuenta</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Hidden natural camera or gallery capture inputs */}
          <input 
            type="file" 
            ref={cameraInputRef} 
            accept="image/*" 
            capture="user" 
            onChange={onCameraFileChange} 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={galleryInputRef} 
            accept="image/*" 
            onChange={onGalleryFileChange} 
            className="hidden" 
          />

          {/* New Profile Photo Upload Interface */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-neutral-900/30 border border-white/5 relative overflow-hidden mb-2 select-none">
            <div className="relative shrink-0">
              <ProfilePicture name={settings.userName || 'Usuario'} url={settings.avatarUrl} size="lg" />
              {isUploading && (
                <div className="absolute inset-0 bg-neutral-950/80 rounded-full flex items-center justify-center border border-[#00e676]/35">
                  <Loader2 className="w-6 h-6 text-[#00e676] animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-foreground">Tu foto de perfil en AMARA</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Cambia tu foto usando la cámara o galería. Se optimizará en WebP.
              </p>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">

                <Button
                  onClick={handleGalleryClick}
                  disabled={isUploading}
                  variant="outline"
                  className="rounded-xl text-xs font-bold px-3.5 py-1.5 h-8.5 bg-neutral-900 hover:bg-neutral-800 border-white/10 hover:border-white/20 select-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Galería</span>
                </Button>

                {settings.avatarUrl && (
                  <Button 
                    onClick={handleDeletePhoto}
                    disabled={isUploading}
                    variant="outline"
                    className="rounded-xl text-xs font-bold px-3.5 py-1.5 h-8.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/10 hover:border-rose-500/20 select-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar foto</span>
                  </Button>
                )}
              </div>
              
              {uploadError && (
                <p className="text-[11px] text-rose-400 mt-2 font-medium">{uploadError}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de Usuario (Local)</label>
            <Input 
              value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })}
            />
          </div>
          
          <div className="pt-4 border-t border-border mt-4">
            <div className="pt-4 border-t border-border mt-4">
  

  <select
    className="w-full rounded-lg border p-2"
    value={activeProfile?.id || ""}
    onChange={(e) => {
      const profile = profiles.find(
        p => String(p.id) === e.target.value
      );

      if (profile) {
        setActiveProfile(profile);
      }
    }}
  >
    {profiles.map(profile => (
      <option
        key={profile.id}
        value={profile.id}
      >
        {profile.name}
      </option>
    ))}
  </select>
  <Button
  variant="outline"
  className="w-full mt-2"
  onClick={async () => {
    if (!activeProfile) return;

    const nuevoNombre = prompt(
      'Nuevo nombre del perfil:',
      activeProfile.name
    );

    if (!nuevoNombre?.trim()) return;

    await renameProfile(activeProfile.id, nuevoNombre.trim());
  }}
>
  Renombrar perfil actual
</Button>
</div>
            <h4 className="text-sm font-medium mb-1">Cuenta Conectada</h4>
            <p className="text-sm text-muted-foreground mb-4">{user?.email || 'Sin sesión iniciada'}</p>
            <Button variant="outline" className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Palette className="w-5 h-5 text-primary" />
            <span>Apariencia</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tema</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => updateSettings({ theme: 'light' })}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${settings.theme === 'light' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent'}`}
              >
                <div className="w-full h-12 bg-[#f8fafc] rounded border shadow-sm"></div>
                <span className="text-sm font-medium">Claro</span>
              </button>
              <button 
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${settings.theme === 'dark' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent'}`}
              >
                <div className="w-full h-12 bg-[#09090b] rounded border shadow-sm"></div>
                <span className="text-sm font-medium">Oscuro</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Coins className="w-5 h-5 text-primary" />
            <span>Preferencias Financieras</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Moneda Principal</label>
            <select 
              className="flex h-10 w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
            >
              <option value="USD">Dólar Estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="MXN">Peso Mexicano (MXN)</option>
              <option value="COP">Peso Colombiano (COP)</option>
              <option value="ARS">Peso Argentino (ARS)</option>
              <option value="CLP">Peso Chileno (CLP)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN AVANZADA: RESTABLECER APLICACIÓN */}
      <Card className="border-rose-500/20 bg-[#121214]/40 overflow-hidden rounded-[24px]">
        <CardHeader className="pb-3 border-b border-white/5 bg-rose-500/[0.01]">
          <CardTitle className="text-base flex items-center space-x-2 text-rose-500 font-bold">
            <AlertTriangle className="w-4.5 h-4.5" />
            <span>Zona Avanzada</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground/80 mt-1">
            Gestión de permanencia y restablecimiento de datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Restablecer aplicación
              </h4>
              <p className="text-xs text-muted-foreground">
                Eliminar todos los datos financieros y reiniciar AMARA.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              className="bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold px-4 py-2 rounded-xl text-xs sm:self-center transition-all cursor-pointer h-10 shrink-0"
            >
              Restablecer datos
            </Button>
          </div>
        </CardContent>
      </Card>      {/* MODAL DE CONFIRMACIÓN DE RESTABLECIMIENTO */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-[0_24px_50px_rgba(0,0,0,0.95)] border border-rose-500/30 bg-[#0c0c0e]/95 backdrop-blur-xl relative overflow-hidden rounded-[28px] animate-in zoom-in-95 duration-200">
            {/* Red alert ambient glow */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none" />
            
            <div className="p-6 space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/20 shadow-inner">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">¿Deseas restablecer AMARA?</h3>
                  <p className="text-xs text-rose-400/80 font-medium">Esta acción es irreversible y definitiva</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/[0.02] border border-rose-500/10 text-xs text-muted-foreground/90 space-y-3">
                <p className="font-semibold text-white/90">Se eliminarán permanentemente de su cuenta:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 my-1 pl-3 text-[11px]">
                  <div className="text-white/80 font-medium">• Ingresos</div>
                  <div className="text-white/80 font-medium">• Gastos</div>
                  <div className="text-white/80 font-medium">• Gastos fijos</div>
                  <div className="text-white/80 font-medium">• Movimientos</div>
                  <div className="text-white/80 font-medium">• Bolsillos</div>
                  <div className="text-white/80 font-medium">• Ahorros</div>
                  <div className="text-white/80 font-medium">• Categorías pasadas</div>
                  <div className="text-white/80 font-medium">• Períodos procesados</div>
                  <div className="text-white/80 font-medium">• Cierre mensual</div>
                  <div className="text-white/80 font-medium">• Configuraciones</div>
                  <div className="text-white/80 font-medium">• Preferencias locales</div>
                </div>
                <div className="pt-2.5 border-t border-white/5 text-[10px] text-emerald-400">
                  ✔ <strong>Se conservará:</strong> Tu cuenta de usuario, correo, inicio de sesión y autenticación actual.
                </div>
              </div>

              {resetMessage && (
                <div className={`p-3 text-xs rounded-xl border font-semibold ${
                  resetMessage.type === 'success' 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`}>
                  {resetMessage.text}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!isResetting) {
                      setIsConfirmModalOpen(false);
                      setResetMessage(null);
                    }
                  }}
                  disabled={isResetting}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl h-11 text-xs font-bold border-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={isResetting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  {isResetting ? 'Restableciendo...' : 'Sí, restablecer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
{showTutorialSelector && (
  <TutorialSelector
    open={showTutorialSelector}
    onClose={() => setShowTutorialSelector(false)}
  />
)}
    </div>
  );
}
