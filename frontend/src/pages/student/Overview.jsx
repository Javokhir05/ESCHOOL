import { Link } from 'react-router-dom';
import { Badge, Button, Card, ProgressBar, StatCard } from '../../components/ui';
import DataState from '../../components/DataState';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

export default function StudentOverview() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/student/overview');

  // The first course that still has a lesson to study
  const next = data ? data.courses.find((c) => c.nextLessonId) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('student.greetingName').replace('{name}', user.fullName.split(' ')[0])}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('student.sub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <StatCard value={data.stats.activeCourses} label={t('student.activeCourses')} tone="blue" />
              <StatCard value={data.stats.completedLessons} label={t('student.lessonsDone')} tone="teal" />
              <StatCard value={data.stats.pendingTasks} label={t('student.pendingTasks')} tone="amber" />
              <StatCard value={data.stats.waiting} label={t('student.waiting')} tone="violet" />
              <StatCard value={data.stats.verifiedAchievements} label={t('student.achievements')} tone="teal" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card title={t('student.progress')}>
                {data.courses.length === 0 ? (
                  <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
                    <p>{t('student.emptyProgress')}</p>
                    <Button as={Link} to="/courses" variant="secondary" size="sm">{t('profile.browse')}</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.courses.map((c) => (
                      <ProgressBar key={c.id} label={c.title[lang]} value={c.percent} />
                    ))}
                  </div>
                )}
              </Card>

              <Card title={t('student.deadlines')}>
                {data.deadlines.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('student.noDeadlines')}</p>
                ) : (
                  <ul className="space-y-4">
                    {data.deadlines.map((d) => (
                      <li key={d.id}>
                        <Link to={`/student/assignments/${d.id}`} className="text-sm font-semibold text-navy hover:underline">
                          {d.title}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span>{formatDateTime(d.dueAt, lang)}</span>
                          {d.overdue && <Badge tone="amber">{t('sa.overdue')}</Badge>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button as={Link} to="/student/assignments" variant="ghost" size="sm" className="-ml-3 mt-4">
                  {t('student.allAssignments')}
                </Button>
              </Card>
            </div>

            {data.courses.length > 0 && (
              <Card className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base">{t('student.continueTitle')}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{next ? next.title[lang] : t('sc.allDone')}</p>
                  </div>
                  {next && (
                    <Button as={Link} to={`/student/lessons/${next.nextLessonId}`}>{t('student.continueBtn')}</Button>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </DataState>
    </div>
  );
}