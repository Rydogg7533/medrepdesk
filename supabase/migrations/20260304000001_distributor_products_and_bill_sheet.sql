-- ============================================================
-- DISTRIBUTOR PRODUCTS & BILL SHEET ITEMS
-- ============================================================

-- Add primary_distributor_id to accounts
ALTER TABLE accounts ADD COLUMN primary_distributor_id uuid REFERENCES distributors(id);

-- ============================================================
-- DISTRIBUTOR PRODUCTS
-- Product types with commission rates per distributor
-- ============================================================
CREATE TABLE distributor_products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  distributor_id    uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  product_type      text NOT NULL CHECK (product_type IN (
                      'hip', 'knee', 'shoulder', 'elbow', 'ankle',
                      'spine', 'sports_medicine', 'ancillary'
                    )),
  custom_name       text,  -- for ancillary only
  commission_rate   numeric(5,2),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: one row per (distributor, product_type) except ancillary
CREATE UNIQUE INDEX idx_dist_products_unique
  ON distributor_products(distributor_id, product_type)
  WHERE product_type != 'ancillary';

CREATE INDEX idx_dist_products_distributor ON distributor_products(distributor_id);

-- RLS
ALTER TABLE distributor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dist_products_select" ON distributor_products
  FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "dist_products_insert" ON distributor_products
  FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "dist_products_update" ON distributor_products
  FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "dist_products_delete" ON distributor_products
  FOR DELETE USING (account_id = get_account_id());

-- ============================================================
-- BILL SHEET ITEMS
-- Line items for bill sheets
-- ============================================================
CREATE TABLE bill_sheet_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id               uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  distributor_product_id uuid REFERENCES distributor_products(id),
  manufacturer_id       uuid NOT NULL REFERENCES manufacturers(id),
  product_type          text,
  product_description   text,
  quantity              integer NOT NULL DEFAULT 1,
  unit_price            numeric(10,2),
  total                 numeric(10,2),
  commission_rate       numeric(5,2),
  commission_amount     numeric(10,2),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_sheet_items_case ON bill_sheet_items(case_id);

-- RLS
ALTER TABLE bill_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_items_select" ON bill_sheet_items
  FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "bill_items_insert" ON bill_sheet_items
  FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "bill_items_update" ON bill_sheet_items
  FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "bill_items_delete" ON bill_sheet_items
  FOR DELETE USING (account_id = get_account_id());
