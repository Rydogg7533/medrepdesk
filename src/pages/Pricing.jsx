import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Users, Building2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSubscription, useCreateCheckout, useCreatePortalSession } from '@/hooks/useSubscription';
import { PLAN_LIMITS } from '@/utils/constants';

const plans = [
  {
    key: 'solo',
    icon: Zap,
    name: PLAN_LIMITS.solo.label,
    price: PLAN_LIMITS.solo.price,
    users: '1 user',
    tagline: 'Everything you need to run your book alone.',
    features: [
      'Unlimited cases, POs, chase log & commissions',
      'AI smart case entry — 50/mo',
      'PO photo extraction (unlimited)',
      'Voice commands — listen only, browser TTS',
      'Basic theming — solid color backgrounds',
      'Push notifications',
      'Weekly digest — plain text summary',
      'CSV contact import',
    ],
  },
  {
    key: 'assistant',
    icon: Users,
    name: PLAN_LIMITS.assistant.label,
    price: PLAN_LIMITS.assistant.price,
    users: '2 users (owner + 1 assistant)',
    tagline: 'The full AI experience, plus a second seat.',
    popular: true,
    features: [
      'Everything in Solo',
      'AI smart case entry — 100/mo',
      'Full voice agent — voice in AND out (60 min/mo, $0.10/min overage)',
      'Background image theming + gradients, card opacity, accent colors',
      'AI chase email drafting',
      'AI commission discrepancy detection',
      'Full AI weekly briefing',
    ],
  },
  {
    key: 'distributorship',
    icon: Building2,
    name: PLAN_LIMITS.distributorship.label,
    price: PLAN_LIMITS.distributorship.price,
    users: 'Up to 5 users',
    tagline: 'For distributors managing multiple reps.',
    features: [
      'Everything in AI Pro',
      'AI smart case entry — 500/mo',
      '200 voice minutes/mo',
      'Cross-rep case and commission visibility',
      'My Manufacturers — margins, rep commission rates, product lines',
      'Account-level theme locking — brand your reps\' experience',
      'Unlimited AI digest',
    ],
  },
];

const FAQS = [
  {
    q: 'What counts as an AI extraction?',
    a: 'AI smart case entry uses your monthly extraction count — 50 on Solo, 100 on AI Pro, 500 on Distributorship. PO photo extraction (photographing a PO to auto-fill fields) is unlimited on every plan. It\'s core workflow, not a premium feature.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrade or downgrade from your account settings at any time. Changes take effect at the next billing cycle. No long-term contracts, no cancellation fees.',
  },
  {
    q: 'Is patient data stored?',
    a: 'No. MedRepDesk stores invoice numbers, case values, and procedure types only — never patient names, dates of birth, or any identifying information. We are not a covered entity under HIPAA.',
  },
  {
    q: 'How does the referral program work?',
    a: 'Share your unique referral link with other reps. When they sign up and start paying, you earn 25% of their monthly subscription for 12 months — paid automatically to your bank via Stripe on the 1st of each month.',
  },
  {
    q: 'Does it work on my phone without installing an app?',
    a: 'MedRepDesk is a PWA — Progressive Web App. Install it directly from your browser to your iPhone or Android home screen, no App Store required. It works offline too, so you can log cases even without a signal.',
  },
  {
    q: 'What happens when I go over my voice minutes?',
    a: 'Voice overages are billed at $0.10 per minute on AI Pro and Distributorship plans. You\'ll see your current usage in the app. A monthly cap can be set so you\'re never surprised.',
  },
];

