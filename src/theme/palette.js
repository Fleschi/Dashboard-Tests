// Theme palette: appearances, the shared swatch list and the default choices.
//
// The customization system is one Appearance (a predefined theme controlling
// Background/Card/Border/Text) plus four independent color pickers, each
// choosing either a swatch from the shared palette (COLOR_LIST) or an exact
// custom color typed/picked via a native color input:
//   1. Interface Accent Color — general interface accent elements (nav,
//      selection states, buttons) — independent of Appearance.
//   2. Profit Color  — positive PnL, winning trades, positive indicators.
//   3. Loss Color    — negative PnL, losing trades, negative indicators.
//   4. Metric Color  — metric/statistical elements that aren't win/loss-
//      colored (e.g. the Equity Curve line).
// Break-even color is fixed — it's a trading convention, not a theme choice —
// so it stays constant across every combination.

export const APPEARANCES = {
  light: {
    id: "light", label: "Light",
    bg: "#ededed", card: "#fefefe", border: "#dcdfe4",
    text: "#15171c", textMuted: "#6b7280", sidebar: "#fefefe",
  },
  dark: {
    id: "dark", label: "Dark",
    bg: "#0a0b0c", card: "#131416", border: "#242628",
    text: "#f5f5f5", textMuted: "#787f88", sidebar: "#131416",
  },
  slate: {
    id: "slate", label: "Slate",
    bg: "#d6dae0", card: "#eaebf0", border: "#c7cbd3",
    text: "#1b1e24", textMuted: "#5f6672", sidebar: "#eaebf0",
  },
  iris: {
    id: "iris", label: "Iris",
    bg: "#0a0a0d", card: "#151519", border: "#232329",
    text: "#f5f5f7", textMuted: "#84838f", sidebar: "#151519",
  },
};

// Shared swatch palette — reused by every color picker (Accent, Profit, Loss,
// Metric) so they all look and behave the same way. Includes the app's
// original fixed win/loss hues (Emerald/Crimson) as selectable swatches so
// the default Profit/Loss colors below reproduce the previous, non-
// customizable look exactly.
export const COLOR_LIST = [
  ["indigo",   "Indigo",   "#6366f1"],
  ["purple",   "Purple",   "#a855f7"],
  ["pink",     "Pink",     "#ec4899"],
  ["rose",     "Rose",     "#f43f5e"],
  ["red",      "Red",      "#ef4444"],
  ["ruby",     "Ruby",     "#be123c"],
  ["crimson",  "Crimson",  "#ff5470"],
  ["orange",   "Orange",   "#f97316"],
  ["peach",    "Peach",    "#fb7d62"],
  ["gold",     "Gold",     "#c99a2e"],
  ["lime",     "Lime",     "#65a30d"],
  ["green",    "Green",    "#22c55e"],
  ["emerald",  "Emerald",  "#2dd888"],
  ["teal",     "Teal",     "#14b8a6"],
  ["sky",      "Sky",      "#0ea5e9"],
  ["platinum", "Platinum", "#8b929b"],
];

export const COLORS = Object.fromEntries(COLOR_LIST.map(([id, label, color]) => [id, { id, label, color }]));

export const DEFAULT_APPEARANCE_ID  = "dark";

export const DEFAULT_ACCENT_ID      = "indigo";

export const DEFAULT_PROFIT_COLOR_ID = "emerald";

export const DEFAULT_LOSS_COLOR_ID   = "crimson";

export const DEFAULT_METRIC_COLOR_ID = "indigo";
