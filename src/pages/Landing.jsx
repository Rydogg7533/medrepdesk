import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, DollarSign, Bell, FileText, Users, BarChart3,
  ChevronDown, ChevronUp, ArrowRight, Check, Shield, Zap,
  Clock, TrendingUp, Smartphone, Brain, Mic, Palette,
  MessageSquare, Camera, Mail, UserPlus,
} from 'lucide-react';
import FeaturesSearch from '@/components/features/FeaturesSearch';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const STATS = [
  { value: '$0', label: 'POs lost to no follow-up' },
  { value: '100%', label: 'Commission visibility' },
  { value: '1-tap', label: 'AI chase email drafted' },
  { value: '24/7', label: 'AI watching your book' },
];

const FEATURE_SECTIONS = [
  {
    id: 'cases',
    icon: Calendar,
    title: 'Case Management',
    subtitle: 'Your entire book of business, from scheduling to payment.',
    description: 'Track every surgical case through a defined pipeline — scheduled, confirmed, completed, billed, paid. AI smart case entry lets you describe a case the way you\'d say it, and it builds the record for you. Every case gets a unique MRD number for reference across emails and phone calls.',
    highlights: [
      'Automated case status pipeline',
      'AI smart case entry — describe it, done',
      'Unique MRD case numbers',
      'Surgeon & facility database',
      'Distributor management with commission defaults',
    ],
  },
  {
    id: 'chase',
    icon: DollarSign,
    title: 'PO Chase Workflow',
    subtitle: 'The feature that pays for itself.',
    description: 'A dedicated workflow for the one thing that controls your income — getting the PO. Log every chase touchpoint, track promised dates, detect when it\'s time to escalate, and photograph physical POs for instant AI extraction. One tap forwards completed POs to your distributor.',
    highlights: [
      'Complete chase log with contact & outcome tracking',
      'Promised date alerts — automatic follow-up',
      'Escalation detection after N attempts',
      'PO photo extraction — snap, auto-fill, done',
      'Auto-forward POs to distributor billing',
      'AI chase email drafting (AI Pro & up)',
    ],
  },
  {
    id: 'commissions',
    icon: TrendingUp,
    title: 'Commission Tracking',
    subtitle: 'Know what you\'re owed, what\'s cleared, and what\'s short.',
    description: 'Commissions are calculated automatically from your distributor rates the moment a case is completed. Track expected vs. received amounts, override rates per-case when needed, and let AI catch when a distributor is consistently underpaying.',
    highlights: [
      'Auto-calculated from distributor rates',
      'Expected vs. received tracking',
      'Per-case rate overrides',
      'Commission status pipeline',
      'AI discrepancy detection (AI Pro & up)',
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications & Digest',
    subtitle: 'The right alert at the right time.',
    description: 'Push notifications for tomorrow\'s cases, overdue POs, missed promised dates, escalation flags, due follow-ups, and outstanding commissions. Per-notification control lets you choose push, email, or both for each type. Weekly digest summarizes your entire book.',
    highlights: [
      'Case tomorrow alerts',
      'Promised date & overdue PO alerts',
      'Escalation & follow-up due alerts',
      'Per-notification on/off & delivery control',
      'Full AI weekly briefing (AI Pro & up)',
    ],
  },
  {
    id: 'voice',
    icon: Mic,
    title: 'Voice',
    subtitle: 'Log cases and check your book — hands-free.',
    description: 'Tap the mic and speak. Voice command mode parses your words into structured entries — cases, chase logs, communications. AI Pro unlocks full two-way voice: ask questions and hear answers. Perfect when you\'re in scrubs or driving between hospitals.',
    highlights: [
      'Voice input for cases, chase logs & comms',
      'Full conversational voice agent (AI Pro & up)',
      '60 min/mo AI Pro, 200 min/mo Distributorship',
    ],
  },
  {
    id: 'contacts',
    icon: MessageSquare,
    title: 'Communications & Contacts',
    subtitle: 'Every conversation, linked to the cases they belong to.',
    description: 'Log calls, emails, texts, and in-person visits directly to cases. Build a contact database of billing coordinators, OR schedulers, and purchasing managers. Import from CSV. Every contact shows when you last reached out so nothing goes cold.',
    highlights: [
      'Communication log linked to cases',
      'Contact database with facility/distributor links',
      'CSV bulk import',
      'Last contacted tracking',
      'Follow-up scheduling on every entry',
    ],
  },
  {
    id: 'theming',
    icon: Palette,
    title: 'Theming & Personalization',
    subtitle: 'Make the app feel like yours.',
    description: 'Every plan gets a color picker for backgrounds. AI Pro unlocks background images, gradients, card opacity, and full accent color control. Distributorship owners can lock a branded theme across their entire team.',
    highlights: [
      'Solid color backgrounds (all plans)',
      'Background images & gradients (AI Pro & up)',
      'Full theming system — card opacity, accents',
      'Account-level theme locking (Distributorship)',
    ],
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team Features',
    subtitle: 'Add an assistant or manage a full team.',
    description: 'AI Pro adds a second seat for an assistant with role-gated access. Distributorship scales to 5 users with cross-rep visibility, My Manufacturers for managing product lines and margins, and centralized oversight of every rep\'s book.',
    highlights: [
      'Assistant user access (AI Pro & up)',
      'Cross-rep case & commission visibility',
      'My Manufacturers — margins, rates, product lines',
      'Up to 5 users on Distributorship',
    ],
  },
];

const PLANS = [
  {
    name: 'Solo',
    price: 129,
    users: '1 user',
    tagline: 'Everything you need to run your book alone.',
    features: [
      'AI smart case entry — 50/mo',
      'PO photo extraction (unlimited)',
      'Voice commands — listen only',
      'Basic theming',
      'Weekly digest',
      'Push notifications',
    ],
  },
  {
    name: 'AI Pro',
    price: 199,
    users: '2 users',
    popular: true,
    tagline: 'The full AI experience, plus a second seat.',
    features: [
      'Everything in Solo',
      'AI smart case entry — 100/mo',
      'Full voice agent (60 min/mo)',
      'Full theming system',
      'AI chase email drafting',
      'AI commission detection',
      'Full AI weekly briefing',
    ],
  },
  {
    name: 'Distributorship',
    price: 299,
    users: 'Up to 5 users',
    tagline: 'For distributors managing multiple reps.',
    features: [
      'Everything in AI Pro',
      'AI smart case entry — 500/mo',
      '200 voice minutes/mo',
      'Cross-rep visibility',
      'My Manufacturers',
      'Account-level theme locking',
      'Unlimited AI digest',
    ],
  },
];

const FAQS = [
  {
    q: 'What is MedRepDesk?',
    a: 'MedRepDesk is a case and financial tracking platform built specifically for orthopedic and medical device sales reps. It replaces spreadsheets with a mobile-first app that tracks cases, POs, commissions, and contacts.',
  },
  {
    q: 'What counts as an AI extraction?',
    a: 'AI smart case entry uses your monthly extraction count — 50 on Solo, 100 on AI Pro, 500 on Distributorship. PO photo extraction (photographing a PO to auto-fill fields) is unlimited on every plan.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Absolutely. MedRepDesk is a Progressive Web App (PWA) — install it on your home screen and it works like a native app. It even works offline so you can access case details between surgeries.',
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
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrade or downgrade from your account settings at any time. Changes take effect at the next billing cycle. No long-term contracts, no cancellation fees.',
  },
  {
    q: 'What happens when I go over my voice minutes?',
    a: 'Voice overages are billed at $0.10 per minute on AI Pro and Distributorship plans. You\'ll see your current usage in the app. A monthly cap can be set so you\'re never surprised.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes! Every plan starts with a 14-day free trial. No credit card required to start — just sign up and begin tracking your cases immediately.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-white sm:text-lg">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-blue-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-gray-400 sm:text-base">{a}</p>
      )}
    </div>
  );
}

