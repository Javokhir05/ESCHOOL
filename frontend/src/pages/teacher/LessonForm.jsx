import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import MaterialLink from '../../components/MaterialLink';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatSize } from '../../utils/files';
import { useI18n } from '../../i18n';

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;
let rowCounter = 0;

function validUrl(value) {
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && value.trim().length <= 500;
  } catch {
    return false;
  }
}

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v) {
  const e = {};
  const title = v.title.trim();
  if (title.length < 3) e.title = 'required';
  else if (title.length > 120) e.title = 'length';

  const content = v.content.trim();
  if (!content) e.content = 'required';
  else if (content.length > 10000) e.content = 'length';

  if (v.videoUrl.trim() && !validUrl(v.videoUrl)) e.videoUrl = 'url';
  return e;
}

function Editor({ courseId, lessonId, initial }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [v, setV] = useState(initial.fields);
  const [saved, setSaved] = useState(initial.materials); // files already on the server
  const [queue, setQueue] = useState([]); // files chosen but not uploaded yet: { key, file, title }
  const [savedId, setSavedId] = useState(lessonId || null); // set once the lesson exists
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`ls.errors.${errors[key]}`) : undefined);

  const pickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // lets the teacher pick the same file again later

    let room = MAX_FILES - saved.length - queue.length;
    const next = [];
    let problem = '';
    for (const file of picked) {
      const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!looksLikePdf || file.size === 0) { problem = 'notPdf'; continue; }
      if (file.size > MAX_BYTES) { problem = 'tooBig'; continue; }
      if (room <= 0) { problem = 'tooMany'; break; }
      next.push({ key: ++rowCounter, file, title: file.name.replace(/\.pdf$/i, '').slice(0, 100) });
      room -= 1;
    }
    setQueue((prev) => [...prev, ...next]);
    setFileError(problem);
  };

  const changeQueued = (key) => (e) => {
    setQueue((prev) => prev.map((r) => (r.key === key ? { ...r, title: e.target.value } : r)));
    setFileError('');
  };
  const removeQueued = (key) => {
    setQueue((prev) => prev.filter((r) => r.key !== key));
    setFileError('');
  };

  const removeSaved = async (material) => {
    if (!window.confirm(t('ls.confirmRemoveFile'))) return;
    setFormError('');
    try {
      await api(`/teacher/materials/${material.id}`, { method: 'DELETE', token });
      setSaved((prev) => prev.filter((m) => m.id !== material.id));
    } catch (error) {
      setFormError(apiErrorText(t, error));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (queue.some((r) => !r.title.trim())) {
      setFileError('nameRequired');
      return;
    }

    setSaving(true);
    try {
      const body = { title: v.title, content: v.content, videoUrl: v.videoUrl };
      let id = savedId;
      if (id) {
        await api(`/teacher/lessons/${id}`, { method: 'PUT', token, body });
      } else {
        const created = await api(`/teacher/courses/${courseId}/lessons`, { method: 'POST', token, body });
        id = created.lesson.id;
        setSavedId(id); // if a file fails below, pressing Save again must not create a second lesson
      }

      for (const row of queue) {
        const form = new FormData();
        form.append('title', row.title.trim());
        form.append('file', row.file);
        const done = await api(`/teacher/lessons/${id}/materials`, { method: 'POST', token, form });
        setSaved((prev) => [...prev, { ...done.material, hasFile: true }]);
        setQueue((prev) => prev.filter((r) => r.key !== row.key));
      }
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

          {saved.length > 0 && (
            <ul className="mb-4 space-y-3">
              {saved.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <MaterialLink material={m} />
                  <Button
                    type="button" variant="secondary" size="sm"
                    aria-label={`${t('ls.removeFile')}: ${m.title}`} onClick={() => removeSaved(m)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {queue.length > 0 && (
            <div className="space-y-3">
              {queue.map((r) => (
                <div key={r.key} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Input
                    label={t('ls.materialTitle')} maxLength={100}
                    hint={`${r.file.name} · ${formatSize(r.file.size)} · ${t('ls.queuedNote')}`}
                    value={r.title} onChange={changeQueued(r.key)}
                  />
                  <Button
                    type="button" variant="secondary" className="h-11"
                    aria-label={`${t('ls.removeFile')}: ${r.title}`} onClick={() => removeQueued(r.key)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {fileError && <p role="alert" className="mt-3 text-xs text-red-600">{t(`ls.errors.${fileError}`)}</p>}

          {saved.length + queue.length < MAX_FILES && (
            <>
              <input
                ref={fileInput} type="file" accept="application/pdf,.pdf" multiple
                className="hidden" tabIndex={-1} onChange={pickFiles}
              />
              <Button type="button" variant="ghost" size="sm" className="-ml-3 mt-3" onClick={() => fileInput.current?.click()}>
                <Plus size={16} aria-hidden="true" />
                {t('ls.addPdf')}
              </Button>
            </>
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
            materials: data.lesson.materials,
          }}
        />
      )}
    </DataState>
  );
}

export default function LessonForm() {
  const { id, lessonId } = useParams();
  if (lessonId) return <EditLoader courseId={id} lessonId={lessonId} />;
  return <Editor courseId={id} initial={{ fields: { title: '', content: '', videoUrl: '' }, materials: [] }} />;
}