import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePath, useAuth } from './AuthContext';
import { useI18n } from '../i18n';

// Wrap a group of routes: <Route element={<ProtectedRoute roles={['STUDENT']} />}>
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();

  if (loading) return <p className="p-8 text-ink-muted">{t('auth.loading')}</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;

  // After an admin set a temporary password, the only page available is Settings
  const settings = `${homePath(user.role)}/settings`;
  if (user.mustChangePassword && pathname !== settings) return <Navigate to={settings} replace />;
  return <Outlet />;
}