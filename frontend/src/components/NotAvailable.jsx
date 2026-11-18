import { Link } from 'react-router-dom';
import { Button } from './ui';
import { useI18n } from '../i18n';

export default function NotAvailable() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl py-16 text-center">
      <h1 className="text-2xl">{t('sc.notFoundTitle')}</h1>
      <p className="mt-2 text-ink-muted">{t('sc.notFoundText')}</p>
      <Button as={Link} to="/student/courses" variant="secondary" className="mt-6">{t('sc.back')}</Button>
    </div>
  );
}