function FeatureSection({ section, index }) {
  const [expanded, setExpanded] = useState(false);
  const isEven = index % 2 === 0;

  return (
    <div className={`rounded-2xl border border-white/5 p-6 sm:p-8 ${isEven ? 'bg-white/[0.03]' : 'bg-white/[0.02]'}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
          <section.icon className="h-5 w-5 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h4 className="text-lg font-semibold text-white">{section.title}</h4>
          <p className="mt-0.5 text-sm text-blue-400">{section.subtitle}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-gray-400">{section.description}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
      >
        {expanded ? 'Hide details' : 'See what\u2019s included'}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <ul className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {section.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-gray-400">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#09090B] font-outfit text-white">
      {/* ─── Nav ─────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#09090B]/80 pt-safe-top backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 font-bold text-white text-sm">
              M
            </div>
            <span className="text-lg font-bold tracking-tight">MedRepDesk</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/signin"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:pt-36">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            <span>AI-powered · Built for medical device reps</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            You do the surgery.{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              AI chases the PO.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            The only rep tool with a dedicated AI that tracks every follow-up, promised date, and underpayment — so nothing falls through the cracks between the OR and your commission check.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 hover:shadow-blue-500/40"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 text-base font-semibold text-gray-300 transition-colors hover:border-white/20 hover:text-white"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ─── Stats ───────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono text-3xl font-bold text-blue-400 sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Problem / Solution ──────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-red-400">
                The problem
              </h2>
              <h3 className="mt-3 text-2xl font-bold sm:text-3xl">
                Spreadsheets weren't built for the OR
              </h3>
              <ul className="mt-6 space-y-4 text-gray-400">
                {[
                  'Cases tracked across multiple spreadsheets and apps',
                  'POs slip through the cracks — money left on the table',
                  'No visibility into commission pipeline',
                  'Follow-ups forgotten, relationships strained',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                The solution
              </h2>
              <h3 className="mt-3 text-2xl font-bold sm:text-3xl">
                One AI that remembers everything and works while you're in the OR
              </h3>
              <ul className="mt-6 space-y-4 text-gray-400">
                {[
                  'Every case, PO, and commission in one place',
                  'Automated reminders before things slip',
                  'AI-powered weekly briefings keep you ahead',
                  'Works on your phone — even offline',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────── */}
      <section id="features" className="bg-white/[0.02] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Features
            </h2>
            <h3 className="mt-3 text-3xl font-bold sm:text-4xl">
              Everything you need to close the loop
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Built by reps, for reps. Every feature designed to save you time and
              make sure you get paid.
            </p>
          </div>

          {/* Included banner */}
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-center">
            <p className="text-sm text-emerald-300">
              <span className="font-semibold">Every plan includes:</span>{' '}
              unlimited cases, POs, chase log entries, communications, contacts, surgeon &amp; facility database, distributor management, CSV contact import, push notifications, and unlimited PO photo extraction.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {FEATURE_SECTIONS.map((section, i) => (
              <FeatureSection key={section.id} section={section} index={i} />
            ))}
          </div>

          {/* Referral callout */}
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 text-center sm:p-8">
            <UserPlus className="mx-auto h-8 w-8 text-blue-400" />
            <h4 className="mt-3 text-lg font-semibold">Referral Program — All Plans</h4>
            <p className="mt-2 text-sm text-gray-400">
              Earn 25% of every referred rep's monthly subscription for 12 months. Paid automatically via Stripe on the 1st of each month. Refer 4 reps on Solo and your own subscription is covered.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────── */}
      <section id="pricing" className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Pricing
            </h2>
            <h3 className="mt-3 text-3xl font-bold sm:text-4xl">
              Simple, transparent pricing
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              14-day free trial on all plans. No credit card required.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">{plan.name}</h4>
                  <span className="text-xs text-gray-500">{plan.users}</span>
                </div>
                <p className="mt-1 text-sm italic text-gray-500">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-bold text-white">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                <Link
                  to="/signup"
                  className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-400'
                      : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  Start Free Trial
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Explorer ─────────────────── */}
      <section className="bg-white/[0.02] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <FeaturesSearch />
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────── */}
      <section id="faq" className="bg-white/[0.02] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              FAQ
            </h2>
            <h3 className="mt-3 text-3xl font-bold sm:text-4xl">
              Frequently asked questions
            </h3>
          </div>
          <div className="mt-12">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
            Ready to stop chasing{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              spreadsheets?
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            Join medical device reps who track every case, PO, and commission in
            one place. Start your free trial today.
          </p>
          <Link
            to="/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 hover:shadow-blue-500/40"
          >
            Start Your Free 14-Day Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-gray-600">No credit card required</p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────── */}
      <footer className="border-t border-white/5 px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 text-xs font-bold text-white">
              M
            </div>
            <span className="font-semibold tracking-tight">MedRepDesk</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-300">Features</a>
            <a href="#pricing" className="hover:text-gray-300">Pricing</a>
            <a href="#faq" className="hover:text-gray-300">FAQ</a>
            <Link to="/signin" className="hover:text-gray-300">Sign in</Link>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} MedRepDesk. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
