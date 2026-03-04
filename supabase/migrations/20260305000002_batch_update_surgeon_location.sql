-- Batch update RPC for backfilling surgeon city/state from NPI data.
-- Takes a JSONB object keyed by surgeon UUID: { "uuid": { "city": "...", "state": "..." }, ... }
-- Returns the number of rows updated.

CREATE OR REPLACE FUNCTION batch_update_surgeon_location(updates jsonb)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  updated_count int := 0;
BEGIN
  UPDATE surgeons s
  SET city  = (u.value->>'city'),
      state = (u.value->>'state')
  FROM jsonb_each(updates) u
  WHERE s.id = (u.key)::uuid;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
