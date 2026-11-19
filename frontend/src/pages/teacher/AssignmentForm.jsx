import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import FileButton from '../../components/FileButton';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatSize } from '../../utils/files';
import { toLocalInput } from '../../utils/dates';
import { useI18n } from '../../i18n';

const MAX_BYTES = 10 * 1024 * 1024;

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v, needCourse) {
  const e = {};
  if (needCourse && !v.courseId) e.courseId = 'required';

  const title = v.title.trim();
  if (title.length < 3) e.title = 'required';
  else if (title.length > 120) e.title = 'length';

  const instructions = v.instructions.trim();
  if (!instructions) e.instructions = 'required';
  else if (instructions.length > 5000) e.instructions = 'length';

  if (!v.dueAt || Number.isNaN(new Date(v.dueAt).getTime())) e.dueAt = 'date';

  const n = Number(v.maxScore);
  if (v.maxScore === '' || !Number.isInteger(n) || n < 1 || n > 1000) e.maxScore = 'maxScore';
  return e;
}

function Editor({ assignmentId, courses, courseTitle, initial }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [v, setV] = useState(initial.fields);
  const [savedFile, setSavedFile] = useState(initial.file); // PDF already on the server: { name, size } or null
  const [queued, setQueued] = useState(null); // PDF chosen but not uploaded yet: a File
  const [savedId, setSavedId] = useState(assignmentId || null); // set once the assignment exists
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`as.errors.${errors[key]}`) : undefined);

  const pickFile = (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!looksLikePdf || file.size === 0) return setFileError('notPdf');
    if (file.size > MAX_BYTES) return setFileError('tooBig');
    setFileError('');
    setQueued(file);
  };

  const removeSaved = async () => {
    if (!window.confirm(t('as.confirmRemoveFile'))) return;
    setFormError('');
    try {
      await api(`/teacher/assignments/${savedId}/attachment`, { method: 'DELETE', token });
      setSavedFile(null);
    } catch (error) {
      setFormError(apiErrorText(t, error));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v, !assignmentId);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const body = {
        title: v.title,
        instructions: v.instructions,
        dueAt: new Date(v.dueAt).toISOString(),
        maxScore: Number(v.maxScore),
      };
      let id = savedId;
      if (id) {
        await api(`/teacher/assignments/${id}`, { method: 'PUT', token, body });
      } else {
        const created = await api(`/teacher/courses/${v.courseId}/assignments`, { method: 'POST', token, body });
        id = created.assignment.id;
        setSavedId(id); // if the file fails below, pressing Save again must not create a second assignment
      }

      if (queued) {
        const form = new FormData();
        form.append('title', queued.name.replace(/\.pdf$/i, '').slice(0, 100) || 'PDF');
        form.append('file', queued);
        const done = await api(`/teacher/assignments/${id}/attachment`, { method: 'POST', token, form });
        setSavedFile(done.file);
        setQueued(null);
      }
      navigate('/teacher/assignments');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  const courseOptions = courses
    ? [{ value: '', label: t('as.chooseCourse') }, ...courses.map((c) => ({ value: c.id, label: c.title[lang] }))]
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/teacher/assignments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('as.back')}
      </Link>
      <h1 className="mt-4 text-2xl">{assignmentId ? t('as.formEdit') : t('as.formNew')}</h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Card>
          <div className="space-y-4">
            {assignmentId ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-navy">{t('as.course')}</p>
                <p className="text-sm text-ink-muted">{courseTitle}</p>
              </div>
            ) : (
              <Select label={t('as.course')} options={courseOptions} value={v.courseId} onChange={change('courseId')} error={err('courseId')} />
            )}
            <Input label={t('as.assignmentTitle')} value={v.title} onChange={change('title')} error={err('title')} />
            <Textarea
              label={t('as.instructions')} rows={8}
              value={v.instructions} onChange={change('instructions')} error={err('instructions')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('as.dueAt')} type="datetime-local" value={v.dueAt} onChange={change('dueAt')} error={err('dueAt')} />
              <Input
                label={t('as.maxScore')} type="number" min="1" max="1000" inputMode="numeric"
                value={v.maxScore} onChange={change('maxScore')} error={err('maxScore')}
              />
            </div>
          </div>
        </Card>

        <Card title={t('as.attachment')}>
          <p className="mb-4 text-sm text-ink-muted">{t('as.attachmentHint')}</p>

          {savedFile && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <FileButton path={`/files/assignments/${savedId}`} name={savedFile.name} size={savedFile.size} />
              <Button type="button" variant="secondary" size="sm" aria-label={`${t('as.removeFile')}: ${savedFile.name}`} onClick={removeSaved}>
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          )}

          {queued && (
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 break-all text-navy">
                {queued.name} · {formatSize(queued.size)} · {t('ls.queuedNote')}
              </span>
              <Button type="button" variant="secondary" size="sm" aria-label={t('as.removeFile')} onClick={() => setQueued(null)}>
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          )}

          {fileError && <p role="alert" className="mb-3 text-xs text-red-600">{t(`as.errors.${fileError}`)}</p>}

          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" tabIndex={-1} onChange={pickFile} />
          <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => fileInput.current?.click()}>
            <Plus size={16} aria-hidden="true" />
            {savedFile || queued ? t('as.replacePdf') : t('as.addPdf')}
          </Button>
        </Card>

        {formError && (
          <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? t('as.saving') : t('as.save')}
        </Button>
      </form>
    </div>
  );
}

// Edit mode: load the assignment first, then show the form filled in
function EditLoader({ id }) {
  const { lang } = useI18n();
  const { data, error, loading, reload } = useApi(`/teacher/assignments/${id}`);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <Editor
          assignmentId={id}
          courseTitle={data.assignment.course.title[lang]}
          initial={{
            fields: {
              courseId: data.assignment.course.id,
              title: data.assignment.title,
              instructions: data.assignment.instructions,
              dueAt: toLocalInput(data.assignment.dueAt),
              maxScore: String(data.assignment.maxScore),
            },
            file: data.assignment.file,
          }}
        />
      )}
    </DataState>
  );
}

// Create mode: load the teacher's courses for the dropdown
function CreateLoader() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/teacher/courses');
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (data.courses.length === 0 ? (
        <div className="mx-auto max-w-3xl">
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <p>{t('as.needCourse')}</p>
              <Button as={Link} to="/teacher/courses/new" size="sm">{t('tc.createFirst')}</Button>
            </div>
          </Card>
        </div>
      ) : (
        <Editor
          courses={data.courses}
          initial={{ fields: { courseId: '', title: '', instructions: '', dueAt: '', maxScore: '100' }, file: null }}
        />
      ))}
    </DataState>
  );
}

export default function AssignmentForm() {
  const { assignmentId } = useParams();
  return assignmentId ? <EditLoader id={assignmentId} /> : <CreateLoader />;
}