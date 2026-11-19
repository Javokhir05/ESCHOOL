import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

export default function TestResults() {
  const { testId } = useParams();
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi(`/teacher/tests/${testId}/results`);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/teacher/tests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('ts.back')}
      </Link>

      <div className="mt-4">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <h1 className="text-2xl">{data.test.title}</h1>
              <p className="mt-1 text-ink-muted">{data.test.course.title[lang]}</p>
              <p className="mb-6 mt-1 text-sm text-ink-muted">
                {t('ts.resultsSub')} {t('st.passMark').replace('{n}', data.test.passPercent)}
              </p>

              <Card>
                {data.rows.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('ts.noStudents')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.rows.map((r) => (
                      <li key={r.studentId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-navy">{r.fullName}</p>
                          <p className="break-all text-sm text-ink-muted">
                            {t('auth.gradeFormat').replace('{n}', r.grade)} · {r.email}
                          </p>
                          {r.lastAt && (
                            <p className="mt-1 text-sm text-ink-muted">{t('ts.lastAttempt')}: {formatDateTime(r.lastAt, lang)}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {r.attempts === 0 ? (
                            <Badge tone="neutral">{t('ts.notTaken')}</Badge>
                          ) : (
                            <>
                              <span className="text-sm text-ink-muted">
                                {t('ts.attemptsOf').replace('{n}', r.attempts).replace('{max}', data.test.maxAttempts)}
                              </span>
                              <span className="text-sm font-semibold text-navy">{t('ts.best')}: {r.bestPercent}%</span>
                              <Badge tone={r.passed ? 'teal' : 'amber'}>{r.passed ? t('ts.passed') : t('ts.failed')}</Badge>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}