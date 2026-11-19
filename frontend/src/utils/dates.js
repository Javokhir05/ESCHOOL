export function formatDateTime(iso, lang) {
  return new Date(iso).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Turns a saved date into the "2026-11-30T18:00" format that a date-time input expects
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}