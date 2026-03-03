const STRIP_SUFFIXES = [
  'hospital', 'medical center', 'surgery center', 'surgical center',
  'inc', 'llc', 'corp', 'corporation', 'orthopedics', 'orthopaedics',
  'medical', 'center', 'clinic', 'group', 'associates',
];

const ABBREVIATIONS = {
  saint: 'st',
  mount: 'mt',
};

/**
 * Normalize a name for fuzzy comparison:
 * - lowercase
 * - strip punctuation (periods, apostrophes, commas, hyphens)
 * - expand/collapse abbreviations (Saint ↔ St, Mount ↔ Mt)
 * - strip common suffixes
 * - collapse whitespace, trim
 */
export function normalizeName(name) {
  if (!name) return '';

  let n = name.toLowerCase();

  // Strip punctuation
  n = n.replace(/[.'',\-]/g, '');

  // Expand abbreviations for matching — replace full words with short form
  for (const [full, short] of Object.entries(ABBREVIATIONS)) {
    // Replace the full word with the short form
    n = n.replace(new RegExp(`\\b${full}\\b`, 'g'), short);
  }

  // Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();

  // Strip common suffixes (iterate to handle multi-word suffixes)
  for (const suffix of STRIP_SUFFIXES) {
    // Remove suffix at end of string
    const re = new RegExp(`\\s+${suffix.replace(/\s+/g, '\\s+')}\\s*$`, 'i');
    n = n.replace(re, '');
  }

  return n.trim();
}

/**
 * Check if two names are fuzzy duplicates.
 * Returns true if either normalized form contains the other,
 * or they match exactly after normalization.
 */
export function isFuzzyMatch(nameA, nameB) {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

/**
 * Find a fuzzy duplicate in a list of records.
 * @param {string} name - The name to check
 * @param {Array} records - Array of records with a name field
 * @param {string} nameField - The field name to compare (default: 'name')
 * @param {string|null} excludeId - Record ID to exclude (for edit mode)
 * @returns {{ record: object, isActive: boolean } | null}
 */
export function findFuzzyDuplicate(name, records, nameField = 'name', excludeId = null) {
  if (!name?.trim() || !records?.length) return null;

  for (const record of records) {
    if (excludeId && record.id === excludeId) continue;
    if (isFuzzyMatch(name, record[nameField])) {
      return {
        record,
        isActive: record.is_active !== false,
      };
    }
  }
  return null;
}
