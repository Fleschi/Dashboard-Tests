import { WIDGET_DEFS } from "./widgetRegistry";

export default function WidgetShell({ widget, stats, trades, D, editMode, onRemove, dragProps, onGoToDataDate, height }) {
  const def = WIDGET_DEFS[widget.type];
  if (!def) return null;
  const Render = def.Render;

  return (
    <div
      draggable={editMode}
      {...(editMode ? dragProps : {})}
      style={{
        background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4,
        overflow: "hidden", height: height ?? "100%", width: "100%",
        display: "flex", flexDirection: "column",
        cursor: editMode ? "grab" : "default",
      }}
    >
      {editMode && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: `1px solid ${D.border}`, background: `${D.bg}80`, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: D.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {def.label}
          </span>
          <button onClick={onRemove} title="Remove widget" style={btnStyle(D)}>×</button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Render stats={stats} trades={trades} D={D} size={widget.size} onGoToDataDate={onGoToDataDate} />
      </div>
    </div>
  );
}

const btnStyle = (D) => ({
  background: "transparent", border: `1px solid ${D.border}`, borderRadius: 4,
  color: D.textMuted, cursor: "pointer", fontSize: 11, padding: "2px 6px", lineHeight: 1,
});