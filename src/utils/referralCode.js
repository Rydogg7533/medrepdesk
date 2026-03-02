export function generateReferralCode(accountName) {
  const prefix = accountName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return prefix + suffix;
}
