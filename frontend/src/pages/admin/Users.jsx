import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Badge, Button, Card, Input, Select } from '../../components/ui';
import DataState from '../../components/DataState';
import Pagination from '../../components/Pagination';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useDebounced';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

const statusTone = { ACTIVE: 'teal', PENDING: 'amber', DISABLED: 'neutral' };
const roleTone = { STUDENT: 'blue', TEACHER: 'violet', ADMIN: 'neutral' };
// What the status button does for each current status: [label key, status to set]
const toggle = { ACTIVE: ['disable', 'DISABLED'], DISABLED: ['enable', 'ACTIVE'], PENDING: ['approve', 'ACTIVE'] };

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q.trim());

  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  params.set('page', String(page));
  const { data, error, loading, reload } = useApi(`/admin/users?${params}`);

  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [revealed, setRevealed] = useState(null); // { name, password } shown once
  const [copied, setCopied] = useState(false);

  const setUserStatus = async (u, next) => {
    if (next === 'DISABLED' && !window.confirm(t('au.confirmDisable').replace('{name}', u.fullName))) return;
    setBusy(u.id);
    setActionError('');
    try {
      await api(`/admin/users/${u.id}/status`, { method: 'PATCH', token, body: { status: next } });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const setTemp = async (u) => {
    if (!window.confirm(t('au.confirmTemp').replace('{name}', u.fullName))) return;
    setBusy(u.id);
    setActionError('');
    setRevealed(null);
    setCopied(false);
    try {
      const res = await api(`/admin/users/${u.id}/temp-password`, { method: 'POST', token });
      setRevealed({ name: u.fullName, password: res.password });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(revealed.password);
      setCopied(true);
    } catch {
      /* the password is also visible on the screen */
    }
  };

  const roleOptions = [
    { value: '', label: t('au.all') },
    ...['STUDENT', 'TEACHER', 'ADMIN'].map((r) => ({ value: r, label: t(`dash.${r.toLowerCase()}`) })),
  ];
  const statusOptions = [
    { value: '', label: t('au.all') },
    ...['ACTIVE', 'PENDING', 'DISABLED'].map((s) => ({ value: s, label: t(`admin.userStatus.${s}`) })),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('au.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('au.sub')}</p>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Input
          type="search" label={t('au.search')} placeholder={t('au.searchPlaceholder')}
          value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <Select label={t('au.role')} options={roleOptions} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} />
        <Select label={t('au.status')} options={statusOptions} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
      </div>

      {revealed && (
        <div role="status" className="mt-6 rounded-card border border-amber bg-amber-soft p-5">
          <h2 className="text-base">{t('au.tempTitle').replace('{name}', revealed.name)}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="select-all rounded-control bg-white px-4 py-2 font-mono text-lg font-bold tracking-wider text-navy">
              {revealed.password}
            </code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? t('au.copied') : t('au.copy')}
            </Button>
          </div>
          <p className="mt-3 text-sm text-navy">{t('au.tempNote')}</p>
          <Button size="sm" variant="ghost" className="-ml-3 mt-3" onClick={() => setRevealed(null)}>
            {t('au.dismiss')}
          </Button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <p className="mb-3 text-sm font-semibold text-navy" aria-live="polite">
                {t('au.count').replace('{n}', data.total)}
              </p>
              <Card>
                {data.users.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('au.none')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.users.map((u) => {
                      const [label, next] = toggle[u.status];
                      return (
                        <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="font-semibold text-navy">{u.fullName}</p>
                            <p className="break-all text-sm text-ink-muted">{u.email} · {u.phone}</p>
                            <p className="mt-1 text-xs text-ink-muted">{t('au.joined')}: {formatDateTime(u.createdAt, lang)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={roleTone[u.role]}>{t(`dash.${u.role.toLowerCase()}`)}</Badge>
                            <Badge tone={statusTone[u.status]}>{t(`admin.userStatus.${u.status}`)}</Badge>
                            {u.mustChangePassword && <Badge tone="amber">{t('au.mustChange')}</Badge>}
                            {u.role === 'ADMIN' ? (
                              <span className="text-xs text-ink-muted">{t('au.adminNote')}</span>
                            ) : (
                              <>
                                <Button
                                  size="sm" variant={next === 'ACTIVE' ? 'primary' : 'secondary'} disabled={busy === u.id}
                                  aria-label={`${t(`au.${label}`)}: ${u.fullName}`}
                                  onClick={() => setUserStatus(u, next)}
                                >
                                  {t(`au.${label}`)}
                                </Button>
                                <Button
                                  size="sm" variant="secondary" disabled={busy === u.id}
                                  aria-label={`${t('au.tempPassword')}: ${u.fullName}`}
                                  onClick={() => setTemp(u)}
                                >
                                  <KeyRound size={14} aria-hidden="true" />
                                  {t('au.tempPassword')}
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
              <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}