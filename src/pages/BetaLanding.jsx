import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ─── Design tokens — MedRepDesk dark system ──────────────────────────────── */
const T = {
  bg: "#09090b",
  bgCard: "rgba(255,255,255,0.03)",
  bgCardHover: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.15)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.12)",
  blueBright: "#60a5fa",
  teal: "#10b981",
  tealDim: "rgba(16,185,129,0.1)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  white: "#ffffff",
  muted: "rgba(255,255,255,0.45)",
  dim: "rgba(255,255,255,0.2)",
  fontHead: "'Outfit', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

/* ─── Founding Member badge colors ────────────────────────────────────────── */
const MEMBER_TIERS = [
  {
    id: "charter",
    label: "Charter Member",
    number: "#001–#010",
    spots: 10,
    color: "#f5c542",
    glow: "rgba(245,197,66,0.25)",
    border: "rgba(245,197,66,0.35)",
    perks: [
      "Lifetime rate locked forever",
      "Your name in the app's founding credits",
      "Direct line to Ryan (personal cell)",
      "Shape the roadmap — your cases, your features",
      "First access to every new feature",
      "Beta Founder badge on your profile",
    ],
    icon: "⭐",
    urgency: "3 of 10 remaining",
  },
  {
    id: "founder",
    label: "Founding Rep",
    number: "#011–#025",
    spots: 15,
    color: "#c0c0c0",
    glow: "rgba(192,192,192,0.15)",
    border: "rgba(192,192,192,0.25)",
    perks: [
      "Lifetime rate locked forever",
      "Founding Rep badge on your profile",
      "Priority feature request voting",
      "Monthly group call with Ryan",
      "Early access to all new features",
    ],
    icon: "🔷",
    urgency: "12 of 15 remaining",
  },
];

const SPECIALTIES = [
  "Orthopedic", "Spine", "Trauma", "Sports Medicine",
  "Cardiovascular", "Neurosurgery", "General Surgery", "Other",
];

const VOLUMES = [
  "Under 10 cases/mo", "10–25 cases/mo", "25–50 cases/mo", "50+ cases/mo",
];

const TOOLS = [
  "Spreadsheets", "Notes app", "Nothing / memory",
  "Generic CRM", "Paper", "Other",
];

/* ─── Calendar data — real 2-week window ─────────────────────────────────── */
function getCalendarSlots() {
  const slots = [];
  const today = new Date();
  // Generate slots for next 14 days, skip weekends
  for (let d = 1; d <= 18; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const weekday = date.toLocaleString("en-US", { weekday: "short" });
    // 3 time slots per day (Mountain Time)
    const times = ["9:00 AM", "12:00 PM", "3:30 PM"];
    // Simulate some booked slots for realism
    const bookedPattern = [0, 2, 1, 0, 1, 0, 2, 1, 0, 1];
    const bookedIdx = bookedPattern[slots.length % 10];
    times.forEach((time, i) => {
      slots.push({
        id: `${month}${day}-${i}`,
        date: `${weekday}, ${month} ${day}`,
        time,
        tz: "MT",
        booked: i === bookedIdx,
      });
    });
    if (slots.length >= 30) break;
  }
  return slots;
}

/* ─── Step tracker ────────────────────────────────────────────────────────── */
const STEPS = ["Your Info", "Your Workflow", "Select Your Spot", "Schedule Call"];

