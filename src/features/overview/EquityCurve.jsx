import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlowCard } from "../../shared/components/GlowCard";
import { fmt } from "../../shared/utils/format";

export function EquityCurve({ trades, equityCurve: prebuilt, D, bare = false }) {
  const curveData = prebuilt
    ? [{ index: 0, equity: 0 }, ...prebuilt]
    : buildCurveFromTrades(trades);

  if (!curveData?.length) return null;

  const equities = curveData.map(d => d.equity);
  const minEq = Math.min(...equities), maxEq = Math.max(...equities);
  const pad = (maxEq - minEq) * 0.1 || 500;
  const yMin = Math.floor((minEq - pad) / 500) * 500;
  const yMax = Math.ceil((maxEq + pad) / 500) * 500;
  const accent = D.metric;
  const gradId = prebuilt ? "eqGrad" : "fwdEqGrad";

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "12px 17px", fontSize: 17 }}>
        <div style={{ color: D.textMuted, marginBottom: 3 }}>Trade #{d.index}</div>
        <div style={{ color: accent, fontWeight: 600 }}>{fmt(d.equity)}</div>
      </div>
    );
  };

  const chartBody = (
    <>
      <div style={{ fontSize: 16, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, fontWeight: 500 }}>Equity Curve</div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 5, right: 11, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={accent} stopOpacity={0.15} />
                <stop offset="95%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
            <XAxis dataKey="index" tick={false} axisLine={false} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 15, fill: D.textMuted }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={61} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={D.border} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="equity" stroke={accent} strokeWidth={2}
              fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  if (bare) {
    return <div style={{ height: "100%", padding: 27, display: "flex", flexDirection: "column" }}>{chartBody}</div>;
  }

  return (
    <GlowCard design={D} style={{ padding: 20, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: 280 }}>
      {chartBody}
    </GlowCard>
  );
}

function buildCurveFromTrades(trades) {
  if (!trades?.length) return null;
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let eq = 0;
  return [
    { index: 0, equity: 0 },
    ...sorted.map((t, i) => { eq += t.pnl || 0; return { index: i + 1, equity: parseFloat(eq.toFixed(2)), pnl: t.pnl || 0 }; }),
  ];
}
