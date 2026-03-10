import { useState, useEffect, useRef } from "react";

// ─── MedRepDesk design tokens ──────────────────────────────────────────────
const T = {
  bg: "#09090b",
  bgCard: "rgba(255,255,255,0.03)",
  bgCardHover: "rgba(255,255,255,0.045)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.1)",
  blueBright: "#60a5fa",
  teal: "#10b981",
  tealDim: "rgba(16,185,129,0.08)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.08)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.08)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.08)",
  muted: "rgba(255,255,255,0.45)",
  dim: "rgba(255,255,255,0.2)",
  white: "#ffffff",
  fontHead: "'Outfit', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

// ─── Password gate ─────────────────────────────────────────────────────────
const OWNER_PASSWORD = "mrd2026";

// ─── Category config ───────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "workflow",    label: "Workflow",       color: T.blue,   icon: "⚡" },
  { id: "po",         label: "PO & Billing",   color: T.amber,  icon: "📄" },
  { id: "ai",         label: "AI Features",    color: T.purple, icon: "🤖" },
  { id: "mobile",     label: "Mobile UX",      color: T.teal,   icon: "📱" },
  { id: "reporting",  label: "Reporting",      color: "#fb923c",icon: "📊" },
  { id: "other",      label: "Other",          color: T.muted,  icon: "💡" },
];

const STATUSES = [
  { id: "idea",        label: "Idea",         color: T.muted  },
  { id: "considering", label: "Considering",  color: T.blue   },
  { id: "planned",     label: "Planned",      color: T.amber  },
  { id: "building",    label: "Building",     color: T.purple },
  { id: "shipped",     label: "Shipped",      color: T.teal   },
  { id: "wontdo",      label: "Won't Do",     color: T.red    },
];

const SOURCES = ["Ryan", "Beta Tester", "Public Request", "Research"];

// ─── Initial seed data ─────────────────────────────────────────────────────
const SEED_FEATURES = [
  {
    id: "f1", title: "AI-generated follow-up email drafts",
    description: "One tap drafts a professional chase email with full case/invoice context. Rep reviews and sends.",
    category: "ai", status: "building", priority: 5, source: "Ryan",
    isPublic: true, votes: 0, myNotes: "This is the AI Pro gating feature. Core to positioning.",
    tags: ["ai", "chase", "email"], createdAt: "2026-03-01",
  },
  {
    id: "f2", title: "PO photo extraction",
    description: "Photograph a PO and Claude extracts po_number, amount, date, facility automatically.",
    category: "ai", status: "shipped", priority: 5, source: "Ryan",
    isPublic: true, votes: 0, myNotes: "Already built. Edge function deployed.",
    tags: ["ai", "po", "extraction"], createdAt: "2026-02-15",
  },
  {
    id: "f3", title: "Geofence facility auto-detection",
    description: "When rep enters facility radius, AI agent primes with that facility's context. No Always On GPS — geofence only.",
    category: "mobile", status: "planned", priority: 4, source: "Ryan",
    isPublic: false, votes: 0, myNotes: "V2 feature. Don't want to promise this during beta. Schema ready (lat/lng on facilities).",
    tags: ["geofence", "voice", "mobile"], createdAt: "2026-02-20",
  },
  {
    id: "f4", title: "Mileage tracker tied to cases",
    description: "Geofence triggers facility arrival, rep confirms drive, logs miles to case. Year-end IRS export.",
    category: "workflow", status: "idea", priority: 3, source: "Ryan",
    isPublic: false, votes: 0, myNotes: "Free for all plans — retention/adoption play. Not a MileIQ competitor. Differentiator is case context.",
    tags: ["mileage", "tax", "v2"], createdAt: "2026-02-22",
  },
  {
    id: "f5", title: "Commission anomaly detection",
    description: "AI flags when distributor pays less than expected, tracks underpayment patterns over time.",
    category: "ai", status: "considering", priority: 4, source: "Ryan",
    isPublic: true, votes: 0, myNotes: "AI Pro gate. Need enough commission history to make patterns meaningful — may need 60+ days of data first.",
    tags: ["ai", "commission", "analytics"], createdAt: "2026-02-18",
  },
];