const FEATURE_GROUPS = [
  {
    title: 'Case Management',
    description: 'Your entire book of business, organized from first scheduling to final payment.',
    features: [
      {
        name: 'Case Pipeline Tracking',
        tier: 'all',
        desc: 'Every surgical case moves through a defined status pipeline: scheduled, confirmed, completed, bill sheet submitted, PO requested, PO received, paid. Status advances automatically as you log activity — you never have to manually update a case status.',
      },
      {
        name: 'Unique MRD Case Numbers',
        tier: 'all',
        desc: 'Every case gets a globally unique case number in the format MRD-XXXX-YEAR-0001, tied to your account. Use it when referencing cases with distributors, facilities, or surgeons — without ever exposing patient information.',
      },
      {
        name: 'AI Smart Case Entry',
        tier: 'all',
        desc: 'Describe a case the way you\'d say it out loud and AI parses it into a complete, structured case record. Matches against your existing surgeon and facility database automatically. Saves 2-3 minutes of data entry per case. 50/mo Solo, 100/mo AI Pro, 500/mo Distributorship.',
      },
      {
        name: 'Surgeon Database',
        tier: 'all',
        desc: 'Build a private database of every surgeon you work with. Store their name, specialty, primary facility, phone, and email. Reuse them across every case — no re-typing names or hunting for contact info.',
      },
      {
        name: 'Facility Database',
        tier: 'all',
        desc: 'Every hospital and ASC you work with, stored and searchable. Includes facility type, address, phone, and billing contact info. New cases auto-suggest the right facility based on your history.',
      },
      {
        name: 'Distributor Management',
        tier: 'all',
        desc: 'Store every distributor you sell for with their billing email, CC recipients, billing contact name and phone, and default commission structure. These defaults flow automatically into every case and commission calculation.',
      },
    ],
  },
  {
    title: 'PO Chase Workflow',
    description: 'The feature that pays for itself. A dedicated workflow for the one thing that controls your income — getting the PO.',
    features: [
      {
        name: 'Chase Log',
        tier: 'all',
        desc: 'Log every single touchpoint in your PO chase — calls, emails, texts, in-person visits, voicemails, and notes. Each entry captures the contact name, their role, what was said, and the outcome. A complete, timestamped timeline for every case.',
      },
      {
        name: 'Promised Date Tracking',
        tier: 'all',
        desc: 'When a billing contact says "the PO will be sent by Thursday," log it as a promised date. MedRepDesk tracks it automatically and sends you a push notification the morning after if the PO hasn\'t arrived.',
      },
      {
        name: 'Escalation Detection',
        tier: 'all',
        desc: 'Set your escalation threshold (default: 3 attempts). When you\'ve chased a PO that many times with no result, MedRepDesk automatically flags it for escalation and notifies you.',
      },
      {
        name: 'PO Photo Extraction',
        tier: 'all',
        desc: 'Photograph a physical PO with your phone camera. AI reads it and extracts the PO number, invoice amount, issue date, facility name, and payment terms — then pre-fills your form. No manual transcription. Unlimited on every plan.',
      },
      {
        name: 'Auto-Forward PO to Distributor',
        tier: 'all',
        desc: 'Once a PO is received, MedRepDesk can automatically email it to your distributor\'s billing contact with the invoice details, case reference, and a professional note — in one tap.',
      },
      {
        name: 'Follow-Up Scheduling',
        tier: 'all',
        desc: 'Every chase log entry and communication can have a follow-up date attached. MedRepDesk tracks all open follow-ups and alerts you on the day they\'re due.',
      },
      {
        name: 'AI Chase Email Drafting',
        tier: 'pro',
        desc: 'Tap once and AI generates a complete, professional follow-up email pre-populated with the case number, invoice number, amount, contact name, and how many times you\'ve already followed up. Sounds like you wrote it.',
      },
    ],
  },
  {
    title: 'Commission Tracking',
    description: 'Know exactly what you\'re owed, what\'s cleared, and what\'s being shorted — without a spreadsheet.',
    features: [
      {
        name: 'Auto-Calculated Commissions',
        tier: 'all',
        desc: 'The moment a case is completed with a case value, your expected commission is calculated automatically using the rate you set for that distributor — percentage or flat dollar amount. No spreadsheet, no manual math.',
      },
      {
        name: 'Expected vs. Received Tracking',
        tier: 'all',
        desc: 'Every commission has an expected amount and a received amount. Track when payment arrives, what actually landed, and whether it matches. Overdue commissions surface automatically.',
      },
      {
        name: 'Per-Case Commission Override',
        tier: 'all',
        desc: 'Need to override the default rate for a specific case? Adjust commission type and rate at the individual case level. The override is tracked separately from the distributor default.',
      },
      {
        name: 'Commission Status Pipeline',
        tier: 'all',
        desc: 'Every commission moves through: pending, confirmed, received, or disputed/written-off. When a PO is paid, commissions auto-advance. Full audit trail of every status change.',
      },
      {
        name: 'AI Commission Discrepancy Detection',
        tier: 'pro',
        desc: 'AI monitors your commission history across every distributor and flags patterns — when a distributor is consistently paying less than your agreed rate, or when certain procedure types come in short. Catches underpayments before they become a multi-month pattern.',
      },
    ],
  },
  {
    title: 'Communications & Contacts',
    description: 'A complete log of every conversation, linked to the cases and POs they belong to.',
    features: [
      {
        name: 'Communication Log',
        tier: 'all',
        desc: 'Log calls, emails, texts, in-person visits, and voicemails directly to the case or PO they relate to. Every case has a complete communication history so you — or your assistant — always know what\'s been said.',
      },
      {
        name: 'Contact Database',
        tier: 'all',
        desc: 'Build your rep relationship network — billing coordinators, OR schedulers, purchasing managers, distributor reps. Each contact is linked to their facility or distributor with phone, email, and last contacted date.',
      },
      {
        name: 'CSV Contact Import',
        tier: 'all',
        desc: 'Already have contacts in a spreadsheet? Upload a CSV and import them in bulk. Field mapping is handled automatically. No re-typing 200 contacts one at a time.',
      },
      {
        name: 'Last Contacted Tracking',
        tier: 'all',
        desc: 'Every time you log a communication tied to a contact, their "last contacted" date updates automatically. See at a glance which relationships are going cold.',
      },
      {
        name: 'Follow-Up Scheduling on Communications',
        tier: 'all',
        desc: 'Every logged communication can have a follow-up date. MedRepDesk tracks every open follow-up across all your cases and contacts and alerts you when they\'re due.',
      },
    ],
  },
  {
    title: 'Notifications & Digest',
    description: 'The right alert at the right time — delivered to your phone before you need it.',
    features: [
      {
        name: 'Case Tomorrow Alerts',
        tier: 'all',
        desc: 'Every evening, MedRepDesk checks your schedule and sends a push notification for every case you have the next day. Know exactly what\'s coming before you wake up.',
      },
      {
        name: 'Promised Date Alerts',
        tier: 'all',
        desc: 'If a billing contact promised a PO by a certain date and it hasn\'t arrived, you get a push notification the morning after. Automatically.',
      },
      {
        name: 'Escalation Alerts',
        tier: 'all',
        desc: 'When a case hits your escalation threshold, you get a push notification recommending escalation. Tells you the case, how many attempts, and the last contact made.',
      },
      {
        name: 'Overdue PO & Commission Alerts',
        tier: 'all',
        desc: 'When expected payment dates pass with nothing received, MedRepDesk surfaces it every morning until resolved. Never let late POs or commissions disappear into the noise.',
      },
      {
        name: 'Follow-Up Due Alerts',
        tier: 'all',
        desc: 'Any follow-up you\'ve scheduled — on a chase log entry, a communication, or a PO — triggers a push notification on the due date.',
      },
      {
        name: 'Per-Notification Control',
        tier: 'all',
        desc: 'Turn each notification type on or off individually. Choose push only, email only, or both. Customize per your workflow.',
      },
      {
        name: 'Weekly Digest — Plain Text',
        tier: 'all',
        desc: 'Every Monday morning, a structured summary: cases coming up, open POs with their age, follow-ups due, overdue commissions, and escalation flags.',
      },
      {
        name: 'Full AI Weekly Briefing',
        tier: 'pro',
        desc: 'The same digest but written by AI in plain English — not just a list, but a real briefing. Tells you what\'s urgent, what to prioritize, and what\'s at risk. Delivered to your inbox or as a push notification.',
      },
    ],
  },
  {
    title: 'Voice',
    description: 'Log cases, chase POs, and check your book — hands-free from anywhere.',
    features: [
      {
        name: 'Voice Input — Command Mode',
        tier: 'all',
        desc: 'Tap the microphone and speak. AI parses your words into the right fields and logs the entry. Works for case creation, chase log entries, communications, and notes. Perfect when you\'re in scrubs or driving between hospitals.',
      },
      {
        name: 'Full Voice Agent — Conversational',
        tier: 'pro',
        desc: 'Two-way voice — you speak, the app speaks back. Ask "What cases do I have this week?" and hear the answer. Complete entire entries by voice. 60 min/mo on AI Pro, 200 min/mo on Distributorship. $0.10/min overage.',
      },
    ],
  },
  {
    title: 'Theming & Personalization',
    description: 'Make the app feel like yours — or lock it to your brand.',
    features: [
      {
        name: 'Solid Color Backgrounds',
        tier: 'all',
        desc: 'Choose a background color from a full color picker. Light, dark, or your own custom hex. Pairs with system dark mode toggle.',
      },
      {
        name: 'Background Images & Gradients',
        tier: 'pro',
        desc: 'Upload your own background photo or choose from preloaded presets. Add a gradient overlay and adjust dimness with a slider. Makes the app feel genuinely personal.',
      },
      {
        name: 'Full Theming System',
        tier: 'pro',
        desc: 'Card opacity slider, header and bottom nav opacity slider, accent color customization. Full control over every visual layer of the app.',
      },
      {
        name: 'Account-Level Theme Locking',
        tier: 'dist',
        desc: 'As a distributorship owner, set a theme for your entire team and lock it. Every rep under your account sees the same branded experience. Reps can\'t override it.',
      },
    ],
  },
  {
    title: 'Team Features',
    description: 'Add an assistant or manage a full team of reps.',
    features: [
      {
        name: 'Assistant User Access',
        tier: 'pro',
        desc: 'Add one assistant to your account. They get full access to create and manage cases, log POs, and add chase entries. They cannot access billing settings, referral earnings, or subscription management. Role-gated at the database level.',
      },
      {
        name: 'Cross-Rep Case & Commission Visibility',
        tier: 'dist',
        desc: 'See every rep\'s cases, POs, and commissions in a single dashboard view. Filter by rep, status, date range, or distributor. Know where the team\'s book stands without asking each rep individually.',
      },
      {
        name: 'My Manufacturers',
        tier: 'dist',
        desc: 'Manage each manufacturer relationship — store their contact info, product lines you carry, your margin on each line, and commission rates you pay your reps per product.',
      },
      {
        name: 'Up to 5 Users',
        tier: 'dist',
        desc: 'Owner plus up to 4 additional users — a mix of assistants and reps. Each user has their own login, case data, and notification preferences. The owner sees everything.',
      },
    ],
  },
  {
    title: 'Referral Program',
    description: 'Get paid to tell other reps about the tool you already use.',
    features: [
      {
        name: 'Referral Link',
        tier: 'all',
        desc: 'Every account gets a unique referral link and code. Share it with other reps. When they sign up and start paying, you earn a commission automatically.',
      },
      {
        name: '25% Recurring for 12 Months',
        tier: 'all',
        desc: 'Earn 25% of every referred rep\'s monthly subscription for 12 months. On a Solo referral that\'s $32.25/mo. Refer 4 reps and your own subscription is covered.',
      },
      {
        name: 'Automatic Payouts via Stripe',
        tier: 'all',
        desc: 'Referral commissions are paid automatically on the 1st of each month via Stripe Connect direct deposit. No invoicing, no chasing, no waiting.',
      },
    ],
  },
];

