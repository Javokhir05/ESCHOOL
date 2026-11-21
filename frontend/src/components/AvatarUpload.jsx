import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import { Button } from './ui';
import { api } from '../api';
import { apiErrorText } from '../auth/errorMessage';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUpload() {
  const { t } = useI18n();
  const { user, token, refreshUser } = useAuth();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (request) => {
    setBusy(true);
    setError('');
    try {
      await request();
      try { await refreshUser(); } catch { /* the photo is saved; it appears on the next page load */ }
    } catch (e) {
      setError(apiErrorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const pick = (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    // The server checks the real content again. These checks are only for quick feedback.
    if ((file.type && !TYPES.includes(file.type)) || file.size === 0) return setError(t('av.errors.type'));
    if (file.size > MAX_BYTES) return setError(t('av.errors.size'));
    const form = new FormData();
    form.append('file', file);
    run(() => api('/account/avatar', { method: 'POST', token, form }));
  };

  const remove = () => {
    if (!window.confirm(t('av.confirmRemove'))) return;
    run(() => api('/account/avatar', { method: 'DELETE', token }));
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar userId={user.id} name={user.fullName} hasAvatar={user.hasAvatar} version={user.avatarUpdatedAt} size="lg" />
      <div className="min-w-0">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} onChange={pick} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <Camera size={14} aria-hidden="true" />
            {busy ? t('av.uploading') : user.hasAvatar ? t('av.change') : t('av.add')}
          </Button>
          {user.hasAvatar && (
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={remove}>
              <Trash2 size={14} aria-hidden="true" />
              {t('av.remove')}
            </Button>
          )}
        </div>
        <p className="mt-2 max-w-md text-xs text-ink-muted">{t('av.hint')}</p>
        {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}