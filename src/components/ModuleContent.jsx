import Overview       from "../modules/Overview";
import MonteCarlo     from "../modules/MonteCarlo";
import PropFirm       from "../modules/PropFirm";
import ForwardOverview from "../modules/ForwardOverview";
import TradeNotebook  from "../modules/TradeNotebook";
import DataEntry      from "../modules/DataEntry";
// ─── ModuleContent ────────────────────────────────────────────────────────────
// Single place to add/remove modules. To add a new module:
//   1. Import it above.
//   2. Add a case to the relevant switch block (back or fwd).
//   3. Register it in constants.js BACK_MODULES / FWD_MODULES.

export default function ModuleContent({
  tab, globalTab, isForward,
  backTrades, setBackTrades,
  fwdTrades, setFwdTrades,
  backStats, design: D,
  onGoToData,
}) {
  // Settings overlay (global, mode-independent)
  if (globalTab === "settings") {
    return null; // Settings is rendered by the parent alongside this component
  }

  // ── Backtesting ──────────────────────────────────────────────────────────

  if (!isForward) {
    // DataEntry is always mounted to preserve internal state; visibility toggled via CSS
    return (
      <>
        <div style={{ display: tab === "data" ? "block" : "none" }}>
          <DataEntry trades={backTrades} onTradesChange={setBackTrades} design={D} mode="backtesting" />
        </div>

        {tab !== "data" && (
          <>
            {backTrades.length === 0 && (
              <EmptyState color={D.purple} onAction={onGoToData} label="Add trades →" message="No backtesting trades yet." design={D} />
            )}
            {tab === "overview"   && <Overview stats={backStats} design={D} />}
            {tab === "montecarlo" && <MonteCarlo stats={backStats} design={D} />}
            {tab === "propfirm"   && <PropFirm stats={backStats} design={D} />}
          </>
        )}
      </>
    );
  }

  // ── Forward / Live ────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ display: tab === "fwd-data" ? "block" : "none" }}>
        <DataEntry trades={fwdTrades} onTradesChange={setFwdTrades} design={D} mode="forward" />
      </div>

      {tab !== "fwd-data" && (
        <>
          {fwdTrades.length === 0 && tab !== "fwd-notebook" && (
            <EmptyState color={D.green} onAction={onGoToData} label="Add trades →" message="No live trades yet." design={D} />
          )}
          {tab === "fwd-overview" && <ForwardOverview trades={fwdTrades} design={D} />}
          {tab === "fwd-notebook" && <TradeNotebook design={D} />}
        </>
      )}
    </>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ message, label, color, onAction, design: D }) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 48, textAlign: "center" }}>
      <div style={{ color: D.textMuted, marginBottom: 12 }}>{message}</div>
      <span style={{ color, cursor: "pointer", fontWeight: 600 }} onClick={onAction}>{label}</span>
    </div>
  );
}
