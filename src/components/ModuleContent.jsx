import Overview      from "../modules/Overview";
import TradeNotebook from "../modules/TradeNotebook";
import DataEntry     from "../modules/DataEntry";

export default function ModuleContent({ tab, globalTab, trades, setTrades, stats, design: D, onGoToData, onGoToDataDate, jumpDate, onJumpHandled, timeRange, onTimeRangeChange, isMobile, topBarSlot }) {
  if (globalTab === "settings") return null;

  return (
    <>
      <div style={{ display: tab === "data" ? "block" : "none" }}>
        <DataEntry
          trades={trades} onTradesChange={setTrades} design={D} topBarSlot={topBarSlot} active={tab === "data"}
          jumpDate={jumpDate} onJumpHandled={onJumpHandled}
          timeRange={timeRange} onTimeRangeChange={onTimeRangeChange}
        />
      </div>

      {tab !== "data" && (
        <>
          {trades.length === 0 && tab !== "notebook" && (
            <EmptyState onAction={onGoToData} label="Add trades →" message="No trades yet." design={D} />
          )}
          {tab === "overview"   && (
            <Overview
              stats={stats} design={D} isMobile={isMobile} topBarSlot={topBarSlot} onGoToDataDate={onGoToDataDate}
              timeRange={timeRange} onTimeRangeChange={onTimeRangeChange}
            />
          )}
          {tab === "notebook"   && <TradeNotebook design={D} topBarSlot={topBarSlot} />}
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