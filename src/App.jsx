import { useState } from "react";
import { useTradeData } from "./app/hooks/useTradeData";
import { useIsMobile } from "./app/hooks/useIsMobile";
import { useNavigation } from "./app/hooks/useNavigation";
import { useTimeRanges } from "./app/hooks/useTimeRanges";
import { useDesign } from "./theme/useDesign";
import { MODULES, SETTINGS_MODULE } from "./app/navigation";
import { GlobalStyles } from "./theme/GlobalStyles";
import DesktopLayout from "./app/DesktopLayout";
import MobileLayout from "./app/MobileLayout";
import ModuleContent from "./app/ModuleContent";
import SettingsPage from "./features/settings/SettingsPage";

export default function App() {
  const { trades, setTrades, stats, loading, error } = useTradeData();
  const [design, setDesign] = useDesign();
  const isMobile = useIsMobile();
  const { tab, setTab, globalTab } = useNavigation();
  // The DOM node the active module portals its primary top-bar action(s) into.
  const [topBarSlot, setTopBarSlot] = useState(null);
  const ranges = useTimeRanges({ tab, globalTab, setTab });

  const D = design;
  const inSettings = globalTab === "settings";
  const activeModule = inSettings ? SETTINGS_MODULE : MODULES.find(m => m.id === tab);

  if (error) return (
    <div style={{ minHeight: "100vh", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: D.red, fontSize: 14 }}>Error: {error}</div>
    </div>
  );

  let content;
  if (loading) {
    content = <div style={{ textAlign: "center", padding: 80, color: D.textMuted, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading</div>;
  } else if (inSettings) {
    content = <SettingsPage design={D} onChange={setDesign} />;
  } else {
    content = (
      <ModuleContent
        tab={tab}
        trades={trades} setTrades={setTrades} stats={stats}
        design={D} onGoToData={() => setTab("data")} onGoToDataDate={ranges.goToDataDate}
        jumpDate={ranges.jumpDate} onJumpHandled={ranges.clearJumpDate}
        timeRange={ranges.timeRange} onTimeRangeChange={ranges.setTimeRange}
        dataTimeRange={ranges.dataTimeRange} onDataTimeRangeChange={ranges.setDataTimeRange}
        isMobile={isMobile}
        topBarSlot={isMobile ? null : topBarSlot}
      />
    );
  }

  const layoutProps = { design: D, activeModule, tab, globalTab, setTab };
  return (
    <>
      <GlobalStyles design={D} />
      {isMobile
        ? <MobileLayout {...layoutProps}>{content}</MobileLayout>
        : <DesktopLayout {...layoutProps} topBarSlotRef={setTopBarSlot}>{content}</DesktopLayout>}
    </>
  );
}
