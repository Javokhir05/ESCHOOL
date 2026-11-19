import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

export default function TeacherAssignments() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi('/teacher/assignments');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const remove = async (id) => {
    if (!window.confirm(t('as.confirmDelete'))) return;
    setBusy(id);
    setActionError('');
    try {
      await api(`/teacher/assignments/${id}`, { method: 'DELETE', token });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t('as.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('as.sub')}</p>
        </div>
        <Button as={Link} to="/teacher/assignments/new">
          <Plus size={16} aria-hidden="true" />
          {t('as.create')}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (data.assignments.length === 0 ? (
            <Card>
              <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
                <ClipboardList size={22} className="text-slate-300" aria-hidden="true" />
                <p>{t('as.none')}</p>
                <Button as={Link} to="/teacher/assignments/new" size="sm">{t('as.create')}</Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-4">
              {data.assignments.map((a) => (
                <li key={a.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg">{a.title}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{a.course.title[lang]}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                          <span>{t('as.due')}: {formatDateTime(a.dueAt, lang)}</span>
                          {new Date(a.dueAt) < new Date() && <Badge tone="neutral">{t('as.pastDue')}</Badge>}
                        </div>
                        <p className="mt-3 text-sm text-ink-muted">
                          {t('as.progress').replace('{done}', a.submittedCount).replace('{total}', a.studentCount)}
                        </p>
                        {a.toReview > 0 && (
                          <Badge tone="amber" className="mt-2">{t('as.toReviewCount').replace('{n}', a.toReview)}</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button as={Link} to={`/teacher/assignments/${a.id}/submissions`} size="sm">{t('as.submissions')}</Button>
                        <Button as={Link} to={`/teacher/assignments/${a.id}/edit`} variant="secondary" size="sm">
                          <Pencil size={14} aria-hidden="true" />
                          {t('as.edit')}
                        </Button>
                        <Button
                          variant="danger" size="sm" disabled={busy === a.id}
                          aria-label={`${t('as.delete')}: ${a.title}`} onClick={() => remove(a.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          {t('as.delete')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ))}
        </DataState>
      </div>
    </div>
  );
}