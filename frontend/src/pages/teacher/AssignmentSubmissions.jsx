import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/dates';
import { useI18n } from '../../i18n';

const tones = { SUBMITTED: 'amber', GRADED: 'teal', NONE: 'neutral' };

export default function AssignmentSubmissions() {
  const { assignmentId } = useParams();
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useApi(`/teacher/assignments/${assignmentId}/submissions`);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/teacher/assignments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('as.back')}
      </Link>

      <div className="mt-4">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              <h1 className="text-2xl">{data.assignment.title}</h1>
              <p className="mt-1 text-ink-muted">{data.assignment.course.title[lang]}</p>
              <p className="mb-6 mt-1 text-sm text-ink-muted">
                {t('as.due')}: {formatDateTime(data.assignment.dueAt, lang)} · {t('as.maxScore')}: {data.assignment.maxScore}
              </p>

              <Card>
                {data.rows.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('as.noStudents')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.rows.map((r) => {
                      const s = r.submission;
                      const status = s ? s.status : 'NONE';
                      return (
                        <li key={r.studentId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="font-semibold text-navy">{r.fullName}</p>
                            <p className="break-all text-sm text-ink-muted">
                              {t('auth.gradeFormat').replace('{n}', r.grade)} · {r.email}
                            </p>
                            {s && (
                              <p className="mt-1 text-sm text-ink-muted">
                                {t('as.submittedAt')}: {formatDateTime(s.submittedAt, lang)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {s && s.late && <Badge tone="amber">{t('as.late')}</Badge>}
                            <Badge tone={tones[status]}>{t(`as.status.${status}`)}</Badge>
                            {s && s.status === 'GRADED' && (
                              <span className="text-sm font-semibold text-navy">
                                {t('as.scoreOf').replace('{score}', s.score).replace('{max}', data.assignment.maxScore)}
                              </span>
                            )}
                            {s && (
                              <Button as={Link} to={`/teacher/submissions/${s.id}`} size="sm" variant={s.status === 'SUBMITTED' ? 'primary' : 'secondary'}>
                                {t('as.review')}
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}