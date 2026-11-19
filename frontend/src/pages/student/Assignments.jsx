import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

const rank = { NONE: 0, SUBMITTED: 1, GRADED: 2 };
const tones = { NONE: 'neutral', SUBMITTED: 'blue', GRADED: 'teal' };

export default function StudentAssignments() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi('/student/assignments');

  // Work that still needs doing comes first, then submitted, then graded. The nearest deadline leads.
  const list = data
    ? [...data.assignments].sort((a, b) => rank[a.status] - rank[b.status] || new Date(a.dueAt) - new Date(b.dueAt))
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('sa.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('sa.sub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (list.length === 0 ? (
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <ClipboardList size={22} className="text-slate-300" aria-hidden="true" />
              <p>{t('sa.none')}</p>
            </div>
          </Card>
        ) : (
          <ul className="space-y-4">
            {list.map((a) => (
              <li key={a.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg">
                        <Link to={`/student/assignments/${a.id}`} className="hover:underline">{a.title}</Link>
                      </h2>
                      <p className="mt-1 text-sm text-ink-muted">{a.course.title[lang]}</p>
                      <p className="mt-2 text-sm text-ink-muted">{t('sa.due')}: {formatDateTime(a.dueAt, lang)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.overdue && <Badge tone="amber">{t('sa.overdue')}</Badge>}
                      {a.late && <Badge tone="amber">{t('sa.late')}</Badge>}
                      <Badge tone={tones[a.status]}>{t(`sa.status.${a.status}`)}</Badge>
                      {a.status === 'GRADED' && (
                        <span className="text-sm font-semibold text-navy">
                          {t('sa.scoreOf').replace('{score}', a.score).replace('{max}', a.maxScore)}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ))}
      </DataState>
    </div>
  );
}