import { Button } from './ui';
import { useI18n } from '../i18n';

export default function Pagination({ page, total, pageSize, onPage }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <nav aria-label={t('common.pagination')} className="mt-5 flex items-center justify-between gap-3">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('common.prev')}
      </Button>
      <span className="text-sm text-ink-muted">
        {t('common.pageOf').replace('{page}', page).replace('{pages}', pages)}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('common.next')}
      </Button>
    </nav>
  );
}