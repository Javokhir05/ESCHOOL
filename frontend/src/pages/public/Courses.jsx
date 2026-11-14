import { useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import CourseCard from '../../components/CourseCard';
import { Button, Input, Select } from '../../components/ui';
import { courses, teachers } from '../../data/courses';
import { useI18n } from '../../i18n';

const emptyFilters = { q: '', category: '', level: '', teacher: '', format: '' };

export default function Courses() {
  const { t, lang } = useI18n();
  const [f, setF] = useState(emptyFilters);
  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }));

  const withAll = (items) => [{ value: '', label: t('catalog.all') }, ...items];
  const fromKeys = (group, keys) => keys.map((k) => ({ value: k, label: t(`catalog.${group}.${k}`) }));

  const categoryOptions = withAll(fromKeys('categories', ['ielts', 'cefr', 'academic']));
  const levelOptions = withAll(fromKeys('levels', ['beginner', 'intermediate', 'advanced', 'school']));
  const formatOptions = withAll(fromKeys('formats', ['online', 'offline']));
  const teacherOptions = withAll(teachers.map((x) => ({ value: x.id, label: x.name[lang] })));

  const list = useMemo(() => {
    const q = f.q.trim().toLocaleLowerCase();
    return courses.filter((c) => {
      if (f.category && c.category !== f.category) return false;
      if (f.level && c.level !== f.level) return false;
      if (f.teacher && c.teacherId !== f.teacher) return false;
      // "Online" also shows courses that run in both formats, same for "In the center"
      if (f.format && c.format !== f.format && c.format !== 'both') return false;
      if (q && !`${c.title[lang]} ${c.summary[lang]}`.toLocaleLowerCase().includes(q)) return false;
      return true;
    });
  }, [f, lang]);

  const hasFilters = Object.values(f).some(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl">{t('catalog.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('catalog.sub')}</p>
      <p className="mt-1 text-sm text-ink-muted">{t('catalog.sampleNote')}</p>

      <div className="mt-8 space-y-4">
        <Input
          type="search"
          label={t('catalog.search')}
          placeholder={t('catalog.searchPlaceholder')}
          value={f.q}
          onChange={set('q')}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label={t('catalog.category')} options={categoryOptions} value={f.category} onChange={set('category')} />
          <Select label={t('catalog.level')} options={levelOptions} value={f.level} onChange={set('level')} />
          <Select label={t('catalog.teacher')} options={teacherOptions} value={f.teacher} onChange={set('teacher')} />
          <Select label={t('catalog.format')} options={formatOptions} value={f.format} onChange={set('format')} />
        </div>
      </div>

      <p className="mt-8 text-sm font-semibold text-navy" aria-live="polite">
        {t('catalog.found')} {list.length}
      </p>

      {list.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      ) : (
        <div className="mt-4 rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">
          <SearchX size={32} className="mx-auto text-ink-muted" aria-hidden="true" />
          <h2 className="mt-3 text-lg">{t('catalog.emptyTitle')}</h2>
          <p className="mt-1 text-ink-muted">{t('catalog.emptyText')}</p>
          {hasFilters && (
            <Button variant="secondary" className="mt-5" onClick={() => setF(emptyFilters)}>
              {t('catalog.clear')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}