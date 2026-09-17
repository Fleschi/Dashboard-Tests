export function calcStats(trades) {
  if (!trades || trades.length === 0) return null;

  const pnls = trades.map(t => t.pnl);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);

  const classified = trades.map(t => ({
    ...t,
    outcome: t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be",
  }));

  const wins   = classified.filter(t => t.outcome === "win");
  const losses = classified.filter(t => t.outcome === "loss");
  const bes    = classified.filter(t => t.outcome === "be");

  const winRate = (wins.length + losses.length) > 0 ? wins.length / (wins.length + losses.length) : 0;
  const avgWin  = wins.length   ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + t.pnl, 0) / losses.length) : 0;
  const avgRR   = losses.length && avgLoss > 0 ? avgWin / avgLoss : 0;

  const grossProfit  = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss    = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const expectancy   = winRate * avgWin - (1 - winRate) * avgLoss;

  const avgPnl = totalPnl / trades.length;
  const std = pnls.length > 1
    ? Math.sqrt(pnls.reduce((a, p) => a + (p - avgPnl) ** 2, 0) / pnls.length)
    : 0;
  const sharpe = std > 0 ? (avgPnl / std) * Math.sqrt(252) : 0;

  // Max Drawdown
  let running = 0, peak = 0, mdd = 0;
  for (const p of pnls) {
    running += p;
    if (running > peak) peak = running;
    if (peak - running > mdd) mdd = peak - running;
  }

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, curW = 0, curL = 0;
  for (const t of classified) {
    if (t.outcome === "win")       { curW++; curL = 0; maxWinStreak  = Math.max(maxWinStreak,  curW); }
    else if (t.outcome === "loss") { curL++; curW = 0; maxLossStreak = Math.max(maxLossStreak, curL); }
    else                           { curW = 0; curL = 0; }
  }

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let eq = 0;
  const equityCurve = sortedTrades.map((t, i) => {
    eq += t.pnl;
    return { index: i + 1, label: t.date, equity: parseFloat(eq.toFixed(2)), pnl: t.pnl };
  });

  // Weekly PnL aggregation
  const weeklyMap = {};
  for (const t of trades) {
    const d = new Date(t.date);
    if (isNaN(d)) continue;
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const wkey = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    weeklyMap[wkey] = (weeklyMap[wkey] || 0) + t.pnl;
  }
  const weeklyPnls = Object.values(weeklyMap);
  const avgTradesPerWeek = weeklyPnls.length > 0 ? trades.length / weeklyPnls.length : 0;

  const assetMap = {};
  for (const t of classified) {
    const a = t.asset || "Unknown";
    if (!assetMap[a]) assetMap[a] = { wins: 0, losses: 0, bes: 0, pnl: 0 };
    assetMap[a].pnl += t.pnl;
    if (t.outcome === "win")       assetMap[a].wins++;
    else if (t.outcome === "loss") assetMap[a].losses++;
    else                           assetMap[a].bes++;
  }

  return {
    totalPnl, avgPnl, totalTrades: trades.length,
    wins: wins.length, losses: losses.length, bes: bes.length,
    winRate, avgWin, avgLoss, avgRR,
    grossProfit, grossLoss, profitFactor, expectancy,
    std, sharpe, mdd, equityCurve, weeklyPnls,
    maxWinStreak, maxLossStreak,
    assetMap, avgTradesPerWeek,
    rawTrades: trades,
  };
}

export function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * sorted.length)] ?? 0;
}

export const fmt    = (n) => n >= 0 ? `+$${Number(n).toFixed(0)}` : `-$${Math.abs(Number(n)).toFixed(0)}`;
export const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

// ─── Day-of-week aggregation (used by the Overview "Day of Week Performance" widget) ──

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

// ─── Consistency score (used by the Overview "Consistency Score" widget) ──────
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

// ─── PnL histogram (used by the Overview "Trade Distribution" widget) ─────────
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

// ─── Student-t Distribution ───────────────────────────────────────────────────

export function fitStudentT(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);
  const m4 = values.reduce((a, v) => a + (v - mean) ** 4, 0) / n;
  const excessKurtosis = m4 / (variance ** 2) - 3;
  const df = excessKurtosis > 0.1 ? Math.min(30, Math.max(3, 4 + 6 / excessKurtosis)) : 10;
  return { mean, std, df };
}

export function sampleStudentT({ mean, std, df }) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

  let chi2 = 0;
  for (let i = 0; i < df; i++) {
    let a = 0, b = 0;
    while (a === 0) a = Math.random();
    while (b === 0) b = Math.random();
    const n = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
    chi2 += n * n;
  }
  return mean + std * (z / Math.sqrt(chi2 / df));
}