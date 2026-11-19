import { useEffect, useState } from 'react';
import { Badge, Card } from './ui';
import { api } from '../api';
import { formatDate } from '../utils/dates';
import { useI18n } from '../i18n';

export default function PublicAchievements() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    api('/public/achievements')
      .then((d) => !cancelled && setItems(d.achievements))
      .catch(() => !cancelled && setItems([]));
    return () => { cancelled = true; };
  }, []);

  if (items === null) return null;
  if (items.length === 0) return <p className="mt-6 text-sm text-ink-muted">{t('landing.resultsEmpty')}</p>;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-bold text-navy">{a.result}</p>
              <p className="mt-1 font-medium text-navy">{a.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{a.name} · {formatDate(a.issuedOn, lang)}</p>
            </div>
            <Badge tone="teal">{t('ds.verified')}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}