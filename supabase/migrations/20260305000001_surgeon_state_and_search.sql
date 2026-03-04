-- Add state/city to surgeons and create search infrastructure
-- ════════════════════════════════════════════════════════════

-- 1. Add columns
ALTER TABLE surgeons ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE surgeons ADD COLUMN IF NOT EXISTS city text;

-- 2. Enable pg_trgm for fast ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. GIN trigram indexes for fast ILIKE search on global records
CREATE INDEX IF NOT EXISTS idx_facilities_name_trgm
  ON facilities USING gin (name gin_trgm_ops)
  WHERE is_global = true;

CREATE INDEX IF NOT EXISTS idx_surgeons_fullname_trgm
  ON surgeons USING gin (full_name gin_trgm_ops)
  WHERE is_global = true;

-- 4. B-tree index on surgeons.state for state filtering
CREATE INDEX IF NOT EXISTS idx_surgeons_state
  ON surgeons (state)
  WHERE is_global = true;

-- ════════════════════════════════════════════════════════════
-- RPC: search_facilities
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_facilities(
  search_term text,
  filter_states text[] DEFAULT NULL,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  state text,
  phone text,
  facility_type text,
  is_global boolean,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  -- Private facilities (always returned, no state filter)
  SELECT f.id, f.name, f.city, f.state, f.phone, f.facility_type, f.is_global, f.is_active
  FROM facilities f
  WHERE f.account_id = get_account_id()
    AND f.is_active = true
    AND f.name ILIKE '%' || search_term || '%'

  UNION ALL

  -- Global facilities (state-filtered if filter_states provided)
  SELECT f.id, f.name, f.city, f.state, f.phone, f.facility_type, f.is_global, f.is_active
  FROM facilities f
  WHERE f.is_global = true
    AND f.is_active = true
    AND f.name ILIKE '%' || search_term || '%'
    AND (filter_states IS NULL OR f.state = ANY(filter_states))

  ORDER BY is_global ASC, name ASC
  LIMIT result_limit;
$$;

-- ════════════════════════════════════════════════════════════
-- RPC: search_surgeons
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_surgeons(
  search_term text,
  filter_states text[] DEFAULT NULL,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  specialty text,
  city text,
  state text,
  phone text,
  is_global boolean,
  primary_facility_name text
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  -- Private surgeons (always returned, no state filter)
  SELECT s.id, s.full_name, s.specialty, s.city, s.state, s.phone, s.is_global,
         pf.name AS primary_facility_name
  FROM surgeons s
  LEFT JOIN facilities pf ON pf.id = s.primary_facility_id
  WHERE s.account_id = get_account_id()
    AND s.is_active = true
    AND s.full_name ILIKE '%' || search_term || '%'

  UNION ALL

  -- Global surgeons (state-filtered if filter_states provided)
  SELECT s.id, s.full_name, s.specialty, s.city, s.state, s.phone, s.is_global,
         pf.name AS primary_facility_name
  FROM surgeons s
  LEFT JOIN facilities pf ON pf.id = s.primary_facility_id
  WHERE s.is_global = true
    AND s.is_active = true
    AND s.full_name ILIKE '%' || search_term || '%'
    AND (filter_states IS NULL OR s.state = ANY(filter_states))

  ORDER BY is_global ASC, full_name ASC
  LIMIT result_limit;
$$;

-- ════════════════════════════════════════════════════════════
-- RPC: get_rep_states
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_rep_states()
RETURNS text[]
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT f.state ORDER BY f.state),
    ARRAY[]::text[]
  )
  FROM facilities f
  WHERE f.account_id = get_account_id()
    AND f.is_active = true
    AND f.state IS NOT NULL
    AND f.state != '';
$$;

