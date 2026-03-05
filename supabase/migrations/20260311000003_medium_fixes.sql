-- Fix #32: Prevent duplicate commissions per case
-- First deduplicate any existing duplicates (keep the most recent)
DELETE FROM commissions
WHERE id NOT IN (
  SELECT DISTINCT ON (case_id) id
  FROM commissions
  WHERE case_id IS NOT NULL
  ORDER BY case_id, created_at DESC
)
AND case_id IS NOT NULL
AND case_id IN (
  SELECT case_id FROM commissions
  WHERE case_id IS NOT NULL
  GROUP BY case_id HAVING COUNT(*) > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS commissions_case_id_unique
  ON commissions (case_id) WHERE case_id IS NOT NULL;
