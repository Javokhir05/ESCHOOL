import { useState } from 'react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import RoleToggle from '../../components/RoleToggle';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';
import { formatDate } from '../../utils/dates';

const tones = { PENDING: 'amber', ACTIVE: 'teal', REJECTED: 'neutral' };

export default function AdminEnrollments() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const [filter, setFilter] = useState('PENDING');
  const { data, error, loading, reload } = useApi(`/admin/enrollments?status=${filter}`);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const decide = async (id, status) => {
    setBusy(id);
    setActionError('');
    try {
      await api(`/admin/enrollments/${id}`, { method: 'PATCH', token, body: { status } });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const date = (v) => formatDate(v, lang);
  const filterOptions = [
    { value: 'PENDING', label: t('admin.filterPending') },
    { value: 'ALL', label: t('admin.filterAll') },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('admin.enrollmentsTitle')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('admin.enrollmentsSub')}</p>

      <div className="mb-4 max-w-xs">
        <RoleToggle label={t('admin.show')} value={filter} onChange={setFilter} options={filterOptions} />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <Card>
            {data.enrollments.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {filter === 'PENDING' ? t('admin.noPendingEnrollments') : t('admin.noEnrollments')}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.enrollments.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">{e.student.fullName}</p>
                      <p className="break-all text-sm text-ink-muted">
                        {t('auth.gradeFormat').replace('{n}', e.student.grade)} · {e.student.email}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">{e.course.title[lang]} · {date(e.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tones[e.status]}>{t(`profile.status.${e.status}`)}</Badge>
                      {e.status !== 'ACTIVE' && (
                        <Button
                          size="sm"
                          disabled={busy === e.id}
                          aria-label={`${t('admin.approve')}: ${e.student.fullName}`}
                          onClick={() => decide(e.id, 'ACTIVE')}
                        >
                          {t('admin.approve')}
                        </Button>
                      )}
                      {e.status !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === e.id}
                          aria-label={`${t('admin.reject')}: ${e.student.fullName}`}
                          onClick={() => decide(e.id, 'REJECTED')}
                        >
                          {t('admin.reject')}
                        </Button>
                      )}
                    </div>
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