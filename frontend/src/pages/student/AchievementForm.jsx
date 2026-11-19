import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Select } from '../../components/ui';
import DataState from '../../components/DataState';
import FileButton from '../../components/FileButton';
import NotAvailable from '../../components/NotAvailable';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatSize } from '../../utils/files';
import { toDateInput } from '../../utils/dates';
import { useI18n } from '../../i18n';

const MAX_BYTES = 10 * 1024 * 1024;

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v) {
  const e = {};
  if (!v.type) e.type = 'required';

  const title = v.title.trim();
  if (title.length < 3) e.title = 'required';
  else if (title.length > 120) e.title = 'length';

  const result = v.result.trim();
  if (!result) e.result = 'required';
  else if (result.length > 30) e.result = 'length';

  const d = new Date(`${v.issuedOn}T00:00:00Z`);
  const latest = Date.now() + 24 * 60 * 60 * 1000;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.issuedOn) || Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000 || d.getTime() > latest) {
    e.issuedOn = 'date';
  }
  return e;
}

function Editor({ id, initial }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [v, setV] = useState(initial.fields);
  const [queued, setQueued] = useState(null); // a PDF chosen but not uploaded yet
  const [removeSaved, setRemoveSaved] = useState(false); // the saved PDF will be removed on save
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const savedFile = removeSaved ? null : initial.file;

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`ac.errors.${errors[key]}`) : undefined);

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

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const form = new FormData();
    form.append('type', v.type);
    form.append('title', v.title);
    form.append('result', v.result);
    form.append('issuedOn', v.issuedOn);
    form.append('showPublic', String(v.showPublic));
    if (removeSaved) form.append('removeFile', 'true');
    if (queued) {
      form.append('fileName', queued.name.replace(/\.pdf$/i, '').slice(0, 100) || 'Certificate');
      form.append('file', queued);
    }

    setSaving(true);
    try {
      await api(id ? `/student/achievements/${id}` : '/student/achievements', {
        method: id ? 'PUT' : 'POST',
        token,
        form,
      });
      navigate('/student/achievements');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  const typeOptions = ['ielts', 'cefr', 'olympiad', 'other'].map((k) => ({ value: k, label: t(`ac.types.${k}`) }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/student/achievements" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('ac.back')}
      </Link>
      <h1 className="mt-4 text-2xl">{id ? t('ac.formEdit') : t('ac.formNew')}</h1>
      {id && <p className="mt-1 text-sm text-ink-muted">{t('ac.editWarning')}</p>}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Card>
          <div className="space-y-4">
            <Select label={t('ac.type')} options={typeOptions} value={v.type} onChange={change('type')} error={err('type')} />
            <Input
              label={t('ac.achievementTitle')} hint={t('ac.titleHint')} maxLength={120}
              value={v.title} onChange={change('title')} error={err('title')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('ac.result')} hint={t('ac.resultHint')} maxLength={30}
                value={v.result} onChange={change('result')} error={err('result')}
              />
              <Input label={t('ac.issuedOn')} type="date" value={v.issuedOn} onChange={change('issuedOn')} error={err('issuedOn')} />
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm font-semibold text-navy">
                <input
                  type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={v.showPublic}
                  onChange={(e) => setV((prev) => ({ ...prev, showPublic: e.target.checked }))}
                />
                {t('ac.showPublic')}
              </label>
              <p className="ml-7 mt-1 text-xs text-ink-muted">{t('ac.showPublicHint')}</p>
            </div>
          </div>
        </Card>

        <Card title={t('ac.certificate')}>
          <p className="mb-4 text-sm text-ink-muted">{t('ac.certificateHint')}</p>

          {savedFile && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <FileButton path={`/files/achievements/${id}`} name={savedFile.name} size={savedFile.size} />
              <Button
                type="button" variant="secondary" size="sm"
                aria-label={`${t('ac.removeFile')}: ${savedFile.name}`} onClick={() => setRemoveSaved(true)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          )}

          {removeSaved && initial.file && (
            <p className="mb-3 text-sm text-ink-muted">
              {t('ac.removeNote')}{' '}
              <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setRemoveSaved(false)}>
                {t('ac.undoRemove')}
              </button>
            </p>
          )}

          {queued && (
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 break-all text-navy">
                {queued.name} · {formatSize(queued.size)} · {t('ac.queuedNote')}
              </span>
              <Button type="button" variant="secondary" size="sm" aria-label={t('ac.removeFile')} onClick={() => setQueued(null)}>
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          )}

          {fileError && <p role="alert" className="mb-3 text-xs text-red-600">{t(`ac.errors.${fileError}`)}</p>}

          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" tabIndex={-1} onChange={pickFile} />
          <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => fileInput.current?.click()}>
            <Plus size={16} aria-hidden="true" />
            {savedFile || queued ? t('ac.replacePdf') : t('ac.addPdf')}
          </Button>
        </Card>

        {formError && (
          <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? t('ac.saving') : t('ac.save')}
        </Button>
      </form>
    </div>
  );
}

// Edit mode: find the achievement in the student's list, then show the form filled in
function EditLoader({ id }) {
  const { data, error, loading, reload } = useApi('/student/achievements');
  const found = data ? data.achievements.find((a) => a.id === id) : null;

  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && !found && <NotAvailable />}
      {/* A verified achievement is locked, so its edit page sends the student back to the list */}
      {found && found.status === 'VERIFIED' && <Navigate to="/student/achievements" replace />}
      {found && found.status !== 'VERIFIED' && (
        <Editor
          id={id}
          initial={{
            fields: {
              type: found.type,
              title: found.title,
              result: found.result,
              issuedOn: toDateInput(found.issuedOn),
              showPublic: found.showPublic,
            },
            file: found.file,
          }}
        />
      )}
    </DataState>
  );
}

export default function AchievementForm() {
  const { id } = useParams();
  if (id) return <EditLoader id={id} />;
  return (
    <Editor initial={{ fields: { type: 'ielts', title: '', result: '', issuedOn: '', showPublic: false }, file: null }} />
  );
}