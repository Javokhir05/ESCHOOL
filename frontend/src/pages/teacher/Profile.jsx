import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v) {
  const e = {};
  const name = v.fullName.trim();
  if (name.length < 3 || name.length > 100) e.fullName = 'name';

  const digits = v.phone.replace(/\D/g, '');
  if (digits.length !== 9 && digits.length !== 12) e.phone = 'phone';

  if (!v.subject) e.subject = 'required';

  const n = Number(v.experience);
  if (v.experience === '' || !Number.isInteger(n) || n < 0 || n > 60) e.experience = 'experience';

  if (v.bioUz.trim().length > 1000) e.bioUz = 'length';
  if (v.bioEn.trim().length > 1000) e.bioEn = 'length';
  return e;
}

function Editor({ profile }) {
  const { t } = useI18n();
  const { token, refreshUser } = useAuth();
  const [v, setV] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    subject: profile.subject,
    experience: String(profile.experienceYears),
    bioUz: profile.bioUz,
    bioEn: profile.bioEn,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSaved(false);
  };
  const err = (key) =>
    errors[key] ? t(errors[key] === 'length' ? 'tp.errors.length' : `auth.errors.${errors[key]}`) : undefined;

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaved(false);
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await api('/teacher/profile', { method: 'PUT', token, body: v });
      try { await refreshUser(); } catch { /* the saved data is safe; the name updates on the next page load */ }
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
    } finally {
      setSaving(false);
    }
  };

  const subjectOptions = ['ielts', 'cefr', 'academic'].map((k) => ({ value: k, label: t(`auth.subjects.${k}`) }));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-navy">{t('tp.email')}</p>
            <p className="break-all text-sm text-ink-muted">{profile.email}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('tp.emailNote')}</p>
          </div>
          <Input label={t('auth.fullName')} autoComplete="name" value={v.fullName} onChange={change('fullName')} error={err('fullName')} />
          <Input
            label={t('auth.phone')} type="tel" autoComplete="tel" hint={t('auth.phoneHint')}
            value={v.phone} onChange={change('phone')} error={err('phone')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t('auth.subject')} options={subjectOptions} value={v.subject} onChange={change('subject')} error={err('subject')} />
            <Input
              label={t('auth.experience')} type="number" min="0" max="60" inputMode="numeric"
              value={v.experience} onChange={change('experience')} error={err('experience')}
            />
          </div>
        </div>
      </Card>

      <Card title={t('tp.bioTitle')}>
        <p className="mb-4 text-sm text-ink-muted">{t('tp.bioHint')}</p>
        <div className="space-y-4">
          <Textarea label={t('tp.bioUz')} rows={5} maxLength={1000} value={v.bioUz} onChange={change('bioUz')} error={err('bioUz')} />
          <Textarea label={t('tp.bioEn')} rows={5} maxLength={1000} value={v.bioEn} onChange={change('bioEn')} error={err('bioEn')} />
        </div>
      </Card>

      {formError && (
        <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      )}
      {saved && (
        <p role="status" className="flex items-start gap-2 rounded-control bg-teal-soft px-3 py-2 text-sm text-teal-dark">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('tp.saved')}
        </p>
      )}

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? t('tp.saving') : t('tp.save')}
      </Button>
    </form>
  );
}

export default function TeacherProfile() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/teacher/profile');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">{t('tp.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('tp.sub')}</p>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && <Editor profile={data.profile} />}
      </DataState>
    </div>
  );
}