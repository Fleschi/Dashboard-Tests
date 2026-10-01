import OverviewPage from "../features/overview/OverviewPage";
import JournalPage from "../features/journal/JournalPage";
import DataPage from "../features/data/DataPage";

export default function ModuleContent({ tab, trades, setTrades, stats, design: D, onGoToData, onGoToDataDate, jumpDate, onJumpHandled, timeRange, onTimeRangeChange, dataTimeRange, onDataTimeRangeChange, isMobile, topBarSlot }) {
  return (
    <>
      <div style={{ display: tab === "data" ? "block" : "none" }}>
        <DataPage
          trades={trades} onTradesChange={setTrades} design={D} topBarSlot={topBarSlot} active={tab === "data"}
          jumpDate={jumpDate} onJumpHandled={onJumpHandled}
          timeRange={dataTimeRange} onTimeRangeChange={onDataTimeRangeChange}
        />
      </div>

      {tab !== "data" && (
        <>
          {trades.length === 0 && tab !== "journal" && (
            <EmptyState onAction={onGoToData} label="Add trades →" message="No trades yet." design={D} />
          )}
          {tab === "overview"   && (
            <OverviewPage
              stats={stats} design={D} isMobile={isMobile} topBarSlot={topBarSlot} onGoToDataDate={onGoToDataDate}
              timeRange={timeRange} onTimeRangeChange={onTimeRangeChange}
            />
          )}
          {tab === "journal"   && <JournalPage design={D} topBarSlot={topBarSlot} />}
        </>
      )}
    </>
  );
}

function EmptyState({ message, label, onAction, design: D }) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4, padding: 48, textAlign: "center" }}>
      <div style={{ color: D.textMuted, marginBottom: 12 }}>{message}</div>
      <span style={{ color: D.blue, cursor: "pointer", fontWeight: 600 }} onClick={onAction}>{label}</span>
    </div>
  );
}