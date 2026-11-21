import { useState } from 'react';
import { Badge, Card, Input } from '../../components/ui';
import DataState from '../../components/DataState';
import Pagination from '../../components/Pagination';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useDebounced';
import { useI18n } from '../../i18n';

function Number({ value, label }) {
  return (
    <div>
      <p className="text-xl font-bold text-navy">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export default function AdminStudents() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q.trim());

  const params = new URLSearchParams();
  if (search) params.set('q', search);
  params.set('page', String(page));
  const { data, error, loading, reload } = useApi(`/admin/students?${params}`);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('ast.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('ast.sub')}</p>

      <Input
        type="search" label={t('ast.search')} placeholder={t('ast.searchPlaceholder')}
        value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xl"
      />

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <p className="mb-3 text-sm font-semibold text-navy" aria-live="polite">
                {t('ast.count').replace('{n}', data.total)}
              </p>
              <Card>
                {data.students.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('ast.none')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.students.map((s) => (
                      <li key={s.id} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-navy">{s.fullName}</p>
                            <p className="break-all text-sm text-ink-muted">
                              {t('auth.gradeFormat').replace('{n}', s.grade)} · {s.email} · {s.phone}
                            </p>
                          </div>
                          {s.status !== 'ACTIVE' && (
                            <Badge tone={s.status === 'PENDING' ? 'amber' : 'neutral'}>{t(`admin.userStatus.${s.status}`)}</Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {s.courses.length === 0 ? (
                            <span className="text-sm text-ink-muted">{t('ast.noCourses')}</span>
                          ) : (
                            s.courses.map((c) => (
                              <Badge key={c.id} tone={c.status === 'PENDING' ? 'amber' : 'blue'}>
                                {c.title[lang]}{c.status === 'PENDING' ? ` (${t('ast.waiting')})` : ''}
                              </Badge>
                            ))
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-8">
                          <Number value={s.lessonsCompleted} label={t('ast.lessons')} />
                          <Number value={s.submissions} label={t('ast.submissions')} />
                          <Number value={s.testsTaken} label={t('ast.tests')} />
                        </div>
                      </li>
                    ))}
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