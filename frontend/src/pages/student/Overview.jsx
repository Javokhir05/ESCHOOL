import { Button, Card, ProgressBar, StatCard } from '../../components/ui';
import { useI18n } from '../../i18n';

export default function StudentOverview() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('student.greeting')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('student.sub')}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value="3" label={t('student.activeCourses')} tone="blue" />
        <StatCard value="12" label={t('student.lessonsDone')} tone="teal" />
        <StatCard value="2" label={t('student.pendingTasks')} tone="amber" />
        <StatCard value="4" label={t('student.achievements')} tone="violet" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title={t('student.progress')}>
          <div className="space-y-4">
            <ProgressBar label="IELTS Preparation" value={65} />
            <ProgressBar label="CEFR B2 Grammar" value={42} />
            <ProgressBar label="Mathematics" value={80} />
          </div>
        </Card>
        <Card title={t('student.upcoming')}>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span>IELTS Writing</span><span className="text-ink-muted">Mon</span></li>
            <li className="flex justify-between"><span>IELTS Speaking</span><span className="text-ink-muted">Wed</span></li>
            <li className="flex justify-between"><span>IELTS Listening</span><span className="text-ink-muted">Fri</span></li>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base">{t('student.continueTitle')}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t('student.continueText')}</p>
          </div>
          <Button>{t('student.continueBtn')}</Button>
        </div>
      </Card>
    </div>
  );
}