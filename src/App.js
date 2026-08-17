import { useTradeData, useIsMobile, useDesign, useNavigation } from "./hooks";
import { MODULES, SETTINGS_MODULE } from "./constants.jsx";

import { GlobalStyles }  from "./components/GlobalStyles";
import NavIcon           from "./components/NavIcon";
import ModuleContent     from "./components/ModuleContent";
import Settings          from "./modules/Settings";
import PageBackground    from "./components/PageBackground";

const FONT       = "'DM Sans', system-ui, sans-serif";
const SIDEBAR_W  = 216;
const BOTTOM_NAV_H = 56;

export default function App() {
  const { trades, setTrades, stats, loading, error } = useTradeData();
  const [design, setDesign] = useDesign();
  const isMobile = useIsMobile();
  const { tab, setTab, globalTab } = useNavigation();

  const D      = design;
  const goToData = () => setTab("data");

  const activeModule = globalTab === "settings" ? SETTINGS_MODULE : MODULES.find(m => m.id === tab);

  if (error) return (
    <div style={{ minHeight: "100vh", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: D.red, fontSize: 14 }}>Error: {error}</div>
    </div>
  );

  const content = loading ? (
    <div style={{ textAlign: "center", padding: 80, color: D.textMuted, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading</div>
  ) : (
    <>
      {globalTab === "settings" && <Settings design={D} onChange={setDesign} />}
      {globalTab !== "settings" && (
        <ModuleContent
          tab={tab} globalTab={globalTab}
          trades={trades} setTrades={setTrades} stats={stats}
          design={D} onGoToData={goToData}
        />
      )}
    </>
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileTabs = [SETTINGS_MODULE, ...MODULES];
    return (
      <div style={{ height: "100vh", color: D.text, fontFamily: FONT, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, overflow: "hidden", background: D.bg }}>
        <GlobalStyles design={D} />
        <PageBackground design={D} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", flexShrink: 0, borderBottom: `1px solid ${D.border}`, background: D.bg }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: D.text, letterSpacing: "0.01em" }}>
            {activeModule?.label || ""}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: BOTTOM_NAV_H + 16 }}>{content}</div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: BOTTOM_NAV_H, background: D.sidebar, borderTop: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 20 }}>
          {mobileTabs.map(m => {
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

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", color: D.text, fontFamily: FONT, position: "relative", zIndex: 1, overflow: "hidden", background: D.bg, display: "flex" }}>
      <GlobalStyles design={D} />
      <PageBackground design={D} />

      {/* Sidebar */}
      <div className="side-rail" style={{ width: SIDEBAR_W, flexShrink: 0, position: "relative", zIndex: 20 }}>
        <div className="side-logo">
          <div className="side-mark"><span /><span /><span /><span /></div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: D.text }}>DASHBOARD</div>
        </div>

        <nav className="side-nav">
          {MODULES.map(m => {
            const isActive = globalTab !== "settings" && tab === m.id;
            return (
              <button key={m.id} className={`side-item${isActive ? " active" : ""}`} onClick={() => setTab(m.id)}>
                <NavIcon path={m.icon} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-foot">
          <button className={`side-item${globalTab === "settings" ? " active" : ""}`} onClick={() => setTab("settings")}>
            <NavIcon path={SETTINGS_MODULE.icon} />
            <span>{SETTINGS_MODULE.label}</span>
          </button>
        </div>
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 1 }}>
        <div className="top-bar">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="top-bar-crumb">Dashboard /</span>
            <span className="top-bar-title">{activeModule?.label || ""}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "28px 32px 40px" }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
