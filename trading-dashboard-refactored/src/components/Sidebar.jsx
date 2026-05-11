import NavIcon from "./NavIcon";
import { SETTINGS_MODULE, SIDEBAR_WIDTH, ICON_ONLY_WIDTH } from "../constants.jsx";

export default function Sidebar({
  open, onToggle,
  modules, tab, isForward,
  mode, onSwitchMode, onSetTab,
  design: D,
  tradeCount, modeColor,
}) {
  const sidebarW = ICON_ONLY_WIDTH; // Always collapsed

  return (
    <div style={{
      width: sidebarW, minWidth: sidebarW, flexShrink: 0,
      overflow: "visible", // Allow tooltips to overflow
      background: D.sidebar || "#0d0d14",
      borderRight: `1px solid ${D.border}`,
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0, zIndex: 10,
    }}>
      {/* Inner wrapper */}
      <div style={{ width: ICON_ONLY_WIDTH, display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Logo */}
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${D.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.text }}>T</div>
        </div>

        {/* Settings link */}
        <div style={{ padding: "8px 8px 0" }}>
          <div style={{ position: "relative" }}>
            <button
              className={`nav-item${tab === "settings" ? " active-settings" : ""}`}
              onClick={() => onSetTab("settings")}
              onMouseEnter={(e) => {
                const tooltip = e.currentTarget.querySelector('.nav-tooltip');
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const tooltip = e.currentTarget.querySelector('.nav-tooltip');
                if (tooltip) tooltip.style.opacity = '0';
              }}
            >
              <NavIcon path={SETTINGS_MODULE.icon} />
              <span className="nav-tooltip" style={{
                position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                marginLeft: '12px', whiteSpace: 'nowrap',
                background: D.card, border: `1px solid ${D.border}`, borderRadius: 8,
                padding: '6px 12px', fontSize: 13, color: D.text, fontWeight: 500,
                opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s',
                zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {SETTINGS_MODULE.label}
              </span>
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: "8px 8px 10px", borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[["backtesting", "B"], ["forward", "L"]].map(([m, label]) => (
              <button key={m} onClick={() => onSwitchMode(m)} style={modeButtonCollapsedStyle(mode, m)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Module nav */}
        <nav style={{ flex: 1, paddingTop: 8, overflowY: "auto", overflowX: "visible" }}>
          {modules.map(m => {
            const isActive = tab === m.id;
            const cls = isActive
              ? `nav-item ${isForward ? "active-fwd" : "active-back"}`
              : "nav-item";
            return (
              <div key={m.id} style={{ position: "relative" }}>
                <button
                  className={cls}
                  onClick={() => onSetTab(m.id)}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.nav-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.nav-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <NavIcon path={m.icon} />
                  <span className="nav-tooltip" style={{
                    position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                    marginLeft: '12px', whiteSpace: 'nowrap',
                    background: D.card, border: `1px solid ${D.border}`, borderRadius: 8,
                    padding: '6px 12px', fontSize: 13, color: D.text, fontWeight: 500,
                    opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s',
                    zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {m.label}
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function modeButtonCollapsedStyle(currentMode, m) {
  const active = currentMode === m;
  return {
    width: "100%", padding: "5px 0", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.15s",
    background: active
      ? m === "backtesting" ? "linear-gradient(135deg, #818cf8, #6366f1)" : "linear-gradient(135deg, #10e8a0, #059669)"
      : "rgba(255,255,255,0.04)",
    color: active ? "#fff" : "#52525b",
  };
}