import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { loadAvatar } from '../utils/AvatarCache';

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl' };

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// The name is always written next to the avatar, so the picture itself is decorative
export default function Avatar({ userId, name, hasAvatar, version, size = 'md' }) {
  const { token } = useAuth();
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!hasAvatar || !userId || !token) {
      setUrl(null);
      return undefined;
    }
    let cancelled = false;
    loadAvatar(`${userId}:${version}`, userId, token).then((u) => !cancelled && setUrl(u));
    return () => { cancelled = true; };
  }, [hasAvatar, userId, version, token]);

  return url ? (
    <img src={url} alt="" className={`shrink-0 rounded-full object-cover ${sizes[size]}`} />
  ) : (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand ${sizes[size]}`}
    >
      {initials(name)}
    </span>
  );
}