import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { CalendarView } from "./CalendarView";
import { EquityCurve } from "./EquityCurve";
import { fmt, fmtPct } from "../../shared/utils/format";
import { percentile } from "../../shared/utils/tradeStats";
import { calcDayOfWeekStats, calcConsistencyScore, buildPnlHistogram } from "./widgetStats";
import { RingProgress } from "../../shared/components/RingProgress";

// ─── Shared bits ──────────────────────────────────────────────────────────────

function EmptyWidget({ D, label = "No data" }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 16, textAlign: "center", padding: 16 }}>
      {label}
    </div>
  );
}

function StatTile({ label, value, sub, color, D }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 27px" }}>
      <div style={{ fontSize: 15, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 11 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: color || D.text, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 16, color: D.textMuted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

const chartTitleStyle = (D) => ({ fontSize: 16, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 16 });

// ─── Small widgets ────────────────────────────────────────────────────────────

function NetPnlWidget({ stats, D }) {
  if (!stats) return <EmptyWidget D={D} />;
  return <StatTile D={D} label="Net PnL" value={fmt(stats.totalPnl)} sub={`${stats.totalTrades} trades`} color={stats.totalPnl >= 0 ? D.green : D.red} />;
}

function ExpectancyWidget({ stats, D }) {
  if (!stats) return <EmptyWidget D={D} />;
  return <StatTile D={D} label="Expectancy" value={fmt(stats.expectancy)} sub="" color={stats.expectancy >= 0 ? D.green : D.red} />;
}

function WinLossRatioWidget({ stats, D }) {
  if (!stats) return <EmptyWidget D={D} />;
  return <StatTile D={D} label="Win / Loss Ratio" value={stats.avgRR > 0 ? `${stats.avgRR.toFixed(2)}R` : "—"} color={D.text} />;
}

function ConsistencyScoreWidget({ trades, D }) {
  const score = calcConsistencyScore(trades);
  if (score === null) return <EmptyWidget D={D} />;
  const color = score >= 70 ? D.green : score >= 40 ? D.yellow : D.red;
  return <StatTile D={D} label="Consistency Score" value={`${score}`} sub="" color={color} />;
}

function AvgWinLossWidget({ stats, D }) {
  if (!stats) return <EmptyWidget D={D} />;
  const avgWin = stats.avgWin || 0, avgLoss = stats.avgLoss || 0;
  // Single full-width bar, split proportionally to avgLoss:avgWin — not a
  // pair of independent halves diverging from a fixed center. The divider
  // sits wherever that split actually falls (e.g. 40/60), so Loss+Win
  // together always cover exactly 100% of the widget's width, and the
  // split re-derives from live data on every render, so it rescales
  // automatically whenever avgWin/avgLoss change.
  const total = avgWin + avgLoss;
  const hasData = total > 0;
  const lossPct = hasData ? (avgLoss / total) * 100 : 0;
  const winPct  = hasData ? (avgWin  / total) * 100 : 0;
  return (
    <div style={{ height: "100%", padding: "24px 27px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 21 }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Avg Win</div>
          <div style={{ fontSize: 29, fontWeight: 700, color: D.green }}>{fmt(avgWin)}</div>
        </div>
        <div style={{ width: 1, height: 48, background: D.border, flexShrink: 0 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Avg Loss</div>
          <div style={{ fontSize: 29, fontWeight: 700, color: D.red }}>{`-$${avgLoss.toFixed(0)}`}</div>
        </div>
      </div>
      {/* [ Win portion | Loss portion ] — matches the Avg Win / Avg Loss
          header order above (win left, loss right). One continuous bar, not
          two bars either side of a fixed midpoint: widths are percentages
          of the combined avgLoss+avgWin scale, so they always sum to 100%
          of the available width; the boundary between them (a thin
          card-colored line, via box-shadow so it doesn't eat into either
          segment's width) is the "dividing line," positioned exactly at
          winPct%. */}
      <div style={{ display: "flex", width: "100%", height: 9, borderRadius: 5, overflow: "hidden", background: D.border }}>
        {hasData ? (
          <>
            <div style={{ width: `${winPct}%`, height: "100%", background: D.green, boxShadow: `2px 0 0 0 ${D.card}`, transition: "width 0.4s ease" }} />
            <div style={{ width: `${lossPct}%`, height: "100%", background: D.red, transition: "width 0.4s ease" }} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function WinRateWidget({ stats, D }) {
  if (!stats) return <EmptyWidget D={D} />;
  const pct = stats.winRate * 100;
  const ringColor = D.metric;
  return (
    <div style={{ height: "100%", padding: "24px 27px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 15, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 11 }}>Win Rate</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: D.text, letterSpacing: "-0.02em" }}>{fmtPct(stats.winRate)}</div>
      </div>
      <RingProgress percent={pct} color={ringColor} size={75} strokeWidth={9} />
    </div>
  );
}

// ─── Big widgets ──────────────────────────────────────────────────────────────

function DayOfWeekWidget({ trades, D }) {
  if (!trades?.length) return <EmptyWidget D={D} />;
  // calcDayOfWeekStats returns Mon..Sun; this widget only shows trading days,
  // so drop the weekend entries here rather than in the calculation itself.
  const data = calcDayOfWeekStats(trades).filter(d => d.day !== "Sat" && d.day !== "Sun");
  return (
    <div style={{ height: "100%", padding: 27, display: "flex", flexDirection: "column" }}>
      <div style={chartTitleStyle(D)}>Day of Week Performance</div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 11, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={D.border} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 15, fill: D.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 15, fill: D.textMuted }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={61} />
            <Tooltip
              // A plain `formatter` only covers the one rendered dataKey
              // ("pnl") — trade count lives alongside it on the same
              // per-day datum, not as its own Bar, so a custom `content`
              // renderer is what lets both lines share one tooltip. `count`
              // already reflects whatever trades were passed in, which
              // Overview has already narrowed to the selected date range
              // before this widget ever sees them.
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, fontSize: 16, padding: "8px 12px" }}>
                    <div style={{ color: D.text, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: D.textMuted }}>PnL: {fmt(d.pnl)}</div>
                    <div style={{ color: D.textMuted }}>Trades: {d.count}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? D.green : D.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DistributionWidget({ trades, D }) {
  if (!trades?.length) return <EmptyWidget D={D} />;
  const hist = buildPnlHistogram(trades, 12);
  return (
    <div style={{ height: "100%", padding: 27, display: "flex", flexDirection: "column" }}>
      <div style={chartTitleStyle(D)}>Trade Distribution</div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hist} margin={{ top: 5, right: 11, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={D.border} vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 13, fill: D.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 15, fill: D.textMuted }} axisLine={false} tickLine={false} width={43} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, fontSize: 16 }}
              labelStyle={{ color: D.text, fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: D.textMuted }}
              formatter={(value) => [value, "Trades"]}
              labelFormatter={(_, payload) => {
                const b = payload?.[0]?.payload;
                if (!b) return "";
                if (b.isBreakEven) return "Break-even (PnL = 0)";
                return `${fmt(b.rangeStart)} to ${fmt(b.rangeEnd)}`;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {hist.map((b, i) => <Cell key={i} fill={b.isBreakEven ? D.yellow : b.isNegative ? D.red : D.green} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CalendarWidget({ trades, rangeTrades, D, onGoToDataDate }) {
  return (
    <div style={{ height: "100%", overflow: "auto", padding: 11 }}>
      <CalendarView trades={trades} rangeTrades={rangeTrades} D={D} bare onDayClick={onGoToDataDate} />
    </div>
  );
}

function EquityCurveWidget({ stats, D }) {
  if (!stats) return <EmptyWidget D={D} />;
  return (
    <div style={{ height: "100%" }}>
      <EquityCurve equityCurve={stats.equityCurve} D={D} bare />
    </div>
  );
}

function runMiniMC(pnls, simCount = 300, tradesAhead = 40) {
  if (!pnls.length) return null;
  const finals = [];
  for (let s = 0; s < simCount; s++) {
    let eq = 0;
    for (let i = 0; i < tradesAhead; i++) eq += pnls[Math.floor(Math.random() * pnls.length)];
    finals.push(eq);
  }
  return finals;
}

// Simple equal-width histogram of the simulated final-PnL outcomes — a
// compact "shape of the distribution" visual to sit under the P10/P50/P90
// numbers, colored by whether each bin's midpoint is a loss or a gain.
// Carries each bin's own PnL range (rangeStart/rangeEnd), same shape as
// buildPnlHistogram above, so the bars can share the same hoverable-tooltip
// pattern used by Trade Distribution and Day of Week.
function buildOutcomeHistogram(finals, bins = 16) {
  const min = Math.min(...finals), max = Math.max(...finals);
  if (min === max) return [{ count: finals.length, isNegative: min < 0, rangeStart: min, rangeEnd: max }];
  const step = (max - min) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of finals) {
    let idx = Math.floor((v - min) / step);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return counts.map((count, i) => {
    const rangeStart = min + i * step, rangeEnd = rangeStart + step;
    return { count, isNegative: rangeStart + step / 2 < 0, rangeStart, rangeEnd };
  });
}

function MonteCarloMiniWidget({ trades, D }) {
  const pnls = useMemo(() => (trades || []).map(t => t.pnl), [trades]);
  const finals = useMemo(() => runMiniMC(pnls), [pnls]);
  const hist = useMemo(() => (finals ? buildOutcomeHistogram(finals) : null), [finals]);
  if (!finals) return <EmptyWidget D={D} />;

  const fmtMC = n => (n >= 0 ? `+$${Math.abs(n).toFixed(0)}` : `-$${Math.abs(n).toFixed(0)}`);
  const rows = [
    ["P10 (Worst)", percentile(finals, 10), D.red],
    ["P50 (Median)", percentile(finals, 50), D.text],
    ["P90 (Best)", percentile(finals, 90), D.green],
  ];

  return (
    <div style={{ height: "100%", padding: 27, display: "flex", flexDirection: "column", gap: 19 }}>
      <div style={chartTitleStyle(D)}>Monte Carlo · next 40 trades</div>
      <div style={{ display: "flex", gap: 16 }}>
        {rows.map(([label, val, color]) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 23, fontWeight: 700, color }}>{fmtMC(val)}</div>
          </div>
        ))}
      </div>
      {/* Supporting visual: distribution of the simulated outcomes. Kept
          axis/gridline-free so it reads as a compact shape underneath the
          stats above, not a second competing chart — but still hoverable,
          same as Trade Distribution/Day of Week, so each bar's exact PnL
          range and simulation count are available on demand. */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hist} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <Tooltip
              contentStyle={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, fontSize: 16 }}
              labelStyle={{ color: D.text, fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: D.textMuted }}
              formatter={(value) => [value, "Simulations"]}
              labelFormatter={(_, payload) => {
                const b = payload?.[0]?.payload;
                if (!b) return "";
                return `${fmt(b.rangeStart)} to ${fmt(b.rangeEnd)}`;
              }}
              cursor={{ fill: D.border, fillOpacity: 0.3 }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {hist.map((b, i) => <Cell key={i} fill={b.isNegative ? D.red : D.green} fillOpacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────────
// height(size) gives each widget instance's pixel height in the grid.

export const WIDGET_DEFS = {
  netPnl:            { label: "Net PnL",                 category: "small", allowedSizes: ["small", "wide"], defaultSize: "small", height: () => 180, Render: NetPnlWidget },
  expectancy:        { label: "Expectancy",               category: "small", allowedSizes: ["small", "wide"], defaultSize: "small", height: () => 180, Render: ExpectancyWidget },
  avgWinLoss:        { label: "Avg. Win vs. Avg. Loss",         category: "small", allowedSizes: ["small", "wide"], defaultSize: "small", height: () => 180, Render: AvgWinLossWidget },
  winLossRatio:      { label: "Win / Loss Ratio",         category: "small", allowedSizes: ["small", "wide"], defaultSize: "small", height: () => 180, Render: WinLossRatioWidget },
  winRate:           { label: "Win Rate",                 category: "small", allowedSizes: ["small", "wide"], defaultSize: "small", height: () => 180, Render: WinRateWidget },
  consistencyScore:  { label: "Consistency Score",        category: "small", allowedSizes: ["small", "wide"], defaultSize: "small", height: () => 180, Render: ConsistencyScoreWidget },
  dayOfWeek:         { label: "Day of Week Performance",  category: "big",   allowedSizes: ["big", "full"],   defaultSize: "big",   height: () => 360, Render: DayOfWeekWidget },
  distribution:      { label: "Trade Distribution",       category: "big",   allowedSizes: ["big", "full"],   defaultSize: "big",   height: () => 360, Render: DistributionWidget },
  calendar:          { label: "Calendar",                 category: "big",   allowedSizes: ["big", "full"],   defaultSize: "big",   height: () => 720, Render: CalendarWidget },
  equityCurve:       { label: "Equity Curve",              category: "big",   allowedSizes: ["big", "full"],   defaultSize: "big",   height: () => 360, Render: EquityCurveWidget },
  monteCarloMini:    { label: "Monte Carlo (mini)",        category: "big",   allowedSizes: ["big", "full"],   defaultSize: "big",   height: () => 360, Render: MonteCarloMiniWidget },
};

export function getWidgetHeight(type, size) {
  const def = WIDGET_DEFS[type];
  return def ? def.height(size) : 130;
}