export default function BetaLanding_v2() {
  const [step, setStep] = useState(0); // 0 = landing, 1-4 = form steps
  const [submitted, setSubmitted] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [spotsLeft] = useState(25);
  const [tickCount, setTickCount] = useState(0);
  const calendarSlots = getCalendarSlots();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", territory: "",
    specialty: "", volume: "", currentTool: "",
    biggestPain: "", heardFrom: "",
  });

  // Pulse animation tick
  useEffect(() => {
    const t = setInterval(() => setTickCount(c => c + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const isFormStep = step >= 1 && step <= 4;

  function handleLandingCTA(tierId) {
    setSelectedTier(tierId);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (step < 4) setStep(s => s + 1);
  }
  function handleBack() {
    if (step > 1) setStep(s => s - 1);
    else setStep(0);
  }
  async function handleSubmit() {
    try {
      const { data, error } = await supabase
        .from('beta_signups')
        .insert({
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          territory: form.territory,
          specialty: form.specialty,
          cases_per_month: form.volume,
          current_tools: form.currentTool,
          biggest_pain_point: form.biggestPain,
          referred_by_name: form.heardFrom,
          tier: selectedTier || 'bronze',
          invite_code: 'BETA_V2_DIRECT',
          admin_notes: selectedSlot ? `Selected slot: ${selectedSlot.date} at ${selectedSlot.time}` : null,
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
  }

  const tier = MEMBER_TIERS.find(t => t.id === selectedTier);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.fontBody, color: T.white }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #09090b; }
        ::selection { background: rgba(59,130,246,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.2); }
          50% { box-shadow: 0 0 35px rgba(59,130,246,0.4); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .fadeUp { animation: fadeUp 0.5s ease forwards; }
        .fadeUp-1 { animation: fadeUp 0.5s 0.1s ease both; }
        .fadeUp-2 { animation: fadeUp 0.5s 0.2s ease both; }
        .fadeUp-3 { animation: fadeUp 0.5s 0.3s ease both; }
        .fadeUp-4 { animation: fadeUp 0.5s 0.4s ease both; }

        .btn-primary {
          background: ${T.blue};
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-family: ${T.fontBody};
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          animation: glow 3s ease-in-out infinite;
        }
        .btn-primary:hover {
          background: ${T.blueBright};
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: transparent;
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 12px 24px;
          border-radius: 10px;
          font-family: ${T.fontBody};
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          border-color: rgba(255,255,255,0.25);
          color: white;
        }
        .input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 13px 16px;
          color: white;
          font-family: ${T.fontBody};
          font-size: 15px;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
        }
        .input:focus { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.04); }
        .input::placeholder { color: rgba(255,255,255,0.25); }
        select.input option { background: #1a1a1e; color: white; }
        textarea.input { resize: vertical; min-height: 100px; }
        .label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.55); margin-bottom: 7px; display: block; }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 24px;
          transition: all 0.2s;
        }
        .card:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); }
        .slot-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.15s;
          color: white;
          font-family: ${T.fontBody};
          font-size: 13px;
          text-align: left;
        }
        .slot-btn:hover:not(.booked) {
          border-color: rgba(59,130,246,0.4);
          background: rgba(59,130,246,0.06);
        }
        .slot-btn.selected {
          border-color: ${T.blue};
          background: rgba(59,130,246,0.1);
        }
        .slot-btn.booked {
          opacity: 0.3;
          cursor: not-allowed;
          text-decoration: line-through;
        }
        .tier-card {
          border-radius: 16px;
          padding: 28px;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .tier-card:hover { transform: translateY(-3px); }
        .tier-card.selected { transform: translateY(-3px) scale(1.01); }
        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e;
          display: inline-block;
          animation: pulse 2s ease-in-out infinite;
          margin-right: 6px;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #f5c542 0%, #fff 40%, #f5c542 60%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 18, letterSpacing: "-0.03em" }}>
          <span style={{ color: T.blue }}>Med</span>RepDesk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.fontMono }}>
            {spotsLeft} spots left
          </span>
        </div>
      </nav>

      {/* ─────────────── LANDING PAGE ─────────────────────────────────────── */}
      {step === 0 && !submitted && <LandingPage onCTA={handleLandingCTA} tickCount={tickCount} />}

      {/* ─────────────── MULTI-STEP FORM ──────────────────────────────────── */}
      {isFormStep && !submitted && (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>

          {/* Step Progress */}
          <div className="fadeUp" style={{ marginBottom: 36 }}>
            {tier && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: tier.glow, border: `1px solid ${tier.border}`,
                borderRadius: 20, padding: "5px 14px", marginBottom: 20,
              }}>
                <span style={{ fontSize: 14 }}>{tier.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: tier.color }}>{tier.label} Application</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: i < step ? T.blue : i === step ? `linear-gradient(90deg, ${T.blue}, rgba(59,130,246,0.3))` : "rgba(255,255,255,0.1)",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              Step {step} of {STEPS.length} — <span style={{ color: T.white }}>{STEPS[step - 1]}</span>
            </div>
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="fadeUp">
              <h2 style={{ fontFamily: T.fontHead, fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.03em" }}>
                Tell us who you are
              </h2>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>
                Ryan personally reviews every application. Real info only.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label className="label">Full name *</label>
                    <input className="input" placeholder="Sarah Mitchell" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input className="input" placeholder="(801) 555-0123" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Email address *</label>
                  <input className="input" type="email" placeholder="sarah@yourcompany.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Territory / Region</label>
                  <input className="input" placeholder="Salt Lake City, UT + surrounding" value={form.territory}
                    onChange={e => setForm(f => ({ ...f, territory: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Primary specialty *</label>
                  <select className="input" value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Workflow */}
          {step === 2 && (
            <div className="fadeUp">
              <h2 style={{ fontFamily: T.fontHead, fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.03em" }}>
                Your current workflow
              </h2>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>
                This is how Ryan will set up your call. No wrong answers.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label className="label">Monthly case volume *</label>
                  <select className="input" value={form.volume}
                    onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}>
                    <option value="">Select volume</option>
                    {VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">How do you currently track cases & POs? *</label>
                  <select className="input" value={form.currentTool}
                    onChange={e => setForm(f => ({ ...f, currentTool: e.target.value }))}>
                    <option value="">Select your current method</option>
                    {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Biggest pain in your current process *</label>
                  <textarea className="input" placeholder="Be brutally honest. Chasing POs? Losing track of commissions? Forgetting follow-ups? Tell us exactly what drives you crazy."
                    value={form.biggestPain}
                    onChange={e => setForm(f => ({ ...f, biggestPain: e.target.value }))} />
                </div>
                <div>
                  <label className="label">How'd you hear about MedRepDesk?</label>
                  <input className="input" placeholder="Referral, LinkedIn, word of mouth..." value={form.heardFrom}
                    onChange={e => setForm(f => ({ ...f, heardFrom: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Tier selection */}
          {step === 3 && (
            <div className="fadeUp">
              <h2 style={{ fontFamily: T.fontHead, fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.03em" }}>
                Select your founding spot
              </h2>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>
                Both tiers lock in <strong style={{ color: T.white }}>$129/mo forever</strong>. The difference is depth of access.
              </p>

              {/* Pricing clarity box */}
              <div style={{
                background: T.tealDim, border: `1px solid rgba(16,185,129,0.2)`,
                borderRadius: 12, padding: "14px 18px", marginBottom: 24,
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <div style={{ fontSize: 13, color: T.white, lineHeight: 1.6 }}>
                  <strong>How this works:</strong> You pay $129/mo starting after the 6-week beta. No free period — but your rate is locked for life, no matter what the price goes to. The beta itself requires real use and real feedback. That's the deal.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {MEMBER_TIERS.map(t => (
                  <div key={t.id}
                    className={`tier-card ${selectedTier === t.id ? "selected" : ""}`}
                    onClick={() => setSelectedTier(t.id)}
                    style={{
                      background: selectedTier === t.id ? `rgba(${t.id === "charter" ? "245,197,66" : "192,192,192"},0.06)` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selectedTier === t.id ? t.color : "rgba(255,255,255,0.08)"}`,
                      boxShadow: selectedTier === t.id ? `0 0 28px ${t.glow}` : "none",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{t.icon}</span>
                          <span style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 18, color: t.color }}>{t.label}</span>
                        </div>
                        <div style={{ fontSize: 12, fontFamily: T.fontMono, color: T.muted }}>Member {t.number}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: t.color, fontWeight: 600, marginBottom: 2 }}>⚡ {t.urgency}</div>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          border: `2px solid ${selectedTier === t.id ? t.color : "rgba(255,255,255,0.2)"}`,
                          background: selectedTier === t.id ? t.color : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s",
                        }}>
                          {selectedTier === t.id && <span style={{ fontSize: 12, color: "#000" }}>✓</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {t.perks.map(p => (
                        <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{ color: t.color, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Schedule the call */}
          {step === 4 && (
            <div className="fadeUp">
              <h2 style={{ fontFamily: T.fontHead, fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.03em" }}>
                Schedule your onboarding call
              </h2>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 8 }}>
                This is a 20-minute call with Ryan — not a sales call. It's how he sets up the app specifically for your workflow before you get access.
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: T.blueDim, borderRadius: 8, padding: "6px 12px", marginBottom: 28,
              }}>
                <span style={{ fontSize: 12 }}>📞</span>
                <span style={{ fontSize: 12, color: T.blueBright }}>All times Mountain Time · Google Meet or phone</span>
              </div>

              {/* Group slots by date */}
              <CalendarSlots slots={calendarSlots} selected={selectedSlot} onSelect={setSelectedSlot} />
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
            <button className="btn-secondary" onClick={handleBack}>
              ← Back
            </button>
            {step < 4 ? (
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleNext}
                disabled={
                  (step === 1 && (!form.name || !form.email || !form.specialty)) ||
                  (step === 2 && (!form.volume || !form.biggestPain)) ||
                  (step === 3 && !selectedTier)
                }>
                Continue →
              </button>
            ) : (
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit}
                disabled={!selectedSlot}>
                Confirm Application + Call
              </button>
            )}
          </div>

          {step === 1 && (
            <p style={{ fontSize: 12, color: T.dim, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
              🔒 Your information is private and never shared. Ryan reads every application himself.
            </p>
          )}
        </div>
      )}

      {/* ─────────────── SUCCESS STATE ────────────────────────────────────── */}
      {submitted && <SuccessScreen form={form} selectedTier={selectedTier} selectedSlot={selectedSlot} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  LANDING PAGE                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function LandingPage({ onCTA, tickCount }) {
  const isOdd = tickCount % 2 === 0;

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{
        maxWidth: 720, margin: "0 auto", padding: "72px 24px 60px",
        textAlign: "center",
      }}>
        {/* Exclusivity badge */}
        <div className="fadeUp" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(245,197,66,0.08)", border: "1px solid rgba(245,197,66,0.2)",
          borderRadius: 20, padding: "6px 16px", marginBottom: 28,
        }}>
          <span style={{ fontSize: 13 }}>⭐</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#f5c542", fontFamily: T.fontMono, letterSpacing: "0.05em" }}>
            FOUNDING MEMBER PROGRAM · 25 REPS ONLY
          </span>
        </div>

        {/* Headline */}
        <h1 className="fadeUp-1" style={{
          fontFamily: T.fontHead, fontSize: "clamp(38px, 7vw, 64px)",
          fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em",
          marginBottom: 24,
        }}>
          You're not a beta tester.<br />
          <span style={{
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            You're a co-founder.
          </span>
        </h1>

        <p className="fadeUp-2" style={{
          fontSize: "clamp(16px, 2.5vw, 19px)", color: "rgba(255,255,255,0.6)",
          lineHeight: 1.65, maxWidth: 540, margin: "0 auto 40px",
        }}>
          25 independent device reps will shape every feature, workflow, and decision before MedRepDesk opens to the public.
          Your rate is locked forever. Your name is in the credits.
        </p>

        {/* Social proof ticker */}
        <div className="fadeUp-3" style={{
          display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 44,
        }}>
          {[
            { icon: "⚡", label: "13 spots taken this week" },
            { icon: "🔒", label: "Rate locked forever" },
            { icon: "📞", label: "Personal call with Ryan" },
          ].map(item => (
            <div key={item.label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "7px 14px",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="fadeUp-4" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" style={{ padding: "16px 32px", fontSize: 16 }}
            onClick={() => onCTA("charter")}>
            Apply for Charter Member ⭐
          </button>
          <button className="btn-secondary" style={{ padding: "16px 24px" }}
            onClick={() => onCTA("founder")}>
            Apply as Founding Rep 🔷
          </button>
        </div>
        <p style={{ fontSize: 12, color: T.dim, marginTop: 14 }}>
          No free trial. No tire kickers. Real reps building the real tool.
        </p>
      </section>

      {/* ── WHAT IS THIS ── */}
      <section style={{
        maxWidth: 720, margin: "0 auto", padding: "0 24px 64px",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20, padding: "36px 32px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Quote accent */}
          <div style={{
            position: "absolute", top: 20, right: 28,
            fontSize: 80, color: "rgba(59,130,246,0.06)", fontFamily: T.fontHead,
            lineHeight: 1, userSelect: "none",
          }}>"</div>

          <h2 style={{
            fontFamily: T.fontHead, fontSize: 22, fontWeight: 700,
            marginBottom: 16, letterSpacing: "-0.02em",
          }}>
            A note from Ryan
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.8, marginBottom: 20 }}>
            I've been building MedRepDesk for reps who live and die by the PO cycle. I know the pain — the spreadsheets, the sticky notes, the calls that go unreturned, the commissions that come up short and you're not sure why.
          </p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.8, marginBottom: 20 }}>
            I'm not looking for 25 people to click around and file bug reports. I'm looking for 25 reps who will tell me exactly what's broken about their workflow and help me build the thing they've always needed. Before we open to the public, those 25 reps will have shaped every screen, every workflow, and every AI feature in this app.
          </p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>
            In return: your rate is $129/mo. Forever. No matter what. And you'll be one of the founding members whose name is permanently in the product.
          </p>
          <div style={{
            marginTop: 24, paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: T.fontHead, fontWeight: 700, fontSize: 16, color: "white",
            }}>R</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Ryan Rossiter</div>
              <div style={{ fontSize: 12, color: T.muted }}>Founder, MedRepDesk</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT TO EXPECT ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
        <h2 style={{
          fontFamily: T.fontHead, fontSize: 26, fontWeight: 700,
          marginBottom: 8, letterSpacing: "-0.03em",
        }}>
          What the 6 weeks look like
        </h2>
        <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>
          Not a free trial. A structured co-build.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { week: "Before Day 1", label: "20-min onboarding call with Ryan", desc: "Ryan sets up the app specifically for your case types, territory, and distributors. Not a demo — he's configuring it for you.", color: T.blue },
            { week: "Week 1–2", label: "Live with your real cases", desc: "Log your actual cases, chase real POs, track commissions. Not a sandbox. The full app, your real workflow.", color: T.teal },
            { week: "Week 3", label: "Week 3 check-in (15 min)", desc: "Quick call to hear what's working and what isn't. This directly drives that week's build sprint.", color: T.amber },
            { week: "Week 4–5", label: "AI features unlocked", desc: "Smart chase emails, PO extraction, commission anomaly detection — we refine these against your real data.", color: T.blue },
            { week: "Week 6", label: "PMF survey + offboarding", desc: "One question survey. If 40%+ of founding members say they'd be 'very disappointed' without the app, we launch.", color: T.teal },
            { week: "After Week 6", label: "Your $129/mo rate locks in", desc: "Auto-converts. No action needed. You're founding members. The price never moves for you.", color: "#f5c542" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", gap: 0, position: "relative",
            }}>
              {/* Timeline line */}
              <div style={{
                width: 28, flexShrink: 0,
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: item.color, marginTop: 16, flexShrink: 0,
                  boxShadow: `0 0 10px ${item.color}60`,
                }} />
                {i < 5 && <div style={{ flex: 1, width: 1, background: "rgba(255,255,255,0.07)", marginTop: 4 }} />}
              </div>
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12, padding: "14px 18px", marginBottom: 8, flex: 1,
              }}>
                <div style={{ fontSize: 11, fontFamily: T.fontMono, color: item.color, marginBottom: 4, fontWeight: 600 }}>
                  {item.week}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EXCLUSIVITY SIGNALS ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(245,197,66,0.06), rgba(59,130,246,0.04))",
          border: "1px solid rgba(245,197,66,0.15)",
          borderRadius: 20, padding: "32px 28px",
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontFamily: T.fontMono, color: "#f5c542", fontWeight: 600, marginBottom: 8 }}>
              WHY THIS IS DIFFERENT
            </div>
            <h2 style={{ fontFamily: T.fontHead, fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>
              This is not a free trial with a fancy name
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {[
              { icon: "🚫", what: "What most betas do", desc: "Give away free months, collect signups from anyone, get low-quality feedback, struggle to convert to paid." },
              { icon: "✅", what: "What this is", desc: "25 hand-selected reps. Paid from day one. Personal onboarding. Direct line to the founder. Real co-build." },
            ].map(item => (
              <div key={item.icon} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "20px",
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: item.icon === "✅" ? T.teal : T.muted }}>
                  {item.what}
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEMBER TIERS ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
        <h2 style={{ fontFamily: T.fontHead, fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.03em" }}>
          Choose your founding spot
        </h2>
        <p style={{ color: T.muted, fontSize: 14, marginBottom: 28 }}>
          Both lock your rate at $129/mo forever.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
          {MEMBER_TIERS.map(t => (
            <div key={t.id} style={{
              background: `rgba(${t.id === "charter" ? "245,197,66" : "192,192,192"},0.04)`,
              border: `1px solid ${t.border}`,
              borderRadius: 16, padding: "24px",
              boxShadow: `0 8px 32px ${t.glow}`,
              position: "relative", overflow: "hidden",
            }}>
              {t.id === "charter" && (
                <div style={{
                  position: "absolute", top: 14, right: -24,
                  background: "#f5c542", color: "#000",
                  fontSize: 10, fontWeight: 800, padding: "4px 32px",
                  transform: "rotate(35deg)", letterSpacing: "0.05em",
                }}>RARE</div>
              )}
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 20, color: t.color, marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.muted, marginBottom: 16 }}>Member {t.number} · {t.urgency}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {t.perks.map(p => (
                  <div key={p} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: t.color, fontSize: 12, flexShrink: 0, marginTop: 2 }}>✓</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{p}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{
                width: "100%", background: t.id === "charter" ? "#f5c542" : T.blue,
                color: t.id === "charter" ? "#000" : "#fff",
                animation: t.id === "charter" ? "glow 2s ease-in-out infinite" : undefined,
              }} onClick={() => onCTA(t.id)}>
                Apply for {t.label}
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: T.dim, textAlign: "center" }}>
          Both plans: $129/mo locked forever · 6-week beta · 20-min setup call with Ryan
        </p>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontFamily: T.fontHead, fontSize: 22, fontWeight: 700, marginBottom: 24, letterSpacing: "-0.02em" }}>
          Questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { q: "Why is there no free trial?", a: "Free trials attract people who aren't committed. We want 25 reps who are serious enough to pay — that's the filter. In return, you get a locked rate and direct access to the founder." },
            { q: "What if the app isn't ready enough for me?", a: "It might not be perfect — that's the point. You're getting access to help make it perfect. If you find a bug, that's a win. Report it, earn credits, watch Ryan fix it." },
            { q: "What does 'rate locked forever' actually mean?", a: "Your card is charged $129/mo from day one of launch until you cancel. MedRepDesk could go to $299/mo or more. You stay at $129. We're putting that in writing in your confirmation email." },
            { q: "What is the call for?", a: "Ryan will ask you about your case types, territories, distributors, and current workflow — then configure the app specifically for you before you ever log in. It's a 20-minute setup, not a demo." },
            { q: "What happens to my founding member status if I cancel?", a: "If you cancel and come back, you lose the locked rate and founding member status. The program is for people who stay." },
          ].map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── FAQ accordion item ─────────────────────────────────────────────────── */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, overflow: "hidden", marginBottom: 4,
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", textAlign: "left", background: "none", border: "none",
        padding: "16px 20px", cursor: "pointer", color: T.white,
        fontFamily: T.fontBody, fontSize: 14, fontWeight: 500,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
      }}>
        <span>{q}</span>
        <span style={{ color: T.muted, flexShrink: 0, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", fontSize: 18 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 16px", fontSize: 14, color: T.muted, lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}

/* ─── Calendar slots component ───────────────────────────────────────────── */
function CalendarSlots({ slots, selected, onSelect }) {
  // Group by date
  const grouped = {};
  slots.forEach(slot => {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date}>
          <div style={{ fontSize: 12, fontFamily: T.fontMono, color: T.muted, marginBottom: 10, fontWeight: 600 }}>
            {date}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {daySlots.map(slot => (
              <button key={slot.id}
                className={`slot-btn ${selected === slot.id ? "selected" : ""} ${slot.booked ? "booked" : ""}`}
                onClick={() => !slot.booked && onSelect(slot.id)}
                disabled={slot.booked}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{slot.time}</div>
                <div style={{ fontSize: 11, color: slot.booked ? "inherit" : T.muted, marginTop: 2 }}>
                  {slot.booked ? "Taken" : slot.tz}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {selected && (
        <div style={{
          background: T.tealDim, border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: 10, padding: "12px 16px", marginTop: 4,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div style={{ fontSize: 13 }}>
            <strong>Selected:</strong>{" "}
            <span style={{ color: T.teal }}>
              {slots.find(s => s.id === selected)?.date} at{" "}
              {slots.find(s => s.id === selected)?.time} MT
            </span>
          </div>
        </div>
      )}
      <p style={{ fontSize: 12, color: T.dim, lineHeight: 1.6 }}>
        You'll receive a Google Calendar invite + Meet link within 10 minutes of applying. If none of these times work, reply to the confirmation email and Ryan will find something.
      </p>
    </div>
  );
}

/* ─── Success screen ─────────────────────────────────────────────────────── */
function SuccessScreen({ form, selectedTier, selectedSlot }) {
  const tier = MEMBER_TIERS.find(t => t.id === selectedTier);
  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <div className="fadeUp" style={{ fontSize: 56, marginBottom: 24 }}>
        {tier?.icon || "🎉"}
      </div>
      <div className="fadeUp-1" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: `rgba(${selectedTier === "charter" ? "245,197,66" : "192,192,192"},0.08)`,
        border: `1px solid ${tier?.border}`,
        borderRadius: 20, padding: "6px 18px", marginBottom: 24,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: tier?.color }}>
          {tier?.label} Application Submitted
        </span>
      </div>
      <h1 className="fadeUp-2" style={{
        fontFamily: T.fontHead, fontSize: 32, fontWeight: 800,
        letterSpacing: "-0.04em", marginBottom: 14,
      }}>
        You're in, {form.name?.split(" ")[0] || "Rep"}.
      </h1>
      <p className="fadeUp-3" style={{ color: T.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
        Ryan will personally review your application and confirm your call within 24 hours.
        You'll get a Google Calendar invite + the app access link on the morning of your call.
      </p>
      <div className="fadeUp-4 card" style={{ textAlign: "left", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: T.white }}>What happens next:</div>
        {[
          { step: "1", text: "Confirmation email in the next few minutes (check spam)", done: true },
          { step: "2", text: "Ryan reviews your application (within 24 hours)", done: false },
          { step: "3", text: "Google Calendar invite + Meet link sent to your email", done: false },
          { step: "4", text: "20-min call — Ryan configures the app for your workflow", done: false },
          { step: "5", text: "Access link arrives. You're live.", done: false },
        ].map(item => (
          <div key={item.step} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: item.done ? T.teal : "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: item.done ? "#000" : T.muted,
              marginTop: 1,
            }}>
              {item.done ? "✓" : item.step}
            </div>
            <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: T.dim, lineHeight: 1.7 }}>
        Questions? Text or call Ryan directly:<br />
        <a href="tel:+18015550100" style={{ color: T.blueBright, textDecoration: "none" }}>
          Direct contact will be in your confirmation email
        </a>
      </p>
    </div>
  );
}
