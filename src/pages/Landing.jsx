import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, DollarSign, Bell, FileText, Users, BarChart3,
  ChevronDown, ChevronUp, ArrowRight, Check, Shield, Zap,
  Clock, TrendingUp, Smartphone, Brain,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const STATS = [
  { value: '10x', label: 'Faster PO tracking' },
  { value: '100%', label: 'Commission visibility' },
  { value: '0', label: 'Missed follow-ups' },
  { value: '24/7', label: 'Mobile access' },
];

const FEATURES = [
  {
    icon: Calendar,
    title: 'Case Management',
    description: 'Track every surgery from scheduling through billing. Link surgeons, facilities, and distributors in one place.',
  },
  {
    icon: DollarSign,
    title: 'PO & Commission Tracking',
    description: 'Monitor purchase orders, chase overdue payments, and track your commissions from expected to paid.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Automated reminders for upcoming cases, overdue POs, and follow-ups. Never miss a deadline again.',
  },
  {
    icon: Brain,
    title: 'AI Weekly Briefing',
    description: 'Get a personalized Monday morning briefing powered by AI — your week at a glance with action items.',
  },
  {
    icon: Users,
    title: 'Contact Network',
    description: 'Manage surgeons, facilities, distributors, and AP contacts. Import from CSV or add on the go.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First PWA',
    description: 'Install on your phone like a native app. Works offline so you\'re covered even in the OR.',
  },
];

const PLANS = [
  {
    name: 'Solo',
    price: 99,
    description: 'For independent reps managing their own cases',
    features: [
      'Up to 50 active cases',
      'PO & commission tracking',
      'Smart notifications',
      '4 AI digests/month',
      'CSV import',
      'Push notifications',
    ],
  },
  {
    name: 'Assistant',
    price: 149,
    popular: true,
    description: 'For reps with a support team or higher volume',
    features: [
      'Up to 200 active cases',
      'Everything in Solo',
      '8 AI digests/month',
      'PO chase emails',
      'Priority support',
      'Advanced reports',
    ],
  },
  {
    name: 'Distributorship',
    price: 249,
    description: 'For teams managing multiple reps and territories',
    features: [
      'Unlimited cases',
      'Everything in Assistant',
      'Unlimited AI digests',
      'Team management',
      'API access',
      'Dedicated support',
    ],
  },
];

const FAQS = [
  {
    q: 'What is MedRepDesk?',
    a: 'MedRepDesk is a case and financial tracking platform built specifically for orthopedic and medical device sales reps. It replaces spreadsheets with a mobile-first app that tracks cases, POs, commissions, and contacts.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Absolutely. MedRepDesk is a Progressive Web App (PWA) — install it on your home screen and it works like a native app. It even works offline so you can access case details between surgeries.',
  },
  {
    q: 'How does the AI briefing work?',
    a: 'Every week, our AI analyzes your upcoming cases, overdue POs, pending follow-ups, and commission status to generate a personalized Monday morning briefing. It\'s delivered via push notification and email.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit and at rest. We use Supabase (built on PostgreSQL) with row-level security, ensuring you only see your own data. We never share or sell your information.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, all plans are month-to-month with no long-term contracts. Cancel anytime from your Settings page and you\'ll retain access through the end of your billing period.',
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#09090B] font-outfit text-white">
      {/* ─── Nav ─────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#09090B]/80 backdrop-blur-xl">
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
            <span>Built for medical device reps</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Stop losing money{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              in spreadsheets
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            MedRepDesk tracks your cases, purchase orders, and commissions in one
            mobile-first platform — so you get paid faster and never miss a follow-up.
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
                One app, from case to commission
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
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 transition-colors hover:border-blue-500/20 hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h4 className="mt-4 text-lg font-semibold">{f.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {f.description}
                </p>
              </div>
            ))}
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
                <h4 className="text-lg font-semibold">{plan.name}</h4>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
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
                <ul className="mt-8 space-y-3">
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
