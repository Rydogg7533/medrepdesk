import { useState } from "react";
import { supabase } from "@/lib/supabase";

/* ─── MedRepDesk design tokens (extracted from medrepdesk.io) ─────────────── */
const T = {
  bgBase: "#09090b",
  bgCard: "rgba(255,255,255,0.03)",
  bgCardBorder: "rgba(255,255,255,0.08)",
  bgNav: "rgba(9,9,11,0.85)",
  bgBlueSubtle: "rgba(59,130,246,0.08)",
  bgTealSubtle: "rgba(16,185,129,0.08)",
  bgAmberSubtle: "rgba(245,158,11,0.1)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.35)",
  blue: "#3b82f6",
  blueBright: "#60a5fa",
  teal: "#10b981",
  tealBright: "#34d399",
  amber: "#f59e0b",
  amberBright: "#fbbf24",
  red: "#f87171",
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#f5c542",
  fontHead: "'Outfit', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

const SPECIALTIES = [
  { value: "orthopedic", label: "Orthopedic" },
  { value: "spine", label: "Spine" },
  { value: "trauma", label: "Trauma" },
  { value: "sports_med", label: "Sports Medicine" },
  { value: "general_surgery", label: "General Surgery" },
  { value: "cardiovascular", label: "Cardiovascular" },
  { value: "neuro", label: "Neurosurgery" },
  { value: "other", label: "Other" },
];
const CASE_VOLUMES = [
  { value: "under_10", label: "Under 10/month" },
  { value: "10_to_25", label: "10–25/month" },
  { value: "25_to_50", label: "25–50/month" },
  { value: "over_50", label: "50+/month" },
];
const TIERS = [
  { name: "Bronze", color: "#cd7f32", months: 1, icon: "🥉", requirements: ["Complete onboarding", "Log 5+ surgical cases"] },
  { name: "Silver", color: "#c0c0c0", months: 2, icon: "🥈", requirements: ["Everything in Bronze", "Submit 3 bug reports or feature requests"] },
  { name: "Gold", color: "#f5c542", months: 3, icon: "🥇", requirements: ["Everything in Silver", "Record a 60-sec video OR write a G2/Capterra review"] },
];
const STEPS = ["Your Info", "Rep Background", "Invite Code"];

export default function BetaLanding() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    specialty: "", years_experience: "", territory: "",
    distributor_names: "", cases_per_month: "",
    current_tools: "", biggest_pain_point: "",
    invite_code: "", referred_by_name: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.full_name.trim()) e.full_name = "Required";
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    }
    if (step === 1) {
      if (!form.specialty) e.specialty = "Required";
      if (!form.cases_per_month) e.cases_per_month = "Required";
      if (!form.biggest_pain_point.trim()) e.biggest_pain_point = "Required";
    }
    if (step === 2) { if (!form.invite_code.trim()) e.invite_code = "Invite code required"; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);
  const submit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('beta_signups').insert([{
        full_name: form.name,
        email: form.email,
        phone: form.phone,
        territory: form.territory,
        specialty: form.specialty,
        cases_per_month: form.volume,
        current_tools: form.currentTool,
        biggest_pain_point: form.biggestPain,
        invite_code: 'BETA_V3_DIRECT',
        tier: 'bronze',
      }]);
      
      if (error) {
        console.error('Error submitting beta signup:', error);
        alert('There was an error submitting your application. Please try again.');
        setSubmitting(false);
        return;
      }
      
      setSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('There was an error submitting your application. Please try again.');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={s.page}>
        <Nav />
        <div style={s.centerPage}>
          <div style={s.glassCard}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <div style={s.eyebrow}>APPLICATION RECEIVED</div>
            <h2 style={{ ...s.h2, marginBottom: 12 }}>You're In</h2>
            <p style={s.bodyText}>We'll email you within 24 hours with your login link and Discord invite.</p>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 0 }}>
              {[["📧","Check email for login link"],["💬","Join our Discord for direct team access"],["📱","Install the PWA, start logging cases"],["🥇","Hit Gold tier → 3 months free locked in"]].map(([icon, text], i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ color: T.textSecondary, fontSize: 14, fontFamily: T.fontBody }}>{text}</span>
                </div>
              ))}
            </div>
            <p style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontBody, marginTop: 20 }}>Questions? <a href="mailto:beta@medrepdesk.io" style={{ color: T.blueBright }}>beta@medrepdesk.io</a></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
      <Nav />

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroGlow} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={s.pill}><span style={{ color: T.blue }}>⚡</span>&nbsp; Beta Program — 25 spots available</div>
          <h1 style={s.h1}>Built by a rep.<br /><span style={{ color: T.blueBright }}>For reps.</span></h1>
          <p style={{ color: T.textSecondary, fontSize: 17, lineHeight: 1.7, fontFamily: T.fontBody, maxWidth: 520, margin: "0 auto 40px" }}>
            Be one of the first 25 independent ortho reps to use the tool that finally solves the PO chase. 8 weeks, real feedback, real rewards.
          </p>
          <div style={s.statsRow}>
            {[["25","Beta Spots"],["8 wk","Program"],["3 mo","Free (max)"]].map(([n,l], i) => (
              <div key={i} style={{ ...s.statItem, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <span style={s.statNum}>{n}</span>
                <span style={s.statLabel}>{l}</span>
              </div>
            ))}
          </div>
          <a href="#apply" style={s.cta}>Apply for Beta Access →</a>
        </div>
      </div>

      {/* TIERS */}
      <div style={s.section}>
        <div style={s.eyebrow}>BETA REWARDS</div>
        <h2 style={s.h2center}>Earn Your Free Months</h2>
        <p style={s.subText}>Tiers stack — hit Gold, lock in all three months. Requirements are cumulative.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 20 }}>
          {TIERS.map((tier) => (
            <div key={tier.name} style={{ ...s.glassCard, borderColor: `${tier.color}35`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `${tier.color}08`, pointerEvents: "none", borderRadius: 16 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, position: "relative" }}>
                <span style={{ fontSize: 32 }}>{tier.icon}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, fontFamily: T.fontHead, color: tier.color }}>{tier.name}</div>
                  <div style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontBody }}>{tier.months} Month{tier.months > 1 ? "s" : ""} Free</div>
                </div>
              </div>
              {tier.requirements.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", position: "relative" }}>
                  <span style={{ color: T.teal, fontSize: 11, marginTop: 1 }}>✓</span>
                  <span style={{ color: T.textSecondary, fontSize: 13, fontFamily: T.fontBody, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "16px 20px" }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <div>
            <span style={{ color: T.textPrimary, fontWeight: 700, fontFamily: T.fontHead, fontSize: 14 }}>Price Lock Guarantee — </span>
            <span style={{ color: T.textSecondary, fontSize: 13, fontFamily: T.fontBody }}>Beta testers lock in today's rate forever. Your price never increases as long as you stay subscribed.</span>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ ...s.section, background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={s.sectionInner}>
          <div style={s.eyebrow}>WHAT YOU'RE TESTING</div>
          <h2 style={s.h2center}>The Full Platform</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {[
              { icon: "📋", label: "Case Management", color: T.blue, desc: "Full surgical case lifecycle from scheduled → paid, all from your phone." },
              { icon: "📬", label: "PO Chase Workflow", color: T.teal, desc: "Chase log, promised date tracking, one-tap follow-up. Nothing like this exists." },
              { icon: "💰", label: "Commission Tracking", color: T.amberBright, desc: "Auto-calculates expected commissions. Flags when distributors underpay." },
              { icon: "🤖", label: "AI Features", color: T.blueBright, desc: "Photograph a PO → AI extracts all fields. Type a case → AI structures it." },
              { icon: "🔔", label: "Smart Alerts", color: T.red, desc: "Push notifications for tomorrow's cases, missed promised dates, overdue POs." },
              { icon: "📊", label: "Weekly Digest", color: T.tealBright, desc: "Monday morning AI briefing: what's due, overdue, and what you earned." },
            ].map((f) => (
              <div key={f.label} style={{ background: T.bgCard, border: `1px solid ${T.bgCardBorder}`, borderRadius: 12, padding: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}15`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: T.fontHead, color: f.color, marginBottom: 6 }}>{f.label}</div>
                <div style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.6, fontFamily: T.fontBody }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHAT WE NEED */}
      <div style={s.section}>
        <div style={s.eyebrow}>YOUR COMMITMENT</div>
        <h2 style={s.h2center}>What We Need From You</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
          {[
            { icon: "🐛", color: T.red, title: "Bug Reports", desc: "Find something broken? Tell us exactly what happened. Counts toward Silver tier." },
            { icon: "💡", color: T.amberBright, title: "Feature Requests", desc: "Missing something? Submit it. Upvote what others submitted. We build the most-requested first." },
            { icon: "💬", color: T.blue, title: "Discord Check-ins", desc: "Weekly check-ins with the team. Real talk about what's working and what isn't." },
            { icon: "🎥", color: T.gold, title: "Testimonial (Gold)", desc: "60-sec video or a G2/Capterra review. Optional — but unlocks your 3rd free month." },
          ].map((n) => (
            <div key={n.title} style={{ background: T.bgCard, border: `1px solid ${T.bgCardBorder}`, borderRadius: 12, padding: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${n.color}15`, color: n.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>{n.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: T.fontHead, color: T.textPrimary, marginBottom: 8 }}>{n.title}</div>
              <div style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.6, fontFamily: T.fontBody }}>{n.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FORM */}
      <div style={{ ...s.section, background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)" }} id="apply">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={s.eyebrow}>INVITE-ONLY</div>
          <h2 style={{ ...s.h2, marginBottom: 6 }}>Apply for Beta Access</h2>
          <p style={{ color: T.textSecondary, fontSize: 14, fontFamily: T.fontBody, marginBottom: 28 }}>
            You need an invite code from Ryan or a team member. No code? Email <a href="mailto:beta@medrepdesk.io" style={{ color: T.blueBright, textDecoration: "none" }}>beta@medrepdesk.io</a>
          </p>

          <div style={s.glassCard}>
            {/* Progress */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 32 }}>
              {STEPS.map((name, i) => (
                <div key={name} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < step ? T.blue : i === step ? T.blue : "rgba(255,255,255,0.1)", border: `2px solid ${i <= step ? T.blue : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: T.fontHead }}>
                      {i < step ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: i === step ? T.blueBright : T.textMuted, fontFamily: T.fontBody, whiteSpace: "nowrap" }}>{name}</span>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? T.blue : "rgba(255,255,255,0.1)", margin: "0 8px", marginBottom: 20 }} />}
                </div>
              ))}
            </div>

            {step === 0 && <>
              <FInp field="full_name" label="Full Name *" placeholder="Jane Smith" form={form} set={set} errors={errors} />
              <FInp field="email" label="Email Address *" type="email" placeholder="jane@example.com" form={form} set={set} errors={errors} />
              <FInp field="phone" label="Phone (optional)" type="tel" placeholder="(801) 555-0123" form={form} set={set} errors={errors} />
            </>}

            {step === 1 && <>
              <FSel field="specialty" label="Primary Specialty *" options={SPECIALTIES} form={form} set={set} errors={errors} />
              <FSel field="cases_per_month" label="Cases Per Month *" options={CASE_VOLUMES} form={form} set={set} errors={errors} />
              <FInp field="years_experience" label="Years as Independent Rep" type="number" placeholder="5" form={form} set={set} errors={errors} />
              <FInp field="territory" label="Territory" placeholder="Utah / Idaho / Wyoming" form={form} set={set} errors={errors} />
              <FInp field="distributor_names" label="Distributors You Rep For" placeholder="Acumed, Arthrex, Stryker..." form={form} set={set} errors={errors} />
              <FInp field="current_tools" label="What do you use today?" placeholder="Notes app, spreadsheets..." form={form} set={set} errors={errors} />
              <div style={{ marginBottom: 16 }}>
                <label style={s.formLabel}>Biggest PO/commission pain point? *</label>
                <textarea style={{ ...s.formInput, minHeight: 80, resize: "vertical", ...(errors.biggest_pain_point ? { borderColor: T.red } : {}) }} placeholder="Describe what frustrates you most..." value={form.biggest_pain_point} onChange={(e) => set("biggest_pain_point", e.target.value)} />
                {errors.biggest_pain_point && <span style={s.formErr}>{errors.biggest_pain_point}</span>}
              </div>
            </>}

            {step === 2 && <>
              <div style={{ marginBottom: 16 }}>
                <label style={s.formLabel}>Invite Code *</label>
                <input style={{ ...s.formInput, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, textAlign: "center", fontFamily: T.fontMono, ...(errors.invite_code ? { borderColor: T.red } : {}) }} value={form.invite_code} onChange={(e) => set("invite_code", e.target.value.toUpperCase())} placeholder="BETA-MRD-2026-XXXX" />
                {errors.invite_code && <span style={s.formErr}>{errors.invite_code}</span>}
              </div>
              <FInp field="referred_by_name" label="Who referred you? (optional)" placeholder="Ryan, John..." form={form} set={set} errors={errors} />
              <div style={{ display: "flex", gap: 12, background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.2)", borderRadius: 10, padding: 14, marginTop: 8 }}>
                <span style={{ fontSize: 18 }}>💬</span>
                <div>
                  <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 13, fontFamily: T.fontHead }}>You'll get a Discord invite after approval</div>
                  <div style={{ color: T.textSecondary, fontSize: 12, fontFamily: T.fontBody, marginTop: 3 }}>Real-time support, feature previews, and direct access to Ryan.</div>
                </div>
              </div>
            </>}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {step > 0 && <button style={s.secondaryBtn} onClick={back}>← Back</button>}
              {step < 2 && <button style={s.primaryBtn} onClick={next}>Continue →</button>}
              {step === 2 && <button style={{ ...s.primaryBtn, opacity: submitting ? 0.7 : 1 }} onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Application →"}</button>}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

/* ─── Shared components ──────────────────────────────────────────────────── */
export function Nav({ activePage }) {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(9,9,11,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#fff", fontFamily: T.fontHead }}>M</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontFamily: T.fontHead }}>MedRepDesk</span>
        </a>
        <div style={{ display: "flex", gap: 4 }}>
          {[["🐛 Bug Report", "/beta/bugs"], ["💡 Features", "/beta/features"], ["📊 My Progress", "/beta/dashboard"], ["💬 Discord", "https://discord.gg/medrepdesk"]].map(([label, href]) => (
            <a key={href} href={href} style={{ color: T.textSecondary, fontSize: 13, fontFamily: T.fontBody, textDecoration: "none", padding: "5px 12px", borderRadius: 6 }}>{label}</a>
          ))}
        </div>
        <div style={{ background: "rgba(245,158,11,0.1)", color: T.amberBright, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, letterSpacing: "1.5px", fontFamily: T.fontHead, border: "1px solid rgba(245,158,11,0.25)" }}>BETA</div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "36px 24px", background: T.bgBase }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff", fontFamily: T.fontHead }}>M</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: T.fontHead }}>MedRepDesk</span>
        </div>
        <p style={{ color: T.textMuted, fontSize: 13, fontFamily: T.fontBody, margin: "0 0 12px" }}>Built for the reps who move instruments, chase POs, and make it happen.</p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["Privacy Policy", "#"], ["Terms of Service", "#"], ["beta@medrepdesk.io", "mailto:beta@medrepdesk.io"]].map(([label, href]) => (
            <a key={label} href={href} style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontBody, textDecoration: "none" }}>{label}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

function FInp({ field, label, type = "text", placeholder, form, set, errors }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.formLabel}>{label}</label>
      <input type={type} style={{ ...s.formInput, ...(errors[field] ? { borderColor: T.red } : {}) }} value={form[field]} onChange={(e) => set(field, e.target.value)} placeholder={placeholder} />
      {errors[field] && <span style={s.formErr}>{errors[field]}</span>}
    </div>
  );
}
function FSel({ field, label, options, form, set, errors }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.formLabel}>{label}</label>
      <select style={{ ...s.formInput, ...(errors[field] ? { borderColor: T.red } : {}) }} value={form[field]} onChange={(e) => set(field, e.target.value)}>
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {errors[field] && <span style={s.formErr}>{errors[field]}</span>}
    </div>
  );
}

const s = {
  page: { background: T.bgBase, minHeight: "100vh", color: T.textPrimary },
  centerPage: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)", padding: 24 },
  section: { padding: "72px 24px" },
  sectionInner: { maxWidth: 1000, margin: "0 auto" },
  glassCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 30px", maxWidth: 480, width: "100%" },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: T.blue, fontFamily: T.fontHead, marginBottom: 12, textTransform: "uppercase" },
  h1: { fontSize: "clamp(2.4rem,6vw,4rem)", fontWeight: 800, fontFamily: T.fontHead, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20, color: T.textPrimary },
  h2: { fontSize: "clamp(1.6rem,3vw,2rem)", fontWeight: 800, fontFamily: T.fontHead, letterSpacing: "-0.5px", color: T.textPrimary },
  h2center: { fontSize: "clamp(1.6rem,3vw,2rem)", fontWeight: 800, fontFamily: T.fontHead, letterSpacing: "-0.5px", color: T.textPrimary, textAlign: "center", marginBottom: 10 },
  bodyText: { color: T.textSecondary, fontSize: 15, lineHeight: 1.7, fontFamily: T.fontBody },
  subText: { color: T.textSecondary, textAlign: "center", fontSize: 15, fontFamily: T.fontBody, marginBottom: 36, lineHeight: 1.6 },
  pill: { display: "inline-flex", alignItems: "center", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontFamily: T.fontBody, color: T.textSecondary, marginBottom: 24 },
  hero: { position: "relative", padding: "96px 24px 80px", textAlign: "center", overflow: "hidden" },
  heroGlow: { position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% 0%,rgba(59,130,246,0.12) 0%,transparent 70%)", pointerEvents: "none" },
  statsRow: { display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 32px", marginBottom: 32 },
  statItem: { textAlign: "center", padding: "0 24px" },
  statNum: { display: "block", fontSize: 26, fontWeight: 800, fontFamily: T.fontHead, color: T.blueBright },
  statLabel: { display: "block", fontSize: 11, color: T.textMuted, fontFamily: T.fontBody, marginTop: 2, letterSpacing: "0.5px" },
  cta: { display: "inline-block", background: T.blue, color: "#fff", borderRadius: 8, padding: "13px 28px", fontSize: 15, fontWeight: 700, fontFamily: T.fontHead, textDecoration: "none" },
  formLabel: { display: "block", fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 6, fontFamily: T.fontBody, letterSpacing: "0.3px" },
  formInput: { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: T.textPrimary, outline: "none", fontFamily: T.fontBody, boxSizing: "border-box", appearance: "none" },
  formErr: { color: T.red, fontSize: 11, marginTop: 4, display: "block", fontFamily: T.fontBody },
  primaryBtn: { flex: 1, padding: "13px", background: T.blue, color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: T.fontHead, cursor: "pointer" },
  secondaryBtn: { padding: "12px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: T.textSecondary, fontSize: 14, fontWeight: 600, fontFamily: T.fontBody, cursor: "pointer" },
};
