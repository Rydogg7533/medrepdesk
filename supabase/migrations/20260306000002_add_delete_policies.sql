-- Add missing DELETE policies for facilities and surgeons
DROP POLICY IF EXISTS "facilities_delete" ON facilities;
CREATE POLICY "facilities_delete" ON facilities FOR DELETE USING (account_id = get_account_id() AND is_global = false AND get_user_role() = 'owner');
DROP POLICY IF EXISTS "surgeons_delete" ON surgeons;
CREATE POLICY "surgeons_delete" ON surgeons FOR DELETE USING (account_id = get_account_id() AND is_global = false AND get_user_role() = 'owner');
