export const fmt    = (n) => n >= 0 ? `+$${Number(n).toFixed(0)}` : `-$${Math.abs(Number(n)).toFixed(0)}`;

export const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;
