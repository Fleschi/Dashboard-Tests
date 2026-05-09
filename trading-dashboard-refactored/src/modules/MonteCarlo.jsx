import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../utils/ui";
import { percentile, buildHistogram } from "../utils/calculations";

function calcTradesPerWeek(trades) {
  const map = {};
  for (const t of trades) {
    const d = new Date(t.date);
    if (isNaN(d)) continue;
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    map[`${d.getFullYear()}-${wk}`] = 1;
  }
  return Math.max(1, trades.length / Math.max(1, Object.keys(map).length));
}

function runMC(trades, simCount, weeks) {
  if (!trades?.length) return [];
  const pnls = trades.map(t => t.pnl);
  const tradesPerWeek = calcTradesPerWeek(trades);
  const tradesTotal = Math.min(Math.round(weeks * tradesPerWeek), 1500);
  const snapshotInterval = Math.max(1, Math.round(tradesPerWeek));
  const effectiveSimCount = Math.min(simCount, Math.floor(600000 / Math.max(tradesTotal, 1)));
  const results = [];
  for (let s = 0; s < effectiveSimCount; s++) {
    let equity = 0, peak = 0, maxDD = 0;
    const path = [0];
    for (let t = 0; t < tradesTotal; t++) {
      equity += pnls[Math.floor(Math.random() * pnls.length)];
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
      if ((t + 1) % snapshotInterval === 0) path.push(equity);
    }
    if (path[path.length - 1] !== equity) path.push(equity);
    results.push({ finalPnl: equity, maxDD, path });
  }
  return results;
}

function PathHeatmap({ mcResults, design: D }) {
  const W = 700, H = 300;
  const PAD = { top: 20, right: 20, bottom: 40, left: 65 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (!mcResults || mcResults.length === 0) return null;

  // 1. Extremwerte ermitteln
  const allVals = mcResults.flatMap(r => r.path);
  let rawMin = Math.min(...allVals);
  let rawMax = Math.max(...allVals);

  // 2. Dynamischen Schritt berechnen (Algorithmus für "schöne" Zahlen)
  const range = rawMax - rawMin;
  const targetTicks = 6; // Wir wollen etwa 6 Markierungen an der Achse
  const rawStep = range / targetTicks;

  // Findet die nächste logische Stufe (10, 25, 50, 100, 250, 500, 1000, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let step;
  if (residual < 1.5) step = 1 * magnitude;
  else if (residual < 3) step = 2 * magnitude;
  else if (residual < 7) step = 5 * magnitude;
  else step = 10 * magnitude;

  // 3. Grenzen mit kleinem Buffer (5%) festlegen und auf 'step' runden
  const buffer = range * 0.05;
  const yMin = Math.floor((rawMin - buffer) / step) * step;
  const yMax = Math.ceil((rawMax + buffer) / step) * step;
  const yRange = yMax - yMin;

  // 4. Skalierung & Ticks
  const xScale = i => PAD.left + (i / (mcResults[0].path.length - 1)) * innerW;
  const yScale = v => PAD.top + innerH - ((v - yMin) / yRange) * innerH;

  const ticks = [];
  for (let v = yMin; v <= yMax; v += step) {
    ticks.push(v);
  }

  const fmtY = v => v === 0 ? "$0" : (v > 0 ? `+$${v}` : `-$${Math.abs(v)}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
      {/* Horizontale Hilfslinien */}
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={yScale(v)}
            x2={W - PAD.right} y2={yScale(v)}
            stroke={D.border}
            strokeWidth={v === 0 ? "1.5" : "0.5"}
            strokeDasharray={v === 0 ? "" : "4,4"}
          />
          <text
            x={PAD.left - 10} y={yScale(v) + 4}
            textAnchor="end" fill={v === 0 ? D.text : D.textMuted}
            fontSize="11" fontWeight={v === 0 ? "600" : "400"}
          >
            {fmtY(v)}
          </text>
        </g>
      ))}

      {/* Pfade zeichnen */}
      <g>
        {mcResults.map((r, i) => (
          <polyline
            key={i}
            points={r.path.map((v, idx) => `${xScale(idx).toFixed(1)},${yScale(v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={r.finalPnl >= 0 ? D.green : D.red}
            strokeWidth="0.7"
            strokeOpacity="0.08"
            style={{ mixBlendMode: 'screen' }} // Hilft bei der Wolkenbildung
          />
        ))}
      </g>
    </svg>
  );
}

export default function MonteCarlo({ stats, design }) {
  const D = design || C;
  const [simWeeks, setSimWeeks] = useState(13);
  const [mcResults, setMcResults] = useState(null);

  useEffect(() => {
    if (!stats?.rawTrades?.length) return;
    setMcResults(null);
    const id = setTimeout(() => { setMcResults(runMC(stats.rawTrades, 2000, simWeeks)); }, 10);
    return () => clearTimeout(id);
  }, [stats, simWeeks]);

  if (!stats?.rawTrades?.length) return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: D.textMuted }}>No trades yet.</div>
  );

  const fmtMC = n => Number(n) >= 0 ? `+$${Math.abs(Number(n)).toFixed(0)}` : `-$${Math.abs(Number(n)).toFixed(0)}`;
  const mcFinals = mcResults?.map(r => r.finalPnl) || [];
  const mcDDs    = mcResults?.map(r => r.maxDD)    || [];
  const hist     = mcResults ? buildHistogram(mcFinals) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Timeframe + Paths — single card ── */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24 }}>
        {/* Timeframe row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: D.textMuted, fontWeight: 500 }}>Timeframe</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[["1M", 4], ["3M", 13], ["6M", 26], ["12M", 52]].map(([label, w]) => {
              const active = simWeeks === w;
              return (
                <button key={w} onClick={() => setSimWeeks(w)} style={{
                  padding: "4px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                  border: `1px solid ${active ? D.blue : D.border}`,
                  background: active ? `${D.blue}15` : "transparent",
                  color: active ? D.text : D.textMuted,
                  transition: "all 0.15s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: D.textMuted, marginLeft: "auto" }}>
            {mcResults ? mcResults.length.toLocaleString() : "…"} sims · {stats.rawTrades.length} trades
          </span>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${D.border}`, marginBottom: 20 }} />

        {/* Chart */}
        <div style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>Equity Paths</div>
        {!mcResults ? (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 13 }}>Simulating…</div>
        ) : (
          <PathHeatmap mcResults={mcResults} design={D} />
        )}
      </div>

      {/* ── Percentile table ── */}
      {mcResults && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>Percentile Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {[
              ["P10 (Worst)",  percentile(mcFinals, 10)],
              ["P25",          percentile(mcFinals, 25)],
              ["P50 (Median)", percentile(mcFinals, 50)],
              ["P75",          percentile(mcFinals, 75)],
              ["P90 (Best)",   percentile(mcFinals, 90)],
              ["Max DD P90",   -percentile(mcDDs, 90)],
            ].map(([label, value]) => (
              <div key={label} style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: value >= 0 ? D.green : D.red }}>{fmtMC(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Histogram ── */}
      {mcResults && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>Final PnL Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hist}>
              <CartesianGrid strokeDasharray="3 3" stroke={D.border} vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: D.textMuted }} />
              <YAxis tick={{ fontSize: 10, fill: D.textMuted }} />
              <Tooltip contentStyle={{ background: D.card, border: "none", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill={D.blue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}