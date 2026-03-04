import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Phone, ChevronDown, ChevronRight, Trash2, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDistributor, useCreateDistributor, useUpdateDistributor } from '@/hooks/useDistributors';
import { useAllDistributorProducts, useUpsertDistributorProducts } from '@/hooks/useDistributorProducts';
import { useCreateContact } from '@/hooks/useContacts';
import { useUpdateAccount } from '@/hooks/useAccount';
import { useEnsurePayPeriods } from '@/hooks/usePayPeriods';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import BottomSheet from '@/components/ui/BottomSheet';
import { PRODUCT_CATALOG } from '@/utils/productCatalog';

export default function MyDistributor() {
  const navigate = useNavigate();
  const { account } = useAuth();
  const distributorId = account?.primary_distributor_id;

  const { data: distributor, isLoading: distLoading } = useDistributor(distributorId);
  const { data: existingProducts = [], isLoading: productsLoading } = useAllDistributorProducts(distributorId);

  const createDistributor = useCreateDistributor();
  const updateDistributor = useUpdateDistributor();
  const updateAccount = useUpdateAccount();
  const createContact = useCreateContact();
  const upsertProducts = useUpsertDistributorProducts();
  const ensurePayPeriods = useEnsurePayPeriods(distributorId, distributor?.pay_schedule);

  const [form, setForm] = useState({
    name: '',
    billing_email: '',
    billing_contact_name: '',
    billing_contact_phone: '',
    address: '',
    phone: '',
    pay_frequency: '',
    pay_day: '',
    first_pay_date: '',
    commission_lag: '',
  });
  // Which category keys the rep has added
  const [addedGroups, setAddedGroups] = useState([]);
  // { [product_value]: { checked: boolean, commission_rate: string } }
  const [checkedProducts, setCheckedProducts] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [lockedGroups, setLockedGroups] = useState(new Set());
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing distributor data
  useEffect(() => {
    if (distributor) {
      const ps = distributor.pay_schedule || {};
      setForm({
        name: distributor.name || '',
        billing_email: distributor.billing_email || '',
        billing_contact_name: distributor.billing_contact_name || '',
        billing_contact_phone: distributor.billing_contact_phone || '',
        address: distributor.address || '',
        phone: distributor.phone || '',
        pay_frequency: ps.frequency || '',
        pay_day: ps.pay_day != null ? String(ps.pay_day) : '',
        first_pay_date: ps.first_pay_date || '',
        commission_lag: ps.commission_lag || '',
      });
    }
  }, [distributor]);

  // Load existing product rates — reconstruct groups from saved products
  useEffect(() => {
    if (existingProducts.length > 0) {
      const checked = {};
      const custom = [];
      const groupKeys = new Set();
      const expanded = new Set();

      existingProducts.forEach((p) => {
        if (p.product_type === 'custom') {
          custom.push({ custom_name: p.custom_name || '', commission_rate: p.commission_rate?.toString() || '' });
        } else if (p.is_active) {
          checked[p.product_type] = { checked: true, commission_rate: p.commission_rate?.toString() || '' };
          const cat = PRODUCT_CATALOG.find((c) => c.products.some((pr) => pr.value === p.product_type));
          if (cat) {
            groupKeys.add(cat.key);
            expanded.add(cat.key);
          }
        }
      });

      setCheckedProducts(checked);
      setCustomProducts(custom);
      setAddedGroups(Array.from(groupKeys));
      setExpandedGroups(expanded);
      setLockedGroups(new Set(groupKeys));
    }
  }, [existingProducts]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addGroup(catKey) {
    setAddedGroups((prev) => [...prev, catKey]);
    setExpandedGroups((prev) => new Set(prev).add(catKey));
    setShowGroupPicker(false);
  }

  function toggleGroupLock(key) {
    setLockedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function removeGroup(catKey) {
    setAddedGroups((prev) => prev.filter((k) => k !== catKey));
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.delete(catKey);
      return next;
    });
    // Uncheck all products in this group
    const cat = PRODUCT_CATALOG.find((c) => c.key === catKey);
    if (cat) {
      setCheckedProducts((prev) => {
        const next = { ...prev };
        cat.products.forEach((p) => delete next[p.value]);
        return next;
      });
    }
  }

  function toggleGroupExpand(key) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleProduct(value) {
    setCheckedProducts((prev) => {
      const existing = prev[value];
      if (existing?.checked) {
        const next = { ...prev };
        delete next[value];
        return next;
      }
      return { ...prev, [value]: { checked: true, commission_rate: '' } };
    });
    setValidationError('');
  }

  function setProductRate(value, rate) {
    setCheckedProducts((prev) => ({
      ...prev,
      [value]: { ...prev[value], commission_rate: rate },
    }));
    setValidationError('');
  }

  function getCategoryCheckedCount(cat) {
    return cat.products.filter((p) => checkedProducts[p.value]?.checked).length;
  }

  const availableGroups = PRODUCT_CATALOG.filter((cat) => !addedGroups.includes(cat.key));

  function buildProductsArray() {
    const products = [];
    Object.entries(checkedProducts).forEach(([productType, data]) => {
      if (data.checked && data.commission_rate !== '' && data.commission_rate != null) {
        products.push({ product_type: productType, commission_rate: data.commission_rate });
      }
    });
    customProducts.forEach((a) => {
      if (a.commission_rate !== '' && a.custom_name.trim()) {
        products.push({ product_type: 'custom', custom_name: a.custom_name, commission_rate: a.commission_rate });
      }
    });
    return products;
  }

  function validate() {
    const products = buildProductsArray();
    if (products.length === 0) {
      setValidationError('Add at least one product group with a commission rate to save.');
      return false;
    }
    setValidationError('');
    return true;
  }

  async function handleSetup(e) {
    e.preventDefault();
    setServerError('');
    setSaving(true);
    try {
      const dist = await createDistributor.mutateAsync({
        name: form.name,
        billing_email: form.billing_email || null,
        billing_contact_name: form.billing_contact_name || null,
        billing_contact_phone: form.billing_contact_phone || null,
        address: form.address || null,
        phone: form.phone || null,
      });

      await updateAccount.mutateAsync({ primary_distributor_id: dist.id });

      if (form.billing_contact_name) {
        await createContact.mutateAsync({
          full_name: form.billing_contact_name,
          contact_type: 'distributor',
          distributor_id: dist.id,
          phone: form.billing_contact_phone || null,
          email: form.billing_email || null,
          role: 'Billing Contact',
        });
      }
    } catch (err) {
      setServerError(err.message);
      setSaving(false);
    }
  }

  async function handleSaveDistributor(e) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const paySchedule = form.pay_frequency
        ? {
            frequency: form.pay_frequency,
            pay_day: form.pay_day || null,
            first_pay_date: form.first_pay_date || null,
            commission_lag: form.commission_lag || null,
          }
        : null;

      await updateDistributor.mutateAsync({
        id: distributorId,
        name: form.name,
        billing_email: form.billing_email || null,
        billing_contact_name: form.billing_contact_name || null,
        billing_contact_phone: form.billing_contact_phone || null,
        address: form.address || null,
        phone: form.phone || null,
        pay_schedule: paySchedule,
      });

      await upsertProducts.mutateAsync({ distributorId, products: buildProductsArray() });

      // Auto-generate pay periods if schedule is configured
      if (paySchedule?.frequency && paySchedule?.first_pay_date) {
        await ensurePayPeriods.mutateAsync(paySchedule);
      }

      setSaving(false);
    } catch (err) {
      setServerError(err.message);
      setSaving(false);
    }
  }

  if (distributorId && (distLoading || productsLoading)) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  // Setup form (no distributor yet)
  if (!distributorId) {
    return (
      <div className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="min-h-touch p-1">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Set Up My Distributor</h1>
        </div>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{serverError}</div>
        )}

        <Card>
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <Input label="Distributor Name *" name="name" value={form.name} onChange={onChange} required />
            <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="Main phone number" />
            <Input label="Address" name="address" value={form.address} onChange={onChange} placeholder="Street, City, State ZIP" />
            <Input label="Billing Email" name="billing_email" type="email" value={form.billing_email} onChange={onChange} placeholder="For PO forwarding" />
            <Input label="Billing Contact Name" name="billing_contact_name" value={form.billing_contact_name} onChange={onChange} />
            <Input label="Billing Contact Phone" name="billing_contact_phone" type="tel" value={form.billing_contact_phone} onChange={onChange} />

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={saving}>Save</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // Edit form (distributor exists)
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Distributor</h1>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{serverError}</div>
      )}

      {/* Call Distributor */}
      {form.phone && (
        <a
          href={`tel:${form.phone}`}
          className="mb-4 flex min-h-touch items-center justify-center gap-2 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white active:bg-brand-900"
        >
          <Phone className="h-5 w-5" />
          Call Distributor
        </a>
      )}

      <form onSubmit={handleSaveDistributor} className="space-y-4">
        {/* Distributor Info */}
        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Distributor Info</h2>
          <div className="flex flex-col gap-4">
            <Input label="Distributor Name *" name="name" value={form.name} onChange={onChange} required />
            <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="Main phone number" />
            <Input label="Address" name="address" value={form.address} onChange={onChange} placeholder="Street, City, State ZIP" />
          </div>
        </Card>

        {/* Billing & PO Forwarding */}
        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Billing & PO Forwarding</h2>
          <div className="flex flex-col gap-4">
            <Input label="Billing Email" name="billing_email" type="email" value={form.billing_email} onChange={onChange} placeholder="POs will be forwarded here" />
            {form.billing_email && (
              <p className="text-xs text-gray-400 dark:text-gray-500">POs will be emailed to this address when forwarded.</p>
            )}
            <Input label="Billing Contact Name" name="billing_contact_name" value={form.billing_contact_name} onChange={onChange} />
            <Input label="Billing Contact Phone" name="billing_contact_phone" type="tel" value={form.billing_contact_phone} onChange={onChange} />
          </div>
        </Card>

        {/* Product & Commission Settings */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Product & Commission Settings</h2>

          {validationError && (
            <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{validationError}</div>
          )}

          {/* Added group cards */}
          {addedGroups.length === 0 && customProducts.length === 0 && (
            <div className="mb-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No product groups added yet</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Add a product group to set commission rates</p>
            </div>
          )}

          <div className="space-y-3">
            {addedGroups.map((catKey) => {
              const cat = PRODUCT_CATALOG.find((c) => c.key === catKey);
              if (!cat) return null;
              const isExpanded = expandedGroups.has(catKey);
              const isLocked = lockedGroups.has(catKey);
              const checkedCount = getCategoryCheckedCount(cat);

              return (
                <Card key={catKey}>
                  {/* Group header */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(catKey)}
                      className="flex flex-1 items-center gap-2 py-0.5 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({checkedCount} product{checkedCount !== 1 ? 's' : ''})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGroup(catKey)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="Remove group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Products */}
                  {isExpanded && (
                    <div className="mt-3 space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {cat.products.map((product) => {
                        const isChecked = checkedProducts[product.value]?.checked;
                        return (
                          <div key={product.value} className="flex items-center gap-3 py-1">
                            <label className={`flex flex-1 items-center gap-2 ${isLocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={!!isChecked}
                                onChange={() => toggleProduct(product.value)}
                                disabled={isLocked}
                                className="h-4 w-4 rounded border-gray-300 text-brand-800 focus:ring-brand-800 disabled:opacity-50"
                              />
                              <span className={`text-sm ${isChecked ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                {product.label}
                              </span>
                            </label>
                            {isChecked && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="0.00"
                                  value={checkedProducts[product.value]?.commission_rate || ''}
                                  onChange={(e) => setProductRate(product.value, e.target.value)}
                                  disabled={isLocked}
                                  className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-right dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                                />
                                <span className="text-sm text-gray-400">%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Lock/Unlock toggle */}
                      <button
                        type="button"
                        onClick={() => toggleGroupLock(catKey)}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700"
                      >
                        {isLocked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            Unlocked
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Add Product Group button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowGroupPicker(true)}
              disabled={availableGroups.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> Add Product Group
            </button>
          </div>

          {/* Product Group Picker Bottom Sheet */}
          <BottomSheet isOpen={showGroupPicker} onClose={() => setShowGroupPicker(false)} title="Add Product Group">
            <div className="space-y-1">
              {availableGroups.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => addGroup(cat.key)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
                >
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{cat.products.length} products</span>
                </button>
              ))}
              {availableGroups.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">All product groups have been added</p>
              )}
            </div>
          </BottomSheet>

          {/* Custom Products */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Products</span>
              <button
                type="button"
                onClick={() => { setCustomProducts((prev) => [...prev, { custom_name: '', commission_rate: '' }]); setValidationError(''); }}
                className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {customProducts.map((a, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Product name"
                  value={a.custom_name}
                  onChange={(e) => {
                    const updated = [...customProducts];
                    updated[i] = { ...updated[i], custom_name: e.target.value };
                    setCustomProducts(updated);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={a.commission_rate}
                    onChange={(e) => {
                      const updated = [...customProducts];
                      updated[i] = { ...updated[i], commission_rate: e.target.value };
                      setCustomProducts(updated);
                    }}
                    className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2 text-sm text-right dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomProducts((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {customProducts.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">No custom products added</p>
            )}
          </div>
        </div>

        {/* Pay Schedule */}
        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Pay Schedule</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Frequency</label>
              <select
                name="pay_frequency"
                value={form.pay_frequency}
                onChange={onChange}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              >
                <option value="">Not set</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="semi-monthly">Semi-Monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {(form.pay_frequency === 'weekly' || form.pay_frequency === 'bi-weekly') && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Day</label>
                <select
                  name="pay_day"
                  value={form.pay_day}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                >
                  <option value="">Select day</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                </select>
              </div>
            )}

            {form.pay_frequency === 'semi-monthly' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Day</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">1st & 15th of each month</p>
              </div>
            )}

            {form.pay_frequency === 'monthly' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Day (Day of Month)</label>
                <select
                  name="pay_day"
                  value={form.pay_day}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                >
                  <option value="">Select day</option>
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            )}

            {form.pay_frequency && (
              <>
                <Input
                  label="First Pay Date"
                  name="first_pay_date"
                  type="date"
                  value={form.first_pay_date}
                  onChange={onChange}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Commission Lag</label>
                  <select
                    name="commission_lag"
                    value={form.commission_lag}
                    onChange={onChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                  >
                    <option value="">Not set</option>
                    <option value="current">Current Period</option>
                    <option value="1_period">1 Period Behind</option>
                    <option value="2_periods">2 Periods Behind</option>
                    <option value="30_days">30 Days</option>
                    <option value="60_days">60 Days</option>
                    <option value="90_days">90 Days</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </Card>

        <Button type="submit" fullWidth loading={saving}>Save Changes</Button>
      </form>
    </div>
  );
}
