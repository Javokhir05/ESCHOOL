import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

// [min, max] length for each text field. The server checks the same rules.
const TEXT_RULES = {
  titleUz: [3, 100], titleEn: [3, 100],
  summaryUz: [10, 300], summaryEn: [10, 300],
  durationUz: [1, 60], durationEn: [1, 60],
  scheduleUz: [1, 100], scheduleEn: [1, 100],
};

const lines = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean);

// Pairs Uzbek and English lines into [{ uz, en }]. Returns null when something is wrong.
function pairLines(uzText, enText, maxItems) {
  const uz = lines(uzText);
  const en = lines(enText);
  if (uz.length === 0 || uz.length !== en.length || uz.length > maxItems) return null;
  if ([...uz, ...en].some((s) => s.length > 200)) return null;
  return uz.map((u, i) => ({ uz: u, en: en[i] }));
}

function validate(v) {
  const e = {};
  for (const [key, [min, max]] of Object.entries(TEXT_RULES)) {
    const len = v[key].trim().length;
    if (len < min) e[key] = 'required';
    else if (len > max) e[key] = 'length';
  }
  if (!pairLines(v.outcomesUz, v.outcomesEn, 8)) e.outcomes = 'list';
  if (!pairLines(v.curriculumUz, v.curriculumEn, 12)) e.curriculum = 'list';
  return e;
}

// outcomesUz and outcomesEn share one error called "outcomes" (same for curriculum)
const groupKey = (k) => (/^(outcomes|curriculum)/.test(k) ? k.replace(/(Uz|En)$/, '') : k);

const emptyForm = (category) => ({
  category, level: 'intermediate', format: 'both',
  titleUz: '', titleEn: '', summaryUz: '', summaryEn: '',
  durationUz: '', durationEn: '', scheduleUz: '', scheduleEn: '',
  outcomesUz: '', outcomesEn: '', curriculumUz: '', curriculumEn: '',
});

const fromCourse = (c) => ({
  category: c.category, level: c.level, format: c.format,
  titleUz: c.titleUz, titleEn: c.titleEn,
  summaryUz: c.summaryUz, summaryEn: c.summaryEn,
  durationUz: c.durationUz, durationEn: c.durationEn,
  scheduleUz: c.scheduleUz, scheduleEn: c.scheduleEn,
  outcomesUz: c.outcomes.map((o) => o.uz).join('\n'),
  outcomesEn: c.outcomes.map((o) => o.en).join('\n'),
  curriculumUz: c.curriculum.map((o) => o.uz).join('\n'),
  curriculumEn: c.curriculum.map((o) => o.en).join('\n'),
});

function Editor({ courseId, initial }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[groupKey(key)]) setErrors((prev) => ({ ...prev, [groupKey(key)]: undefined }));
  };
  const err = (key) => (errors[groupKey(key)] ? t(`tc.errors.${errors[groupKey(key)]}`) : undefined);

  const options = (group, keys) => keys.map((k) => ({ value: k, label: t(`catalog.${group}.${k}`) }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const { outcomesUz, outcomesEn, curriculumUz, curriculumEn, ...rest } = v;
    const body = {
      ...rest,
      outcomes: pairLines(outcomesUz, outcomesEn, 8),
      curriculum: pairLines(curriculumUz, curriculumEn, 12),
    };

    setSaving(true);
    try {
      if (courseId) await api(`/teacher/courses/${courseId}`, { method: 'PUT', token, body });
      else await api('/teacher/courses', { method: 'POST', token, body });
      navigate('/teacher/courses');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/teacher/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('tc.back')}
      </Link>
      <h1 className="mt-4 text-2xl">{courseId ? t('tc.formEdit') : t('tc.formNew')}</h1>
      {!courseId && <p className="mt-1 text-sm text-ink-muted">{t('tc.saveNote')}</p>}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Card title={t('tc.basics')}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label={t('catalog.category')} options={options('categories', ['ielts', 'cefr', 'academic'])} value={v.category} onChange={change('category')} />
            <Select label={t('catalog.level')} options={options('levels', ['beginner', 'intermediate', 'advanced', 'school'])} value={v.level} onChange={change('level')} />
            <Select label={t('catalog.format')} options={options('formats', ['online', 'offline', 'both'])} value={v.format} onChange={change('format')} />
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {['Uz', 'En'].map((L) => (
            <Card key={L} title={t(L === 'Uz' ? 'tc.uzVersion' : 'tc.enVersion')}>
              <div className="space-y-4">
                <Input label={t('tc.courseTitle')} value={v[`title${L}`]} onChange={change(`title${L}`)} error={err(`title${L}`)} />
                <Textarea label={t('tc.summary')} rows={3} value={v[`summary${L}`]} onChange={change(`summary${L}`)} error={err(`summary${L}`)} />
                <Input label={t('tc.duration')} value={v[`duration${L}`]} onChange={change(`duration${L}`)} error={err(`duration${L}`)} />
                <Input label={t('tc.schedule')} value={v[`schedule${L}`]} onChange={change(`schedule${L}`)} error={err(`schedule${L}`)} />
                <Textarea
                  label={t('tc.outcomes')} rows={4} hint={t('tc.linesHint')}
                  value={v[`outcomes${L}`]} onChange={change(`outcomes${L}`)} error={err(`outcomes${L}`)}
                />
                <Textarea
                  label={t('tc.curriculum')} rows={5} hint={t('tc.linesHint')}
                  value={v[`curriculum${L}`]} onChange={change(`curriculum${L}`)} error={err(`curriculum${L}`)}
                />
              </div>
            </Card>
          ))}
        </div>

        {formError && (
          <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? t('tc.saving') : t('tc.save')}
        </Button>
      </form>
    </div>
  );
}

// Edit mode: load the course first, then show the form filled in
function EditLoader({ id }) {
  const { data, error, loading, reload } = useApi(`/teacher/courses/${id}`);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && <Editor courseId={id} initial={fromCourse(data.course)} />}
    </DataState>
  );
}

export default function CourseForm() {
  const { id } = useParams();
  const { user } = useAuth();

  if (id) return <EditLoader id={id} />;
  const subject = user.teacher?.subject ? user.teacher.subject.toLowerCase() : 'ielts';
  return <Editor initial={emptyForm(subject)} />;
}