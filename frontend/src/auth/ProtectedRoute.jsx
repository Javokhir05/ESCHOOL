import { Navigate, Outlet } from 'react-router-dom';
import { homePath, useAuth } from './AuthContext';
import { useI18n } from '../i18n';

// Wrap a group of routes: <Route element={<ProtectedRoute roles={['STUDENT']} />}>
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return <p className="p-8 text-ink-muted">{t('auth.loading')}</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}