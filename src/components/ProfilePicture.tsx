import React, { useState, useEffect } from 'react';

interface ProfilePictureProps {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'huge';
  className?: string;
}

export function ProfilePicture({ name, url, size = 'md', className = '' }: ProfilePictureProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when url changes
  useEffect(() => {
    setHasError(false);
  }, [url]);

  const getInitials = (userName: string) => {
    if (!userName || userName.trim() === '') return 'U';
    const parts = userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) {
      const word = parts[0];
      return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word[0].toUpperCase();
    }
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  // Border and font sizes mapping
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs border-[1.5px]',
    md: 'w-12 h-12 text-sm border-2',
    lg: 'w-20 h-20 text-lg border-2',
    xl: 'w-24 h-24 text-xl border-[2.5px]',
    huge: 'w-32 h-32 text-3xl border-3',
  };

  const showImg = url && !hasError;
  const initials = getInitials(name);

  return (
    <div 
      className={`
        relative flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none
        border-[#00e676] bg-gradient-to-br from-neutral-900 via-[#0c0c0e]/95 to-black
        shadow-[0_0_20px_rgba(0,230,118,0.12)]
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
    >
      {showImg ? (
        <img 
          src={url} 
          alt={`Foto de ${name}`}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="font-extrabold tracking-tight text-[#00e676] flex items-center justify-center text-center">
          {initials}
        </span>
      )}
    </div>
  );
}
