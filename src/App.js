import { useTradeData, useIsMobile, useDesign, useNavigation } from "./hooks";
import { MODULES, SETTINGS_MODULE, BOTTOM_NAV_H } from "./constants.jsx";

import { GlobalStyles }  from "./components/GlobalStyles";
import NavIcon           from "./components/NavIcon";
import ModuleContent     from "./components/ModuleContent";
import Settings          from "./modules/Settings";

const FONT  = "'DM Sans', system-ui, sans-serif";
const NAV_H = 56;

export default function App() {
  const { trades, setTrades, stats, loading, error } = useTradeData();
  const [design, setDesign] = useDesign();
  const isMobile = useIsMobile();
  const { tab, setTab, globalTab } = useNavigation();

  const D      = design;
  const goToData = () => setTab("data");

  if (error) return (
    <div style={{ minHeight: "100vh", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: D.red, fontSize: 14 }}>Error: {error}</div>
    </div>
  );

  const content = loading ? (
    <div style={{ textAlign: "center", padding: 80, color: D.textMuted, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" }}>Loading...</div>
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
      <div style={{ height: "100vh", color: D.text, fontFamily: FONT, display: "flex", flexDirection: "column", background: D.bg, overflow: "hidden" }}>
        <GlobalStyles design={D} />
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", flexShrink: 0, borderBottom: `1px solid ${D.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>
            {globalTab === "settings" ? "Settings" : (MODULES.find(m => m.id === tab)?.label || "")}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: BOTTOM_NAV_H + 16 }}>{content}</div>
        <div style={{ height: BOTTOM_NAV_H, flexShrink: 0, background: D.bg, borderTop: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          {mobileTabs.map(m => {
            const isActive = globalTab === "settings" ? m.id === "settings" : tab === m.id;
            return (
              <button key={m.id} onClick={() => setTab(m.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: isActive ? D.text : D.textMuted }}>
                <NavIcon path={m.icon} />
                <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, letterSpacing: "0.02em" }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", color: D.text, fontFamily: FONT, background: D.bg, overflow: "hidden" }}>
      <GlobalStyles design={D} />

      <div style={{ height: NAV_H, borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {MODULES.map(m => {
            const isActive = globalTab !== "settings" && tab === m.id;
            return (
              <button key={m.id} className={`nav-btn${isActive ? " active" : ""}`} onClick={() => setTab(m.id)}>
                <NavIcon path={m.icon} />
                <span>{m.label}</span>
              </button>
            );
          })}
          <div style={{ width: 1, height: 18, background: D.border, margin: "0 6px" }} />
          <button className={`nav-btn${globalTab === "settings" ? " active" : ""}`} onClick={() => setTab("settings")}>
            <NavIcon path={SETTINGS_MODULE.icon} />
            <span>{SETTINGS_MODULE.label}</span>
          </button>
        </div>
      </div>

      <div style={{ height: `calc(100% - ${NAV_H}px)`, overflowY: "auto" }}>
        <div style={{ padding: "24px max(24px, 10vw) 32px" }}>
          {content}
        </div>
      </div>
    </div>
  );
}
