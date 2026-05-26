import { useEffect, useState } from "react";
import { BACKGROUNDS } from "../constants.jsx";

const STORAGE_KEY = "trading_dashboard_design";

export const DEFAULT_DESIGN = {
  bg: "#0a0a0a", card: "#141414", border: "#272727", sidebar: "#111111",
  green: "#10e8a0", red: "#ff4d6d", blue: "#d4d4d4", purple: "#d4d4d4",
  yellow: "#888888", text: "#f5f5f5", textMuted: "#525252",
  background: "none", radialColor: "#a78bfa",
};

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
  const [showColors, setShowColors] = useState(false);
  useEffect(() => { saveDesign(design); }, [design]);

  const inp = { padding: "8px 14px", background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontSize: 13, fontFamily: "monospace", width: "100%", outline: "none" };
  const lbl = { fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6, fontWeight: 600 };
  const reset = () => { onChange(DEFAULT_DESIGN); saveDesign(DEFAULT_DESIGN); };

  // Only show: none (solid), radial-dual, radial-multi, and mesh-gradient
  const ALLOWED_BG = ["none", "radial-dual", "radial-multi", "mesh-gradient"];
  const visibleBgs = BACKGROUNDS.filter(b => ALLOWED_BG.includes(b.id));

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "min(720px, 100%)" }}>

        {/* Background Pattern */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: D.text }}>Background</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            {visibleBgs.map(b => {
              const isActive = (D.background || "none") === b.id;
              return (
                <button key={b.id} onClick={() => onChange({ ...D, background: b.id })}
                  style={{ width: 90, height: 64, borderRadius: 10, cursor: "pointer", overflow: "hidden", border: `2px solid ${isActive ? D.blue : D.border}`, padding: 0, position: "relative", boxShadow: isActive ? `0 0 0 1px ${D.blue}` : "none", transition: "all 0.15s" }}>
                  <div style={{ position: "absolute", inset: 0, ...b.preview(D.bg, D.radialColor || "#a78bfa") }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 5, background: "linear-gradient(transparent, rgba(0,0,0,0.65))" }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>{b.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Radial color picker — only show when radial-dual is active */}
          {D.background === "radial-dual" && (
            <div>
              <label style={lbl}>Radial Color</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color" value={D.radialColor || "#a78bfa"}
                  onChange={e => onChange({ ...D, radialColor: e.target.value })}
                  style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "none", padding: 0 }} />
                <input type="text" value={D.radialColor || "#a78bfa"}
                  onChange={e => onChange({ ...D, radialColor: e.target.value })}
                  style={{ ...inp, width: 140 }} />
                {/* Presets */}
                <div style={{ display: "flex", gap: 6 }}>
                  {["#a78bfa","#818cf8","#34d399","#f472b6","#fb923c","#94a3b8"].map(c => (
                    <div key={c} onClick={() => onChange({ ...D, radialColor: c })}
                      style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: D.radialColor === c ? `2px solid ${D.text}` : "2px solid transparent", transition: "border 0.1s" }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Multi-gradient color pickers — only show when radial-multi is active */}
          {D.background === "radial-multi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Primary Color</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <input type="color" value={D.multiColor1 || "#a78bfa"}
                    onChange={e => onChange({ ...D, multiColor1: e.target.value })}
                    style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "none", padding: 0 }} />
                  <input type="text" value={D.multiColor1 || "#a78bfa"}
                    onChange={e => onChange({ ...D, multiColor1: e.target.value })}
                    style={{ ...inp, width: 140 }} />
                </div>
                <label style={{ ...lbl, marginBottom: 4 }}>Opacity</label>
                <input type="range" min="0" max="1" step="0.05" value={D.multiOpacity1 || 0.25}
                  onChange={e => onChange({ ...D, multiOpacity1: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: D.blue }} />
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 4 }}>{Math.round((D.multiOpacity1 || 0.25) * 100)}%</div>
              </div>

              <div>
                <label style={lbl}>Secondary Color</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <input type="color" value={D.multiColor2 || "#ffffff"}
                    onChange={e => onChange({ ...D, multiColor2: e.target.value })}
                    style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "none", padding: 0 }} />
                  <input type="text" value={D.multiColor2 || "#ffffff"}
                    onChange={e => onChange({ ...D, multiColor2: e.target.value })}
                    style={{ ...inp, width: 140 }} />
                </div>
                <label style={{ ...lbl, marginBottom: 4 }}>Opacity</label>
                <input type="range" min="0" max="1" step="0.05" value={D.multiOpacity2 || 0.15}
                  onChange={e => onChange({ ...D, multiOpacity2: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: D.blue }} />
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 4 }}>{Math.round((D.multiOpacity2 || 0.15) * 100)}%</div>
              </div>
            </div>
          )}

          {/* Mesh gradient color pickers — only show when mesh-gradient is active */}
          {D.background === "mesh-gradient" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Top Right", colorKey: "meshColor1", opacityKey: "meshOpacity1", defaultColor: "#6366f1", defaultOpacity: 0.35 },
                { label: "Bottom Left", colorKey: "meshColor2", opacityKey: "meshOpacity2", defaultColor: "#8b5cf6", defaultOpacity: 0.35 },
                { label: "Bottom Right", colorKey: "meshColor3", opacityKey: "meshOpacity3", defaultColor: "#3b82f6", defaultOpacity: 0.25 },
                { label: "Top Left", colorKey: "meshColor4", opacityKey: "meshOpacity4", defaultColor: "#1e1b4b", defaultOpacity: 0.4 },
              ].map(({ label, colorKey, opacityKey, defaultColor, defaultOpacity }) => (
                <div key={colorKey}>
                  <label style={lbl}>{label}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <input type="color" value={D[colorKey] || defaultColor}
                      onChange={e => onChange({ ...D, [colorKey]: e.target.value })}
                      style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "none", padding: 0 }} />
                    <input type="text" value={D[colorKey] || defaultColor}
                      onChange={e => onChange({ ...D, [colorKey]: e.target.value })}
                      style={{ ...inp, fontSize: 11, padding: "6px 10px" }} />
                  </div>
                  <label style={{ ...lbl, marginBottom: 4, fontSize: 10 }}>Opacity</label>
                  <input type="range" min="0" max="1" step="0.05" value={D[opacityKey] || defaultOpacity}
                    onChange={e => onChange({ ...D, [opacityKey]: parseFloat(e.target.value) })}
                    style={{ width: "100%", accentColor: D.blue }} />
                  <div style={{ fontSize: 10, color: D.textMuted, marginTop: 2 }}>{Math.round((D[opacityKey] || defaultOpacity) * 100)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Color customization toggle */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <button
            onClick={() => setShowColors(!showColors)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: D.text }}>Color Customization</div>
            <div style={{ fontSize: 18, color: D.textMuted }}>{showColors ? "−" : "+"}</div>
          </button>
        </div>

        {/* Custom colors — only show when toggled */}
        {showColors && (
          <>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: D.text }}>Colors</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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
                      <input type="text" value={D[key] || ""} onChange={e => onChange({ ...D, [key]: e.target.value, ...(key === "blue" ? { purple: e.target.value } : {}) })} style={inp} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Win/Loss */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: D.text }}>Win / Loss Colors</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
                {[["Win", "green"], ["Loss", "red"], ["Break-even", "yellow"]].map(([label, key]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="color" value={D[key] || "#000000"} onChange={e => onChange({ ...D, [key]: e.target.value })} style={{ width: 40, height: 40, border: "none", borderRadius: 8, cursor: "pointer", background: "none", padding: 0 }} />
                      <input type="text" value={D[key] || ""} onChange={e => onChange({ ...D, [key]: e.target.value })} style={inp} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <button onClick={reset} style={{ padding: "10px 24px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 10, color: D.textMuted, cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}>
          Reset to default
        </button>
      </div>
    </div>
  );
}