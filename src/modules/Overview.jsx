import { GlowCard } from "../utils/ui";
import { fmt } from "../utils/calculations";
import { EquityCurve, CalendarView } from "../components/Charts";

export default function Overview({ stats, design: D }) {
  if (!stats) return (
    <GlowCard design={D} style={{ padding: 40, textAlign: "center", color: D.textMuted }}>
      No trades yet. Add trades in the Data tab.
    </GlowCard>
  );

  const statItems = [
    { label: "Total PnL",     value: fmt(stats.totalPnl) },
    { label: "Win Rate",      value: stats.winRate > 0 ? `${(stats.winRate * 100).toFixed(0)}%` : "—" },
    { label: "Avg RR",        value: stats.avgRR > 0 ? `${stats.avgRR.toFixed(2)}R` : "—" },
    { label: "Trades / Week", value: stats.avgTradesPerWeek > 0 ? stats.avgTradesPerWeek.toFixed(1) : "—" },
    { label: "Expectancy",    value: fmt(stats.expectancy) },
    { label: "Max Drawdown",  value: fmt(stats.mdd) },
  ];

  const streakItems = [
    ["Wins",        stats.wins],
    ["Losses",      stats.losses],
    ["Break-even",  stats.bes],
    ["Avg Win",     fmt(stats.avgWin)],
    ["Avg Loss",    `-$${stats.avgLoss.toFixed(0)}`],
    ["Win Streak",  stats.maxWinStreak],
    ["Loss Streak", stats.maxLossStreak],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Primary metrics — fixed grid, no floating/loose placement */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: D.border, border: `1px solid ${D.border}` }}>
        {statItems.map(c => (
          <div key={c.label} style={{ background: D.card, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginBottom: 8 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: D.text, letterSpacing: "-0.02em" }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <EquityCurve equityCurve={stats.equityCurve} D={D} />

      {/* Secondary metrics — same hairline grid module */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: D.border, border: `1px solid ${D.border}` }}>
        {streakItems.map(([label, value]) => (
          <div key={label} style={{ background: D.card, padding: "14px 16px", minWidth: 0 }}>
            <div style={{ fontSize: 9, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: D.text }}>{value}</div>
          </div>
        ))}
      </div>

      <CalendarView trades={stats.rawTrades || []} D={D} />
    </div>
  );
}
