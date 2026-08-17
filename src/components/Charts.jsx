import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { GlowCard } from "../utils/ui";
import { fmt } from "../utils/calculations";

// ─── EquityCurve ─────────────────────────────────────────────────────────────

export function EquityCurve({ trades, equityCurve: prebuilt, D }) {
  const curveData = prebuilt
    ? [{ index: 0, equity: 0 }, ...prebuilt]
    : buildCurveFromTrades(trades);

  if (!curveData?.length) return null;

  const equities = curveData.map(d => d.equity);
  const minEq = Math.min(...equities), maxEq = Math.max(...equities);
  const pad = (maxEq - minEq) * 0.1 || 500;
  const yMin = Math.floor((minEq - pad) / 500) * 500;
  const yMax = Math.ceil((maxEq + pad) / 500) * 500;
  const totalPnl = equities[equities.length - 1];
  const accent = prebuilt ? D.blue : (totalPnl >= 0 ? D.green : D.red);
  const gradId = prebuilt ? "eqGrad" : "fwdEqGrad";

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
        <div style={{ color: D.textMuted, marginBottom: 2 }}>Trade #{d.index}</div>
        <div style={{ color: accent, fontWeight: 600 }}>{fmt(d.equity)}</div>
      </div>
    );
  };

  return (
    <GlowCard design={D} style={{ padding: 20, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, fontWeight: 500 }}>Equity Curve</div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={curveData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={accent} stopOpacity={0.15} />
              <stop offset="95%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
          <XAxis dataKey="index" tick={false} axisLine={false} tickLine={false} />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: D.textMuted }} axisLine={false} tickLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={46} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke={D.border} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="equity" stroke={accent} strokeWidth={2}
            fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
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

