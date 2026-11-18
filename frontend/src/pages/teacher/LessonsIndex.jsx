import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function LessonsIndex() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi('/teacher/courses');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('ls.indexTitle')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('ls.indexSub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (data.courses.length === 0 ? (
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <p>{t('ls.noCourses')}</p>
              <Button as={Link} to="/teacher/courses/new" size="sm">{t('tc.createFirst')}</Button>
            </div>
          </Card>
        ) : (
          <ul className="space-y-3">
            {data.courses.map((c) => (
              <li key={c.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg">{c.title[lang]}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={c.status === 'PUBLISHED' ? 'teal' : 'amber'}>{t(`tc.status.${c.status}`)}</Badge>
                        <span className="text-sm text-ink-muted">{t('ls.lessonsCount').replace('{n}', c.lessonCount)}</span>
                      </div>
                    </div>
                    <Button as={Link} to={`/teacher/courses/${c.id}/lessons`} variant="secondary" size="sm">
                      {t('ls.manage')}
                    </Button>
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