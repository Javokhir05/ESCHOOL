import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '../../components/ui';
import DataState from '../../components/DataState';
import { api, ApiError } from '../../api';
import { apiErrorText } from '../../auth/errorMessage';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useI18n } from '../../i18n';

let counter = 0;
const newQuestion = () => ({ key: ++counter, text: '', options: ['', ''], correct: 0 });

const optionInput =
  'h-11 w-full rounded-control border bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

// The server checks the same rules again, so these checks are only for quick feedback.
function validate(v, questions, needCourse, needQuestions) {
  const fields = {};
  const perQuestion = {};

  if (needCourse && !v.courseId) fields.courseId = 'required';

  const title = v.title.trim();
  if (title.length < 3) fields.title = 'required';
  else if (title.length > 120) fields.title = 'length';

  if (v.description.trim().length > 2000) fields.description = 'length';

  if (v.timeLimit.trim() !== '') {
    const n = Number(v.timeLimit);
    if (!Number.isInteger(n) || n < 1 || n > 300) fields.timeLimit = 'timeLimit';
  }
  const attempts = Number(v.maxAttempts);
  if (v.maxAttempts === '' || !Number.isInteger(attempts) || attempts < 1 || attempts > 10) fields.maxAttempts = 'maxAttempts';
  const pass = Number(v.passPercent);
  if (v.passPercent === '' || !Number.isInteger(pass) || pass < 0 || pass > 100) fields.passPercent = 'passPercent';

  if (needQuestions) {
    if (questions.length < 1 || questions.length > 50) fields.questionCount = 'questions';
    questions.forEach((q, i) => {
      const text = q.text.trim();
      if (!text || text.length > 500) perQuestion[i] = 'questionText';
      else if (q.options.length < 2 || q.options.some((o) => !o.trim() || o.trim().length > 200)) perQuestion[i] = 'options';
    });
  }
  return { fields, perQuestion };
}

