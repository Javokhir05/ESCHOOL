import { Card } from '../../components/ui';
import { useI18n } from '../../i18n';

export default function AdminOverview() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('admin.title')}</h1>
      <Card className="mt-6"><p className="text-ink-muted">{t('admin.sub')}</p></Card>
    </div>
  );
}