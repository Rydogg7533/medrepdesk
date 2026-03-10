import { useState } from "react";

const T = {
  bgBase: "#09090b", bgCard: "rgba(255,255,255,0.03)", bgCardBorder: "rgba(255,255,255,0.08)",
  bgNav: "rgba(9,9,11,0.85)", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.35)", blue: "#d4a843", blueBright: "#60a5fa",
  teal: "#10b981", tealBright: "#34d399", amber: "#f59e0b", amberBright: "#fbbf24",
  red: "#f87171", bronze: "#cd7f32", silver: "#c0c0c0", gold: "#f5c542",
  fontHead: "'Outfit', system-ui, sans-serif", fontBody: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

const MOCK = {
  full_name: "Jane Smith", email: "jane@example.com", specialty: "Orthopedic",
  territory: "Utah / Idaho / Wyoming", status: "active",
  tier_achieved: "silver", free_months_earned: 2,
  onboarding_done: true, onboarding_done_at: "2026-01-15",
  cases_logged: 7, five_cases_done: true, five_cases_done_at: "2026-01-22",
  feedback_count: 3, three_feedbacks_done: true, three_feedbacks_done_at: "2026-02-01",
  testimonial_done: false, discord_joined: true, discord_username: "janesmith_ortho",
  beta_start_date: "2026-01-12", beta_end_date: "2026-03-12",
};

const SUBMISSIONS = [
  { type:"bug", id:"BUG-X4K9", title:"Chase log promised date not saving", severity:"high", status:"fixed", date:"2026-01-28" },
  { type:"feature", id:"FR-2291", title:"Bulk PO status update", category:"purchase_orders", status:"planned", upvotes:12, date:"2026-01-30" },
  { type:"bug", id:"BUG-M7R2", title:"Commission auto-calc wrong for flat rate", severity:"medium", status:"in_progress", date:"2026-02-01" },
];

const TIERS = [
  { key:"bronze", name:"Bronze", icon:"🥉", color:T.bronze, months:1, checks:[
    { label:"Complete onboarding", doneKey:"onboarding_done", dateKey:"onboarding_done_at" },
    { label:"Log 5+ surgical cases", doneKey:"five_cases_done", dateKey:"five_cases_done_at", progressKey:"cases_logged", total:5 },
  ]},
  { key:"silver", name:"Silver", icon:"🥈", color:T.silver, months:2, checks:[
    { label:"Achieve Bronze tier", doneKey:"five_cases_done" },
    { label:"Submit 3 bug reports or feature requests", doneKey:"three_feedbacks_done", dateKey:"three_feedbacks_done_at", progressKey:"feedback_count", total:3 },
  ]},
  { key:"gold", name:"Gold", icon:"🥇", color:T.gold, months:3, checks:[
    { label:"Achieve Silver tier", doneKey:"three_feedbacks_done" },
    { label:"Record 60-sec video OR write G2/Capterra review", doneKey:"testimonial_done" },
  ]},
];

const BUG_STATUS = { new:{label:"New",color:T.textMuted}, triaged:{label:"Triaged",color:T.amberBright}, in_progress:{label:"In Progress",color:"#a78bfa"}, fixed:{label:"Fixed ✓",color:T.tealBright}, wont_fix:{label:"Won't Fix",color:T.red}, closed:{label:"Closed",color:T.textMuted} };
const FR_STATUS = { submitted:{label:"Submitted",color:T.textMuted}, planned:{label:"Planned ✓",color:T.blueBright}, in_progress:{label:"In Progress",color:"#a78bfa"}, shipped:{label:"Shipped 🚀",color:T.tealBright}, under_review:{label:"Under Review",color:T.amberBright} };

function daysLeft(end) { return Math.max(0, Math.ceil((new Date(end) - new Date()) / 86400000)); }
function pct(start, end) { return Math.min(100, Math.max(0, Math.round(((new Date() - new Date(start)) / (new Date(end) - new Date(start))) * 100))); }

