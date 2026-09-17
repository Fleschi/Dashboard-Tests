import { getWidgetSpan, CELL_COLS, CELL_PX } from "./overviewModel";
import { getWidgetHeight } from "./widgetRegistry";

// A widget's footprint in the free-position grid, expressed in whole "cells"
// (1 cell = 1 small widget: CELL_COLS grid columns wide, CELL_PX px tall).
// Lives in its own file (rather than overviewModel.js or widgetRegistry.jsx)
// so those two stay independent of each other — this is the only place that
// needs both.
export function getWidgetCells(type, size) {
  const cols = getWidgetSpan(type, size);
  const px   = getWidgetHeight(type, size);
  return { w: Math.max(1, Math.round(cols / CELL_COLS)), h: Math.max(1, Math.round(px / CELL_PX)) };
}
