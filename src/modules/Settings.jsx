import { useEffect } from "react";
import { DEFAULT_DESIGN } from "../constants.jsx";

const STORAGE_KEY = "trading_dashboard_design";

export function loadDesign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DESIGN;
    return { ...DEFAULT_DESIGN, ...JSON.parse(raw) };
  } catch { return DEFAULT_DESIGN; }
}

function saveDesign(design) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); } catch {}
}

export default function Settings({ design, onChange }) {
  const D = design;

  useEffect(() => { saveDesign(design); }, [design]);

  const inp = { padding: "8px 14px", background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontSize: 13, fontFamily: "monospace", width: "100%", outline: "none" };
  const lbl = { fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6, fontWeight: 600 };
  const reset = () => { onChange(DEFAULT_DESIGN); saveDesign(DEFAULT_DESIGN); };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "min(640px, 100%)" }}>

        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: D.text }}>Colors</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
            {[
              ["Background", "bg"],
              ["Card",       "card"],
              ["Border",     "border"],
              ["Accent",     "blue"],
              ["Text",       "text"],
              ["Text Muted", "textMuted"],
            ].map(([label, key]) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={D[key] || "#000000"}
                    onChange={e => onChange({ ...D, [key]: e.target.value, ...(key === "blue" ? { purple: e.target.value } : {}) })}
                    style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "none", padding: 0 }} />
                  <input type="text" value={D[key] || ""}
                    onChange={e => onChange({ ...D, [key]: e.target.value, ...(key === "blue" ? { purple: e.target.value } : {}) })}
                    style={inp} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: D.text }}>Win / Loss Colors</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
              {[["Win", "green"], ["Loss", "red"], ["Break-even", "yellow"]].map(([label, key]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={D[key] || "#000000"}
                      onChange={e => onChange({ ...D, [key]: e.target.value })}
                      style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "none", padding: 0 }} />
                    <input type="text" value={D[key] || ""}
                      onChange={e => onChange({ ...D, [key]: e.target.value })}
                      style={inp} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={reset} style={{ padding: "10px 24px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 10, color: D.textMuted, cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}>
          Reset to default
        </button>
      </div>
    </div>
  );
}