// ─── YearModal ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function YearModal({ trades, initialYear, initialMonth, onSelectMonth, onClose, D }) {
  const [year, setYear] = useState(initialYear);

  const availableYears = [...new Set((trades || [])
    .filter(t => t.date)
    .map(t => new Date(t.date).getFullYear())
  )].sort((a, b) => a - b);

  const minYear = availableYears[0] || year;
  const maxYear = availableYears[availableYears.length - 1] || year;

  const months = MONTH_NAMES.map((name, mi) => {
    const monthTrades = (trades || []).filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === mi;
    });
    const pnl    = monthTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins   = monthTrades.filter(t => t.pnl > 0).length;
    const losses = monthTrades.filter(t => t.pnl < 0).length;
    const count  = monthTrades.length;
    return { name, pnl, wins, losses, count, active: count > 0 };
  });

  const yearPnl     = months.reduce((s, m) => s + m.pnl, 0);
  const greenMonths = months.filter(m => m.active && m.pnl > 0).length;
  const redMonths   = months.filter(m => m.active && m.pnl < 0).length;
  const bestMonth   = months.reduce((best, m) => m.pnl > best.pnl ? m : best, months[0]);

  const isSelected = (mi) => year === initialYear && mi === initialMonth;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: D.card, border: `1px solid ${D.border}`,
          borderRadius: 16, padding: 28, width: 580, maxWidth: "calc(100vw - 48px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 4 }}>Year Overview</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setYear(y => Math.max(y - 1, minYear))}
                disabled={year <= minYear}
                style={{ ...navBtnStyle(D), opacity: year <= minYear ? 0.3 : 1 }}
              >←</button>
              <div style={{ fontSize: 22, fontWeight: 700, color: D.text, minWidth: 56, textAlign: "center" }}>{year}</div>
              <button
                onClick={() => setYear(y => Math.min(y + 1, maxYear))}
                disabled={year >= maxYear}
                style={{ ...navBtnStyle(D), opacity: year >= maxYear ? 0.3 : 1 }}
              >→</button>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.textMuted, cursor: "pointer", fontSize: 16, padding: "4px 10px", lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Summary strip */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 10, overflow: "hidden", border: `1px solid ${D.border}` }}>
          {[
            ["Year PnL",     fmt(yearPnl),    yearPnl >= 0 ? D.green : D.red],
            ["Green Months", greenMonths,      D.green],
            ["Red Months",   redMonths,        D.red],
            ["Best Month",   bestMonth.active ? `${bestMonth.name} ${fmt(bestMonth.pnl)}` : "—", D.green],
          ].map(([lbl, val, col], i, arr) => (
            <div key={lbl} style={{
              flex: 1, padding: "12px 14px",
              borderRight: i < arr.length - 1 ? `1px solid ${D.border}` : "none",
              background: D.bg,
            }}>
              <div style={{ fontSize: 9, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, fontWeight: 500 }}>{lbl}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Month grid — each month is clickable */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {months.map((m, mi) => {
            const col      = !m.active ? D.textMuted : m.pnl > 0 ? D.green : D.red;
            const bg       = !m.active ? "transparent" : m.pnl > 0 ? `${D.green}12` : `${D.red}12`;
            const selected = isSelected(mi);
            return (
              <div
                key={m.name}
                onClick={() => { onSelectMonth(year, mi); onClose(); }}
                style={{
                  background: selected ? `${D.blue}20` : bg,
                  border: `1px solid ${selected ? D.blue : m.active ? col + "35" : D.border}`,
                  borderRadius: 10, padding: "12px 14px",
                  cursor: "pointer",
                  transition: "border 0.15s, background 0.15s",
                  minHeight: 100,
                }}
                onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${D.blue}`; }}
                onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${selected ? D.blue : m.active ? col + "35" : D.border}`; }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: selected ? D.blue : m.active ? D.text : D.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.name}</div>
                {m.active ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: col, marginBottom: 4 }}>
                      {m.pnl >= 0 ? "+" : ""}{Math.abs(m.pnl) >= 1000 ? `${(m.pnl / 1000).toFixed(1)}k` : m.pnl.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 10, color: D.textMuted }}>{m.wins}W / {m.losses}L</div>
                    <div style={{ fontSize: 9, color: D.textMuted, marginTop: 2 }}>{m.count} trades</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: D.textMuted, marginTop: 4 }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

export function CalendarView({ trades, D }) {
  const getLatest = (ts) => {
    if (!ts?.length) return new Date();
    const d = new Date([...ts].sort((a,b) => new Date(b.date)-new Date(a.date))[0].date);
    return isNaN(d) ? new Date() : d;
  };

  const [viewDate, setViewDate]     = useState(getLatest(trades));
  const [showYearModal, setShowYearModal] = useState(false);

  // Sync when trades load asynchronously after mount
  const tradesLen = trades?.length || 0;
  const latestDate = tradesLen > 0 ? trades.reduce((a,b) => new Date(a.date)>new Date(b.date)?a:b).date : null;
  const [lastSynced, setLastSynced] = useState(null);
  if (latestDate && latestDate !== lastSynced) {
    setLastSynced(latestDate);
    const d = new Date(latestDate);
    if (!isNaN(d)) setViewDate(d);
  }

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName   = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday-first
  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDay    = (firstDayRaw + 6) % 7;

  const byDay = {};
  for (const t of (trades || [])) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = d.getDate();
    if (!byDay[key]) byDay[key] = { pnl: 0, count: 0, wins: 0, losses: 0 };
    byDay[key].pnl += t.pnl || 0; byDay[key].count++;
    if (t.pnl > 0) byDay[key].wins++;
    if (t.pnl < 0) byDay[key].losses++;
  }

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthPnl  = Object.values(byDay).reduce((a, d) => a + d.pnl, 0);
  const greenDays = Object.values(byDay).filter(d => d.pnl > 0).length;
  const redDays   = Object.values(byDay).filter(d => d.pnl < 0).length;
  const hasData   = Object.keys(byDay).length > 0;

  return (
    <>
      {showYearModal && (
        <YearModal
          trades={trades}
          initialYear={year}
          initialMonth={month}
          onSelectMonth={(y, m) => setViewDate(new Date(y, m, 1))}
          onClose={() => setShowYearModal(false)}
          D={D}
        />
      )}

      <GlowCard design={D} style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button
            onClick={() => setShowYearModal(true)}
            style={{ ...navBtnStyle(D), fontSize: 13, fontWeight: 600, color: D.text, display: "flex", alignItems: "center", gap: 6 }}
          >
            {monthName} ↗
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={navBtnStyle(D)}>←</button>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={navBtnStyle(D)}>→</button>
          </div>
        </div>

        {/* Mo–So header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, color: D.textMuted, padding: "3px 0", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const data = byDay[day];
            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const bg    = data ? (data.pnl > 0 ? `${D.green}18` : data.pnl < 0 ? `${D.red}18` : `${D.yellow}15`) : "transparent";
            const color = data ? (data.pnl > 0 ? D.green : data.pnl < 0 ? D.red : D.yellow) : D.textMuted;
            return (
              <div key={day} title={data ? `${data.count} trades · ${fmt(data.pnl)}` : ""}
                style={{ background: bg, border: `1px solid ${isToday ? D.blue : data ? color + "35" : D.border}`, borderRadius: 6, padding: "5px 4px", minHeight: 75 }}>
                <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 400, color: isToday ? D.blue : D.textMuted, marginBottom: 2 }}>{day}</div>
                {data && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color, lineHeight: 1.2 }}>
                      {data.pnl >= 0 ? "+" : ""}{Math.abs(data.pnl) >= 1000 ? `${(data.pnl / 1000).toFixed(1)}k` : data.pnl.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 9, color: D.textMuted, marginTop: 1 }}>{data.wins}W/{data.losses}L</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats strip — always visible */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${D.border}`, display: "flex", gap: 28 }}>
          {[
            ["Month PnL", hasData ? fmt(monthPnl) : "—", hasData ? (monthPnl >= 0 ? D.green : D.red) : D.textMuted],
            ["Green Days", hasData ? greenDays : "—", D.green],
            ["Red Days",   hasData ? redDays   : "—", D.red],
          ].map(([lbl, val, col]) => (
            <div key={lbl}>
              <div style={{ fontSize: 10, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{lbl}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: col }}>{val}</div>
            </div>
          ))}
        </div>
      </GlowCard>
    </>
  );
}

const navBtnStyle = (D) => ({
  padding: "4px 10px", background: "transparent",
  border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.textMuted, cursor: "pointer", fontSize: 13,
});