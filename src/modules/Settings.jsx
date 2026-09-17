import { useEffect } from "react";
import { APPEARANCES, ACCENT_LIST, DEFAULT_APPEARANCE_ID, DEFAULT_ACCENT_ID, buildDesign } from "../constants.jsx";

const STORAGE_KEY = "trading_dashboard_design";

// Persisted shape is just the two chosen ids — the actual color palette is
// always derived fresh via buildDesign(), never frozen into storage. That way
// switching Appearance can never disturb the selected Accent Color (and vice
// versa), and there's nothing to migrate if a palette value is ever tuned later.
export function loadDesign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const appearanceId = APPEARANCES[parsed.appearanceId] ? parsed.appearanceId : DEFAULT_APPEARANCE_ID;
    const accentId      = ACCENT_LIST.some(([id]) => id === parsed.accentId) ? parsed.accentId : DEFAULT_ACCENT_ID;
    return buildDesign(appearanceId, accentId);
  } catch {
    return buildDesign(DEFAULT_APPEARANCE_ID, DEFAULT_ACCENT_ID);
  }
}

function saveDesign(design) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ appearanceId: design.appearanceId, accentId: design.accentId })); } catch {}
}

export default function Settings({ design, onChange }) {
  const D = design;

  useEffect(() => { saveDesign(design); }, [design]);

  const setAppearance = (appearanceId) => onChange(buildDesign(appearanceId, D.accentId));
  const setAccent     = (accentId) => onChange(buildDesign(D.appearanceId, accentId));
  const reset         = () => onChange(buildDesign(DEFAULT_APPEARANCE_ID, DEFAULT_ACCENT_ID));

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "min(720px, 100%)" }}>

        {/* Appearance */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: D.text }}>Appearance</div>
          <div style={{ fontSize: 12, color: D.textMuted, marginBottom: 20 }}>Sets the Background and Cards throughout the dashboard.</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {Object.values(APPEARANCES).map(a => {
              const active = D.appearanceId === a.id;
              return (
                <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setAppearance(a.id)}
                    title={a.label}
                    style={{
                      width: 92, height: 62, borderRadius: 10, cursor: "pointer", padding: 0, position: "relative",
                      overflow: "hidden", background: a.bg,
                      border: `2px solid ${active ? D.blue : "transparent"}`,
                      boxShadow: active ? `0 0 0 1px ${D.blue}` : `0 0 0 1px ${D.border}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ position: "absolute", left: 10, right: 10, bottom: 8, top: 20, background: a.card, borderRadius: 6, border: `1px solid ${a.border}` }} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? D.text : D.textMuted }}>{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interface Accent Color */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: D.text }}>Interface Accent Color</div>
          <div style={{ fontSize: 12, color: D.textMuted, marginBottom: 20 }}>Used for accent elements throughout the interface, independent of Appearance.</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {ACCENT_LIST.map(([id, label, color]) => {
              const active = D.accentId === id;
              return (
                <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 64 }}>
                  <button
                    onClick={() => setAccent(id)}
                    title={label}
                    style={{
                      width: 36, height: 36, borderRadius: "50%", background: color, cursor: "pointer",
                      border: active ? `2px solid ${D.text}` : "2px solid transparent",
                      boxShadow: active ? `0 0 0 2px ${D.card}, 0 0 0 3px ${D.border}` : "none",
                      transition: "all 0.12s",
                    }}
                  />
                  <span style={{ fontSize: 10, textAlign: "center", fontWeight: active ? 700 : 500, color: active ? D.text : D.textMuted }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={reset} style={{ padding: "10px 24px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 10, color: D.textMuted, cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}>
          Reset to default
        </button>
      </div>
    </div>
  );
}
