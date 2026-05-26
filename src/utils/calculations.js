export function calcStats(trades) {
  if (!trades || trades.length === 0) return null;

  const pnls = trades.map(t => t.pnl);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);

  // Auto-derive outcome from pnl if not set
  const classified = trades.map(t => ({
    ...t,
    outcome: t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be",
  }));

  const wins   = classified.filter(t => t.outcome === "win");
  const losses = classified.filter(t => t.outcome === "loss");
  const bes    = classified.filter(t => t.outcome === "be");

  // BE trades excluded from win rate
  const winRate = (wins.length + losses.length) > 0 ? wins.length / (wins.length + losses.length) : 0;
  const avgWin  = wins.length   ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + t.pnl, 0) / losses.length) : 0;
  const avgRR   = losses.length && avgLoss > 0 ? avgWin / avgLoss : 0;

  const grossProfit  = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss    = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const expectancy   = winRate * avgWin - (1 - winRate) * avgLoss;

  // Sharpe: use per-trade PnL, annualized assuming ~252 trades/year
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
    if (t.outcome === "win")  { curW++; curL = 0; maxWinStreak  = Math.max(maxWinStreak,  curW); }
    else if (t.outcome === "loss") { curL++; curW = 0; maxLossStreak = Math.max(maxLossStreak, curL); }
    else { curW = 0; curL = 0; }
  }

  // Equity curve — sort by date first so order is always chronological
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

  // Avg trades per week
  const avgTradesPerWeek = weeklyPnls.length > 0 ? trades.length / weeklyPnls.length : 0;

  // Per-asset breakdown
  const assetMap = {};
  for (const t of classified) {
    const a = t.asset || "Unknown";
    if (!assetMap[a]) assetMap[a] = { wins: 0, losses: 0, bes: 0, pnl: 0 };
    assetMap[a].pnl += t.pnl;
    if (t.outcome === "win")  assetMap[a].wins++;
    else if (t.outcome === "loss") assetMap[a].losses++;
    else assetMap[a].bes++;
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

export function buildHistogram(values, buckets = 30) {
  const mn = Math.min(...values), mx = Math.max(...values);
  const bucketSize = (mx - mn) / buckets || 1;
  return Array.from({ length: buckets }, (_, i) => {
    const lo = mn + i * bucketSize, hi = lo + bucketSize;
    return { range: `${Math.round(lo / 1000)}k`, count: values.filter(v => v >= lo && v < hi).length };
  });
}

export const fmt    = (n) => n >= 0 ? `+$${Number(n).toFixed(0)}` : `-$${Math.abs(Number(n)).toFixed(0)}`;
export const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

// ─── Student-t Distribution ───────────────────────────────────────────────────
// Fit a Student-t distribution to an array of PnL values
export function fitStudentT(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);
  // Estimate degrees of freedom from kurtosis (excess kurtosis = 6/(df-4) for df>4)
  const meanV = mean;
  const m4 = values.reduce((a, v) => a + (v - meanV) ** 4, 0) / n;
  const excessKurtosis = m4 / (variance ** 2) - 3;
  // df = 4 + 6/excessKurtosis, clamped to [3, 30]
  const df = excessKurtosis > 0.1 ? Math.min(30, Math.max(3, 4 + 6 / excessKurtosis)) : 10;
  return { mean, std, df };
}

// Sample from fitted Student-t distribution using Box-Muller + chi-squared approx
export function sampleStudentT({ mean, std, df }) {
  // Generate t-distributed random variable via ratio of normal to chi
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

  // Chi-squared with df degrees of freedom (sum of df squared normals)
  let chi2 = 0;
  for (let i = 0; i < df; i++) {
    let a = 0, b = 0;
    while (a === 0) a = Math.random();
    while (b === 0) b = Math.random();
    const n = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
    chi2 += n * n;
  }
  const t = z / Math.sqrt(chi2 / df);
  return mean + std * t;
}