export default function BetaDashboard() {
  const t = MOCK;
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(false);
  const tierIdx = ["bronze","silver","gold"].indexOf(t.tier_achieved ?? "none");
  const prog = pct(t.beta_start_date, t.beta_end_date);
  const days = daysLeft(t.beta_end_date);

  return (
    <div style={s.page}>
      <Nav activePage="dashboard" />

      {/* Profile strip */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, fontFamily: T.fontHead, color: "#fff" }}>{t.full_name.charAt(0)}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: T.fontHead, color: T.textPrimary }}>{t.full_name}</div>
              <div style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody }}>{t.specialty} · {t.territory}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: T.tealBright, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, fontFamily: T.fontHead }}>🟢 Active</div>
            <a href="https://app.medrepdesk.io" style={{ background: T.blue, color: "#fff", borderRadius: 8, padding: "8px 16px", textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: T.fontHead }}>Open App →</a>
          </div>
        </div>
      </div>

      <div style={s.container}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[["overview","📊 Overview"],["submissions","📝 My Submissions"],["rewards","🎁 Rewards"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: "10px 18px", border: "none", background: "none", fontSize: 13, fontWeight: 600, color: tab === key ? T.textPrimary : T.textSecondary, cursor: "pointer", fontFamily: T.fontHead, borderBottom: `2px solid ${tab === key ? T.blue : "transparent"}`, marginBottom: -1 }}>{label}</button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            {/* Timeline */}
            <div style={s.card}>
              <div style={s.cardTitle}>Beta Program Timeline</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12, fontFamily: T.fontBody, color: T.textMuted }}>
                <span>Jan 12, 2026</span>
                <span style={{ color: T.blueBright, fontWeight: 700 }}>{days} days remaining</span>
                <span>Mar 12, 2026</span>
              </div>
              <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, marginBottom: 6 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${prog}%`, background: `linear-gradient(90deg, ${T.blue}, ${T.blueBright})`, borderRadius: 3 }} />
                <div style={{ position: "absolute", top: "50%", left: `${prog}%`, transform: "translate(-50%,-50%)", width: 14, height: 14, background: T.blue, border: "2px solid #09090b", borderRadius: "50%", boxShadow: `0 0 0 2px ${T.blue}` }} />
              </div>
              <div style={{ textAlign: "center", fontSize: 11, color: T.textMuted, fontFamily: T.fontBody }}>{prog}% through the beta</div>
            </div>

            {/* Tier progress */}
            <div style={s.card}>
              <div style={s.cardTitle}>Tier Progress</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {TIERS.map((tier, i) => {
                  const achieved = tierIdx >= i;
                  const current = tierIdx === i - 1;
                  const locked = tierIdx < i - 1;
                  return (
                    <div key={tier.key} style={{ border: `1px solid ${achieved ? tier.color + "50" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 18, background: achieved ? `${tier.color}06` : T.bgCard, opacity: locked ? 0.45 : 1, position: "relative", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 24 }}>{tier.icon}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: T.fontHead, color: achieved ? tier.color : T.textSecondary }}>{tier.name}</div>
                            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody }}>{tier.months} mo free</div>
                          </div>
                        </div>
                        {achieved && <div style={{ fontSize: 10, fontWeight: 800, background: tier.color, color: "#000", padding: "2px 7px", borderRadius: 10, fontFamily: T.fontHead }}>✓ DONE</div>}
                        {current && <div style={{ fontSize: 10, fontWeight: 800, background: "rgba(59,130,246,0.2)", color: T.blueBright, padding: "2px 7px", borderRadius: 10, fontFamily: T.fontHead }}>ACTIVE</div>}
                      </div>
                      {tier.checks.map((c, ci) => {
                        const done = t[c.doneKey];
                        const prog = c.progressKey ? t[c.progressKey] : null;
                        return (
                          <div key={ci} style={{ display: "flex", gap: 8, marginBottom: ci < tier.checks.length - 1 ? 10 : 0 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? T.teal : "rgba(255,255,255,0.08)", border: `1px solid ${done ? T.teal : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0, marginTop: 1 }}>{done ? "✓" : ""}</div>
                            <div>
                              <div style={{ fontSize: 11, color: done ? T.textSecondary : T.textMuted, fontFamily: T.fontBody, lineHeight: 1.4 }}>{c.label}</div>
                              {prog !== null && !done && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                  <div style={{ width: 60, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                                    <div style={{ width: `${(prog / c.total) * 100}%`, height: "100%", background: T.blue, borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>{prog}/{c.total}</span>
                                </div>
                              )}
                              {done && c.dateKey && t[c.dateKey] && <div style={{ fontSize: 10, color: T.teal, fontFamily: T.fontBody, marginTop: 2 }}>Done {new Date(t[c.dateKey]).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gold CTA */}
            {!t.testimonial_done && t.three_feedbacks_done && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(245,197,66,0.06)", border: "1px solid rgba(245,197,66,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 28 }}>🥇</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.fontHead, color: T.gold, marginBottom: 3 }}>One step from Gold</div>
                  <div style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody }}>Record a 60-second video or leave a G2/Capterra review to unlock your 3rd free month.</div>
                </div>
                <button style={{ background: T.gold, color: "#000", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 800, fontFamily: T.fontHead, cursor: "pointer", flexShrink: 0 }} onClick={() => setModal(true)}>How to Submit →</button>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { icon:"📋", label:"Cases Logged", value: t.cases_logged, color: T.blueBright },
                { icon:"🐛", label:"Bug Reports", value: SUBMISSIONS.filter(s => s.type==="bug").length, color: T.red },
                { icon:"💡", label:"Feature Requests", value: SUBMISSIONS.filter(s => s.type==="feature").length, color: T.amberBright },
                { icon:"💬", label:"Discord", value: t.discord_joined ? "Joined" : "Not yet", color: t.discord_joined ? T.tealBright : T.textMuted },
              ].map(stat => (
                <div key={stat.label} style={{ background: T.bgCard, border: `1px solid ${T.bgCardBorder}`, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: T.fontHead, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontBody, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {!t.discord_joined && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.2)", borderRadius: 12, padding: "18px 20px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 22 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontFamily: T.fontHead, fontSize: 14, color: T.textPrimary, marginBottom: 3 }}>Join the Beta Discord</div>
                  <div style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody }}>Real-time support, feature previews, and direct access to Ryan.</div>
                </div>
                <a href="https://discord.gg/medrepdesk" style={{ background: "#5865F2", color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, fontFamily: T.fontHead, textDecoration: "none" }}>Join Discord →</a>
              </div>
            )}
          </>
        )}

        {tab === "submissions" && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: T.fontHead, color: T.textPrimary, marginBottom: 4 }}>Your Submissions</h2>
                <p style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody }}>
                  {SUBMISSIONS.length} total · {SUBMISSIONS.length >= 3 ? <span style={{ color: T.tealBright }}>✅ Silver requirement met</span> : <span>{3 - SUBMISSIONS.length} more needed for Silver</span>}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href="/beta/bugs" style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: T.textSecondary, textDecoration: "none", fontFamily: T.fontBody }}>🐛 Report Bug</a>
                <a href="/beta/features" style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: T.textSecondary, textDecoration: "none", fontFamily: T.fontBody }}>💡 Request Feature</a>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SUBMISSIONS.map(sub => {
                const sc = sub.type === "bug" ? BUG_STATUS[sub.status] : FR_STATUS[sub.status];
                return (
                  <div key={sub.id} style={{ ...s.card, display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 20, marginTop: 1 }}>{sub.type === "bug" ? "🐛" : "💡"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: 10, fontFamily: T.fontMono, color: T.textMuted, display: "block", marginBottom: 2 }}>{sub.id}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.fontHead, color: T.textPrimary }}>{sub.title}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: sc?.color, fontFamily: T.fontHead, flexShrink: 0 }}>{sc?.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14 }}>
                        <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody, textTransform: "capitalize" }}>{sub.type === "bug" ? `Severity: ${sub.severity}` : `${sub.upvotes} upvotes`}</span>
                        <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontBody }}>{new Date(sub.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "rewards" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: T.fontHead, color: T.textPrimary, marginBottom: 4 }}>Your Rewards</h2>
            <p style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody, marginBottom: 20 }}>Free months apply automatically when the beta ends.</p>

            <div style={{ ...s.card, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, fontFamily: T.fontHead, color: T.blueBright, lineHeight: 1 }}>{t.free_months_earned}</span>
                  <span style={{ fontSize: 15, color: T.textSecondary, fontFamily: T.fontBody }}>Free Months Earned</span>
                </div>
                <span style={{ fontSize: 14, color: T.textMuted, fontFamily: T.fontBody }}>of 3 possible</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 20 }}>
                <div style={{ width: `${(t.free_months_earned / 3) * 100}%`, height: "100%", background: `linear-gradient(90deg,${T.bronze},${T.silver})`, borderRadius: 4 }} />
              </div>
              {TIERS.map((tier, i) => (
                <div key={tier.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < TIERS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 18 }}>{tier.icon}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, fontFamily: T.fontHead, color: T.textSecondary }}>{tier.name}</span>
                  <span style={{ fontSize: 13, color: T.textMuted, fontFamily: T.fontBody }}>{tier.months} month{tier.months > 1 ? "s" : ""} free</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: T.fontHead, color: tierIdx >= i ? T.tealBright : T.textMuted }}>{tierIdx >= i ? "✓ Earned" : "Not yet"}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 14, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 800, fontFamily: T.fontHead, fontSize: 14, color: T.textPrimary, marginBottom: 4 }}>Price Lock Guarantee</div>
                <div style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody, lineHeight: 1.6 }}>You're locked into today's beta pricing as long as you stay subscribed. When we raise prices, your rate stays the same.</div>
              </div>
            </div>

            {!t.testimonial_done && (
              <div style={{ background: "rgba(245,197,66,0.05)", border: "1px solid rgba(245,197,66,0.2)", borderRadius: 14, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <span style={{ fontSize: 28 }}>🥇</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: T.fontHead, color: T.gold }}>Earn Your 3rd Free Month</div>
                    <div style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody }}>Submit a testimonial to unlock Gold tier</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  {[
                    { icon:"🎥", title:"60-Second Video", desc:"Record on your phone. Walk through how you use the app and what it's solved. Email to beta@medrepdesk.io" },
                    { icon:"⭐", title:"G2 or Capterra Review", desc:"Leave an honest review on G2 or Capterra. Send us the link and we'll apply your free month within 24 hours." },
                  ].map(opt => (
                    <div key={opt.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 18 }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: T.fontHead, color: T.textPrimary, marginBottom: 6 }}>{opt.title}</div>
                      <div style={{ fontSize: 12, color: T.textSecondary, fontFamily: T.fontBody, lineHeight: 1.5 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
                <button style={{ width: "100%", padding: "12px", background: T.gold, color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, fontFamily: T.fontHead, cursor: "pointer" }} onClick={() => setModal(true)}>
                  I've Done This — Submit →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Testimonial modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }} onClick={() => setModal(false)}>
          <div style={{ background: "#14141a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "32px 36px", maxWidth: 440, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={s.eyebrow}>GOLD TIER</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, fontFamily: T.fontHead, color: T.textPrimary, marginBottom: 12 }}>🥇 Submit Your Testimonial</h3>
            <p style={{ fontSize: 14, color: T.textSecondary, fontFamily: T.fontBody, marginBottom: 8 }}>Email us at <a href="mailto:beta@medrepdesk.io" style={{ color: T.blueBright }}>beta@medrepdesk.io</a> with:</p>
            <ul style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.fontBody, paddingLeft: 20, lineHeight: 2.2, marginBottom: 16 }}>
              <li>Your video link (Loom, Drive, YouTube — anything works), <em>or</em></li>
              <li>Link to your G2 or Capterra review</li>
            </ul>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: T.fontMono, color: T.textSecondary, marginBottom: 20 }}>
              Subject: Gold Tier Testimonial — {MOCK.full_name}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href={`mailto:beta@medrepdesk.io?subject=Gold Tier Testimonial — ${MOCK.full_name}`} style={{ flex: 1, background: T.blue, color: "#fff", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, fontFamily: T.fontHead, textDecoration: "none", textAlign: "center" }}>Open Email →</a>
              <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: T.textSecondary, borderRadius: 8, padding: "11px 20px", fontSize: 14, fontFamily: T.fontBody, cursor: "pointer" }} onClick={() => setModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Nav({ activePage }) {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: T.bgNav, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#fff", fontFamily: T.fontHead }}>M</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontFamily: T.fontHead }}>MedRepDesk</span>
        </a>
        <div style={{ display: "flex", gap: 4 }}>
          {[["🐛 Bug Report","/beta/bugs","bugs"],["💡 Features","/beta/features","features"],["📊 My Progress","/beta/dashboard","dashboard"],["💬 Discord","https://discord.gg/medrepdesk","discord"]].map(([label,href,key]) => (
            <a key={key} href={href} style={{ color: activePage === key ? T.textPrimary : T.textSecondary, fontSize: 13, fontFamily: T.fontBody, textDecoration: "none", padding: "5px 12px", borderRadius: 6, background: activePage === key ? "rgba(255,255,255,0.08)" : "transparent" }}>{label}</a>
          ))}
        </div>
        <div style={{ background: "rgba(245,158,11,0.1)", color: T.amberBright, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, letterSpacing: "1.5px", fontFamily: T.fontHead, border: "1px solid rgba(245,158,11,0.25)" }}>BETA</div>
      </div>
    </nav>
  );
}

const s = {
  page: { background: T.bgBase, minHeight: "100vh", color: T.textPrimary },
  container: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: T.blue, fontFamily: T.fontHead, marginBottom: 10 },
  card: { background: T.bgCard, border: `1px solid ${T.bgCardBorder}`, borderRadius: 14, padding: 22, marginBottom: 14 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: T.textMuted, fontFamily: T.fontHead, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)", letterSpacing: "0.5px", textTransform: "uppercase" },
};
