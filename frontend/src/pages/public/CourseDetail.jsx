import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, Clock, MonitorSmartphone, UserRound } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import { courses, teachers } from '../../data/courses';
import { courseDetails } from '../../data/courseDetails';
import { useI18n } from '../../i18n';

const tones = { ielts: 'blue', cefr: 'teal', academic: 'violet' };

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-sm font-semibold text-navy">{value}</p>
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const course = courses.find((c) => c.id === id);
  const details = courseDetails[id];

  if (!course || !details) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl">{t('detail.notFoundTitle')}</h1>
        <p className="mt-2 text-ink-muted">{t('detail.notFoundText')}</p>
        <Button as={Link} to="/courses" variant="secondary" className="mt-6">{t('detail.back')}</Button>
      </div>
    );
  }

  const teacher = teachers.find((x) => x.id === course.teacherId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('detail.back')}
      </Link>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge tone={tones[course.category]}>{t(`catalog.categories.${course.category}`)}</Badge>
        <Badge tone="neutral">{t(`catalog.levels.${course.level}`)}</Badge>
      </div>
      <h1 className="mt-3 text-3xl sm:text-4xl">{course.title[lang]}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">{course.summary[lang]}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl">{t('detail.outcomes')}</h2>
            <ul className="mt-4 space-y-3">
              {details.outcomes.map((o) => (
                <li key={o.en} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal-dark">
                    <Check size={13} aria-hidden="true" />
                  </span>
                  <span>{o[lang]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl">{t('detail.curriculum')}</h2>
            <ol className="mt-4 space-y-3">
              {details.curriculum.map((m, i) => (
                <li key={m.en} className="flex items-center gap-4 rounded-card border border-line bg-white px-4 py-3 shadow-card">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="font-medium text-navy">{m[lang]}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="self-start lg:sticky lg:top-24">
          <Card title={t('detail.info')}>
            <div className="space-y-4">
              <InfoRow icon={UserRound} label={t('detail.teacher')} value={teacher?.name[lang]} />
              <InfoRow icon={MonitorSmartphone} label={t('detail.format')} value={t(`catalog.formats.${course.format}`)} />
              <InfoRow icon={Clock} label={t('detail.duration')} value={details.duration[lang]} />
              <InfoRow icon={CalendarDays} label={t('detail.schedule')} value={details.schedule[lang]} />
            </div>
            <Button as={Link} to="/register" size="lg" className="mt-6 w-full">{t('detail.enroll')}</Button>
            <p className="mt-3 text-center text-xs text-ink-muted">{t('detail.enrollNote')}</p>
          </Card>
          <p className="mt-3 text-xs text-ink-muted">{t('catalog.sampleNote')}</p>
        </aside>
      </div>
    </div>
  );
}