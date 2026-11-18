import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Badge, Card, ProgressBar } from '../../components/ui';
import DataState from '../../components/DataState';
import NotAvailable from '../../components/NotAvailable';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function StudentCourseView() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const { data, error, loading, status, reload } = useApi(`/student/courses/${slug}`);

  if (status === 404) return <NotAvailable />;

  const total = data ? data.lessons.length : 0;
  const done = data ? data.lessons.filter((l) => l.completed).length : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/student/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('sc.back')}
      </Link>

      <div className="mt-4">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <h1 className="text-2xl">{data.course.title[lang]}</h1>
              <p className="mt-1 text-ink-muted">{data.course.summary[lang]}</p>

              {total > 0 && (
                <Card className="mt-6">
                  <ProgressBar
                    label={t('sc.lessonsDone').replace('{done}', done).replace('{total}', total)}
                    value={Math.round((done / total) * 100)}
                  />
                </Card>
              )}

              <h2 className="mb-3 mt-8 text-lg">{t('sc.lessons')}</h2>
              {total === 0 ? (
                <Card><p className="text-sm text-ink-muted">{t('sc.noLessonsYet')}</p></Card>
              ) : (
                <ol className="space-y-3">
                  {data.lessons.map((l, i) => (
                    <li key={l.id}>
                      <Link
                        to={`/student/lessons/${l.id}`}
                        className="flex items-center gap-4 rounded-card border border-line bg-white px-4 py-3 shadow-card transition-colors hover:bg-surface"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                            l.completed ? 'bg-teal' : 'bg-navy'
                          }`}
                        >
                          {l.completed ? <Check size={16} aria-hidden="true" /> : i + 1}
                        </span>
                        <span className="font-medium text-navy">{l.title}</span>
                        {l.completed && <Badge tone="teal" className="ml-auto">{t('sc.completed')}</Badge>}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}