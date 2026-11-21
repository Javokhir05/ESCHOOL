import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Input, Select } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

const tones = { ielts: 'blue', cefr: 'teal', academic: 'violet' };

export default function AdminCourses() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi('/admin/courses');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const list = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase();
    return data.courses.filter((c) => {
      if (status && c.status !== status) return false;
      if (!needle) return true;
      return `${c.title.uz} ${c.title.en} ${c.teacher.fullName}`.toLocaleLowerCase().includes(needle);
    });
  }, [data, q, status]);

  const toggle = async (c) => {
    const next = c.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    if (next === 'DRAFT' && c.activeStudents > 0 && !window.confirm(t('aco.confirmHide').replace('{n}', c.activeStudents))) return;
    setBusy(c.id);
    setActionError('');
    try {
      await api(`/admin/courses/${c.id}/status`, { method: 'PATCH', token, body: { status: next } });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const statusOptions = [
    { value: '', label: t('aco.all') },
    { value: 'PUBLISHED', label: t('tc.status.PUBLISHED') },
    { value: 'DRAFT', label: t('tc.status.DRAFT') },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('aco.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('aco.sub')}</p>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Input type="search" label={t('aco.search')} placeholder={t('aco.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label={t('aco.status')} options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <p className="mb-3 text-sm font-semibold text-navy" aria-live="polite">
                {t('aco.count').replace('{n}', list.length)}
              </p>

              {list.length === 0 ? (
                <Card><p className="text-sm text-ink-muted">{t('aco.none')}</p></Card>
              ) : (
                <ul className="space-y-4">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Card>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg">{c.title[lang]}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge tone={tones[c.category]}>{t(`catalog.categories.${c.category}`)}</Badge>
                              <Badge tone="neutral">{t(`catalog.levels.${c.level}`)}</Badge>
                              <Badge tone={c.status === 'PUBLISHED' ? 'teal' : 'amber'}>{t(`tc.status.${c.status}`)}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-ink-muted">
                              {t('aco.teacher')}: {c.teacher.fullName}
                              {!c.teacher.active && <span className="ml-2 text-amber">({t('aco.teacherInactive')})</span>}
                            </p>
                            <p className="mt-1 text-sm text-ink-muted">
                              {t('aco.counts')
                                .replace('{students}', c.activeStudents)
                                .replace('{lessons}', c.lessonCount)
                                .replace('{assignments}', c.assignmentCount)
                                .replace('{tests}', c.testCount)}
                              {c.pendingRequests > 0 && ` · ${t('aco.pending').replace('{n}', c.pendingRequests)}`}
                            </p>
                            {c.status === 'DRAFT' && <p className="mt-2 text-xs text-ink-muted">{t('aco.hiddenNote')}</p>}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {c.status === 'PUBLISHED' && (
                              <Button as={Link} to={`/courses/${c.slug}`} variant="ghost" size="sm">{t('aco.view')}</Button>
                            )}
                            <Button
                              size="sm" variant={c.status === 'PUBLISHED' ? 'secondary' : 'primary'} disabled={busy === c.id}
                              aria-label={`${c.status === 'PUBLISHED' ? t('aco.hide') : t('aco.publish')}: ${c.title[lang]}`}
                              onClick={() => toggle(c)}
                            >
                              {c.status === 'PUBLISHED' ? t('aco.hide') : t('aco.publish')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}