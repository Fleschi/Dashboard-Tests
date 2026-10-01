import { useEffect, useRef, useState } from "react";
import { FONT_FAMILY } from "../../../theme/fonts";
import { DayGrid, MonthGrid } from "../../../shared/components/TimeRangePicker";
import { fmtEntryDate } from "../entryUtils";
import { FloatingLabel, floatingBoxStyle } from "./FloatingField";

// Day picker for the editor's Date field — the same calendar (DayGrid, with
// the click-the-month-name jump view) used by the time-range picker in the
// Data/Overview tabs, but as a plain single-day picker: no range-type
// sidebar, no "All time". Picking a day sets the value and closes.
const pad2 = n => String(n).padStart(2, "0");

function parseDay(day) {
  if (!day) return null;
  const d = new Date(`${day}T00:00:00`);
  return isNaN(d) ? null : d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DateField({ label, value, onChange, D }) {
  const [open, setOpen] = useState(false);
  const [calView, setCalView] = useState("day"); // "day" | "monthPick"
  const [viewYear, setViewYear] = useState(() => (parseDay(value) || new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (parseDay(value) || new Date()).getMonth());
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const selected = parseDay(value);
  const today = new Date();
  const active = open || !!value;

  const toggle = () => {
    if (!open) {
      const base = selected || new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setCalView("day");
    }
    setOpen(o => !o);
  };

  const navigateMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  };

  const pick = (d) => {
    onChange(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        style={{ ...floatingBoxStyle(D, active), textAlign: "left", cursor: "pointer", fontFamily: "monospace", borderColor: open ? D.blue : D.border }}
      >
        {value ? fmtEntryDate(value) : ""}
      </button>
      <FloatingLabel label={label} active={active} D={D} />

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 20,
          background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
          padding: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.28)", fontFamily: FONT_FAMILY,
        }}>
          {calView === "monthPick" ? (
            <MonthGrid
              viewYear={viewYear} onNavigate={dy => setViewYear(y => y + dy)}
              isSelected={m => m === viewMonth}
              onPick={m => { setViewMonth(m); setCalView("day"); }}
              D={D}
            />
          ) : (
            <DayGrid
              viewYear={viewYear} viewMonth={viewMonth}
              onNavigate={navigateMonth} onLabelClick={() => setCalView("monthPick")}
              isSelected={d => !!selected && sameDay(d, selected)}
              isToday={d => sameDay(d, today)}
              onPick={pick} D={D}
            />
          )}
        </div>
      )}
    </div>
  );
}
