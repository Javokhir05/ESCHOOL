// Uzbekistan has a single time zone, UTC+5, all year round (no daylight saving time).
// Every time on the calendar is shown in this zone, whatever the computer's own clock says.
export const TZ = 'Asia/Tashkent';
const OFFSET = '+05:00';

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const dayKeyOf = (value) => dayFormat.format(new Date(value)); // "2026-11-22"
export const timeOf = (value) => timeFormat.format(new Date(value)); // "18:00"
export const instantOf = (dayKey, time = '00:00') => new Date(`${dayKey}T${time}:00${OFFSET}`);

export function addDays(dayKey, n) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// The Monday of the week that contains the day
export function weekStartOf(dayKey) {
  const dow = (new Date(`${dayKey}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(dayKey, -dow);
}

export function formatDay(dayKey, lang, options) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB', {
    timeZone: 'UTC',
    ...options,
  });
}