import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Input, Select } from '../../components/ui';
import DataState from '../../components/DataState';
import RoleToggle from '../../components/RoleToggle';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { dayKeyOf, timeOf } from '../../utils/tz';
import { useI18n } from '../../i18n';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validUrl(value) {
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && value.trim().length <= 500;
  } catch {
    return false;
  }
}

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v, isNew) {
  const e = {};
  if (isNew && !v.courseId) e.courseId = 'required';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(new Date(`${v.date}T00:00:00Z`).getTime())) e.date = 'date';
  if (!TIME_RE.test(v.start)) e.start = 'time';
  if (!TIME_RE.test(v.end)) e.end = 'time';
  if (!e.start && !e.end && v.end <= v.start) e.end = 'endTime';

  if (v.mode === 'online') {
    if (!validUrl(v.link)) e.link = 'url';
  } else {
    const place = v.location.trim();
    if (!place) e.location = 'required';
    else if (place.length > 150) e.location = 'length';
  }

  if (v.title.trim().length > 100) e.title = 'length';

  if (isNew && v.repeatWeeks !== '') {
    const n = Number(v.repeatWeeks);
    if (!Number.isInteger(n) || n < 0 || n > 25) e.repeatWeeks = 'repeat';
  }
  return e;
}

function Editor({ sessionId, courses, courseTitle, initial, inSeries, cancelled }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isNew = !sessionId;

  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`cs.errors.${errors[key]}`) : undefined);

  const goBack = (day) => navigate('/teacher/calendar', { state: { day: day || v.date } });

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(v, isNew);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      title: v.title, date: v.date, start: v.start, end: v.end,
      mode: v.mode, link: v.link, location: v.location, repeatWeeks: v.repeatWeeks,
    };
    setSaving(true);
    try {
      if (isNew) await api(`/teacher/courses/${v.courseId}/sessions`, { method: 'POST', token, body });
      else await api(`/teacher/sessions/${sessionId}`, { method: 'PUT', token, body });
      goBack();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  const act = async (confirmKey, request) => {
    if (confirmKey && !window.confirm(t(confirmKey))) return;
    setBusy(true);
    setFormError('');
    try {
      await request();
      goBack();
    } catch (error) {
      setFormError(apiErrorText(t, error));
      setBusy(false);
    }
  };

  const toggleCancel = () =>
    act(cancelled ? null : 'cs.confirmCancel', () =>
      api(`/teacher/sessions/${sessionId}/cancel`, { method: 'PATCH', token, body: { cancelled: !cancelled } })
    );
  const remove = (following) =>
    act(following ? 'cs.confirmDeleteFollowing' : 'cs.confirmDelete', () =>
      api(`/teacher/sessions/${sessionId}${following ? '?scope=following' : ''}`, { method: 'DELETE', token })
    );

  const courseOptions = courses
    ? [{ value: '', label: t('cs.chooseCourse') }, ...courses.map((c) => ({ value: c.id, label: c.title[lang] }))]
    : [];
  const modeOptions = [
    { value: 'online', label: t('cal.online') },
    { value: 'offline', label: t('cal.offline') },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/teacher/calendar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('cs.back')}
      </Link>
      <h1 className="mt-4 text-2xl">{isNew ? t('cs.formNew') : t('cs.formEdit')}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t('cs.draftNote')}</p>
      <p className="mt-1 text-xs text-ink-muted">{t('cal.tzNote')}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Card>
          <div className="space-y-4">
            {isNew ? (
              <Select label={t('cs.course')} options={courseOptions} value={v.courseId} onChange={change('courseId')} error={err('courseId')} />
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-navy">{t('cs.course')}</p>
                <p className="text-sm text-ink-muted">{courseTitle}</p>
              </div>
            )}

            <Input
              label={t('cs.titleOpt')} hint={t('cs.titleHint')} maxLength={100}
              value={v.title} onChange={change('title')} error={err('title')}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input label={t('cs.date')} type="date" value={v.date} onChange={change('date')} error={err('date')} />
              <Input label={t('cs.start')} type="time" value={v.start} onChange={change('start')} error={err('start')} />
              <Input label={t('cs.end')} type="time" value={v.end} onChange={change('end')} error={err('end')} />
            </div>

            <RoleToggle
              label={t('cs.mode')} value={v.mode} options={modeOptions}
              onChange={(mode) => { setV((prev) => ({ ...prev, mode })); setErrors((prev) => ({ ...prev, link: undefined, location: undefined })); }}
            />

            {v.mode === 'online' ? (
              <Input
                label={t('cs.link')} type="url" placeholder="https://" hint={t('cs.linkHint')}
                value={v.link} onChange={change('link')} error={err('link')}
              />
            ) : (
              <Input
                label={t('cs.location')} hint={t('cs.locationHint')} maxLength={150}
                value={v.location} onChange={change('location')} error={err('location')}
              />
            )}

            {isNew && (
              <Input
                label={t('cs.repeat')} type="number" min="0" max="25" inputMode="numeric" hint={t('cs.repeatHint')}
                value={v.repeatWeeks} onChange={change('repeatWeeks')} error={err('repeatWeeks')}
              />
            )}
          </div>
        </Card>

        {formError && (
          <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <Button type="submit" size="lg" disabled={saving || busy}>
          {saving ? t('cs.saving') : t('cs.save')}
        </Button>
      </form>

      {!isNew && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={busy || saving} onClick={toggleCancel}>
              {cancelled ? t('cs.restoreClass') : t('cs.cancelClass')}
            </Button>
            <Button type="button" variant="danger" disabled={busy || saving} onClick={() => remove(false)}>
              {t('cs.delete')}
            </Button>
            {inSeries && (
              <Button type="button" variant="danger" disabled={busy || saving} onClick={() => remove(true)}>
                {t('cs.deleteFollowing')}
              </Button>
            )}
          </div>
          {!cancelled && <p className="mt-3 text-xs text-ink-muted">{t('cs.cancelHint')}</p>}
        </Card>
      )}
    </div>
  );
}

// Edit mode: load the class first, then show the form filled in (times are shown in Tashkent time)
function EditLoader({ id }) {
  const { lang } = useI18n();
  const { data, error, loading, reload } = useApi(`/teacher/sessions/${id}`);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <Editor
          sessionId={id}
          courseTitle={data.session.course.title[lang]}
          inSeries={data.session.inSeries}
          cancelled={data.session.cancelled}
          initial={{
            courseId: data.session.course.id,
            title: data.session.title,
            date: dayKeyOf(data.session.startsAt),
            start: timeOf(data.session.startsAt),
            end: timeOf(data.session.endsAt),
            mode: data.session.mode,
            link: data.session.link,
            location: data.session.location,
            repeatWeeks: '',
          }}
        />
      )}
    </DataState>
  );
}

// Create mode: load the teacher's courses for the dropdown
function CreateLoader() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/teacher/courses');
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (data.courses.length === 0 ? (
        <div className="mx-auto max-w-3xl">
          <Card>
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <p>{t('cs.needCourse')}</p>
              <Button as={Link} to="/teacher/courses/new" size="sm">{t('tc.createFirst')}</Button>
            </div>
          </Card>
        </div>
      ) : (
        <Editor
          courses={data.courses}
          initial={{
            courseId: '', title: '', date: '', start: '', end: '',
            mode: 'offline', link: '', location: '', repeatWeeks: '0',
          }}
        />
      ))}
    </DataState>
  );
}

export default function SessionForm() {
  const { sessionId } = useParams();
  return sessionId ? <EditLoader id={sessionId} /> : <CreateLoader />;
}