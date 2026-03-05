-- Make invoice_number nullable so POs can be created without one
ALTER TABLE purchase_orders ALTER COLUMN invoice_number DROP NOT NULL;
