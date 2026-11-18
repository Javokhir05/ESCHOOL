import { useState } from 'react';
import { ExternalLink, FileText, Paperclip } from 'lucide-react';
import { apiBlob } from '../api';
import { useAuth } from '../auth/AuthContext';
import { formatSize, openBlob } from '../utils/files';
import { useI18n } from '../i18n';

export default function MaterialLink({ material }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (material.hasFile) {
    const open = async () => {
      setBusy(true);
      setFailed(false);
      try {
        const blob = await apiBlob(`/files/materials/${material.id}`, { token });
        openBlob(blob, `${material.title}.pdf`);
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
          <span>{material.title}</span>
          <span className="font-normal text-ink-muted">PDF{material.size ? ` · ${formatSize(material.size)}` : ''}</span>
        </button>
        {failed && <p role="alert" className="mt-1 text-xs text-red-600">{t('sc.openError')}</p>}
      </div>
    );
  }

  // Older materials that were saved as links
  const href = /^https?:\/\//i.test(material.url || '') ? material.url : null;
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
    >
      <Paperclip size={16} aria-hidden="true" />
      {material.title}
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  ) : (
    <span className="text-sm text-ink-muted">{material.title}</span>
  );
}