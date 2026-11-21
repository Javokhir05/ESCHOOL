import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button, Card, Input, ProgressBar, Select } from '../../components/ui';
import DataState from '../../components/DataState';
import { api } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';
import Avatar from '../../components/Avatar';

const PAGE = 30;

export default function TeacherStudents() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi('/teacher/students');

  const [q, setQ] = useState('');
  const [course, setCourse] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const students = useMemo(() => (data ? data.students : []), [data]);

  const courseOptions = useMemo(() => {
    const seen = new Map();
    students.forEach((s) => s.courses.forEach((c) => seen.set(c.id, c.title[lang])));
    return [{ value: '', label: t('tsd.all') }, ...[...seen].map(([value, label]) => ({ value, label }))];
  }, [students, lang, t]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    return students.filter((s) => {
      if (course && !s.courses.some((c) => c.id === course)) return false;
      return !needle || `${s.fullName} ${s.email}`.toLocaleLowerCase().includes(needle);
    });
  }, [students, q, course]);

  const message = async (s) => {
    setBusy(s.id);
    setActionError('');
    try {
      const res = await api('/messages/conversations', { method: 'POST', token, body: { contactId: s.id } });
      navigate(`/teacher/messages/${res.conversation.id}`);
    } catch (e) {
      setActionError(apiErrorText(t, e));
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('tsd.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('tsd.sub')}</p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (students.length === 0 ? (
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <Users size={22} className="text-slate-300" aria-hidden="true" />
              <p>{t('tsd.none')}</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
              <Input
                type="search" label={t('tsd.search')} placeholder={t('tsd.searchPlaceholder')}
                value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
              />
              <Select
                label={t('tsd.course')} options={courseOptions} value={course}
                onChange={(e) => { setCourse(e.target.value); setLimit(PAGE); }}
              />
            </div>

            <p className="mb-3 mt-6 text-sm font-semibold text-navy" aria-live="polite">
              {t('tsd.count').replace('{n}', filtered.length)}
            </p>

            {actionError && (
              <p role="alert" className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
            )}

            {filtered.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('tsd.noMatches')}</p>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {filtered.slice(0, limit).map((s) => (
                    <li key={s.id} className="py-5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                          <Avatar userId={s.userId} name={s.fullName} hasAvatar={s.hasAvatar} version={s.avatarVersion} size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold text-navy">{s.fullName}</p>
                            <p className="break-all text-sm text-ink-muted">
                              {t('auth.gradeFormat').replace('{n}', s.grade)} · {s.email} · {s.phone}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm" variant="secondary" disabled={busy === s.id}
                          aria-label={`${t('tsd.message')}: ${s.fullName}`} onClick={() => message(s)}
                        >
                          {t('tsd.message')}
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {s.courses.map((c) =>
                          c.totalLessons === 0 ? (
                            <div key={c.id}>
                              <p className="text-sm font-medium text-navy">{c.title[lang]}</p>
                              <p className="mt-1 text-xs text-ink-muted">{t('tsd.noLessons')}</p>
                            </div>
                          ) : (
                            <ProgressBar
                              key={c.id}
                              label={`${c.title[lang]} (${c.completedLessons}/${c.totalLessons})`}
                              value={Math.round((c.completedLessons / c.totalLessons) * 100)}
                            />
                          )
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {filtered.length > limit && (
                  <Button variant="secondary" className="mt-5" onClick={() => setLimit((n) => n + PAGE)}>
                    {t('tsd.showMore')}
                  </Button>
                )}
              </Card>
            )}
          </>
        ))}
      </DataState>
    </div>
  );
}