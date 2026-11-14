import { Plus } from 'lucide-react';
import { Card, StatCard } from '../../components/ui';
import { useI18n } from '../../i18n';

export default function TeacherOverview() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('teacher.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('teacher.sub')}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value="86" label={t('teacher.totalStudents')} tone="blue" />
        <StatCard value="4" label={t('teacher.activeCourses')} tone="teal" />
        <StatCard value="9" label={t('teacher.toReview')} tone="amber" />
        <StatCard value="3" label={t('teacher.classes')} tone="violet" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title={t('teacher.recent')}>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span>IELTS Writing Task 2</span><span className="text-ink-muted">4 new</span></li>
            <li className="flex justify-between"><span>CEFR B2 Grammar Quiz</span><span className="text-ink-muted">3 new</span></li>
            <li className="flex justify-between"><span>Reading practice</span><span className="text-ink-muted">2 new</span></li>
          </ul>
        </Card>
        <Card title={t('teacher.quick')}>
          <ul className="space-y-2 text-sm font-semibold text-brand">
            {['addCourse', 'addMaterial', 'addAssignment'].map((k) => (
              <li key={k}>
                <button type="button" className="flex items-center gap-2 hover:underline">
                  <Plus size={16} />{t(`teacher.${k}`)}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}