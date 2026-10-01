import NavIcon from "./NavIcon";
import { BOTTOM_NAV_H, MODULES, SETTINGS_MODULE } from "./navigation";
import { FONT_FAMILY } from "../theme/fonts";

const MOBILE_TABS = [SETTINGS_MODULE, ...MODULES];

export default function MobileLayout({ design: D, activeModule, tab, globalTab, setTab, children }) {
  return (
    <div style={{ height: "100vh", color: D.text, fontFamily: FONT_FAMILY, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, overflow: "hidden", background: D.bg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", flexShrink: 0, borderBottom: `1px solid ${D.border}`, background: D.bg }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: D.text, letterSpacing: "0.01em" }}>
          {activeModule?.label || ""}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: BOTTOM_NAV_H + 16 }}>{children}</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: BOTTOM_NAV_H, background: D.sidebar, borderTop: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 20 }}>
        {MOBILE_TABS.map(m => {
          const isActive = globalTab === "settings" ? m.id === "settings" : tab === m.id;
          return (
            <button key={m.id} onClick={() => setTab(m.id)} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", borderTop: isActive ? `2px solid ${D.text}` : "2px solid transparent", cursor: "pointer", color: isActive ? D.text : D.textMuted }}>
              <NavIcon path={m.icon} />
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, letterSpacing: "0.04em" }}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
