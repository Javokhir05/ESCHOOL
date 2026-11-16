import { Button } from './ui';
import { useI18n } from '../i18n';

export default function DataState({ loading, error, onRetry, children }) {
  const { t } = useI18n();

  if (error) {
    return (
      <div className="rounded-card border border-dashed border-line bg-white px-6 py-10 text-center">
        <p role="alert" className="text-ink-muted">{t('common.loadError')}</p>
        <Button variant="secondary" className="mt-4" onClick={onRetry}>{t('catalog.retry')}</Button>
      </div>
    );
  }
  if (loading) return <p role="status" className="text-ink-muted">{t('auth.loading')}</p>;
  return children;
}