import NavIcon from "./NavIcon";
import { MODULES, SETTINGS_MODULE } from "./navigation";
import { FONT_FAMILY } from "../theme/fonts";

const SIDEBAR_W = 232;

function SideItem({ module: m, active, onClick }) {
  return (
    <button className={`side-item${active ? " active" : ""}`} onClick={onClick}>
      <span className="side-item-pill">
        <span className="side-icon-badge"><NavIcon path={m.icon} /></span>
        <span>{m.label}</span>
      </span>
    </button>
  );
}

// `topBarSlotRef` is a state setter used as a ref callback: the active module
// portals its primary top-bar action(s) into this node, and a plain useRef
// wouldn't trigger the re-render those children need once it mounts.
export default function DesktopLayout({ design: D, activeModule, tab, globalTab, setTab, topBarSlotRef, children }) {
  return (
    <div style={{ height: "100vh", color: D.text, fontFamily: FONT_FAMILY, position: "relative", zIndex: 1, overflow: "hidden", background: D.bg, display: "flex" }}>
      {/* Sidebar */}
      <div className="side-rail" style={{ width: SIDEBAR_W, flexShrink: 0, position: "relative", zIndex: 20 }}>
        <div className="side-logo">
          <div className="side-mark"><span /><span /><span /><span /></div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: D.text }}>DASHBOARD</div>
        </div>

        <nav className="side-nav">
          {MODULES.map(m => (
            <SideItem key={m.id} module={m} active={globalTab !== "settings" && tab === m.id} onClick={() => setTab(m.id)} />
          ))}
        </nav>

        <div className="side-foot">
          <SideItem module={SETTINGS_MODULE} active={globalTab === "settings"} onClick={() => setTab("settings")} />
        </div>
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 1 }}>
        <div className="top-bar">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="top-bar-crumb">Dashboard /</span>
            <span className="top-bar-title">{activeModule?.label || ""}</span>
          </div>
          <div ref={topBarSlotRef} style={{ display: "flex", alignItems: "center", gap: 10 }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "32px 40px 48px" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
