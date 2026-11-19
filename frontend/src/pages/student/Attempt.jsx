import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock, X } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import NotAvailable from '../../components/NotAvailable';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Taking({ data, attemptId, reload }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // The difference between the server's clock and this computer's clock, measured once
  const [offset] = useState(() => new Date(data.serverNow).getTime() - Date.now());
  const answersRef = useRef({});
  const sentRef = useRef(false);

  const send = async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSaving(true);
    setError('');
    try {
      await api(`/student/attempts/${attemptId}/submit`, { method: 'POST', token, body: { answers: answersRef.current } });
      reload();
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'TIME_UP' || e.code === 'ALREADY_FINISHED')) {
        reload();
        return;
      }
      sentRef.current = false;
      setSaving(false);
      setError(apiErrorText(t, e));
    }
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  // The timer: counts down to the deadline the server gave us, and sends the answers when it reaches zero
  useEffect(() => {
    if (!data.deadline) return undefined;
    const end = new Date(data.deadline).getTime();
    const tick = () => {
      const remaining = end - (Date.now() + offset);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) sendRef.current();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.deadline, offset]);

  const pick = (questionId, index) => {
    answersRef.current = { ...answersRef.current, [questionId]: index };
    setAnswers(answersRef.current);
  };

  const total = data.questions.length;
  const done = Object.keys(answers).length;

  const finish = () => {
    const unanswered = total - done;
    if (unanswered > 0 && !window.confirm(t('st.confirmUnanswered').replace('{n}', unanswered))) return;
    send();
  };

  return (
    <>
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 shadow-card">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{data.test.title}</p>
          <p className="text-xs text-ink-muted">{t('st.answered').replace('{done}', done).replace('{total}', total)}</p>
        </div>
        {left !== null && (
          <p
            role="timer"
            aria-live="off"
            className={`inline-flex items-center gap-2 text-lg font-bold ${left < 60000 ? 'text-red-600' : 'text-navy'}`}
          >
            <Clock size={18} aria-hidden="true" />
            <span className="sr-only">{t('st.timeLeft')}: </span>
            {formatClock(left)}
          </p>
        )}
      </div>

      {left === 0 && <p role="status" className="mt-4 rounded-control bg-amber-soft px-3 py-2 text-sm text-amber">{t('st.timeUp')}</p>}

      <div className="mt-4 space-y-4">
        {data.questions.map((q, i) => (
          <Card key={q.id}>
            <fieldset disabled={saving}>
              <legend className="mb-3 whitespace-pre-line font-semibold text-navy">
                {i + 1}. {q.text}
              </legend>
              <div className="space-y-2">
                {q.options.map((o, j) => (
                  <label
                    key={j}
                    className={`flex cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5 text-sm transition-colors ${
                      answers[q.id] === j ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface'
                    }`}
                  >
                    <input
                      type="radio" name={q.id} className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                      checked={answers[q.id] === j} onChange={() => pick(q.id, j)}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Button size="lg" className="mt-6" onClick={finish} disabled={saving}>
        {saving ? t('st.finishing') : t('st.finish')}
      </Button>
    </>
  );
}

function Result({ data }) {
  const { t } = useI18n();
  const { test, attempt, review } = data;

  return (
    <>
      <Link to={`/student/tests/${test.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('st.backToTest')}
      </Link>

      <h1 className="mt-4 text-2xl">{test.title}</h1>

      <Card title={t('st.result')} className="mt-6">
        <p className={`text-4xl font-bold ${attempt.passed ? 'text-teal-dark' : 'text-amber'}`}>{attempt.percent}%</p>
        <p className="mt-1 text-sm text-ink-muted">
          {t('st.scoreLine').replace('{score}', attempt.score).replace('{total}', attempt.total)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={attempt.passed ? 'teal' : 'amber'}>{attempt.passed ? t('st.passed') : t('st.notPassed')}</Badge>
          <span className="text-sm text-ink-muted">{t('st.passMark').replace('{n}', test.passPercent)}</span>
        </div>
      </Card>

      {review ? (
        <>
          <h2 className="mb-3 mt-8 text-lg">{t('st.review')}</h2>
          <div className="space-y-4">
            {review.map((q, i) => {
              const verdict = q.chosen === null ? 'noAnswer' : q.chosen === q.correct ? 'isCorrect' : 'isWrong';
              return (
                <Card key={q.id}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <p className="whitespace-pre-line font-semibold text-navy">{i + 1}. {q.text}</p>
                    <Badge tone={verdict === 'isCorrect' ? 'teal' : verdict === 'isWrong' ? 'amber' : 'neutral'}>
                      {t(`st.${verdict}`)}
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {q.options.map((o, j) => {
                      const isCorrect = j === q.correct;
                      const isChosen = j === q.chosen;
                      return (
                        <li
                          key={j}
                          className={`flex items-start gap-2 rounded-control px-3 py-2 text-sm ${
                            isCorrect ? 'bg-teal-soft text-teal-dark' : isChosen ? 'bg-red-50 text-red-700' : 'text-ink'
                          }`}
                        >
                          {isCorrect ? (
                            <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                          ) : isChosen ? (
                            <X size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <span>{o}</span>
                          {(isCorrect || isChosen) && (
                            <span className="ml-auto shrink-0 text-xs font-semibold">
                              {isCorrect ? t('st.correctAnswer') : t('st.yourAnswer')}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">{t('st.answersHidden')}</p>
      )}
    </>
  );
}

export default function StudentAttempt() {
  const { attemptId } = useParams();
  const { data, error, loading, status, reload } = useApi(`/student/attempts/${attemptId}`);

  if (status === 404) return <NotAvailable />;

  return (
    <div className="mx-auto max-w-3xl">
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (data.state === 'IN_PROGRESS' ? (
          <Taking key={attemptId} data={data} attemptId={attemptId} reload={reload} />
        ) : (
          <Result data={data} />
        ))}
      </DataState>
    </div>
  );
}