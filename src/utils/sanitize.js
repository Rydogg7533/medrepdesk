import DOMPurify from 'dompurify';

// Strips all HTML tags from input — use on any user text fields.
// Returns null if input is empty/falsy.
export function sanitizeText(value) {
  if (!value) return null;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim() || null;
}

// Sanitizes an object's string values, leaving non-strings unchanged.
// Pass a list of keys to sanitize, or omit to sanitize all string values.
export function sanitizeFields(obj, keys) {
  const result = { ...obj };
  const targetKeys = keys || Object.keys(result);
  for (const key of targetKeys) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeText(result[key]);
    }
  }
  return result;
}
