import { APPEARANCES, COLORS, DEFAULT_ACCENT_ID, DEFAULT_APPEARANCE_ID, DEFAULT_BREAK_EVEN_COLOR_ID, DEFAULT_LOSS_COLOR_ID, DEFAULT_METRIC_COLOR_ID, DEFAULT_PROFIT_COLOR_ID } from "./palette";

// Matches a 3- or 6-digit hex color (e.g. "#fff" / "#22c55e") — how a custom,
// user-picked color (as opposed to one of the named COLOR_LIST swatches) is
// represented and persisted.
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// True for anything buildDesign()/resolveColor() can turn into a real color:
// a known swatch id, or a valid custom hex string. Used to validate values
// loaded back out of storage.
export function isValidColorValue(value) {
  return Boolean(COLORS[value]) || HEX_COLOR_RE.test(value || "");
}

// Resolves one stored color value — either a swatch id ("emerald") or a
// literal custom hex string picked via the native color input ("#3fae6c") —
// into a { id, label, color } entry. `id` is kept equal to the raw stored
// value either way, so a custom pick round-trips through storage/Settings
// exactly as entered instead of being coerced into a swatch.
function resolveColor(value, fallbackId) {
  if (COLORS[value]) return COLORS[value];
  if (HEX_COLOR_RE.test(value || "")) return { id: value, label: "Custom", color: value };
  return COLORS[fallbackId];
}

// Combines an Appearance + the four color choices into the flat color object
// every component reads from (`D.bg`, `D.card`, `D.blue`, `D.green`, `D.red`,
// `D.metric`, etc.) — the single source of truth the rest of the app is built
// on. Any component that reads `D.green`/`D.red`/`D.metric` automatically
// reflects the chosen Profit/Loss/Metric colors — swatch or custom — so a
// change here propagates consistently across Overview, Data, Calendar, and
// every widget.
export function buildDesign(appearanceId, accentId, profitColorId, lossColorId, metricColorId, breakEvenColorId) {
  const appearance = APPEARANCES[appearanceId] || APPEARANCES[DEFAULT_APPEARANCE_ID];
  const accent  = resolveColor(accentId,      DEFAULT_ACCENT_ID);
  const profit  = resolveColor(profitColorId, DEFAULT_PROFIT_COLOR_ID);
  const loss    = resolveColor(lossColorId,   DEFAULT_LOSS_COLOR_ID);
  const metric  = resolveColor(metricColorId, DEFAULT_METRIC_COLOR_ID);
  const breakEven = resolveColor(breakEvenColorId, DEFAULT_BREAK_EVEN_COLOR_ID);
  return {
    appearanceId: appearance.id, accentId: accent.id,
    profitColorId: profit.id, lossColorId: loss.id, metricColorId: metric.id, breakEvenColorId: breakEven.id,
    bg: appearance.bg, card: appearance.card, border: appearance.border,
    text: appearance.text, textMuted: appearance.textMuted, sidebar: appearance.sidebar,
    blue: accent.color,
    green: profit.color,
    red: loss.color,
    metric: metric.color,
    // `yellow` is the long-standing key every component reads for break-even;
    // it now follows the chosen Break-even color.
    yellow: breakEven.color,
    breakEven: breakEven.color,
    radius: 4,
  };
}

// The design a fresh install (and "Reset to default") starts from.
export const defaultDesign = () =>
  buildDesign(DEFAULT_APPEARANCE_ID, DEFAULT_ACCENT_ID, DEFAULT_PROFIT_COLOR_ID, DEFAULT_LOSS_COLOR_ID, DEFAULT_METRIC_COLOR_ID, DEFAULT_BREAK_EVEN_COLOR_ID);
