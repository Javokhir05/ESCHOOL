import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TeacherCard from './TeacherCard';
import { Button } from './ui';
import { api } from '../api';
import { useI18n } from '../i18n';

export default function PublicTeachers() {
  const { t } = useI18n();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api('/public/teachers')
      .then((d) => !cancelled && setItems(d.teachers))
      .catch(() => !cancelled && setItems([]));
    return () => { cancelled = true; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl sm:text-3xl">{t('landing.teachersTitle')}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {items.slice(0, 3).map((x, i) => <TeacherCard key={i} teacher={x} />)}
        </div>
        <Button as={Link} to="/teachers" variant="secondary" className="mt-6">{t('pt.seeAll')}</Button>
      </section>
    </div>
  );
}