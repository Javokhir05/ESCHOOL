import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TeacherCard from '../../components/TeacherCard';
import { Button } from '../../components/ui';
import { api } from '../../api';
import { useI18n } from '../../i18n';

export default function Teachers() {
  const { t } = useI18n();
  const [items, setItems] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api('/public/teachers')
      .then((d) => !cancelled && setItems(d.teachers))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl">{t('pt.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('pt.sub')}</p>

      <div className="mt-8">
        {failed ? (
          <p role="alert" className="text-ink-muted">{t('common.loadError')}</p>
        ) : items === null ? (
          <p role="status" className="text-ink-muted">{t('auth.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-ink-muted">{t('pt.none')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((x, i) => <TeacherCard key={i} teacher={x} />)}
          </div>
        )}
      </div>

      <Button as={Link} to="/courses" variant="secondary" className="mt-10">{t('pt.explore')}</Button>
    </div>
  );
}