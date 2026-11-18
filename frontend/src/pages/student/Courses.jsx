import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Badge, Button, Card, ProgressBar } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

const tones = { ielts: 'blue', cefr: 'teal', academic: 'violet' };

export default function StudentCourses() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi('/student/courses');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('sc.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('sc.sub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (data.courses.length === 0 ? (
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <BookOpen size={22} className="text-slate-300" aria-hidden="true" />
              <p>{t('sc.none')}</p>
              <Button as={Link} to="/courses" variant="secondary" size="sm">{t('profile.browse')}</Button>
            </div>
          </Card>
        ) : (
          <ul className="space-y-4">
            {data.courses.map((c) => (
              <li key={c.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg">{c.title[lang]}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={tones[c.category]}>{t(`catalog.categories.${c.category}`)}</Badge>
                        <span className="text-sm text-ink-muted">{c.teacher}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.nextLessonId && (
                        <Button as={Link} to={`/student/lessons/${c.nextLessonId}`} size="sm">
                          {c.completedLessons === 0 ? t('sc.start') : t('sc.continue')}
                        </Button>
                      )}
                      <Button as={Link} to={`/student/courses/${c.id}`} variant="secondary" size="sm">{t('sc.open')}</Button>
                    </div>
                  </div>

                  <div className="mt-5">
                    {c.totalLessons === 0 ? (
                      <p className="text-sm text-ink-muted">{t('sc.noLessonsYet')}</p>
                    ) : (
                      <ProgressBar
                        label={t('sc.lessonsDone').replace('{done}', c.completedLessons).replace('{total}', c.totalLessons)}
                        value={c.percent}
                      />
                    )}
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