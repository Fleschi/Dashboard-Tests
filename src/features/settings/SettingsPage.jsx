import { useEffect } from "react";
import ColorPicker from "../../shared/components/ColorPicker/ColorPicker";
import { buildDesign, defaultDesign } from "../../theme/buildDesign";
import { saveDesign } from "../../theme/designStorage";
import { APPEARANCES, COLOR_LIST, DEFAULT_ACCENT_ID, DEFAULT_LOSS_COLOR_ID, DEFAULT_METRIC_COLOR_ID, DEFAULT_PROFIT_COLOR_ID } from "../../theme/palette";

export default function SettingsPage({ design, onChange }) {
  const D = design;

  useEffect(() => { saveDesign(design); }, [design]);

  const setAppearance  = (appearanceId)  => onChange(buildDesign(appearanceId, D.accentId, D.profitColorId, D.lossColorId, D.metricColorId));
  const setAccent      = (accentId)      => onChange(buildDesign(D.appearanceId, accentId, D.profitColorId, D.lossColorId, D.metricColorId));
  const setProfitColor = (profitColorId) => onChange(buildDesign(D.appearanceId, D.accentId, profitColorId, D.lossColorId, D.metricColorId));
  const setLossColor   = (lossColorId)   => onChange(buildDesign(D.appearanceId, D.accentId, D.profitColorId, lossColorId, D.metricColorId));
  const setMetricColor = (metricColorId) => onChange(buildDesign(D.appearanceId, D.accentId, D.profitColorId, D.lossColorId, metricColorId));
  const reset = () => onChange(defaultDesign());

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "min(720px, 100%)" }}>

        {/* Appearance */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: D.text }}>Appearance</div>
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

        {/* Accent keeps its swatch palette (stored by swatch id, or hex when custom); Profit/Loss/Metric are custom-only. */}
        <ColorSetting D={D} title="Interface Accent Color" color={D.blue} swatches={COLOR_LIST}
          onChange={(hex, meta) => setAccent(meta?.id || hex)} onReset={() => setAccent(DEFAULT_ACCENT_ID)} />
        <ColorSetting D={D} title="Profit Color" color={D.green}
          onChange={setProfitColor} onReset={() => setProfitColor(DEFAULT_PROFIT_COLOR_ID)} />
        <ColorSetting D={D} title="Loss Color" color={D.red}
          onChange={setLossColor} onReset={() => setLossColor(DEFAULT_LOSS_COLOR_ID)} />
        <ColorSetting D={D} title="Metric Color" color={D.metric}
          onChange={setMetricColor} onReset={() => setMetricColor(DEFAULT_METRIC_COLOR_ID)} />

        <button onClick={reset} style={{ padding: "10px 24px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 10, color: D.textMuted, cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}>
          Reset to default
        </button>
      </div>
    </div>
  );
}

// One settings card: a title and a ColorPicker (components/ColorPicker.jsx).
function ColorSetting({ D, title, color, onChange, swatches, onReset }) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: D.text }}>{title}</div>
      <ColorPicker D={D} title={title} value={color} swatches={swatches} onChange={onChange} onReset={onReset} />
    </div>
  );
}
