const PASSWORD_MIN_LENGTH = 8;

function getPasswordError(password) {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(value)) return 'Password must contain a number.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must contain a special character.';
  return null;
}

module.exports = { PASSWORD_MIN_LENGTH, getPasswordError };