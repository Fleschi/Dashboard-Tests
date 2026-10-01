import { useState, useEffect } from "react";
import { WIDGET_DEFS, getWidgetHeight } from "./widgetRegistry";
import { CELLS_WIDE } from "./overviewModel";
import { getWidgetCells } from "./widgetCells";

// ─── AddWidgetPanel (slide-over, mirrors the Data tab's TradePanel) ────────────
//
// Four categories:
//   "small" / "big"  — browse widgets, each shown via its own real Render
//                       component at its real, fixed defaultSize. Selecting
//                       one adds it to the group this panel was opened for.
//   "custom"         — the user's own saved layout presets.
//   "premade"        — the built-in layout presets (Balanced, Ratios Focus, ...).
// Selecting a preset applies it to the whole Overview, exactly like the old
// "Custom Layout" dropdown did.

const CATEGORIES = [
  ["small", "Small"],
  ["big", "Big"],
  ["custom", "Custom"],
  ["premade", "Premade"],
];

function PresetThumbnail({ groups, D }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: "grid", gridTemplateColumns: `repeat(${CELLS_WIDE}, 1fr)`, gridAutoRows: "10px", gap: 3 }}>
          {g.widgets.length === 0
            ? <div style={{ gridColumn: `span ${CELLS_WIDE}`, height: 12, borderRadius: 3, border: `1px dashed ${D.border}` }} />
            : g.widgets.map((w, wi) => {
              const { w: cw, h: ch } = getWidgetCells(w.type, w.size);
              return (
                <div key={wi} style={{
                  gridColumn: `${w.x + 1} / span ${cw}`,
                  gridRow: `${w.y + 1} / span ${ch}`,
                  borderRadius: 3, background: `${D.text}14`, border: `1px solid ${D.border}`,
                }} />
              );
            })}
        </div>
      ))}
    </div>
  );
}

function PreviewCardShell({ onClick, D, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4,
        padding: 12, cursor: "pointer", textAlign: "left", font: "inherit", width: "100%",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={ev => { ev.currentTarget.style.borderColor = D.textMuted; }}
      onMouseLeave={ev => { ev.currentTarget.style.borderColor = D.border; }}
    >
      {children}
    </button>
  );
}

export default function AddWidgetPanel({ open, onClose, onSelectWidget, presets, onApplyPreset, stats, trades, D }) {
  const [category, setCategory] = useState("small");

  // Reset to the default tab whenever the panel is (re)opened.
  useEffect(() => { if (open) setCategory("small"); }, [open]);

  const isWidgetTab = category === "small" || category === "big";
  const widgetEntries = isWidgetTab
    ? Object.entries(WIDGET_DEFS).filter(([, def]) => def.category === category)
    : [];

  const presetList = category === "custom"
    ? (presets || []).filter(p => !p.builtIn)
    : category === "premade"
      ? (presets || []).filter(p => p.builtIn)
      : [];

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
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>Add Widget</div>
              <div style={{ fontSize: 12, color: D.textMuted, marginTop: 3 }}>
                {isWidgetTab ? "Pick a widget to add to this group." : "Pick a layout to apply to the Overview."}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: D.textMuted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 2, flexShrink: 0 }}>×</button>
          </div>

          {/* Category toggle */}
          <div style={{ display: "flex", marginTop: 16, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: 3 }}>
            {CATEGORIES.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                style={{
                  flex: 1, padding: "7px 0", border: "none", borderRadius: 6, cursor: "pointer",
                  fontSize: 11, fontWeight: 600,
                  background: category === id ? D.text : "transparent",
                  color: category === id ? D.bg : D.textMuted,
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>

          {isWidgetTab && widgetEntries.map(([type, def]) => {
            const Render = def.Render;
            return (
              <PreviewCardShell key={type} D={D} onClick={() => onSelectWidget(type)}>
                <div style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{def.label}</div>
                {/* Actual widget component, at its real fixed size — pointer-events
                    disabled so any interactive bits inside (e.g. calendar nav)
                    don't hijack the click; clicking anywhere here just selects it. */}
                <div style={{
                  background: D.bg, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4,
                  overflow: "hidden", height: getWidgetHeight(type, def.defaultSize),
                  pointerEvents: "none",
                }}>
                  <Render stats={stats} trades={trades} D={D} size={def.defaultSize} />
                </div>
              </PreviewCardShell>
            );
          })}

          {!isWidgetTab && presetList.length === 0 && (
            <div style={{ padding: "24px 4px", textAlign: "center", color: D.textMuted, fontSize: 12 }}>
              {category === "custom" ? "No custom presets saved yet — use “Save Preset” to create one." : "No premade layouts available."}
            </div>
          )}

          {!isWidgetTab && presetList.map(p => (
            <PreviewCardShell key={p.id} D={D} onClick={() => onApplyPreset(p.id)}>
              <div style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{p.name}</div>
              <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4, padding: 10 }}>
                <PresetThumbnail groups={p.groups} D={D} />
              </div>
              <div style={{ fontSize: 10, color: D.textMuted }}>
                {p.groups.length} group{p.groups.length !== 1 ? "s" : ""} · {p.groups.reduce((s, g) => s + g.widgets.length, 0)} widgets
              </div>
            </PreviewCardShell>
          ))}
        </div>
      </div>
    </>
  );
}