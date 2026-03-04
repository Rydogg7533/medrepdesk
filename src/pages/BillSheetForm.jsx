import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCase, useUpdateCase } from '@/hooks/useCases';
import { useDistributorProducts } from '@/hooks/useDistributorProducts';
import { useManufacturers } from '@/hooks/useManufacturers';
import { useCreateBillSheetItems } from '@/hooks/useBillSheetItems';
import { useCreateCommission } from '@/hooks/useCommissions';
import { useCreateChaseEntry } from '@/hooks/useChaseLog';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { formatCurrency } from '@/utils/formatters';
import { groupProductsByCategory, getProductLabel } from '@/utils/productCatalog';

const emptyItem = () => ({
  distributor_product_id: '',
  product_type: '',
  manufacturer_id: '',
  product_description: '',
  quantity: 1,
  unit_price: '',
  commission_rate: '',
});

export default function BillSheetForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');
  const { account } = useAuth();
  const distributorId = account?.primary_distributor_id;

  const { data: caseData } = useCase(caseId);
  const { data: distProducts = [] } = useDistributorProducts(distributorId);
  const { data: manufacturers = [] } = useManufacturers({ activeOnly: true });

  const createBillSheetItems = useCreateBillSheetItems();
  const updateCase = useUpdateCase();
  const createCommission = useCreateCommission();
  const createChase = useCreateChaseEntry();

  const [items, setItems] = useState([emptyItem()]);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const groupedProducts = groupProductsByCategory(distProducts);

  const manufacturerOptions = manufacturers.map((m) => ({ value: m.id, label: m.name }));

  function updateItem(index, field, value) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-fill commission rate when product selected
      if (field === 'distributor_product_id') {
        const product = distProducts.find((p) => p.id === value);
        if (product) {
          updated[index].product_type = product.product_type;
          updated[index].commission_rate = product.commission_rate?.toString() || '';
        }
      }

      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function calcTotal(item) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return qty * price;
  }

  function calcCommission(item) {
    const total = calcTotal(item);
    const rate = Number(item.commission_rate) || 0;
    return (total * rate) / 100;
  }

  const totalCaseValue = items.reduce((sum, item) => sum + calcTotal(item), 0);
  const totalCommission = items.reduce((sum, item) => sum + calcCommission(item), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    // Validate
    const validItems = items.filter((item) => item.manufacturer_id && Number(item.unit_price) > 0);
    if (validItems.length === 0) {
      setServerError('Add at least one line item with a manufacturer and unit price.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert bill sheet items
      const itemsToInsert = validItems.map((item) => ({
        case_id: caseId,
        distributor_product_id: item.distributor_product_id || null,
        manufacturer_id: item.manufacturer_id,
        product_type: item.product_type || null,
        product_description: item.product_description || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price),
        total: calcTotal(item),
        commission_rate: Number(item.commission_rate) || null,
        commission_amount: calcCommission(item) || null,
      }));

      await createBillSheetItems.mutateAsync(itemsToInsert);

      // 2. Update case value
      await updateCase.mutateAsync({ id: caseId, case_value: totalCaseValue, status: 'bill_sheet_submitted' });

      // 3. Create commission record
      if (totalCommission > 0) {
        await createCommission.mutateAsync({
          case_id: caseId,
          distributor_id: distributorId || caseData?.distributor_id,
          commission_type: 'percentage',
          case_value: totalCaseValue,
          expected_amount: totalCommission,
        });
      }

      // 4. Create chase log entry
      await createChase.mutateAsync({
        case_id: caseId,
        chase_type: 'bill_sheet_submitted',
        facility_id: caseData?.facility_id,
      });

      // 5. Navigate to PO form
      navigate(`/po/new?caseId=${caseId}`, { replace: true });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  }

  if (!caseId) {
    return <div className="p-4 text-center text-gray-500">No case specified</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bill Sheet</h1>
          {caseData && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{caseData.case_number}</p>
          )}
        </div>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{serverError}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Item {index + 1}</h3>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {/* Product Type */}
                {groupedProducts.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product Type</label>
                    <select
                      value={item.distributor_product_id}
                      onChange={(e) => updateItem(index, 'distributor_product_id', e.target.value)}
                      className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                    >
                      <option value="">Select product</option>
                      {groupedProducts.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.products.map((dp) => (
                            <option key={dp.id} value={dp.id}>
                              {dp.product_type === 'custom' ? dp.custom_name : getProductLabel(dp.product_type)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}

                {/* Manufacturer */}
                <SearchableSelect
                  label="Manufacturer *"
                  options={manufacturerOptions}
                  value={item.manufacturer_id}
                  onChange={(v) => updateItem(index, 'manufacturer_id', v)}
                  placeholder="Select manufacturer"
                  onAddNew={() => navigate('/manufacturers/new')}
                  allRecords={manufacturers}
                  allRecordsNameField="name"
                />

                {/* Product Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product Description</label>
                  <input
                    type="text"
                    value={item.product_description}
                    onChange={(e) => updateItem(index, 'product_description', e.target.value)}
                    placeholder="e.g. Femoral stem, acetabular cup"
                    className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                  />
                </div>

                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      placeholder="0.00"
                      className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                </div>

                {/* Commission Rate & Calculated Values */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Commission %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.commission_rate}
                      onChange={(e) => updateItem(index, 'commission_rate', e.target.value)}
                      placeholder="0.00"
                      className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                    <div className="flex min-h-touch items-center rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(calcTotal(item))}
                    </div>
                  </div>
                </div>

                {/* Commission amount display */}
                {calcCommission(item) > 0 && (
                  <div className="flex justify-between rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm">
                    <span className="text-green-700 dark:text-green-400">Commission</span>
                    <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(calcCommission(item))}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Add Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800"
          >
            <Plus className="h-4 w-4" /> Add Line Item
          </button>

          {/* Summary */}
          <Card>
            <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Case Value</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalCaseValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Commission</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalCommission)}</span>
              </div>
            </div>
          </Card>

          {/* Submit */}
          <Button type="submit" fullWidth loading={submitting}>
            Submit Bill Sheet
          </Button>
        </div>
      </form>
    </div>
  );
}
