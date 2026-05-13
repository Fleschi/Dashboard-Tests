import { useTradeData, useIsMobile, useDesign, useNavigation } from "./hooks";
import { BACK_MODULES, FWD_MODULES, SETTINGS_MODULE, BOTTOM_NAV_H } from "./constants.jsx";

import { GlobalStyles } from "./components/GlobalStyles";
import NavIcon          from "./components/NavIcon";
import ModuleContent    from "./components/ModuleContent";
import Settings         from "./modules/Settings";
import PageBackground   from "./components/PageBackground";

const FONT  = "'DM Sans', system-ui, sans-serif";
const NAV_H = 56;

export default function App() {
  const { backTrades, setBackTrades, fwdTrades, setFwdTrades, backStats, loading, error } = useTradeData();
  const [design, setDesign] = useDesign();
  const isMobile = useIsMobile();
  const { mode, isForward, tab, setTab, switchMode, globalTab } = useNavigation();

  const D         = design;
  const modules   = isForward ? FWD_MODULES : BACK_MODULES;
  const modeColor = isForward ? D.green : D.blue;
  const goToData  = () => setTab(isForward ? "fwd-data" : "data");

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
        <ModuleContent tab={tab} globalTab={globalTab} isForward={isForward}
          backTrades={backTrades} setBackTrades={setBackTrades}
          fwdTrades={fwdTrades} setFwdTrades={setFwdTrades}
          backStats={backStats} design={D} onGoToData={goToData} />
      )}
    </>
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileTabs = [SETTINGS_MODULE, ...modules];
    return (
      <div style={{ height: "100vh", color: D.text, fontFamily: FONT, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, overflow: "hidden", background: D.bg }}>
        <GlobalStyles design={D} />
        <PageBackground design={D} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0, borderBottom: `1px solid ${D.border}`, background: `${D.card}ee`, backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>
            {globalTab === "settings" ? "Settings" : (modules.find(m => m.id === tab)?.label || "")}
          </div>
          <div className="lg-mode">
            {[["backtesting", "Back"], ["forward", "Live"]].map(([m, label]) => (
              <button key={m} className={`lg-mode-btn${mode === m ? " active" : ""}`} onClick={() => switchMode(m)}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: BOTTOM_NAV_H + 16 }}>{content}</div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: BOTTOM_NAV_H, background: `${D.card}f5`, backdropFilter: "blur(16px)", borderTop: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 20 }}>
          {mobileTabs.map(m => {
            const isActive = globalTab === "settings" ? m.id === "settings" : tab === m.id;
            return (
              <button key={m.id} onClick={() => setTab(m.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", background: "none", border: "none", cursor: "pointer", color: isActive ? modeColor : D.textMuted }}>
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

      {/* Floating nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: NAV_H, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", pointerEvents: "none" }}>
        <div className="lg-shell" style={{ pointerEvents: "all" }}>
          <div className="lg-mode">
            {[["backtesting", "Back"], ["forward", "Live"]].map(([m, label]) => (
              <button key={m} className={`lg-mode-btn${mode === m ? " active" : ""}`} onClick={() => switchMode(m)}>{label}</button>
            ))}
          </div>
          <div className="lg-divider" />
          {modules.map(m => {
            const isActive = globalTab !== "settings" && tab === m.id;
            return (
              <div key={m.id} style={{ position: 'relative' }}>
                <button
                  className={`lg-btn${isActive ? " active" : ""}`}
                  onClick={() => setTab(m.id)}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.nextElementSibling;
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.nextElementSibling;
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <NavIcon path={m.icon} />
                </button>
                <span style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  background: D.card,
                  border: `1px solid ${D.border}`,
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: D.text,
                  fontWeight: 500,
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.3s ease',
                  transitionDelay: '0.2s',
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  {m.label}
                </span>
              </div>
            );
          })}
          <div className="lg-divider" />
          <div style={{ position: 'relative' }}>
            <button
              className={`lg-btn${globalTab === "settings" ? " active" : ""}`}
              onClick={() => setTab("settings")}
              onMouseEnter={(e) => {
                const tooltip = e.currentTarget.nextElementSibling;
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const tooltip = e.currentTarget.nextElementSibling;
                if (tooltip) tooltip.style.opacity = '0';
              }}
            >
              <NavIcon path={SETTINGS_MODULE.icon} />
            </button>
            <span style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              background: D.card,
              border: `1px solid ${D.border}`,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              color: D.text,
              fontWeight: 500,
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease',
              transitionDelay: '0.2s',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {SETTINGS_MODULE.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content — full viewport width, padding scales with vw */}
      <div style={{ height: "100%", overflowY: "auto", position: "relative", zIndex: 1 }}>
        <div style={{ paddingTop: NAV_H + 16, paddingBottom: 32, paddingLeft: "max(24px, 10vw)", paddingRight: "max(24px, 10vw)" }}>
          {content}
        </div>
      </div>
    </div>
  );
}