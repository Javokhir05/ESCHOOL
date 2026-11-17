import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function CourseStudents() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi(`/teacher/courses/${id}/students`);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/teacher/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('tc.back')}
      </Link>

      <div className="mt-4">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <h1 className="text-2xl">{data.course.title[lang]}</h1>
              <p className="mb-6 mt-1 text-ink-muted">{t('tc.studentsTitle')}</p>

              {data.pending > 0 && (
                <p className="mb-4 rounded-control bg-amber-soft px-3 py-2 text-sm text-amber">
                  {t('tc.pendingNote').replace('{n}', data.pending)}
                </p>
              )}

              <Card>
                {data.students.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('tc.noStudents')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.students.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-navy">{s.fullName}</p>
                          <p className="break-all text-sm text-ink-muted">{s.email} · {s.phone}</p>
                        </div>
                        <Badge tone="blue">{t('auth.gradeFormat').replace('{n}', s.grade)}</Badge>
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