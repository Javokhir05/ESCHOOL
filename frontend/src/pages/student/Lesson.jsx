import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Paperclip, Video } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import NotAvailable from '../../components/NotAvailable';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

// Only real web links become clickable
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : null);

function LessonPage({ lessonId }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, status, reload } = useApi(`/student/lessons/${lessonId}`);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  if (status === 404) return <NotAvailable />;

  const toggle = async () => {
    setSaving(true);
    setActionError('');
    try {
      await api(`/student/lessons/${lessonId}/progress`, {
        method: 'PUT',
        token,
        body: { completed: !data.lesson.completed },
      });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <Link
              to={`/student/courses/${data.course.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {data.course.title[lang]}
            </Link>

            <p className="mt-4 text-sm text-ink-muted">
              {t('sc.lessonNumber').replace('{n}', data.lesson.number).replace('{total}', data.lesson.total)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl">{data.lesson.title}</h1>
              {data.lesson.completed && <Badge tone="teal">{t('sc.completed')}</Badge>}
            </div>

            <Card className="mt-6">
              <div className="space-y-4 leading-relaxed text-ink">
                {data.lesson.content.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className="whitespace-pre-line">{p}</p>
                ))}
              </div>
            </Card>

            {safeUrl(data.lesson.videoUrl) && (
              <div className="mt-4">
                <Button as="a" href={safeUrl(data.lesson.videoUrl)} target="_blank" rel="noopener noreferrer" variant="secondary">
                  <Video size={16} aria-hidden="true" />
                  {t('sc.video')}
                  <ExternalLink size={14} aria-hidden="true" />
                </Button>
              </div>
            )}

            {data.lesson.materials.length > 0 && (
              <Card title={t('sc.materials')} className="mt-4">
                <ul className="space-y-2">
                  {data.lesson.materials.map((m) => (
                    <li key={m.id}>
                      {safeUrl(m.url) ? (
                        <a
                          href={safeUrl(m.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
                        >
                          <Paperclip size={16} aria-hidden="true" />
                          {m.title}
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-sm text-ink-muted">{m.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {actionError && (
              <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
            )}

            <Button
              size="lg"
              className="mt-6"
              variant={data.lesson.completed ? 'secondary' : 'primary'}
              disabled={saving}
              onClick={toggle}
            >
              {data.lesson.completed && !saving && <Check size={18} aria-hidden="true" />}
              {saving ? t('sc.saving') : data.lesson.completed ? t('sc.markUndone') : t('sc.markDone')}
            </Button>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              {data.prevId ? (
                <Button as={Link} to={`/student/lessons/${data.prevId}`} variant="secondary">
                  <ArrowLeft size={16} aria-hidden="true" />
                  {t('sc.prev')}
                </Button>
              ) : <span />}
              {data.nextId ? (
                <Button as={Link} to={`/student/lessons/${data.nextId}`}>
                  {t('sc.next')}
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              ) : (
                <Button as={Link} to={`/student/courses/${data.course.id}`} variant="secondary">
                  {t('sc.backToCourse')}
                </Button>
              )}
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}

// key= makes React start fresh (clears old messages) whenever the lesson changes
export default function StudentLesson() {
  const { lessonId } = useParams();
  return <LessonPage key={lessonId} lessonId={lessonId} />;
}