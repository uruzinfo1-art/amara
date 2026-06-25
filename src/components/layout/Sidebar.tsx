import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, BarChart3, Settings, FolderOpen, PiggyBank } from 'lucide-react';
import { cn } from '../../lib/utils';

import { AmaraLogoIcon } from '../AmaraLogo';

export function Sidebar() {
  const { activeProfile } = useFinance();
  const links =
  activeProfile?.profile_type === "business_continuous"
    ? [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Movimientos', path: '/transactions', icon: ReceiptText },
        { name: 'Estadísticas', path: '/stats', icon: BarChart3 },
        { name: 'Productos y Servicios', path: '/products-services', icon: FolderOpen },
        { name: 'Ajustes', path: '/settings', icon: Settings },
      ]

  : activeProfile?.profile_type === "business_productive"
    ? [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Movimientos', path: '/transactions', icon: ReceiptText },
        { name: 'Estadísticas', path: '/stats', icon: BarChart3 },
        { name: 'Inversión', path: '/categories', icon: FolderOpen },
        { name: 'Ajustes', path: '/settings', icon: Settings },
      ]

  : [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Movimientos', path: '/transactions', icon: ReceiptText },
        { name: 'Estadísticas', path: '/stats', icon: BarChart3 },
        { name: 'Categorías', path: '/categories', icon: FolderOpen },
        { name: 'Ahorros', path: '/bolsillos', icon: PiggyBank },
        { name: 'Ajustes', path: '/settings', icon: Settings },
      ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-200 dark:border-white/5 bg-card dark:bg-card/40 backdrop-blur-2xl shrink-0">
        <div className="p-6 flex items-center space-x-2.5">
          <AmaraLogoIcon size={34} />
          <h1 className="text-lg font-black tracking-[0.2em] pl-1 text-foreground uppercase">AMARA</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => cn(
                "flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-black/5 dark:bg-white/5 text-primary font-medium border border-black/5 dark:border-white/5 shadow-sm" 
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground border border-transparent"
              )}
            >
              {({ isActive }) => (
                <>
                  <link.icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110 dark:drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]")} />
                  <span>{link.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 pointer-events-none">
        <div className="absolute inset-0 bg-[#00e676]/5 blur-[20px] rounded-[32px]"></div>
        <nav className="pointer-events-auto relative bg-black/60 backdrop-blur-2xl border border-white/10 sm:border-[#00e676]/20 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.8),_0_0_20px_rgba(0,230,118,0.15)] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#00e676]/5 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center justify-between px-1 py-1.5 relative z-10">
          {links.filter(link => link.name !== 'Ajustes').map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center flex-1 py-1.5 rounded-2xl transition-all duration-300 relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn("relative p-1.5 rounded-xl transition-all duration-300", isActive && "bg-primary/10 shadow-[0_0_15px_rgba(0,230,118,0.2)]")}>
                     <link.icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                  </div>
                  <span className={cn("text-[9px] font-medium mt-0.5 transition-all duration-300 truncate px-0.5 max-w-full", isActive ? "opacity-100" : "opacity-70")}>{link.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      </div>
    </>
  );
}
