import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, Input } from '../../components/ui';
import DataState from '../../components/DataState';
import MaterialLink from '../../components/MaterialLink';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

export default function StudentMaterials() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi('/student/materials');
  const [q, setQ] = useState('');

  const total = data ? data.courses.reduce((sum, c) => sum + c.materials.length, 0) : 0;

  const groups = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLocaleLowerCase();
    if (!needle) return data.courses;
    return data.courses
      .map((c) => ({
        ...c,
        materials: c.materials.filter((m) => `${m.title} ${m.lesson.title}`.toLocaleLowerCase().includes(needle)),
      }))
      .filter((c) => c.materials.length > 0);
  }, [data, q]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl">{t('sm.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('sm.sub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (total === 0 ? (
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <FileText size={22} className="text-slate-300" aria-hidden="true" />
              <p>{t('sm.none')}</p>
            </div>
          </Card>
        ) : (
          <>
            {total > 8 && (
              <Input
                type="search" label={t('sm.search')} placeholder={t('sm.searchPlaceholder')}
                value={q} onChange={(e) => setQ(e.target.value)} className="mb-6"
              />
            )}

            {groups.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('sm.noMatches')}</p>
            ) : (
              <div className="space-y-4">
                {groups.map((c) => (
                  <Card key={c.id} title={c.title[lang]} action={<span className="text-xs text-ink-muted">{t('sm.count').replace('{n}', c.materials.length)}</span>}>
                    <ul className="divide-y divide-line">
                      {c.materials.map((m) => (
                        <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <MaterialLink material={m} />
                          <Link to={`/student/lessons/${m.lesson.id}`} className="text-xs text-ink-muted hover:text-brand hover:underline">
                            {t('sm.inLesson')}: {m.lesson.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            )}
          </>
        ))}
      </DataState>
    </div>
  );
}