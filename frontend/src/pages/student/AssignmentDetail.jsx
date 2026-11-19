import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import FileButton from '../../components/FileButton';
import NotAvailable from '../../components/NotAvailable';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatSize } from '../../utils/files';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

const MAX_BYTES = 10 * 1024 * 1024;

function Paragraphs({ text }) {
  return (
    <div className="space-y-4 leading-relaxed text-ink">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">{p}</p>
      ))}
    </div>
  );
}

function AssignmentPage({ data, reload }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const fileInput = useRef(null);
  const { assignment: a, submission: s } = data;
  const graded = !!s && s.status === 'GRADED';
  const pastDue = new Date(a.dueAt) < new Date();

  const [text, setText] = useState(s?.text || '');
  const [queued, setQueued] = useState(null); // a PDF chosen but not sent yet
  const [removeSaved, setRemoveSaved] = useState(false); // the saved PDF will be removed on send
  const [error, setError] = useState(''); // a key under sa.errors
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const savedFile = removeSaved ? null : s?.file || null;

  const pickFile = (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!looksLikePdf || file.size === 0) return setError('notPdf');
    if (file.size > MAX_BYTES) return setError('tooBig');
    setError('');
    setSent(false);
    setQueued(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSent(false);

    const trimmed = text.trim();
    if (trimmed.length > 10000) return setError('length');
    if (!trimmed && !queued && !savedFile) return setError('empty');
    setError('');

    const form = new FormData();
    form.append('text', text);
    if (removeSaved) form.append('removeFile', 'true');
    if (queued) {
      form.append('fileName', queued.name.replace(/\.pdf$/i, '').slice(0, 100) || 'PDF');
      form.append('file', queued);
    }

    setSaving(true);
    try {
      await api(`/student/assignments/${a.id}/submission`, { method: 'PUT', token, form });
      setQueued(null);
      setRemoveSaved(false);
      setSent(true);
      reload();
    } catch (err) {
      setFormError(apiErrorText(t, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link to="/student/assignments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('sa.back')}
      </Link>

      <h1 className="mt-4 text-2xl">{a.title}</h1>
      <p className="mt-1 text-ink-muted">{a.course.title[lang]}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>{t('sa.due')}: {formatDateTime(a.dueAt, lang)}</span>
        <span>· {t('sa.maxScore')}: {a.maxScore}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={graded ? 'teal' : s ? 'blue' : 'neutral'}>{t(`sa.status.${s ? s.status : 'NONE'}`)}</Badge>
        {!s && pastDue && <Badge tone="amber">{t('sa.overdue')}</Badge>}
        {s && s.late && <Badge tone="amber">{t('sa.late')}</Badge>}
      </div>

      <Card title={t('sa.instructions')} className="mt-6">
        <Paragraphs text={a.instructions} />
        {a.file && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-xs text-ink-muted">{t('sa.attachment')}</p>
            <FileButton path={`/files/assignments/${a.id}`} name={a.file.name} size={a.file.size} />
          </div>
        )}
      </Card>

      {graded ? (
        <>
          <Card title={t('sa.yourGrade')} className="mt-4">
            <p className="text-3xl font-bold text-teal-dark">
              {t('sa.scoreOf').replace('{score}', s.score).replace('{max}', a.maxScore)}
            </p>
            <h3 className="mb-2 mt-5 text-base">{t('sa.feedback')}</h3>
            {s.feedback ? <Paragraphs text={s.feedback} /> : <p className="text-sm text-ink-muted">{t('sa.noFeedback')}</p>}
          </Card>

          <Card title={t('sa.yourWork')} className="mt-4">
            {s.text ? <Paragraphs text={s.text} /> : <p className="text-sm text-ink-muted">{t('sa.noText')}</p>}
            {s.file && (
              <div className="mt-4 border-t border-line pt-4">
                <FileButton path={`/files/submissions/${s.id}`} name={s.file.name} size={s.file.size} />
              </div>
            )}
          </Card>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-4">
          <Card title={t('sa.yourWork')}>
            {s && (
              <p className="mb-4 text-sm text-ink-muted">
                {t('sa.submittedOn')}: {formatDateTime(s.submittedAt, lang)} · {t('sa.waiting')}
              </p>
            )}
            {pastDue && (
              <p className="mb-4 rounded-control bg-amber-soft px-3 py-2 text-sm text-amber">{t('sa.lateWarning')}</p>
            )}

            <div className="space-y-4">
              <Textarea
                label={t('sa.answer')} rows={8} hint={t('sa.answerHint')}
                value={text}
                onChange={(e) => { setText(e.target.value); setError(''); setSent(false); }}
                error={error === 'empty' || error === 'length' ? t(`sa.errors.${error}`) : undefined}
              />

              <div>
                <p className="mb-2 text-sm font-semibold text-navy">{t('sa.file')}</p>

                {savedFile && (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <FileButton path={`/files/submissions/${s.id}`} name={savedFile.name} size={savedFile.size} />
                    <Button
                      type="button" variant="secondary" size="sm"
                      aria-label={`${t('sa.removeFile')}: ${savedFile.name}`}
                      onClick={() => { setRemoveSaved(true); setSent(false); }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </div>
                )}

                {removeSaved && s?.file && (
                  <p className="mb-3 text-sm text-ink-muted">
                    {t('sa.removeNote')}{' '}
                    <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setRemoveSaved(false)}>
                      {t('sa.undoRemove')}
                    </button>
                  </p>
                )}

                {queued && (
                  <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 break-all text-navy">
                      {queued.name} · {formatSize(queued.size)} · {t('sa.queuedNote')}
                    </span>
                    <Button type="button" variant="secondary" size="sm" aria-label={t('sa.removeFile')} onClick={() => setQueued(null)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </div>
                )}

                {(error === 'notPdf' || error === 'tooBig') && (
                  <p role="alert" className="mb-3 text-xs text-red-600">{t(`sa.errors.${error}`)}</p>
                )}

                <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" tabIndex={-1} onChange={pickFile} />
                <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => fileInput.current?.click()}>
                  <Plus size={16} aria-hidden="true" />
                  {savedFile || queued ? t('sa.replacePdf') : t('sa.addPdf')}
                </Button>
              </div>
            </div>

            {formError && (
              <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            {sent && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-control bg-teal-soft px-3 py-2 text-sm text-teal-dark">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                {t('sa.savedOk')}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-6" disabled={saving}>
              {saving ? t('sa.saving') : s ? t('sa.update') : t('sa.submit')}
            </Button>
          </Card>
        </form>
      )}
    </>
  );
}

export default function StudentAssignment() {
  const { assignmentId } = useParams();
  const { data, error, loading, status, reload } = useApi(`/student/assignments/${assignmentId}`);

  if (status === 404) return <NotAvailable />;

  return (
    <div className="mx-auto max-w-3xl">
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && <AssignmentPage key={assignmentId} data={data} reload={reload} />}
      </DataState>
    </div>
  );
}