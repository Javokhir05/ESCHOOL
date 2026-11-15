import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { homePath, useAuth } from '../../auth/AuthContext';
import { apiErrorText } from '../../auth/errorMessage';
import { useI18n } from '../../i18n';

export default function Login() {
  const { t } = useI18n();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Go straight to your dashboard.
  if (user) return <Navigate to={homePath(user.role)} replace />;

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
  };
  const err = (key) => (errors[key] ? t(`auth.errors.${errors[key]}`) : undefined);

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) found.email = 'email';
    if (!v.password) found.password = 'required';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const signedIn = await login(v.email.trim(), v.password);
      navigate(homePath(signedIn.role), { replace: true });
    } catch (error) {
      setFormError(apiErrorText(t, error));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="text-2xl">{t('auth.loginTitle')}</h1>
        <p className="mb-6 mt-1 text-ink-muted">{t('auth.loginSub')}</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input label={t('auth.email')} type="email" autoComplete="email" value={v.email} onChange={change('email')} error={err('email')} />
          <Input label={t('auth.password')} type="password" autoComplete="current-password" value={v.password} onChange={change('password')} error={err('password')} />

          {formError && (
            <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.loginButton')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">{t('auth.registerLink')}</Link>
        </p>
      </Card>
    </div>
  );
}