import { ApiError } from '../api';

// Turns an API error into text in the current language
export function apiErrorText(t, err) {
  const code = err instanceof ApiError ? err.code : 'SERVER_ERROR';
  const key = `auth.apiErrors.${code}`;
  const text = t(key);
  return text === key ? t('auth.apiErrors.SERVER_ERROR') : text;
}