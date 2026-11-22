import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, ExternalLink, MapPin, Pencil, Plus, Video } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import DataState from '../components/DataState';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../hooks/useApi';
import { addDays, dayKeyOf, formatDay, instantOf, timeOf, weekStartOf } from '../utils/tz';
import { useI18n } from '../i18n';

// The colored edge only supports the text: every card also names its course and says "Class" or "Deadline"
const edge = { ielts: 'border-l-brand', cefr: 'border-l-teal', academic: 'border-l-violet' };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);

function EventCard({ e, role }) {
  const { t, lang } = useI18n();
  const isSession = e.kind === 'session';
  const courseTitle = e.course.title[lang];
  const Icon = isSession ? (e.mode === 'online' ? Video : MapPin) : ClipboardList;
  const heading = isSession ? e.title || courseTitle : e.title;
  const time = isSession ? `${timeOf(e.start)} – ${timeOf(e.end)}` : t('cal.due').replace('{time}', timeOf(e.start));
  const href = isSession
    ? null
    : role === 'TEACHER'
      ? `/teacher/assignments/${e.id}/submissions`
      : `/student/assignments/${e.id}`;
  const joinUrl = isSession && e.mode === 'online' && !e.cancelled ? safeUrl(e.link) : null;
  const muted = e.cancelled ? 'text-ink-muted line-through' : 'text-navy';

  return (
    <li className={`rounded-control border border-l-4 border-line p-3 ${edge[e.course.category]} ${e.cancelled ? 'bg-slate-50' : 'bg-white'}`}>
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-muted">
        <Icon size={14} aria-hidden="true" />
        {isSession ? t('cal.class') : t('cal.deadline')}
        {e.cancelled && <Badge tone="neutral">{t('cal.cancelled')}</Badge>}
      </p>
      <p className={`mt-1 text-sm font-semibold ${muted}`}>{time}</p>
      <p className={`mt-0.5 break-words text-sm ${muted}`}>
        {href ? <Link to={href} className="hover:underline">{heading}</Link> : heading}
      </p>
      {heading !== courseTitle && <p className="mt-0.5 text-xs text-ink-muted">{courseTitle}</p>}

      {isSession && (
        <p className="mt-1 break-words text-xs text-ink-muted">
          {e.mode === 'online' ? t('cal.online') : `${t('cal.offline')}${e.location ? `: ${e.location}` : ''}`}
        </p>
      )}

      {joinUrl && (
        <Button as="a" href={joinUrl} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary" className="mt-2">
          {t('cal.join')}
          <ExternalLink size={14} aria-hidden="true" />
        </Button>
      )}

      {!isSession && role === 'STUDENT' && (
        <div className="mt-2">
          <Badge tone={e.done ? 'teal' : 'amber'}>{e.done ? t('cal.submitted') : t('cal.notSubmitted')}</Badge>
        </div>
      )}

      {isSession && role === 'TEACHER' && (
        <Button
          as={Link} to={`/teacher/calendar/${e.id}/edit`} size="sm" variant="ghost" className="-ml-3 mt-1"
          aria-label={`${t('cal.edit')}: ${heading}`}
        >
          <Pencil size={14} aria-hidden="true" />
          {t('cal.edit')}
        </Button>
      )}
    </li>
  );
}

export default function Calendar() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const isTeacher = user.role === 'TEACHER';

  const today = dayKeyOf(new Date());
  const thisWeek = weekStartOf(today);
  // After saving a class, the form sends the teacher here with that class's day, so the week shows it
  const wanted = location.state && DAY_RE.test(location.state.day || '') ? location.state.day : today;
  const [start, setStart] = useState(() => weekStartOf(wanted));

  const from = instantOf(start).toISOString();
  const to = instantOf(addDays(start, 7)).toISOString();
  const { data, error, loading, reload } = useApi(
    `/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const byDay = useMemo(() => {
    const map = new Map(days.map((d) => [d, []]));
    ((data && data.events) || []).forEach((e) => {
      const list = map.get(dayKeyOf(e.start));
      if (list) list.push(e);
    });
    return map;
  }, [data, days]);

  const range =
    `${formatDay(days[0], lang, { day: 'numeric', month: 'short' })} – ` +
    formatDay(days[6], lang, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t('cal.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('cal.sub')}</p>
        </div>
        {isTeacher && (
          <Button as={Link} to="/teacher/calendar/new">
            <Plus size={16} aria-hidden="true" />
            {t('cal.addClass')}
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" aria-label={t('cal.prev')} onClick={() => setStart(addDays(start, -7))}>
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <Button variant="secondary" size="sm" disabled={start === thisWeek} onClick={() => setStart(thisWeek)}>
          {t('cal.today')}
        </Button>
        <Button variant="secondary" size="sm" aria-label={t('cal.next')} onClick={() => setStart(addDays(start, 7))}>
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
        <p className="text-sm font-semibold text-navy" aria-live="polite">{range}</p>
      </div>
      <p className="mt-2 text-xs text-ink-muted">{t('cal.tzNote')}</p>

      <div className="mt-6">
        <DataState loading={loading} error={error} onRetry={reload}>
          {data && (
            <>
              {data.events.length === 0 && (
                <Card className="mb-4"><p className="text-sm text-ink-muted">{t('cal.emptyWeek')}</p></Card>
              )}

              <div className="grid gap-3 xl:grid-cols-7">
                {days.map((d) => {
                  const events = byDay.get(d);
                  const isToday = d === today;
                  return (
                    <section
                      key={d}
                      aria-labelledby={`day-${d}`}
                      className={`rounded-card border bg-white p-3 shadow-card ${isToday ? 'border-brand' : 'border-line'}`}
                    >
                      <h2 id={`day-${d}`} className="flex flex-wrap items-center gap-2 text-sm">
                        <span>{formatDay(d, lang, { weekday: 'short' })}</span>
                        <span className="font-normal text-ink-muted">{formatDay(d, lang, { day: 'numeric', month: 'short' })}</span>
                        {isToday && <Badge tone="blue">{t('cal.today')}</Badge>}
                      </h2>
                      {events.length === 0 ? (
                        <p className="mt-2 text-xs text-ink-muted">{t('cal.nothing')}</p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {events.map((e) => (
                            <EventCard key={`${e.kind}-${e.id}`} e={e} role={user.role} />
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </DataState>
      </div>
    </div>
  );
}