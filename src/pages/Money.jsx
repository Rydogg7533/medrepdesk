import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, Calendar, ChevronRight, ClipboardList, Phone, Mail, MessageSquare, Send } from 'lucide-react';
import clsx from 'clsx';
import { usePOs, useCreatePO } from '@/hooks/usePOs';
import { useCommissions } from '@/hooks/useCommissions';
import { usePayPeriods, useEnsurePayPeriods } from '@/hooks/usePayPeriods';
import { useBillSheets } from '@/hooks/useBillSheets';
import { useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useSendPOEmail } from '@/hooks/usePOEmail';
import { useAuth } from '@/context/AuthContext';
import { useDistributor } from '@/hooks/useDistributors';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import BottomSheet from '@/components/ui/BottomSheet';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';

const tabs = [
  { key: 'bill_sheets', label: 'Bill Sheets' },
  { key: 'pos', label: 'POs' },
  { key: 'commissions', label: 'Commissions' },
  { key: 'pay_periods', label: 'Pay' },
];

const PO_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
  { key: 'paid', label: 'Paid' },
  { key: 'disputed', label: 'Disputed' },
];

const COMM_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'received', label: 'Received' },
  { key: 'disputed', label: 'Disputed' },
];

export default function Money() {
  const [activeTab, setActiveTab] = useState('bill_sheets');
  const [poFilter, setPOFilter] = useState('all');
  const [commFilter, setCommFilter] = useState('all');
  const [billSheetView, setBillSheetView] = useState('active');
  const [chaseTarget, setChaseTarget] = useState(null); // bill sheet object for chase bottom sheet
  const [recordTarget, setRecordTarget] = useState(null); // bill sheet object for record PO bottom sheet
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [createdPO, setCreatedPO] = useState(null);
  const [sendDistributor, setSendDistributor] = useState(null);
  const [poForm, setPOForm] = useState({
    po_number: '',
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
  });
  const navigate = useNavigate();
  const toast = useToast();

  const { account } = useAuth();
  const distributorId = account?.primary_distributor_id;
  const { data: distributor } = useDistributor(distributorId);
  const paySchedule = distributor?.pay_schedule;

  const { data: allBillSheets = [], isLoading: billSheetsLoading } = useBillSheets();
  const { data: allPOs = [], isLoading: posLoading } = usePOs();
  const { data: allCommissions = [], isLoading: commsLoading } = useCommissions();
  const { data: allPayPeriods = [], isLoading: periodsLoading } = usePayPeriods(distributorId);
  const ensurePayPeriods = useEnsurePayPeriods(distributorId, paySchedule);
  const createPO = useCreatePO();
  const createChase = useCreateChaseEntry();
  const sendPOEmail = useSendPOEmail();

  // Auto-generate missing pay periods on mount when schedule is configured
  useEffect(() => {
    if (paySchedule?.frequency && paySchedule?.first_pay_date && distributorId) {
      ensurePayPeriods.mutate();
    }
  }, [paySchedule?.frequency, paySchedule?.first_pay_date, distributorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPOs = poFilter === 'all' ? allPOs : allPOs.filter((p) => p.status === poFilter);
  const filteredComms = commFilter === 'all' ? allCommissions : allCommissions.filter((c) => c.status === commFilter);

  // PO summary
  const outstandingPOs = allPOs.filter((p) => !['paid', 'disputed'].includes(p.status));
  const totalOutstanding = outstandingPOs.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Commission summary
  const pendingComms = allCommissions.filter((c) => c.status === 'pending');
  const totalPending = pendingComms.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear().toString();
  const receivedThisMonth = allCommissions
    .filter((c) => c.status === 'received' && c.received_date?.startsWith(thisMonth))
    .reduce((sum, c) => sum + (c.received_amount || 0), 0);
  const receivedYTD = allCommissions
    .filter((c) => c.status === 'received' && c.received_date?.startsWith(thisYear))
    .reduce((sum, c) => sum + (c.received_amount || 0), 0);

  // Chase quick action — call/email/text facility and log chase entry
  async function handleChaseAction(actionType) {
    if (!chaseTarget) return;
    const phone = chaseTarget.facilityPhone;
    const email = chaseTarget.facilityEmail;

    if (actionType === 'call' && phone) {
      window.location.href = `tel:${phone}`;
    } else if (actionType === 'email' && email) {
      window.location.href = `mailto:${email}`;
    } else if (actionType === 'text' && phone) {
      window.location.href = `sms:${phone}`;
    }

    await createChase.mutateAsync({
      case_id: chaseTarget.caseId,
      facility_id: chaseTarget.facilityId,
      chase_type: actionType === 'call' ? 'follow_up_call' : actionType === 'email' ? 'follow_up_email' : 'follow_up_text',
      action_taken: actionType,
    });
    setChaseTarget(null);
    toast({ message: 'Follow-up logged', type: 'success' });
  }

  // Record PO received inline
  async function handleRecordPO(e) {
    e.preventDefault();
    if (!recordTarget || !poForm.po_number.trim() || !poForm.amount) return;

    try {
      const po = await createPO.mutateAsync({
        case_id: recordTarget.caseId,
        po_number: poForm.po_number.trim(),
        amount: Number(poForm.amount),
        received_date: poForm.received_date || new Date().toISOString().split('T')[0],
        status: 'received',
        facility_id: recordTarget.facilityId || null,
        distributor_id: recordTarget.distributorId || null,
      });

      await createChase.mutateAsync({
        case_id: recordTarget.caseId,
        po_id: po.id,
        chase_type: 'po_received',
        facility_id: recordTarget.facilityId || null,
      });

      setCreatedPO(po);
      const dist = recordTarget.distributor;
      setRecordTarget(null);
      setPOForm({ po_number: '', amount: '', received_date: new Date().toISOString().split('T')[0] });

      if (dist?.billing_email) {
        setSendDistributor(dist);
        setShowSendPrompt(true);
      } else {
        toast({ message: 'PO recorded successfully', type: 'success' });
      }
    } catch (err) {
      toast({ message: err.message || 'Failed to record PO', type: 'error' });
    }
  }

  async function handleSendToDistributor() {
    if (!createdPO || !sendDistributor) return;
    try {
      await sendPOEmail.mutateAsync({
        po: { ...createdPO, distributor: sendDistributor },
        caseData: { case_number: createdPO.case_number },
      });
      setShowSendPrompt(false);
      toast({ message: 'PO sent to distributor', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to send email', type: 'error' });
    }
  }

  function handleSkipSend() {
    setShowSendPrompt(false);
    toast({ message: 'PO recorded successfully', type: 'success' });
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Money<InfoTooltip text="Purchase orders track the billing lifecycle after a case is completed. Chase POs until received, then track payment." /></h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'shrink-0 flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-brand-800 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pos' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                {outstandingPOs.length} PO{outstandingPOs.length !== 1 ? 's' : ''}
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {PO_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPOFilter(f.key)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  poFilter === f.key ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {posLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Purchase Orders"
              description="POs will appear here as you create them"
              actionLabel="Add PO"
              onAction={() => navigate('/po/new')}
            />
          ) : (
            <div className="space-y-2">
              {filteredPOs.map((po) => (
                  <Card
                    key={po.id}
                    className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                    onClick={() => navigate(`/po/${po.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {po.case?.case_number || 'No case'}
                          {po.po_number && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">· PO: {po.po_number}</span>}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(po.amount)}
                          </span>
                          {po.facility?.name && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{po.facility.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      </div>
                    </div>
                  </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'commissions' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending<InfoTooltip text="Commissions awaiting PO payment from distributors." /></p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalPending)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">This Month<InfoTooltip text="Commission payments received this calendar month." /></p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(receivedThisMonth)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">YTD<InfoTooltip text="Total commissions received year-to-date." /></p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(receivedYTD)}</p>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {COMM_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCommFilter(f.key)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  commFilter === f.key ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {commsLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredComms.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No Commissions"
              description="Commissions will appear as you add them to cases"
              actionLabel="Add Commission"
              onAction={() => navigate('/commissions/new')}
            />
          ) : (
            <div className="space-y-2">
              {filteredComms.map((comm) => (
                <Card
                  key={comm.id}
                  className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                  onClick={() => navigate(`/commissions/${comm.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {comm.case?.case_number || 'No case'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {comm.distributor?.name || 'No distributor'}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Expected: {formatCurrency(comm.expected_amount)}
                        </span>
                        {comm.received_amount != null && (
                          <span className="text-sm font-semibold text-green-600">
                            Received: {formatCurrency(comm.received_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={comm.status} type="commission" />
                      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'bill_sheets' && (
        <>
          {/* Active / Archived toggle */}
          <div className="mb-3 flex gap-2">
            {['active', 'archived'].map((view) => (
              <button
                key={view}
                onClick={() => setBillSheetView(view)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize',
                  billSheetView === view ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {view}
              </button>
            ))}
          </div>

          {(() => {
            const filtered = allBillSheets.filter((bs) =>
              billSheetView === 'active' ? !bs.isArchived : bs.isArchived
            );
            const totalValue = filtered.reduce((sum, bs) => sum + bs.totalValue, 0);

            return (
              <>
                {/* Summary */}
                <Card className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {billSheetView === 'active' ? 'Active' : 'Archived'} Bill Sheets
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      {filtered.length} sheet{filtered.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Card>

                {billSheetsLoading ? (
                  <div className="space-y-3">
                    <Skeleton variant="card" />
                    <Skeleton variant="card" />
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title={`No ${billSheetView === 'active' ? 'Active' : 'Archived'} Bill Sheets`}
                    description="Bill sheets will appear here after you create them for cases"
                  />
                ) : (
                  <div className="space-y-2">
                    {filtered.map((bs) => (
                      <Card
                        key={bs.caseId}
                        className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                        onClick={() => navigate(`/bill-sheets/${bs.caseId}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {bs.caseNumber || 'No case number'}
                              {bs.surgeon && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">· {bs.surgeon}</span>}
                            </p>
                            {bs.facility && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{bs.facility}</p>
                            )}
                            <div className="mt-1 flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(bs.totalValue)}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatDate(bs.scheduledDate)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                              <span>{bs.items.length} item{bs.items.length !== 1 ? 's' : ''}</span>
                              <span>· submitted {formatRelativeTime(bs.submittedAt)}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                        </div>
                        {!bs.isArchived && (
                          <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setChaseTarget(bs)}
                              className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            >
                              Chase PO
                            </button>
                            <button
                              onClick={() => { setRecordTarget(bs); setPOForm({ po_number: '', amount: '', received_date: new Date().toISOString().split('T')[0] }); }}
                              className="flex-1 rounded-lg bg-brand-800 py-2 text-xs font-medium text-white"
                            >
                              Record PO Received
                            </button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {activeTab === 'pay_periods' && (
        <>
          {!paySchedule?.frequency ? (
            <EmptyState
              icon={Calendar}
              title="No Pay Schedule"
              description="Set up your pay schedule in My Distributor to track pay periods"
              actionLabel="Go to My Distributor"
              onAction={() => navigate('/my-distributor')}
            />
          ) : periodsLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : (
            <>
              {/* Current open period card */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const current = allPayPeriods.find((p) => p.period_start <= today && p.period_end >= today && p.status === 'open');
                if (!current) return null;
                const daysLeft = Math.ceil((new Date(current.period_end) - new Date()) / 86400000);
                // Calculate running total from linked commissions
                const linkedCommsTotal = allCommissions
                  .filter((c) => c.pay_period_id === current.id)
                  .reduce((sum, c) => sum + (c.expected_amount || 0), 0);
                return (
                  <Card
                    className="mb-4 border-l-4 border-l-brand-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                    onClick={() => navigate(`/pay-periods/${current.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-brand-800 dark:text-brand-400">Current Period</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatDate(current.period_start)} – {formatDate(current.period_end)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {daysLeft > 0 ? `Closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Closing today'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(linkedCommsTotal)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Running Total</p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* Closed periods needing verification */}
              {(() => {
                const closedPeriods = allPayPeriods.filter((p) => p.status === 'closed');
                if (closedPeriods.length === 0) return null;
                return (
                  <div className="mb-4">
                    <h2 className="mb-2 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Needs Verification</h2>
                    <div className="space-y-2">
                      {closedPeriods.map((period) => (
                        <Card
                          key={period.id}
                          className="cursor-pointer border-l-4 border-l-amber-400 active:bg-gray-50 dark:active:bg-gray-700"
                          onClick={() => navigate(`/pay-periods/${period.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {formatDate(period.period_start)} – {formatDate(period.period_end)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Expected: {formatCurrency(period.expected_amount)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={period.status} type="pay_period" />
                              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* All periods list */}
              {allPayPeriods.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No Pay Periods"
                  description="Pay periods will be generated based on your schedule"
                />
              ) : (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">All Periods</h2>
                  <div className="space-y-2">
                    {allPayPeriods.map((period) => (
                      <Card
                        key={period.id}
                        className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                        onClick={() => navigate(`/pay-periods/${period.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {formatDate(period.period_start)} – {formatDate(period.period_end)}
                            </p>
                            {period.expected_amount != null && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Expected: {formatCurrency(period.expected_amount)}
                              </p>
                            )}
                            {period.actual_amount != null && (
                              <p className="text-xs font-medium text-green-600">
                                Received: {formatCurrency(period.actual_amount)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={period.status} type="pay_period" />
                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      {/* Chase PO Bottom Sheet */}
      <BottomSheet
        isOpen={!!chaseTarget}
        onClose={() => setChaseTarget(null)}
        title={chaseTarget ? `Chase PO — ${chaseTarget.caseNumber}` : 'Chase PO'}
      >
        <div className="flex flex-col gap-3">
          {chaseTarget?.facility && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{chaseTarget.facility}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleChaseAction('call')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-50 py-3 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              <Phone className="h-4 w-4" /> Call
            </button>
            <button
              onClick={() => handleChaseAction('email')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 py-3 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              <Mail className="h-4 w-4" /> Email
            </button>
            <button
              onClick={() => handleChaseAction('text')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-50 py-3 text-sm font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            >
              <MessageSquare className="h-4 w-4" /> Text
            </button>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              const cid = chaseTarget?.caseId;
              setChaseTarget(null);
              navigate(`/cases/${cid}`);
            }}
          >
            Open Case Detail
          </Button>
        </div>
      </BottomSheet>

      {/* Record PO Bottom Sheet */}
      <BottomSheet
        isOpen={!!recordTarget}
        onClose={() => setRecordTarget(null)}
        title={recordTarget ? `Record PO — ${recordTarget.caseNumber}` : 'Record PO Received'}
      >
        <form onSubmit={handleRecordPO} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">PO Number</label>
            <input
              type="text"
              required
              value={poForm.po_number}
              onChange={(e) => setPOForm((p) => ({ ...p, po_number: e.target.value }))}
              placeholder="Enter PO number"
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={poForm.amount}
              onChange={(e) => setPOForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="0.00"
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Received Date</label>
            <input
              type="date"
              value={poForm.received_date}
              onChange={(e) => setPOForm((p) => ({ ...p, received_date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button type="submit" fullWidth loading={createPO.isPending || createChase.isPending}>
            Save PO
          </Button>
        </form>
      </BottomSheet>

      {/* Send to Distributor Prompt */}
      <BottomSheet isOpen={showSendPrompt} onClose={handleSkipSend} title="Send PO to Distributor?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send PO details to <span className="font-medium text-gray-900 dark:text-gray-100">{sendDistributor?.name}</span>?
          </p>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sendDistributor?.billing_email}</p>
            {sendDistributor?.billing_email_cc?.filter(Boolean).length > 0 && (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">CC</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{sendDistributor.billing_email_cc.filter(Boolean).join(', ')}</p>
              </>
            )}
          </div>
          {sendPOEmail.isError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">
              {sendPOEmail.error?.message || 'Failed to send email'}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={handleSkipSend}>
              Skip
            </Button>
            <Button fullWidth loading={sendPOEmail.isPending} onClick={handleSendToDistributor}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
