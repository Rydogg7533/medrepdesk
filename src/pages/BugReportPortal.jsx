import { useState } from "react";

const T = {
  bgBase: "#09090b", bgCard: "rgba(255,255,255,0.03)", bgCardBorder: "rgba(255,255,255,0.08)",
  bgNav: "rgba(9,9,11,0.85)", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.35)", blue: "#3b82f6", blueBright: "#60a5fa",
  teal: "#10b981", tealBright: "#34d399", amber: "#f59e0b", amberBright: "#fbbf24",
  red: "#f87171", silver: "#c0c0c0",
  fontHead: "'Outfit', system-ui, sans-serif", fontBody: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

const SEVERITIES = [
  { value: "critical", label: "Critical", dot: "#f87171", desc: "App crashes, data loss, can't use core feature" },
  { value: "high", label: "High", dot: "#fb923c", desc: "Major feature broken, workaround is painful" },
  { value: "medium", label: "Medium", dot: "#fbbf24", desc: "Feature partially works, noticeable issue" },
  { value: "low", label: "Low", dot: "#34d399", desc: "Minor visual or UX issue" },
];
const CATEGORIES = [
  "Login / Auth","Cases","Purchase Orders","Commissions","Communications / Chase Log",
  "Contacts","Notifications","AI Features","PWA / Offline","Performance","UI / UX","Other",
];
const CAT_VALUES = [
  "auth","cases","purchase_orders","commissions","communications",
  "contacts","notifications","ai_features","pwa_install","performance","ui_ux","other",
];
const DEVICES = ["iPhone","Android","iPad","Desktop","Other"];

