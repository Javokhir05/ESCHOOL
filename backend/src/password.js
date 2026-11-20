// A short list of passwords that are tried first by anyone guessing
const COMMON = new Set([
  '12345678', '123456789', '1234567890', '12341234', '00000000', '11111111',
  'password', 'password1', 'password123', 'qwertyui', 'qwerty123', 'iloveyou', 'admin123', 'abcd1234',
]);

// Returns an error key ('password' = too short or too long, 'weak' = too easy to guess), or null when fine.
// bcrypt only reads the first 72 bytes, so longer passwords are refused instead of silently cut.
function validatePassword(password, email = '') {
  const p = String(password ?? '');
  if (p.length < 8 || Buffer.byteLength(p, 'utf8') > 72) return 'password';
  const lower = p.toLowerCase();
  if (COMMON.has(lower) || lower === String(email).toLowerCase() || /^(.)\1+$/.test(p)) return 'weak';
  return null;
}

module.exports = { validatePassword };