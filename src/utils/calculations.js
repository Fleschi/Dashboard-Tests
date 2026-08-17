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

  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
  const avgPnl = totalPnl / trades.length;

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

  return {
    totalPnl, avgPnl, totalTrades: trades.length,
    wins: wins.length, losses: losses.length, bes: bes.length,
    winRate, avgWin, avgLoss, avgRR, expectancy,
    mdd, equityCurve,
    maxWinStreak, maxLossStreak,
    avgTradesPerWeek,
    rawTrades: trades,
  };
}

export function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * sorted.length)] ?? 0;
}

export const fmt = (n) => n >= 0 ? `+$${Number(n).toFixed(0)}` : `-$${Math.abs(Number(n)).toFixed(0)}`;

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
