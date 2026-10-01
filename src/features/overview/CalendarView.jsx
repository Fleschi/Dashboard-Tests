import { useState } from "react";
import { createPortal } from "react-dom";
import { GlowCard } from "../../shared/components/GlowCard";
import { fmt } from "../../shared/utils/format";

const SHORT_MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function YearModal({ trades, initialYear, initialMonth, onSelectMonth, onClose, D }) {
  const [year, setYear] = useState(initialYear);

  const availableYears = [...new Set((trades || [])
    .filter(t => t.date)
    .map(t => new Date(t.date).getFullYear())
  )].sort((a, b) => a - b);

  const minYear = availableYears[0] || year;
  const maxYear = availableYears[availableYears.length - 1] || year;

  const months = SHORT_MONTH_NAMES.map((name, mi) => {
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

  // Rendered via a portal straight to document.body rather than in place.
  // Each widget's grid-cell wrapper in Overview.jsx sets an explicit
  // `zIndex` on itself to control drag/stacking order between widgets — and
  // because it's a CSS grid item, that z-index takes effect even without an
  // explicit `position`, which makes the wrapper its own stacking context.
  // Nested inside one of those, this modal's own `position: fixed; zIndex:
  // 1000` below only gets compared *within* that trapped context, not
  // against the rest of the page — so a widget added after the Calendar
  // widget (a later sibling, same default stacking priority) would paint
  // its entire stacking context above this "fixed, full-screen" overlay
  // instead of behind it. A portal sidesteps the whole problem by mounting
  // this outside the grid's DOM hierarchy entirely, the same fix already
  // used for the dragged-widget preview in Overview.jsx.
  return createPortal(
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
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
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
    </div>,
    document.body
  );
}

export function CalendarView({ trades, rangeTrades, D, bare = false, onDayClick }) {
  const getLatest = (ts) => {
    if (!ts?.length) return new Date();
    const d = new Date([...ts].sort((a,b) => new Date(b.date)-new Date(a.date))[0].date);
    return isNaN(d) ? new Date() : d;
  };

  // `rangeTrades` (the currently selected global range, when supplied) is
  // used only to pick which month the calendar opens to and to re-open to
  // that range's latest trade whenever the range changes — NOT to decide
  // which days have data. `trades` is always the full, unfiltered set, so
  // every real trade day stays visible/clickable no matter what range is
  // selected elsewhere in the app.
  const defaultSource = rangeTrades ?? trades;

  const [viewDate, setViewDate]     = useState(getLatest(defaultSource));
  const [showYearModal, setShowYearModal] = useState(false);

  // Re-open to the latest trade whenever it changes — either because trades
  // loaded in asynchronously after mount, or because the selected global
  // range changed (e.g. picking "2023" re-opens to 2023's latest trade,
  // not the all-time latest).
  const defaultLen = defaultSource?.length || 0;
  const latestDate = defaultLen > 0 ? defaultSource.reduce((a,b) => new Date(a.date)>new Date(b.date)?a:b).date : null;
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

  // Always pad out to exactly 6 full weeks (42 cells), regardless of how
  // many rows this particular month actually needs (4–6, depending on which
  // weekday the 1st falls on). Otherwise the day grid's own height would
  // vary month to month, and everything below it — the stats strip — would
  // shift up and down as you navigate between months instead of staying put.
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

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

      <CalendarCardWrap D={D} bare={bare}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button
            onClick={() => setShowYearModal(true)}
            style={{ ...navBtnStyle(D), fontSize: 17, fontWeight: 600, color: D.text, display: "flex", alignItems: "center", gap: 8 }}
          >
            {monthName} ↗
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={navBtnStyle(D)}>←</button>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={navBtnStyle(D)}>→</button>
          </div>
        </div>

        {/* Mo–So header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 13, color: D.textMuted, padding: "3px 0", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>

        {/* Day grid — sized so the tallest possible month (6 rows, when the
            1st falls such that the days spill into a 6th week) still fits
            the widget's fixed height without scrolling. gridTemplateRows is
            explicit (6 fixed-height rows, matching the 42-cell padding
            above) rather than left to auto-size: a row made up entirely of
            the empty filler cells before the 1st / after the last day has
            nothing in it with a height, so without this it would collapse
            to ~0px instead of matching the real day rows — which is exactly
            what let the stats strip below drift up and down between months
            even after the cell count itself was fixed at 42. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 85px)", gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const data = byDay[day];
            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            // No-trade days get a subtle tint toward D.text instead of sitting flush
            // with the surrounding background. D.text is always the color chosen to
            // contrast against the background, so a low-alpha wash of it lightens a
            // dark theme and darkens a light theme automatically — no explicit
            // light/dark flag needed.
            const bg    = data ? (data.pnl > 0 ? `${D.green}18` : data.pnl < 0 ? `${D.red}18` : `${D.yellow}15`) : `${D.text}0d`;
            const color = data ? (data.pnl > 0 ? D.green : data.pnl < 0 ? D.red : D.yellow) : D.textMuted;
            const clickable = !!(data && onDayClick);
            return (
              <div key={day}
                title={data ? `${data.count} trades · ${fmt(data.pnl)}${clickable ? " — click to view in Data tab" : ""}` : ""}
                onClick={clickable ? () => onDayClick(new Date(year, month, day)) : undefined}
                style={{
                  background: bg,
                  borderRadius: 8, padding: "8px 8px", minHeight: 85,
                  cursor: clickable ? "pointer" : "default",
                  transition: "filter 0.12s ease",
                }}
                onMouseEnter={clickable ? (e => e.currentTarget.style.filter = "brightness(1.25)") : undefined}
                onMouseLeave={clickable ? (e => e.currentTarget.style.filter = "none") : undefined}
              >
                <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? D.blue : D.textMuted, marginBottom: 2 }}>{day}</div>
                {data && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1.2 }}>
                      {data.pnl >= 0 ? "+" : ""}{Math.abs(data.pnl) >= 1000 ? `${(data.pnl / 1000).toFixed(1)}k` : data.pnl.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: D.textMuted, marginTop: 1 }}>{data.wins}W/{data.losses}L</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats strip — always visible */}
        <div style={{ marginTop: 30, paddingTop: 30, borderTop: `1px solid ${D.border}`, display: "flex", gap: 30 }}>
          {[
            ["Month PnL", hasData ? fmt(monthPnl) : "—", hasData ? (monthPnl >= 0 ? D.green : D.red) : D.textMuted],
            ["Green Days", hasData ? greenDays : "—", D.green],
            ["Red Days",   hasData ? redDays   : "—", D.red],
          ].map(([lbl, val, col]) => (
            <div key={lbl}>
              <div style={{ fontSize: 13, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{lbl}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: col }}>{val}</div>
            </div>
          ))}
        </div>
      </CalendarCardWrap>
    </>
  );
}

function CalendarCardWrap({ D, bare, children }) {
  if (bare) return <div style={{ padding: 8 }}>{children}</div>;
  return <GlowCard design={D} style={{ padding: 24 }}>{children}</GlowCard>;
}

const navBtnStyle = (D) => ({
  padding: "7px 16px", background: "transparent",
  border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.textMuted, cursor: "pointer", fontSize: 19,
});
