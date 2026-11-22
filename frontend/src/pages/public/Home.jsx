import { Link } from 'react-router-dom';
import { ChevronDown, Laptop, Layers, MessageSquare, Quote } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import { useI18n } from '../../i18n';
import PublicAchievements from '../../components/PublicAchievements';
import PublicTeachers from '../../components/PublicTeachers';

const whyIcons = [Laptop, Layers, MessageSquare];

function Section({ id, title, note, className = '', children }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl scroll-mt-20 px-4 py-14 ${className}`}>
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function Home() {
  const { t } = useI18n();
  const paths = [
    { key: 'ielts', color: 'bg-brand' },
    { key: 'cefr', color: 'bg-teal' },
    { key: 'academic', color: 'bg-violet' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-soft/70">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <h1 className="text-4xl leading-tight sm:text-5xl">{t('home.heroTitle')}</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-muted">{t('home.heroText')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/courses" size="lg">{t('home.explore')}</Button>
              <Button as="a" href="#how" variant="secondary" size="lg">{t('home.how')}</Button>
            </div>
          </div>
          <Card title={t('landing.heroCardTitle')}>
            <p className="text-sm text-ink-muted">{t('landing.heroCardText')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {t('landing.skills').map((s) => <Badge key={s} tone="blue">{s}</Badge>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {t('landing.formats').map((f) => <Badge key={f} tone="teal">{f}</Badge>)}
            </div>
          </Card>
        </div>
      </section>

      {/* Learning paths */}
      <Section title={t('home.paths')}>
        <div className="grid gap-4 sm:grid-cols-3">
          {paths.map(({ key, color }) => (
            <Card key={key}>
              <span className={`mb-3 block h-9 w-9 rounded-control ${color}`} aria-hidden="true" />
              <h3 className="text-lg">{t(`home.${key}`)}</h3>
              <p className="mt-1 text-sm text-ink-muted">{t(`home.${key}Sub`)}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Why ESCHOOL */}
      <div className="bg-white">
        <Section title={t('landing.whyTitle')}>
          <div className="grid gap-6 md:grid-cols-3">
            {t('landing.why').map((item, i) => {
              const Icon = whyIcons[i];
              return (
                <div key={item.title}>
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-control bg-brand-soft text-brand">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="text-lg">{item.title}</h3>
                  <p className="mt-1.5 text-ink-muted">{item.text}</p>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* How learning works: this one really is a sequence, so it is numbered */}
      <Section id="how" title={t('landing.stepsTitle')}>
        <ol className="grid gap-4 md:grid-cols-3">
          {t('landing.steps').map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-lg">{step.title}</h3>
                <p className="mt-1.5 text-ink-muted">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* Teachers: real, only those who chose to be shown */}
      <PublicTeachers />

      {/* Verified achievements: real data, nothing fake */}
      <Section title={t('landing.resultsTitle')}>
        <p className="max-w-2xl text-ink-muted">{t('landing.resultsText')}</p>
        <PublicAchievements />
      </Section>

      {/* Testimonials */}
      <div className="bg-white">
        <Section title={t('landing.testimonialsTitle')} note={t('landing.sampleNote')}>
          <div className="grid gap-4 md:grid-cols-2">
            {t('landing.testimonials').map((item, i) => (
              <Card key={i}>
                <Quote size={22} className="text-brand" aria-hidden="true" />
                <p className="mt-3 text-navy">{item.quote}</p>
                <p className="mt-4 text-sm font-semibold text-ink-muted">{item.name}</p>
              </Card>
            ))}
          </div>
        </Section>
      </div>

      {/* FAQ */}
      <Section title={t('landing.faqTitle')}>
        <div className="max-w-3xl space-y-3">
          {t('landing.faq').map((item) => (
            <details key={item.q} className="group rounded-card border border-line bg-white px-5 py-4 shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-navy">
                {item.q}
                <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Final call to action */}
      <section className="bg-navy">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl !text-white">{t('landing.ctaTitle')}</h2>
            <p className="mt-1 text-slate-300">{t('landing.ctaText')}</p>
          </div>
          <Button as={Link} to="/register" size="lg">{t('landing.ctaButton')}</Button>
        </div>
      </section>
    </>
  );
}