// ─── Persist to localStorage ───────────────────────────────────────────────
function usePersistedFeatures() {
  const [features, setFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem("mrd_features");
      return saved ? JSON.parse(saved) : SEED_FEATURES;
    } catch { return SEED_FEATURES; }
  });

  const save = (next) => {
    setFeatures(next);
    try { localStorage.setItem("mrd_features", JSON.stringify(next)); } catch {}
  };

  return [features, save];
}

// ─── Main component ────────────────────────────────────────────────────────
export default function FeatureBacklog() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [features, setFeatures] = usePersistedFeatures();
  const [view, setView] = useState("board"); // board | list | public
  const [filter, setFilter] = useState({ category: "all", status: "all", source: "all" });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "add" | feature.id
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  function login() {
    if (pw === OWNER_PASSWORD) { setAuthed(true); setPwError(false); }
    else { setPwError(true); setTimeout(() => setPwError(false), 1500); }
  }

  function addFeature(f) {
    const next = [{ ...f, id: `f${Date.now()}`, votes: 0, createdAt: new Date().toISOString().slice(0,10) }, ...features];
    setFeatures(next);
    setModal(null);
  }

  function updateFeature(id, updates) {
    setFeatures(features.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  function deleteFeature(id) {
    setFeatures(features.filter(f => f.id !== id));
    setModal(null);
  }

  function togglePublic(id) {
    updateFeature(id, { isPublic: !features.find(f => f.id === id).isPublic });
  }

  // AI: analyze feature and suggest improvements/concerns
  async function analyzeFeature(feature) {
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a product strategy advisor for MedRepDesk — a mobile-first SaaS for independent medical device sales reps (orthopedic, spine, cardiovascular). They track surgical cases, chase purchase orders, log commissions, and manage distributor relationships. The app has 3 tiers: Solo ($129/mo), AI Pro ($199/mo), Distributorship ($299/mo). Be concise, opinionated, and specific to this domain.`,
          messages: [{
            role: "user",
            content: `Analyze this feature request for MedRepDesk:

Title: ${feature.title}
Description: ${feature.description}
Category: ${feature.category}
Status: ${feature.status}
Priority: ${feature.priority}/5
My notes: ${feature.myNotes || "none"}

Give me:
1. **Build case** (1-2 sentences — why this matters for device reps)
2. **Risk or concern** (1-2 sentences — what could go wrong or what makes this hard)
3. **Tier recommendation** (which pricing tier should gate this, and why — 1 sentence)
4. **Ship it?** (Yes / No / Maybe — and one sentence why)

Be direct and specific. No filler.`
          }]
        })
      });
      const data = await resp.json();
      setAiSuggestion(data.content?.[0]?.text || "No response.");
    } catch (e) {
      setAiSuggestion("Error reaching Claude API.");
    }
    setAiLoading(false);
  }

  const filtered = features.filter(f => {
    if (filter.category !== "all" && f.category !== filter.category) return false;
    if (filter.status !== "all" && f.status !== filter.status) return false;
    if (filter.source !== "all" && f.source !== filter.source) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) &&
        !f.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const publicCount = features.filter(f => f.isPublic).length;
  const byStatus = (sid) => filtered.filter(f => f.status === sid);

  if (!authed) return <LoginScreen pw={pw} setPw={setPw} onLogin={login} error={pwError} />;

  const openFeature = modal && modal !== "add" ? features.find(f => f.id === modal) : null;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.fontBody, color: T.white }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fadeUp { animation: fadeUp 0.35s ease forwards; }
        .chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
          border: 1px solid; cursor: default; white-space: nowrap;
        }
        .btn {
          border: none; border-radius: 9px; padding: 9px 18px; font-size: 13px;
          font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .btn-blue { background: ${T.blue}; color: white; }
        .btn-blue:hover { background: ${T.blueBright}; }
        .btn-ghost { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); border: 1px solid ${T.border}; }
        .btn-ghost:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); color: white; }
        .btn-danger { background: rgba(248,113,113,0.12); color: ${T.red}; border: 1px solid rgba(248,113,113,0.2); }
        .btn-danger:hover { background: rgba(248,113,113,0.2); }
        .input {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9px; padding: 10px 14px; color: white;
          font-family: inherit; font-size: 14px; width: 100%; outline: none; transition: border-color 0.2s;
        }
        .input:focus { border-color: rgba(59,130,246,0.5); }
        .input::placeholder { color: rgba(255,255,255,0.2); }
        select.input option { background: #1a1a1e; }
        textarea.input { resize: vertical; min-height: 80px; }
        .label { font-size: 12px; color: ${T.muted}; margin-bottom: 6px; display: block; font-weight: 500; }
        .feature-card {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.15s;
          margin-bottom: 8px;
        }
        .feature-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); transform: translateX(2px); }
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          z-index: 200; display: flex; align-items: flex-start; justify-content: center;
          padding: 24px 16px; overflow-y: auto;
        }
        .modal {
          background: #111113; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px; padding: 28px; width: 100%; max-width: 620px;
          position: relative; animation: fadeUp 0.25s ease;
        }
        .tab { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
        .tab.active { background: rgba(255,255,255,0.08); color: white; }
        .tab.inactive { background: transparent; color: ${T.muted}; }
        .tab.inactive:hover { color: rgba(255,255,255,0.7); }
        .public-badge { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: ${T.teal}; }
        .private-badge { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: ${T.muted}; }
        .toggle-switch {
          width: 38px; height: 20px; border-radius: 10px; position: relative;
          cursor: pointer; transition: background 0.2s; border: none; padding: 0;
        }
        .toggle-knob {
          position: absolute; top: 3px; width: 14px; height: 14px; border-radius: 50%;
          background: white; transition: left 0.2s;
        }
      `}</style>

      {/* ── Top nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(9,9,11,0.92)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "0 20px", height: 54,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 16 }}>
            <span style={{ color: T.blue }}>Med</span>RepDesk
          </span>
          <span style={{ color: T.dim }}>·</span>
          <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>Feature Backlog</span>
          <span style={{
            fontSize: 11, fontFamily: T.fontMono, fontWeight: 600,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171", borderRadius: 6, padding: "2px 7px",
          }}>PRIVATE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>
            {publicCount} public · {features.length - publicCount} private
          </span>
          <button className="btn btn-blue" onClick={() => setModal("add")}>
            + Add Feature
          </button>
        </div>
      </nav>

      {/* ── View tabs + filters ── */}
      <div style={{
        borderBottom: `1px solid ${T.border}`,
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "board", label: "📋 Board" },
            { id: "list",  label: "☰ List" },
            { id: "public", label: `🌐 Public Preview (${publicCount})` },
          ].map(v => (
            <button key={v.id} className={`tab ${view === v.id ? "active" : "inactive"}`}
              onClick={() => setView(v.id)}>{v.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="input" style={{ width: 200, padding: "7px 12px", fontSize: 13 }}
            placeholder="Search features…" value={search}
            onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <select className="input" style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select className="input" style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            value={filter.source} onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}>
            <option value="all">All sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "20px" }}>

        {/* BOARD VIEW */}
        {view === "board" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}>
            {STATUSES.map(status => {
              const cols = byStatus(status.id);
              return (
                <div key={status.id}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.color }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>
                        {status.label}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: T.fontMono, color: T.dim }}>{cols.length}</span>
                  </div>
                  <div>
                    {cols.map(f => (
                      <FeatureCard key={f.id} feature={f} onClick={() => setModal(f.id)}
                        onTogglePublic={() => togglePublic(f.id)} />
                    ))}
                    {cols.length === 0 && (
                      <div style={{
                        border: `1px dashed rgba(255,255,255,0.06)`, borderRadius: 10,
                        padding: "20px 12px", textAlign: "center",
                        fontSize: 12, color: T.dim,
                      }}>Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
                No features match your filters.
              </div>
            )}
            {filtered
              .sort((a, b) => b.priority - a.priority)
              .map(f => (
                <FeatureRow key={f.id} feature={f}
                  onClick={() => setModal(f.id)}
                  onTogglePublic={() => togglePublic(f.id)}
                  onStatusChange={(s) => updateFeature(f.id, { status: s })} />
              ))}
          </div>
        )}

        {/* PUBLIC PREVIEW VIEW */}
        {view === "public" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              background: T.blueDim, border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 12, padding: "14px 18px", marginBottom: 24,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 16 }}>👁</span>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                This is how your feature board looks to beta testers and the public.
                Only features marked <strong style={{ color: T.teal }}>Public</strong> appear here.
                Toggle visibility from the Board or List view.
              </div>
            </div>
            <h2 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, marginBottom: 6, letterSpacing: "-0.03em" }}>
              MedRepDesk Roadmap
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>
              Features we're building, considering, and shipping — updated in real time.
            </p>
            {STATUSES.filter(s => s.id !== "wontdo").map(status => {
              const pub = features.filter(f => f.isPublic && f.status === status.id);
              if (pub.length === 0) return null;
              return (
                <div key={status.id} style={{ marginBottom: 28 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                    paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.color }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{status.label}</span>
                    <span style={{ fontSize: 12, fontFamily: T.fontMono, color: T.dim }}>{pub.length}</span>
                  </div>
                  {pub.map(f => (
                    <PublicFeatureRow key={f.id} feature={f} />
                  ))}
                </div>
              );
            })}
            {features.filter(f => f.isPublic).length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
                No features marked public yet. Go to Board or List view to toggle visibility.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Feature Modal ── */}
      {modal === "add" && (
        <AddFeatureModal onAdd={addFeature} onClose={() => setModal(null)} />
      )}

      {/* ── Feature Detail Modal ── */}
      {openFeature && (
        <FeatureDetailModal
          feature={openFeature}
          onClose={() => { setModal(null); setAiSuggestion(""); }}
          onUpdate={(updates) => updateFeature(openFeature.id, updates)}
          onDelete={() => deleteFeature(openFeature.id)}
          onTogglePublic={() => togglePublic(openFeature.id)}
          onAnalyze={() => analyzeFeature(openFeature)}
          aiLoading={aiLoading}
          aiSuggestion={aiSuggestion}
        />
      )}
    </div>
  );
}

