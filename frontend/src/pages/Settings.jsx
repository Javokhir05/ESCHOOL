import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { api, ApiError } from '../api';
import { apiErrorText } from '../auth/errorMessage';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

const empty = { current: '', next: '', confirm: '' };

export default function Settings() {
  const { t } = useI18n();
  const { user, token, updateToken } = useAuth();
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setDone(false);
  };
  const err = (key) => (errors[key] ? t(`se.errors.${errors[key]}`) : undefined);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setDone(false);

    const found = {};
    if (!v.current) found.current = 'required';
    if (v.next.length < 8) found.next = 'password';
    if (v.confirm !== v.next) found.confirm = 'confirm';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword: v.current, newPassword: v.next },
      });
      updateToken(res.token); // this device gets a fresh token; every other device is signed out
      setV(empty);
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) {
        setErrors({ current: error.fields.currentPassword, next: error.fields.newPassword });
      } else {
        setFormError(apiErrorText(t, error));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">{t('se.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('se.sub')}</p>

      <Card title={t('se.account')}>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-muted">{t('se.name')}</dt>
            <dd className="mt-0.5 font-semibold text-navy">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t('se.email')}</dt>
            <dd className="mt-0.5 break-all font-semibold text-navy">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t('se.role')}</dt>
            <dd className="mt-0.5 font-semibold text-navy">{t(`dash.${user.role.toLowerCase()}`)}</dd>
          </div>
        </dl>
      </Card>

      <form onSubmit={onSubmit} noValidate className="mt-4">
        <Card title={t('se.passwordTitle')}>
          <p className="mb-4 text-sm text-ink-muted">{t('se.passwordSub')}</p>
          <div className="space-y-4">
            <Input
              label={t('se.current')} type="password" autoComplete="current-password"
              value={v.current} onChange={change('current')} error={err('current')}
            />
            <Input
              label={t('se.newPassword')} type="password" autoComplete="new-password" hint={t('auth.passwordHint')}
              value={v.next} onChange={change('next')} error={err('next')}
            />
            <Input
              label={t('se.confirm')} type="password" autoComplete="new-password"
              value={v.confirm} onChange={change('confirm')} error={err('confirm')}
            />
          </div>

          {formError && (
            <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}
          {done && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-control bg-teal-soft px-3 py-2 text-sm text-teal-dark">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t('se.done')}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-6" disabled={saving}>
            {saving ? t('se.saving') : t('se.save')}
          </Button>
        </Card>
      </form>
    </div>
  );
}