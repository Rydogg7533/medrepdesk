import { useState } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────
// bg:        #09090f   near-black
// surface:   #0d1829   card background
// border:    #1a2438   subtle navy
// text:      #e8e8e8   primary
// muted:     #8a9ab5   secondary
// dim:       #445570   tertiary
// accent:    #d4a843   Stryker gold
//
// RADIUS: buttons/badges = 4px | cards/inputs = 8px | dots = 9999px
// FONTS:  IBM Plex Mono = headlines, labels, buttons
//         DM Sans       = body copy

const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap";

// ─── DIVIDER — always rendered OUTSIDE section containers ────
const Divider = () => (
  <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 40px" }}>
    <div style={{ height: 1, background: "#1a2438" }} />
  </div>
);

// ─── FEATURE GRID ────────────────────────────────────────────
// Individual cell borders (not divide-x/divide-y) + overflow:hidden
// so lines never bleed past the 8px rounded corners.
const features = [
  {
    title: "CASE PIPELINE",
    body: "Every case from scheduled through paid. Status advances automatically as you work — confirmed, completed, bill sheet in, PO requested, PO received, paid.",
  },
  {
    title: "PO CHASE WORKFLOW",
    body: "Log every call, email, and conversation. Track what each contact promised and when. Flag cases that have been chased too many times with no response.",
  },
  {
    title: "COMMISSION TRACKING",
    body: "Expected vs. received, per case, per distributor. When a number comes in short, you'll know immediately — not six weeks later when you're reconciling.",
  },
  {
    title: "AI CASE ENTRY",
    body: "Describe a case out loud or type a few words. AI structures it into the right fields. Photograph a PO and AI reads it. Less data entry, same record.",
  },
  {
    title: "WEEKLY DIGEST",
    body: "Monday morning: every open case, every overdue PO, every pending commission, every follow-up due. One read and you know exactly where everything stands.",
  },
  {
    title: "SMART ALERTS",
    body: "Promised date passed with no PO. Commission expected two weeks ago. Case tomorrow with no confirmation. You find out when it happens, not when you think to check.",
  },
];

const FeatureGrid = () => (
  <div
    style={{
      border: "1px solid #1a2438",
      borderRadius: 8,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
    }}
  >
    {features.map((f, i) => (
      <div
        key={f.title}
        style={{
          padding: "28px 28px 32px",
          borderRight: i % 2 === 0 ? "1px solid #1a2438" : "none",
          borderBottom: i < features.length - 2 ? "1px solid #1a2438" : "none",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#e8e8e8",
            marginBottom: 12,
          }}
        >
          {f.title}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#8a9ab5",
          }}
        >
          {f.body}
        </div>
      </div>
    ))}
  </div>
);

// ─── PRICING GRID ────────────────────────────────────────────
const plans = [
  {
    label: "SOLO REP",
    price: "$129",
    period: "/mo",
    desc: "Full platform. PO workflow, commission tracking, AI case entry, weekly digest. Everything a single rep needs.",
  },
  {
    label: "REP + ASSISTANT",
    price: "$199",
    period: "/mo",
    desc: "Everything in Solo plus a second seat, AI chase email drafting, voice responses, and commission discrepancy detection.",
  },
];

const PricingGrid = () => (
  <div
    style={{
      border: "1px solid #1a2438",
      borderRadius: 8,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
    }}
  >
    {plans.map((p, i) => (
      <div
        key={p.label}
        style={{
          padding: "32px 28px",
          borderRight: i === 0 ? "1px solid #1a2438" : "none",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#d4a843",
            marginBottom: 16,
          }}
        >
          {p.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 44,
              fontWeight: 700,
              color: "#e8e8e8",
              letterSpacing: "-0.02em",
            }}
          >
            {p.price}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#8a9ab5" }}>
            {p.period}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#8a9ab5",
          }}
        >
          {p.desc}
        </div>
      </div>
    ))}
  </div>
);

// ─── INVOLVEMENT GRID ────────────────────────────────────────
const involves = [
  {
    label: "A 20-MINUTE SETUP CALL",
    body: "Before you get access, Ryan gets on the phone with you. Not a demo — a setup. He configures the app around your actual workflow.",
  },
  {
    label: "FOUR WEEKS OF REAL USE",
    body: "Log your actual cases, chase your actual POs. This only works if you're using it on live work, not test data.",
  },
  {
    label: "HONEST FEEDBACK",
    body: "A check-in call at week two and a short survey at week four. Tell us what's working, what isn't, and what's missing. That's the whole ask.",
  },
  {
    label: "YOUR RATE, LOCKED",
    body: "When you finish the program, your rate is locked at $129/mo forever. Launch pricing will be higher. Yours won't change.",
  },
];

