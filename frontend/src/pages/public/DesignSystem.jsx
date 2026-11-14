import { Badge, Button, Card, Input, ProgressBar, StatCard } from '../../components/ui';
import { useI18n } from '../../i18n';

const swatches = [
  ['Navy', '#142B52', 'bg-navy'], ['Blue', '#2563EB', 'bg-brand'], ['Teal', '#14B8A6', 'bg-teal'],
  ['Amber', '#D97706', 'bg-amber'], ['Violet', '#7C3AED', 'bg-violet'], ['Surface', '#F8FAFC', 'bg-surface border border-line'],
];

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystem() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl">{t('ds.title')}</h1>
      <p className="mb-10 mt-2 text-ink-muted">{t('ds.intro')}</p>

      <Section title={t('ds.colors')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {swatches.map(([name, hex, cls]) => (
            <div key={name}>
              <div className={`h-14 rounded-control ${cls}`} />
              <p className="mt-1.5 text-sm font-semibold text-navy">{name}</p>
              <p className="text-xs text-ink-muted">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('ds.buttons')}>
        <div className="flex flex-wrap gap-3">
          <Button>{t('ds.save')}</Button>
          <Button variant="secondary">{t('ds.cancel')}</Button>
          <Button variant="ghost">{t('ds.open')}</Button>
          <Button variant="danger">{t('ds.delete')}</Button>
          <Button disabled>{t('ds.save')}</Button>
        </div>
      </Section>

      <Section title={t('ds.badges')}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="teal">{t('ds.verified')}</Badge>
          <Badge tone="amber">{t('ds.pending')}</Badge>
          <Badge tone="neutral">{t('ds.selfReported')}</Badge>
          <Badge tone="blue">IELTS</Badge>
          <Badge tone="violet">CEFR B2</Badge>
        </div>
      </Section>

      <Section title={t('ds.forms')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('ds.fullName')} placeholder="Aziza Karimova" />
          <Input label={t('ds.email')} hint={t('ds.emailHint')} placeholder="name@example.com" />
          <Input label={t('ds.email')} error={t('ds.emailError')} defaultValue="aziza@" />
        </div>
      </Section>

      <Section title={t('ds.cards')}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard value="3" label={t('student.activeCourses')} tone="blue" />
          <StatCard value="12" label={t('student.lessonsDone')} tone="teal" />
          <StatCard value="2" label={t('student.pendingTasks')} tone="amber" />
          <StatCard value="4" label={t('student.achievements')} tone="violet" />
        </div>
      </Section>

      <Section title={t('ds.progress')}>
        <Card>
          <div className="space-y-4">
            <ProgressBar label="IELTS Preparation" value={65} />
            <ProgressBar label="CEFR B2 Grammar" value={42} />
          </div>
        </Card>
      </Section>
    </div>
  );
}