export default function BugReportPortal() {
  const [form, setForm] = useState({
    reporter_name:"", reporter_email:"", title:"", severity:"", category:"",
    description:"", steps_to_reproduce:"", expected_behavior:"", actual_behavior:"",
    device_type:"", os_version:"", browser:"",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    ["reporter_name","reporter_email","title","severity","category","description","steps_to_reproduce","expected_behavior","actual_behavior"]
      .forEach(k => { if (!form[k]?.trim()) e[k] = "Required"; });
    if (form.reporter_email && !/\S+@\S+\.\S+/.test(form.reporter_email)) e.reporter_email = "Valid email required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setReportId("BUG-" + Math.random().toString(36).substring(2,8).toUpperCase());
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={s.page}>
      <Nav />
      <div style={s.centerPage}>
        <div style={{ ...s.glassCard, maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐛</div>
          <div style={s.eyebrow}>REPORT RECEIVED</div>
          <h2 style={s.h2}>Bug Reported!</h2>
          <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 20px", fontFamily: T.fontMono, fontSize: 20, fontWeight: 700, color: T.blueBright, display: "inline-block", margin: "12px 0 16px" }}>{reportId}</div>
          <p style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, fontFamily: T.fontBody, marginBottom: 24 }}>
            The team will triage within 24 hours. Status updates posted in Discord. Save your report ID in case you want to follow up.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a href="https://discord.gg/medrepdesk" style={{ background: "#5865F2", color: "#fff", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: T.fontHead, textDecoration: "none", display: "block" }}>💬 Follow Up in Discord</a>
            <button style={s.secondaryBtn} onClick={() => { setSubmitted(false); setForm({ ...form, title:"", severity:"", category:"", description:"", steps_to_reproduce:"", expected_behavior:"", actual_behavior:"", device_type:"", os_version:"", browser:"" }); }}>Report Another Bug</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <Nav activePage="bugs" />
      <div style={s.container}>
        <div style={s.topBar}>
          <div>
            <div style={s.eyebrow}>BETA FEEDBACK</div>
            <h1 style={s.h1}>Bug Report</h1>
            <p style={{ color: T.textSecondary, fontSize: 14, fontFamily: T.fontBody, marginTop: 4 }}>The more detail you give us, the faster we fix it.</p>
          </div>
          <div style={s.tierPill}>
            <span style={{ fontSize: 18 }}>🥈</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.silver, fontFamily: T.fontHead }}>Counts toward Silver</div>
              <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody }}>Submit 3 reports total</div>
            </div>
          </div>
        </div>

        <div style={s.grid}>
          {/* LEFT */}
          <div>
            {/* Reporter */}
            <div style={s.card}>
              <div style={s.cardTitle}>Your Info</div>
              <FInp field="reporter_name" label="Name *" placeholder="Jane Smith" form={form} set={set} errors={errors} />
              <FInp field="reporter_email" label="Email *" type="email" placeholder="jane@example.com" form={form} set={set} errors={errors} />
            </div>

            {/* Severity */}
            <div style={s.card}>
              <div style={s.cardTitle}>Severity *</div>
              {errors.severity && <span style={s.formErr}>{errors.severity}</span>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SEVERITIES.map(sv => (
                  <div key={sv.value} onClick={() => set("severity", sv.value)} style={{ ...s.selectableRow, ...(form.severity === sv.value ? s.selectableActive : {}) }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: sv.dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: T.fontHead, color: form.severity === sv.value ? T.textPrimary : T.textSecondary }}>{sv.label}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody, marginTop: 1 }}>{sv.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category */}
            <div style={s.card}>
              <div style={s.cardTitle}>Category *</div>
              {errors.category && <span style={s.formErr}>{errors.category}</span>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {CATEGORIES.map((label, i) => (
                  <div key={CAT_VALUES[i]} onClick={() => set("category", CAT_VALUES[i])} style={{ ...s.chip, ...(form.category === CAT_VALUES[i] ? s.chipActive : {}) }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div style={s.card}>
              <div style={s.cardTitle}>Bug Details</div>
              <FInp field="title" label="One-line summary *" placeholder="e.g. Chase log doesn't save promised date" form={form} set={set} errors={errors} />
              <FTa field="description" label="What happened? *" placeholder="Describe the issue in detail..." form={form} set={set} errors={errors} rows={4} />
              <FTa field="steps_to_reproduce" label="Steps to reproduce *" placeholder={"1. Go to...\n2. Tap...\n3. Expected X, got Y..."} form={form} set={set} errors={errors} rows={5} />
              <FTa field="expected_behavior" label="What did you expect? *" placeholder="I expected the promised date to be saved..." form={form} set={set} errors={errors} rows={3} />
              <FTa field="actual_behavior" label="What actually happened? *" placeholder="The form closed but nothing was saved. Refresh shows no entry." form={form} set={set} errors={errors} rows={3} />
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Your Device (optional — helps us reproduce faster)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
                {DEVICES.map(d => (
                  <div key={d} onClick={() => set("device_type", d.toLowerCase())} style={{ ...s.chip, ...(form.device_type === d.toLowerCase() ? s.chipActive : {}) }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FInp field="os_version" label="OS Version" placeholder="iOS 17.4" form={form} set={set} errors={errors} />
                <FInp field="browser" label="Browser / App" placeholder="Safari, Chrome..." form={form} set={set} errors={errors} />
              </div>
            </div>

            <button style={{ ...s.primaryBtn, width: "100%", opacity: submitting ? 0.7 : 1 }} onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Bug Report 🐛"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: T.textMuted, fontFamily: T.fontBody, marginTop: 8 }}>
              Critical bugs get same-day attention from Ryan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Nav({ activePage }) {
  const pages = [["🐛 Bug Report","/beta/bugs","bugs"],["💡 Features","/beta/features","features"],["📊 My Progress","/beta/dashboard","dashboard"],["💬 Discord","https://discord.gg/medrepdesk","discord"]];
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: T.bgNav, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#fff", fontFamily: T.fontHead }}>M</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontFamily: T.fontHead }}>MedRepDesk</span>
        </a>
        <div style={{ display: "flex", gap: 4 }}>
          {pages.map(([label, href, key]) => (
            <a key={key} href={href} style={{ color: activePage === key ? T.textPrimary : T.textSecondary, fontSize: 13, fontFamily: T.fontBody, textDecoration: "none", padding: "5px 12px", borderRadius: 6, background: activePage === key ? "rgba(255,255,255,0.08)" : "transparent" }}>{label}</a>
          ))}
        </div>
        <div style={{ background: "rgba(245,158,11,0.1)", color: T.amberBright, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, letterSpacing: "1.5px", fontFamily: T.fontHead, border: "1px solid rgba(245,158,11,0.25)" }}>BETA</div>
      </div>
    </nav>
  );
}

function FInp({ field, label, type="text", placeholder, form, set, errors }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.formLabel}>{label}</label>
      <input type={type} style={{ ...s.formInput, ...(errors[field] ? { borderColor: T.red } : {}) }} value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
      {errors[field] && <span style={s.formErr}>{errors[field]}</span>}
    </div>
  );
}
function FTa({ field, label, placeholder, form, set, errors, rows=3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.formLabel}>{label}</label>
      <textarea style={{ ...s.formInput, minHeight: rows * 22, resize: "vertical", ...(errors[field] ? { borderColor: T.red } : {}) }} value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
      {errors[field] && <span style={s.formErr}>{errors[field]}</span>}
    </div>
  );
}

const s = {
  page: { background: T.bgBase, minHeight: "100vh", color: T.textPrimary },
  centerPage: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)", padding: 24 },
  container: { maxWidth: 1100, margin: "0 auto", padding: "36px 24px" },
  topBar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  tierPill: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px" },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: T.blue, fontFamily: T.fontHead, marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: 800, fontFamily: T.fontHead, letterSpacing: "-0.5px", color: T.textPrimary },
  h2: { fontSize: 26, fontWeight: 800, fontFamily: T.fontHead, letterSpacing: "-0.5px", color: T.textPrimary, marginBottom: 6 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, alignItems: "start" },
  card: { background: T.bgCard, border: `1px solid ${T.bgCardBorder}`, borderRadius: 14, padding: 22, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: T.textSecondary, fontFamily: T.fontHead, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", letterSpacing: "0.3px" },
  glassCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 30px" },
  selectableRow: { display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "10px 14px", cursor: "pointer" },
  selectableActive: { background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)" },
  chip: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer", color: T.textMuted, fontFamily: T.fontBody, fontWeight: 500 },
  chipActive: { borderColor: T.blue, background: "rgba(59,130,246,0.15)", color: T.blueBright, fontWeight: 600 },
  formLabel: { display: "block", fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5, fontFamily: T.fontBody },
  formInput: { width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: T.textPrimary, outline: "none", fontFamily: T.fontBody, boxSizing: "border-box", resize: "vertical" },
  formErr: { color: T.red, fontSize: 11, marginTop: 3, display: "block", fontFamily: T.fontBody },
  primaryBtn: { padding: "13px 24px", background: T.blue, color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: T.fontHead, cursor: "pointer" },
  secondaryBtn: { width: "100%", padding: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: T.textSecondary, fontSize: 14, fontWeight: 600, fontFamily: T.fontBody, cursor: "pointer" },
};
