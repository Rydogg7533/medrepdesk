import { useState } from "react";

const T = {
  bg: "#09090b",
  blue: "#d4a843",
  blueDim: "rgba(59,130,246,0.1)",
  blueBright: "#60a5fa",
  teal: "#10b981",
  tealDim: "rgba(16,185,129,0.08)",
  muted: "rgba(255,255,255,0.45)",
  dim: "rgba(255,255,255,0.2)",
  border: "rgba(255,255,255,0.08)",
  fontHead: "'Outfit', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

function getSlots() {
  const slots = [];
  const today = new Date();
  for (let d = 1; d <= 18; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const label = date.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const shortLabel = date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const times = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];
    const bookedMask = [false, true, false, false, false, true, false, true];
    times.forEach((time, i) => {
      slots.push({
        id: `d${d}-t${i}`,
        label,
        shortLabel,
        time,
        booked: bookedMask[(d + i) % bookedMask.length],
      });
    });
    if (slots.length >= 40) break;
  }
  return slots;
}

export default function BetaScheduler() {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const slots = getSlots();

  // Group by date
  const grouped = {};
  slots.forEach(s => {
    if (!grouped[s.label]) grouped[s.label] = [];
    grouped[s.label].push(s);
  });

  const selectedSlot = slots.find(s => s.id === selected);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.fontBody, color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fadeUp { animation: fadeUp 0.4s ease forwards; }
        .slot {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 12px 16px;
          cursor: pointer; transition: all 0.15s;
          background: rgba(255,255,255,0.02);
          color: white; font-family: inherit; text-align: left; width: 100%;
        }
        .slot:hover:not(.booked) { border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.06); }
        .slot.selected { border-color: #d4a843; background: rgba(59,130,246,0.1); }
        .slot.booked { opacity: 0.25; cursor: default; }
        .input {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 12px 16px;
          color: white; font-family: inherit; font-size: 15px; width: 100%; outline: none;
          transition: border-color 0.2s;
        }
        .input:focus { border-color: rgba(59,130,246,0.5); }
        .input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>
          <span style={{ color: T.blue }}>Med</span>RepDesk
        </div>
        <div style={{ fontSize: 12, color: T.muted }}>Founding Member Onboarding Call</div>
      </div>

      {!confirmed ? (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>

          {/* Top context */}
          <div className="fadeUp" style={{ marginBottom: 36 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: T.blueDim, border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 8, padding: "5px 12px", marginBottom: 18,
            }}>
              <span style={{ fontSize: 12 }}>📞</span>
              <span style={{ fontSize: 12, color: T.blueBright, fontWeight: 500 }}>20-min call · Google Meet or phone · Mountain Time</span>
            </div>
            <h1 style={{ fontFamily: T.fontHead, fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 10 }}>
              Pick your call time
            </h1>
            <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 480 }}>
              Ryan will use this call to configure MedRepDesk for your specific workflow before you get access.
              This is not a demo — it's your setup session.
            </p>
          </div>

          {/* What to expect */}
          <div style={{
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 36,
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12,
          }}>
            {[
              { icon: "🏥", label: "Your case types + territory" },
              { icon: "🏢", label: "Your distributors" },
              { icon: "📋", label: "Your current workflow" },
              { icon: "⚙️", label: "App configured for you" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Two-column layout on wider screens */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>

            {/* Your info */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Your info
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 6 }}>Full name</label>
                  <input className="input" placeholder="Sarah Mitchell"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 6 }}>Email address</label>
                  <input className="input" type="email" placeholder="sarah@yourcompany.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Select a time
              </div>

              <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                {Object.entries(grouped).map(([dateLabel, daySlots]) => (
                  <div key={dateLabel} style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: 12, fontFamily: T.fontMono, color: T.muted,
                      marginBottom: 8, fontWeight: 600, paddingBottom: 6,
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      {dateLabel}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
                      {daySlots.map(slot => (
                        <button key={slot.id}
                          className={`slot ${slot.id === selected ? "selected" : ""} ${slot.booked ? "booked" : ""}`}
                          onClick={() => !slot.booked && setSelected(slot.id)}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{slot.time}</div>
                          <div style={{ fontSize: 10, color: slot.booked ? "inherit" : T.muted, marginTop: 2 }}>
                            {slot.booked ? "Taken" : "MT"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected slot confirm bar */}
          {selected && (
            <div style={{
              background: T.tealDim, border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 12, padding: "14px 18px", marginTop: 24,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedSlot?.label}
                  </div>
                  <div style={{ fontSize: 13, color: T.muted }}>
                    {selectedSlot?.time} Mountain Time · 20 minutes
                  </div>
                </div>
              </div>
              <button
                disabled={!name || !email}
                onClick={() => setConfirmed(true)}
                style={{
                  background: !name || !email ? "rgba(255,255,255,0.1)" : T.blue,
                  color: !name || !email ? T.muted : "white",
                  border: "none", borderRadius: 10, padding: "12px 22px",
                  fontFamily: T.fontBody, fontWeight: 600, fontSize: 14, cursor: !name || !email ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}>
                Confirm Call →
              </button>
            </div>
          )}

          {!selected && (
            <p style={{ fontSize: 12, color: T.dim, marginTop: 20, lineHeight: 1.6 }}>
              None of these work? After submitting, reply to your confirmation email and Ryan will find a time that works.
            </p>
          )}
        </div>
      ) : (
        /* Confirmed state */
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div className="fadeUp" style={{ fontSize: 52, marginBottom: 20 }}>📅</div>
          <h1 className="fadeUp" style={{
            fontFamily: T.fontHead, fontSize: 28, fontWeight: 800,
            letterSpacing: "-0.04em", marginBottom: 12,
          }}>
            Call confirmed, {name.split(" ")[0]}.
          </h1>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
            You're booked for{" "}
            <strong style={{ color: "#fff" }}>{selectedSlot?.label} at {selectedSlot?.time} MT.</strong>
            {" "}A Google Calendar invite with the Meet link is on its way to {email}.
          </p>

          <div style={{
            background: "rgba(255,255,255,0.02)", border: T.border,
            borderRadius: 14, padding: "22px", textAlign: "left", marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Come ready to talk about:</div>
            {[
              "The distributors you represent",
              "Your primary specialties and case types",
              "Roughly how many cases per month",
              "What you currently use to track POs (even if it's nothing)",
              "Your single biggest headache in the current process",
            ].map(item => (
              <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ color: T.blue, flexShrink: 0, marginTop: 2 }}>→</span>
                <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: T.dim, lineHeight: 1.7 }}>
            Ryan's personal number will be in your confirmation email in case anything comes up before the call.
          </p>
        </div>
      )}
    </div>
  );
}
