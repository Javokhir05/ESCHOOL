import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, Card, Input, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import FileButton from '../../components/FileButton';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

function ReviewForm({ id, data }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { submission: s, assignment: a, student } = data;

  const [score, setScore] = useState(s.score == null ? '' : String(s.score));
  const [feedback, setFeedback] = useState(s.feedback || '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const err = (key) => (errors[key] ? t(`as.errors.${errors[key]}`) : undefined);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = {};
    const n = Number(score);
    if (score === '' || !Number.isInteger(n) || n < 0 || n > a.maxScore) found.score = 'score';
    if (feedback.trim().length > 2000) found.feedback = 'length';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await api(`/teacher/submissions/${id}/grade`, { method: 'PUT', token, body: { score: n, feedback } });
      navigate(`/teacher/assignments/${a.id}/submissions`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  return (
    <>
      <Link
        to={`/teacher/assignments/${a.id}/submissions`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('as.backToList')}
      </Link>

      <h1 className="mt-4 text-2xl">{student.fullName}</h1>
      <p className="mt-1 text-ink-muted">{a.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>{t('auth.gradeFormat').replace('{n}', student.grade)}</span>
        <span>· {t('as.submittedAt')}: {formatDateTime(s.submittedAt, lang)}</span>
        {s.late && <Badge tone="amber">{t('as.late')}</Badge>}
        <Badge tone={s.status === 'GRADED' ? 'teal' : 'amber'}>{t(`as.status.${s.status}`)}</Badge>
      </div>

      <Card title={t('as.answer')} className="mt-6">
        {s.text ? (
          <div className="space-y-4 leading-relaxed text-ink">
            {s.text.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t('as.noText')}</p>
        )}
      </Card>

      <Card title={t('as.file')} className="mt-4">
        {s.file ? (
          <FileButton path={`/files/submissions/${s.id}`} name={s.file.name} size={s.file.size} />
        ) : (
          <p className="text-sm text-ink-muted">{t('as.noFile')}</p>
        )}
      </Card>

      <form onSubmit={onSubmit} noValidate className="mt-4">
        <Card title={t('as.saveGrade')}>
          <div className="space-y-4">
            <Input
              label={`${t('as.score')} (0 – ${a.maxScore})`} type="number" min="0" max={a.maxScore} inputMode="numeric"
              hint={t('as.scoreHint').replace('{max}', a.maxScore)}
              value={score}
              onChange={(e) => { setScore(e.target.value); setErrors((p) => ({ ...p, score: undefined })); }}
              error={err('score')}
            />
            <Textarea
              label={t('as.feedback')} rows={6} hint={t('as.feedbackHint')}
              value={feedback}
              onChange={(e) => { setFeedback(e.target.value); setErrors((p) => ({ ...p, feedback: undefined })); }}
              error={err('feedback')}
            />
            {formError && (
              <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? t('as.saving') : t('as.saveGrade')}
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}

export default function SubmissionReview() {
  const { submissionId } = useParams();
  const { data, error, loading, reload } = useApi(`/teacher/submissions/${submissionId}`);
  return (
    <div className="mx-auto max-w-3xl">
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && <ReviewForm key={submissionId} id={submissionId} data={data} />}
      </DataState>
    </div>
  );
}