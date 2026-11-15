import { Link } from 'react-router-dom';
import { Calculator, GraduationCap, Languages } from 'lucide-react';
import { Badge, Button } from './ui';
import { useI18n } from '../i18n';

const categoryStyle = {
  ielts: { icon: GraduationCap, box: 'bg-brand', tone: 'blue' },
  cefr: { icon: Languages, box: 'bg-teal', tone: 'teal' },
  academic: { icon: Calculator, box: 'bg-violet', tone: 'violet' },
};

export default function CourseCard({ course }) {
  const { t, lang } = useI18n();
  const { icon: Icon, box, tone } = categoryStyle[course.category];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex h-24 items-center bg-brand-soft/70 px-5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-control text-white ${box}`}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone={tone}>{t(`catalog.categories.${course.category}`)}</Badge>
          <Badge tone="neutral">{t(`catalog.levels.${course.level}`)}</Badge>
        </div>
        <h3 className="text-lg">{course.title[lang]}</h3>
        <p className="mt-1.5 text-sm text-ink-muted">{course.summary[lang]}</p>
        <p className="mt-3 text-sm text-ink-muted">
          {course.teacher.fullName} · {t(`catalog.formats.${course.format}`)}
        </p>
        <Button as={Link} to={`/courses/${course.id}`} size="sm" className="mt-5 self-start">
          {t('catalog.viewCourse')}
        </Button>
      </div>
    </article>
  );
}