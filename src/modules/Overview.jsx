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

      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
        <GlowCard design={D} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, minWidth: 220, flexShrink: 0 }}>
          {statItems.map(c => (
            <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${D.border}` }}>
              <div style={{ fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: D.text }}>{c.value}</div>
            </div>
          ))}
        </GlowCard>

        <EquityCurve equityCurve={stats.equityCurve} D={D} />
      </div>

      <GlowCard design={D} style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
          {streakItems.map(([label, value], i, arr) => (
            <div key={label} style={{ flex: "1 1 auto", padding: "8px 20px", borderRight: i < arr.length - 1 ? `1px solid ${D.border}` : "none", minWidth: 80 }}>
              <div style={{ fontSize: 10, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: D.text }}>{value}</div>
            </div>
          ))}
        </div>
      </GlowCard>

      <CalendarView trades={stats.rawTrades || []} D={D} />
    </div>
  );
}