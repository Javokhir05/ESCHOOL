import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import RoleToggle from '../../components/RoleToggle';
import { Button, Card, Input, Select } from '../../components/ui';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useI18n } from '../../i18n';

const initial = {
  fullName: '', email: '', phone: '', grade: '', goal: '',
  subject: '', experience: '', password: '', confirm: '',
};

// Returns { fieldName: 'errorKey' }, empty when everything is valid.
function validate(v, role) {
  const e = {};
  if (v.fullName.trim().length < 3) e.fullName = 'name';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'email';
  const digits = v.phone.replace(/\D/g, '');
  if (digits.length !== 9 && digits.length !== 12) e.phone = 'phone';
  if (v.password.length < 8) e.password = 'password';
  if (!v.confirm || v.confirm !== v.password) e.confirm = 'confirm';
  if (role === 'student' && !v.grade) e.grade = 'required';
  if (role === 'teacher') {
    if (!v.subject) e.subject = 'required';
    const n = Number(v.experience);
    if (v.experience === '' || !Number.isInteger(n) || n < 0 || n > 60) e.experience = 'experience';
  }
  return e;
}

export default function Register() {
  const { t } = useI18n();
  const [role, setRole] = useState('student');
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`auth.errors.${errors[key]}`) : undefined);

  const switchRole = (next) => {
    setRole(next);
    setErrors({});
    setFormError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v, role);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await api('/auth/register', { method: 'POST', body: { role, ...v } });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') setErrors({ email: 'taken' });
      else setFormError(apiErrorText(t, error));
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = [
    { value: 'student', label: t('auth.student') },
    { value: 'teacher', label: t('auth.teacher') },
  ];
  const gradeOptions = [
    { value: '', label: t('auth.gradeChoose') },
    ...[5, 6, 7, 8, 9, 10, 11].map((n) => ({ value: String(n), label: t('auth.gradeFormat').replace('{n}', n) })),
  ];
  const goalOptions = [
    { value: '', label: t('auth.goalChoose') },
    ...['ielts', 'cefr', 'academic', 'notSure'].map((k) => ({ value: k, label: t(`auth.goals.${k}`) })),
  ];
  const subjectOptions = [
    { value: '', label: t('auth.subjectChoose') },
    ...['ielts', 'cefr', 'academic'].map((k) => ({ value: k, label: t(`auth.subjects.${k}`) })),
  ];

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card>
          <CheckCircle2 size={32} className="text-teal-dark" aria-hidden="true" />
          <h1 className="mt-3 text-2xl">{t('auth.doneTitle')}</h1>
          <p className="mt-2 text-ink-muted">
            {role === 'teacher' ? t('auth.createdTeacher') : t('auth.createdStudent')}
          </p>
          <Button as={Link} to="/login" className="mt-6">{t('auth.loginLink')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <h1 className="text-2xl">{t('auth.registerTitle')}</h1>
        <p className="mb-6 mt-1 text-ink-muted">{t('auth.registerSub')}</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <RoleToggle label={t('auth.roleLabel')} value={role} onChange={switchRole} options={roleOptions} />

          <Input label={t('auth.fullName')} autoComplete="name" value={v.fullName} onChange={change('fullName')} error={err('fullName')} />
          <Input label={t('auth.email')} type="email" autoComplete="email" value={v.email} onChange={change('email')} error={err('email')} />
          <Input
            label={t('auth.phone')} type="tel" autoComplete="tel" placeholder="+998"
            hint={t('auth.phoneHint')} value={v.phone} onChange={change('phone')} error={err('phone')}
          />

          {role === 'student' ? (
            <>
              <Select label={t('auth.grade')} options={gradeOptions} value={v.grade} onChange={change('grade')} error={err('grade')} />
              <Select label={t('auth.goal')} options={goalOptions} value={v.goal} onChange={change('goal')} />
            </>
          ) : (
            <>
              <Select label={t('auth.subject')} options={subjectOptions} value={v.subject} onChange={change('subject')} error={err('subject')} />
              <Input
                label={t('auth.experience')} type="number" min="0" max="60" inputMode="numeric"
                value={v.experience} onChange={change('experience')} error={err('experience')}
              />
              <p className="rounded-control bg-amber-soft px-3 py-2 text-sm text-amber">{t('auth.teacherNote')}</p>
            </>
          )}

          <Input
            label={t('auth.password')} type="password" autoComplete="new-password"
            hint={t('auth.passwordHint')} value={v.password} onChange={change('password')} error={err('password')}
          />
          <Input
            label={t('auth.confirm')} type="password" autoComplete="new-password"
            value={v.confirm} onChange={change('confirm')} error={err('confirm')}
          />

          {formError && (
            <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.create')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">{t('auth.loginLink')}</Link>
        </p>
      </Card>
    </div>
  );
}