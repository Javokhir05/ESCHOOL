import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from './ui';
import { api } from '../api';
import { apiErrorText } from '../auth/errorMessage';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

function Notice({ icon: Icon, tone, title, text }) {
  return (
    <div className={`mt-6 flex items-start gap-3 rounded-control px-4 py-3 text-sm ${tone}`} role="status">
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        {text && <p className="mt-0.5">{text}</p>}
      </div>
    </div>
  );
}

export default function EnrollButton({ courseId }) {
  const { t } = useI18n();
  const { user, token, loading } = useAuth();
  const [status, setStatus] = useState(null); // null = no request yet
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const isStudent = user?.role === 'STUDENT';

  // For students: check if they already asked for this course
  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    api('/enrollments/mine', { token })
      .then((d) => {
        if (cancelled) return;
        const found = d.enrollments.find((e) => e.course.id === courseId);
        setStatus(found ? found.status : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isStudent, token, courseId]);

  const enroll = async () => {
    setSending(true);
    setError('');
    try {
      const data = await api('/enrollments', { method: 'POST', token, body: { courseSlug: courseId } });
      setStatus(data.enrollment.status);
    } catch (e) {
      setError(apiErrorText(t, e));
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Button as={Link} to="/login" size="lg" className="mt-6 w-full">{t('detail.loginToEnroll')}</Button>
        <p className="mt-3 text-center text-xs text-ink-muted">{t('detail.enrollNote')}</p>
      </>
    );
  }

  if (!isStudent) {
    return <p className="mt-6 text-sm text-ink-muted">{t('detail.onlyStudents')}</p>;
  }

  if (status === 'PENDING') {
    return <Notice icon={Clock} tone="bg-amber-soft text-amber" title={t('detail.requestSent')} text={t('detail.requestSentNote')} />;
  }
  if (status === 'ACTIVE') {
    return <Notice icon={CheckCircle2} tone="bg-teal-soft text-teal-dark" title={t('detail.enrolledActive')} />;
  }
  if (status === 'REJECTED') {
    return <Notice icon={XCircle} tone="bg-slate-100 text-ink-muted" title={t('detail.notApproved')} />;
  }

  return (
    <>
      <Button size="lg" className="mt-6 w-full" onClick={enroll} disabled={sending}>
        {sending ? t('detail.enrollSending') : t('detail.enroll')}
      </Button>
      {error && <p role="alert" className="mt-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </>
  );
}