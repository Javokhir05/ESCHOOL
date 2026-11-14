import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { useI18n } from '../../i18n';

export default function Login() {
  const { t } = useI18n();
  const [v, setV] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    setDone(false);
  };
  const err = (key) => (errors[key] ? t(`auth.errors.${errors[key]}`) : undefined);

  const onSubmit = (e) => {
    e.preventDefault();
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) found.email = 'email';
    if (!v.password) found.password = 'required';
    setErrors(found);
    setDone(Object.keys(found).length === 0);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="text-2xl">{t('auth.loginTitle')}</h1>
        <p className="mb-6 mt-1 text-ink-muted">{t('auth.loginSub')}</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input label={t('auth.email')} type="email" autoComplete="email" value={v.email} onChange={change('email')} error={err('email')} />
          <Input label={t('auth.password')} type="password" autoComplete="current-password" value={v.password} onChange={change('password')} error={err('password')} />
          <Button type="submit" size="lg" className="w-full">{t('auth.loginButton')}</Button>
        </form>

        {done && (
          <p role="status" className="mt-4 rounded-control bg-teal-soft px-3 py-2 text-sm text-teal-dark">{t('auth.loginDone')}</p>
        )}

        <p className="mt-6 text-center text-sm text-ink-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">{t('auth.registerLink')}</Link>
        </p>
      </Card>
    </div>
  );
}