const InvolvementGrid = () => (
  <div
    style={{
      border: "1px solid #1a2438",
      borderRadius: 8,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
    }}
  >
    {involves.map((item, i) => (
      <div
        key={item.label}
        style={{
          padding: "28px 28px 32px",
          borderRight: i % 2 === 0 ? "1px solid #1a2438" : "none",
          borderBottom: i < involves.length - 2 ? "1px solid #1a2438" : "none",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#e8e8e8",
            marginBottom: 12,
          }}
        >
          {item.label}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#8a9ab5",
          }}
        >
          {item.body}
        </div>
      </div>
    ))}
  </div>
);

// ─── SHARED FORM STYLES ──────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  background: "#0d1829",
  border: "1px solid #1a2438",
  borderRadius: 8,
  color: "#e8e8e8",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#445570",
  display: "block",
  marginBottom: 6,
};

const specialties = [
  "Orthopedic — Hip & Knee",
  "Orthopedic — Spine",
  "Orthopedic — Shoulder & Extremity",
  "Orthopedic — Trauma",
  "Cardiovascular",
  "Neuro",
  "General Surgery",
  "Other",
];

const volumes = ["1–5 cases/week", "6–10 cases/week", "11–20 cases/week", "20+ cases/week"];

const tools = [
  "Spreadsheets / Excel",
  "Notes app / memory",
  "Veeva CRM",
  "Salesforce",
  "Other CRM",
  "Nothing formal",
];

// ─── APPLY FORM ──────────────────────────────────────────────
const ApplyForm = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", territory: "",
    specialty: "", volume: "", currentTool: "", biggestPain: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    // TODO: wire to Supabase beta_signups table
    // const { error } = await supabase.from('beta_signups').insert([form]);
    console.log("Beta signup:", form);
    setSubmitted(true);
  };

  const step1Valid = form.name && form.email;
  const step2Valid = form.specialty && form.volume && form.currentTool && form.biggestPain;

  const btnPrimary = (enabled) => ({
    padding: "13px 0",
    background: enabled ? "#d4a843" : "#1a2438",
    border: "none",
    borderRadius: 4,
    color: enabled ? "#09090f" : "#445570",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    cursor: enabled ? "pointer" : "default",
    transition: "all 0.2s",
    width: "100%",
  });

  const btnSecondary = {
    flex: 1,
    padding: "13px 0",
    background: "none",
    border: "1px solid #1a2438",
    borderRadius: 4,
    color: "#445570",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    cursor: "pointer",
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: "#d4a843",
            letterSpacing: "0.1em",
            marginBottom: 16,
          }}
        >
          APPLICATION RECEIVED
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            color: "#8a9ab5",
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          Ryan will reach out within 24 hours to schedule your setup call.
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#445570",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.1em",
            cursor: "pointer",
          }}
        >
          CLOSE
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Step progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              height: 2,
              flex: 1,
              borderRadius: 9999,
              background: s <= step ? "#d4a843" : "#1a2438",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>YOUR NAME *</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label style={labelStyle}>EMAIL *</label>
            <input
              style={inputStyle}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={labelStyle}>PHONE (OPTIONAL)</label>
            <input
              style={inputStyle}
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Best number to reach you"
            />
          </div>
          <div>
            <label style={labelStyle}>TERRITORY (OPTIONAL)</label>
            <input
              style={inputStyle}
              value={form.territory}
              onChange={(e) => set("territory", e.target.value)}
              placeholder="e.g. Denver Metro, Pacific Northwest"
            />
          </div>
          <button
            style={{ ...btnPrimary(step1Valid), marginTop: 8 }}
            onClick={() => step1Valid && setStep(2)}
          >
            CONTINUE →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>SPECIALTY *</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.specialty}
              onChange={(e) => set("specialty", e.target.value)}
            >
              <option value="">Select your specialty</option>
              {specialties.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>WEEKLY CASE VOLUME *</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.volume}
              onChange={(e) => set("volume", e.target.value)}
            >
              <option value="">Select volume</option>
              {volumes.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>CURRENT TRACKING TOOL *</label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.currentTool}
              onChange={(e) => set("currentTool", e.target.value)}
            >
              <option value="">How do you track today?</option>
              {tools.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>BIGGEST PAIN POINT *</label>
            <textarea
              style={{ ...inputStyle, height: 88, resize: "none", lineHeight: 1.6 }}
              value={form.biggestPain}
              onChange={(e) => set("biggestPain", e.target.value)}
              placeholder="What falls through the cracks most often in your current workflow?"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setStep(1)}>← BACK</button>
            <button
              style={{ ...btnPrimary(step2Valid), flex: 2 }}
              onClick={() => step2Valid && setStep(3)}
            >
              CONTINUE →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "#0d1829",
              border: "1px solid #1a2438",
              borderRadius: 8,
              padding: "20px",
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "#d4a843",
                marginBottom: 10,
              }}
            >
              SETUP CALL REQUIRED
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.7,
                color: "#8a9ab5",
              }}
            >
              Ryan will reach out within 24 hours to schedule a 20-minute setup call before you get
              access. This ensures the app is configured for your actual workflow on day one.
            </div>
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#445570",
              lineHeight: 1.6,
            }}
          >
            Applying as: <span style={{ color: "#e8e8e8" }}>{form.name}</span> ·{" "}
            <span style={{ color: "#e8e8e8" }}>{form.email}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setStep(2)}>← BACK</button>
            <button style={{ ...btnPrimary(true), flex: 2 }} onClick={handleSubmit}>
              SUBMIT APPLICATION →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MODAL ───────────────────────────────────────────────────
