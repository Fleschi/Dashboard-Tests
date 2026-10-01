export function calcDayOfWeekStats(trades) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const agg = DAYS.map(d => ({ day: d, pnl: 0, count: 0, wins: 0, losses: 0 }));
  for (const t of trades || []) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (isNaN(d)) continue;
    const idx = (d.getDay() + 6) % 7; // Monday-first
    agg[idx].pnl += t.pnl || 0;
    agg[idx].count++;
    if (t.pnl > 0) agg[idx].wins++;
    else if (t.pnl < 0) agg[idx].losses++;
  }
  return agg.map(a => ({
    ...a,
    avgPnl: a.count ? a.pnl / a.count : 0,
    winRate: (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : 0,
  }));
}

// Measures how evenly profits are spread across days rather than carried by a
// single outlier day. 100 = perfectly even, lower = more concentrated in a
// handful of big days (similar in spirit to prop-firm "consistency" rules).

export function calcConsistencyScore(trades) {
  if (!trades || !trades.length) return null;
  const dayMap = {};
  for (const t of trades) {
    if (!t.date) continue;
    const key = String(t.date).slice(0, 10);
    dayMap[key] = (dayMap[key] || 0) + (t.pnl || 0);
  }
  const dayPnls = Object.values(dayMap);
  const grossProfit = dayPnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
  if (grossProfit <= 0) return 0;
  const maxDay = Math.max(...dayPnls.filter(p => p > 0), 0);
  const bestDayShare = maxDay / grossProfit;
  return Math.max(0, Math.round((1 - bestDayShare) * 100));
}

//
// Two problems with a plain equal-width histogram over [min, max]:
//   1. Break-even trades (pnl === 0) get lumped in with whatever win/loss bin
//      happens to straddle zero, and that bin's label is an arbitrary point
//      from dividing (max-min) into N slices — almost never 0 itself. A trade
//      that never had any pnl but 0 can end up displayed under a "-30" bar.
//   2. Every bin boundary is a fraction of (max-min)/N, so labels are numbers
//      that don't correspond to anything meaningful about the actual trades.
//
// Fix: break-even trades are pulled out into their own explicit bucket, and
// the remaining win/loss trades are binned using "nice" round-number widths
// (1/2/5 × a power of ten) aligned to zero — so every bin boundary is a real,
// legible number, no bin ever straddles zero, and a bin's label always
// matches the range of values actually inside it.

export function buildPnlHistogram(trades, targetBins = 12) {
  const pnls = (trades || []).map(t => t.pnl).filter(p => typeof p === "number" && !isNaN(p));
  if (!pnls.length) return [];

  const beCount = pnls.filter(p => p === 0).length;
  const nonZero = pnls.filter(p => p !== 0);

  if (!nonZero.length) {
    return [{ range: "BE", rangeStart: 0, rangeEnd: 0, count: beCount, isBreakEven: true }];
  }

  const min = Math.min(...nonZero), max = Math.max(...nonZero);
  const bins = [];

  if (min === max) {
    bins.push({
      range: `${min >= 0 ? "+" : ""}${Math.round(min)}`,
      rangeStart: min, rangeEnd: min,
      count: nonZero.length,
      isNegative: min < 0, isPositive: min > 0,
    });
  } else {
    const step = niceStep((max - min) / targetBins);
    const start = Math.floor(min / step) * step;
    const end   = Math.ceil(max / step) * step;
    const binCount = Math.max(1, Math.round((end - start) / step));

    const built = Array.from({ length: binCount }, (_, i) => ({
      rangeStart: start + i * step,
      rangeEnd: start + (i + 1) * step,
      count: 0,
    }));

    for (const p of nonZero) {
      let idx = Math.floor((p - start) / step);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      built[idx].count++;
    }

    for (const b of built) {
      bins.push({
        range: `${b.rangeStart >= 0 ? "+" : ""}${Math.round(b.rangeStart)}`,
        rangeStart: b.rangeStart, rangeEnd: b.rangeEnd,
        count: b.count,
        isNegative: b.rangeEnd <= 0,
        isPositive: b.rangeStart >= 0,
      });
    }
  }

  // Insert the break-even bucket where it naturally belongs — between the
  // last negative bin and the first non-negative one — instead of just
  // tacking it onto one end.
  if (beCount > 0) {
    const insertAt = bins.findIndex(b => b.rangeStart >= 0);
    const beBin = { range: "BE", rangeStart: 0, rangeEnd: 0, count: beCount, isBreakEven: true };
    if (insertAt === -1) bins.push(beBin); else bins.splice(insertAt, 0, beBin);
  }

  return bins;
}

// Rounds a raw bin width up to a "nice" number (1/2/5 × a power of ten) so
// every bin boundary lands on a legible round amount instead of an arbitrary
// fraction of (max-min)/targetBins.
function niceStep(raw) {
  if (!raw || raw <= 0) return 1;
  const exponent = Math.floor(Math.log10(raw));
  const fraction = raw / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}
