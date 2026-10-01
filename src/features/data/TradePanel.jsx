import { fmt } from "../../shared/utils/format";
import { SegmentedDateInput } from "./SegmentedDateInput";
import { humanDateFromParts } from "./dateParts";

//
// Two meaningful groups instead of a flat stack of inputs:
//   "When"   — the segmented date/time, with a live readable preview underneath.
//   "Result" — RR and PnL side by side, with a live outcome pill tying them together.

export function TradePanel({ open, mode, form, onChange, onClose, onSubmit, saving, D, outcomeColor, outcomeLabel }) {
  const hasDate  = !!(form.dd && form.mm && form.yy);
  const humanDate = hasDate ? humanDateFromParts(form) : null;
  const parsedPnl = form.pnl !== "" && !isNaN(parseFloat(form.pnl)) ? parseFloat(form.pnl) : null;
  const parsedRr  = form.rr  !== "" && !isNaN(parseFloat(form.rr))  ? parseFloat(form.rr)  : null;
  const canSubmit = hasDate && parsedPnl !== null && !saving;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease", zIndex: 999,
        }}
      />
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "100vw",
          background: D.card, borderLeft: `1px solid ${D.border}`,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease", boxShadow: "-8px 0 28px rgba(0,0,0,0.3)",
          zIndex: 1000, display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>{mode === "edit" ? "Edit Trade" : "Add Trade"}</div>
              <div style={{ fontSize: 12, color: D.textMuted, marginTop: 3 }}>
                {mode === "edit" ? "Update the details for this trade." : "Log a completed trade to your journal."}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: D.textMuted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 2, flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* When */}
          <div>
            <div style={sectionLabelStyle(D)}>Date</div>
            <div style={wellStyle(D)}>
              <SegmentedDateInput parts={form} onChange={p => onChange(f => ({ ...f, ...p }))} D={D} size="big" />
            </div>
            <div style={{ fontSize: 11, color: D.textMuted, marginTop: 6, textAlign: "center" }}>
              {humanDate || ""}
            </div>
          </div>

          {/* Result */}
          <div>
            <div style={sectionLabelStyle(D)}>Result</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={fieldLabelStyle(D)}>RR</label>
                <div style={inputWrapStyle(D)}>
                  <input type="number" step="0.1" placeholder="0.0" value={form.rr}
                    onChange={e => onChange(f => ({ ...f, rr: e.target.value }))}
                    style={bareInputStyle(D)} />
                  <span style={unitStyle(D)}>R</span>
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle(D)}>PnL</label>
                <div style={inputWrapStyle(D, parsedPnl !== null ? outcomeColor(parsedPnl) : undefined)}>
                  <span style={unitStyle(D)}>$</span>
                  <input type="number" placeholder="0" value={form.pnl}
                    onChange={e => onChange(f => ({ ...f, pnl: e.target.value }))}
                    style={bareInputStyle(D)} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, minHeight: 24, display: "flex", alignItems: "center", gap: 8 }}>
              {parsedPnl !== null && (
                <>
                  <span style={outcomePillStyle(D, outcomeColor(parsedPnl))}>{outcomeLabel(parsedPnl)}</span>
                  <span style={{ fontSize: 11, color: D.textMuted }}>
                    {parsedRr !== null ? `${parsedRr.toFixed(1)}R · ` : ""}{fmt(parsedPnl)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: `1px solid ${D.border}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onSubmit} disabled={!canSubmit}
              style={{ flex: 1, padding: "12px 22px", background: D.text, color: D.bg, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: canSubmit ? "pointer" : "default", opacity: canSubmit ? 1 : 0.4 }}>
              {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Trade"}
            </button>
            <button onClick={onClose} style={{ padding: "12px 18px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.textMuted, fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const sectionLabelStyle = (D) => ({ fontSize: 12, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 });

const fieldLabelStyle   = (D) => ({ fontSize: 12, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 });

const wellStyle         = (D) => ({ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 10, padding: "14px 12px", display: "flex", justifyContent: "center" });

const inputWrapStyle    = (D, accent) => ({ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: D.bg, border: `1px solid ${accent || D.border}`, borderRadius: 8, width: "100%", maxWidth: 90, boxSizing: "border-box" });

const bareInputStyle    = (D) => ({ flex: 1, minWidth: 0, width: "100%", background: "transparent", border: "none", outline: "none", color: D.text, fontSize: 14, fontFamily: "monospace" });

const unitStyle         = (D) => ({ fontSize: 12, color: D.textMuted, fontWeight: 600, flexShrink: 0 });

const outcomePillStyle  = (D, color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", background: `${color}15`, color, border: `1px solid ${color}30` });
