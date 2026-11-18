import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Paperclip, Pencil, Plus, Trash2, Video } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function Lessons() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi(`/teacher/courses/${id}/lessons`);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const run = async (lessonId, request) => {
    setBusy(lessonId);
    setActionError('');
    try {
      await request();
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const move = (lessonId, direction) =>
    run(lessonId, () => api(`/teacher/lessons/${lessonId}/move`, { method: 'PATCH', token, body: { direction } }));

  const remove = (lessonId) => {
    if (!window.confirm(t('ls.confirmDelete'))) return;
    run(lessonId, () => api(`/teacher/lessons/${lessonId}`, { method: 'DELETE', token }));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/teacher/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('tc.back')}
      </Link>

      <div className="mt-4">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl">{data.course.title[lang]}</h1>
                  <p className="mt-1 text-ink-muted">{t('ls.title')}</p>
                </div>
                <Button as={Link} to={`/teacher/courses/${id}/lessons/new`}>
                  <Plus size={16} aria-hidden="true" />
                  {t('ls.addLesson')}
                </Button>
              </div>

              {actionError && (
                <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
              )}

              <div className="mt-6">
                {data.lessons.length === 0 ? (
                  <Card><p className="text-sm text-ink-muted">{t('ls.noLessons')}</p></Card>
                ) : (
                  <ol className="space-y-3">
                    {data.lessons.map((l, i) => (
                      <li key={l.id}>
                        <Card>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-navy">{l.title}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                                  {l.hasVideo && (
                                    <span className="inline-flex items-center gap-1">
                                      <Video size={14} aria-hidden="true" />
                                      {t('ls.hasVideo')}
                                    </span>
                                  )}
                                  {l.materialCount > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                      <Paperclip size={14} aria-hidden="true" />
                                      {t('ls.materialsCount').replace('{n}', l.materialCount)}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="secondary" size="sm" disabled={busy === l.id || i === 0}
                                aria-label={`${t('ls.moveUp')}: ${l.title}`} onClick={() => move(l.id, 'up')}
                              >
                                <ArrowUp size={16} aria-hidden="true" />
                              </Button>
                              <Button
                                variant="secondary" size="sm" disabled={busy === l.id || i === data.lessons.length - 1}
                                aria-label={`${t('ls.moveDown')}: ${l.title}`} onClick={() => move(l.id, 'down')}
                              >
                                <ArrowDown size={16} aria-hidden="true" />
                              </Button>
                              <Button as={Link} to={`/teacher/courses/${id}/lessons/${l.id}/edit`} variant="secondary" size="sm">
                                <Pencil size={14} aria-hidden="true" />
                                {t('ls.edit')}
                              </Button>
                              <Button
                                variant="danger" size="sm" disabled={busy === l.id}
                                aria-label={`${t('ls.delete')}: ${l.title}`} onClick={() => remove(l.id)}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                                {t('ls.delete')}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}