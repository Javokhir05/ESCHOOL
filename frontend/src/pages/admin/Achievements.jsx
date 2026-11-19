import { useState } from 'react';
import { Badge, Button, Card, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import FileButton from '../../components/FileButton';
import RoleToggle from '../../components/RoleToggle';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../utils/dates';
import { useI18n } from '../../i18n';

const tones = { PENDING: 'neutral', VERIFIED: 'teal', REJECTED: 'amber' };

export default function AdminAchievements() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const [filter, setFilter] = useState('PENDING');
  const { data, error, loading, reload } = useApi(`/admin/achievements?status=${filter}`);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [rejecting, setRejecting] = useState(null); // id of the row whose rejection form is open
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const decide = async (a, status) => {
    setBusy(a.id);
    setActionError('');
    try {
      await api(`/admin/achievements/${a.id}`, {
        method: 'PATCH',
        token,
        body: { status, reason, version: a.version },
      });
      setRejecting(null);
      setReason('');
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
      reload(); // show the latest version, so the admin checks what the student changed
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = (a) => {
    if (reason.trim().length < 3) return setReasonError(true);
    setReasonError(false);
    decide(a, 'REJECTED');
  };

  const filterOptions = [
    { value: 'PENDING', label: t('admin.filterPending') },
    { value: 'ALL', label: t('admin.filterAll') },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('ac.adminTitle')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('ac.adminSub')}</p>

      <div className="mb-4 max-w-xs">
        <RoleToggle label={t('admin.show')} value={filter} onChange={setFilter} options={filterOptions} />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <Card>
            {data.achievements.length === 0 ? (
              <p className="text-sm text-ink-muted">{filter === 'PENDING' ? t('ac.noPending') : t('ac.noAny')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.achievements.map((a) => (
                  <li key={a.id} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">{a.student.fullName}</p>
                        <p className="break-all text-sm text-ink-muted">
                          {t('auth.gradeFormat').replace('{n}', a.student.grade)} · {a.student.email}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge tone="blue">{t(`ac.types.${a.type}`)}</Badge>
                          <Badge tone={tones[a.status]}>{t(`ac.status.${a.status}`)}</Badge>
                          {a.showPublic && <Badge tone="violet">{t('ac.public')}</Badge>}
                        </div>
                        <p className="mt-2 font-medium text-navy">{a.title}</p>
                        <p className="text-xl font-bold text-navy">{a.result}</p>
                        <p className="text-sm text-ink-muted">{formatDate(a.issuedOn, lang)}</p>

                        <div className="mt-3">
                          {a.file ? (
                            <FileButton path={`/files/achievements/${a.id}`} name={a.file.name} size={a.file.size} />
                          ) : (
                            <p className="text-sm text-ink-muted">{t('ac.noCertificate')}</p>
                          )}
                        </div>
                        {a.status === 'REJECTED' && a.rejectReason && (
                          <p className="mt-3 text-sm text-amber">{t('ac.reason')}: {a.rejectReason}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {a.status !== 'VERIFIED' && (
                          <Button
                            size="sm" disabled={busy === a.id}
                            aria-label={`${t('ac.verify')}: ${a.student.fullName}`}
                            onClick={() => decide(a, 'VERIFIED')}
                          >
                            {t('ac.verify')}
                          </Button>
                        )}
                        {a.status !== 'REJECTED' && rejecting !== a.id && (
                          <Button
                            size="sm" variant="secondary" disabled={busy === a.id}
                            aria-label={`${t('ac.rejectAction')}: ${a.student.fullName}`}
                            onClick={() => { setRejecting(a.id); setReason(''); setReasonError(false); }}
                          >
                            {t('ac.rejectAction')}
                          </Button>
                        )}
                      </div>
                    </div>

                    {rejecting === a.id && (
                      <div className="mt-4 max-w-xl space-y-3">
                        <Textarea
                          label={t('ac.rejectLabel')} rows={3} hint={t('ac.rejectHint')} maxLength={300}
                          value={reason}
                          onChange={(e) => { setReason(e.target.value); setReasonError(false); }}
                          error={reasonError ? t('ac.errors.reason') : undefined}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="danger" disabled={busy === a.id} onClick={() => confirmReject(a)}>
                            {t('ac.confirmReject')}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setRejecting(null)}>
                            {t('ac.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </DataState>
    </div>
  );
}