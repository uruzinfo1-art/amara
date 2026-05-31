import React from 'react';

interface AmaraLogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  align?: 'left' | 'center';
}

export function AmaraLogoIcon({ size = 80, className = '' }: { size?: number, className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`select-none shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Neon Green Gradient */}
        <linearGradient id="infinity-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E676" />
          <stop offset="40%" stopColor="#00B050" />
          <stop offset="100%" stopColor="#004D40" />
        </linearGradient>
        
        {/* Magenta Amaranth Gradient */}
        <linearGradient id="amaranth-magenta" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#880E4F" />
          <stop offset="60%" stopColor="#C2185B" />
          <stop offset="100%" stopColor="#FF4081" />
        </linearGradient>

        {/* Ambient Back Glow */}
        <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Subtle background circular glow */}
      <circle cx="100" cy="100" r="85" fill="#00E676" fillOpacity="0.03" filter="url(#emerald-glow)" />

      {/* 1. Infinity Symbol (Stylized overlapping ribbon path) */}
      <g stroke="url(#infinity-green)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round">
        {/* Mathematically smooth infinity loop representation */}
        <path d="M 100,115 C 60,154 28,142 28,100 C 28,58 60,46 100,85 C 140,46 172,58 172,100 C 172,142 140,154 100,115 Z" />
      </g>
      
      {/* 2. Delicate lighter-green inner highlights for modern volumetric depth */}
      <g stroke="#00E676" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.65">
        <path d="M 100,115 C 64,149 34,138 34,100 C 34,62 64,51 100,85 C 136,51 166,62 166,100 C 166,138 136,149 100,115 Z" />
      </g>

      {/* 3. Base Leaves sprouting up at the intersection */}
      <g fill="#00B050">
        {/* Left Leaf */}
        <path d="M 100,85 C 85,80 76,86 78,103 C 86,105 100,96 100,85 Z" />
        {/* Right Leaf */}
        <path d="M 100,85 C 115,80 124,86 122,103 C 114,105 100,96 100,85 Z" />
        {/* Inner veins */}
        <path d="M 100,85 C 92,86 88,94 88,94" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 100,85 C 108,86 112,94 112,94" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* 4. Beautifully detailed Amaranth Flower Spike (Flower head growing vertical in the center) */}
      <g fill="url(#amaranth-magenta)">
        {/* Distinct layered floral nodes of the wild amaranth spike */}
        {/* Central main stem support */}
        <rect x="97" y="55" width="6" height="34" rx="2" fill="#880E4F" opacity="0.5" />
        
        {/* Node level 1 (Bottom cluster) */}
        <path d="M 100,85 L 88,76 L 100,79 L 112,76 Z" />
        
        {/* Node level 2 (Middle cluster) */}
        <path d="M 100,75 L 85,62 L 100,67 L 115,62 Z" />
        
        {/* Node level 3 */}
        <path d="M 100,65 L 88,48 L 100,53 L 112,48 Z" />

        {/* Node level 4 */}
        <path d="M 100,55 L 91,37 L 100,41 L 109,37 Z" />

        {/* Tip (Top point) */}
        <path d="M 100,42 L 95,21 L 100,16 L 105,21 Z" />
        
        {/* Glow dots inside flower */}
        <circle cx="100" cy="52" r="3" fill="#FF80AB" />
        <circle cx="100" cy="68" r="4.5" fill="#FF4081" />
        <circle cx="95" cy="62" r="2" fill="#FF80AB" />
        <circle cx="105" cy="62" r="2" fill="#FF80AB" />
        <circle cx="93" cy="74" r="2.5" fill="#FF4081" />
        <circle cx="107" cy="74" r="2.5" fill="#FF4081" />
      </g>
    </svg>
  );
}

export function AmaraLogo({ className = '', iconSize = 90, showText = true, align = 'center' }: AmaraLogoProps) {
  const isCentered = align === 'center';
  
  return (
    <div className={`flex flex-col ${isCentered ? 'items-center text-center' : 'items-start text-left'} ${className}`}>
      {/* Icon Emblem */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl opacity-40 scale-125"></div>
        <AmaraLogoIcon size={iconSize} className="relative z-10" />
      </div>

      {showText && (
        <div className="mt-3 select-none">
          {/* Main wordmark AMARA in elegant modern visual tracking */}
          <h2 className="text-3xl font-black text-foreground tracking-[0.25em] pl-[0.25em] leading-none select-none font-sans uppercase">
            AMARA
          </h2>
          
          {/* Slogan */}
          <p className="text-sm font-black text-primary mt-1 tracking-wider leading-relaxed">
            Por lo que más amas.
          </p>
          
          {/* Subtitle description */}
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.16em] mt-0.5 font-medium leading-none">
            Inteligencia financiera personal
          </p>
        </div>
      )}
    </div>
  );
}
