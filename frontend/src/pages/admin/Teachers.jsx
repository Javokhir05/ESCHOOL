import { useState } from 'react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

const tones = { ACTIVE: 'teal', PENDING: 'amber', DISABLED: 'neutral' };

// Which buttons each status gets: [label key, status to set, button style]
const actions = {
  PENDING: [['approve', 'ACTIVE', 'primary'], ['reject', 'DISABLED', 'secondary']],
  ACTIVE: [['disable', 'DISABLED', 'secondary']],
  DISABLED: [['enable', 'ACTIVE', 'secondary']],
};

export default function AdminTeachers() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi('/admin/teachers');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const setStatus = async (id, status) => {
    setBusy(id);
    setActionError('');
    try {
      await api(`/admin/teachers/${id}/status`, { method: 'PATCH', token, body: { status } });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const date = (v) => new Date(v).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('admin.teachersTitle')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('admin.teachersSub')}</p>

      {actionError && (
        <p role="alert" className="mb-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <Card>
            {data.teachers.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('admin.noTeachers')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.teachers.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">{u.fullName}</p>
                      <p className="break-all text-sm text-ink-muted">{u.email} · {u.phone}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {u.subject && `${t(`auth.subjects.${u.subject}`)} · `}
                        {u.experienceYears !== null && `${t('admin.experience').replace('{n}', u.experienceYears)} · `}
                        {date(u.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tones[u.status]}>{t(`admin.userStatus.${u.status}`)}</Badge>
                      {actions[u.status].map(([label, next, variant]) => (
                        <Button
                          key={label}
                          size="sm"
                          variant={variant}
                          disabled={busy === u.id}
                          aria-label={`${t(`admin.${label}`)}: ${u.fullName}`}
                          onClick={() => setStatus(u.id, next)}
                        >
                          {t(`admin.${label}`)}
                        </Button>
                      ))}
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