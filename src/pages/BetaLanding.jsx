import { useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── FORM STATE ──────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  territory: "",
  specialty: "",
  volume: "",
  currentTool: "",
  biggestPain: "",
};

const SPECIALTIES = [
  "Orthopedic — Spine",
  "Orthopedic — Joints (Hip/Knee)",
  "Orthopedic — Trauma",
  "Orthopedic — Sports Med",
  "Cardiovascular",
  "Neurosurgery",
  "General Surgery",
  "Other",
];

const VOLUMES = [
  "1–5 cases/week",
  "6–10 cases/week",
  "11–20 cases/week",
  "20+ cases/week",
];

const TOOLS = [
  "Spreadsheets / Notes app",
  "Salesforce",
  "Pipedrive",
  "RepSpark",
  "Surgio",
  "Nothing — it's all in my head",
  "Other",
];

export default function BetaLanding() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [step, setStep] = useState(1); // 1 = info, 2 = workflow, 3 = done
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Required";
    if (!formData.email.trim() || !formData.email.includes("@"))
      e.email = "Valid email required";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!formData.specialty) e.specialty = "Required";
    if (!formData.volume) e.volume = "Required";
    if (!formData.biggestPain.trim()) e.biggestPain = "Required";
    return e;
  };

  const nextStep = () => {
    if (step === 1) {
      const e = validateStep1();
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    if (step === 2) {
      const e = validateStep2();
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    try {
      const { data, error } = await supabase
        .from('beta_signups')
        .insert({
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          territory: formData.territory,
          specialty: formData.specialty,
          cases_per_month: formData.volume,
          current_tools: formData.currentTool,
          biggest_pain_point: formData.biggestPain,
          invite_code: 'BETA_V3_DIRECT',
          tier: 'bronze',
        });

      if (error) {
        console.error('Error submitting beta signup:', error);
        alert('There was an error submitting your application. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('There was an error submitting your application. Please try again.');
    }
  };

  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>

      {/* ── NAV ── */}
      <nav style={styles.nav}>
        <span style={styles.wordmark}>MedRepDesk</span>
        <a href="mailto:beta@medrepdesk.io" style={styles.navLink}>
          beta@medrepdesk.io
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.eyebrow}>Early access · 10 reps · starts now</p>
          <h1 style={styles.headline}>
            The PO chase is broken.<br />
            We built a fix.<br />
            <span style={styles.headlineAccent}>10 reps. Real cases. Tell us what doesn't work.</span>
          </h1>
          <p style={styles.subhead}>
            MedRepDesk is the workflow tool independent device reps have been running
            on spreadsheets and memory for years. Every case, every chase, every promised
            date — tracked in one place, from your phone.
          </p>
          <p style={styles.subhead}>
            We're testing it with a small group of reps before we open it up.
            No gimmicks. No referral games. If you fit the profile, we'd like to talk.
          </p>
          <a href="#apply" style={styles.heroCTA}>
            Request early access →
          </a>
        </div>

        {/* ── DIVIDER LINE ── */}
        <div style={styles.divider} />
      </section>

      {/* ── WHAT IT DOES ── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>What it does</p>
        <div style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.featureCard}>
              <p style={styles.featureTitle}>{f.title}</p>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* ── WHO WE'RE LOOKING FOR ── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>Who we're looking for</p>
        <div style={styles.twoCol}>
          <div>
            <p style={styles.bodyText}>
              Independent 1099 reps — primarily implant-focused. You're running your own
              book, billing your own cases, chasing your own POs. You know exactly which
              AP contact to call at which hospital and exactly how long they'll stall.
            </p>
            <p style={styles.bodyText}>
              You're not looking for a CRM. You're not looking for a sales tool.
              You want the administrative side of this business to stop costing you
              money and mental bandwidth.
            </p>
            <p style={styles.bodyText}>
              That's who this is for.
            </p>
          </div>
          <div style={styles.criteriaBox}>
            <p style={styles.criteriaHeading}>Good fit if you:</p>
            <ul style={styles.criteriaList}>
              {CRITERIA.map((c) => (
                <li key={c} style={styles.criteriaItem}>
                  <span style={styles.criteriaCheck}>—</span> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div style={styles.divider} />

      {/* ── NOTE FROM RYAN ── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>A note from Ryan</p>
        <div style={styles.noteBox}>
          <p style={styles.noteText}>
            I spent years as an independent ortho rep. The tools available were
            either built for W-2 reps at big distributors, or generic CRMs that
            didn't understand what a bill sheet was, let alone a promised date.
          </p>
          <p style={styles.noteText}>
            I built MedRepDesk to solve my own problem. The PO chase workflow,
            the commission tracking, the case pipeline — it's all based on how I
            actually worked, not how a product manager imagined I worked.
          </p>
          <p style={styles.noteText}>
            Before this goes to market, I want to sit down with a handful of reps
            and make sure it actually holds up in the real world. Not a survey.
            A 20-minute call, then real access, then honest feedback.
          </p>
          <p style={styles.noteText}>
            If you're running an independent book and you're tired of managing
            this stuff in your head — reach out.
          </p>
          <p style={styles.noteSig}>— Ryan</p>
        </div>
      </section>

      <div style={styles.divider} />

      {/* ── WHAT IT COSTS ── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>What it costs</p>
        <div style={styles.pricingRow}>
          <div style={styles.pricingCard}>
            <p style={styles.pricingTier}>Solo Rep</p>
            <p style={styles.pricingPrice}>$129<span style={styles.pricingPer}>/mo</span></p>
            <p style={styles.pricingNote}>
              Full platform. PO workflow, commission tracking, AI case entry,
              weekly digest. Everything a single rep needs.
            </p>
          </div>
          <div style={styles.pricingCard}>
            <p style={styles.pricingTier}>Rep + Assistant</p>
            <p style={styles.pricingPrice}>$199<span style={styles.pricingPer}>/mo</span></p>
            <p style={styles.pricingNote}>
              Everything in Solo plus a second seat, AI chase email drafting,
              voice responses, and commission discrepancy detection.
            </p>
          </div>
        </div>
        <p style={styles.pricingFooter}>
          Reps who join during early access lock in today's rate permanently.
          When pricing increases at launch, yours doesn't.
        </p>
      </section>

      <div style={styles.divider} />

      {/* ── WHAT THIS INVOLVES ── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>What this involves</p>
        <div style={styles.involvesGrid}>
          {INVOLVES.map((item) => (
            <div key={item.title} style={styles.involvesCard}>
              <p style={styles.involvesTitle}>{item.title}</p>
              <p style={styles.involvesDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* ── APPLY FORM ── */}
      <section id="apply" style={styles.section}>
        <p style={styles.sectionLabel}>Request early access</p>

        {submitted ? (
          <SuccessState name={formData.name} />
        ) : (
          <div style={styles.formWrap}>
            {/* Step indicator */}
            <div style={styles.stepRow}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={styles.stepItem}>
                  <div style={{
                    ...styles.stepDot,
                    ...(step >= s ? styles.stepDotActive : {})
                  }} />
                  <span style={{
                    ...styles.stepLabel,
                    ...(step === s ? styles.stepLabelActive : {})
                  }}>
                    {s === 1 ? "Your info" : s === 2 ? "Your practice" : "Submit"}
                  </span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <Step1 formData={formData} update={update} errors={errors} next={nextStep} />
            )}
            {step === 2 && (
              <Step2
                formData={formData}
                update={update}
                errors={errors}
                next={nextStep}
                back={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3
                formData={formData}
                update={update}
                back={() => setStep(2)}
                submit={handleSubmit}
              />
            )}
          </div>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <span style={styles.footerLeft}>MedRepDesk © 2026</span>
        <div style={styles.footerLinks}>
          <a href="/privacy" style={styles.footerLink}>Privacy</a>
          <a href="/terms" style={styles.footerLink}>Terms</a>
          <a href="mailto:beta@medrepdesk.io" style={styles.footerLink}>Contact</a>
        </div>
      </footer>
    </div>
  );
}

// ─── FORM STEPS ──────────────────────────────────────────────────────────────

function Step1({ formData, update, errors, next }) {
  return (
    <div style={styles.formStep}>
      <Field label="Full name" error={errors.name}>
        <input
          style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <input
          style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>
      <Field label="Phone (optional)">
        <input
          style={styles.input}
          type="tel"
          placeholder="(801) 555-0123"
          value={formData.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </Field>
      <Field label="Territory (optional)">
        <input
          style={styles.input}
          placeholder="e.g. Northern Utah, Phoenix metro"
          value={formData.territory}
          onChange={(e) => update("territory", e.target.value)}
        />
      </Field>
      <button style={styles.btnPrimary} onClick={next}>
        Continue →
      </button>
    </div>
  );
}

function Step2({ formData, update, errors, next, back }) {
  return (
    <div style={styles.formStep}>
      <Field label="Primary specialty" error={errors.specialty}>
        <select
          style={{ ...styles.input, ...styles.select, ...(errors.specialty ? styles.inputError : {}) }}
          value={formData.specialty}
          onChange={(e) => update("specialty", e.target.value)}
        >
          <option value="">Select one</option>
          {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Cases per week" error={errors.volume}>
        <select
          style={{ ...styles.input, ...styles.select, ...(errors.volume ? styles.inputError : {}) }}
          value={formData.volume}
          onChange={(e) => update("volume", e.target.value)}
        >
          <option value="">Select one</option>
          {VOLUMES.map((v) => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label="What do you currently use to track cases and POs?">
        <select
          style={{ ...styles.input, ...styles.select }}
          value={formData.currentTool}
          onChange={(e) => update("currentTool", e.target.value)}
        >
          <option value="">Select one</option>
          {TOOLS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field
        label="What's the one thing that costs you the most time or money right now?"
        error={errors.biggestPain}
      >
        <textarea
          style={{ ...styles.input, ...styles.textarea, ...(errors.biggestPain ? styles.inputError : {}) }}
          placeholder="Be specific — this directly shapes what we build."
          value={formData.biggestPain}
          onChange={(e) => update("biggestPain", e.target.value)}
          rows={4}
        />
      </Field>
      <div style={styles.btnRow}>
        <button style={styles.btnSecondary} onClick={back}>← Back</button>
        <button style={styles.btnPrimary} onClick={next}>Continue →</button>
      </div>
    </div>
  );
}

function Step3({ formData, back, submit }) {
  return (
    <div style={styles.formStep}>
      <div style={styles.reviewBox}>
        <p style={styles.reviewHeading}>One more thing</p>
        <p style={styles.reviewText}>
          Before you get access, Ryan will reach out to schedule a 20-minute call.
          This isn't a sales call — it's a setup call. He'll configure the app
          to match your actual workflow, answer your questions, and make sure you're
          getting value from day one.
        </p>
        <p style={styles.reviewText}>
          Submitting this means you're open to that conversation. That's the only
          requirement.
        </p>
      </div>

      <div style={styles.reviewSummary}>
        <p style={styles.reviewSummaryLabel}>Submitting as:</p>
        <p style={styles.reviewSummaryValue}>{formData.name} · {formData.email}</p>
        {formData.specialty && (
          <p style={styles.reviewSummaryValue}>{formData.specialty} · {formData.volume}</p>
        )}
      </div>

      <div style={styles.btnRow}>
        <button style={styles.btnSecondary} onClick={back}>← Back</button>
        <button style={styles.btnPrimary} onClick={submit}>Submit request →</button>
      </div>
    </div>
  );
}

function SuccessState({ name }) {
  return (
    <div style={styles.successBox}>
      <p style={styles.successHeading}>Request received.</p>
      <p style={styles.successText}>
        {name ? `${name.split(" ")[0]}, thanks` : "Thanks"} for reaching out. Ryan will
        email you within 48 hours to set up a time to talk. Come ready to walk through
        how you currently manage cases and POs — that's where the conversation starts.
      </p>
      <p style={styles.successText}>
        Questions in the meantime: <a href="mailto:beta@medrepdesk.io" style={styles.successLink}>beta@medrepdesk.io</a>
      </p>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <p style={styles.errorMsg}>{error}</p>}
    </div>
  );
}

// ─── DATA ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Case pipeline",
    desc: "Every case from scheduled through paid. Status advances automatically as you work — confirmed, completed, bill sheet in, PO requested, PO received, paid.",
  },
  {
    title: "PO chase workflow",
    desc: "Log every call, email, and conversation. Track what each contact promised and when. Flag cases that have been chased too many times with no response.",
  },
  {
    title: "Commission tracking",
    desc: "Expected vs. received, per case, per distributor. When a number comes in short, you'll know immediately — not six weeks later when you're reconciling.",
  },
  {
    title: "AI case entry",
    desc: "Describe a case out loud or type a few words. AI structures it into the right fields. Photograph a PO and AI reads it. Less data entry, same record.",
  },
  {
    title: "Weekly digest",
    desc: "Monday morning: every open case, every overdue PO, every pending commission, every follow-up due. One read and you know exactly where everything stands.",
  },
  {
    title: "Smart alerts",
    desc: "Promised date passed with no PO. Commission expected two weeks ago. Case tomorrow with no confirmation. You find out when it happens, not when you think to check.",
  },
];

const CRITERIA = [
  "Run an independent 1099 book",
  "Primarily implant-focused (ortho, spine, cardio, neuro)",
  "Managing 5+ cases per week",
  "Currently tracking in spreadsheets, notes, or memory",
  "Willing to use the tool on real cases and give direct feedback",
];

const INVOLVES = [
  {
    title: "A 20-minute setup call",
    desc: "Before you get access, Ryan gets on the phone with you. Not a demo — a setup. He configures the app around your actual workflow.",
  },
  {
    title: "Four weeks of real use",
    desc: "Log your actual cases, chase your actual POs. This only works if you're using it on live work, not test data.",
  },
  {
    title: "Honest feedback",
    desc: "A check-in call at week two and a short survey at week four. Tell us what's working, what isn't, and what's missing. That's the whole ask.",
  },
  {
    title: "Your rate, locked",
    desc: "When you finish the program, your rate is locked at $129/mo forever. Launch pricing will be higher. Yours won't change.",
  },
];

// ─── STYLES ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#09090f",           // near-black with the faintest navy tint
  surface: "#0d1829",      // Zimmer-inspired navy surface — gives cards depth vs pure black
  border: "#1a2438",       // navy-tinted border
  borderMid: "#243248",
  text: "#e8e8e8",
  textMuted: "#8a9ab5",    // slightly blue-grey muted text — feels clinical, not warm
  textDim: "#445570",
  accent: "#d4a843",       // Stryker-grade gold — confident, not antique
  accentBlue: "#4a9eff",
  white: "#ffffff",
  error: "#e05a5a",
};

const styles = {
  root: {
    background: C.bg,
    color: C.text,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    minHeight: "100vh",
    maxWidth: "100%",
    overflowX: "hidden",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    borderBottom: `1px solid ${C.border}`,
    position: "sticky",
    top: 0,
    background: C.bg,
    zIndex: 100,
  },
  wordmark: {
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: C.white,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  navLink: {
    fontSize: "13px",
    color: C.textMuted,
    textDecoration: "none",
    letterSpacing: "0.03em",
  },
  hero: {
    padding: "80px 40px 60px",
    maxWidth: "780px",
    margin: "0 auto",
  },
  heroInner: {
    maxWidth: "680px",
  },
  eyebrow: {
    fontSize: "12px",
    color: C.accent,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: "28px",
    fontWeight: 500,
  },
  headline: {
    fontSize: "clamp(28px, 4vw, 44px)",
    fontWeight: 700,
    lineHeight: 1.2,
    color: C.white,
    marginBottom: "8px",
    letterSpacing: "-0.02em",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  headlineAccent: {
    color: C.textMuted,
    fontWeight: 400,
  },
  subhead: {
    fontSize: "16px",
    color: C.textMuted,
    lineHeight: 1.7,
    marginTop: "28px",
    maxWidth: "620px",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.01em",
  },
  heroCTA: {
    display: "inline-block",
    marginTop: "44px",
    padding: "14px 28px",
    background: "transparent",
    border: `1px solid ${C.accent}`,
    color: C.accent,
    fontSize: "14px",
    letterSpacing: "0.06em",
    textDecoration: "none",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  divider: {
    height: "1px",
    background: C.border,
    margin: "0 40px",
  },
  section: {
    padding: "64px 40px",
    maxWidth: "820px",
    margin: "0 auto",
  },
  sectionLabel: {
    fontSize: "11px",
    color: C.accent,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    marginBottom: "36px",
    fontWeight: 600,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "0",
    border: `1px solid ${C.border}`,
  },
  featureCard: {
    padding: "28px 32px",
    borderRight: `1px solid ${C.border}`,
    borderBottom: `1px solid ${C.border}`,
  },
  featureTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: C.white,
    marginBottom: "10px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  featureDesc: {
    fontSize: "14px",
    color: C.textMuted,
    lineHeight: 1.65,
    fontFamily: "'DM Sans', sans-serif",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "48px",
    alignItems: "start",
  },
  bodyText: {
    fontSize: "15px",
    color: C.textMuted,
    lineHeight: 1.75,
    marginBottom: "20px",
    fontFamily: "'DM Sans', sans-serif",
  },
  criteriaBox: {
    borderLeft: `2px solid ${C.border}`,
    paddingLeft: "32px",
  },
  criteriaHeading: {
    fontSize: "12px",
    color: C.accent,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "20px",
    fontWeight: 600,
  },
  criteriaList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  criteriaItem: {
    fontSize: "14px",
    color: C.textMuted,
    lineHeight: 1.6,
    marginBottom: "14px",
    display: "flex",
    gap: "12px",
  },
  criteriaCheck: {
    color: C.accent,
    flexShrink: 0,
  },
  noteBox: {
    borderLeft: `2px solid ${C.accent}`,
    paddingLeft: "32px",
    maxWidth: "600px",
  },
  noteText: {
    fontSize: "15px",
    color: C.textMuted,
    lineHeight: 1.8,
    marginBottom: "20px",
    fontFamily: "'DM Sans', sans-serif",
  },
  noteSig: {
    fontSize: "15px",
    color: C.accent,
    fontWeight: 600,
    marginTop: "8px",
  },
  pricingRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0",
    border: `1px solid ${C.border}`,
    marginBottom: "24px",
  },
  pricingCard: {
    padding: "32px",
    borderRight: `1px solid ${C.border}`,
  },
  pricingTier: {
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: "12px",
    fontWeight: 600,
  },
  pricingPrice: {
    fontSize: "36px",
    fontWeight: 700,
    color: C.white,
    marginBottom: "16px",
    letterSpacing: "-0.02em",
  },
  pricingPer: {
    fontSize: "16px",
    color: C.textMuted,
    fontWeight: 400,
  },
  pricingNote: {
    fontSize: "14px",
    color: C.textMuted,
    lineHeight: 1.65,
  },
  pricingFooter: {
    fontSize: "13px",
    color: C.textDim,
    lineHeight: 1.6,
    paddingLeft: "2px",
    borderLeft: `2px solid ${C.borderMid}`,
    paddingLeft: "16px",
  },
  involvesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "0",
    border: `1px solid ${C.border}`,
  },
  involvesCard: {
    padding: "28px 32px",
    borderRight: `1px solid ${C.border}`,
    borderBottom: `1px solid ${C.border}`,
  },
  involvesTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: C.white,
    marginBottom: "10px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  involvesDesc: {
    fontSize: "14px",
    color: C.textMuted,
    lineHeight: 1.65,
    fontFamily: "'DM Sans', sans-serif",
  },
  formWrap: {
    maxWidth: "540px",
  },
  stepRow: {
    display: "flex",
    gap: "24px",
    marginBottom: "40px",
    alignItems: "center",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: C.borderMid,
    flexShrink: 0,
  },
  stepDotActive: {
    background: C.accent,
  },
  stepLabel: {
    fontSize: "12px",
    color: C.textDim,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  stepLabelActive: {
    color: C.accent,
  },
  formStep: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    color: C.textMuted,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  input: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    color: C.text,
    padding: "12px 16px",
    fontSize: "14px",
    fontFamily: "'IBM Plex Mono', monospace",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    letterSpacing: "0.02em",
  },
  inputError: {
    borderColor: C.error,
  },
  select: {
    appearance: "none",
    cursor: "pointer",
  },
  textarea: {
    resize: "vertical",
    minHeight: "100px",
  },
  errorMsg: {
    fontSize: "12px",
    color: C.error,
    marginTop: "4px",
  },
  btnRow: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  btnPrimary: {
    padding: "13px 28px",
    background: "transparent",
    border: `1px solid ${C.accent}`,
    color: C.accent,
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  btnSecondary: {
    padding: "13px 28px",
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textMuted,
    fontSize: "13px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: "pointer",
  },
  reviewBox: {
    borderLeft: `2px solid ${C.accent}`,
    paddingLeft: "24px",
    marginBottom: "8px",
  },
  reviewHeading: {
    fontSize: "14px",
    fontWeight: 700,
    color: C.white,
    marginBottom: "12px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  reviewText: {
    fontSize: "14px",
    color: C.textMuted,
    lineHeight: 1.7,
    marginBottom: "12px",
  },
  reviewSummary: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: "16px 20px",
    marginBottom: "4px",
  },
  reviewSummaryLabel: {
    fontSize: "11px",
    color: C.textDim,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  reviewSummaryValue: {
    fontSize: "14px",
    color: C.text,
    marginBottom: "4px",
  },
  successBox: {
    maxWidth: "540px",
    borderLeft: `2px solid ${C.accent}`,
    paddingLeft: "32px",
  },
  successHeading: {
    fontSize: "20px",
    fontWeight: 700,
    color: C.white,
    marginBottom: "20px",
    letterSpacing: "-0.01em",
  },
  successText: {
    fontSize: "15px",
    color: C.textMuted,
    lineHeight: 1.75,
    marginBottom: "16px",
  },
  successLink: {
    color: C.accent,
    textDecoration: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 40px",
    borderTop: `1px solid ${C.border}`,
    marginTop: "80px",
  },
  footerLeft: {
    fontSize: "12px",
    color: C.textDim,
    letterSpacing: "0.05em",
  },
  footerLinks: {
    display: "flex",
    gap: "24px",
  },
  footerLink: {
    fontSize: "12px",
    color: C.textDim,
    textDecoration: "none",
    letterSpacing: "0.05em",
  },
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #09090f; }

  a[href="#apply"]:hover,
  button:hover { opacity: 0.8; }

  @media (max-width: 680px) {
    nav { padding: 16px 20px !important; }
    section { padding: 48px 20px !important; }
    .divider { margin: 0 20px !important; }
    h1 { font-size: 26px !important; }
    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
    div[style*="grid-template-columns: repeat(auto-fit, minmax(280px"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
