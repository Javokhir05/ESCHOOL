import { apiBlob } from '../api';

const cache = new Map(); // key -> Promise of an object URL (or null)

export function loadAvatar(key, userId, token) {
  if (!cache.has(key)) {
    const promise = apiBlob(`/files/avatars/${userId}`, { token })
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => {
        cache.delete(key);
        return null;
      });
    cache.set(key, promise);
  }
  return cache.get(key);
}

// Called at logout, so the next person on this computer starts with nothing
export function clearAvatarCache() {
  for (const promise of cache.values()) promise.then((url) => url && URL.revokeObjectURL(url));
  cache.clear();
}