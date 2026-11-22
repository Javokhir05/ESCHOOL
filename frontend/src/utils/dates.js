import { formatDateParts } from './names';

const pad = (n) => String(n).padStart(2, '0');
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const MEDIUM = { day: true, month: 'short', year: true };

// "22 noy 2026, 18:00" (in the computer's own time zone)
export function formatDateTime(iso, lang) {
  const d = new Date(iso);
  const date = formatDateParts({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear() }, lang, MEDIUM);
  return `${date}, ${clock(d)}`;
}

// Turns a saved date into the "2026-11-30T18:00" format that a date-time input expects
export function toLocalInput(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Dates without a time of day (achievements) are read in UTC, so they never shift by a day
export function formatDate(iso, lang) {
  const d = new Date(iso);
  return formatDateParts({ day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }, lang, MEDIUM);
}

// "2026-11-30" for a date input
export function toDateInput(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

// "noyabr 2026"
export function formatMonthYear(iso, lang) {
  const d = new Date(iso);
  return formatDateParts({ month: d.getMonth(), year: d.getFullYear() }, lang, { month: 'long', year: true });
}

// Messages from today show only the time
export function formatMessageTime(iso, lang) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? clock(d) : formatDateTime(iso, lang);
}