import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, StatCard } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function TeacherOverview() {
  const { t, lang } = useI18n();
  const stats = useApi('/teacher/stats');
  const courses = useApi('/teacher/courses');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('teacher.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('teacher.sub')}</p>

      <DataState loading={stats.loading} error={stats.error} onRetry={stats.reload}>
        {stats.data && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard value={stats.data.stats.students} label={t('teacher.totalStudents')} tone="blue" />
            <StatCard value={stats.data.stats.published} label={t('teacher.activeCourses')} tone="teal" />
            <StatCard value={stats.data.stats.drafts} label={t('teacher.drafts')} tone="violet" />
            <StatCard value={stats.data.stats.waiting} label={t('teacher.waiting')} tone="amber" />
          </div>
        )}
      </DataState>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title={t('teacher.myCourses')}>
          <DataState loading={courses.loading} error={courses.error} onRetry={courses.reload}>
            {courses.data && (courses.data.courses.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('tc.noCourses')}</p>
            ) : (
              <ul className="space-y-3">
                {courses.data.courses.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <Link to={`/teacher/courses/${c.id}/edit`} className="text-sm font-semibold text-navy hover:underline">
                      {c.title[lang]}
                    </Link>
                    <Badge tone={c.status === 'PUBLISHED' ? 'teal' : 'neutral'}>{t(`tc.status.${c.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            ))}
          </DataState>
        </Card>

        <Card title={t('teacher.quick')}>
          <Button as={Link} to="/teacher/courses/new" variant="ghost" size="sm" className="-ml-3">
            <Plus size={16} aria-hidden="true" />
            {t('teacher.addCourse')}
          </Button>
        </Card>
      </div>
    </div>
  );
}