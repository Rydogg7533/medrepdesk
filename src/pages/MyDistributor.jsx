import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Phone, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDistributor, useCreateDistributor, useUpdateDistributor } from '@/hooks/useDistributors';
import { useAllDistributorProducts, useUpsertDistributorProducts } from '@/hooks/useDistributorProducts';
import { useCreateContact } from '@/hooks/useContacts';
import { useUpdateAccount } from '@/hooks/useAccount';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
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

  const [form, setForm] = useState({
    name: '',
    billing_email: '',
    billing_contact_name: '',
    billing_contact_phone: '',
    address: '',
    phone: '',
  });
  // { [product_value]: { checked: boolean, commission_rate: string } }
  const [checkedProducts, setCheckedProducts] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing distributor data
  useEffect(() => {
    if (distributor) {
      setForm({
        name: distributor.name || '',
        billing_email: distributor.billing_email || '',
        billing_contact_name: distributor.billing_contact_name || '',
        billing_contact_phone: distributor.billing_contact_phone || '',
        address: distributor.address || '',
        phone: distributor.phone || '',
      });
    }
  }, [distributor]);

  // Load existing product rates
  useEffect(() => {
    if (existingProducts.length > 0) {
      const checked = {};
      const custom = [];
      const expanded = new Set();

      existingProducts.forEach((p) => {
        if (p.product_type === 'custom') {
          custom.push({ custom_name: p.custom_name || '', commission_rate: p.commission_rate?.toString() || '' });
        } else if (p.is_active) {
          checked[p.product_type] = { checked: true, commission_rate: p.commission_rate?.toString() || '' };
          // Auto-expand categories with checked products
          const cat = PRODUCT_CATALOG.find((c) => c.products.some((pr) => pr.value === p.product_type));
          if (cat) expanded.add(cat.key);
        }
      });

      setCheckedProducts(checked);
      setCustomProducts(custom);
      setExpandedCategories(expanded);
    }
  }, [existingProducts]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleCategory(key) {
    setExpandedCategories((prev) => {
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
  }

  function setProductRate(value, rate) {
    setCheckedProducts((prev) => ({
      ...prev,
      [value]: { ...prev[value], commission_rate: rate },
    }));
  }

  function getCategoryCheckedCount(cat) {
    return cat.products.filter((p) => checkedProducts[p.value]?.checked).length;
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
    setSaving(true);
    try {
      await updateDistributor.mutateAsync({
        id: distributorId,
        name: form.name,
        billing_email: form.billing_email || null,
        billing_contact_name: form.billing_contact_name || null,
        billing_contact_phone: form.billing_contact_phone || null,
        address: form.address || null,
        phone: form.phone || null,
      });

      // Build products array
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

      await upsertProducts.mutateAsync({ distributorId, products });
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
        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Product & Commission Settings</h2>
          <div className="space-y-1">
            {PRODUCT_CATALOG.map((cat) => {
              const isExpanded = expandedCategories.has(cat.key);
              const checkedCount = getCategoryCheckedCount(cat);

              return (
                <div key={cat.key}>
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.key)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                    {checkedCount > 0 && (
                      <span className="rounded-full bg-brand-800/10 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-400/20 dark:text-brand-400">
                        {checkedCount}
                      </span>
                    )}
                  </button>

                  {/* Products in category */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1 pb-2">
                      {cat.products.map((product) => {
                        const isChecked = checkedProducts[product.value]?.checked;
                        return (
                          <div key={product.value} className="flex items-center gap-3 py-1">
                            <label className="flex flex-1 items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!isChecked}
                                onChange={() => toggleProduct(product.value)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-800 focus:ring-brand-800"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{product.label}</span>
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
                                  className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-right dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                                />
                                <span className="text-sm text-gray-400">%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Products */}
          <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Products</span>
              <button
                type="button"
                onClick={() => setCustomProducts((prev) => [...prev, { custom_name: '', commission_rate: '' }])}
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
        </Card>

        <Button type="submit" fullWidth loading={saving}>Save Changes</Button>
      </form>
    </div>
  );
}
