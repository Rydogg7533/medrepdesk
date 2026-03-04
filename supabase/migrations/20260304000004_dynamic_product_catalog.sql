-- ============================================================
-- Migration: Dynamic Product Catalog
-- Expands distributor_products and cases to support full product catalog
-- ============================================================

-- 1. DISTRIBUTOR_PRODUCTS: Drop old CHECK, add new one with all product values + 'custom'
ALTER TABLE distributor_products DROP CONSTRAINT IF EXISTS distributor_products_product_type_check;

ALTER TABLE distributor_products ADD CONSTRAINT distributor_products_product_type_check
  CHECK (product_type IN (
    -- Orthopedic
    'hip', 'knee', 'shoulder', 'elbow', 'ankle', 'trauma',
    -- Spine
    'cervical_spine', 'lumbar_spine', 'thoracic_spine', 'spinal_fusion', 'disc_replacement', 'spine',
    -- Sports Medicine
    'sports_medicine', 'acl_reconstruction', 'rotator_cuff', 'meniscus', 'arthroscopy',
    -- Cardiovascular
    'cardiac_implants', 'stents', 'heart_valves', 'pacemakers', 'vascular_grafts',
    -- Neurology
    'deep_brain_stimulation', 'spinal_cord_stimulation', 'neurovascular',
    -- Dental
    'dental_implants', 'maxillofacial',
    -- Ophthalmology
    'intraocular_lenses', 'ophthalmic_surgical',
    -- ENT
    'cochlear_implants', 'sinus_surgery', 'ent_instruments',
    -- General Surgery
    'hernia_mesh', 'surgical_stapling', 'energy_devices', 'minimally_invasive',
    -- Robotics
    'surgical_robotics', 'navigation_systems', 'computer_assisted',
    -- Wound Care & Biologics
    'wound_care', 'skin_substitutes', 'bone_grafts', 'biologics',
    -- Urology
    'urological_implants', 'kidney_stone',
    -- Gynecology
    'gyn_surgical', 'pelvic_floor',
    -- Plastic Surgery
    'breast_implants', 'reconstructive', 'tissue_expanders',
    -- Bariatric
    'bariatric_stapling', 'gastric_banding',
    -- Pain Management
    'intrathecal_pumps', 'peripheral_nerve', 'radiofrequency_ablation',
    -- Ancillary & Other
    'surgical_instruments', 'sterilization', 'ppe', 'disposables',
    -- Custom (replaces 'ancillary')
    'custom'
  ));

-- 2. Migrate existing 'ancillary' rows to 'custom'
UPDATE distributor_products SET product_type = 'custom' WHERE product_type = 'ancillary';

-- 3. Drop old partial unique index and recreate with 'custom' instead of 'ancillary'
DROP INDEX IF EXISTS idx_dist_products_unique;

CREATE UNIQUE INDEX idx_dist_products_unique
  ON distributor_products(account_id, distributor_id, product_type)
  WHERE product_type != 'custom';

-- 4. CASES: Remove CHECK on procedure_type (now dynamic from distributor_products)
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_procedure_type_check;
