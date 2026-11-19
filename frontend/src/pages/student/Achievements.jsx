import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import FileButton from '../../components/FileButton';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../utils/dates';
import { useI18n } from '../../i18n';

const tones = { PENDING: 'neutral', VERIFIED: 'teal', REJECTED: 'amber' };

export default function StudentAchievements() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi('/student/achievements');
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

  const remove = (id) => {
    if (!window.confirm(t('ac.confirmDelete'))) return;
    run(id, () => api(`/student/achievements/${id}`, { method: 'DELETE', token }));
  };

  const togglePublic = (a) =>
    run(a.id, () =>
      api(`/student/achievements/${a.id}/public`, { method: 'PATCH', token, body: { showPublic: !a.showPublic } })
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t('ac.title')}</h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{t('ac.sub')}</p>
        </div>
        <Button as={Link} to="/student/achievements/new">
          <Plus size={16} aria-hidden="true" />
          {t('ac.add')}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (data.achievements.length === 0 ? (
            <Card>
              <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
                <Award size={22} className="text-slate-300" aria-hidden="true" />
                <p>{t('ac.none')}</p>
                <Button as={Link} to="/student/achievements/new" size="sm">{t('ac.add')}</Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-4">
              {data.achievements.map((a) => (
                <li key={a.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="blue">{t(`ac.types.${a.type}`)}</Badge>
                          <Badge tone={tones[a.status]}>{t(`ac.status.${a.status}`)}</Badge>
                        </div>
                        <h2 className="mt-2 text-lg">{a.title}</h2>
                        <p className="mt-1 text-2xl font-bold text-navy">{a.result}</p>
                        <p className="mt-1 text-sm text-ink-muted">{formatDate(a.issuedOn, lang)}</p>

                        {a.status === 'PENDING' && <p className="mt-3 text-sm text-ink-muted">{t('ac.pendingNote')}</p>}
                        {a.status === 'VERIFIED' && a.verifiedAt && (
                          <p className="mt-3 text-sm text-teal-dark">{t('ac.verifiedOn')}: {formatDate(a.verifiedAt, lang)}</p>
                        )}
                        {a.status === 'REJECTED' && (
                          <p className="mt-3 rounded-control bg-amber-soft px-3 py-2 text-sm text-amber">
                            {t('ac.reason')}: {a.rejectReason}
                          </p>
                        )}

                        <div className="mt-3">
                          {a.file ? (
                            <FileButton path={`/files/achievements/${a.id}`} name={a.file.name} size={a.file.size} />
                          ) : (
                            <p className="text-sm text-ink-muted">{t('ac.noCertificate')}</p>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-ink-muted">{a.showPublic ? t('ac.publicOn') : t('ac.publicOff')}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {a.status === 'VERIFIED' && (
                          <Button variant="secondary" size="sm" disabled={busy === a.id} onClick={() => togglePublic(a)}>
                            {a.showPublic ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                            {a.showPublic ? t('ac.hidePublic') : t('ac.makePublic')}
                          </Button>
                        )}
                        {a.status !== 'VERIFIED' && (
                          <Button as={Link} to={`/student/achievements/${a.id}/edit`} variant="secondary" size="sm">
                            <Pencil size={14} aria-hidden="true" />
                            {t('ac.edit')}
                          </Button>
                        )}
                        <Button
                          variant="danger" size="sm" disabled={busy === a.id}
                          aria-label={`${t('ac.delete')}: ${a.title}`} onClick={() => remove(a.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          {t('ac.delete')}
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