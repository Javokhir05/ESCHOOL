import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Select, StatCard } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function AdminReports() {
  const { t, lang } = useI18n();
  const [days, setDays] = useState('30');
  const { data, error, loading, reload } = useApi(`/admin/reports?days=${days}`);

  const periodOptions = ['7', '30', '90'].map((d) => ({ value: d, label: t(`ar.days${d}`) }));

  const attention = data
    ? [
        { key: 'teachersWaiting', n: data.attention.pendingTeachers, to: '/admin/teachers' },
        { key: 'requestsWaiting', n: data.attention.pendingEnrollments, to: '/admin/enrollments' },
        { key: 'achievementsWaiting', n: data.attention.pendingAchievements, to: '/admin/achievements' },
        { key: 'oldSubmissions', n: data.attention.oldSubmissions, to: null },
      ].filter((a) => a.n > 0)
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('ar.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('ar.sub')}</p>

      <Select label={t('ar.period')} options={periodOptions} value={days} onChange={(e) => setDays(e.target.value)} className="max-w-xs" />

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 text-lg">{t('ar.activity')}</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard value={data.period.newStudents} label={t('ar.newStudents')} tone="blue" />
                  <StatCard value={data.period.enrollmentRequests} label={t('ar.requests')} tone="amber" />
                  <StatCard value={data.period.lessonsCompleted} label={t('ar.lessons')} tone="teal" />
                  <StatCard value={data.period.submissions} label={t('ar.submissions')} tone="violet" />
                  <StatCard value={data.period.graded} label={t('ar.graded')} tone="teal" />
                  <StatCard value={data.period.testsFinished} label={t('ar.tests')} tone="blue" />
                  <StatCard
                    value={data.period.testPercent === null ? '–' : `${data.period.testPercent}%`}
                    label={t('ar.testAverage')} tone="violet"
                  />
                  <StatCard value={data.period.achievementsVerified} label={t('ar.achievements')} tone="teal" />
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-lg">{t('ar.totals')}</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard value={data.totals.students} label={t('ar.students')} tone="blue" />
                  <StatCard value={data.totals.teachers} label={t('ar.teachers')} tone="violet" />
                  <StatCard value={data.totals.courses} label={t('ar.courses')} tone="teal" />
                  <StatCard value={data.totals.enrollments} label={t('ar.enrollments')} tone="amber" />
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card title={t('ar.attention')}>
                  {attention.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t('ar.allClear')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {attention.map((a) => (
                        <li key={a.key} className="flex items-center justify-between gap-3 text-sm">
                          {a.to ? (
                            <Link to={a.to} className="font-medium text-navy hover:underline">{t(`ar.${a.key}`)}</Link>
                          ) : (
                            <span className="font-medium text-navy">{t(`ar.${a.key}`)}</span>
                          )}
                          <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-bold text-navy">{a.n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title={t('ar.top')}>
                  {data.topCourses.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t('ar.topNone')}</p>
                  ) : (
                    <ol className="space-y-3">
                      {data.topCourses.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-navy">{c.title[lang]}</span>
                          <span className="text-ink-muted">{t('ar.studentsCount').replace('{n}', c.students)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>
            </div>
          )}
        </DataState>
      </div>
    </div>
  );
}