import { Link } from 'react-router-dom';
import { Button, Card, StatCard } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function AdminOverview() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/admin/stats');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('admin.title')}</h1>

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard value={data.stats.pendingTeachers} label={t('admin.stats.pendingTeachers')} tone="amber" />
                <StatCard value={data.stats.pendingEnrollments} label={t('admin.stats.pendingEnrollments')} tone="amber" />
                <StatCard value={data.stats.students} label={t('admin.stats.students')} tone="blue" />
                <StatCard value={data.stats.teachers} label={t('admin.stats.teachers')} tone="teal" />
                <StatCard value={data.stats.courses} label={t('admin.stats.courses')} tone="violet" />
              </div>

              <Card className="mt-4">
                <div className="flex flex-wrap gap-3">
                  <Button as={Link} to="/admin/teachers">{t('admin.reviewTeachers')}</Button>
                  <Button as={Link} to="/admin/enrollments" variant="secondary">{t('admin.reviewEnrollments')}</Button>
                </div>
              </Card>
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}