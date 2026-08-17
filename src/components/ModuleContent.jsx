import Overview      from "../modules/Overview";
import MonteCarlo    from "../modules/MonteCarlo";
import PropFirm      from "../modules/PropFirm";
import TradeNotebook from "../modules/TradeNotebook";
import DataEntry     from "../modules/DataEntry";

export default function ModuleContent({ tab, globalTab, trades, setTrades, stats, design: D, onGoToData }) {
  if (globalTab === "settings") return null;

  return (
    <>
      <div style={{ display: tab === "data" ? "block" : "none" }}>
        <DataEntry trades={trades} onTradesChange={setTrades} design={D} mode="backtesting" />
      </div>

      {tab !== "data" && (
        <>
          {trades.length === 0 && tab !== "notebook" && (
            <EmptyState onAction={onGoToData} label="Add trades →" message="No trades yet." design={D} />
          )}
          {tab === "overview"   && <Overview stats={stats} design={D} />}
          {tab === "propfirm"   && <PropFirm stats={stats} design={D} />}
          {tab === "montecarlo" && <MonteCarlo stats={stats} design={D} />}
          {tab === "notebook"   && <TradeNotebook design={D} />}
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