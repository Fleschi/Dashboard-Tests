// ─── Design: Appearance + Interface Accent Color ───────────────────────────────
//
// The whole customization system is exactly two independent choices:
//   1. Appearance   — a predefined theme controlling Background/Card/Border/Text.
//   2. Accent Color — a predefined color used for interface accent elements.
// There are no individual color pickers and no background-pattern system.
// Win/loss/break-even colors are fixed — they're a trading convention, not a
// theme choice, so they stay constant across every Appearance/Accent combo.

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

export const ACCENT_LIST = [
  ["indigo",   "Indigo",   "#6366f1"],
  ["purple",   "Purple",   "#a855f7"],
  ["pink",     "Pink",     "#ec4899"],
  ["rose",     "Rose",     "#f43f5e"],
  ["red",      "Red",      "#ef4444"],
  ["ruby",     "Ruby",     "#be123c"],
  ["orange",   "Orange",   "#f97316"],
  ["peach",    "Peach",    "#fb7d62"],
  ["gold",     "Gold",     "#c99a2e"],
  ["lime",     "Lime",     "#65a30d"],
  ["green",    "Green",    "#22c55e"],
  ["teal",     "Teal",     "#14b8a6"],
  ["sky",      "Sky",      "#0ea5e9"],
  ["platinum", "Platinum", "#8b929b"],
];

export const ACCENTS = Object.fromEntries(ACCENT_LIST.map(([id, label, color]) => [id, { id, label, color }]));

export const DEFAULT_APPEARANCE_ID = "dark";
export const DEFAULT_ACCENT_ID     = "indigo";

// Fixed trade-outcome colors — not user-customizable, constant across every theme.
const RESULT_COLORS = { green: "#2dd888", red: "#ff5470", yellow: "#eab308" };

// Combines an Appearance + Accent into the flat color object every component
// reads from (`D.bg`, `D.card`, `D.blue`, etc.) — the single source of truth
// the rest of the app is built on.
export function buildDesign(appearanceId, accentId) {
  const appearance = APPEARANCES[appearanceId] || APPEARANCES[DEFAULT_APPEARANCE_ID];
  const accent     = ACCENTS[accentId] || ACCENTS[DEFAULT_ACCENT_ID];
  return {
    appearanceId: appearance.id, accentId: accent.id,
    bg: appearance.bg, card: appearance.card, border: appearance.border,
    text: appearance.text, textMuted: appearance.textMuted, sidebar: appearance.sidebar,
    blue: accent.color,
    ...RESULT_COLORS,
    radius: 4,
  };
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export const MODULES = [
  { id: "overview",   label: "Overview",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "data",       label: "Data",        icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { id: "notebook",   label: "Journal",     icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
];

export const SETTINGS_MODULE = {
  id: "settings", label: "Settings",
  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export const BOTTOM_NAV_H      = 56;
export const MOBILE_BREAKPOINT = 768;