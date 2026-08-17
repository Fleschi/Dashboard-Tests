import { useTradeData, useIsMobile, useDesign, useNavigation } from "./hooks";
import { MODULES, SETTINGS_MODULE, BOTTOM_NAV_H } from "./constants.jsx";

import { GlobalStyles }  from "./components/GlobalStyles";
import NavIcon           from "./components/NavIcon";
import ModuleContent     from "./components/ModuleContent";
import Settings          from "./modules/Settings";
import PageBackground    from "./components/PageBackground";

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
    <div style={{ textAlign: "center", padding: 80, color: D.textMuted, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</div>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0, borderBottom: `1px solid ${D.border}`, background: `${D.card}ee`, backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>
            {globalTab === "settings" ? "Settings" : (MODULES.find(m => m.id === tab)?.label || "")}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: BOTTOM_NAV_H + 16 }}>{content}</div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: BOTTOM_NAV_H, background: `${D.card}f5`, backdropFilter: "blur(16px)", borderTop: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 20 }}>
          {mobileTabs.map(m => {
            const isActive = globalTab === "settings" ? m.id === "settings" : tab === m.id;
            return (
              <button key={m.id} onClick={() => setTab(m.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: isActive ? D.blue : D.textMuted }}>
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
    <div style={{ height: "100vh", color: D.text, fontFamily: FONT, position: "relative", zIndex: 1, overflow: "hidden", background: D.bg }}>
      <GlobalStyles design={D} />
      <PageBackground design={D} />

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: NAV_H, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", pointerEvents: "none" }}>
        <div className="lg-shell" style={{ pointerEvents: "all" }}>
          {MODULES.map(m => {
            const isActive = globalTab !== "settings" && tab === m.id;
            return (
              <button
                key={m.id}
                className={`lg-btn${isActive ? " active" : ""}`}
                onClick={() => setTab(m.id)}
                onMouseEnter={(e) => {
                  const label = e.currentTarget.querySelector('.nav-label-text');
                  if (label) { label.style.maxWidth = '200px'; label.style.opacity = '1'; }
                }}
                onMouseLeave={(e) => {
                  const label = e.currentTarget.querySelector('.nav-label-text');
                  if (label) { label.style.maxWidth = '0'; label.style.opacity = '0'; }
                }}
              >
                <NavIcon path={m.icon} />
                <span className="nav-label-text" style={{ maxWidth: '0', overflow: 'hidden', opacity: 0, transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease', display: 'inline-block' }}>
                  {m.label}
                </span>
              </button>
            );
          })}
          <div className="lg-divider" />
          <button
            className={`lg-btn${globalTab === "settings" ? " active" : ""}`}
            onClick={() => setTab("settings")}
            onMouseEnter={(e) => {
              const label = e.currentTarget.querySelector('.settings-label');
              if (label) { label.style.maxWidth = '200px'; label.style.opacity = '1'; }
            }}
            onMouseLeave={(e) => {
              const label = e.currentTarget.querySelector('.settings-label');
              if (label) { label.style.maxWidth = '0'; label.style.opacity = '0'; }
            }}
          >
            <NavIcon path={SETTINGS_MODULE.icon} />
            <span className="settings-label" style={{ maxWidth: '0', overflow: 'hidden', opacity: 0, transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease', display: 'inline-block' }}>
              {SETTINGS_MODULE.label}
            </span>
          </button>
        </div>
      </div>

      <div style={{ height: "100%", overflowY: "auto", position: "relative", zIndex: 1 }}>
        <div style={{ paddingTop: NAV_H + 16, paddingBottom: 32, paddingLeft: "max(24px, 10vw)", paddingRight: "max(24px, 10vw)" }}>
          {content}
        </div>
      </div>
    </div>
  );
}