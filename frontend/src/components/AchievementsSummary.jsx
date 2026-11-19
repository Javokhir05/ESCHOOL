import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { Badge, Button, Card } from './ui';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/dates';
import { useI18n } from '../i18n';

export default function AchievementsSummary() {
  const { t, lang } = useI18n();
  const { data, error, loading } = useApi('/student/achievements');
  const verified = data ? data.achievements.filter((a) => a.status === 'VERIFIED').slice(0, 3) : [];

  return (
    <Card title={t('profile.achievementsTitle')}>
      {error ? (
        <p role="alert" className="text-sm text-ink-muted">{t('common.loadError')}</p>
      ) : loading ? (
        <p role="status" className="text-sm text-ink-muted">{t('auth.loading')}</p>
      ) : verified.length === 0 ? (
        <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
          <Award size={22} className="text-slate-300" aria-hidden="true" />
          <p>{data.achievements.length === 0 ? t('ac.summaryEmpty') : t('profile.noAchievements')}</p>
          <Button as={Link} to="/student/achievements" variant="secondary" size="sm">{t('ac.viewAll')}</Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {verified.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">{a.title}</p>
                  <p className="text-xs text-ink-muted">{a.result} · {formatDate(a.issuedOn, lang)}</p>
                </div>
                <Badge tone="teal">{t('ac.status.VERIFIED')}</Badge>
              </li>
            ))}
          </ul>
          <Button as={Link} to="/student/achievements" variant="ghost" size="sm" className="-ml-3 mt-3">{t('ac.viewAll')}</Button>
        </>
      )}
    </Card>
  );
}