// ─── Feature card (board) ──────────────────────────────────────────────────
function FeatureCard({ feature, onClick, onTogglePublic }) {
  const cat = CATEGORIES.find(c => c.id === feature.category);
  return (
    <div className="feature-card" onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>{cat?.icon}</span>
        <div style={{ display: "flex", gap: 5 }}>
          <PriorityDots priority={feature.priority} />
          <button
            onClick={e => { e.stopPropagation(); onTogglePublic(); }}
            className="chip"
            style={{
              background: feature.isPublic ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
              borderColor: feature.isPublic ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)",
              color: feature.isPublic ? T.teal : T.dim,
              fontSize: 10, padding: "2px 7px",
            }}>
            {feature.isPublic ? "🌐" : "🔒"}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 6, color: T.white }}>
        {feature.title}
      </div>
      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>
        {feature.description.slice(0, 80)}{feature.description.length > 80 ? "…" : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span className="chip" style={{
          background: `${cat?.color}14`, borderColor: `${cat?.color}30`, color: cat?.color,
        }}>{cat?.label}</span>
        <span style={{ fontSize: 11, color: T.dim, marginLeft: "auto" }}>{feature.source}</span>
      </div>
    </div>
  );
}

// ─── Feature row (list) ────────────────────────────────────────────────────
function FeatureRow({ feature, onClick, onTogglePublic, onStatusChange }) {
  const cat = CATEGORIES.find(c => c.id === feature.category);
  const status = STATUSES.find(s => s.id === feature.status);
  return (
    <div className="feature-card" style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px" }}
      onClick={onClick}>
      <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{cat?.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{feature.title}</span>
          <span className="chip" style={{
            background: `${status?.color}14`, borderColor: `${status?.color}30`, color: status?.color,
          }}>{status?.label}</span>
          <span className="chip" style={{
            background: `${cat?.color}12`, borderColor: `${cat?.color}25`, color: cat?.color,
          }}>{cat?.label}</span>
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          {feature.description.slice(0, 120)}{feature.description.length > 120 ? "…" : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <PriorityDots priority={feature.priority} />
        <button
          onClick={e => { e.stopPropagation(); onTogglePublic(); }}
          className="chip"
          style={{
            background: feature.isPublic ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
            borderColor: feature.isPublic ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)",
            color: feature.isPublic ? T.teal : T.dim,
          }}>
          {feature.isPublic ? "🌐 Public" : "🔒 Private"}
        </button>
        <span style={{ fontSize: 11, color: T.dim, fontFamily: T.fontMono }}>{feature.source}</span>
      </div>
    </div>
  );
}

// ─── Public feature row ────────────────────────────────────────────────────
function PublicFeatureRow({ feature }) {
  const cat = CATEGORIES.find(c => c.id === feature.category);
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 8,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{cat?.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{feature.title}</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{feature.description}</div>
        {feature.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            {feature.tags.map(t => (
              <span key={t} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                background: "rgba(255,255,255,0.04)", color: T.dim,
                border: `1px solid ${T.border}`,
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Priority dots ─────────────────────────────────────────────────────────
function PriorityDots({ priority }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: i <= priority ? T.amber : "rgba(255,255,255,0.1)",
        }} />
      ))}
    </div>
  );
}

// ─── Add Feature Modal ─────────────────────────────────────────────────────
function AddFeatureModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "workflow", status: "idea",
    priority: 3, source: "Ryan", isPublic: false, myNotes: "", tags: "",
  });

  function submit() {
    if (!form.title.trim()) return;
    onAdd({ ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>
            Add Feature
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Feature title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" placeholder="What does this do? Why does it matter?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Source</label>
              <select className="input" value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Priority (1–5)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, priority: n }))}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: n <= form.priority ? T.amber : "rgba(255,255,255,0.08)",
                      color: n <= form.priority ? "#000" : T.muted,
                      fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                    }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Visibility</label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {[false, true].map(v => (
                  <button key={String(v)} onClick={() => setForm(f => ({ ...f, isPublic: v }))}
                    style={{
                      flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer",
                      background: form.isPublic === v ? (v ? T.tealDim : T.blueDim) : "rgba(255,255,255,0.03)",
                      border: `1px solid ${form.isPublic === v ? (v ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)") : T.border}`,
                      color: form.isPublic === v ? (v ? T.teal : T.blueBright) : T.muted,
                      fontSize: 13, fontWeight: 600, fontFamily: T.fontBody,
                    }}>
                    {v ? "🌐 Public" : "🔒 Private"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">My private notes (never shown publicly)</label>
            <textarea className="input" style={{ minHeight: 70 }}
              placeholder="Strategy notes, concerns, why I want this, related issues..."
              value={form.myNotes}
              onChange={e => setForm(f => ({ ...f, myNotes: e.target.value }))} />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input" placeholder="ai, chase, mobile" value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-blue" style={{ flex: 2 }} onClick={submit}
              disabled={!form.title.trim()}>
              Add Feature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Detail Modal ──────────────────────────────────────────────────
function FeatureDetailModal({ feature, onClose, onUpdate, onDelete, onTogglePublic, onAnalyze, aiLoading, aiSuggestion }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...feature });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cat = CATEGORIES.find(c => c.id === feature.category);
  const status = STATUSES.find(s => s.id === feature.status);

  function saveEdit() {
    onUpdate({ ...form, tags: typeof form.tags === "string" ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : form.tags });
    setEditing(false);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ flex: 1, paddingRight: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span className="chip" style={{
                background: `${status?.color}14`, borderColor: `${status?.color}30`, color: status?.color,
              }}>{status?.label}</span>
              <span className="chip" style={{
                background: `${cat?.color}12`, borderColor: `${cat?.color}25`, color: cat?.color,
              }}>{cat?.icon} {cat?.label}</span>
              <span className="chip" style={{
                background: feature.isPublic ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                borderColor: feature.isPublic ? "rgba(16,185,129,0.3)" : T.border,
                color: feature.isPublic ? T.teal : T.muted,
              }}>{feature.isPublic ? "🌐 Public" : "🔒 Private"}</span>
              <span style={{ fontSize: 11, color: T.dim, alignSelf: "center" }}>from {feature.source}</span>
            </div>
            <h2 style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>
              {feature.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>

        {/* Editing form or display */}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">My private notes</label>
              <textarea className="input" value={form.myNotes}
                onChange={e => setForm(f => ({ ...f, myNotes: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tags</label>
              <input className="input"
                value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-blue" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 16 }}>
              {feature.description}
            </p>

            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              {feature.tags?.map(t => (
                <span key={t} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 5,
                  background: "rgba(255,255,255,0.04)", color: T.dim, border: `1px solid ${T.border}`,
                }}>{t}</span>
              ))}
            </div>

            {/* Priority */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Priority</span>
              <PriorityDots priority={feature.priority} />
              <span style={{ fontSize: 12, color: T.muted }}>{feature.priority}/5</span>
            </div>

            {/* My notes (always private) */}
            {feature.myNotes && (
              <div style={{
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.amber, marginBottom: 6, letterSpacing: "0.05em" }}>
                  🔒 MY NOTES (NEVER PUBLIC)
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
                  {feature.myNotes}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {aiSuggestion && (
              <div style={{
                background: T.purpleDim, border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: 10, padding: "14px 16px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, marginBottom: 10, letterSpacing: "0.05em" }}>
                  🤖 CLAUDE'S ANALYSIS
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {aiSuggestion}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>✏️ Edit</button>
              <button className="btn btn-ghost" onClick={onTogglePublic}>
                {feature.isPublic ? "🔒 Make Private" : "🌐 Make Public"}
              </button>
              <button className="btn btn-ghost"
                onClick={onAnalyze}
                disabled={aiLoading}
                style={{ color: T.purple, borderColor: "rgba(167,139,250,0.2)" }}>
                {aiLoading
                  ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 5 }}>⟳</span> Analyzing…</>
                  : "🤖 Analyze with Claude"}
              </button>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: 12, color: T.muted, alignSelf: "center" }}>Sure?</span>
                  <button className="btn btn-danger" onClick={onDelete}>Yes, Delete</button>
                  <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </>
              ) : (
                <button className="btn btn-danger" style={{ marginLeft: "auto" }}
                  onClick={() => setConfirmDelete(true)}>Delete</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Login screen ──────────────────────────────────────────────────────────
function LoginScreen({ pw, setPw, onLogin, error }) {
  return (
    <div style={{
      background: T.bg, minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: T.fontBody, color: T.white,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        .shake { animation: shake 0.4s ease; }
      `}</style>
      <div style={{ textAlign: "center", maxWidth: 360, padding: "0 20px", width: "100%" }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 6, letterSpacing: "-0.04em" }}>
          <span style={{ color: T.blue }}>Med</span>RepDesk
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 36 }}>Feature Backlog · Private</div>
        <div className={error ? "shake" : ""} style={{ display: "flex", gap: 8 }}>
          <input
            type="password" placeholder="Owner password"
            value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onLogin()}
            style={{
              flex: 1, background: error ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${error ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "13px 16px", color: "white",
              fontFamily: "'Inter', sans-serif", fontSize: 15, outline: "none",
              transition: "border-color 0.2s",
            }}
          />
          <button onClick={onLogin} style={{
            background: T.blue, color: "white", border: "none",
            borderRadius: 10, padding: "13px 20px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
          }}>Enter</button>
        </div>
        {error && <div style={{ fontSize: 12, color: T.red, marginTop: 10 }}>Wrong password</div>}
      </div>
    </div>
  );
}
