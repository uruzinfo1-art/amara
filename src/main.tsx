import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as CapacitorApp } from '@capacitor/app';

import App from './App.tsx';
import './index.css';

CapacitorApp.addListener('appUrlOpen', async (event) => {

  console.log('URL abierta:', event.url);

  if (event.url.includes('type=recovery')) {

    localStorage.setItem('recovery_url', event.url);

    window.location.hash = '/reset-password';
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);