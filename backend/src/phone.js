// Accepts 901234567 or +998901234567 and returns +998901234567 (or null)
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

module.exports = { normalizePhone };