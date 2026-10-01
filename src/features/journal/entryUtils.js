// Every value here (day, time, pnl, notes, ...) is entered directly on this
// journal form — none of it is derived from the (backtesting) trades table.

// Local calendar date (not toISOString(), which is UTC and can land on the
// wrong day depending on the user's timezone).
export function todayStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function entryTimestamp(e) {
  if (!e.day) return 0;
  const d = new Date(`${e.day}T${e.time_entered || "00:00"}`);
  return isNaN(d) ? 0 : d.getTime();
}

export function sortEntries(entries) {
  return [...entries].sort((a, b) => entryTimestamp(b) - entryTimestamp(a));
}

// "faded" = journaled but no trade taken that day, so pnl is null.
export function outcomeLabel(pnl) {
  if (pnl === null || pnl === undefined) return "FADED";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

export function outcomeMeta(pnl, D) {
  const label = outcomeLabel(pnl);
  const color = label === "WIN" ? D.green : label === "LOSS" ? D.red : label === "BE" ? D.yellow : D.textMuted;
  return { label, color };
}

// Display formatting for the "day" (YYYY-MM-DD) + optional "time" (HH:MM) columns.
export function fmtEntryDate(day, time) {
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return day;
  const datePart = `${d}/${m}/${y.slice(2)}`;
  return time ? `${datePart} · ${time.slice(0, 5)}` : datePart;
}