function Editor({ testId, courses, courseTitle, locked, initial }) {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [v, setV] = useState(initial.fields);
  const [questions, setQuestions] = useState(initial.questions);
  const [errors, setErrors] = useState({});
  const [qErrors, setQErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (key) => (e) => {
    setV((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const err = (key) => (errors[key] ? t(`ts.errors.${errors[key]}`) : undefined);

  const patch = (key, changes) => setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...changes } : q)));
  const clearQError = (i) => setQErrors((prev) => ({ ...prev, [i]: undefined }));

  const setOption = (key, idx, value) =>
    setQuestions((prev) =>
      prev.map((q) => (q.key === key ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q))
    );
  const addOption = (key) =>
    setQuestions((prev) =>
      prev.map((q) => (q.key === key && q.options.length < 6 ? { ...q, options: [...q.options, ''] } : q))
    );
  const removeOption = (key, idx) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key || q.options.length <= 2) return q;
        // keep the "correct" marker on the same option after one is removed
        const correct = q.correct === idx ? 0 : q.correct > idx ? q.correct - 1 : q.correct;
        return { ...q, options: q.options.filter((_, i) => i !== idx), correct };
      })
    );
  const addQuestion = () => setQuestions((prev) => (prev.length >= 50 ? prev : [...prev, newQuestion()]));
  const removeQuestion = (key) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.key !== key)));
    setQErrors({});
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const { fields, perQuestion } = validate(v, questions, !testId, !locked);
    setErrors(fields);
    setQErrors(perQuestion);
    if (Object.keys(fields).length > 0 || Object.keys(perQuestion).length > 0) return;

    const body = {
      title: v.title,
      description: v.description,
      timeLimit: v.timeLimit.trim() === '' ? null : Number(v.timeLimit),
      maxAttempts: Number(v.maxAttempts),
      passPercent: Number(v.passPercent),
      showAnswers: v.showAnswers,
      ...(locked ? {} : { questions: questions.map((q) => ({ text: q.text, options: q.options, correct: q.correct })) }),
    };

    setSaving(true);
    try {
      if (testId) await api(`/teacher/tests/${testId}`, { method: 'PUT', token, body });
      else await api(`/teacher/courses/${v.courseId}/tests`, { method: 'POST', token, body });
      navigate('/teacher/tests');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION' && error.fields) setErrors(error.fields);
      else setFormError(apiErrorText(t, error));
      setSaving(false);
    }
  };

  const courseOptions = courses
    ? [{ value: '', label: t('ts.chooseCourse') }, ...courses.map((c) => ({ value: c.id, label: c.title[lang] }))]
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/teacher/tests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('ts.back')}
      </Link>
      <h1 className="mt-4 text-2xl">{testId ? t('ts.formEdit') : t('ts.formNew')}</h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Card>
          <div className="space-y-4">
            {testId ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-navy">{t('ts.course')}</p>
                <p className="text-sm text-ink-muted">{courseTitle}</p>
              </div>
            ) : (
              <Select label={t('ts.course')} options={courseOptions} value={v.courseId} onChange={change('courseId')} error={err('courseId')} />
            )}
            <Input label={t('ts.testTitle')} value={v.title} onChange={change('title')} error={err('title')} />
            <Textarea label={t('ts.description')} rows={4} value={v.description} onChange={change('description')} error={err('description')} />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={t('ts.timeLimit')} type="number" min="1" max="300" inputMode="numeric" hint={t('ts.timeLimitHint')}
                value={v.timeLimit} onChange={change('timeLimit')} error={err('timeLimit')}
              />
              <Input
                label={t('ts.maxAttempts')} type="number" min="1" max="10" inputMode="numeric"
                value={v.maxAttempts} onChange={change('maxAttempts')} error={err('maxAttempts')}
              />
              <Input
                label={t('ts.passPercent')} type="number" min="0" max="100" inputMode="numeric"
                value={v.passPercent} onChange={change('passPercent')} error={err('passPercent')}
              />
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm font-semibold text-navy">
                <input
                  type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={v.showAnswers}
                  onChange={(e) => setV((prev) => ({ ...prev, showAnswers: e.target.checked }))}
                />
                {t('ts.showAnswers')}
              </label>
              <p className="ml-7 mt-1 text-xs text-ink-muted">{t('ts.showAnswersHint')}</p>
            </div>
          </div>
        </Card>

        <h2 className="pt-2 text-xl">{t('ts.questionsTitle')}</h2>

        {locked ? (
          <>
            <p className="rounded-control bg-amber-soft px-3 py-2 text-sm text-amber">{t('ts.lockedNote')}</p>
            {questions.map((q, i) => (
              <Card key={q.key} title={t('ts.question').replace('{n}', i + 1)}>
                <p className="whitespace-pre-line text-navy">{q.text}</p>
                <ul className="mt-3 space-y-2">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={`flex items-start gap-2 rounded-control px-3 py-2 text-sm ${
                        q.correct === j ? 'bg-teal-soft text-teal-dark' : 'text-ink'
                      }`}
                    >
                      {q.correct === j ? <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <span className="w-4 shrink-0" />}
                      <span>{o}</span>
                      {q.correct === j && <span className="ml-auto shrink-0 text-xs font-semibold">{t('ts.correct')}</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </>
        ) : (
          <>
            {errors.questionCount && (
              <p role="alert" className="text-xs text-red-600">{t(`ts.errors.${errors.questionCount}`)}</p>
            )}

            {questions.map((q, i) => (
              <Card key={q.key} title={t('ts.question').replace('{n}', i + 1)}>
                <div className="space-y-4">
                  <Textarea
                    label={t('ts.questionText')} rows={2} value={q.text}
                    onChange={(e) => { patch(q.key, { text: e.target.value }); clearQError(i); }}
                  />

                  <fieldset>
                    <legend className="mb-1.5 text-sm font-semibold text-navy">{t('ts.correct')}</legend>
                    <p className="mb-2 text-xs text-ink-muted">{t('ts.correctHint')}</p>
                    <div className="space-y-2">
                      {q.options.map((o, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <input
                            type="radio" name={`correct-${q.key}`} className="h-4 w-4 shrink-0 accent-brand"
                            checked={q.correct === j}
                            onChange={() => patch(q.key, { correct: j })}
                            aria-label={`${t('ts.correct')}: ${t('ts.option').replace('{n}', j + 1)}`}
                          />
                          <input
                            className={`${optionInput} ${q.correct === j ? 'border-teal' : 'border-line'}`}
                            aria-label={t('ts.option').replace('{n}', j + 1)}
                            placeholder={t('ts.option').replace('{n}', j + 1)}
                            maxLength={200} value={o}
                            onChange={(e) => { setOption(q.key, j, e.target.value); clearQError(i); }}
                          />
                          {q.options.length > 2 && (
                            <Button
                              type="button" variant="secondary" size="sm"
                              aria-label={`${t('ts.removeOption')}: ${t('ts.option').replace('{n}', j + 1)}`}
                              onClick={() => removeOption(q.key, j)}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {qErrors[i] && <p role="alert" className="text-xs text-red-600">{t(`ts.errors.${qErrors[i]}`)}</p>}

                  <div className="flex flex-wrap gap-2">
                    {q.options.length < 6 && (
                      <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => addOption(q.key)}>
                        <Plus size={16} aria-hidden="true" />
                        {t('ts.addOption')}
                      </Button>
                    )}
                    {questions.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(q.key)}>
                        <Trash2 size={16} aria-hidden="true" />
                        {t('ts.removeQuestion')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {questions.length < 50 && (
              <Button type="button" variant="secondary" onClick={addQuestion}>
                <Plus size={16} aria-hidden="true" />
                {t('ts.addQuestion')}
              </Button>
            )}
          </>
        )}

        {formError && (
          <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? t('ts.saving') : t('ts.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Edit mode: load the test first, then show the form filled in
function EditLoader({ id }) {
  const { lang } = useI18n();
  const { data, error, loading, reload } = useApi(`/teacher/tests/${id}`);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <Editor
          testId={id}
          locked={data.test.locked}
          courseTitle={data.test.course.title[lang]}
          initial={{
            fields: {
              courseId: data.test.course.id,
              title: data.test.title,
              description: data.test.description || '',
              timeLimit: data.test.timeLimit == null ? '' : String(data.test.timeLimit),
              maxAttempts: String(data.test.maxAttempts),
              passPercent: String(data.test.passPercent),
              showAnswers: data.test.showAnswers,
            },
            questions: data.test.questions.map((q) => ({
              key: ++counter,
              text: q.text,
              options: [...q.options],
              correct: q.correct,
            })),
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
              <p>{t('ts.needCourse')}</p>
              <Button as={Link} to="/teacher/courses/new" size="sm">{t('tc.createFirst')}</Button>
            </div>
          </Card>
        </div>
      ) : (
        <Editor
          courses={data.courses}
          locked={false}
          initial={{
            fields: { courseId: '', title: '', description: '', timeLimit: '', maxAttempts: '1', passPercent: '60', showAnswers: true },
            questions: [newQuestion()],
          }}
        />
      ))}
    </DataState>
  );
}

export default function TestForm() {
  const { testId } = useParams();
  return testId ? <EditLoader id={testId} /> : <CreateLoader />;
}