const Modal = ({ onClose }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
    onClick={onClose}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
    />
    <div
      style={{
        position: "relative",
        zIndex: 1,
        background: "#09090f",
        border: "1px solid #1a2438",
        borderRadius: 8,
        padding: "36px 32px",
        width: "100%",
        maxWidth: 480,
        maxHeight: "90vh",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: "#e8e8e8",
            letterSpacing: "0.05em",
          }}
        >
          REQUEST EARLY ACCESS
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#445570",
            cursor: "pointer",
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <ApplyForm onClose={onClose} />
    </div>
  </div>
);

// ─── EYEBROW ─────────────────────────────────────────────────
const Eyebrow = ({ children }) => (
  <div
    style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.15em",
      color: "#d4a843",
      marginBottom: 24,
    }}
  >
    {children}
  </div>
);

// ─── CTA BUTTON ──────────────────────────────────────────────
const CTAButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        padding: "14px 28px",
        background: hovered ? "#d4a843" : "none",
        border: "1px solid #d4a843",
        borderRadius: 4,
        color: hovered ? "#09090f" : "#d4a843",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        cursor: "pointer",
        transition: "background 0.2s, color 0.2s",
      }}
    >
      REQUEST EARLY ACCESS →
    </button>
  );
};

// ─── PAGE ────────────────────────────────────────────────────
export default function BetaLanding() {
  const [showModal, setShowModal] = useState(false);

  const section = { maxWidth: 760, margin: "0 auto", padding: "72px 40px" };

  return (
    <>
      <link rel="stylesheet" href={FONTS} />
      <div style={{ background: "#09090f", minHeight: "100vh", color: "#e8e8e8" }}>

        {/* NAV */}
        <nav
          style={{
            borderBottom: "1px solid #1a2438",
            padding: "0 40px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#09090f",
            zIndex: 50,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "#e8e8e8",
            }}
          >
            MedRepDesk
          </span>
          <a
            href="mailto:beta@medrepdesk.io"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "#445570",
              letterSpacing: "0.08em",
              textDecoration: "none",
            }}
          >
            beta@medrepdesk.io
          </a>
        </nav>

        {/* HERO — divider is NOT inside this section */}
        <section
          style={{
            ...section,
            paddingBottom: 96,
            background: "linear-gradient(180deg, #0d1829 0%, #09090f 100%)",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#d4a843",
              marginBottom: 32,
            }}
          >
            EARLY ACCESS · 10 REPS · STARTS NOW
          </div>
          <h1
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "clamp(26px, 4.5vw, 46px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              margin: "0 0 40px",
            }}
          >
            <span style={{ color: "#ffffff" }}>
              The PO chase is broken.
              <br />
              We built a fix.
            </span>
            <br />
            <span style={{ color: "#6b7a8d" }}>
              10 reps. Real cases. Tell
              <br />
              us what doesn't work.
            </span>
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              lineHeight: 1.75,
              color: "#8a9ab5",
              maxWidth: 560,
              margin: "0 0 16px",
            }}
          >
            MedRepDesk is the workflow tool independent device reps have been running on
            spreadsheets and memory for years. Every case, every chase, every promised date —
            tracked in one place, from your phone.
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              lineHeight: 1.75,
              color: "#8a9ab5",
              maxWidth: 560,
              margin: "0 0 48px",
            }}
          >
            We're testing it with a small group of reps before we open it up. No gimmicks. No
            referral games. If you fit the profile, we'd like to talk.
          </p>
          <CTAButton onClick={() => setShowModal(true)} />
        </section>

        <Divider />

        {/* WHAT IT DOES */}
        <section style={section}>
          <Eyebrow>WHAT IT DOES</Eyebrow>
          <FeatureGrid />
        </section>

        <Divider />

        {/* WHO WE'RE LOOKING FOR */}
        <section style={section}>
          <Eyebrow>WHO WE'RE LOOKING FOR</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "#8a9ab5",
                  margin: "0 0 16px",
                }}
              >
                Independent 1099 reps — primarily implant-focused. You're running your own book,
                billing your own cases, chasing your own POs. You know exactly which AP contact to
                call at which hospital and exactly how long they'll stall.
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "#8a9ab5",
                  margin: 0,
                }}
              >
                You're not looking for a CRM. You're not looking for a sales tool. You want the
                administrative side of this business to stop costing you money and mental energy.
              </p>
            </div>
            <div
              style={{
                border: "1px solid #1a2438",
                borderLeft: "2px solid #1a2438",
                borderRadius: 8,
                padding: "24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#d4a843",
                  marginBottom: 16,
                }}
              >
                GOOD FIT IF YOU:
              </div>
              {[
                "Run an independent 1099 book",
                "Primarily implant-focused (ortho, spine, cardio, neuro)",
                "Managing 5+ cases per week",
                "Currently tracking in spreadsheets, notes, or memory",
                "Willing to use the tool on real cases and give direct feedback",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: "#d4a843",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    —
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: "#8a9ab5",
                      lineHeight: 1.6,
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* NOTE FROM RYAN */}
        <section style={section}>
          <div style={{ borderLeft: "2px solid #d4a843", paddingLeft: 24 }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#d4a843",
                marginBottom: 16,
              }}
            >
              A NOTE FROM RYAN
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                lineHeight: 1.8,
                color: "#8a9ab5",
                margin: "0 0 12px",
              }}
            >
              I built this because I watched what it actually takes to run a 1099 device book. The
              OR part is straightforward. The part after — the bill sheets, the PO chasing, the AP
              calls, the commission reconciliation — that's where money gets left on the table every
              month.
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                lineHeight: 1.8,
                color: "#8a9ab5",
                margin: 0,
              }}
            >
              This isn't a beta test. It's a co-development program. If you join, I want to know
              every time something doesn't work the way you expect it to. That's the deal.
            </p>
          </div>
        </section>

        <Divider />

        {/* WHAT THIS INVOLVES */}
        <section style={section}>
          <Eyebrow>WHAT THIS INVOLVES</Eyebrow>
          <InvolvementGrid />
        </section>

        <Divider />

        {/* APPLY CTA */}
        <section style={{ ...section, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#d4a843",
              marginBottom: 20,
            }}
          >
            10 SPOTS · STARTS NOW
          </div>
          <h2
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "clamp(22px, 3.5vw, 32px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              margin: "0 0 16px",
            }}
          >
            If this is you, apply.
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: "#8a9ab5",
              maxWidth: 440,
              margin: "0 auto 36px",
              lineHeight: 1.7,
            }}
          >
            Takes 3 minutes. Ryan reads every application personally.
          </p>
          <CTAButton onClick={() => setShowModal(true)} />
        </section>

        {/* FOOTER */}
        <footer
          style={{
            borderTop: "1px solid #1a2438",
            padding: "24px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "#445570",
              letterSpacing: "0.05em",
            }}
          >
            © 2026 MedRepDesk
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#445570",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                }}
              >
                {l}
              </a>
            ))}
          </div>
        </footer>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </>
  );
}
