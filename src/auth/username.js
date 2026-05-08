export function buildCognitoUsername(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const localPart = normalized.split('@')[0] || 'user';
  const safeLocal = localPart.replace(/[^a-z0-9._-]/g, '').slice(0, 20) || 'user';
  const suffix = normalized
    .split('')
    .reduce((hash, ch) => ((hash << 5) - hash + ch.charCodeAt(0)) | 0, 0);

  return `${safeLocal}_${Math.abs(suffix)}`;
}
