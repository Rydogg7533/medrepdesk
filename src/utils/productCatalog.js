export const PRODUCT_CATALOG = [
  {
    key: 'orthopedic',
    label: 'Orthopedic',
    products: [
      { value: 'hip', label: 'Hip' },
      { value: 'knee', label: 'Knee' },
      { value: 'shoulder', label: 'Shoulder' },
      { value: 'elbow', label: 'Elbow' },
      { value: 'ankle', label: 'Ankle' },
      { value: 'trauma', label: 'Trauma' },
    ],
  },
  {
    key: 'spine',
    label: 'Spine',
    products: [
      { value: 'cervical_spine', label: 'Cervical Spine' },
      { value: 'lumbar_spine', label: 'Lumbar Spine' },
      { value: 'thoracic_spine', label: 'Thoracic Spine' },
      { value: 'spinal_fusion', label: 'Spinal Fusion' },
      { value: 'disc_replacement', label: 'Disc Replacement' },
      { value: 'spine', label: 'Spine (General)' },
    ],
  },
  {
    key: 'sports_medicine',
    label: 'Sports Medicine',
    products: [
      { value: 'sports_medicine', label: 'Sports Medicine' },
      { value: 'acl_reconstruction', label: 'ACL Reconstruction' },
      { value: 'rotator_cuff', label: 'Rotator Cuff' },
      { value: 'meniscus', label: 'Meniscus' },
      { value: 'arthroscopy', label: 'Arthroscopy' },
    ],
  },
  {
    key: 'cardiovascular',
    label: 'Cardiovascular',
    products: [
      { value: 'cardiac_implants', label: 'Cardiac Implants' },
      { value: 'stents', label: 'Stents' },
      { value: 'heart_valves', label: 'Heart Valves' },
      { value: 'pacemakers', label: 'Pacemakers' },
      { value: 'vascular_grafts', label: 'Vascular Grafts' },
    ],
  },
  {
    key: 'neurology',
    label: 'Neurology / Neuromodulation',
    products: [
      { value: 'deep_brain_stimulation', label: 'Deep Brain Stimulation' },
      { value: 'spinal_cord_stimulation', label: 'Spinal Cord Stimulation' },
      { value: 'neurovascular', label: 'Neurovascular' },
    ],
  },
  {
    key: 'dental',
    label: 'Dental / Oral & Maxillofacial',
    products: [
      { value: 'dental_implants', label: 'Dental Implants' },
      { value: 'maxillofacial', label: 'Maxillofacial' },
    ],
  },
  {
    key: 'ophthalmology',
    label: 'Ophthalmology',
    products: [
      { value: 'intraocular_lenses', label: 'Intraocular Lenses' },
      { value: 'ophthalmic_surgical', label: 'Ophthalmic Surgical' },
    ],
  },
  {
    key: 'ent',
    label: 'ENT (Ear, Nose & Throat)',
    products: [
      { value: 'cochlear_implants', label: 'Cochlear Implants' },
      { value: 'sinus_surgery', label: 'Sinus Surgery' },
      { value: 'ent_instruments', label: 'ENT Instruments' },
    ],
  },
  {
    key: 'general_surgery',
    label: 'General Surgery',
    products: [
      { value: 'hernia_mesh', label: 'Hernia Mesh' },
      { value: 'surgical_stapling', label: 'Surgical Stapling' },
      { value: 'energy_devices', label: 'Energy Devices' },
      { value: 'minimally_invasive', label: 'Minimally Invasive' },
    ],
  },
  {
    key: 'robotics',
    label: 'Robotics & Navigation',
    products: [
      { value: 'surgical_robotics', label: 'Surgical Robotics' },
      { value: 'navigation_systems', label: 'Navigation Systems' },
      { value: 'computer_assisted', label: 'Computer-Assisted Surgery' },
    ],
  },
  {
    key: 'wound_care',
    label: 'Wound Care & Biologics',
    products: [
      { value: 'wound_care', label: 'Wound Care' },
      { value: 'skin_substitutes', label: 'Skin Substitutes' },
      { value: 'bone_grafts', label: 'Bone Grafts' },
      { value: 'biologics', label: 'Biologics' },
    ],
  },
  {
    key: 'urology',
    label: 'Urology',
    products: [
      { value: 'urological_implants', label: 'Urological Implants' },
      { value: 'kidney_stone', label: 'Kidney Stone Management' },
    ],
  },
  {
    key: 'gynecology',
    label: 'Gynecology',
    products: [
      { value: 'gyn_surgical', label: 'GYN Surgical' },
      { value: 'pelvic_floor', label: 'Pelvic Floor' },
    ],
  },
  {
    key: 'plastic_surgery',
    label: 'Plastic & Reconstructive Surgery',
    products: [
      { value: 'breast_implants', label: 'Breast Implants' },
      { value: 'reconstructive', label: 'Reconstructive' },
      { value: 'tissue_expanders', label: 'Tissue Expanders' },
    ],
  },
  {
    key: 'bariatric',
    label: 'Bariatric',
    products: [
      { value: 'bariatric_stapling', label: 'Bariatric Stapling' },
      { value: 'gastric_banding', label: 'Gastric Banding' },
    ],
  },
  {
    key: 'pain_management',
    label: 'Pain Management',
    products: [
      { value: 'intrathecal_pumps', label: 'Intrathecal Pumps' },
      { value: 'peripheral_nerve', label: 'Peripheral Nerve Stimulation' },
      { value: 'radiofrequency_ablation', label: 'Radiofrequency Ablation' },
    ],
  },
  {
    key: 'ancillary',
    label: 'Ancillary & Other',
    products: [
      { value: 'surgical_instruments', label: 'Surgical Instruments' },
      { value: 'sterilization', label: 'Sterilization' },
      { value: 'ppe', label: 'PPE' },
      { value: 'disposables', label: 'Disposables' },
    ],
  },
];

// Flat array of all product value strings
export const ALL_PRODUCT_VALUES = PRODUCT_CATALOG.flatMap((cat) =>
  cat.products.map((p) => p.value)
);

// Lookup maps built once
const _labelMap = new Map();
const _categoryMap = new Map();
PRODUCT_CATALOG.forEach((cat) => {
  cat.products.forEach((p) => {
    _labelMap.set(p.value, p.label);
    _categoryMap.set(p.value, cat.label);
  });
});

/** Returns display label for a product_type value */
export function getProductLabel(value) {
  return _labelMap.get(value) || value;
}

/** Returns category label for a product_type value */
export function getProductCategory(value) {
  return _categoryMap.get(value) || 'Other';
}

/**
 * Groups an array of distributor_product records by their catalog category.
 * Returns [{ label, products }] — only categories that have products.
 */
export function groupProductsByCategory(products) {
  if (!products || products.length === 0) return [];

  const groups = new Map();

  products.forEach((dp) => {
    const catLabel = dp.product_type === 'custom'
      ? 'Custom'
      : getProductCategory(dp.product_type);

    if (!groups.has(catLabel)) {
      groups.set(catLabel, []);
    }
    groups.get(catLabel).push(dp);
  });

  return Array.from(groups.entries()).map(([label, prods]) => ({
    label,
    products: prods,
  }));
}
