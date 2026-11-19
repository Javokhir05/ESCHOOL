import { useState } from 'react';
import { FileText } from 'lucide-react';
import { apiBlob } from '../api';
import { useAuth } from '../auth/AuthContext';
import { formatSize, openBlob } from '../utils/files';
import { useI18n } from '../i18n';

export default function FileButton({ path, name, size }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const blob = await apiBlob(path, { token });
      openBlob(blob, `${name}.pdf`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="inline-flex items-center gap-2 text-left text-sm font-semibold text-brand hover:underline disabled:opacity-60"
      >
        <FileText size={16} className="shrink-0" aria-hidden="true" />
        <span>{name}</span>
        <span className="font-normal text-ink-muted">PDF{size ? ` · ${formatSize(size)}` : ''}</span>
      </button>
      {failed && <p role="alert" className="mt-1 text-xs text-red-600">{t('sc.openError')}</p>}
    </div>
  );
}