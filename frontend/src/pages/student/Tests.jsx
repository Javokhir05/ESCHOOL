import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function StudentTests() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi('/student/tests');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('st.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('st.sub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (data.tests.length === 0 ? (
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <ListChecks size={22} className="text-slate-300" aria-hidden="true" />
              <p>{t('st.none')}</p>
            </div>
          </Card>
        ) : (
          <ul className="space-y-4">
            {data.tests.map((x) => (
              <li key={x.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg">
                        <Link to={`/student/tests/${x.id}`} className="hover:underline">{x.title}</Link>
                      </h2>
                      <p className="mt-1 text-sm text-ink-muted">{x.course.title[lang]}</p>
                      <p className="mt-2 text-sm text-ink-muted">
                        {t('st.questionsCount').replace('{n}', x.questionCount)} ·{' '}
                        {x.timeLimit ? t('st.minutes').replace('{n}', x.timeLimit) : t('st.noLimit')} ·{' '}
                        {t('st.attemptsUsed').replace('{used}', x.attemptsUsed).replace('{max}', x.maxAttempts)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {x.inProgressId && <Badge tone="blue">{t('st.inProgress')}</Badge>}
                      {x.bestPercent === null ? (
                        !x.inProgressId && <Badge tone="neutral">{t('st.notTaken')}</Badge>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-navy">{t('st.best')}: {x.bestPercent}%</span>
                          <Badge tone={x.passed ? 'teal' : 'amber'}>{x.passed ? t('st.passed') : t('st.notPassed')}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ))}
      </DataState>
    </div>
  );
}