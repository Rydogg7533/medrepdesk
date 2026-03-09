import { useState } from "react";

const T = {
  bgBase: "#09090b", bgCard: "rgba(255,255,255,0.03)", bgCardBorder: "rgba(255,255,255,0.08)",
  bgNav: "rgba(9,9,11,0.85)", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.35)", blue: "#3b82f6", blueBright: "#60a5fa",
  teal: "#10b981", tealBright: "#34d399", amber: "#f59e0b", amberBright: "#fbbf24",
  red: "#f87171", silver: "#c0c0c0", gold: "#f5c542",
  fontHead: "'Outfit', system-ui, sans-serif", fontBody: "'Inter', system-ui, -apple-system, sans-serif",
};

const CATEGORIES = [
  { value: "cases", label: "📋 Cases", color: "#3b82f6" },
  { value: "purchase_orders", label: "📬 Purchase Orders", color: "#f59e0b" },
  { value: "commissions", label: "💰 Commissions", color: "#10b981" },
  { value: "communications", label: "📞 Communications", color: "#8b5cf6" },
  { value: "contacts", label: "👥 Contacts", color: "#ec4899" },
  { value: "dashboard", label: "📊 Dashboard", color: "#06b6d4" },
  { value: "ai_features", label: "🤖 AI Features", color: "#f97316" },
  { value: "notifications", label: "🔔 Notifications", color: "#f87171" },
  { value: "mobile_ux", label: "📱 Mobile UX", color: "#60a5fa" },
  { value: "reporting", label: "📈 Reporting", color: "#34d399" },
  { value: "integrations", label: "🔗 Integrations", color: "#a78bfa" },
  { value: "other", label: "✨ Other", color: "#94a3b8" },
];

const PRIORITIES = [
  { value: "nice_to_have", label: "Nice to have", icon: "👍" },
  { value: "would_use_often", label: "Would use often", icon: "⭐" },
  { value: "blocking_my_workflow", label: "Blocking my workflow", icon: "🚨" },
];

const STATUS = {
  submitted: { label: "New", color: T.textMuted },
  under_review: { label: "Under Review", color: T.amberBright },
  planned: { label: "Planned ✓", color: T.blueBright },
  in_progress: { label: "In Progress", color: "#a78bfa" },
  shipped: { label: "Shipped 🚀", color: T.tealBright },
  declined: { label: "Declined", color: T.red },
};

const SAMPLES = [
  { id:"s1", title:"Bulk status update for multiple POs", category:"purchase_orders", priority_for_user:"would_use_often", upvote_count:12, status:"planned", submitter_name:"Mike T.", description:"When I have 8 POs from the same facility, I need to update them all at once instead of one by one.", voted:false },
  { id:"s2", title:"Quick-add surgeon from case creation screen", category:"cases", priority_for_user:"would_use_often", upvote_count:9, status:"in_progress", submitter_name:"Sarah K.", description:"If a surgeon isn't in my list I have to exit, go to contacts, add them, then come back. Should be inline.", voted:false },
  { id:"s3", title:"Commission report PDF export (annual)", category:"commissions", priority_for_user:"blocking_my_workflow", upvote_count:8, status:"under_review", submitter_name:"Chris W.", description:"I need a year-end PDF of all commissions received for taxes. Currently no way to export.", voted:false },
  { id:"s4", title:"Dark mode", category:"mobile_ux", priority_for_user:"nice_to_have", upvote_count:6, status:"planned", submitter_name:"Dana R.", description:"Using the app in dark ORs, the white background is blinding.", voted:false },
  { id:"s5", title:"Recurring case templates for regular surgeons", category:"cases", priority_for_user:"would_use_often", upvote_count:5, status:"submitted", submitter_name:"Jason M.", description:"Dr. Kaplan does the same THA every week. I want a template so I only fill in the date.", voted:false },
];

