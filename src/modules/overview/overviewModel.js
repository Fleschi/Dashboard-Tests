// ─── ID helpers ───────────────────────────────────────────────────────────────

let _seq = 0;
const nid = (prefix) => `${prefix}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

export function makeWidget(type, size, x = 0, y = 0) {
  return { id: nid("w"), type, size, x, y };
}

export function makeGroup(name, widgets = []) {
  return { id: nid("g"), name, widgets };
}

// ─── Sizing ───────────────────────────────────────────────────────────────────
// Three fixed size tiers, each exactly double the previous in both width and
// height — not independent named sizes anymore, just multiples of one base
// unit (a small widget):
//   small  (stat tiles)                       — the base unit
//   medium (Day of Week / Distribution /
//           Equity Curve / Monte Carlo mini)  — 2x a small widget, both axes
//   calendar                                  — 2x a medium widget, both axes
//                                                (4x a small widget)
//
// The row is exactly 6 cells wide (CELLS_WIDE below), chosen so that a row
// holds either 6 small widgets (6×1) or one calendar + one medium widget
// (4 + 2) — both exactly fill it, nothing left over. That's also why this
// round went from an 8-cell row to a 6-cell one: it's a deliberate 4/3 scale
// up (each cell — and therefore every widget — is a third bigger than it use
// to be, both wider and, via CELL_PX below, taller), applied everywhere a
// widget's internals size themselves off "small"/"medium"/"calendar" in
// widgetRegistry.jsx (fonts, spacing, chart proportions) so it reads as
// designed-for-this-size rather than just stretched.
//
// "wide"/"full" remain available as alternate, larger manual sizes (e.g. the
// Equity Focus preset's full-width Equity Curve) — they're just no longer
// what these widgets default to.

export const GRID_COLUMNS = 18;
export const SIZE_SPAN   = { small: 3, wide: 9, big: 6, full: 18 };
export const SIZE_LABEL  = { small: "Small", wide: "Wide", big: "Large", full: "Full width" };

// The calendar is the one "big"-sized widget that should render at double a
// normal "big" (medium) widget's width — everything else in the "big"
// category (Day of Week, Distribution, Equity Curve, Monte Carlo mini) uses
// the base "big" span as-is.
const DOUBLE_WIDTH_TYPES = new Set(["calendar"]);

export function getWidgetSpan(type, size) {
  const base = SIZE_SPAN[size] || 1;
  if (size === "big" && DOUBLE_WIDTH_TYPES.has(type)) return Math.min(GRID_COLUMNS, base * 2);
  return base;
}

// ─── Free-position grid ─────────────────────────────────────────────────────
// Widgets don't auto-flow into place based on array order anymore. Each one
// stores its own explicit (x, y) cell coordinate and keeps it until the user
// drags that specific widget elsewhere — moving one widget never shifts,
// reflows, or "supports" any other widget in the group. That's what makes it
// possible to stack two small widgets on top of each other next to one
// bigger widget: there's no single row to break out of, just independent
// cells that happen to sit next to each other.
//
// A "cell" is the footprint of one small widget: CELL_COLS grid columns wide
// (must match SIZE_SPAN.small above) and CELL_PX pixels tall (must match the
// small widgets' fixed height in widgetRegistry.jsx).
export const CELL_COLS  = SIZE_SPAN.small;
export const CELLS_WIDE = GRID_COLUMNS / CELL_COLS;
export const CELL_PX    = 224;

// Finds the first free (x, y) cell — scanning left-to-right, top-to-bottom —
// where a w×h widget wouldn't overlap any of the given existing rects. Used
// only to place a *newly added* widget somewhere sensible; it never touches
// any existing widget's position.
export function findFreeSpot(rects, w, h, gridWidthCells = CELLS_WIDE) {
  const overlaps = (x, y) => rects.some(r =>
    x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y
  );
  for (let y = 0; y < 999; y++) {
    for (let x = 0; x <= gridWidthCells - w; x++) {
      if (!overlaps(x, y)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

// ─── Built-in presets ─────────────────────────────────────────────────────────
// Kept as functions so every application of a preset produces fresh widget/group
// ids (otherwise re-applying a preset twice would create duplicate React keys).
// A preset fully defines the group structure: which groups exist, their names,
// their order, which widgets belong to each, and each widget's size.

function balancedPreset() {
  return {
    id: "balanced",
    name: "Balanced",
    builtIn: true,
    groups: [
      makeGroup("Summary", [
        makeWidget("netPnl", "small", 0, 0),
        makeWidget("expectancy", "small", 1, 0),
        makeWidget("winLossRatio", "small", 2, 0),
        makeWidget("consistencyScore", "small", 3, 0),
      ]),
      makeGroup("Group 1", [
        makeWidget("equityCurve", "big", 0, 0),
        makeWidget("calendar", "big", 2, 0),
      ]),
    ],
  };
}

function ratiosPreset() {
  return {
    id: "ratios",
    name: "Ratios Focus",
    builtIn: true,
    groups: [
      makeGroup("Summary", [
        makeWidget("winLossRatio", "small", 0, 0),
        makeWidget("expectancy", "small", 1, 0),
        makeWidget("consistencyScore", "small", 2, 0),
        makeWidget("avgWinLoss", "small", 3, 0),
      ]),
      makeGroup("Group 1", [
        makeWidget("dayOfWeek", "big", 0, 0),
        makeWidget("distribution", "big", 2, 0),
      ]),
    ],
  };
}

function equityPreset() {
  return {
    id: "equity",
    name: "Equity Focus",
    builtIn: true,
    groups: [
      makeGroup("Summary", [
        makeWidget("netPnl", "small", 0, 0),
        makeWidget("consistencyScore", "small", 1, 0),
      ]),
      makeGroup("Group 1", [
        makeWidget("equityCurve", "full", 0, 0),
        makeWidget("monteCarloMini", "big", 0, 2),
        makeWidget("calendar", "big", 2, 2),
      ]),
    ],
  };
}

export const BUILT_IN_PRESETS = [balancedPreset, ratiosPreset, equityPreset];

export function findBuiltInPreset(id) {
  const builder = BUILT_IN_PRESETS.find(b => b().id === id);
  return builder ? builder() : null;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "trading_dashboard_overview_v1";

function fallbackState() {
  const preset = balancedPreset();
  return { groups: preset.groups, presetId: preset.id, customPresets: [], timeRange: { mode: "all" } };
}

export function loadOverviewState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackState();
    const parsed = JSON.parse(raw);

    // Already on the group-based schema.
    if (parsed?.groups?.length) {
      return {
        groups: parsed.groups,
        presetId: parsed.presetId || "custom",
        customPresets: parsed.customPresets || [],
        timeRange: parsed.timeRange || { mode: "all" },
      };
    }

    // Migrate the earlier flat-widget-list schema into a single "Summary" group
    // so nobody's existing customization is lost when this feature ships.
    if (parsed?.widgets?.length) {
      return {
        groups: [makeGroup("Summary", parsed.widgets)],
        presetId: "custom",
        customPresets: (parsed.customPresets || []).map(p =>
          p.groups ? p : { ...p, groups: [makeGroup("Summary", p.widgets || [])] }
        ),
        timeRange: parsed.timeRange || { mode: "all" },
      };
    }

    return fallbackState();
  } catch {
    return fallbackState();
  }
}

export function saveOverviewState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}