import { buildDesign, defaultDesign, isValidColorValue } from "./buildDesign";
import { APPEARANCES, DEFAULT_ACCENT_ID, DEFAULT_APPEARANCE_ID, DEFAULT_BREAK_EVEN_COLOR_ID, DEFAULT_LOSS_COLOR_ID, DEFAULT_METRIC_COLOR_ID, DEFAULT_PROFIT_COLOR_ID } from "./palette";

const STORAGE_KEY = "trading_dashboard_design";

// Persisted shape is just the chosen ids — the actual color palette is
// always derived fresh via buildDesign(), never frozen into storage. That way
// switching one choice (Appearance, Accent, Profit, Loss, Metric) can never
// disturb the others, and there's nothing to migrate if a palette value is
// ever tuned later.
export function loadDesign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const appearanceId  = APPEARANCES[parsed.appearanceId] ? parsed.appearanceId : DEFAULT_APPEARANCE_ID;
    // Accepts either a known swatch id or a custom hex string the user
    // picked previously — anything else (corrupt/old data) falls back.
    const pick = (val, fallback) => isValidColorValue(val) ? val : fallback;
    const accentId      = pick(parsed.accentId,      DEFAULT_ACCENT_ID);
    const profitColorId = pick(parsed.profitColorId, DEFAULT_PROFIT_COLOR_ID);
    const lossColorId   = pick(parsed.lossColorId,   DEFAULT_LOSS_COLOR_ID);
    const metricColorId = pick(parsed.metricColorId, DEFAULT_METRIC_COLOR_ID);
    const breakEvenColorId = pick(parsed.breakEvenColorId, DEFAULT_BREAK_EVEN_COLOR_ID);
    return buildDesign(appearanceId, accentId, profitColorId, lossColorId, metricColorId, breakEvenColorId);
  } catch {
    return defaultDesign();
  }
}

export function saveDesign(design) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      appearanceId: design.appearanceId,
      accentId: design.accentId,
      profitColorId: design.profitColorId,
      lossColorId: design.lossColorId,
      metricColorId: design.metricColorId,
      breakEvenColorId: design.breakEvenColorId,
    }));
  } catch {}
}
