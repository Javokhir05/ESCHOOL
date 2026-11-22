// Month and weekday names kept inside the app, because browsers do not always have Uzbek ones.
// Weekday index follows JavaScript: 0 = Sunday. Month index: 0 = January.
const NAMES = {
  uz: {
    weekdaysShort: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'],
    weekdaysLong: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
    monthsShort: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
    monthsLong: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  },
  en: {
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
};

// parts: { weekday, day, month, year } as numbers (weekday and month are the JavaScript indexes)
// options: which of them to write, for example { weekday: 'short', day: true, month: 'short', year: true }
export function formatDateParts(parts, lang, options = {}) {
  const n = NAMES[lang] || NAMES.en;
  const out = [];
  if (options.weekday) out.push((options.weekday === 'long' ? n.weekdaysLong : n.weekdaysShort)[parts.weekday]);
  if (options.day) out.push(String(parts.day));
  if (options.month) out.push((options.month === 'long' ? n.monthsLong : n.monthsShort)[parts.month]);
  if (options.year) out.push(String(parts.year));
  return out.join(' ');
}