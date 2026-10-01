import { useState, useRef, useEffect } from "react";
import { getYearsInTrades, getWeekNumber, rangeLabel, MONTH_NAMES } from "../utils/timeRange";

const MODES = [
  { id: "week",   label: "Week" },
  { id: "month",  label: "Month" },
  { id: "year",   label: "Year" },
  { id: "custom", label: "Custom Range" },
];

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Calendar icon (trigger button) ────────────────────────────────────────────

function CalendarIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

// ─── Right-side calendar views ─────────────────────────────────────────────────

function YearGrid({ years, isSelected, onPick, D }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, width: 220 }}>
      {years.map(y => {
        const selected = isSelected(y);
        return (
          <button key={y} onClick={() => onPick(y)} style={pickCellStyle(D, selected)}>
            {y}
          </button>
        );
      })}
    </div>
  );
}

export function MonthGrid({ viewYear, onNavigate, isSelected, onPick, D }) {
  return (
    <div style={{ width: 220 }}>
      <CalendarNav label={`${viewYear}`} onPrev={() => onNavigate(-1)} onNext={() => onNavigate(1)} D={D} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {MONTH_NAMES.map((m, i) => {
          const selected = isSelected(i);
          return (
            <button key={m} onClick={() => onPick(i)} style={pickCellStyle(D, selected)}>
              {m.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DayGrid({ viewYear, viewMonth, onNavigate, onLabelClick, isSelected, isToday, onPick, D }) {
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
  const firstDay = (firstDayRaw + 6) % 7; // Monday-first
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", { month: "long" });

  return (
    <div style={{ width: 220 }}>
      <CalendarNav label={`${monthLabel} ${viewYear}`} onPrev={() => onNavigate(-1)} onNext={() => onNavigate(1)} onLabelClick={onLabelClick} D={D} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAY_LETTERS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, color: D.textMuted, fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const d = new Date(viewYear, viewMonth, day);
          const selected = isSelected(d);
          const today = isToday(d);
          return (
            <button
              key={day}
              onClick={() => onPick(d)}
              style={{
                border: "none", borderRadius: 6, padding: "6px 0", fontSize: 11, cursor: "pointer",
                background: selected ? D.blue : "transparent",
                color: selected ? "#fff" : today ? D.blue : D.text,
                fontWeight: selected || today ? 700 : 400,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarNav({ label, onPrev, onNext, onLabelClick, D }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <button onClick={onPrev} style={navBtnStyle(D)}>‹</button>
      {onLabelClick ? (
        <button
          onClick={onLabelClick}
          title="Jump to month/year"
          style={navLabelBtnStyle(D)}
          onMouseEnter={ev => { ev.currentTarget.style.background = D.bg; }}
          onMouseLeave={ev => { ev.currentTarget.style.background = "transparent"; }}
        >
          {label}
        </button>
      ) : (
        <div style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{label}</div>
      )}
      <button onClick={onNext} style={navBtnStyle(D)}>›</button>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

// align="left"  → icon on the left, label to its right, panel opens from the left edge
//                 (used in the Data tab, where the control sits at the left of its toolbar).
// align="right" → label on the left, icon on the right, panel opens from the right edge
//                 (used in the Overview tab, where the control sits at the right of its toolbar).
export default function TimeRangePicker({ range, onChange, trades, D, align = "left" }) {
  const [open, setOpen] = useState(false);
  // "day" isn't one of the manually-selectable MODES below — it's the
  // Calendar widget's temporary single-day override (see App.js) — so it
  // falls back to "week" here same as "all" does, rather than leaving the
  // left-nav with nothing highlighted and the right pane blank.
  const [mode, setMode] = useState(range?.mode && range.mode !== "all" && range.mode !== "day" ? range.mode : "week");
  // Which sub-view the right pane shows while in "week"/"custom" mode:
  // "day" = normal week/day calendar, "monthPick" = the month+year jump view
  // reached by pressing the "September 2026"-style label at the top.
  const [calView, setCalView] = useState("day");
  const wrapRef = useRef(null);

  const years = getYearsInTrades(trades);
  const today = new Date();

  const [viewYear, setViewYear] = useState(range?.year || years[0] || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(range?.month ?? today.getMonth());

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const apply = (newRange, close = true) => {
    onChange(newRange);
    if (close) setOpen(false);
  };

  const navigateMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  };

  const pickYear  = (y) => apply({ mode: "year", year: y });
  const pickMonth = (m) => apply({ mode: "month", year: viewYear, month: m });
  const pickWeek  = (d) => apply({ mode: "week", year: d.getFullYear(), week: getWeekNumber(d) });

  // Switching the left-nav range type always returns the right pane to its
  // default sub-view.
  const selectMode = (id) => { setMode(id); setCalView("day"); };

  // Used only for the week/custom "jump to month" picker: this just moves
  // the calendar's viewYear/viewMonth so you land back on the right month —
  // it never touches the applied range (mode stays "week"/"custom").
  const jumpToMonth = (m) => { setViewMonth(m); setCalView("day"); };

  // Custom range: first click sets "from" (kept open), second click completes and closes.
  const pickCustomDay = (d) => {
    const iso = isoDate(d);
    if (range.mode === "custom" && range.from && !range.to) {
      let from = range.from, to = iso;
      if (new Date(to) < new Date(from)) { [from, to] = [to, from]; }
      apply({ mode: "custom", from, to });
    } else {
      apply({ mode: "custom", from: iso, to: "" }, false);
    }
  };

  const isYearSelected  = (y) => range.mode === "year" && range.year === y;
  const isMonthSelected = (m) => range.mode === "month" && range.year === viewYear && range.month === m;
  const isWeekDaySelected = (d) => range.mode === "week" && range.year === d.getFullYear() && getWeekNumber(d) === range.week;
  const isCustomDaySelected = (d) => {
    if (range.mode !== "custom" || !range.from) return false;
    const iso = isoDate(d);
    if (range.to) return iso >= range.from && iso <= range.to;
    return iso === range.from;
  };
  const isToday = (d) => isSameDay(d, today);

  return (
    <div ref={wrapRef} style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
      {align === "right" ? (
        <>
          <span style={{ fontSize: 11, color: D.textMuted }}>{rangeLabel(range)}</span>
          <button onClick={() => setOpen(o => !o)} title="Time range" style={iconBtnStyle(D, open)}>
            <CalendarIcon color={D.text} />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setOpen(o => !o)} title="Time range" style={iconBtnStyle(D, open)}>
            <CalendarIcon color={D.text} />
          </button>
          <span style={{ fontSize: 11, color: D.textMuted }}>{rangeLabel(range)}</span>
        </>
      )}

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", zIndex: 1000,
          ...(align === "right" ? { right: 0 } : { left: 0 }),
          background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
          padding: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
          display: "flex", gap: 14,
        }}>
          {/* Left: range type */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 116, borderRight: `1px solid ${D.border}`, paddingRight: 12 }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => selectMode(m.id)}
                style={{
                  textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  background: mode === m.id ? `${D.blue}18` : "transparent",
                  color: mode === m.id ? D.blue : D.text,
                }}
              >
                {m.label}
              </button>
            ))}
            <div style={{ height: 1, background: D.border, margin: "6px 0" }} />
            <button
              onClick={() => apply({ mode: "all" })}
              style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: D.textMuted, background: "transparent" }}
            >
              All time
            </button>
          </div>

          {/* Right: live calendar */}
          <div>
            {mode === "year" && (
              <YearGrid years={years} isSelected={isYearSelected} onPick={pickYear} D={D} />
            )}
            {mode === "month" && (
              <MonthGrid viewYear={viewYear} onNavigate={dy => setViewYear(y => y + dy)} isSelected={isMonthSelected} onPick={pickMonth} D={D} />
            )}
            {mode === "week" && (
              calView === "monthPick" ? (
                <MonthGrid viewYear={viewYear} onNavigate={dy => setViewYear(y => y + dy)} isSelected={m => m === viewMonth} onPick={jumpToMonth} D={D} />
              ) : (
                <DayGrid viewYear={viewYear} viewMonth={viewMonth} onNavigate={navigateMonth} onLabelClick={() => setCalView("monthPick")} isSelected={isWeekDaySelected} isToday={isToday} onPick={pickWeek} D={D} />
              )
            )}
            {mode === "custom" && (
              calView === "monthPick" ? (
                <MonthGrid viewYear={viewYear} onNavigate={dy => setViewYear(y => y + dy)} isSelected={m => m === viewMonth} onPick={jumpToMonth} D={D} />
              ) : (
                <DayGrid viewYear={viewYear} viewMonth={viewMonth} onNavigate={navigateMonth} onLabelClick={() => setCalView("monthPick")} isSelected={isCustomDaySelected} isToday={isToday} onPick={pickCustomDay} D={D} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = (D, open) => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 40, height: 40, padding: 0,
  background: open ? `${D.blue}18` : "transparent",
  border: `1px solid ${open ? D.blue : D.border}`, borderRadius: 8,
  cursor: "pointer",
});

const navBtnStyle = (D) => ({
  padding: "2px 8px", background: "transparent", border: `1px solid ${D.border}`,
  borderRadius: 6, color: D.textMuted, cursor: "pointer", fontSize: 12,
});

const navLabelBtnStyle = (D) => ({
  fontSize: 12, fontWeight: 600, color: D.text, background: "transparent",
  border: "none", borderRadius: 6, cursor: "pointer", padding: "3px 8px",
  transition: "background 0.12s",
});

const pickCellStyle = (D, selected) => ({
  border: "none", borderRadius: 8, padding: "9px 4px", fontSize: 12, cursor: "pointer",
  background: selected ? D.blue : D.bg,
  color: selected ? "#fff" : D.text,
  fontWeight: selected ? 700 : 500,
});