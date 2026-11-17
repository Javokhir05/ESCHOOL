import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

const tones = { ielts: 'blue', cefr: 'teal', academic: 'violet' };

export default function TeacherCourses() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useApi('/teacher/courses');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const setStatus = async (id, status) => {
    setBusy(id);
    setActionError('');
    try {
      await api(`/teacher/courses/${id}/status`, { method: 'PATCH', token, body: { status } });
      reload();
    } catch (e) {
      setActionError(apiErrorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t('tc.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('tc.sub')}</p>
        </div>
        <Button as={Link} to="/teacher/courses/new">
          <Plus size={16} aria-hidden="true" />
          {t('tc.newCourse')}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (data.courses.length === 0 ? (
            <Card>
              <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
                <BookOpen size={22} className="text-slate-300" aria-hidden="true" />
                <p>{t('tc.noCourses')}</p>
                <Button as={Link} to="/teacher/courses/new" size="sm">{t('tc.createFirst')}</Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-4">
              {data.courses.map((c) => (
                <li key={c.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg">{c.title[lang]}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={tones[c.category]}>{t(`catalog.categories.${c.category}`)}</Badge>
                          <Badge tone="neutral">{t(`catalog.levels.${c.level}`)}</Badge>
                          <Badge tone={c.status === 'PUBLISHED' ? 'teal' : 'amber'}>{t(`tc.status.${c.status}`)}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-ink-muted">
                          {t('tc.studentsCount').replace('{n}', c.activeStudents)}
                          {c.pendingRequests > 0 && ` · ${t('tc.pendingCount').replace('{n}', c.pendingRequests)}`}
                        </p>
                        {c.status === 'DRAFT' && <p className="mt-1 text-xs text-ink-muted">{t('tc.draftNote')}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button as={Link} to={`/teacher/courses/${c.id}/edit`} variant="secondary" size="sm">{t('tc.edit')}</Button>
                        <Button as={Link} to={`/teacher/courses/${c.id}/students`} variant="secondary" size="sm">{t('tc.students')}</Button>
                        {c.status === 'PUBLISHED' && (
                          <Button as={Link} to={`/courses/${c.slug}`} variant="ghost" size="sm">{t('tc.view')}</Button>
                        )}
                        <Button
                          size="sm"
                          variant={c.status === 'PUBLISHED' ? 'secondary' : 'primary'}
                          disabled={busy === c.id}
                          onClick={() => setStatus(c.id, c.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                        >
                          {c.status === 'PUBLISHED' ? t('tc.unpublish') : t('tc.publish')}
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