import { useState } from 'react';
import { AccessDenied } from './components/AccessDenied';
import { AuditLogPage } from './components/AuditLogPage';
import { DashboardPage } from './components/DashboardPage';
import { Layout, type Page } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { UsersPage } from './components/UsersPage';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { useAuth } from './lib/AuthContext';

export default function App() {
  const { user, isAdmin, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-red-600">
        VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていません。
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-stone-500">読み込み中…</div>;
  }

  if (!user) return <LoginScreen />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <Layout page={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage />}
      {page === 'users' && <UsersPage />}
      {page === 'audit-log' && <AuditLogPage />}
    </Layout>
  );
}
