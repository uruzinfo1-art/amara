/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { AuthPage } from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import { Categories } from './pages/Categories';
import { Bolsillos } from './pages/Bolsillos';
import { Onboarding } from './components/Onboarding';
import Tutorial from './pages/Tutorial';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center font-bold text-muted-foreground text-base tracking-widest uppercase">AMARA...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { session } = useAuth();
  const { settings, loading } = useFinance();
console.log('ONBOARDING CHECK', {
  loading,
  onboarding: settings?.onboarding_completed,
  settings
});
console.log(
  'AMARA_ONBOARDING',
  JSON.stringify({
    loading,
    onboarding_completed: settings?.onboarding_completed,
    session: !!session
  })
);
  const showOnboarding =
    session &&
    !loading &&
    !settings?.onboarding_completed &&
    window.location.hash !== '#/reset-password';

  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tutorial" element={<Tutorial />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <Layout>
              <Transactions />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/stats" element={
          <ProtectedRoute>
            <Layout>
              <Stats />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/categories" element={
          <ProtectedRoute>
            <Layout>
              <Categories />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/bolsillos" element={
          <ProtectedRoute>
            <Layout>
              <Bolsillos />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>

      {showOnboarding && <Onboarding />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </FinanceProvider>
    </AuthProvider>
  );
}