const TIER_LABELS = {
  all: { label: 'All Plans', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pro: { label: 'AI Pro & Up', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  dist: { label: 'Distributorship', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

function TierBadge({ tier }) {
  const t = TIER_LABELS[tier];
  return (
    <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', t.bg)}>
      {t.label}
    </span>
  );
}

function AccordionGroup({ group }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="themed-card rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
        </div>
        <ChevronDown
          className={clsx(
            'ml-3 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2 dark:border-gray-700">
          <div className="space-y-3">
            {group.features.map((f) => (
              <div key={f.name} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.name}</span>
                  <TierBadge tier={f.tier} />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{q}</span>
        <ChevronDown
          className={clsx(
            'ml-3 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <p className="pb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plan: currentPlan, isActive, isTrialing, hasStripeCustomer } = useSubscription();
  const checkout = useCreateCheckout();
  const portalSession = useCreatePortalSession();
  const toast = useToast();
  const [tab, setTab] = useState('plans');

  const cancelMsg = searchParams.get('checkout') === 'cancel';

  async function handleSelect(planKey) {
    if (planKey === currentPlan && isActive) return;

    const stripeWindow = window.open('', '_self');

    try {
      const result = await checkout.mutateAsync({ plan: planKey });
      if (result?.url) {
        if (stripeWindow) stripeWindow.location.href = result.url;
        else window.location.href = result.url;
      } else {
        toast({ message: 'No checkout URL returned. Please try again.', type: 'error' });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({ message: `Checkout failed: ${err.message}`, type: 'error' });
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="page-bg-text text-center text-lg font-bold text-gray-900 dark:text-gray-100">
        Choose Your Plan
      </h1>
      <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
        {isTrialing
          ? 'Your 14-day free trial is active. Pick a plan to continue after trial.'
          : 'All plans include a 14-day free trial.'}
      </p>

      {cancelMsg && (
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Checkout was canceled. You can try again anytime.
        </div>
      )}

      {hasStripeCustomer && (
        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              try {
                const result = await portalSession.mutateAsync();
                if (result?.url) window.location.href = result.url;
              } catch (err) {
                console.error('Portal error:', err);
              }
            }}
            className="text-sm font-medium text-brand-800 underline dark:text-brand-400"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* Tab selector */}
      <div className="mt-5 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
        {[
          { key: 'plans', label: 'Plans' },
          { key: 'features', label: 'All Features' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Plans Tab ── */}
      {tab === 'plans' && (
        <>
          {/* Everything included banner */}
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-center text-xs text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <span className="font-semibold">Every plan includes:</span>{' '}
            Unlimited cases, POs, chase log entries, communications, contacts, surgeon &amp; facility database, distributor management, CSV contact import, push notifications, and unlimited PO photo extraction.
          </div>

          {/* Plan cards */}
          <div className="mt-5 space-y-4">
            {plans.map((plan) => {
              const isCurrent = plan.key === currentPlan && isActive;

              return (
                <div
                  key={plan.key}
                  className={clsx(
                    'themed-card relative rounded-xl border p-5 transition-shadow',
                    plan.popular
                      ? 'border-brand-800 shadow-md dark:border-brand-400'
                      : 'border-gray-200 dark:border-gray-700',
                    'bg-white dark:bg-gray-800'
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-brand-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-brand-400 dark:text-gray-900">
                      Most Popular
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      plan.popular
                        ? 'bg-brand-800/10 text-brand-800 dark:bg-brand-400/10 dark:text-brand-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    )}>
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {plan.name}
                        </h2>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{plan.users}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          ${plan.price}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400">
                    {plan.tagline}
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="secondary" fullWidth disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant={plan.popular ? 'primary' : 'outline'}
                        fullWidth
                        loading={checkout.isPending && checkout.variables?.plan === plan.key}
                        onClick={() => handleSelect(plan.key)}
                      >
                        {isActive ? 'Switch Plan' : 'Start Free Trial'}
                      </Button>
                    )}
                    {!isActive && (
                      <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                        14-day free trial, no credit card required
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="mt-8">
            <h2 className="page-bg-text mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Frequently Asked Questions
            </h2>
            <div className="themed-card rounded-xl border border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
              {FAQS.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── All Features Tab ── */}
      {tab === 'features' && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-center gap-3 text-[10px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">All Plans</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">AI Pro & Up</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Distributorship</span>
          </div>
          {FEATURE_GROUPS.map((group) => (
            <AccordionGroup key={group.title} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
