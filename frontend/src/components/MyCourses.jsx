import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Badge, Button, Card } from './ui';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

const tones = { PENDING: 'amber', ACTIVE: 'teal', REJECTED: 'neutral' };

export default function MyCourses() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const [items, setItems] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api('/enrollments/mine', { token })
      .then((d) => setItems(d.enrollments))
      .catch(() => setFailed(true));
  }, [token]);

  return (
    <Card title={t('profile.currentCourses')}>
      {failed ? (
        <p role="alert" className="text-sm text-ink-muted">{t('profile.loadError')}</p>
      ) : items === null ? (
        <p role="status" className="text-sm text-ink-muted">{t('auth.loading')}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
          <BookOpen size={22} className="text-slate-300" aria-hidden="true" />
          <p>{t('profile.noCourses')}</p>
          <Button as={Link} to="/courses" variant="secondary" size="sm">{t('profile.browse')}</Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3">
              <Link to={`/courses/${e.course.id}`} className="text-sm font-semibold text-navy hover:underline">
                {e.course.title[lang]}
              </Link>
              <Badge tone={tones[e.status]}>{t(`profile.status.${e.status}`)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}