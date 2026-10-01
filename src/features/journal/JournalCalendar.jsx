import { useState } from "react";
import { getTitleText } from "./editor/content";
import { fmtEntryDate, outcomeMeta } from "./entryUtils";

export function JournalCalendar({ entries, D, onOpen }) {
  const latestEntry = entries[0] || null; // entries are sorted newest-first
  const latestDate = latestEntry?.day ? new Date(`${latestEntry.day}T00:00:00`) : new Date();

  const [viewDate, setViewDate] = useState(isNaN(latestDate) ? new Date() : latestDate);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName   = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDay    = (firstDayRaw + 6) % 7; // Monday-first

  // One entry per calendar day — entries are newest-first, so the first one
  // seen for a given day-of-month is the one we keep.
  const byDay = {};
  for (const e of entries) {
    if (!e.day) continue;
    const d = new Date(`${e.day}T00:00:00`);
    if (isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) continue;
    if (!byDay[d.getDate()]) byDay[d.getDate()] = e;
  }

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{monthName}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={calNavBtnStyle(D)}>←</button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={calNavBtnStyle(D)}>→</button>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: D.textMuted, padding: "3px 0", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const entry = byDay[day];
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

          if (!entry) {
            return (
              <div key={day} style={{ border: `1px solid ${isToday ? D.blue : D.border}`, borderRadius: 6, padding: "6px 5px", minHeight: 68 }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? D.blue : D.textMuted }}>{day}</div>
              </div>
            );
          }

          const meta = outcomeMeta(entry.pnl, D);
          const hasPnl = entry.pnl != null;
          return (
            <button
              key={day}
              onClick={() => onOpen(entry)}
              title={[getTitleText(entry.content), fmtEntryDate(entry.day, entry.time_entered)].filter(Boolean).join(" — ")}
              style={{
                background: `${meta.color}15`, border: `1px solid ${isToday ? D.blue : `${meta.color}35`}`,
                borderRadius: 6, padding: "6px 5px", minHeight: 68, cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", font: "inherit",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? D.blue : D.textMuted, marginBottom: 3 }}>{day}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, lineHeight: 1.2 }}>{meta.label}</div>
              {getTitleText(entry.content) && (
                <div style={{ fontSize: 10, color: D.text, marginTop: 2, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getTitleText(entry.content)}
                </div>
              )}
              {hasPnl && (
                <div style={{ fontSize: 10, color: D.textMuted, marginTop: 1 }}>
                  {entry.pnl >= 0 ? "+" : ""}{Math.abs(entry.pnl) >= 1000 ? `${(entry.pnl / 1000).toFixed(1)}k` : entry.pnl.toFixed(0)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const calNavBtnStyle = (D) => ({
  padding: "5px 12px", background: "transparent",
  border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.textMuted, cursor: "pointer", fontSize: 14,
});