export default function FeatureRequestPortal() {
  const [view, setView] = useState("board");
  const [requests, setRequests] = useState(SAMPLES);
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("votes");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ submitter_name:"", submitter_email:"", title:"", category:"", description:"", problem_being_solved:"", use_case:"", priority_for_user:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleVote = id => setRequests(prev => prev.map(r => r.id === id ? { ...r, voted: !r.voted, upvote_count: r.voted ? r.upvote_count - 1 : r.upvote_count + 1 } : r));

  const filtered = requests
    .filter(r => filterCat === "all" || r.category === filterCat)
    .sort((a, b) => sortBy === "votes" ? b.upvote_count - a.upvote_count : 0);

  const validate = () => {
    const e = {};
    ["submitter_name","submitter_email","title","category","description","problem_being_solved","priority_for_user"]
      .forEach(k => { if (!form[k]?.trim()) e[k] = "Required"; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitReq = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setRequests(prev => [{ id: "new-" + Date.now(), title: form.title, category: form.category, priority_for_user: form.priority_for_user, upvote_count: 1, status: "submitted", submitter_name: form.submitter_name, description: form.description, voted: true }, ...prev]);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div style={s.page}>
      <Nav activePage="features" />
      <div style={s.container}>
        <div style={s.topBar}>
          <div>
            <div style={s.eyebrow}>BETA FEEDBACK</div>
            <h1 style={s.h1}>Feature Requests</h1>
            <p style={{ color: T.textSecondary, fontSize: 14, fontFamily: T.fontBody, marginTop: 4 }}>Request a feature, upvote what matters to you, and watch it get built.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={s.tierPill}>
              <span>🥈</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.silver, fontFamily: T.fontHead }}>Counts toward Silver</div>
                <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody }}>Submit 3 total</div>
              </div>
            </div>
            <button style={view === "submit" ? s.secondaryBtn : s.primaryBtn} onClick={() => { setView(view === "submit" ? "board" : "submit"); setSubmitted(false); }}>
              {view === "submit" ? "← Back to Board" : "+ Submit Request"}
            </button>
          </div>
        </div>

        {view === "board" && (
          <>
            {/* Filters */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                <div style={{ ...s.chip, ...(filterCat === "all" ? s.chipActive : {}) }} onClick={() => setFilterCat("all")}>All</div>
                {CATEGORIES.map(c => (
                  <div key={c.value} style={{ ...s.chip, ...(filterCat === c.value ? { ...s.chipActive, borderColor: c.color + "60", color: c.color, background: c.color + "15" } : {}) }} onClick={() => setFilterCat(c.value)}>{c.label}</div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody }}>Sort:</span>
                <button style={{ ...s.sortBtn, ...(sortBy === "votes" ? s.sortBtnActive : {}) }} onClick={() => setSortBy("votes")}>Top Voted</button>
                <button style={{ ...s.sortBtn, ...(sortBy === "recent" ? s.sortBtnActive : {}) }} onClick={() => setSortBy("recent")}>Newest</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(r => {
                const sc = STATUS[r.status] || STATUS.submitted;
                const cat = CATEGORIES.find(c => c.value === r.category);
                const pri = PRIORITIES.find(p => p.value === r.priority_for_user);
                return (
                  <div key={r.id} style={{ ...s.card, display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <button onClick={() => toggleVote(r.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: r.voted ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${r.voted ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "8px 12px", cursor: "pointer", minWidth: 52, gap: 2, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, color: r.voted ? T.blueBright : T.textMuted }}>▲</span>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: T.fontHead, color: r.voted ? T.blueBright : T.textSecondary }}>{r.upvote_count}</span>
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: T.fontHead, color: T.textPrimary, margin: 0, lineHeight: 1.3 }}>{r.title}</h3>
                        <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, flexShrink: 0, fontFamily: T.fontHead }}>{sc.label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, margin: "0 0 10px", fontFamily: T.fontBody }}>{r.description}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {cat && <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: `${cat.color}15`, padding: "2px 8px", borderRadius: 4, fontFamily: T.fontHead }}>{cat.label}</span>}
                        {pri && <span style={{ fontSize: 11, color: T.textMuted, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, fontFamily: T.fontBody }}>{pri.icon} {pri.label}</span>}
                        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody }}>by {r.submitter_name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === "submit" && !submitted && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={s.glassCard}>
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: T.fontHead, color: T.textPrimary, marginBottom: 4 }}>Submit a Feature Request</h2>
              <p style={{ color: T.textSecondary, fontSize: 14, fontFamily: T.fontBody, marginBottom: 24 }}>The more context you give us, the higher the chance it gets built exactly how you need it.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FInp field="submitter_name" label="Name *" placeholder="Jane Smith" form={form} set={set} errors={errors} />
                <FInp field="submitter_email" label="Email *" type="email" placeholder="jane@example.com" form={form} set={set} errors={errors} />
              </div>
              <FInp field="title" label="Feature title *" placeholder="Short, clear — e.g. 'Bulk PO status update'" form={form} set={set} errors={errors} />

              <div style={{ marginBottom: 16 }}>
                <label style={s.formLabel}>Category *</label>
                {errors.category && <span style={s.formErr}>{errors.category}</span>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                  {CATEGORIES.map(c => (
                    <div key={c.value} onClick={() => set("category", c.value)} style={{ ...s.chip, ...(form.category === c.value ? { borderColor: c.color + "60", background: c.color + "15", color: c.color } : {}) }}>{c.label}</div>
                  ))}
                </div>
              </div>

              <FTa field="description" label="Describe the feature *" placeholder="What should it do? How should it work?" form={form} set={set} errors={errors} rows={3} />
              <FTa field="problem_being_solved" label="What problem does it solve? *" placeholder="Right now I have to... and it takes forever / causes me to miss..." form={form} set={set} errors={errors} rows={3} />
              <FTa field="use_case" label="Specific use case (optional)" placeholder="Walk us through a scenario where you'd use this..." form={form} set={set} errors={errors} rows={2} />

              <div style={{ marginBottom: 20 }}>
                <label style={s.formLabel}>How important is this? *</label>
                {errors.priority_for_user && <span style={s.formErr}>{errors.priority_for_user}</span>}
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  {PRIORITIES.map(p => (
                    <div key={p.value} onClick={() => set("priority_for_user", p.value)} style={{ flex: 1, border: `1px solid ${form.priority_for_user === p.value ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "12px 10px", cursor: "pointer", textAlign: "center", background: form.priority_for_user === p.value ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 20, marginBottom: 5 }}>{p.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: T.fontHead, color: form.priority_for_user === p.value ? T.blueBright : T.textSecondary }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button style={{ ...s.primaryBtn, width: "100%", opacity: submitting ? 0.7 : 1 }} onClick={submitReq} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Feature Request 💡"}
              </button>
            </div>
          </div>
        )}

        {view === "submit" && submitted && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 24px" }}>
            <div style={{ ...s.glassCard, maxWidth: 420, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
              <div style={s.eyebrow}>REQUEST SUBMITTED</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: T.fontHead, marginBottom: 10, color: T.textPrimary }}>It's Live on the Board!</h2>
              <p style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, fontFamily: T.fontBody, marginBottom: 24 }}>
                Other beta testers can upvote it to help us prioritize. Ryan reviews all submissions weekly.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button style={s.primaryBtn} onClick={() => { setView("board"); setSubmitted(false); }}>View the Board</button>
                <button style={s.secondaryBtn} onClick={() => { setSubmitted(false); setForm({ ...form, title:"", category:"", description:"", problem_being_solved:"", use_case:"", priority_for_user:"" }); }}>Submit Another</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({ activePage }) {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: T.bgNav, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#fff", fontFamily: T.fontHead }}>M</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontFamily: T.fontHead }}>MedRepDesk</span>
        </a>
        <div style={{ display: "flex", gap: 4 }}>
          {[["🐛 Bug Report","/beta/bugs","bugs"],["💡 Features","/beta/features","features"],["📊 My Progress","/beta/dashboard","dashboard"],["💬 Discord","https://discord.gg/medrepdesk","discord"]].map(([label, href, key]) => (
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
  container: { maxWidth: 1100, margin: "0 auto", padding: "36px 24px" },
  topBar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: T.blue, fontFamily: T.fontHead, marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: 800, fontFamily: T.fontHead, letterSpacing: "-0.5px", color: T.textPrimary },
  tierPill: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px" },
  card: { background: T.bgCard, border: `1px solid ${T.bgCardBorder}`, borderRadius: 12, padding: "18px 20px" },
  glassCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 30px" },
  chip: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer", color: T.textMuted, fontFamily: T.fontBody, fontWeight: 500 },
  chipActive: { borderColor: "rgba(59,130,246,0.5)", background: "rgba(59,130,246,0.15)", color: T.blueBright },
  sortBtn: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: T.textMuted, background: "transparent", fontFamily: T.fontBody },
  sortBtnActive: { borderColor: "rgba(59,130,246,0.4)", color: T.blueBright, background: "rgba(59,130,246,0.1)", fontWeight: 700 },
  formLabel: { display: "block", fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5, fontFamily: T.fontBody },
  formInput: { width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: T.textPrimary, outline: "none", fontFamily: T.fontBody, boxSizing: "border-box" },
  formErr: { color: T.red, fontSize: 11, marginTop: 3, display: "block", fontFamily: T.fontBody },
  primaryBtn: { padding: "12px 24px", background: T.blue, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: T.fontHead, cursor: "pointer" },
  secondaryBtn: { padding: "12px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: T.textSecondary, fontSize: 14, fontWeight: 600, fontFamily: T.fontBody, cursor: "pointer" },
};
