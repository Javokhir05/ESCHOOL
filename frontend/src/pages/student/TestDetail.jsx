import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import NotAvailable from '../../components/NotAvailable';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

function TestPage({ data, reload }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const { test, attempts } = data;
  const noneLeft = !test.inProgressId && test.attemptsUsed >= test.maxAttempts;

  const start = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await api(`/student/tests/${test.id}/start`, { method: 'POST', token });
      navigate(`/student/attempts/${res.attemptId}`);
    } catch (e) {
      setError(apiErrorText(t, e));
      setStarting(false);
      reload();
    }
  };

  return (
    <>
      <Link to="/student/tests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('st.back')}
      </Link>

      <h1 className="mt-4 text-2xl">{test.title}</h1>
      <p className="mt-1 text-ink-muted">{test.course.title[lang]}</p>

      <Card className="mt-6">
        {test.description && (
          <div className="mb-4 space-y-3 leading-relaxed text-ink">
            {test.description.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
        )}
        <ul className="space-y-1 text-sm text-ink-muted">
          <li>{t('st.questionsCount').replace('{n}', test.questionCount)}</li>
          <li>{test.timeLimit ? t('st.minutes').replace('{n}', test.timeLimit) : t('st.noLimit')}</li>
          <li>{t('st.passMark').replace('{n}', test.passPercent)}</li>
          <li>{t('st.attemptsUsed').replace('{used}', test.attemptsUsed).replace('{max}', test.maxAttempts)}</li>
        </ul>

        <p className="mt-4 text-xs text-ink-muted">{test.timeLimit ? t('st.timedNote') : t('st.untimedNote')}</p>

        {error && <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {noneLeft ? (
          <p className="mt-5 rounded-control bg-slate-100 px-3 py-2 text-sm text-ink-muted">{t('st.noAttemptsLeft')}</p>
        ) : (
          <Button size="lg" className="mt-5" onClick={start} disabled={starting}>
            {test.inProgressId ? t('st.resume') : t('st.start')}
          </Button>
        )}
      </Card>

      <Card title={t('st.yourAttempts')} className="mt-4">
        {attempts.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('st.noAttemptsYet')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {t('st.scoreLine').replace('{score}', a.score).replace('{total}', a.total)} · {a.percent}%
                  </p>
                  <p className="text-xs text-ink-muted">{formatDateTime(a.finishedAt, lang)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={a.passed ? 'teal' : 'amber'}>{a.passed ? t('st.passed') : t('st.notPassed')}</Badge>
                  <Button as={Link} to={`/student/attempts/${a.id}`} variant="secondary" size="sm">{t('st.viewResult')}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function StudentTest() {
  const { testId } = useParams();
  const { data, error, loading, status, reload } = useApi(`/student/tests/${testId}`);

  if (status === 404) return <NotAvailable />;

  return (
    <div className="mx-auto max-w-3xl">
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && <TestPage key={testId} data={data} reload={reload} />}
      </DataState>
    </div>
  );
}