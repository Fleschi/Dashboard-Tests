export const DEFAULT_TIME_RANGE = { mode: "all" };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function getWeekNumber(d) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

export function getYearsInTrades(trades) {
  const years = new Set();
  for (const t of trades || []) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (!isNaN(d)) years.add(d.getFullYear());
  }
  const sorted = [...years].sort((a, b) => b - a);
  return sorted.length ? sorted : [new Date().getFullYear()];
}

export function getWeeksInYear(trades, year) {
  const weeks = new Set();
  for (const t of trades || []) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (isNaN(d) || d.getFullYear() !== year) continue;
    weeks.add(getWeekNumber(d));
  }
  const sorted = [...weeks].sort((a, b) => a - b);
  return sorted.length ? sorted : [1];
}

// Pure filter — does not touch or mutate the underlying trade data, only
// returns the subset of trades that falls inside the selected range.
export function filterTradesByRange(trades, range) {
  if (!trades?.length) return trades || [];
  if (!range || range.mode === "all") return trades;
  return trades.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    if (isNaN(d)) return false;
    switch (range.mode) {
      case "year":
        return d.getFullYear() === range.year;
      case "month":
        return d.getFullYear() === range.year && d.getMonth() === range.month;
      case "week":
        return d.getFullYear() === range.year && getWeekNumber(d) === range.week;
      case "custom": {
        if (range.from && d < new Date(range.from)) return false;
        if (range.to && d > new Date(`${range.to}T23:59:59`)) return false;
        return true;
      }
      default:
        return true;
    }
  });
}

export function rangeLabel(range) {
  if (!range || range.mode === "all") return "All time";
  if (range.mode === "year") return `${range.year}`;
  if (range.mode === "month") return `${MONTH_NAMES[range.month]} ${range.year}`;
  if (range.mode === "week") return `Week ${range.week}, ${range.year}`;
  if (range.mode === "custom") return `${range.from || "…"} → ${range.to || "…"}`;
  return "All time";
}

export { MONTH_NAMES };
