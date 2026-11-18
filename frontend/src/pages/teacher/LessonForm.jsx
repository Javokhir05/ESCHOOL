import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

let rowCounter = 0;
const newRow = (title = '', url = '') => ({ key: ++rowCounter, title, url });

function validUrl(value) {
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && value.trim().length <= 500;
  } catch {
    return false;
  }
}

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v, rows) {
  const e = {};
  const title = v.title.trim();
  if (title.length < 3) e.title = 'required';
  else if (title.length > 120) e.title = 'length';

  const content = v.content.trim();
  if (!content) e.content = 'required';
  else if (content.length > 10000) e.content = 'length';

  if (v.videoUrl.trim() && !validUrl(v.videoUrl)) e.videoUrl = 'url';

  const filled = rows.filter((r) => r.title.trim() || r.url.trim());
  const badRow = filled.some((r) => !r.title.trim() || r.title.trim().length > 100 || !validUrl(r.url));
  if (filled.length > 10 || badRow) e.materials = 'materials';
  return e;
}

function Editor({ courseId, lessonId, initial }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState(initial.fields);
  const [rows, setRows] = useState(initial.rows);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`ls.errors.${errors[key]}`) : undefined);

  const changeRow = (key, field) => (e) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: e.target.value } : r)));
    if (errors.materials) setErrors((prev) => ({ ...prev, materials: undefined }));
  };
  const addRow = () => setRows((prev) => (prev.length >= 10 ? prev : [...prev, newRow()]));
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v, rows);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      title: v.title,
      content: v.content,
      videoUrl: v.videoUrl,
      // Rows left completely empty are simply ignored
      materials: rows.filter((r) => r.title.trim() || r.url.trim()).map((r) => ({ title: r.title, url: r.url })),
    };

    setSaving(true);
    try {
      if (lessonId) await api(`/teacher/lessons/${lessonId}`, { method: 'PUT', token, body });
      else await api(`/teacher/courses/${courseId}/lessons`, { method: 'POST', token, body });
      navigate(`/teacher/courses/${courseId}/lessons`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/teacher/courses/${courseId}/lessons`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('ls.back')}
      </Link>
      <h1 className="mt-4 text-2xl">{lessonId ? t('ls.formEdit') : t('ls.formNew')}</h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Card>
          <div className="space-y-4">
            <Input label={t('ls.lessonTitle')} value={v.title} onChange={change('title')} error={err('title')} />
            <Textarea
              label={t('ls.content')} rows={10} hint={t('ls.contentHint')}
              value={v.content} onChange={change('content')} error={err('content')}
            />
            <Input
              label={t('ls.videoUrl')} type="url" placeholder="https://" hint={t('ls.videoHint')}
              value={v.videoUrl} onChange={change('videoUrl')} error={err('videoUrl')}
            />
          </div>
        </Card>

        <Card title={t('ls.materials')}>
          <p className="mb-4 text-sm text-ink-muted">{t('ls.materialsHint')}</p>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.key} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                <Input label={t('ls.materialTitle')} value={r.title} onChange={changeRow(r.key, 'title')} />
                <Input label={t('ls.materialUrl')} type="url" placeholder="https://" value={r.url} onChange={changeRow(r.key, 'url')} />
                <Button
                  type="button" variant="secondary" className="h-11"
                  aria-label={`${t('ls.removeMaterial')} ${i + 1}`} onClick={() => removeRow(r.key)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          {errors.materials && (
            <p role="alert" className="mt-3 text-xs text-red-600">{err('materials')}</p>
          )}

          {rows.length < 10 && (
            <Button type="button" variant="ghost" size="sm" className="mt-3 -ml-3" onClick={addRow}>
              <Plus size={16} aria-hidden="true" />
              {t('ls.addMaterial')}
            </Button>
          )}
        </Card>

        {formError && (
          <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? t('ls.saving') : t('ls.save')}
        </Button>
      </form>
    </div>
  );
}

// Edit mode: load the lesson first, then show the form filled in
function EditLoader({ courseId, lessonId }) {
  const { data, error, loading, reload } = useApi(`/teacher/lessons/${lessonId}`);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <Editor
          courseId={courseId}
          lessonId={lessonId}
          initial={{
            fields: { title: data.lesson.title, content: data.lesson.content, videoUrl: data.lesson.videoUrl || '' },
            rows: data.lesson.materials.map((m) => newRow(m.title, m.url)),
          }}
        />
      )}
    </DataState>
  );
}

export default function LessonForm() {
  const { id, lessonId } = useParams();
  if (lessonId) return <EditLoader courseId={id} lessonId={lessonId} />;
  return <Editor courseId={id} initial={{ fields: { title: '', content: '', videoUrl: '' }, rows: [] }} />;
}