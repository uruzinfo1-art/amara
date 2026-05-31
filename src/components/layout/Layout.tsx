import React from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
