import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function TeacherTests() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi('/teacher/tests');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const run = async (id, request) => {
    setBusy(id);
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

  const toggle = (x) =>
    run(x.id, () =>
      api(`/teacher/tests/${x.id}/status`, {
        method: 'PATCH',
        token,
        body: { status: x.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
      })
    );

  const remove = (id) => {
    if (!window.confirm(t('ts.confirmDelete'))) return;
    run(id, () => api(`/teacher/tests/${id}`, { method: 'DELETE', token }));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t('ts.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('ts.sub')}</p>
        </div>
        <Button as={Link} to="/teacher/tests/new">
          <Plus size={16} aria-hidden="true" />
          {t('ts.create')}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (data.tests.length === 0 ? (
            <Card>
              <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
                <ListChecks size={22} className="text-slate-300" aria-hidden="true" />
                <p>{t('ts.none')}</p>
                <Button as={Link} to="/teacher/tests/new" size="sm">{t('ts.create')}</Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-4">
              {data.tests.map((x) => (
                <li key={x.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg">{x.title}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{x.course.title[lang]}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone={x.status === 'PUBLISHED' ? 'teal' : 'amber'}>{t(`tc.status.${x.status}`)}</Badge>
                          <span className="text-sm text-ink-muted">
                            {t('ts.questionsCount').replace('{n}', x.questionCount)} ·{' '}
                            {x.timeLimit ? t('ts.minutes').replace('{n}', x.timeLimit) : t('ts.noLimit')} ·{' '}
                            {t('ts.attemptsCount').replace('{n}', x.attemptCount)}
                          </span>
                        </div>
                        {x.status === 'DRAFT' && <p className="mt-2 text-xs text-ink-muted">{t('ts.draftNote')}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button as={Link} to={`/teacher/tests/${x.id}/results`} variant="secondary" size="sm">{t('ts.results')}</Button>
                        <Button as={Link} to={`/teacher/tests/${x.id}/edit`} variant="secondary" size="sm">
                          <Pencil size={14} aria-hidden="true" />
                          {t('ts.edit')}
                        </Button>
                        <Button
                          size="sm" variant={x.status === 'PUBLISHED' ? 'secondary' : 'primary'}
                          disabled={busy === x.id} onClick={() => toggle(x)}
                        >
                          {x.status === 'PUBLISHED' ? t('ts.unpublish') : t('ts.publish')}
                        </Button>
                        <Button
                          variant="danger" size="sm" disabled={busy === x.id}
                          aria-label={`${t('ts.delete')}: ${x.title}`} onClick={() => remove(x.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
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